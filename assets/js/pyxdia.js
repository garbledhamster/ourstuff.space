import { PYXIDA_API_URL } from "./config.js?v=pyxdia-20260525a";
import { getActiveCloudAppId } from "./space.js";

export const PYXIDA_LETTER_MAX_WORDS = 650;
export const PYXIDA_LETTER_MAX_CHARS = 3500;
export const PYXIDA_CONTEXT_SCHEMA_VERSION = 1;
export const PYXIDA_NOTE_METADATA_MAX_REFS = 300;
export const PYXIDA_NOTE_METADATA_MAX_CHARS = 40000;

export const DEFAULT_PYXIDA_SETTINGS = {
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
	letterMaxWords: PYXIDA_LETTER_MAX_WORDS,
	letterMaxChars: PYXIDA_LETTER_MAX_CHARS,
	schemaVersion: 1,
};

export function normalizePyxdiaSettings(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const min = clampNumber(source.delayMinHours, 0, 168, 24);
	const max = clampNumber(source.delayMaxHours, min, 336, 72);
	const delayEnabled =
		source.pyxdiaDelayEnabled !== undefined
			? source.pyxdiaDelayEnabled !== false
			: source.delayEnabled !== false;
	return {
		...DEFAULT_PYXIDA_SETTINGS,
		enabled: source.enabled !== false,
		delayEnabled,
		delayMinHours: min,
		delayMaxHours: max,
		pyxdiaDelayEnabled: delayEnabled,
		pyxdiaDelayMs: delayEnabled ? min * 60 * 60 * 1000 : 0,
		memoryEnabled: source.memoryEnabled !== false,
		aiBrainMemoryEnabled: source.aiBrainMemoryEnabled !== false,
		balanceStatsLevel: clampNumber(source.balanceStatsLevel, 0, 100, 0),
		generalInstructions: cleanText(
			source.generalInstructions,
			DEFAULT_PYXIDA_SETTINGS.generalInstructions,
		),
		userWantsPyxdiaToKnow: cleanText(source.userWantsPyxdiaToKnow, ""),
		plainTextOnly: true,
		letterMaxWords: clampNumber(
			source.letterMaxWords,
			1,
			2000,
			PYXIDA_LETTER_MAX_WORDS,
		),
		letterMaxChars: clampNumber(
			source.letterMaxChars,
			100,
			12000,
			PYXIDA_LETTER_MAX_CHARS,
		),
		schemaVersion: 1,
	};
}

export function estimatePyxdiaLetterSize(text = "") {
	const normalized = String(text || "").trim();
	return {
		chars: String(text || "").length,
		words: normalized ? normalized.split(/\s+/).filter(Boolean).length : 0,
	};
}

export function estimatePyxdiaNoteMetadataSize(refs = []) {
	const normalized = Array.isArray(refs)
		? refs.map((ref) => normalizePyxdiaNoteRef(ref)).filter((ref) => ref.id)
		: [];
	return {
		refs: normalized.length,
		chars: JSON.stringify(
			normalized.map((ref) => ({
				number: ref.number,
				title: ref.title,
				dashboard: ref.dashboard,
				role: ref.role,
				edited: ref.edited,
				wordCount: ref.wordCount,
			})),
		).length,
	};
}

export function pyxdiaNoteRefsFromArtifacts(store) {
	const artifacts = Array.isArray(store?.artifacts) ? store.artifacts : [];
	return artifacts
		.filter(
			(item) =>
				item?.type === "note" &&
				item.deleted !== true &&
				item.properties?.deleted !== true,
		)
		.map((item, index) =>
			normalizePyxdiaNoteRef({
				id: item.id,
				number: index + 1,
				title: item.title,
				dashboard: item.dashboard,
				role: item.properties?.role || "note",
				edited: item.edited || item.updatedAt,
				wordCount: estimatePyxdiaLetterSize(item.body || "").words,
				userApprovedContentIncluded: false,
			}),
		)
		.filter((item) => item.id);
}

