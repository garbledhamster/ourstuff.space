const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();

const APP_ID = "ourstuff-main";
const ALLOWED_ORIGINS = [
	/^https:\/\/([a-z0-9-]+\.)?ourstuff\.space$/i,
	/^http:\/\/localhost:\d+$/i,
	/^http:\/\/127\.0\.0\.1:\d+$/i,
];
const LETTER_MAX_WORDS = 650;
const LETTER_MAX_CHARS = 3500;
const DEFAULT_SETTINGS = {
	enabled: true,
	delayEnabled: true,
	delayMinHours: 24,
	delayMaxHours: 72,
	memoryEnabled: true,
	generalInstructions:
		"Be a reflective growth companion. Be direct, kind, practical, and non-clinical.",
	userWantsPyxdiaToKnow: "",
	plainTextOnly: true,
	letterMaxWords: LETTER_MAX_WORDS,
	letterMaxChars: LETTER_MAX_CHARS,
	schemaVersion: 1,
};
const SAFE_ERRORS = {
	auth_required: "Sign in to send PYXDIA letters.",
	feature_disabled: "PYXDIA is turned off in Settings.",
	letter_too_large: "This PYXDIA letter is too large.",
	blocked_secret_detected:
		"This letter contains content that cannot be sent to the AI. Edit and try again.",
	blocked_cardholder_data_detected:
		"This letter contains content that cannot be sent to the AI. Edit and try again.",
	entitlement_required: "PYXDIA AI replies require an active Cloud subscription.",
	rate_limited: "Too many PYXDIA requests. Wait a little and try again.",
	provider_failed: "PYXDIA could not finish. Try again.",
	output_validation_failed: "PYXDIA could not finish safely. Try again.",
};

exports.pyxdiaApi = onRequest({ cors: ALLOWED_ORIGINS, timeoutSeconds: 120 }, async (req, res) => {
	try {
		if (req.method === "OPTIONS") return res.status(204).send("");
		const auth = await verifyAuth(req);
		const uid = auth.uid;
		const path = routePath(req, "pyxdiaApi");
		if (req.method === "GET" && path === "/state") {
			return res.json(await statePayload(uid));
		}
		if (req.method === "POST" && path === "/draft") {
			await enforceRateLimit(uid, "draft", 120, 3600);
			return res.json(await saveDraft(uid, body(req)));
		}
		if (req.method === "POST" && path === "/letters") {
			await enforceRateLimit(uid, "letters", 20, 3600);
			return res.json(await submitLetter(uid, body(req), auth));
		}
		if (req.method === "POST" && path.startsWith("/letters/") && path.endsWith("/retry")) {
			await enforceRateLimit(uid, "retry", 20, 3600);
			return res.json(await retryLetter(uid, path.split("/")[2]));
		}
		if (req.method === "PATCH" && path === "/settings") {
			await enforceRateLimit(uid, "settings", 60, 3600);
			return res.json(await saveSettings(uid, body(req)));
		}
		if (req.method === "POST" && path === "/memory/reset") {
			await enforceRateLimit(uid, "memory", 20, 3600);
			return res.json(await resetMemory(uid));
		}
		return sendError(res, "not_found", "PYXDIA route not found.", 404);
	} catch (error) {
		return sendCaught(res, error);
	}
});

exports.aiApi = onRequest({ cors: ALLOWED_ORIGINS, timeoutSeconds: 120 }, async (req, res) => {
	try {
		if (req.method === "OPTIONS") return res.status(204).send("");
		const auth = await verifyAuth(req);
		const uid = auth.uid;
		await enforceRateLimit(uid, "ai", 60, 3600);
		const payload = body(req);
		const mode = routePath(req, "aiApi").replace(/^\/+/, "") || payload.mode || "scrub";
		const text = String(payload.text || "");
		if (mode === "scrub") return res.json(scrubText(text));
		if (mode === "scrub-llm" || mode === "scrub_llm") {
			await requirePaidAiAccessIfNeeded(uid, auth);
			const scrubbed = scrubText(text);
			const result = await generateLetter(scrubbed.text, {});
			validatePlainOutput(result.letter_text);
			return res.json({
				outputText: result.letter_text,
				scrubReportSummary: scrubbed.summary,
			});
		}
		if (mode === "llm" || mode === "llm-scrub" || mode === "llm_scrub") {
			await requirePaidAiAccessIfNeeded(uid, auth);
			scrubText(text);
			const result = await generateLetter(text, {});
			validatePlainOutput(result.letter_text);
			const scanned = scrubText(result.letter_text);
			return res.json({
				outputText: scanned.text,
				scrubReportSummary: scanned.summary,
			});
		}
		return sendError(res, "not_found", "AI route not found.", 404);
	} catch (error) {
		return sendCaught(res, error);
	}
});

