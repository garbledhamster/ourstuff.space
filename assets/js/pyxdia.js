import { PYXDIA_API_URL } from "./config.js?v=pyxdia-20260524a";

export const PYXDIA_LETTER_MAX_WORDS = 650;
export const PYXDIA_LETTER_MAX_CHARS = 3500;

export const DEFAULT_PYXDIA_SETTINGS = {
	enabled: true,
	delayEnabled: true,
	delayMinHours: 24,
	delayMaxHours: 72,
	memoryEnabled: true,
	generalInstructions:
		"Be a reflective growth companion. Be direct, kind, practical, and non-clinical.",
	userWantsPyxdiaToKnow: "",
	plainTextOnly: true,
	letterMaxWords: PYXDIA_LETTER_MAX_WORDS,
	letterMaxChars: PYXDIA_LETTER_MAX_CHARS,
	schemaVersion: 1,
};

export function normalizePyxdiaSettings(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const min = clampNumber(source.delayMinHours, 0, 168, 24);
	const max = clampNumber(source.delayMaxHours, min, 336, 72);
	return {
		...DEFAULT_PYXDIA_SETTINGS,
		enabled: source.enabled !== false,
		delayEnabled: source.delayEnabled !== false,
		delayMinHours: min,
		delayMaxHours: max,
		memoryEnabled: source.memoryEnabled !== false,
		generalInstructions: cleanText(
			source.generalInstructions,
			DEFAULT_PYXDIA_SETTINGS.generalInstructions,
		),
		userWantsPyxdiaToKnow: cleanText(source.userWantsPyxdiaToKnow, ""),
		plainTextOnly: true,
		letterMaxWords: clampNumber(
			source.letterMaxWords,
			1,
			2000,
			PYXDIA_LETTER_MAX_WORDS,
		),
		letterMaxChars: clampNumber(
			source.letterMaxChars,
			100,
			12000,
			PYXDIA_LETTER_MAX_CHARS,
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

export function pyxdiaNoteRefsFromArtifacts(store) {
	const artifacts = Array.isArray(store?.artifacts) ? store.artifacts : [];
	return artifacts
		.filter((item) => item?.type === "note")
		.map((item, index) => ({
			id: String(item.id || ""),
			number: index + 1,
			title: String(item.title || "Untitled note"),
			dashboard: String(item.dashboard || ""),
			role: String(item.properties?.role || "note"),
			edited: String(item.edited || item.updatedAt || ""),
			wordCount: estimatePyxdiaLetterSize(item.body || "").words,
			userApprovedContentIncluded: false,
		}))
		.filter((item) => item.id);
}

export async function fetchPyxdiaState(options = {}) {
	return pyxdiaRequest("/state", { method: "GET", ...options });
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
		...(options.body === undefined ? {} : { "content-type": "application/json" }),
	};
	if (token) headers.authorization = `Bearer ${token}`;
	const response = await fetch(`${PYXDIA_API_URL}${path}`, {
		method: options.method || "GET",
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(
			result?.error?.message || result?.message || "PYXDIA request failed.",
		);
	}
	return result;
}

function cleanText(value, fallback) {
	const text = String(value ?? "").trim();
	return text || fallback;
}

function clampNumber(value, min, max, fallback) {
	const number = Number(value);
	if (!Number.isFinite(number)) return fallback;
	return Math.min(Math.max(Math.round(number), min), max);
}