export function normalizePyxdiaUserSelectedContext(value = {}) {
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
			.map((ref) => normalizePyxdiaNoteRef(ref))
			.filter((ref) => ref.id),
		selectedMemoryEntryIds: Array.isArray(source.selectedMemoryEntryIds)
			? source.selectedMemoryEntryIds.map(String).filter(Boolean).slice(0, 24)
			: [],
		selectedProjectEntryIds: Array.isArray(source.selectedProjectEntryIds)
			? source.selectedProjectEntryIds.map(String).filter(Boolean).slice(0, 24)
			: [],
		balanceStatistics: normalizeBalanceStatistics(source.balanceStatistics),
		contextSelections: selectedIds,
		schemaVersion: PYXIDA_CONTEXT_SCHEMA_VERSION,
	};
}

function normalizeBalanceStatistics(value = null) {
	if (!value || typeof value !== "object") {
		return null;
	}
	const source = value;
	const areas = Array.isArray(source.areas)
		? source.areas
				.slice(0, 4)
				.map((area) => ({
					name: String(area?.name || "").slice(0, 40),
					count: clampNumber(area?.count, 0, 100000, 0),
					percent: clampFloat(area?.percent, 0, 100, 0),
					notes: clampNumber(area?.notes, 0, 100000, 0),
					thoughts: clampNumber(area?.thoughts, 0, 100000, 0),
					goals: clampNumber(area?.goals, 0, 100000, 0),
				}))
				.filter((area) => area.name)
		: [];
	return {
		enabled: source.enabled === true,
		level: clampNumber(source.level, 0, 100, 0),
		period: String(source.period || "").slice(0, 40),
		generatedAt: String(source.generatedAt || "").slice(0, 80),
		totalEvents: clampNumber(source.totalEvents, 0, 100000, 0),
		totalNotes: clampNumber(source.totalNotes, 0, 100000, 0),
		areas,
		recentActivity: Array.isArray(source.recentActivity)
			? source.recentActivity.slice(0, 16).map((item) => ({
					area: String(item?.area || "").slice(0, 40),
					role: String(item?.role || "").slice(0, 60),
					action: String(item?.action || "").slice(0, 60),
					dateKey: String(item?.dateKey || "").slice(0, 40),
				}))
			: [],
		trackerSummary: Array.isArray(source.trackerSummary)
			? source.trackerSummary.slice(0, 24).map((item) => ({
					area: String(item?.area || "").slice(0, 40),
					label: String(item?.label || "").slice(0, 80),
					kind: String(item?.kind || "").slice(0, 40),
					count: clampNumber(item?.count, 0, 100000, 0),
				}))
			: [],
	};
}

export function normalizePyxdiaStaticMemory(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const entries = Array.isArray(source.entries)
		? source.entries
				.filter((entry) => entry?.text || entry?.summary)
				.slice(-50)
				.map((entry) => ({
					id: String(entry.id || ""),
					type: String(entry.type || "stable_pattern"),
					summary: compactPyxdiaMemoryPatternText(
						entry.summary || entry.text,
					).slice(0, 500),
					text: compactPyxdiaMemoryPatternText(
						entry.text || entry.summary,
					).slice(0, 500),
					confidence: clampFloat(entry.confidence, 0, 1, 0.65),
					status: String(entry.status || "active"),
					piiSafe: entry.piiSafe !== false,
					reasonRemembered: String(entry.reasonRemembered || ""),
					sourceLetterIds: Array.isArray(entry.sourceLetterIds)
						? entry.sourceLetterIds.map(String).filter(Boolean)
						: [],
					sensitivity: String(entry.sensitivity || "private_minimized"),
					createdAt: String(entry.createdAt || ""),
					updatedAt: String(entry.updatedAt || ""),
				}))
		: [];
	return {
		memoryId: String(source.memoryId || "pyxdia-static-current"),
		type: String(source.type || "stable_profile"),
		summary: compactPyxdiaMemoryPatternText(source.summary).slice(0, 4000),
		confidence: clampFloat(source.confidence, 0, 1, entries.length ? 0.65 : 0),
		status: String(source.status || "active"),
		piiSafe: source.piiSafe !== false,
		lastConfirmedAt: String(source.lastConfirmedAt || ""),
		updatedAt: String(source.updatedAt || ""),
		entries,
		schemaVersion: PYXIDA_CONTEXT_SCHEMA_VERSION,
	};
}