exports.processPyxdiaJobs = onSchedule("every 30 minutes", async () => {
	const db = admin.firestore();
	const now = nowIso();
	const users = await db.collection("users").get();
	for (const userDoc of users.docs) {
		const jobs = await appRef(userDoc.id)
			.collection("pyxdiaProcessingJobs")
			.where("state", "==", "queued")
			.limit(10)
			.get();
		for (const job of jobs.docs) {
			if (String(job.data().availableAt || "") > now) continue;
			await processJob(userDoc.id, job.id);
		}
	}
});

async function verifyAuth(req) {
	const header = String(req.headers.authorization || "");
	if (!header.toLowerCase().startsWith("bearer ")) {
		throw policyError("auth_required", SAFE_ERRORS.auth_required, 401);
	}
	const decoded = await admin.auth().verifyIdToken(header.slice(7).trim());
	if (!decoded.uid) throw policyError("auth_required", SAFE_ERRORS.auth_required, 401);
	return decoded;
}

async function statePayload(uid) {
	const app = appRef(uid);
	const settings = await readSettings(uid);
	const [threadsSnap, lettersSnap, memorySnap, draftSnap] = await Promise.all([
		app.collection("pyxdiaThreads").get(),
		app.collection("pyxdiaLetters").get(),
		app.collection("pyxdiaMemories").doc("current").get(),
		app.collection("pyxdiaLetters").doc("draft").get(),
	]);
	return {
		settings,
		threads: threadsSnap.docs.map((doc) => doc.data()),
		letters: lettersSnap.docs
			.filter((doc) => doc.id !== "draft")
			.map((doc) => doc.data()),
		memory: memorySnap.exists ? memorySnap.data() : emptyMemory(uid),
		draft: draftSnap.exists ? draftSnap.data() : draftDoc(uid),
	};
}

async function saveDraft(uid, payload) {
	const draft = { ...draftDoc(uid), ...(payload.draft || payload) };
	draft.id = "draft";
	draft.owner = uid;
	draft.state = "draft";
	draft.updatedAt = nowIso();
	draft.schemaVersion = 1;
	await appRef(uid).collection("pyxdiaLetters").doc("draft").set(draft, { merge: true });
	audit("pyxdia/draft", uid, "saved");
	return statePayload(uid);
}

