import { TRASH_API_URL } from "./config.js?v=trash-20260525a";
import { getActiveCloudAppId } from "./space.js";

export const DEFAULT_TRASH_SETTINGS = {
	trashRetentionDays: 30,
	schemaVersion: 1,
};

export function normalizeTrashSettings(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	const retentionValue =
		source.trashRetentionDays === "" || source.trashRetentionDays == null
			? DEFAULT_TRASH_SETTINGS.trashRetentionDays
			: source.trashRetentionDays;
	return {
		trashRetentionDays: clampNumber(retentionValue, 0, 365, 30),
		schemaVersion: 1,
	};
}

export function normalizeTrashItem(value = {}) {
	return {
		trashItemId: String(value.trashItemId || value.id || ""),
		itemId: String(value.itemId || ""),
		itemType: String(value.itemType || "item"),
		title: String(value.title || "Untitled item"),
		snippet: String(value.snippet || ""),
		originalPath: String(value.originalPath || ""),
		deletedAt: String(value.deletedAt || ""),
		deleteAfter: String(value.deleteAfter || ""),
		canRestore: value.canRestore !== false,
	};
}

export async function fetchTrashState(options = {}) {
	return trashRequest("/state", { method: "GET", ...options });
}

export async function saveTrashSettings(payload, options = {}) {
	return trashRequest("/settings", {
		method: "PATCH",
		body: { settings: normalizeTrashSettings(payload.settings || payload) },
		...options,
	});
}

export async function deleteUserItem(payload, options = {}) {
	return trashRequest("/delete", {
		method: "POST",
		body: payload,
		...options,
	});
}

export async function restoreTrashItem(trashItemId, options = {}) {
	return trashRequest("/restore", {
		method: "POST",
		body: { trashItemId },
		...options,
	});
}

export async function hardDeleteTrashItem(trashItemId, options = {}) {
	return trashRequest("/hard-delete", {
		method: "POST",
		body: { trashItemId },
		...options,
	});
}

async function trashRequest(path, options = {}) {
	const token =
		typeof options.getIdToken === "function"
			? await options.getIdToken({ optional: options.optionalToken === true })
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
	const response = await fetch(`${TRASH_API_URL}${path}`, {
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
			result?.error?.message || result?.message || "Trash request failed.",
		);
	}
	return result;
}

function clampNumber(value, min, max, fallback) {
	const number = Number(value);
	if (!Number.isFinite(number)) {
		return fallback;
	}
	return Math.min(Math.max(Math.round(number), min), max);
}
