export const PERSONAL_SPACE_ID = "personal";
export const WORK_SPACE_ID = "work";
export const FAMILY_SPACE_ID = "family";
export const CUSTOM_SPACE_IDS = Object.freeze(["custom-1", "custom-2"]);
export const ACTIVE_SPACE_KEY = "ourstuff.activeSpace.v1";
export const SPACE_MIGRATION_KEY = "ourstuff.spaceMigration.v1";
export const CUSTOM_DATA_SPACES_KEY = "ourstuff.customDataSpaces.v1";

const SPACE_PIN_PREFIX = "ourstuff.spacePin.v1.";
const SPACE_UNLOCK_PREFIX = "ourstuff.spaceUnlockSession.v1.";

export const BUILT_IN_DATA_SPACES = Object.freeze({
	[PERSONAL_SPACE_ID]: Object.freeze({
		id: PERSONAL_SPACE_ID,
		label: "Personal",
		cloudAppId: "ourstuff-main",
		description: "Personal notes, trackers, PYXIDA, themes, and local media.",
		shareable: false,
		dashboardLabels: Object.freeze({
			Mind: "Mind",
			Body: "Body",
			Spirit: "Spirit",
			Life: "Life",
		}),
	}),
	[WORK_SPACE_ID]: Object.freeze({
		id: WORK_SPACE_ID,
		label: "Work",
		cloudAppId: "ourstuff-main-work",
		description: "Work-only notes, trackers, PYXIDA, themes, and local media.",
		shareable: false,
		dashboardLabels: Object.freeze({
			Mind: "Knowledge",
			Body: "Movement",
			Spirit: "Mindfulness",
			Life: "Productivity",
		}),
	}),
	[FAMILY_SPACE_ID]: Object.freeze({
		id: FAMILY_SPACE_ID,
		label: "Family",
		cloudAppId: "ourstuff-main-family",
		description:
			"Shared family memories, routines, study notes, planning, PYXIDA, and media.",
		shareable: true,
		dashboardLabels: Object.freeze({
			Mind: "Memories",
			Body: "Exercise",
			Spirit: "Study",
			Life: "Family Planner",
		}),
	}),
});

export let DATA_SPACES = Object.freeze({
	...BUILT_IN_DATA_SPACES,
	...loadCustomDataSpaces(),
});

export function refreshDataSpaces() {
	DATA_SPACES = Object.freeze({
		...BUILT_IN_DATA_SPACES,
		...loadCustomDataSpaces(),
	});
	return DATA_SPACES;
}

export function isCustomSpaceId(spaceId) {
	return CUSTOM_SPACE_IDS.includes(String(spaceId || ""));
}

export function customSpaceCloudAppId(spaceId) {
	const index = CUSTOM_SPACE_IDS.indexOf(String(spaceId || ""));
	return index >= 0 ? `ourstuff-main-custom-${index + 1}` : "";
}

export function customSpaceSlots() {
	refreshDataSpaces();
	return CUSTOM_SPACE_IDS.map((id) => DATA_SPACES[id] || null);
}

export function availableCustomSpaceId() {
	refreshDataSpaces();
	return CUSTOM_SPACE_IDS.find((id) => !DATA_SPACES[id]) || "";
}

function sanitizeSpaceText(value, fallback = "") {
	return String(value || fallback)
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 80);
}

function normalizeDashboardLabels(labels = {}) {
	const defaults = BUILT_IN_DATA_SPACES[PERSONAL_SPACE_ID].dashboardLabels;
	return Object.freeze({
		Mind: sanitizeSpaceText(labels.Mind, defaults.Mind),
		Body: sanitizeSpaceText(labels.Body, defaults.Body),
		Spirit: sanitizeSpaceText(labels.Spirit, defaults.Spirit),
		Life: sanitizeSpaceText(labels.Life, defaults.Life),
	});
}

function normalizeCustomSpace(value = {}, slotId = "") {
	const id = isCustomSpaceId(value.id) ? value.id : slotId;
	if (!isCustomSpaceId(id)) {
		return null;
	}
	const label = sanitizeSpaceText(value.label, "");
	if (!label) {
		return null;
	}
	const description = sanitizeSpaceText(
		value.description,
		`${label} notes, trackers, Pen Pal, themes, and local media.`,
	);
	return Object.freeze({
		id,
		label,
		cloudAppId: customSpaceCloudAppId(id),
		description,
		shareable: true,
		custom: true,
		createdAt: String(value.createdAt || new Date().toISOString()),
		dashboardLabels: normalizeDashboardLabels(value.dashboardLabels),
	});
}