async function submitLetter(uid, payload, auth) {
	const settings = normalizeSettings({ ...(await readSettings(uid)), ...(payload.settings || {}) });
	if (!settings.enabled) throw policyError("feature_disabled", SAFE_ERRORS.feature_disabled);
	await requirePaidAiAccessIfNeeded(uid, auth);
	const draft = payload.draft || payload;
	const inputText = String(draft.inputText || "");
	validateLetterSize(inputText, settings);
	const scrubbed = scrubText(inputText);
	const context = String(draft.userIncludedContext || "");
	if (context) scrubText(context);
	const now = nowIso();
	const threadId = String(draft.threadId || `thread-${crypto.randomUUID()}`);
	const letterId = `letter-${crypto.randomUUID()}`;
	const availableAt = availableAtFor(settings);
	const app = appRef(uid);
	const threadRef = app.collection("pyxdiaThreads").doc(threadId);
	const threadSnap = await threadRef.get();
	const thread = threadSnap.exists ? threadSnap.data() : {};
	const letter = {
		id: letterId,
		threadId,
		owner: uid,
		state: "queued",
		inputText,
		scrubbedInputText: scrubbed.text,
		outputText: "",
		includedNoteRefs: Array.isArray(draft.includedNoteRefs) ? draft.includedNoteRefs : [],
		userIncludedContext: context,
		contextSelections: Array.isArray(draft.contextSelections) ? draft.contextSelections : [],
		scrubReportSummary: scrubbed.summary,
		submittedAt: now,
		queuedAt: now,
		availableAt,
		processingAt: null,
		completedAt: null,
		failedAt: null,
		errorCode: "",
		errorMessageSafe: "",
		createdAt: now,
		updatedAt: now,
		schemaVersion: 1,
	};
	await Promise.all([
		threadRef.set(
			{
				id: threadId,
				owner: uid,
				title: thread.title || threadTitle(inputText),
				status: "active",
				letterIds: Array.from(new Set([...(thread.letterIds || []), letterId])),
				latestLetterId: letterId,
				latestState: "queued",
				createdAt: thread.createdAt || now,
				updatedAt: now,
				schemaVersion: 1,
			},
			{ merge: true },
		),
		app.collection("pyxdiaLetters").doc(letterId).set(letter),
		app.collection("pyxdiaLetters").doc("draft").set(draftDoc(uid), { merge: true }),
		app.collection("pyxdiaProcessingJobs").doc(letterId).set({
			id: letterId,
			owner: uid,
			threadId,
			letterId,
			state: "queued",
			availableAt,
			attempts: 0,
			maxAttempts: 3,
			lockedAt: null,
			lockedBy: "",
			nextRetryAt: null,
			errorCode: "",
			createdAt: now,
			updatedAt: now,
			schemaVersion: 1,
		}),
	]);
	audit("pyxdia/letters", uid, "queued", { jobId: letterId });
	if (!settings.delayEnabled) await processJob(uid, letterId);
	return statePayload(uid);
}

async function retryLetter(uid, letterId) {
	const app = appRef(uid);
	const letterRef = app.collection("pyxdiaLetters").doc(letterId);
	const letterSnap = await letterRef.get();
	const letter = letterSnap.exists ? letterSnap.data() : null;
	if (!letter || letter.owner !== uid) throw policyError("auth_required", "Letter not found.", 404);
	const now = nowIso();
	await Promise.all([
		letterRef.set({ state: "queued", updatedAt: now, errorCode: "", errorMessageSafe: "" }, { merge: true }),
		app.collection("pyxdiaProcessingJobs").doc(letterId).set(
			{
				id: letterId,
				owner: uid,
				threadId: letter.threadId,
				letterId,
				state: "queued",
				availableAt: now,
				attempts: 0,
				maxAttempts: 3,
				updatedAt: now,
				schemaVersion: 1,
			},
			{ merge: true },
		),
	]);
	return statePayload(uid);
}

async function saveSettings(uid, payload) {
	const settings = normalizeSettings(payload.settings || payload);
	settings.owner = uid;
	settings.updatedAt = nowIso();
	await appRef(uid).collection("pyxdiaSettings").doc("default").set(settings, { merge: true });
	audit("pyxdia/settings", uid, "saved");
	return statePayload(uid);
}

async function resetMemory(uid) {
	const memory = { ...emptyMemory(uid), updatedAt: nowIso() };
	await appRef(uid).collection("pyxdiaMemories").doc("current").set(memory);
	audit("pyxdia/memory", uid, "reset");
	return statePayload(uid);
}