export function normalizePyxdiaDynamicRetrievalMemory(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const items = Array.isArray(source.items)
		? source.items
				.filter((item) => item?.summary)
				.slice(0, 12)
				.map((item) => ({
					id: String(item.id || ""),
					type: String(item.type || "retrieved_context"),
					summary: sanitizePyxdiaMemoryText(item.summary).slice(0, 600),
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
		schemaVersion: PYXIDA_CONTEXT_SCHEMA_VERSION,
	};
}

export async function fetchPyxdiaState(options = {}) {
	return pyxdiaRequest("/state", { method: "GET", ...options });
}

export async function fetchPyxdiaUnreadSummary(options = {}) {
	return pyxdiaRequest("/unread-summary", { method: "GET", ...options });
}

export async function savePyxdiaDraft(payload, options = {}) {
	return pyxdiaRequest("/draft", {
		method: "POST",
		body: payload,
		...options,
	});
}

export async function sendPyxdiaLetter(payload, options = {}) {
	return pyxdiaRequest("/letters", {
		method: "POST",
		body: payload,
		...options,
	});
}

export async function retryPyxdiaLetter(letterId, options = {}) {
	return pyxdiaRequest(`/letters/${encodeURIComponent(letterId)}/retry`, {
		method: "POST",
		...options,
	});
}

export async function markPyxdiaThreadRead(threadId, options = {}) {
	return pyxdiaRequest(`/threads/${encodeURIComponent(threadId)}/read`, {
		method: "POST",
		...options,
	});
}

export async function savePyxdiaSettings(payload, options = {}) {
	return pyxdiaRequest("/settings", {
		method: "PATCH",
		body: payload,
		...options,
	});
}

export async function resetPyxdiaMemory(options = {}) {
	return pyxdiaRequest("/memory/reset", {
		method: "POST",
		...options,
	});
}

async function pyxdiaRequest(path, options = {}) {
	const getIdToken = options.getIdToken;
	const token =
		typeof getIdToken === "function"
			? await getIdToken({ optional: options.optionalToken === true })
			: "";
	const headers = {
		accept: "application/json",
		"x-ourstuff-app-id": getActiveCloudAppId(),
		...(options.body === undefined
			? {}
			: { "content-type": "application/json" }),
	};
	if (token) {
		headers.authorization = `Bearer ${token}`;
	}
	const response = await fetch(`${PYXIDA_API_URL}${path}`, {
		method: options.method || "GET",
		headers,
		body:
			options.body === undefined
				? undefined
				: JSON.stringify({ ...options.body, appId: getActiveCloudAppId() }),
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(
			result?.error?.message || result?.message || "Pen Pal request failed.",
		);
	}
	return result;
}

function cleanText(value, fallback) {
	const text = String(value ?? "").trim();
	return text || fallback;
}

function normalizePyxdiaNoteRef(value = {}) {
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

function sanitizePyxdiaMemoryText(value = "") {
	return String(value || "")
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
		.trim();
}

function compactPyxdiaMemoryPatternText(value = "") {
	return sanitizePyxdiaMemoryText(value)
		.replace(/^dear\s+pyx(?:ida|dia),?\s*/i, "")
		.replace(/^i am\b/i, "User is")
		.replace(/^i'm\b/i, "User is")
		.replace(/^i\b/i, "User")
		.trim();
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
