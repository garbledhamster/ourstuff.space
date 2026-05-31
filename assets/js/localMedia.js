import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from "./config.js";
import {
	getActiveCloudAppId,
	scopedIndexedDbName,
	scopedStorageKey,
} from "./space.js";

const DB_NAME = scopedIndexedDbName("ourstuff.localMedia.v1");
const DB_VERSION = 1;
const STORE_NAME = "files";
const ASSET_PREFIX = "ourstuff-asset:";
const MAX_IMAGE_EDGE = 1080;
const JPEG_QUALITY = 0.84;
const REMOTE_STORAGE_NAME = "firebase-storage-encrypted";
const MEDIA_KEY_PREFIX = scopedStorageKey("ourstuff.mediaCryptoKey.v1");

let dbPromise = null;
const objectUrlCache = new Map();
const mediaKeyCache = new Map();
let remoteMediaContext = { enabled: false, uid: "" };
let firebaseStoragePromise = null;
let firebaseStorageModules = null;
let firebaseStorage = null;

function openDb() {
	if (dbPromise) {
		return dbPromise;
	}
	dbPromise = new Promise((resolve, reject) => {
		const request = window.indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "id" });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	return dbPromise;
}

function transaction(storeMode) {
	return openDb().then((db) =>
		db.transaction(STORE_NAME, storeMode).objectStore(STORE_NAME),
	);
}

function requestToPromise(request) {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export function configureCloudMedia(context = {}) {
	const uid = String(context.uid || "").trim();
	remoteMediaContext = {
		enabled: Boolean(context.enabled && uid),
		uid,
	};
}

export async function exportCloudMediaKey() {
	const uid = String(remoteMediaContext.uid || "").trim();
	if (!cloudMediaReady(uid)) {
		return null;
	}
	let raw = "";
	try {
		raw = window.localStorage.getItem(mediaKeyStorageKey(uid)) || "";
	} catch {
		return null;
	}
	if (!raw) {
		return null;
	}

	let bytes = null;
	try {
		bytes = base64ToBytes(raw);
	} catch {
		return null;
	}
	if (bytes.byteLength !== 32) {
		return null;
	}

	const keyId = (await sha256Hex(bytes)).slice(0, 24);
	const store = await transaction("readonly");
	const records = await requestToPromise(store.getAll()).catch(() => []);
	const encryptedRecords = records.filter(
		(record) => record?.encryption?.keyId,
	);
	if (
		encryptedRecords.length &&
		!encryptedRecords.some((record) => record.encryption.keyId === keyId)
	) {
		return null;
	}

	return { version: 1, uid, key: raw, keyId };
}

export function importCloudMediaKey(value = {}) {
	const uid = String(remoteMediaContext.uid || "").trim();
	if (!cloudMediaReady(uid) || value?.uid !== uid) {
		return false;
	}
	const key = String(value?.key || "");
	if (!key) {
		return false;
	}
	let bytes = null;
	try {
		bytes = base64ToBytes(key);
	} catch {
		return false;
	}
	if (bytes.byteLength !== 32) {
		return false;
	}
	try {
		window.localStorage.setItem(mediaKeyStorageKey(uid), key);
	} catch {
		return false;
	}
	mediaKeyCache.delete(uid);
	return true;
}

function cloudMediaReady(uid = remoteMediaContext.uid) {
	return Boolean(remoteMediaContext.enabled && uid);
}

function bytesToBase64(bytes) {
	let binary = "";
	bytes.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});
	return btoa(binary);
}