async function processJob(uid, jobId) {
	const app = appRef(uid);
	const jobRef = app.collection("pyxdiaProcessingJobs").doc(jobId);
	const letterRef = app.collection("pyxdiaLetters").doc(jobId);
	const claimed = await claimJobTransaction(jobRef, letterRef);
	if (!claimed) return;
	const { job, letter } = claimed;
	try {
		await requirePaidAiAccessIfNeeded(uid);
		const settings = await readSettings(uid);
		const memoryRef = app.collection("pyxdiaMemories").doc("current");
		const memorySnap = await memoryRef.get();
		const memory = memorySnap.exists ? memorySnap.data() : emptyMemory(uid);
		const prompt = buildPrompt({
			settings,
			memory,
			threadContext: await threadContext(uid, letter.threadId),
			noteMetadata: JSON.stringify(letter.includedNoteRefs || []).slice(0, 4000),
			includedContext: scrubText(letter.userIncludedContext || "").text,
			letter: letter.scrubbedInputText || scrubText(letter.inputText || "").text,
		});
		const result = await generateLetter(prompt, settings);
		const output = String(result.letter_text || "").trim();
		const scannedOutput = scrubText(output);
		validatePlainOutput(scannedOutput.text);
		const completedAt = nowIso();
		await Promise.all([
			letterRef.set(
				{
					state: "completed",
					outputText: scannedOutput.text,
					completedAt,
					updatedAt: completedAt,
					modelName: result.model || "",
				},
				{ merge: true },
			),
			app.collection("pyxdiaThreads").doc(letter.threadId).set(
				{
					latestState: "completed",
					latestLetterId: letter.id,
					updatedAt: completedAt,
				},
				{ merge: true },
			),
			jobRef.set({ state: "completed", updatedAt: completedAt }, { merge: true }),
			settings.memoryEnabled
				? memoryRef.set(updateMemory(uid, memory, letter, scannedOutput.text), { merge: true })
				: Promise.resolve(),
		]);
		audit("pyxdia/job", uid, "completed", { jobId, model: result.model || "" });
	} catch (error) {
		await failJob(uid, jobRef, letterRef, job, error.code || "provider_failed", error.message || SAFE_ERRORS.provider_failed);
	}
}

async function claimJobTransaction(jobRef, letterRef) {
	const now = nowIso();
	const staleLockBefore = new Date(Date.now() - 10 * 60000).toISOString();
	return admin.firestore().runTransaction(async (transaction) => {
		const [jobSnap, letterSnap] = await Promise.all([transaction.get(jobRef), transaction.get(letterRef)]);
		if (!jobSnap.exists || !letterSnap.exists) return null;
		const job = jobSnap.data();
		const letter = letterSnap.data();
		const state = String(job.state || "");
		const lockedAt = String(job.lockedAt || "");
		const locked = lockedAt && lockedAt > staleLockBefore;
		if (!["queued", "retry"].includes(state) || locked || String(job.availableAt || "") > now) return null;
		const attempts = Number(job.attempts || 0) + 1;
		const patch = {
			state: "processing",
			lockedAt: now,
			lockedBy: "firebase-function",
			attempts,
			updatedAt: now,
		};
		transaction.set(jobRef, patch, { merge: true });
		transaction.set(letterRef, { state: "processing", processingAt: now, updatedAt: now }, { merge: true });
		return { job: { ...job, ...patch }, letter };
	});
}

async function failJob(uid, jobRef, letterRef, job, code, message) {
	const now = nowIso();
	const attempts = Number(job.attempts || 0);
	const retryable = code === "provider_failed" && attempts < Number(job.maxAttempts || 3);
	const state = retryable ? "queued" : "failed";
	const nextRetryAt = retryable
		? new Date(Date.now() + 5 * Math.max(1, attempts) * 60000).toISOString()
		: null;
	await Promise.all([
		jobRef.set(
			{
				state,
				errorCode: code,
				nextRetryAt,
				availableAt: nextRetryAt || now,
				updatedAt: now,
			},
			{ merge: true },
		),
		letterRef.set(
			{
				state,
				failedAt: retryable ? null : now,
				errorCode: code,
				errorMessageSafe: message,
				updatedAt: now,
			},
			{ merge: true },
		),
	]);
	audit("pyxdia/job", uid, state, { errorCode: code });
}

async function requirePaidAiAccessIfNeeded(uid, auth = null) {
	if (!providerConfigured()) return;
	if (String(process.env.PYXDIA_ALLOW_ALL_SIGNED_IN || "").toLowerCase() === "true") return;
	if (await hasPaidAiAccess(uid, auth)) return;
	throw policyError("entitlement_required", SAFE_ERRORS.entitlement_required, 403);
}

