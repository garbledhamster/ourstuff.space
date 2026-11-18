import { scopedStorageKey } from "./space.js";
import { exportDeviceRecords, replaceDeviceRecords, validateDeviceRecords } from "./space-locations.js";
import { fetchPyxdiaState } from "./pyxdia.js?v=space-20260531b";
import { readPyxdiaImageBlob } from "./pyxdiaMedia.js?v=space-20260531a";

const archiveBase = "ourstuff.legacyAiArchive.v1";
const oldSettingsBase = "ourstuff.pyxdiaSettings.v1";
const oldStateBase = "ourstuff.pyxdiaPenpal.v1";

function readSavedValue(base, spaceId) {
	const text = localStorage.getItem(scopedStorageKey(base, spaceId));
	if (text === null) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function attachmentData(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

async function recoverHostedLetters({ account, appId, ownerUid, tokenFor, isCurrent }) {
	const token = await tokenFor({ expectedUid: account, optional: true });
	if (!token || !isCurrent()) throw new Error("Sign in to export the legacy letters in this Space.");
	const { settings, letters, threads, draft, memory } = await fetchPyxdiaState({
		getIdToken: async () => token, appId,
	});
	const hosted = { settings, letters, threads, draft, memory };
	const attachments = new Map();
	for (const item of [...(Array.isArray(letters) ? letters : []), draft]) {
		for (const image of Array.isArray(item?.imageRefs) ? item.imageRefs : []) {
			const path = typeof image?.storagePath === "string" ? image.storagePath : "";
			const [root, uid, ...rest] = path.split("/");
			const scoped = root === "users" && uid === ownerUid && rest[0] === "apps" && rest[1] === appId;
			const legacy = root === "users" && uid === account && ownerUid === account && appId === "ourstuff-main";
			const suffix = scoped ? rest.slice(2) : legacy ? rest : [];
			if (
				suffix.length === 5 && suffix[0] === "pyxdia" && suffix[1] === "letters" &&
				suffix[3] === "images" && suffix.every(part => part && part !== "." && part !== "..")
			) attachments.set(path, image);
		}
	}
	const recovered = [];
	const missingAttachments = [];
	for (const [storagePath, image] of attachments) {
		if (!isCurrent()) throw new Error("The account or Space changed. Export again.");
		try {
			const blob = await readPyxdiaImageBlob(storagePath);
			recovered.push({ ...image, storagePath, dataUrl: await attachmentData(blob) });
		} catch {
			missingAttachments.push(storagePath);
		}
	}
	return { hosted, attachments: recovered, missingAttachments };
}

export async function exportDeviceBackup(spaceId, options) {
	const saved = readSavedValue(archiveBase, spaceId);
	const settings = readSavedValue(oldSettingsBase, spaceId);
	const state = readSavedValue(oldStateBase, spaceId);
	const legacyAi = saved && typeof saved === "object" ? { ...saved } : {};
	if (!legacyAi.local && (settings !== undefined || state !== undefined)) legacyAi.local = { settings, state };
	if (options) {
		const remote = await recoverHostedLetters(options);
		const savedImages = Array.isArray(legacyAi.attachments) ? legacyAi.attachments : [];
		const attachments = new Map(savedImages.filter(image => image?.storagePath).map(image => [image.storagePath, image]));
		for (const image of remote.attachments) attachments.set(image.storagePath, image);
		legacyAi.hosted = remote.hosted;
		legacyAi.attachments = [...attachments.values()];
		legacyAi.missingAttachments = remote.missingAttachments.filter(path => !attachments.has(path));
	}
	return { version: 1, spaceId, records: await exportDeviceRecords(spaceId), legacyAi };
}

export function validateDeviceBackup(value, spaceId) {
	if (value.version !== 1 || value.spaceId !== spaceId || !value.legacyAi || typeof value.legacyAi !== "object") {
		throw new Error("Open the Space named in this device backup before importing it.");
	}
	validateDeviceRecords(spaceId, value.records);
}

export async function restoreDeviceBackup(value, spaceId) {
	validateDeviceBackup(value, spaceId);
	await replaceDeviceRecords(spaceId, value.records);
	localStorage.setItem(scopedStorageKey(archiveBase, spaceId), JSON.stringify(value.legacyAi));
}

export function restoreLegacyAppState(appState, spaceId) {
	const settings = appState?.pyxdiaSettings;
	const state = appState?.pyxdiaLocalState ?? appState?.pyxdiaPenpal;
	if (settings === undefined && state === undefined) return;
	const saved = readSavedValue(archiveBase, spaceId);
	const archive = saved && typeof saved === "object" ? saved : {};
	localStorage.setItem(scopedStorageKey(archiveBase, spaceId), JSON.stringify({ ...archive, local: { settings, state } }));
}