function base64ToBytes(value) {
	const binary = atob(String(value || ""));
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

function hexFromBytes(bytes) {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function sha256Hex(bytes) {
	const hash = await crypto.subtle.digest("SHA-256", bytes);
	return hexFromBytes(new Uint8Array(hash));
}

function mediaKeyStorageKey(uid) {
	return `${MEDIA_KEY_PREFIX}.${uid}`;
}

async function mediaCryptoKey(uid, options = {}) {
	if (!uid) {
		throw new Error("Sign in before syncing private media.");
	}
	if (mediaKeyCache.has(uid)) {
		return mediaKeyCache.get(uid);
	}
	const createIfMissing = options.createIfMissing !== false;

	let encoded = "";
	try {
		encoded = window.localStorage.getItem(mediaKeyStorageKey(uid)) || "";
	} catch {
		encoded = "";
	}

	let raw = null;
	if (encoded) {
		try {
			raw = base64ToBytes(encoded);
		} catch {
			raw = null;
		}
	}
	if (!raw || raw.byteLength !== 32) {
		if (!createIfMissing) {
			throw new Error(
				"This device does not have the private media key for that file.",
			);
		}
		raw = crypto.getRandomValues(new Uint8Array(32));
		try {
			window.localStorage.setItem(mediaKeyStorageKey(uid), bytesToBase64(raw));
		} catch {
			throw new Error("This browser could not save the private media key.");
		}
	}

	const key = await crypto.subtle.importKey(
		"raw",
		raw,
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"],
	);
	const keyId = (await sha256Hex(raw)).slice(0, 24);
	const result = { key, keyId };
	mediaKeyCache.set(uid, result);
	return result;
}

async function encryptBlob(blob, uid) {
	const { key, keyId } = await mediaCryptoKey(uid);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		await blob.arrayBuffer(),
	);
	return {
		blob: new Blob([encrypted], { type: "application/octet-stream" }),
		encryption: {
			version: 1,
			algorithm: "AES-GCM",
			iv: bytesToBase64(iv),
			keyId,
			contentType: blob.type || "application/octet-stream",
		},
	};
}

async function decryptBlob(blob, record, uid) {
	const encryption = record?.encryption || {};
	const { key, keyId } = await mediaCryptoKey(uid, { createIfMissing: false });
	if (encryption.keyId && encryption.keyId !== keyId) {
		throw new Error(
			"This device does not have the private media key for that file.",
		);
	}
	const iv = base64ToBytes(encryption.iv);
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		await blob.arrayBuffer(),
	);
	return new Blob([decrypted], {
		type: encryption.contentType || record.type || "application/octet-stream",
	});
}

