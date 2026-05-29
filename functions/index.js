const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();

const OPENROUTER_API_KEY = defineSecret("OPENROUTER_API_KEY");
const APP_ID = "ourstuff-main";
const ALLOWED_ORIGINS = [
	/^https:\/\/([a-z0-9-]+\.)?ourstuff\.space$/i,
	/^http:\/\/localhost:\d+$/i,
	/^http:\/\/127\.0\.0\.1:\d+$/i,
];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PYXDIA_DEFAULT_MODEL = "openai/gpt-chat-latest";
const PYXDIA_REASONING = Object.freeze({ effort: "low", exclude: true });
const LETTER_MAX_WORDS = 650;
const LETTER_MAX_CHARS = 3500;
const NOTE_METADATA_MAX_REFS = 300;
const NOTE_METADATA_MAX_CHARS = 40000;
const DEFAULT_SETTINGS = {
	enabled: true,
	delayEnabled: true,
	delayMinHours: 24,
	delayMaxHours: 72,
	pyxdiaDelayEnabled: true,
	pyxdiaDelayMs: 24 * 60 * 60 * 1000,
	memoryEnabled: true,
	aiBrainMemoryEnabled: true,
	balanceStatsLevel: 0,
	generalInstructions:
		"Be a reflective growth companion. Be direct, kind, practical, and non-clinical.",
	userWantsPyxdiaToKnow: "",
	plainTextOnly: true,
	letterMaxWords: LETTER_MAX_WORDS,
	letterMaxChars: LETTER_MAX_CHARS,
	schemaVersion: 1,
};
const SAFE_ERRORS = {
	auth_required: "Sign in to send PYXIDA letters.",
	feature_disabled: "PYXIDA is turned off in Settings.",
	letter_too_large: "This PYXIDA letter is too large.",
	blocked_secret_detected:
		"This letter contains content that cannot be sent to the AI. Edit and try again.",
	blocked_cardholder_data_detected:
		"This letter contains content that cannot be sent to the AI. Edit and try again.",
	entitlement_required:
		"PYXIDA AI replies require an active Cloud subscription.",
	rate_limited: "Too many PYXIDA requests. Wait a little and try again.",
	provider_failed: "PYXIDA could not finish. Try again.",
	provider_not_configured:
		"PYXIDA AI replies are not configured yet. Try again after the provider is connected.",
	output_validation_failed: "PYXIDA could not finish safely. Try again.",
	context_too_large:
		"Too much note metadata is selected. Filter or clear notes and try again.",
};
const DEFAULT_TRASH_RETENTION_DAYS = 30;
const MAX_TRASH_RETENTION_DAYS = 365;
const TRASH_CLEANUP_BATCH_LIMIT = 100;
const TRASH_ITEM_TYPES = new Set(["artifact", "note", "pyxdia_letter"]);

exports.pyxdiaApi = onRequest(
	{
		cors: ALLOWED_ORIGINS,
		timeoutSeconds: 120,
		secrets: [OPENROUTER_API_KEY],
	},
	async (req, res) => {
		try {
			if (req.method === "OPTIONS") {
				return res.status(204).send("");
			}
			const auth = await verifyAuth(req, SAFE_ERRORS.auth_required);
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
			if (
				req.method === "POST" &&
				path.startsWith("/letters/") &&
				path.endsWith("/retry")
			) {
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
			return sendError(res, "not_found", "PYXIDA route not found.", 404);
		} catch (error) {
			return sendCaught(res, error);
		}
	},
);

exports.aiApi = onRequest(
	{
		cors: ALLOWED_ORIGINS,
		timeoutSeconds: 120,
		secrets: [OPENROUTER_API_KEY],
	},
	async (req, res) => {
		try {
			if (req.method === "OPTIONS") {
				return res.status(204).send("");
			}
			const auth = await verifyAuth(req, "Sign in with Cloud to use AI.");
			const uid = auth.uid;
			await enforceRateLimit(uid, "ai", 60, 3600);
			const payload = body(req);
			const mode =
				routePath(req, "aiApi").replace(/^\/+/, "") || payload.mode || "scrub";
			const text = String(payload.text || "");
			if (mode === "scrub") {
				return res.json(scrubText(text));
			}
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
	},
);

exports.trashApi = onRequest(
	{ cors: ALLOWED_ORIGINS, timeoutSeconds: 120 },
	async (req, res) => {
		try {
			if (req.method === "OPTIONS") {
				return res.status(204).send("");
			}
			const auth = await verifyAuth(req, "Sign in with Cloud to use Trash.");
			const uid = auth.uid;
			const path = routePath(req, "trashApi");
			const payload = body(req);
			if (req.method === "GET" && (path === "/state" || path === "/items")) {
				await enforceRateLimit(uid, "trash-read", 240, 3600);
				const limit = clampNumber(
					req.query?.limit || payload.limit,
					1,
					100,
					50,
				);
				const cursor = String(req.query?.cursor || payload.cursor || "");
				return res.json(await trashStatePayload(uid, { limit, cursor }));
			}
			if (req.method === "PATCH" && path === "/settings") {
				await enforceRateLimit(uid, "trash-settings", 60, 3600);
				const settings = await saveTrashSettings(
					uid,
					payload.settings || payload,
				);
				return res.json(await trashStatePayload(uid, { settings }));
			}
			if (req.method === "POST" && path === "/delete") {
				await enforceRateLimit(uid, "trash-delete", 120, 3600);
				return res.json(
					await deleteUserItem({
						uid,
						itemType: payload.itemType,
						itemId: payload.itemId,
					}),
				);
			}
			if (req.method === "POST" && path === "/restore") {
				await enforceRateLimit(uid, "trash-restore", 120, 3600);
				return res.json(
					await restoreUserItem({ uid, trashItemId: payload.trashItemId }),
				);
			}
			if (req.method === "POST" && path === "/hard-delete") {
				await enforceRateLimit(uid, "trash-hard-delete", 120, 3600);
				return res.json(
					await hardDeleteUserItem({ uid, trashItemId: payload.trashItemId }),
				);
			}
			return sendError(res, "not_found", "Trash route not found.", 404);
		} catch (error) {
			return sendCaught(res, error);
		}
	},
);

exports.processPyxdiaJobs = onSchedule(
	{ schedule: "every 30 minutes", secrets: [OPENROUTER_API_KEY] },
	async () => {
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
				if (String(job.data().availableAt || "") > now) {
					continue;
				}
				await processJob(userDoc.id, job.id);
			}
		}
	},
);

exports.cleanupExpiredTrash = onSchedule("every day 03:00", async () => {
	const db = admin.firestore();
	const now = nowIso();
	const users = await db.collection("users").get();
	let deletedCount = 0;
	let failedCount = 0;
	for (const userDoc of users.docs) {
		const expired = await userDoc.ref
			.collection("trash")
			.where("deleteAfter", "<=", now)
			.limit(TRASH_CLEANUP_BATCH_LIMIT)
			.get();
		for (const trashDoc of expired.docs) {
			try {
				await hardDeleteUserItem({
					uid: userDoc.id,
					trashItemId: trashDoc.id,
					cleanup: true,
				});
				deletedCount += 1;
			} catch (error) {
				failedCount += 1;
				audit("trash/cleanup", userDoc.id, "failed", {
					trashItemId: trashDoc.id,
					errorCode: error.code || "cleanup_failed",
				});
			}
		}
	}
	console.info("trash_cleanup", { deletedCount, failedCount, checkedAt: now });
});

async function verifyAuth(
	req,
	authRequiredMessage = SAFE_ERRORS.auth_required,
) {
	const header = String(req.headers.authorization || "");
	if (!header.toLowerCase().startsWith("bearer ")) {
		throw policyError("auth_required", authRequiredMessage, 401);
	}
	const decoded = await admin.auth().verifyIdToken(header.slice(7).trim());
	if (!decoded.uid) {
		throw policyError("auth_required", authRequiredMessage, 401);
	}
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
	const letters = lettersSnap.docs
		.filter((doc) => doc.id !== "draft")
		.map((doc) => doc.data())
		.filter((letter) => !isDeletedRecord(letter));
	const activeLetterIds = new Set(
		letters.map((letter) => letter.id).filter(Boolean),
	);
	return {
		settings,
		threads: threadsSnap.docs
			.map((doc) => doc.data())
			.filter((thread) => !isDeletedRecord(thread))
			.map((thread) => ({
				...thread,
				letterIds: (thread.letterIds || []).filter((id) =>
					activeLetterIds.has(id),
				),
			}))
			.filter((thread) => (thread.letterIds || []).length),
		letters,
		memory: memorySnap.exists
			? normalizeMemory(memorySnap.data(), uid)
			: emptyMemory(uid),
		aiBrain: aiBrainStatus(),
		draft: draftSnap.exists
			? normalizeDraftPayload(draftSnap.data(), uid)
			: draftDoc(uid),
	};
}

async function saveDraft(uid, payload) {
	const draft = normalizeDraftPayload(
		{ ...draftDoc(uid), ...(payload.draft || payload) },
		uid,
		{ touch: true },
	);
	validateUserSelectedContextBudget(draft.userSelectedContext);
	await appRef(uid)
		.collection("pyxdiaLetters")
		.doc("draft")
		.set(draft, { merge: true });
	audit("pyxdia/draft", uid, "saved");
	return statePayload(uid);
}

async function submitLetter(uid, payload, auth) {
	const settings = normalizeSettings({
		...(await readSettings(uid)),
		...(payload.settings || {}),
	});
	if (!settings.enabled) {
		throw policyError("feature_disabled", SAFE_ERRORS.feature_disabled);
	}
	await requirePaidAiAccessIfNeeded(uid, auth);
	const draft = normalizeDraftPayload(payload.draft || payload, uid);
	const userSelectedContext = normalizeUserSelectedContext(draft);
	const inputText = String(draft.inputText || "");
	validateLetterSize(inputText, settings);
	validateUserSelectedContextBudget(userSelectedContext);
	const scrubbed = scrubText(inputText);
	const context = String(userSelectedContext.manualText || "");
	if (context) {
		scrubText(context);
	}
	const now = nowIso();
	const threadId = String(draft.threadId || `thread-${crypto.randomUUID()}`);
	const requestedLetterId = String(draft.clientLetterId || "").trim();
	const letterId = /^pyxdia-letter-[a-z0-9._-]+$/i.test(requestedLetterId)
		? requestedLetterId
		: `letter-${crypto.randomUUID()}`;
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
		imageRefs: draft.imageRefs || [],
		scrubbedInputText: scrubbed.text,
		outputText: "",
		includedNoteRefs: userSelectedContext.selectedNoteRefs,
		userIncludedContext: context,
		userSelectedContext,
		contextSelections: userSelectedContext.contextSelections,
		staticMemorySnapshot: emptyStaticMemory(uid),
		dynamicRetrievalMemory: emptyDynamicRetrievalMemory(),
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
		app
			.collection("pyxdiaLetters")
			.doc("draft")
			.set(draftDoc(uid), { merge: true }),
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
	if (!settings.delayEnabled) {
		await processJob(uid, letterId);
	}
	return statePayload(uid);
}