export function loadCustomDataSpaces() {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_DATA_SPACES_KEY) || "{}");
		return Object.freeze(
			Object.fromEntries(
				CUSTOM_SPACE_IDS.map((id) => [id, normalizeCustomSpace(parsed?.[id], id)])
					.filter(([, space]) => Boolean(space)),
			),
		);
	} catch {
		return Object.freeze({});
	}
}

export function saveCustomDataSpace(config = {}) {
	const id = isCustomSpaceId(config.id) ? config.id : availableCustomSpaceId();
	if (!id) {
		throw new Error("You can create up to two additional spaces.");
	}
	const current = loadCustomDataSpaces();
	const normalized = normalizeCustomSpace(
		{
			...config,
			id,
			createdAt: current[id]?.createdAt || new Date().toISOString(),
		},
		id,
	);
	if (!normalized) {
		throw new Error("Enter a space name before creating it.");
	}
	const next = { ...current, [id]: normalized };
	window.localStorage.setItem(CUSTOM_DATA_SPACES_KEY, JSON.stringify(next));
	refreshDataSpaces();
	return normalized;
}

export function removeCustomDataSpace(spaceId) {
	const id = String(spaceId || "");
	if (!isCustomSpaceId(id)) {
		return false;
	}
	const current = loadCustomDataSpaces();
	if (!current[id]) {
		return false;
	}
	const next = { ...current };
	delete next[id];
	window.localStorage.setItem(CUSTOM_DATA_SPACES_KEY, JSON.stringify(next));
	refreshDataSpaces();
	return true;
}

export function normalizeSpaceId(value) {
	refreshDataSpaces();
	const spaceId = String(value || "");
	return DATA_SPACES[spaceId] ? spaceId : PERSONAL_SPACE_ID;
}

export function getActiveSpaceId() {
	try {
		return normalizeSpaceId(window.localStorage.getItem(ACTIVE_SPACE_KEY));
	} catch {
		return PERSONAL_SPACE_ID;
	}
}

export function setActiveSpaceId(spaceId) {
	const normalized = normalizeSpaceId(spaceId);
	window.localStorage.setItem(ACTIVE_SPACE_KEY, normalized);
	return normalized;
}

export function activeSpace() {
	return DATA_SPACES[getActiveSpaceId()] || DATA_SPACES[PERSONAL_SPACE_ID];
}

export function getActiveSpaceLabel() {
	return activeSpace().label;
}

export function getActiveCloudAppId() {
	return activeSpace().cloudAppId;
}

export function isShareableSpace(spaceId = getActiveSpaceId()) {
	return DATA_SPACES[normalizeSpaceId(spaceId)]?.shareable === true;
}

export function scopedStorageKey(baseKey, spaceId = getActiveSpaceId()) {
	const normalized = normalizeSpaceId(spaceId);
	const base = String(baseKey || "");
	if (!base.startsWith("ourstuff.")) {
		return `${base}.${normalized}`;
	}
	return base.replace(/^ourstuff\./, `ourstuff.${normalized}.`);
}

export function scopedIndexedDbName(baseName, spaceId = getActiveSpaceId()) {
	const normalized = normalizeSpaceId(spaceId);
	return normalized === PERSONAL_SPACE_ID
		? String(baseName || "")
		: scopedStorageKey(baseName, normalized);
}

export function migrateLegacyLocalStorageToPersonal(baseKeys = []) {
	let migrated = false;
	const personalKeys = baseKeys
		.map(String)
		.filter(Boolean)
		.map((key) => [key, scopedStorageKey(key, PERSONAL_SPACE_ID)]);

	for (const [legacyKey, personalKey] of personalKeys) {
		try {
			const legacyValue = window.localStorage.getItem(legacyKey);
			const personalValue = window.localStorage.getItem(personalKey);
			if (legacyValue !== null && personalValue === null) {
				window.localStorage.setItem(personalKey, legacyValue);
				migrated = true;
			}
			if (legacyValue !== null) {
				window.localStorage.removeItem(legacyKey);
			}
		} catch {
			// Migration is best effort; blocked storage should not prevent app load.
		}
	}

	try {
		const legacyMediaPrefix = "ourstuff.mediaCryptoKey.v1.";
		const personalMediaPrefix = scopedStorageKey(
			"ourstuff.mediaCryptoKey.v1",
			PERSONAL_SPACE_ID,
		);
		for (let index = 0; index < window.localStorage.length; index += 1) {
			const legacyKey = window.localStorage.key(index);
			if (!legacyKey?.startsWith(legacyMediaPrefix)) {
				continue;
			}
			const suffix = legacyKey.slice(legacyMediaPrefix.length);
			const personalKey = `${personalMediaPrefix}.${suffix}`;
			const legacyValue = window.localStorage.getItem(legacyKey);
			if (legacyValue && window.localStorage.getItem(personalKey) === null) {
				window.localStorage.setItem(personalKey, legacyValue);
				migrated = true;
			}
		}
	} catch {
		// Media-key migration is best effort.
	}

	try {
		window.localStorage.setItem(
			SPACE_MIGRATION_KEY,
			JSON.stringify({
				version: 1,
				migratedAt: new Date().toISOString(),
				migrated,
			}),
		);
	} catch {
		// Migration marker is diagnostic only.
	}
	return migrated;
}

