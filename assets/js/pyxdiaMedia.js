import {
	FIREBASE_CONFIG,
	FIREBASE_SDK_VERSION,
} from "./config.js?v=storage-quota-20260523a";

const PYXIDA_IMAGE_URL_PREFIX = "pyxida-image:";

let firebaseStoragePromise = null;
let firebaseStorageModules = null;
let firebaseStorage = null;
const imageUrlCache = new Map();

export function pyxdiaImageUrl(id) {
	return `${PYXIDA_IMAGE_URL_PREFIX}${id}`;
}

export function pyxdiaImageIdFromUrl(url) {
	const value = String(url || "");
	return value.startsWith(PYXIDA_IMAGE_URL_PREFIX)
		? value.slice(PYXIDA_IMAGE_URL_PREFIX.length)
		: "";
}

export function pyxdiaImageMarkdown(imageRef) {
	const alt = safeAltText(imageRef?.name || imageRef?.id || "image");
	return `![${alt}](${pyxdiaImageUrl(imageRef?.id || "")})`;
}

export async function uploadPyxdiaLetterImage(file, options = {}) {
	if (!file?.type?.startsWith("image/")) {
		throw new Error("Paste an image file into the letter editor.");
	}
	const uid = String(options.uid || "").trim();
	if (!uid)
		{throw new Error("Sign in before pasting images into PYXIDA letters.");}
	const letterId = safePathSegment(options.letterId || "draft");
	const imageId = safePathSegment(
		options.imageId ||
			crypto.randomUUID?.() ||
			`${Date.now()}-${Math.random()}`,
	);
	const extension = storageExtensionForType(file.type, "png");
	const name = filenameWithExtension(
		file.name || `${imageId}.${extension}`,
		file.type,
	);
	const storagePath = `users/${uid}/pyxdia/letters/${letterId}/images/${imageId}.${extension}`;
	const modules = await ensureFirebaseStorage();
	const ref = modules.ref(firebaseStorage, storagePath);
	await modules.uploadBytes(ref, file, {
		contentType: file.type || "application/octet-stream",
		customMetadata: {
			owner: uid,
			letterId,
			imageId,
			visibility: "private",
			feature: "pyxida-letter",
		},
	});
	const objectUrl = URL.createObjectURL(file);
	imageUrlCache.set(imageId, objectUrl);
	return {
		id: imageId,
		letterId,
		name,
		type: file.type || "application/octet-stream",
		size: Number(file.size) || 0,
		storagePath,
		createdAt: new Date().toISOString(),
		schemaVersion: 1,
	};
}

export async function resolvePyxdiaImageUrl(imageRef) {
	const id = String(imageRef?.id || "");
	if (!id) {return "";}
	if (imageUrlCache.has(id)) {return imageUrlCache.get(id);}
	const storagePath = String(imageRef?.storagePath || "");
	if (!storagePath) {return "";}
	const modules = await ensureFirebaseStorage();
	const blob = await modules.getBlob(modules.ref(firebaseStorage, storagePath));
	const objectUrl = URL.createObjectURL(blob);
	imageUrlCache.set(id, objectUrl);
	return objectUrl;
}

async function ensureFirebaseStorage() {
	if (firebaseStorageModules && firebaseStorage) {return firebaseStorageModules;}
	if (!firebaseStoragePromise) {
		firebaseStoragePromise = Promise.all([
			import(
				`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
			),
			import(
				`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-storage.js`
			),
		]).then(([appModule, storageModule]) => ({
			...appModule,
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

function safeAltText(name) {
	return (
		String(name || "image")
			.replace(/\.[a-z0-9]+$/i, "")
			.replace(/[\][()]/g, "")
			.trim() || "image"
	);
}

function safePathSegment(value) {
	return (
		String(value || "item")
			.replace(/[^a-z0-9._-]+/gi, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 120) || "item"
	);
}

function storageExtensionForType(type, fallback = "png") {
	const normalized = String(type || "").toLowerCase();
	if (normalized === "image/jpeg" || normalized === "image/jpg") {return "jpg";}
	if (normalized === "image/png") {return "png";}
	if (normalized === "image/webp") {return "webp";}
	if (normalized === "image/gif") {return "gif";}
	return fallback;
}

function filenameWithExtension(name, type) {
	const extension = storageExtensionForType(type, "png");
	const safeName = safePathSegment(name || `image.${extension}`);
	const stem = safeName.replace(/\.[a-z0-9]+$/i, "") || "image";
	const currentExtension = (
		safeName.match(/\.([a-z0-9]+)$/i)?.[1] || ""
	).toLowerCase();
	if (
		currentExtension === extension ||
		(extension === "jpg" && currentExtension === "jpeg")
	) {
		return safeName;
	}
	return `${stem}.${extension}`;
}