async function ensureFirebaseStorage() {
	if (firebaseStorageModules && firebaseStorage) {
		return firebaseStorageModules;
	}
	if (!firebaseStoragePromise) {
		firebaseStoragePromise = Promise.all([
			import(
				`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
			),
			import(
				`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`
			),
			import(
				`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-storage.js`
			),
		]).then(([appModule, authModule, storageModule]) => ({
			...appModule,
			...authModule,
			...storageModule,
		}));
	}

	firebaseStorageModules = await firebaseStoragePromise;
	const firebaseApp = firebaseStorageModules.getApps().length
		? firebaseStorageModules.getApps()[0]
		: firebaseStorageModules.initializeApp(FIREBASE_CONFIG);
	firebaseStorage = firebaseStorageModules.getStorage(firebaseApp);
	return firebaseStorageModules;
}

async function remoteUserContext(uid = remoteMediaContext.uid) {
	const modules = await ensureFirebaseStorage();
	const app = modules.getApps()[0] || modules.initializeApp(FIREBASE_CONFIG);
	const auth = modules.getAuth(app);
	const currentUid = auth.currentUser?.uid || "";
	if (!currentUid || currentUid !== uid) {
		throw new Error("Sign in again before syncing private media.");
	}
	return { modules, uid: currentUid };
}

function blobToDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

async function dataUrlToBlob(dataUrl) {
	const response = await fetch(dataUrl);
	return await response.blob();
}

function blobToImage(blob) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(blob);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Could not read image."));
		};
		image.src = url;
	});
}

function canvasToBlob(canvas, type, quality) {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Could not resize image."));
				}
			},
			type,
			quality,
		);
	});
}

function resizedDimensions(width, height) {
	const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

function safeAltText(name) {
	return (
		String(name || "image")
			.replace(/\.[a-z0-9]+$/i, "")
			.replace(/[\][()]/g, "")
			.trim() || "image"
	);
}

function safeStorageName(name) {
	return (
		String(name || "file")
			.replace(/[^a-z0-9._-]+/gi, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 96) || "file"
	);
}

function storageExtensionForType(type, fallback = "jpg") {
	const normalized = String(type || "").toLowerCase();
	if (normalized === "image/jpeg" || normalized === "image/jpg") {
		return "jpg";
	}
	if (normalized === "image/png") {
		return "png";
	}
	if (normalized === "image/webp") {
		return "webp";
	}
	if (normalized === "image/gif") {
		return "gif";
	}
	return fallback;
}

function filenameWithExtension(name, type, fallbackName = "file") {
	const extension = storageExtensionForType(type, "bin");
	const safeName = safeStorageName(name || `${fallbackName}.${extension}`);
	const stem = safeName.replace(/\.[a-z0-9]+$/i, "") || fallbackName;
	const currentExtension = (
		safeName.match(/\.([a-z0-9]+)$/i)?.[1] || ""
	).toLowerCase();
	if (extension === "bin" && currentExtension) {
		return safeName;
	}
	if (
		currentExtension === extension ||
		(extension === "jpg" && currentExtension === "jpeg")
	) {
		return safeName;
	}
	return `${stem}.${extension}`;
}

function metadataFromRecord(record) {
	const { blob, dataUrl, ...metadata } = record || {};
	const size = Number(metadata.size) || Number(blob?.size) || 0;
	const cloudStorageBytes = Number(metadata.cloudStorageBytes) || 0;
	return {
		...metadata,
		name: filenameWithExtension(
			metadata.name,
			metadata.type,
			metadata.id || "file",
		),
		size,
		storageBytes: cloudStorageBytes || size,
	};
}

async function runBeforeStore(record, options = {}) {
	if (typeof options.beforeStore !== "function") {
		return;
	}
	await options.beforeStore(metadataFromRecord(record));
}

function encryptedStoragePath(uid, record) {
	const cleanName = filenameWithExtension(
		record.name,
		record.type,
		record.id || "file",
	);
	return `users/${uid}/apps/${getActiveCloudAppId()}/media/${record.id}/${cleanName}.enc`;
}

function cloudMetadata(record, encryption) {
	return {
		contentType: "application/octet-stream",
		customMetadata: {
			appId: getActiveCloudAppId(),
			encrypted: "true",
			algorithm: encryption.algorithm,
			keyId: encryption.keyId,
			originalContentType:
				encryption.contentType || record.type || "application/octet-stream",
		},
	};
}

async function uploadRecordToCloud(record, options = {}) {
	const uid = String(options.uid || remoteMediaContext.uid || "").trim();
	if (!cloudMediaReady(uid)) {
		return record;
	}
	if (
		!options.forceUpload &&
		record.cloudStoragePath &&
		record.storage === REMOTE_STORAGE_NAME &&
		record.encryption
	) {
		return record;
	}
	const blob =
		record.blob ||
		(record.dataUrl ? await dataUrlToBlob(record.dataUrl) : null);
	if (!blob) {
		return record;
	}

	const { modules } = await remoteUserContext(uid);
	const path = encryptedStoragePath(uid, record);
	const encrypted = await encryptBlob(blob, uid);
	const uploaded = {
		...record,
		blob,
		storage: REMOTE_STORAGE_NAME,
		cloudStoragePath: path,
		cloudStorageBytes: encrypted.blob.size,
		encryption: encrypted.encryption,
		uploadedAt: new Date().toISOString(),
	};
	delete uploaded.dataUrl;
	await runBeforeStore(uploaded, options);
	await modules.uploadBytes(
		modules.ref(firebaseStorage, path),
		encrypted.blob,
		cloudMetadata(record, encrypted.encryption),
	);
	return uploaded;
}

async function remoteRecordExists(record, modules) {
	if (!record?.cloudStoragePath) {
		return false;
	}
	await modules.getMetadata(
		modules.ref(firebaseStorage, record.cloudStoragePath),
	);
	return true;
}

async function downloadRemoteRecord(record) {
	if (!record?.cloudStoragePath || !record?.encryption) {
		return null;
	}
	const uid = remoteMediaContext.uid;
	if (!cloudMediaReady(uid)) {
		return null;
	}
	const { modules } = await remoteUserContext(uid);
	const encryptedUrl = await modules.getDownloadURL(
		modules.ref(firebaseStorage, record.cloudStoragePath),
	);
	const response = await fetch(encryptedUrl);
	if (!response.ok) {
		throw new Error("Could not download private media.");
	}
	return await decryptBlob(await response.blob(), record, uid);
}

async function deleteRemoteRecord(record) {
	if (!record?.cloudStoragePath || !cloudMediaReady()) {
		return;
	}
	const { modules } = await remoteUserContext(remoteMediaContext.uid);
	await modules.deleteObject(
		modules.ref(firebaseStorage, record.cloudStoragePath),
	);
}

export function localAssetUrl(id) {
	return `${ASSET_PREFIX}${id}`;
}

export function localAssetIdFromUrl(url) {
	const text = String(url || "");
	return text.startsWith(ASSET_PREFIX) ? text.slice(ASSET_PREFIX.length) : "";
}

export async function storeLocalImage(file, options = {}) {
	if (!file?.type?.startsWith("image/")) {
		throw new Error("Only image files can be added.");
	}
	const image = await blobToImage(file);
	const originalWidth = image.naturalWidth || image.width;
	const originalHeight = image.naturalHeight || image.height;
	const { width, height } = resizedDimensions(originalWidth, originalHeight);
	const isResized = width !== originalWidth || height !== originalHeight;
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d", { alpha: false });
	context.fillStyle = "#ffffff";
	context.fillRect(0, 0, width, height);
	context.drawImage(image, 0, 0, width, height);

	const jpegBlob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
	const useOriginal = !isResized && file.size <= jpegBlob.size;
	const blob = useOriginal ? file : jpegBlob;
	const type = useOriginal ? file.type : "image/jpeg";
	const extension = useOriginal
		? storageExtensionForType(
				file.type,
				safeStorageName(file.name).split(".").pop() || "img",
			)
		: "jpg";
	const id = `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
	const record = {
		id,
		name: useOriginal
			? filenameWithExtension(file.name || `${id}.${extension}`, type, id)
			: filenameWithExtension(file.name || `${id}.${extension}`, type, id),
		type,
		size: blob.size,
		width,
		height,
		originalType: file.type,
		originalSize: file.size,
		created: new Date().toISOString(),
		storage: "indexeddb",
		futureStoragePath: `note-images/${id}.${extension}`,
		blob,
	};
	const uploadedRecord = cloudMediaReady()
		? await uploadRecordToCloud(record, options)
		: record;
	if (!cloudMediaReady()) {
		await runBeforeStore(uploadedRecord, options);
	}
	const store = await transaction("readwrite");
	await requestToPromise(store.put(uploadedRecord));
	return {
		...metadataFromRecord(uploadedRecord),
		markdown: `![${safeAltText(record.name)}](${localAssetUrl(id)})`,
	};
}

export async function storeLocalImageFromDataUrl(
	dataUrl,
	name = "image",
	options = {},
) {
	const blob = await dataUrlToBlob(dataUrl);
	const extension = storageExtensionForType(blob.type, "png");
	const file =
		typeof File === "function"
			? new File([blob], `${safeStorageName(name)}.${extension}`, {
					type: blob.type || "image/png",
				})
			: Object.assign(blob, { name: `${safeStorageName(name)}.${extension}` });
	return await storeLocalImage(file, options);
}

export async function storeLocalFile(
	file,
	folder = "life-attachments",
	options = {},
) {
	if (!file) {
		throw new Error("No file selected.");
	}
	const id = `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
	const record = {
		id,
		name: filenameWithExtension(
			file.name || id,
			file.type || "application/octet-stream",
			id,
		),
		type: file.type || "application/octet-stream",
		size: file.size || 0,
		created: new Date().toISOString(),
		storage: "indexeddb",
		futureStoragePath: `${folder}/${id}-${safeStorageName(file.name || id)}`,
		blob: file,
	};
	const uploadedRecord = cloudMediaReady()
		? await uploadRecordToCloud(record, options)
		: record;
	if (!cloudMediaReady()) {
		await runBeforeStore(uploadedRecord, options);
	}
	const store = await transaction("readwrite");
	await requestToPromise(store.put(uploadedRecord));
	const { blob, dataUrl, ...metadata } = uploadedRecord;
	return metadata;
}

export async function listLocalFiles() {
	const store = await transaction("readonly");
	const records = await requestToPromise(store.getAll());
	return records
		.map(metadataFromRecord)
		.sort((a, b) =>
			String(b.created || "").localeCompare(String(a.created || "")),
		);
}

export async function listLocalImages() {
	const records = await listLocalFiles();
	return records
		.filter((record) => record?.type?.startsWith("image/"))
		.sort((a, b) =>
			String(b.created || "").localeCompare(String(a.created || "")),
		);
}

export async function deleteLocalImages(ids) {
	const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
	if (!uniqueIds.length) {
		return;
	}
	const readStore = await transaction("readonly");
	const records = await Promise.all(
		uniqueIds.map((id) => requestToPromise(readStore.get(id))),
	);
	await Promise.all(
		records
			.filter(Boolean)
			.map((record) => deleteRemoteRecord(record).catch(() => {})),
	);
	const store = await transaction("readwrite");
	await Promise.all(uniqueIds.map((id) => requestToPromise(store.delete(id))));
	uniqueIds.forEach((id) => {
		const url = objectUrlCache.get(id);
		if (url) {
			URL.revokeObjectURL(url);
		}
		objectUrlCache.delete(id);
	});
}

export async function clearLocalFiles(options = {}) {
	if (options.deleteRemote !== false) {
		const readStore = await transaction("readonly");
		const records = await requestToPromise(readStore.getAll());
		await Promise.all(
			records
				.filter(Boolean)
				.map((record) => deleteRemoteRecord(record).catch(() => {})),
		);
	}
	const store = await transaction("readwrite");
	await requestToPromise(store.clear());
	objectUrlCache.forEach((url) => {
		URL.revokeObjectURL(url);
	});
	objectUrlCache.clear();
}

export async function exportLocalFiles(options = {}) {
	const includeData = options.includeData !== false;
	const store = await transaction("readonly");
	const records = await requestToPromise(store.getAll());
	return await Promise.all(
		records.map(async (record) => {
			const { blob, ...metadata } = record;
			const exported = { ...metadata };
			if (includeData) {
				exported.dataUrl = blob ? await blobToDataUrl(blob) : "";
			}
			return exported;
		}),
	);
}

export async function importLocalFiles(records, options = {}) {
	if (!Array.isArray(records)) {
		return;
	}
	const existingStore = await transaction("readonly");
	const existingRecords = await requestToPromise(existingStore.getAll()).catch(
		() => [],
	);
	const existingById = new Map(
		existingRecords
			.filter((record) => record?.id)
			.map((record) => [record.id, record]),
	);
	const restoredRecords = await Promise.all(
		records
			.filter((record) => record?.id)
			.map(async (record) => {
				const { dataUrl, ...metadata } = record;
				const restored = { ...metadata };
				if (dataUrl) {
					restored.blob = await dataUrlToBlob(dataUrl);
				} else {
					const existing = existingById.get(restored.id);
					if (existing?.blob) {
						restored.blob = existing.blob;
					} else if (existing?.dataUrl) {
						restored.blob = await dataUrlToBlob(existing.dataUrl);
					}
				}
				return restored;
			}),
	);
	if (typeof options.beforeImport === "function") {
		await options.beforeImport(restoredRecords.map(metadataFromRecord));
	}
	await clearLocalFiles({ deleteRemote: false });
	const store = await transaction("readwrite");
	await Promise.all(
		restoredRecords.map((record) => requestToPromise(store.put(record))),
	);
}

export async function migrateLocalMediaToCloud(options = {}) {
	const uid = String(options.uid || remoteMediaContext.uid || "").trim();
	if (!cloudMediaReady(uid)) {
		return { migrated: 0, skipped: 0 };
	}

	const store = await transaction("readonly");
	const records = await requestToPromise(store.getAll());
	let migrated = 0;
	let skipped = 0;

	for (const record of records) {
		if (!record?.id) {
			skipped += 1;
			continue;
		}
		const blob =
			record.blob ||
			(record.dataUrl ? await dataUrlToBlob(record.dataUrl) : null);
		const hasRemoteRecord = Boolean(
			record.cloudStoragePath && record.encryption,
		);
		if (!blob) {
			skipped += 1;
			continue;
		}
		if (hasRemoteRecord && options.repairMissingRemote !== true) {
			skipped += 1;
			continue;
		}
		if (hasRemoteRecord) {
			const { modules } = await remoteUserContext(uid);
			try {
				await remoteRecordExists(record, modules);
				skipped += 1;
				continue;
			} catch (error) {
				if (!String(error?.code || "").includes("storage/object-not-found")) {
					throw error;
				}
			}
		}
		const uploaded = await uploadRecordToCloud(
			{ ...record, blob },
			{ ...options, uid, forceUpload: hasRemoteRecord },
		);
		const writeStore = await transaction("readwrite");
		await requestToPromise(writeStore.put(uploaded));
		migrated += 1;
	}

	return { migrated, skipped };
}

export async function resolveLocalImageUrl(id) {
	const resolved = await resolveLocalFile(id);
	return resolved.url;
}

export async function resolveLocalFile(id) {
	if (!id) {
		return { url: "", name: "", type: "" };
	}
	const store = await transaction("readonly");
	const record = await requestToPromise(store.get(id));
	if (!record) {
		return { url: "", name: "", type: "" };
	}
	if (objectUrlCache.has(id)) {
		return {
			...metadataFromRecord(record),
			url: objectUrlCache.get(id),
		};
	}
	let blob = record.blob || null;
	if (!blob && record.cloudStoragePath && record.encryption) {
		blob = await downloadRemoteRecord(record);
		if (blob) {
			const writeStore = await transaction("readwrite");
			await requestToPromise(writeStore.put({ ...record, blob }));
		}
	}
	if (!blob) {
		return { ...metadataFromRecord(record), url: "" };
	}
	const url = URL.createObjectURL(blob);
	objectUrlCache.set(id, url);
	return {
		...metadataFromRecord({ ...record, blob }),
		url,
	};
}

export async function resolveLocalFileUrl(id) {
	const resolved = await resolveLocalFile(id);
	return resolved.url;
}