function pinStorageKey(spaceId = getActiveSpaceId()) {
	return `${SPACE_PIN_PREFIX}${normalizeSpaceId(spaceId)}`;
}

function unlockStorageKey(spaceId = getActiveSpaceId()) {
	return `${SPACE_UNLOCK_PREFIX}${normalizeSpaceId(spaceId)}`;
}

function bytesToHex(bytes) {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function hexToBytes(hex) {
	const clean = String(hex || "").replace(/[^a-f0-9]/gi, "");
	const bytes = new Uint8Array(Math.floor(clean.length / 2));
	for (let index = 0; index < bytes.length; index += 1) {
		bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
	}
	return bytes;
}

async function sha256Hex(text) {
	const encoded = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	return bytesToHex(new Uint8Array(digest));
}

async function hashPin(pin, saltHex) {
	return sha256Hex(`${saltHex}:${String(pin || "")}`);
}

export function hasSpacePin(spaceId = getActiveSpaceId()) {
	try {
		const raw = window.localStorage.getItem(pinStorageKey(spaceId));
		const parsed = raw ? JSON.parse(raw) : null;
		return Boolean(parsed?.salt && parsed?.hash);
	} catch {
		return false;
	}
}

export function isSpaceUnlocked(spaceId = getActiveSpaceId()) {
	if (!hasSpacePin(spaceId)) {
		return true;
	}
	try {
		return window.sessionStorage.getItem(unlockStorageKey(spaceId)) === "1";
	} catch {
		return false;
	}
}

export async function setSpacePin(spaceId, pin) {
	const normalizedPin = String(pin || "");
	if (normalizedPin.length < 4) {
		throw new Error("Use at least 4 digits for the PIN.");
	}
	if (!/^\d+$/.test(normalizedPin)) {
		throw new Error("Use digits only for the PIN.");
	}
	const saltBytes = crypto.getRandomValues(new Uint8Array(16));
	const salt = bytesToHex(saltBytes);
	const hash = await hashPin(normalizedPin, salt);
	window.localStorage.setItem(
		pinStorageKey(spaceId),
		JSON.stringify({
			version: 1,
			salt,
			hash,
			updatedAt: new Date().toISOString(),
		}),
	);
	lockSpace(spaceId);
}

export async function verifySpacePin(spaceId, pin) {
	const raw = window.localStorage.getItem(pinStorageKey(spaceId));
	const parsed = raw ? JSON.parse(raw) : null;
	if (!parsed?.salt || !parsed?.hash) {
		return true;
	}
	const hash = await hashPin(pin, parsed.salt);
	const expected = hexToBytes(parsed.hash);
	const actual = hexToBytes(hash);
	if (expected.byteLength !== actual.byteLength) {
		return false;
	}
	let difference = 0;
	for (let index = 0; index < expected.byteLength; index += 1) {
		difference |= expected[index] ^ actual[index];
	}
	return difference === 0;
}

export async function unlockSpace(spaceId, pin) {
	const ok = await verifySpacePin(spaceId, pin);
	if (!ok) {
		return false;
	}
	window.sessionStorage.setItem(unlockStorageKey(spaceId), "1");
	return true;
}

export function lockSpace(spaceId = getActiveSpaceId()) {
	try {
		window.sessionStorage.removeItem(unlockStorageKey(spaceId));
	} catch {
		// Locking is local convenience; storage failures should not crash.
	}
}

export function removeSpacePin(spaceId = getActiveSpaceId()) {
	window.localStorage.removeItem(pinStorageKey(spaceId));
	lockSpace(spaceId);
}

export function switchSpace(spaceId) {
	const normalized = setActiveSpaceId(spaceId);
	if (!hasSpacePin(normalized)) {
		try {
			window.sessionStorage.setItem(unlockStorageKey(normalized), "1");
		} catch {
			// Optional session marker.
		}
	}
	window.location.reload();
}