async function retryLetter(uid, letterId) {
	const app = appRef(uid);
	const letterRef = app.collection("pyxdiaLetters").doc(letterId);
	const letterSnap = await letterRef.get();
	const letter = letterSnap.exists ? letterSnap.data() : null;
	if (!letter || letter.owner !== uid || isDeletedRecord(letter)) {
		throw policyError("auth_required", "Letter not found.", 404);
	}
	const now = nowIso();
	await Promise.all([
		letterRef.set(
			{ state: "queued", updatedAt: now, errorCode: "", errorMessageSafe: "" },
			{ merge: true },
		),
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
	await appRef(uid)
		.collection("pyxdiaSettings")
		.doc("default")
		.set(settings, { merge: true });
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
	if (!claimed) {
		return;
	}
	const { job, letter } = claimed;
	try {
		await requirePaidAiAccessIfNeeded(uid);
		const settings = await readSettings(uid);
		const memoryRef = app.collection("pyxdiaMemories").doc("current");
		const memorySnap = await memoryRef.get();
		const memory = memorySnap.exists
			? normalizeMemory(memorySnap.data(), uid)
			: emptyMemory(uid);
		const userSelectedContext = normalizeUserSelectedContext(
			letter.userSelectedContext || {
				manualText: letter.userIncludedContext || "",
				selectedNoteRefs: letter.includedNoteRefs || [],
				contextSelections: letter.contextSelections || [],
			},
		);
		validateUserSelectedContextBudget(userSelectedContext);
		const staticMemory = normalizeStaticMemory(
			memory.staticMemory || {
				summary: memory.summary || "",
				entries: memory.entries || [],
			},
			uid,
		);
		const dynamicRetrievalMemory = await buildDynamicRetrievalMemory(
			uid,
			letter,
			memory,
		);
		const aiBrainContext =
			settings.aiBrainMemoryEnabled === false
				? emptyAiBrainContext("disabled")
				: await fetchAiBrainContext().catch((error) => ({
						...emptyAiBrainContext("error"),
						errorCode: safeMetadataField(
							error?.message || "ai_brain_error",
							"",
							80,
						),
					}));
		const scrubbedUserSelectedContext = {
			...userSelectedContext,
			manualText: userSelectedContext.manualText
				? scrubText(userSelectedContext.manualText).text
				: "",
		};
		const scrubbedSettings = {
			...settings,
			userWantsPyxdiaToKnow: settings.userWantsPyxdiaToKnow
				? scrubText(settings.userWantsPyxdiaToKnow).text
				: "",
		};
		const prompt = buildPrompt({
			settings: scrubbedSettings,
			staticMemory,
			dynamicRetrievalMemory,
			aiBrainContext,
			userSelectedContext: scrubbedUserSelectedContext,
			letter:
				letter.scrubbedInputText || scrubText(letter.inputText || "").text,
		});
		const result = await generateLetter(prompt, settings);
		const output = String(result.letter_text || "").trim();
		const scannedOutput = scrubText(output);
		validatePlainOutput(scannedOutput.text);
		const completedAt = nowIso();
		const aiBrainWrite =
			settings.aiBrainMemoryEnabled === false
				? { status: "disabled", draftFirst: true }
				: await rememberAiBrainDraft({
						letter,
						outputText: scannedOutput.text,
						stats: scrubbedUserSelectedContext.balanceStatistics,
					}).catch((error) => ({
						status: "error",
						draftFirst: true,
						errorCode: safeMetadataField(
							error?.message || "ai_brain_error",
							"",
							80,
						),
					}));
		await Promise.all([
			letterRef.set(
				{
					state: "completed",
					outputText: scannedOutput.text,
					staticMemorySnapshot: compactStaticMemorySnapshot(staticMemory),
					dynamicRetrievalMemory,
					aiBrainContextSnapshot: compactAiBrainContextSnapshot(aiBrainContext),
					aiBrainMemoryWrite: aiBrainWrite,
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
			jobRef.set(
				{ state: "completed", updatedAt: completedAt },
				{ merge: true },
			),
			settings.memoryEnabled
				? memoryRef.set(
						updateMemory(
							uid,
							memory,
							{ ...letter, dynamicRetrievalMemory },
							scannedOutput.text,
						),
						{ merge: true },
					)
				: Promise.resolve(),
		]);
		audit("pyxdia/job", uid, "completed", { jobId, model: result.model || "" });
	} catch (error) {
		await failJob(
			uid,
			jobRef,
			letterRef,
			job,
			error.code || "provider_failed",
			error.message || SAFE_ERRORS.provider_failed,
		);
	}
}

async function claimJobTransaction(jobRef, letterRef) {
	const now = nowIso();
	const staleLockBefore = new Date(Date.now() - 10 * 60000).toISOString();
	return admin.firestore().runTransaction(async (transaction) => {
		const [jobSnap, letterSnap] = await Promise.all([
			transaction.get(jobRef),
			transaction.get(letterRef),
		]);
		if (!jobSnap.exists || !letterSnap.exists) {
			return null;
		}
		const job = jobSnap.data();
		const letter = letterSnap.data();
		if (isDeletedRecord(letter)) {
			return null;
		}
		const state = String(job.state || "");
		const lockedAt = String(job.lockedAt || "");
		const locked = lockedAt && lockedAt > staleLockBefore;
		if (
			!["queued", "retry"].includes(state) ||
			locked ||
			String(job.availableAt || "") > now
		) {
			return null;
		}
		const attempts = Number(job.attempts || 0) + 1;
		const patch = {
			state: "processing",
			lockedAt: now,
			lockedBy: "firebase-function",
			attempts,
			updatedAt: now,
		};
		transaction.set(jobRef, patch, { merge: true });
		transaction.set(
			letterRef,
			{ state: "processing", processingAt: now, updatedAt: now },
			{ merge: true },
		);
		return { job: { ...job, ...patch }, letter };
	});
}

async function failJob(uid, jobRef, letterRef, job, code, message) {
	const now = nowIso();
	const attempts = Number(job.attempts || 0);
	const retryable =
		code === "provider_failed" && attempts < Number(job.maxAttempts || 3);
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
	if (!providerConfigured()) {
		return;
	}
	if (
		String(process.env.PYXIDA_ALLOW_ALL_SIGNED_IN || "").toLowerCase() ===
		"true"
	) {
		return;
	}
	if (await hasPaidAiAccess(uid, auth)) {
		return;
	}
	throw policyError(
		"entitlement_required",
		SAFE_ERRORS.entitlement_required,
		403,
	);
}

async function hasPaidAiAccess(uid, auth = null) {
	const ownerUids = String(process.env.OWNER_UIDS || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	if (ownerUids.includes(uid)) {
		return true;
	}
	if (auth?.admin === true || auth?.cloud === true) {
		return true;
	}
	const snap = await admin.firestore().collection("users").doc(uid).get();
	const profile = snap.exists ? snap.data() : {};
	return profile?.admin === true || profile?.cloud === true;
}

async function enforceRateLimit(uid, bucket, maxCount, windowSeconds) {
	const windowStart =
		Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000;
	const ref = appRef(uid)
		.collection("pyxdiaRateLimits")
		.doc(`${bucket}-${windowStart}`);
	await admin.firestore().runTransaction(async (transaction) => {
		const snap = await transaction.get(ref);
		const count = snap.exists ? Number(snap.data().count || 0) : 0;
		if (count >= maxCount) {
			throw policyError("rate_limited", SAFE_ERRORS.rate_limited, 429);
		}
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

async function trashStatePayload(uid, options = {}) {
	const [settings, trash] = await Promise.all([
		options.settings
			? Promise.resolve(normalizeTrashSettings(options.settings))
			: readTrashSettings(uid),
		listTrashItems({
			uid,
			limit: options.limit || 50,
			cursor: options.cursor || "",
		}),
	]);
	return { settings, ...trash };
}

async function readTrashSettings(uid) {
	const snap = await trashSettingsRef(uid).get();
	return normalizeTrashSettings(snap.exists ? snap.data() : {});
}

async function saveTrashSettings(uid, payload = {}) {
	const settings = {
		...normalizeTrashSettings(payload),
		owner: uid,
		updatedAt: nowIso(),
		schemaVersion: 1,
	};
	await trashSettingsRef(uid).set(settings, { merge: true });
	audit("trash/settings", uid, "saved", {
		trashRetentionDays: settings.trashRetentionDays,
	});
	return settings;
}

async function listTrashItems({ uid, limit = 50, cursor = "" }) {
	const cappedLimit = clampNumber(limit, 1, 100, 50);
	let query = userRef(uid)
		.collection("trash")
		.orderBy("deletedAt", "desc")
		.limit(cappedLimit);
	if (cursor) {
		const cursorSnap = await userRef(uid)
			.collection("trash")
			.doc(String(cursor))
			.get();
		if (cursorSnap.exists) {
			query = query.startAfter(cursorSnap);
		}
	}
	const snap = await query.get();
	const items = snap.docs.map((doc) => normalizeTrashIndexItem(doc.data()));
	return {
		items,
		nextCursor:
			snap.docs.length === cappedLimit
				? snap.docs[snap.docs.length - 1].id
				: "",
	};
}

async function deleteUserItem({ uid, itemType, itemId }) {
	const descriptor = trashDescriptor(itemType);
	const cleanItemId = cleanRequiredId(itemId, "itemId");
	const itemRef = descriptor.docRef(uid, cleanItemId);
	const itemSnap = await itemRef.get();
	if (!itemSnap.exists) {
		throw policyError("not_found", "Item not found.", 404);
	}
	const data = itemSnap.data() || {};
	assertUserOwnedItem(uid, data);
	assertDescriptorMatchesItem(descriptor, data);
	const settings = await readTrashSettings(uid);
	if (settings.trashRetentionDays === 0) {
		await deleteStorageFilesForItem(uid, data);
		await Promise.all([
			itemRef.delete(),
			userRef(uid)
				.collection("trash")
				.doc(trashItemIdFor(descriptor.type, cleanItemId))
				.delete(),
			rebuildUserIndexesForItem({
				uid,
				itemType: descriptor.type,
				itemId: cleanItemId,
				mode: "hard",
				itemData: data,
			}),
		]);
		audit("trash/delete", uid, "hard", { itemType: descriptor.type });
		return {
			deleted: true,
			mode: "hard",
			settings,
			itemId: cleanItemId,
			itemType: descriptor.type,
			trashItem: null,
		};
	}
	const now = nowIso();
	const deleteAfter = new Date(
		Date.now() + settings.trashRetentionDays * 24 * 60 * 60 * 1000,
	).toISOString();
	const trashItem = trashIndexItemFor({
		uid,
		descriptor,
		itemId: cleanItemId,
		itemRef,
		data,
		deletedAt: now,
		deleteAfter,
	});
	await admin.firestore().runTransaction(async (transaction) => {
		const currentSnap = await transaction.get(itemRef);
		if (!currentSnap.exists) {
			throw policyError("not_found", "Item not found.", 404);
		}
		assertUserOwnedItem(uid, currentSnap.data() || {});
		assertDescriptorMatchesItem(descriptor, currentSnap.data() || {});
		transaction.set(
			itemRef,
			{
				deleted: true,
				deletedAt: now,
				deleteAfter,
				deletedBy: uid,
				deleteMode: "soft",
				originalCollection: descriptor.originalCollection,
				updatedAt: now,
			},
			{ merge: true },
		);
		transaction.set(
			userRef(uid).collection("trash").doc(trashItem.trashItemId),
			trashItem,
			{ merge: true },
		);
	});
	await rebuildUserIndexesForItem({
		uid,
		itemType: descriptor.type,
		itemId: cleanItemId,
		mode: "soft",
		deletedAt: now,
		itemData: data,
	});
	audit("trash/delete", uid, "soft", { itemType: descriptor.type });
	return {
		deleted: true,
		mode: "soft",
		settings,
		itemId: cleanItemId,
		itemType: descriptor.type,
		trashItem,
	};
}

async function restoreUserItem({ uid, trashItemId }) {
	const cleanTrashItemId = cleanRequiredId(trashItemId, "trashItemId");
	const trashRef = userRef(uid).collection("trash").doc(cleanTrashItemId);
	const trashSnap = await trashRef.get();
	if (!trashSnap.exists) {
		throw policyError("not_found", "Trash item not found.", 404);
	}
	const trashItem = normalizeTrashIndexItem(trashSnap.data());
	assertTrashItemOwner(uid, trashItem);
	const itemRef = originalItemRefFromTrash(uid, trashItem);
	const itemSnap = await itemRef.get();
	if (!itemSnap.exists) {
		await trashRef.set(
			{ canRestore: false, updatedAt: nowIso() },
			{ merge: true },
		);
		throw policyError("not_found", "Original item no longer exists.", 404);
	}
	assertUserOwnedItem(uid, itemSnap.data() || {});
	assertDescriptorMatchesItem(
		trashDescriptor(trashItem.itemType),
		itemSnap.data() || {},
	);
	const now = nowIso();
	await admin.firestore().runTransaction(async (transaction) => {
		transaction.set(
			itemRef,
			{
				deleted: false,
				deletedAt: null,
				deleteAfter: null,
				deletedBy: null,
				deleteMode: admin.firestore.FieldValue.delete(),
				originalCollection: admin.firestore.FieldValue.delete(),
				data: {
					ourstuff: {
						artifact: {
							deleted: false,
							deletedAt: null,
							deleteAfter: null,
							deletedBy: "",
							deleteMode: "",
							originalCollection: "",
							properties: {
								deleted: false,
								status: "active",
								deletedAt: admin.firestore.FieldValue.delete(),
								deleteAfter: admin.firestore.FieldValue.delete(),
								deletedBy: admin.firestore.FieldValue.delete(),
								deleteMode: admin.firestore.FieldValue.delete(),
								originalCollection: admin.firestore.FieldValue.delete(),
							},
						},
					},
				},
				updatedAt: now,
			},
			{ merge: true },
		);
		transaction.delete(trashRef);
	});
	await rebuildUserIndexesForItem({
		uid,
		itemType: trashItem.itemType,
		itemId: trashItem.itemId,
		mode: "restore",
		itemData: itemSnap.data() || {},
	});
	audit("trash/restore", uid, "restored", { itemType: trashItem.itemType });
	return {
		restored: true,
		trashItemId: cleanTrashItemId,
		itemId: trashItem.itemId,
	};
}

async function hardDeleteUserItem({ uid, trashItemId, cleanup = false }) {
	const cleanTrashItemId = cleanRequiredId(trashItemId, "trashItemId");
	const trashRef = userRef(uid).collection("trash").doc(cleanTrashItemId);
	const trashSnap = await trashRef.get();
	if (!trashSnap.exists) {
		if (cleanup) {
			return { deleted: false, missing: true };
		}
		throw policyError("not_found", "Trash item not found.", 404);
	}
	const trashItem = normalizeTrashIndexItem(trashSnap.data());
	assertTrashItemOwner(uid, trashItem);
	const itemRef = originalItemRefFromTrash(uid, trashItem);
	const itemSnap = await itemRef.get();
	if (itemSnap.exists) {
		const data = itemSnap.data() || {};
		assertUserOwnedItem(uid, data);
		assertDescriptorMatchesItem(trashDescriptor(trashItem.itemType), data);
		await deleteStorageFilesForItem(uid, data);
	}
	await admin.firestore().runTransaction(async (transaction) => {
		transaction.delete(itemRef);
		transaction.delete(trashRef);
	});
	await rebuildUserIndexesForItem({
		uid,
		itemType: trashItem.itemType,
		itemId: trashItem.itemId,
		mode: "hard",
		itemData: itemSnap.exists ? itemSnap.data() || {} : {},
	});
	audit("trash/hard-delete", uid, cleanup ? "cleanup_deleted" : "deleted", {
		itemType: trashItem.itemType,
	});
	return {
		deleted: true,
		trashItemId: cleanTrashItemId,
		itemId: trashItem.itemId,
	};
}

async function rebuildUserIndexesForItem({
	uid,
	itemType,
	itemId,
	mode = "restore",
	deletedAt = "",
	itemData = {},
}) {
	const cleanItemId = cleanRequiredId(itemId, "itemId");
	const normalizedType = normalizeTrashItemType(itemType);
	const tasks = [
		updateIndexCollectionForItem(
			uid,
			"noteSearchIndex",
			normalizedType,
			cleanItemId,
			mode,
			deletedAt,
		),
		updateIndexCollectionForItem(
			uid,
			"quicknoteIndex",
			normalizedType,
			cleanItemId,
			mode,
			deletedAt,
		),
		updateIndexCollectionForItem(
			uid,
			"pyxdiaDynamicMemoryIndex",
			normalizedType,
			cleanItemId,
			mode,
			deletedAt,
		),
	];
	if (normalizedType === "pyxdia_letter") {
		tasks.push(refreshPyxdiaThreadIndexes(uid, cleanItemId, itemData));
		tasks.push(updateStaticMemoryForSourceMutation(uid, cleanItemId, mode));
		if (mode !== "restore") {
			tasks.push(
				appRef(uid)
					.collection("pyxdiaProcessingJobs")
					.doc(cleanItemId)
					.set({ state: "deleted", updatedAt: nowIso() }, { merge: true })
					.catch(() => null),
			);
		}
	}
	await Promise.all(tasks);
	audit("trash/indexes", uid, mode, { itemType: normalizedType });
}

async function updateIndexCollectionForItem(
	uid,
	collectionName,
	itemType,
	itemId,
	mode,
	deletedAt = "",
) {
	const collection = appRef(uid).collection(collectionName);
	const refs = new Map();
	const candidateIds = [
		itemId,
		`${itemType}-${itemId}`,
		`${collectionName}-${itemType}-${itemId}`,
	].map((id) => id.replace(/\//g, "-"));
	await Promise.all(
		candidateIds.map(async (docId) => {
			const ref = collection.doc(docId);
			const snap = await ref.get();
			if (snap.exists) {
				refs.set(ref.path, ref);
			}
		}),
	);
	const fieldNames = indexFieldNamesForItemType(itemType);
	await Promise.all(
		fieldNames.map(async (fieldName) => {
			const snap = await collection
				.where(fieldName, "==", itemId)
				.limit(25)
				.get();
			snap.docs.forEach((doc) => refs.set(doc.ref.path, doc.ref));
		}),
	);
	await Promise.all(
		Array.from(refs.values()).map((ref) =>
			updateIndexDocRef(ref, mode, deletedAt),
		),
	);
}

function indexFieldNamesForItemType(itemType) {
	const fields = ["itemId", "sourceItemId", "sourceId"];
	if (itemType === "note") {
		fields.push("noteId", "artifactId");
	} else if (itemType === "artifact") {
		fields.push("artifactId");
	} else if (itemType === "pyxdia_letter") {
		fields.push("letterId", "sourceLetterId");
	}
	return Array.from(new Set(fields));
}

async function updateIndexDocRef(ref, mode, deletedAt = "") {
	if (mode === "hard") {
		await ref.delete();
		return;
	}
	const restored = mode === "restore";
	await ref.set(
		{
			active: restored,
			deleted: !restored,
			deletedAt: restored ? null : deletedAt || nowIso(),
			updatedAt: nowIso(),
		},
		{ merge: true },
	);
}

async function refreshPyxdiaThreadIndexes(uid, letterId, itemData = {}) {
	const threadId = String(itemData.threadId || "");
	if (!threadId) {
		return;
	}
	const snap = await appRef(uid)
		.collection("pyxdiaLetters")
		.where("threadId", "==", threadId)
		.get();
	const letters = snap.docs
		.map((doc) => doc.data())
		.filter((letter) => !isDeletedRecord(letter))
		.sort((left, right) =>
			String(
				right.updatedAt || right.completedAt || right.createdAt || "",
			).localeCompare(
				String(left.updatedAt || left.completedAt || left.createdAt || ""),
			),
		);
	const latest = letters[0] || null;
	await appRef(uid)
		.collection("pyxdiaThreads")
		.doc(threadId)
		.set(
			{
				letterIds: letters.map((letter) => letter.id).filter(Boolean),
				latestLetterId: latest?.id || "",
				latestState: latest?.state || "empty",
				status: latest ? "active" : "empty",
				updatedAt: nowIso(),
			},
			{ merge: true },
		);
}

async function updateStaticMemoryForSourceMutation(uid, letterId, mode) {
	const memoryRef = appRef(uid).collection("pyxdiaMemories").doc("current");
	const snap = await memoryRef.get();
	if (!snap.exists) {
		return;
	}
	const now = nowIso();
	const memory = normalizeMemory(snap.data(), uid);
	const staticMemory = normalizeStaticMemory(memory.staticMemory, uid);
	const currentPriorContext = Array.isArray(memory.priorLetterContext)
		? memory.priorLetterContext
		: [];
	const priorLetterContext =
		mode === "restore"
			? currentPriorContext
			: currentPriorContext.filter((item) => item?.letterId !== letterId);
	let changed = false;
	if (priorLetterContext.length !== currentPriorContext.length) {
		changed = true;
	}
	const entries = (staticMemory.entries || []).map((entry) => {
		const sourceLetterIds = Array.from(new Set(entry.sourceLetterIds || []));
		const staleSourceLetterIds = Array.from(
			new Set(entry.staleSourceLetterIds || []),
		);
		if (mode === "restore") {
			if (!staleSourceLetterIds.includes(letterId)) {
				return entry;
			}
			changed = true;
			return {
				...entry,
				status:
					entry.status === "stale_pending_review" ? "active" : entry.status,
				sourceLetterIds: Array.from(new Set([...sourceLetterIds, letterId])),
				staleSourceLetterIds: staleSourceLetterIds.filter(
					(id) => id !== letterId,
				),
				updatedAt: now,
			};
		}
		if (!sourceLetterIds.includes(letterId)) {
			return entry;
		}
		changed = true;
		const nextSources = sourceLetterIds.filter((id) => id !== letterId);
		return {
			...entry,
			status: nextSources.length ? entry.status : "stale_pending_review",
			sourceLetterIds: nextSources,
			staleSourceLetterIds: nextSources.length
				? staleSourceLetterIds
				: Array.from(new Set([...staleSourceLetterIds, letterId])),
			updatedAt: now,
		};
	});
	if (!changed) {
		return;
	}
	const activeSummary = entries
		.filter((entry) => entry.status === "active")
		.slice(-5)
		.map((entry) => entry.text || entry.summary)
		.join(" ");
	await memoryRef.set(
		{
			...memory,
			summary: activeSummary,
			entries: entries.map(memoryEntryToLegacyEntry),
			priorLetterContext,
			staticMemory: {
				...staticMemory,
				summary: activeSummary,
				entries,
				updatedAt: now,
			},
			updatedAt: now,
		},
		{ merge: true },
	);
}

function normalizeTrashSettings(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const retentionValue =
		source.trashRetentionDays === "" || source.trashRetentionDays == null
			? DEFAULT_TRASH_RETENTION_DAYS
			: source.trashRetentionDays;
	return {
		trashRetentionDays: clampNumber(
			retentionValue,
			0,
			MAX_TRASH_RETENTION_DAYS,
			DEFAULT_TRASH_RETENTION_DAYS,
		),
		schemaVersion: 1,
	};
}

function normalizeTrashIndexItem(value = {}) {
	return {
		owner: String(value.owner || ""),
		trashItemId: String(value.trashItemId || ""),
		itemId: String(value.itemId || ""),
		itemType: String(value.itemType || "item"),
		title: String(value.title || "Untitled item"),
		snippet: String(value.snippet || ""),
		originalPath: String(value.originalPath || ""),
		originalCollection: String(value.originalCollection || ""),
		deletedAt: String(value.deletedAt || ""),
		deleteAfter: String(value.deleteAfter || ""),
		deletedBy: String(value.deletedBy || ""),
		deleteMode: String(value.deleteMode || "soft"),
		canRestore: value.canRestore !== false,
		schemaVersion: 1,
	};
}

function trashIndexItemFor({
	uid,
	descriptor,
	itemId,
	itemRef,
	data,
	deletedAt,
	deleteAfter,
}) {
	const preview = trashPreviewFor(descriptor.type, data);
	const trashItemId = trashItemIdFor(descriptor.type, itemId);
	return normalizeTrashIndexItem({
		owner: uid,
		trashItemId,
		itemId,
		itemType: descriptor.type,
		title: preview.title,
		snippet: preview.snippet,
		originalPath: itemRef.path,
		originalCollection: descriptor.originalCollection,
		deletedAt,
		deleteAfter,
		deletedBy: uid,
		deleteMode: "soft",
		canRestore: true,
		schemaVersion: 1,
	});
}

function trashPreviewFor(itemType, data = {}) {
	const artifact =
		data.data?.ourstuff?.artifact ||
		data.extraAttributes?.ourstuff?.artifact ||
		{};
	const title =
		cleanPreviewText(
			data.title || artifact.title || data.name || `${itemType} item`,
		) || "Untitled item";
	const text =
		artifact.body ||
		data.body ||
		data.inputText ||
		data.outputText ||
		data.summary ||
		data.description ||
		"";
	return {
		title: title.slice(0, 160),
		snippet: cleanPreviewText(text).slice(0, 220),
	};
}

function cleanPreviewText(value = "") {
	return String(value || "")
		.replace(/[#*_`>[\]()]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function isDeletedRecord(value = {}) {
	return value?.deleted === true || value?.deleteMode === "soft";
}

function trashDescriptor(itemType) {
	const type = normalizeTrashItemType(itemType);
	if (type === "artifact") {
		return {
			type,
			originalCollection: "artifacts",
			docRef: (uid, itemId) => appRef(uid).collection("artifacts").doc(itemId),
		};
	}
	if (type === "pyxdia_letter") {
		return {
			type,
			originalCollection: "pyxdiaLetters",
			docRef: (uid, itemId) =>
				appRef(uid).collection("pyxdiaLetters").doc(itemId),
		};
	}
	return {
		type,
		originalCollection: "artifacts",
		requiredDocType: "note",
		docRef: (uid, itemId) => appRef(uid).collection("artifacts").doc(itemId),
	};
}

function normalizeTrashItemType(value) {
	const type = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/-/g, "_");
	if (!TRASH_ITEM_TYPES.has(type)) {
		throw policyError(
			"unsupported_item_type",
			"This item type cannot be moved to Trash.",
			400,
		);
	}
	return type;
}

function originalItemRefFromTrash(uid, trashItem) {
	const originalPath = String(trashItem.originalPath || "");
	if (!originalPath.startsWith(`users/${uid}/`)) {
		throw policyError(
			"auth_required",
			"Trash item is outside this account.",
			403,
		);
	}
	return admin.firestore().doc(originalPath);
}

function assertUserOwnedItem(uid, data = {}) {
	if (data.owner && data.owner !== uid) {
		throw policyError("auth_required", "Item is outside this account.", 403);
	}
	const owners = data.acl?.owners;
	if (Array.isArray(owners) && !owners.includes(uid)) {
		throw policyError("auth_required", "Item is outside this account.", 403);
	}
}

function assertDescriptorMatchesItem(descriptor = {}, data = {}) {
	if (descriptor.requiredDocType && data.type !== descriptor.requiredDocType) {
		throw policyError(
			"unsupported_item_type",
			"This item type cannot be moved to Trash.",
			400,
		);
	}
}

function assertTrashItemOwner(uid, trashItem = {}) {
	if (
		trashItem.owner !== uid ||
		!trashItem.originalPath.startsWith(`users/${uid}/`)
	) {
		throw policyError(
			"auth_required",
			"Trash item is outside this account.",
			403,
		);
	}
}

async function deleteStorageFilesForItem(uid, data = {}) {
	const paths = Array.from(collectStoragePaths(data, uid));
	if (!paths.length) {
		return;
	}
	const bucket = admin.storage().bucket();
	await Promise.all(
		paths.map((path) =>
			bucket
				.file(path)
				.delete({ ignoreNotFound: true })
				.catch((error) => {
					console.warn("trash_storage_delete_failed", {
						uidHash: hashUid(uid),
						path,
						message: error?.message || "delete failed",
					});
				}),
		),
	);
}

function collectStoragePaths(value, uid, output = new Set(), depth = 0) {
	if (depth > 8 || value == null) {
		return output;
	}
	const prefix = `users/${uid}/apps/${APP_ID}/media/`;
	if (typeof value === "string") {
		const text = value.trim();
		if (text.startsWith(prefix)) {
			output.add(text);
		}
		const direct = text.match(new RegExp(`(${escapeRegex(prefix)}[^?#\\s]+)`));
		if (direct) {
			output.add(direct[1]);
		}
		const gs = text.match(
			new RegExp(`^gs://[^/]+/(${escapeRegex(prefix)}[^?#\\s]+)`),
		);
		if (gs) {
			output.add(gs[1]);
		}
		return output;
	}
	if (Array.isArray(value)) {
		value.forEach((item) => collectStoragePaths(item, uid, output, depth + 1));
		return output;
	}
	if (typeof value === "object") {
		Object.values(value).forEach((item) =>
			collectStoragePaths(item, uid, output, depth + 1),
		);
	}
	return output;
}

function trashItemIdFor(itemType, itemId) {
	return `trash-${crypto.createHash("sha256").update(`${itemType}:${itemId}`).digest("hex").slice(0, 24)}`;
}

function trashSettingsRef(uid) {
	return userRef(uid).collection("settings").doc("trash");
}

function userRef(uid) {
	return admin.firestore().collection("users").doc(uid);
}

function cleanRequiredId(value, fieldName) {
	const text = String(value || "").trim();
	if (!text || text.includes("/")) {
		throw policyError("invalid_request", `${fieldName} is required.`, 400);
	}
	return text;
}

async function readSettings(uid) {
	const snap = await appRef(uid)
		.collection("pyxdiaSettings")
		.doc("default")
		.get();
	return { ...normalizeSettings(snap.exists ? snap.data() : {}), owner: uid };
}

function normalizeSettings(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const min = clampNumber(source.delayMinHours, 0, 168, 24);
	const max = clampNumber(source.delayMaxHours, min, 336, 72);
	const delayEnabled =
		source.pyxdiaDelayEnabled !== undefined
			? source.pyxdiaDelayEnabled !== false
			: source.delayEnabled !== false;
	return {
		...DEFAULT_SETTINGS,
		enabled: source.enabled !== false,
		delayEnabled,
		delayMinHours: min,
		delayMaxHours: max,
		pyxdiaDelayEnabled: delayEnabled,
		pyxdiaDelayMs: delayEnabled ? min * 60 * 60 * 1000 : 0,
		memoryEnabled: source.memoryEnabled !== false,
		aiBrainMemoryEnabled: source.aiBrainMemoryEnabled !== false,
		balanceStatsLevel: Math.min(
			100,
			Math.max(
				0,
				Math.round(clampNumber(source.balanceStatsLevel, 0, 100, 0) / 25) * 25,
			),
		),
		generalInstructions: cleanText(
			source.generalInstructions,
			DEFAULT_SETTINGS.generalInstructions,
		),
		userWantsPyxdiaToKnow: cleanText(source.userWantsPyxdiaToKnow, ""),
		plainTextOnly: true,
		letterMaxWords: clampNumber(
			source.letterMaxWords,
			1,
			2000,
			LETTER_MAX_WORDS,
		),
		letterMaxChars: clampNumber(
			source.letterMaxChars,
			100,
			12000,
			LETTER_MAX_CHARS,
		),
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
	if (!clean) {
		throw policyError("letter_too_large", "Write a letter before sending.");
	}
}

function scrubText(text) {
	const value = String(text || "");
	const blocked = blockedReason(value);
	if (blocked) {
		throw policyError(blocked, SAFE_ERRORS[blocked]);
	}
	let redactions = 0;
	let scrubbed = value.replace(
		/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
		() => {
			redactions += 1;
			return "<EMAIL_1>";
		},
	);
	scrubbed = scrubbed.replace(
		/\b(?:\+?1[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]?\d{4}\b/g,
		() => {
			redactions += 1;
			return "<PHONE_1>";
		},
	);
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
	if (secretPatterns.some((pattern) => pattern.test(value))) {
		return "blocked_secret_detected";
	}
	const cardMatches = value.match(/\b(?:\d[ -]*?){13,19}\b/g) || [];
	if (cardMatches.some((match) => luhn(match.replace(/\D/g, "")))) {
		return "blocked_cardholder_data_detected";
	}
	return "";
}

function validatePlainOutput(text) {
	const value = String(text || "").trim();
	if (
		!value ||
		["# ", "## ", "- ", "* ", "```", "| ---"].some((token) =>
			value.includes(token),
		) ||
		isTemplatePyxdiaOutput(value)
	) {
		throw policyError(
			"output_validation_failed",
			SAFE_ERRORS.output_validation_failed,
		);
	}
}

function isTemplatePyxdiaOutput(value = "") {
	const text = String(value || "");
	return [
		"I read the center of what you sent",
		"In Adlerian language",
		"In DBT terms",
		"archetype language helps",
		"I will keep this grounded and non-clinical",
	].some((marker) => text.includes(marker));
}

async function generateLetter(prompt, _settings) {
	const apiKey = openRouterApiKey();
	if (!apiKey) {
		if (allowLocalProviderFallback()) {
			return { letter_text: fallbackLetter(prompt), model: "local-template" };
		}
		throw policyError(
			"provider_not_configured",
			SAFE_ERRORS.provider_not_configured,
			503,
		);
	}
	const model = pyxdiaModelName();
	const messages = providerMessages(prompt);
	const response = await fetch(OPENROUTER_URL, {
		method: "POST",
		headers: {
			authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
			"http-referer": "https://ourstuff.space",
			"x-title": "Ourstuff PYXIDA",
		},
		body: JSON.stringify({
			model,
			messages,
			temperature: 0.78,
			presence_penalty: 0.35,
			frequency_penalty: 0.45,
			max_tokens: 1400,
			reasoning: PYXDIA_REASONING,
			provider: {
				allow_fallbacks: false,
			},
		}),
	});
	if (!response.ok) {
		throw policyError("provider_failed", SAFE_ERRORS.provider_failed, 502);
	}
	const payload = await response.json();
	return {
		letter_text: String(payload.choices?.[0]?.message?.content || "").trim(),
		model,
	};
}

function providerMessages(prompt) {
	if (prompt && typeof prompt === "object") {
		return [
			{ role: "system", content: String(prompt.system || "") },
			{ role: "developer", content: String(prompt.developer || "") },
			{ role: "user", content: String(prompt.user || "") },
		].filter((message) => message.content.trim());
	}
	return [
		{
			role: "system",
			content:
				"You are PYXIDA PENPAL. Return one warm plain-text letter only. Do not use markdown, headings, bullets, or clinical labels.",
		},
		{
			role: "developer",
			content:
				"Write from the user's actual words. Avoid canned openings, framework exposition, generic therapy-sounding advice, and repeated template paragraphs.",
		},
		{ role: "user", content: String(prompt || "") },
	];
}

function pyxdiaModelName() {
	return (
		String(
			process.env.PYXDIA_MODEL ||
				process.env.PYXIDA_MODEL ||
				PYXDIA_DEFAULT_MODEL,
		).trim() || PYXDIA_DEFAULT_MODEL
	);
}

function allowLocalProviderFallback() {
	return (
		String(process.env.FUNCTIONS_EMULATOR || "").toLowerCase() === "true" ||
		String(process.env.NODE_ENV || "").toLowerCase() === "test"
	);
}

function providerConfigured() {
	return Boolean(openRouterApiKey());
}

function openRouterApiKey() {
	const envKey = String(process.env.OPENROUTER_API_KEY || "").trim();
	if (envKey) {
		return envKey;
	}
	try {
		return String(OPENROUTER_API_KEY.value() || "").trim();
	} catch {
		return "";
	}
}

function aiBrainConfig() {
	const apiBase = String(process.env.AI_BRAIN_API_BASE || "")
		.trim()
		.replace(/\/+$/, "");
	const token = String(
		process.env.AI_BRAIN_API_TOKEN || process.env.AI_BRAIN_API_KEY || "",
	).trim();
	return {
		apiBase,
		token,
		projectSlug: String(
			process.env.AI_BRAIN_PROJECT_SLUG || "ourstuff.space",
		).trim(),
		consumer: String(process.env.AI_BRAIN_CONSUMER || "pyxdia").trim(),
		configured: Boolean(apiBase && token),
	};
}

function aiBrainStatus() {
	const config = aiBrainConfig();
	return {
		configured: config.configured,
		projectSlug: config.projectSlug,
		consumer: config.consumer,
		readEnabled: config.configured,
		writeEnabled: config.configured,
		draftFirst: true,
	};
}

function emptyAiBrainContext(status = "skipped") {
	return {
		status,
		items: [],
		piiSafe: true,
		retrievedAt: "",
		consumer: aiBrainConfig().consumer,
	};
}

async function aiBrainFetchJson(path, init = {}) {
	const config = aiBrainConfig();
	if (!config.configured) {
		return null;
	}
	const response = await fetch(`${config.apiBase}${path}`, {
		...init,
		headers: {
			authorization: `Bearer ${config.token}`,
			"content-type": "application/json",
			"x-brain-consumer": config.consumer,
			...(init.headers || {}),
		},
	});
	if (!response.ok) {
		throw new Error(`ai_brain_${response.status}`);
	}
	return response.json();
}

async function fetchAiBrainContext() {
	const config = aiBrainConfig();
	if (!config.configured) {
		return emptyAiBrainContext("not_configured");
	}
	const payload = await aiBrainFetchJson(
		`/api/v1/projects/${encodeURIComponent(config.projectSlug)}/context?consumer=${encodeURIComponent(config.consumer)}`,
	);
	const items = Array.isArray(payload?.items)
		? payload.items
		: Array.isArray(payload?.context)
			? payload.context
			: [];
	return {
		status: "ok",
		items: items
			.filter(
				(item) =>
					item?.llmSafe !== false &&
					["approved", "locked", "active"].includes(
						String(item?.status || "approved").toLowerCase(),
					),
			)
			.slice(0, 12)
			.map((item) => ({
				id: safeMetadataField(item.id || item.memoryId || "", "", 120),
				text: safePromptText(
					item.text || item.summary || item.content || "",
					700,
				),
				tags: Array.isArray(item.tags)
					? item.tags.map((tag) => safeMetadataField(tag, "", 40)).slice(0, 8)
					: [],
				status: safeMetadataField(item.status || "approved", "approved", 40),
			}))
			.filter((item) => item.text),
		piiSafe: true,
		retrievedAt: nowIso(),
		consumer: config.consumer,
	};
}

function formatAiBrainContext(context = emptyAiBrainContext()) {
	const safe = context || emptyAiBrainContext();
	if (safe.status !== "ok" || !safe.items?.length) {
		return JSON.stringify(
			{
				status: safe.status || "skipped",
				items: [],
				policy:
					"Use no AI Brain context unless approved LLM-safe items are present.",
			},
			null,
			2,
		);
	}
	return JSON.stringify(
		{
			status: "ok",
			authority: "approved_ai_brain_memory",
			authorityRank: 2.5,
			policy:
				"Approved or locked LLM-safe AI Brain context only. Lower priority than the current letter and selected context.",
			items: safe.items,
		},
		null,
		2,
	);
}

function compactAiBrainContextSnapshot(context = emptyAiBrainContext()) {
	return {
		status: context.status || "skipped",
		itemCount: Array.isArray(context.items) ? context.items.length : 0,
		retrievedAt: context.retrievedAt || "",
		consumer: context.consumer || aiBrainConfig().consumer,
		piiSafe: true,
	};
}

function safeAiBrainMemoryText({ letter, outputText, stats } = {}) {
	const input = scrubText(
		letter?.scrubbedInputText || letter?.inputText || "",
	).text;
	const pattern = memoryCandidateFromLetter({
		...letter,
		scrubbedInputText: input,
	});
	const safeStats = safeBalanceStatisticsForPrompt(stats);
	return JSON.stringify(
		{
			source: "pyxdia",
			theme: pattern,
			replySummary: safePromptText(outputText || "", 700),
			balanceStatistics: safeStats,
		},
		null,
		2,
	).slice(0, 4000);
}

async function rememberAiBrainDraft({ letter, outputText, stats } = {}) {
	const config = aiBrainConfig();
	if (!config.configured) {
		return { status: "not_configured", draftFirst: true };
	}
	await aiBrainFetchJson("/api/v1/remember", {
		method: "POST",
		body: JSON.stringify({
			projectSlug: config.projectSlug,
			consumer: config.consumer,
			sourceApp: "pyxdia",
			text: safeAiBrainMemoryText({ letter, outputText, stats }),
			userSuggestedCategory: "02 Patterns",
			userSuggestedTags: ["pyxdia", "ourstuff", "balance"],
			allowRawStorage: false,
			status: "draft",
			allowedConsumers: ["chatgpt", "codex", "mort", "mcp", "pyxdia"],
		}),
	});
	return { status: "draft_created", draftFirst: true, writtenAt: nowIso() };
}

function normalizeDraftPayload(value = {}, uid = "", options = {}) {
	const source = value && typeof value === "object" ? value : {};
	const userSelectedContext = normalizeUserSelectedContext({
		...(source.userSelectedContext || {}),
		manualText:
			source.userSelectedContext?.manualText ??
			source.userIncludedContext ??
			"",
		selectedNoteRefs:
			source.userSelectedContext?.selectedNoteRefs ??
			source.includedNoteRefs ??
			[],
		contextSelections:
			source.userSelectedContext?.contextSelections ??
			source.contextSelections ??
			[],
		balanceStatistics: source.userSelectedContext?.balanceStatistics,
	});
	return {
		...draftDoc(uid),
		...source,
		id: "draft",
		clientLetterId: String(source.clientLetterId || source.letterId || ""),
		owner: uid,
		state: "draft",
		inputText: String(source.inputText || ""),
		imageRefs: normalizeImageRefs(source.imageRefs),
		includedNoteRefs: userSelectedContext.selectedNoteRefs,
		userIncludedContext: userSelectedContext.manualText,
		userSelectedContext,
		contextSelections: userSelectedContext.contextSelections,
		noteSelectionMode: source.noteSelectionMode === "custom" ? "custom" : "all",
		updatedAt: options.touch ? nowIso() : String(source.updatedAt || ""),
		schemaVersion: 1,
	};
}

function normalizeUserSelectedContext(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const selectedNoteRefs = Array.isArray(source.selectedNoteRefs)
		? source.selectedNoteRefs
		: Array.isArray(source.includedNoteRefs)
			? source.includedNoteRefs
			: [];
	const contextSelections = Array.isArray(source.contextSelections)
		? source.contextSelections.map(String).filter(Boolean)
		: selectedNoteRefs.map((ref) => String(ref?.id || "")).filter(Boolean);
	const selectedIds = contextSelections.length
		? contextSelections
		: selectedNoteRefs.map((ref) => String(ref?.id || "")).filter(Boolean);
	return {
		authority: "user_selected",
		authorityRank: 1,
		purpose: "User explicitly selected this context for the current letter.",
		manualText: String(source.manualText ?? source.userIncludedContext ?? ""),
		selectedNoteRefs: selectedNoteRefs
			.map(normalizeNoteRef)
			.filter((ref) => ref.id),
		selectedMemoryEntryIds: Array.isArray(source.selectedMemoryEntryIds)
			? source.selectedMemoryEntryIds.map(String).filter(Boolean).slice(0, 24)
			: [],
		selectedProjectEntryIds: Array.isArray(source.selectedProjectEntryIds)
			? source.selectedProjectEntryIds.map(String).filter(Boolean).slice(0, 24)
			: [],
		contextSelections: selectedIds,
		balanceStatistics: normalizeBalanceStatistics(source.balanceStatistics),
		schemaVersion: 1,
	};
}

function normalizeBalanceStatistics(value = null) {
	if (!value || typeof value !== "object") {
		return null;
	}
	const source = value;
	const level = Math.min(
		100,
		Math.max(0, Math.round(clampNumber(source.level, 0, 100, 0) / 25) * 25),
	);
	if (!level || source.enabled === false) {
		return null;
	}
	const areas = Array.isArray(source.areas)
		? source.areas.slice(0, 4).map((area) => ({
				name: safeMetadataField(area?.name || "", "Area", 80),
				count: clampNumber(area?.count, 0, 100000, 0),
				percent: clampNumber(area?.percent, 0, 100, 0),
				notes: clampNumber(area?.notes, 0, 100000, 0),
				thoughts: clampNumber(area?.thoughts, 0, 100000, 0),
				goals: clampNumber(area?.goals, 0, 100000, 0),
			}))
		: [];
	const recentActivity = Array.isArray(source.recentActivity)
		? source.recentActivity.slice(0, 12).map((item) => ({
				area: safeMetadataField(item?.area || "", "Area", 80),
				role: safeMetadataField(item?.role || "activity", "activity", 80),
				action: safeMetadataField(item?.action || "activity", "activity", 80),
				dateKey: safeMetadataField(item?.dateKey || "", "", 32),
			}))
		: [];
	const trackerSummary = Array.isArray(source.trackerSummary)
		? source.trackerSummary.slice(0, 16).map((item) => ({
				area: safeMetadataField(item?.area || "", "Area", 80),
				label: safeMetadataField(item?.label || "", "Tracker", 120),
				kind: safeMetadataField(item?.kind || "tracker", "tracker", 80),
				count: clampNumber(item?.count, 0, 100000, 0),
			}))
		: [];
	return {
		enabled: true,
		level,
		period: safeMetadataField(source.period || "day", "day", 32),
		generatedAt: safeMetadataField(source.generatedAt || "", "", 80),
		totalEvents: clampNumber(source.totalEvents, 0, 1000000, 0),
		totalNotes: clampNumber(source.totalNotes, 0, 1000000, 0),
		areas,
		recentActivity: level >= 75 ? recentActivity : [],
		trackerSummary: level >= 50 ? trackerSummary : [],
	};
}

function normalizeNoteRef(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	return {
		id: String(source.id || ""),
		number: clampNumber(source.number, 0, 999999, 0),
		title: String(source.title || "Untitled note").slice(0, 160),
		dashboard: String(source.dashboard || ""),
		role: String(source.role || "note"),
		edited: String(source.edited || ""),
		wordCount: clampNumber(source.wordCount, 0, 100000, 0),
		userApprovedContentIncluded: source.userApprovedContentIncluded === true,
	};
}

function validateUserSelectedContextBudget(context = {}) {
	const selected = normalizeUserSelectedContext(context);
	const safeRefs = selected.selectedNoteRefs.map(safeNoteMetadataForPrompt);
	const chars =
		JSON.stringify(safeRefs).length +
		JSON.stringify(safeBalanceStatisticsForPrompt(selected.balanceStatistics))
			.length;
	if (
		selected.selectedNoteRefs.length > NOTE_METADATA_MAX_REFS ||
		chars > NOTE_METADATA_MAX_CHARS + 8000
	) {
		throw policyError("context_too_large", SAFE_ERRORS.context_too_large);
	}
}

function normalizeImageRefs(value = []) {
	return Array.isArray(value)
		? value
				.filter((item) => item?.id && item?.storagePath)
				.slice(0, 24)
				.map((item) => ({
					id: String(item.id || ""),
					letterId: String(item.letterId || ""),
					name: String(item.name || "image").slice(0, 160),
					type: String(item.type || "image/png").slice(0, 80),
					size: Math.max(0, Number(item.size) || 0),
					storagePath: String(item.storagePath || "").slice(0, 500),
					createdAt: String(item.createdAt || ""),
					schemaVersion: 1,
				}))
		: [];
}

function normalizeMemory(value = {}, uid = "") {
	const source = value && typeof value === "object" ? value : {};
	const staticMemory = normalizeStaticMemory(
		{
			...(source.staticMemory || {}),
			summary: source.staticMemory?.summary || source.summary || "",
			entries: source.staticMemory?.entries || source.entries || [],
			updatedAt: source.staticMemory?.updatedAt || source.updatedAt || "",
		},
		uid,
	);
	const dynamicRetrievalMemory = normalizeDynamicRetrievalMemory(
		source.dynamicRetrievalMemory,
	);
	return {
		...emptyMemory(uid),
		...source,
		owner: uid,
		title: String(source.title || "PYXIDA memories"),
		summary: String(source.summary || staticMemory.summary || ""),
		entries: staticMemory.entries.map(memoryEntryToLegacyEntry),
		staticMemory,
		dynamicRetrievalMemory,
		lastCompactedAt: String(source.lastCompactedAt || ""),
		updatedAt: String(source.updatedAt || ""),
		schemaVersion: 1,
	};
}

function normalizeStaticMemory(value = {}, uid = "") {
	const source = value && typeof value === "object" ? value : {};
	const entries = Array.isArray(source.entries)
		? source.entries
				.filter((entry) => entry?.text || entry?.summary)
				.slice(-50)
				.map((entry) => normalizeStaticMemoryEntry(entry))
		: [];
	return {
		memoryId: String(source.memoryId || "pyxdia-static-current"),
		type: String(source.type || "stable_profile"),
		summary: compactMemoryPatternText(source.summary || "").slice(0, 4000),
		confidence: clampFloat(source.confidence, 0, 1, entries.length ? 0.65 : 0),
		status: String(source.status || "active"),
		piiSafe: source.piiSafe !== false,
		lastConfirmedAt: String(source.lastConfirmedAt || ""),
		updatedAt: String(source.updatedAt || ""),
		owner: uid,
		entries,
		schemaVersion: 1,
	};
}

function normalizeStaticMemoryEntry(entry = {}) {
	const text = compactMemoryPatternText(entry.text || entry.summary || "");
	return {
		id: String(entry.id || `memory-${crypto.randomUUID()}`),
		type: String(entry.type || "stable_pattern"),
		summary: sanitizeMemoryText(entry.summary || text).slice(0, 500),
		text: String(text).slice(0, 500),
		confidence: clampFloat(entry.confidence, 0, 1, 0.65),
		status: String(entry.status || "active"),
		piiSafe: entry.piiSafe !== false,
		reasonRemembered: String(entry.reasonRemembered || ""),
		sourceLetterIds: Array.isArray(entry.sourceLetterIds)
			? entry.sourceLetterIds.map(String).filter(Boolean)
			: [],
		staleSourceLetterIds: Array.isArray(entry.staleSourceLetterIds)
			? entry.staleSourceLetterIds.map(String).filter(Boolean)
			: [],
		sensitivity: String(entry.sensitivity || "private_minimized"),
		createdAt: String(entry.createdAt || ""),
		updatedAt: String(entry.updatedAt || ""),
	};
}

function normalizeDynamicRetrievalMemory(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const items = Array.isArray(source.items)
		? source.items
				.filter((item) => item?.summary)
				.slice(0, 12)
				.map((item) => ({
					id: String(item.id || ""),
					type: String(item.type || "retrieved_context"),
					summary: sanitizeMemoryText(item.summary || "").slice(0, 600),
					reason: String(
						item.reason || "Retrieved because it may relate to this letter.",
					),
					sourceLetterId: String(item.sourceLetterId || ""),
					sourceType: String(item.sourceType || ""),
					score: clampFloat(item.score, 0, 1, 0.5),
					authority: "automatic_retrieval",
					piiSafe: item.piiSafe !== false,
				}))
		: [];
	return {
		memoryId: String(source.memoryId || "pyxdia-dynamic-current"),
		type: "dynamic_retrieval",
		authority: "automatic_retrieval",
		status: String(source.status || "active"),
		retrievedAt: String(source.retrievedAt || ""),
		query: String(source.query || ""),
		items,
		piiSafe: source.piiSafe !== false,
		schemaVersion: 1,
	};
}

function buildPrompt({
	settings,
	staticMemory,
	dynamicRetrievalMemory,
	aiBrainContext,
	userSelectedContext,
	letter,
}) {
	const system = [
		"You are PYXIDA PENPAL, a reflective growth companion and AI trainer inside Ourstuff.",
		"Write one actual personal letter back to the user. Be warm, attentive, grounded, specific, and useful.",
		"You are not a therapist, doctor, clinician, crisis service, or replacement for professional care. Do not diagnose or claim clinical authority.",
		"Use Adlerian belonging/usefulness, DBT observe/name/choose skills, and Jungian role/archetype language silently as thinking tools only. Do not mention those frameworks unless the user explicitly asks.",
		"Return plain text only. No markdown, headings, bullets, tables, code fences, links, or clinical labels.",
		"Input may be scrubbed. Do not reconstruct placeholders, identities, contact details, or hidden personal data.",
	].join("\n");
	const developer = [
		"LETTER CONTRACT:",
		"Open with a simple salutation, but vary the wording naturally across replies.",
		"Ground the letter in at least two concrete details from the current letter or selected context. Do not merely restate the first sentence.",
		"Name the actual tension, value conflict, or balance signal you see, then explain why it matters in ordinary language.",
		"Offer one small next action that can happen within the next day. Make it specific enough that the user can tell whether it happened.",
		"Close with a short steady sign-off from PYXIDA.",
		"Do not write canned template paragraphs. Do not say 'I read the center of what you sent.' Do not say 'In Adlerian language' or 'In DBT terms.'",
		"Use selected note metadata only as pattern context, never as private note content.",
		"Keep the reply to roughly 300 to 650 words unless the user's settings ask otherwise.",
		"",
		"CONTEXT AUTHORITY:",
		"1. Current letter and user-selected context are intentional and highest authority.",
		"2. PYXIDA static memory is a compact PII-safe profile of durable patterns.",
		"3. Approved AI Brain memory is external long-term context and must stay lower priority than the current letter.",
		"4. PYXIDA dynamic retrieval memory is automatic supporting context. Use it lightly and ignore it when it conflicts with the current letter or user-selected context.",
	].join("\n");
	const user = [
		`USER SETTINGS:\n${settings.generalInstructions || ""}`,
		`WHAT THE USER WANTS PYXIDA TO KNOW:\n${settings.userWantsPyxdiaToKnow || ""}`,
		`USER-SELECTED CONTEXT:\n${formatUserSelectedContext(userSelectedContext)}`,
		`PYXIDA STATIC MEMORY:\n${formatStaticMemory(staticMemory)}`,
		`AI BRAIN APPROVED CONTEXT:\n${formatAiBrainContext(aiBrainContext)}`,
		`PYXIDA DYNAMIC RETRIEVAL MEMORY:\n${formatDynamicRetrievalMemory(dynamicRetrievalMemory)}`,
		`CURRENT LETTER:\n${letter || ""}`,
	].join("\n\n");
	return { system, developer, user };
}

function fallbackLetter(prompt) {
	let snippet = "your letter";
	const promptText = promptToText(prompt);
	if (promptText.includes("CURRENT LETTER:")) {
		snippet = promptText
			.split("CURRENT LETTER:", 2)[1]
			.trim()
			.split(/\n/)[0]
			.slice(0, 180);
	}
	const clean = snippet.replace(/\s+/g, " ").trim() || "your letter";
	const familySignal = /\bfamily|wife|husband|kids?|children|home\b/i.test(
		clean,
	);
	const workSignal = /\bcode|coding|work|app|project|build|computer\b/i.test(
		clean,
	);
	const balanceLine =
		familySignal && workSignal
			? "The signal I would not ignore is that the work may be getting the freshest part of your attention while your family is getting what is left over."
			: "The signal I would not ignore is that one part of your life is asking for attention before it has to become a louder problem.";
	return [
		"Dear friend,",
		"",
		`I read this as a real check-in, not as something to label: ${clean}`,
		"",
		`${balanceLine} That does not make the work bad. It just means the rhythm needs a small correction while the correction is still easy.`,
		"",
		"For the next day, make one promise small enough that you can keep it even if the coding part of your mind is still excited. Choose a specific family moment, protect it first, and let the apps fit around it. Afterward, notice what resisted the boundary. That resistance is information, not failure.",
		"",
		"Balance usually comes back through one honest repair at a time. Start there.",
		"",
		"PYXIDA",
	].join("\n");
}

function promptToText(prompt) {
	if (prompt && typeof prompt === "object") {
		return [prompt.system, prompt.developer, prompt.user]
			.map((part) => String(part || ""))
			.filter(Boolean)
			.join("\n\n");
	}
	return String(prompt || "");
}

function formatUserSelectedContext(context = {}) {
	const selected = normalizeUserSelectedContext(context);
	const safeRefs = selected.selectedNoteRefs.map(safeNoteMetadataForPrompt);
	const balanceStatistics = safeBalanceStatisticsForPrompt(
		selected.balanceStatistics,
	);
	return JSON.stringify(
		{
			authority: selected.authority,
			manualText: safePromptText(selected.manualText, 3000),
			selectedNoteMetadata: safeRefs,
			balanceStatistics,
			noteMetadataPolicy:
				"Metadata only: title, dashboard, role, edited date, and word count. Raw note bodies and note IDs are intentionally omitted.",
			selectedMemoryEntryIds: selected.selectedMemoryEntryIds,
			selectedProjectEntryIds: selected.selectedProjectEntryIds,
		},
		null,
		2,
	);
}

function safeBalanceStatisticsForPrompt(value = null) {
	const stats = normalizeBalanceStatistics(value);
	if (!stats) {
		return null;
	}
	return {
		authority: "user_selected_balance_statistics",
		authorityRank: 1.5,
		policy:
			"Counts and percentages only. Raw note bodies, browser data, extensions, and plugins are intentionally omitted.",
		level: stats.level,
		period: stats.period,
		totalEvents: stats.totalEvents,
		totalNotes: stats.totalNotes,
		areas: stats.areas,
		trackerSummary: stats.trackerSummary,
		recentActivity: stats.recentActivity,
	};
}

function safeNoteMetadataForPrompt(ref = {}) {
	return {
		number: clampNumber(ref.number, 0, 999999, 0),
		title: safeMetadataField(ref.title, "Untitled note", 160),
		dashboard: safeMetadataField(ref.dashboard || "Note", "Note", 80),
		role: safeMetadataField(ref.role || "note", "note", 80),
		edited: safeMetadataField(ref.edited || "", "", 80),
		wordCount: clampNumber(ref.wordCount, 0, 100000, 0),
	};
}

function safePromptText(value = "", limit = 3000) {
	try {
		return scrubText(String(value || "")).text.slice(0, limit);
	} catch {
		return "[redacted unsafe context]";
	}
}

function safeMetadataField(value = "", fallback = "", limit = 160) {
	const text = String(value || fallback || "").trim();
	if (!text) {
		return fallback;
	}
	try {
		return scrubText(text).text.replace(/\s+/g, " ").trim().slice(0, limit);
	} catch {
		return "[redacted metadata]";
	}
}

function formatStaticMemory(memory = {}) {
	const normalized = normalizeStaticMemory(memory);
	return JSON.stringify(
		{
			type: normalized.type,
			summary: normalized.summary,
			confidence: normalized.confidence,
			piiSafe: normalized.piiSafe,
			entries: normalized.entries.slice(-12).map((entry) => ({
				type: entry.type,
				summary: entry.summary || entry.text,
				confidence: entry.confidence,
				reasonRemembered: entry.reasonRemembered,
				piiSafe: entry.piiSafe,
			})),
		},
		null,
		2,
	);
}

function formatDynamicRetrievalMemory(memory = {}) {
	const normalized = normalizeDynamicRetrievalMemory(memory);
	return JSON.stringify(
		{
			type: normalized.type,
			authority: normalized.authority,
			query: normalized.query,
			retrievedAt: normalized.retrievedAt,
			items: normalized.items.map((item) => ({
				type: item.type,
				summary: item.summary,
				reason: item.reason,
				score: item.score,
				piiSafe: item.piiSafe,
			})),
		},
		null,
		2,
	);
}

async function buildDynamicRetrievalMemory(uid, letter, memory = {}) {
	const items = [];
	if (letter.threadId) {
		const snap = await appRef(uid)
			.collection("pyxdiaLetters")
			.where("threadId", "==", letter.threadId)
			.get();
		snap.docs
			.map((doc) => doc.data())
			.filter((item) => !isDeletedRecord(item))
			.filter((item) => item.id !== letter.id && item.state === "completed")
			.sort((left, right) =>
				String(right.completedAt || right.createdAt || "").localeCompare(
					String(left.completedAt || left.createdAt || ""),
				),
			)
			.slice(0, 3)
			.forEach((item, index) => {
				const summary = summarizePriorLetterForRetrieval(item);
				if (!summary) {
					return;
				}
				items.push({
					id: `letter-${item.id}`,
					type: "prior_letter_summary",
					summary,
					reason: "Same PYXIDA conversation as the current letter.",
					sourceLetterId: item.id,
					sourceType: "pyxdia_letter",
					score: Math.max(0.2, 0.85 - index * 0.1),
					authority: "automatic_retrieval",
					piiSafe: true,
				});
			});
	}
	const priorContext = Array.isArray(memory.priorLetterContext)
		? memory.priorLetterContext
		: [];
	priorContext
		.filter((item) => item?.letterId && item.letterId !== letter.id)
		.slice(-3)
		.reverse()
		.forEach((item, index) => {
			if (items.some((existing) => existing.sourceLetterId === item.letterId)) {
				return;
			}
			items.push({
				id: `prior-context-${item.letterId}`,
				type: "prior_letter_context_marker",
				summary: "A prior PYXIDA reply was completed in this memory set.",
				reason: "Recent completed letter marker from PYXIDA memory.",
				sourceLetterId: item.letterId,
				sourceType: "pyxdia_memory_marker",
				score: Math.max(0.15, 0.45 - index * 0.05),
				authority: "automatic_retrieval",
				piiSafe: true,
			});
		});
	return normalizeDynamicRetrievalMemory({
		memoryId: `pyxdia-dynamic-${letter.id || crypto.randomUUID()}`,
		status: "active",
		retrievedAt: nowIso(),
		query: "same_thread_recent_letters",
		items,
		piiSafe: true,
	});
}

function summarizePriorLetterForRetrieval(letter = {}) {
	try {
		const input = String(
			letter.scrubbedInputText || scrubText(letter.inputText || "").text || "",
		)
			.replace(/\s+/g, " ")
			.trim();
		const output = String(letter.outputText || "")
			.replace(/\s+/g, " ")
			.trim();
		const pieces = [];
		if (input) {
			pieces.push(`User wrote: ${sanitizeMemoryText(input).slice(0, 220)}`);
		}
		if (output) {
			pieces.push(
				`PYXIDA replied: ${sanitizeMemoryText(output).slice(0, 180)}`,
			);
		}
		return pieces.join(" / ").slice(0, 500);
	} catch {
		return "";
	}
}

function compactStaticMemorySnapshot(memory = {}) {
	const normalized = normalizeStaticMemory(memory);
	return {
		memoryId: normalized.memoryId,
		type: normalized.type,
		summary: normalized.summary,
		confidence: normalized.confidence,
		status: normalized.status,
		piiSafe: normalized.piiSafe,
		updatedAt: normalized.updatedAt,
		schemaVersion: 1,
	};
}

async function _threadContext(uid, threadId) {
	if (!threadId) {
		return "";
	}
	const snap = await appRef(uid)
		.collection("pyxdiaLetters")
		.where("threadId", "==", threadId)
		.get();
	return snap.docs
		.map((doc) => doc.data())
		.filter((letter) => !isDeletedRecord(letter))
		.sort((left, right) =>
			String(right.createdAt || "").localeCompare(String(left.createdAt || "")),
		)
		.slice(0, 3)
		.map(
			(letter) =>
				`${letter.state}: ${summarizePriorLetterForRetrieval(letter)}`,
		)
		.filter((line) => !line.endsWith(": "))
		.join("\n");
}

function updateMemory(uid, current, letter, outputText) {
	const now = nowIso();
	const memory = normalizeMemory(current, uid);
	const staticMemory = normalizeStaticMemory(memory.staticMemory, uid);
	const sentence = memoryCandidateFromLetter(letter);
	const entry = {
		id: `memory-${crypto.randomUUID()}`,
		type: "stable_pattern",
		text: sentence.slice(0, 180),
		summary: sentence.slice(0, 180),
		confidence: 0.64,
		status: "active",
		piiSafe: true,
		reasonRemembered: "Captured as a compact theme from a completed letter.",
		sourceLetterIds: [letter.id],
		sensitivity: "private_minimized",
		createdAt: now,
		updatedAt: now,
	};
	const entries = [...(staticMemory.entries || []), entry].slice(-50);
	const summary = entries
		.slice(-5)
		.map((item) => item.text || item.summary)
		.join(" ");
	return {
		...memory,
		owner: uid,
		summary,
		entries: entries.map(memoryEntryToLegacyEntry),
		staticMemory: {
			...staticMemory,
			summary,
			confidence: entries.length ? 0.68 : 0,
			piiSafe: true,
			lastConfirmedAt: staticMemory.lastConfirmedAt || now,
			updatedAt: now,
			entries,
		},
		dynamicRetrievalMemory: normalizeDynamicRetrievalMemory(
			letter.dynamicRetrievalMemory || memory.dynamicRetrievalMemory,
		),
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

function memoryCandidateFromLetter(letter = {}) {
	const source =
		String(letter.scrubbedInputText || "")
			.replace(/\s+/g, " ")
			.split(/[.!?]/)
			.map((item) => item.trim())
			.find(Boolean) ||
		String(letter.inputText || "")
			.replace(/\s+/g, " ")
			.split(/[.!?]/)
			.map((item) => item.trim())
			.find(Boolean) ||
		"User continued a PYXIDA letter thread.";
	const clean = compactMemoryPatternText(source);
	if (isDurableMemoryPattern(clean)) {
		return clean;
	}
	return "User continued a PYXIDA letter; keep future replies grounded in practical reflection and small next steps.";
}

function compactMemoryPatternText(text = "") {
	const clean = sanitizeMemoryText(text)
		.replace(/^dear\s+pyx(?:ida|dia),?\s*/i, "")
		.replace(/^i am\b/i, "User is")
		.replace(/^i'm\b/i, "User is")
		.replace(/^i\b/i, "User");
	return clean.trim();
}

function isDurableMemoryPattern(text = "") {
	return /\b(often|usually|prefer|goal|value|trying to|working on|routine|pattern|recurring|want to|keep coming back)\b/i.test(
		text,
	);
}

function sanitizeMemoryText(text = "") {
	return String(text || "")
		.replace(/<EMAIL_\d+>/g, "a private email")
		.replace(/<PHONE_\d+>/g, "a private phone number")
		.replace(/<LOCATION_\d+>/g, "a private location")
		.replace(/<PERSON_\d+>/g, "a private person")
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "a private email")
		.replace(
			/\b(?:\+?1[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]?\d{4}\b/g,
			"a private phone number",
		)
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 500);
}

function memoryEntryToLegacyEntry(entry = {}) {
	return {
		id: String(entry.id || `memory-${crypto.randomUUID()}`),
		text: String(entry.text || entry.summary || "").slice(0, 500),
		reasonRemembered: String(entry.reasonRemembered || ""),
		sourceLetterIds: Array.isArray(entry.sourceLetterIds)
			? entry.sourceLetterIds.map(String).filter(Boolean)
			: [],
		staleSourceLetterIds: Array.isArray(entry.staleSourceLetterIds)
			? entry.staleSourceLetterIds.map(String).filter(Boolean)
			: [],
		sensitivity: String(entry.sensitivity || "private_minimized"),
		createdAt: String(entry.createdAt || ""),
		updatedAt: String(entry.updatedAt || ""),
	};
}

function emptyMemory(uid = "") {
	const staticMemory = emptyStaticMemory(uid);
	const dynamicRetrievalMemory = emptyDynamicRetrievalMemory();
	return {
		owner: uid,
		title: "PYXIDA memories",
		summary: "",
		recurringThemes: [],
		userStatedGoals: [],
		emotionalPatterns: [],
		values: [],
		possibleArchetypePatterns: [],
		guidancePreferences: [],
		priorLetterContext: [],
		entries: [],
		staticMemory,
		dynamicRetrievalMemory,
		lastCompactedAt: "",
		updatedAt: "",
		schemaVersion: 1,
	};
}

function emptyStaticMemory(uid = "") {
	return {
		owner: uid,
		memoryId: "pyxdia-static-current",
		type: "stable_profile",
		summary: "",
		confidence: 0,
		status: "active",
		piiSafe: true,
		lastConfirmedAt: "",
		updatedAt: "",
		entries: [],
		schemaVersion: 1,
	};
}

function emptyDynamicRetrievalMemory() {
	return {
		memoryId: "pyxdia-dynamic-current",
		type: "dynamic_retrieval",
		authority: "automatic_retrieval",
		status: "active",
		retrievedAt: "",
		query: "",
		items: [],
		piiSafe: true,
		schemaVersion: 1,
	};
}

function appRef(uid) {
	return admin
		.firestore()
		.collection("users")
		.doc(uid)
		.collection("apps")
		.doc(APP_ID);
}

function draftDoc(uid) {
	const userSelectedContext = normalizeUserSelectedContext();
	return {
		id: "draft",
		threadId: "",
		owner: uid,
		state: "draft",
		inputText: "",
		includedNoteRefs: [],
		userIncludedContext: "",
		userSelectedContext,
		contextSelections: [],
		updatedAt: "",
		schemaVersion: 1,
	};
}

function routePath(req, functionName) {
	const path = `/${String(req.path || "/").replace(/^\/+|\/+$/g, "")}`;
	for (const prefix of [
		`/${functionName}`,
		"/api/pyxdia",
		"/api/ai",
		"/api/trash",
	]) {
		if (path === prefix) {
			return "/";
		}
		if (path.startsWith(`${prefix}/`)) {
			return path.slice(prefix.length);
		}
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
	for (const char of String(uid || "")) {
		hash = (hash * 31 + char.charCodeAt(0)) | 0;
	}
	return Math.abs(hash).toString(16);
}

function threadTitle(text) {
	const clean = String(text || "")
		.replace(/\s+/g, " ")
		.trim();
	return clean.length > 44
		? `${clean.slice(0, 41)}...`
		: clean || "PYXIDA letter thread";
}

function availableAtFor(settings) {
	if (!settings.delayEnabled) {
		return nowIso();
	}
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
	if (!Number.isFinite(number)) {
		return fallback;
	}
	return Math.min(Math.max(Math.round(number), min), max);
}

function clampFloat(value, min, max, fallback) {
	const number = Number(value);
	if (!Number.isFinite(number)) {
		return fallback;
	}
	return Math.min(Math.max(number, min), max);
}

function escapeRegex(value = "") {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function luhn(digits) {
	if (digits.length < 13) {
		return false;
	}
	let total = 0;
	for (let index = 0; index < digits.length; index += 1) {
		let number = Number(digits[digits.length - 1 - index]);
		if (index % 2 === 1) {
			number *= 2;
			if (number > 9) {
				number -= 9;
			}
		}
		total += number;
	}
	return total % 10 === 0;
}

function nowIso() {
	return new Date().toISOString();
}