async function hasPaidAiAccess(uid, auth = null) {
	const ownerUids = String(process.env.OWNER_UIDS || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	if (ownerUids.includes(uid)) return true;
	if (auth?.admin === true || auth?.cloud === true) return true;
	const snap = await admin.firestore().collection("users").doc(uid).get();
	const profile = snap.exists ? snap.data() : {};
	return profile?.admin === true || profile?.cloud === true;
}

async function enforceRateLimit(uid, bucket, maxCount, windowSeconds) {
	const windowStart = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000;
	const ref = appRef(uid).collection("pyxdiaRateLimits").doc(`${bucket}-${windowStart}`);
	await admin.firestore().runTransaction(async (transaction) => {
		const snap = await transaction.get(ref);
		const count = snap.exists ? Number(snap.data().count || 0) : 0;
		if (count >= maxCount) throw policyError("rate_limited", SAFE_ERRORS.rate_limited, 429);
		transaction.set(
			ref,
			{
				id: ref.id,
				owner: uid,
				bucket,
				windowStart: new Date(windowStart).toISOString(),
				windowSeconds,
				count: count + 1,
				updatedAt: nowIso(),
				schemaVersion: 1,
			},
			{ merge: true },
		);
	});
}

async function readSettings(uid) {
	const snap = await appRef(uid).collection("pyxdiaSettings").doc("default").get();
	return { ...normalizeSettings(snap.exists ? snap.data() : {}), owner: uid };
}

function normalizeSettings(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const min = clampNumber(source.delayMinHours, 0, 168, 24);
	const max = clampNumber(source.delayMaxHours, min, 336, 72);
	return {
		...DEFAULT_SETTINGS,
		enabled: source.enabled !== false,
		delayEnabled: source.delayEnabled !== false,
		delayMinHours: min,
		delayMaxHours: max,
		memoryEnabled: source.memoryEnabled !== false,
		generalInstructions: cleanText(source.generalInstructions, DEFAULT_SETTINGS.generalInstructions),
		userWantsPyxdiaToKnow: cleanText(source.userWantsPyxdiaToKnow, ""),
		plainTextOnly: true,
		letterMaxWords: clampNumber(source.letterMaxWords, 1, 2000, LETTER_MAX_WORDS),
		letterMaxChars: clampNumber(source.letterMaxChars, 100, 12000, LETTER_MAX_CHARS),
		schemaVersion: 1,
	};
}

function validateLetterSize(text, settings) {
	const clean = String(text || "").trim();
	const words = clean ? clean.split(/\s+/).length : 0;
	const chars = String(text || "").length;
	if (words > settings.letterMaxWords || chars > settings.letterMaxChars) {
		throw policyError("letter_too_large", SAFE_ERRORS.letter_too_large);
	}
	if (!clean) throw policyError("letter_too_large", "Write a letter before sending.");
}

function scrubText(text) {
	const value = String(text || "");
	const blocked = blockedReason(value);
	if (blocked) throw policyError(blocked, SAFE_ERRORS[blocked]);
	let redactions = 0;
	let scrubbed = value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, () => {
		redactions += 1;
		return "<EMAIL_1>";
	});
	scrubbed = scrubbed.replace(/\b(?:\+?1[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]?\d{4}\b/g, () => {
		redactions += 1;
		return "<PHONE_1>";
	});
	return {
		text: scrubbed,
		summary: {
			wasScrubbed: redactions > 0,
			redactionCount: redactions,
			blocked: false,
		},
	};
}

function blockedReason(text) {
	const value = String(text || "");
	const secretPatterns = [
		/sk-[A-Za-z0-9_-]{16,}/,
		/sk-proj-[A-Za-z0-9_-]{16,}/,
		/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
		/\b(?:api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*\S+/i,
	];
	if (secretPatterns.some((pattern) => pattern.test(value))) return "blocked_secret_detected";
	const cardMatches = value.match(/\b(?:\d[ -]*?){13,19}\b/g) || [];
	if (cardMatches.some((match) => luhn(match.replace(/\D/g, "")))) {
		return "blocked_cardholder_data_detected";
	}
	return "";
}

function validatePlainOutput(text) {
	const value = String(text || "").trim();
	if (!value || ["# ", "## ", "- ", "* ", "```", "| ---"].some((token) => value.includes(token))) {
		throw policyError("output_validation_failed", SAFE_ERRORS.output_validation_failed);
	}
}

async function generateLetter(prompt, settings) {
	const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim();
	if (!apiKey) return { letter_text: fallbackLetter(prompt), model: "local-template" };
	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
			"http-referer": "https://ourstuff.space",
			"x-title": "Ourstuff PYXDIA",
		},
		body: JSON.stringify({
			model: process.env.PYXDIA_MODEL || "openai/gpt-4o-mini",
			messages: [
				{ role: "system", content: "Return plain letter text only." },
				{ role: "user", content: prompt },
			],
			temperature: 0.7,
		}),
	});
	if (!response.ok) throw policyError("provider_failed", SAFE_ERRORS.provider_failed, 502);
	const payload = await response.json();
	return {
		letter_text: String(payload.choices?.[0]?.message?.content || "").trim(),
		model: process.env.PYXDIA_MODEL || "openai/gpt-4o-mini",
	};
}

function providerConfigured() {
	return Boolean(String(process.env.OPENROUTER_API_KEY || "").trim());
}

function buildPrompt({ settings, memory, threadContext, noteMetadata, includedContext, letter }) {
	return [
		"SYSTEM:\nYou are PYXDIA PENPAL, a reflective growth companion and AI trainer.\nYou are not a therapist, doctor, clinician, crisis service, or replacement for professional care.\nDraw lightly from Adlerian growth themes, DBT-informed emotional regulation, and Jungian archetypes as interpretive metaphors.\nDo not diagnose or claim clinical authority.\nReturn plain letter text only in the user-visible letter.\n\nInput may be scrubbed. Do not reconstruct placeholders or personal identifiers.\nFocus on meaning, values, patterns, choices, and user intent.",
		`USER SETTINGS:\n${settings.generalInstructions || ""}`,
		`WHAT THE USER WANTS PYXDIA TO KNOW:\n${settings.userWantsPyxdiaToKnow || ""}`,
		`MEMORY:\n${memory.summary || ""}`,
		`THREAD CONTEXT:\n${threadContext || ""}`,
		`NOTE METADATA:\n${noteMetadata || ""}`,
		`USER-APPROVED CONTEXT:\n${includedContext || ""}`,
		`CURRENT LETTER:\n${letter || ""}`,
	].join("\n\n");
}

function fallbackLetter(prompt) {
	let snippet = "your letter";
	if (prompt.includes("CURRENT LETTER:")) {
		snippet = prompt.split("CURRENT LETTER:", 2)[1].trim().split(/\n/)[0].slice(0, 180);
	}
	return [
		"Dear friend,",
		"",
		`I read the center of what you sent: ${snippet}`,
		"",
		"I will keep this grounded and non-clinical. The useful pattern to notice is where responsibility, desire, and hesitation are meeting. In Adlerian language, that points toward belonging and usefulness. In DBT terms, name what is observable, allow the feeling to be present, and choose the smallest next action that respects your values. If archetype language helps, treat it as metaphor for the role you are practicing, not as a fixed identity.",
		"",
		"Write one small promise you can keep in the next day. Make it concrete enough that future you can tell whether it happened.",
		"",
		"PYXDIA",
	].join("\n");
}

async function threadContext(uid, threadId) {
	if (!threadId) return "";
	const snap = await appRef(uid)
		.collection("pyxdiaLetters")
		.where("threadId", "==", threadId)
		.get();
	return snap.docs
		.map((doc) => doc.data())
		.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
		.slice(0, 3)
		.map((letter) => `${letter.state}: ${String(letter.inputText || "").slice(0, 240)}`)
		.join("\n");
}

function updateMemory(uid, current, letter, outputText) {
	const now = nowIso();
	const memory = { ...emptyMemory(uid), ...(current || {}) };
	const sentence =
		String(letter.inputText || "")
			.replace(/\s+/g, " ")
			.split(/[.!?]/)
			.map((item) => item.trim())
			.find(Boolean) || "User continued a PYXDIA letter thread.";
	const entry = {
		id: `memory-${crypto.randomUUID()}`,
		text: sentence.slice(0, 180),
		reasonRemembered: "Captured as a compact theme from a completed letter.",
		sourceLetterIds: [letter.id],
		sensitivity: "private_minimized",
		createdAt: now,
		updatedAt: now,
	};
	const entries = [...(memory.entries || []), entry].slice(-50);
	return {
		...memory,
		owner: uid,
		summary: entries.slice(-5).map((item) => item.text).join(" "),
		entries,
		priorLetterContext: [
			...(memory.priorLetterContext || []),
			{
				letterId: letter.id,
				state: "completed",
				rememberedAt: now,
				outputLength: String(outputText || "").length,
			},
		].slice(-10),
		lastCompactedAt: now,
		updatedAt: now,
		schemaVersion: 1,
	};
}

function emptyMemory(uid = "") {
	return {
		owner: uid,
		title: "PYXDIA memories",
		summary: "",
		recurringThemes: [],
		userStatedGoals: [],
		emotionalPatterns: [],
		values: [],
		possibleArchetypePatterns: [],
		guidancePreferences: [],
		priorLetterContext: [],
		entries: [],
		lastCompactedAt: "",
		updatedAt: "",
		schemaVersion: 1,
	};
}

function appRef(uid) {
	return admin.firestore().collection("users").doc(uid).collection("apps").doc(APP_ID);
}

function draftDoc(uid) {
	return {
		id: "draft",
		threadId: "",
		owner: uid,
		state: "draft",
		inputText: "",
		includedNoteRefs: [],
		userIncludedContext: "",
		contextSelections: [],
		updatedAt: "",
		schemaVersion: 1,
	};
}

function routePath(req, functionName) {
	const path = `/${String(req.path || "/").replace(/^\/+|\/+$/g, "")}`;
	for (const prefix of [`/${functionName}`, "/api/pyxdia", "/api/ai"]) {
		if (path === prefix) return "/";
		if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length);
	}
	return path;
}

function body(req) {
	return req.body && typeof req.body === "object" ? req.body : {};
}

function sendCaught(res, error) {
	const status = error.status || (error.code === "auth_required" ? 401 : 500);
	return sendError(
		res,
		error.code || "provider_failed",
		error.message || SAFE_ERRORS.provider_failed,
		status,
	);
}

function sendError(res, code, message, status = 400) {
	return res.status(status).json({ error: { code, message } });
}

function policyError(code, message, status = 400) {
	const error = new Error(message);
	error.code = code;
	error.status = status;
	return error;
}

function audit(route, uid, status, metadata = {}) {
	console.info("pyxdia_audit", {
		route,
		uidHash: hashUid(uid),
		status,
		...metadata,
	});
}

function hashUid(uid) {
	let hash = 0;
	for (const char of String(uid || "")) hash = (hash * 31 + char.charCodeAt(0)) | 0;
	return Math.abs(hash).toString(16);
}

function threadTitle(text) {
	const clean = String(text || "").replace(/\s+/g, " ").trim();
	return clean.length > 44 ? `${clean.slice(0, 41)}...` : clean || "PYXDIA letter thread";
}

function availableAtFor(settings) {
	if (!settings.delayEnabled) return nowIso();
	const min = Number(settings.delayMinHours || 24);
	const max = Math.max(min, Number(settings.delayMaxHours || min));
	const hours = min + Math.random() * (max - min);
	return new Date(Date.now() + hours * 3600000).toISOString();
}

function cleanText(value, fallback) {
	const text = String(value || "").trim();
	return text || fallback;
}

function clampNumber(value, min, max, fallback) {
	const number = Number(value);
	if (!Number.isFinite(number)) return fallback;
	return Math.min(Math.max(Math.round(number), min), max);
}

function luhn(digits) {
	if (digits.length < 13) return false;
	let total = 0;
	for (let index = 0; index < digits.length; index += 1) {
		let number = Number(digits[digits.length - 1 - index]);
		if (index % 2 === 1) {
			number *= 2;
			if (number > 9) number -= 9;
		}
		total += number;
	}
	return total % 10 === 0;
}

function nowIso() {
	return new Date().toISOString();
}
