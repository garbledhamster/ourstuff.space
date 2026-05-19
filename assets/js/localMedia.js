const DB_NAME = "ourstuff.localMedia.v1";
const DB_VERSION = 1;
const STORE_NAME = "files";
const ASSET_PREFIX = "ourstuff-asset:";
const MAX_IMAGE_EDGE = 1080;
const JPEG_QUALITY = 0.84;

let dbPromise = null;
const objectUrlCache = new Map();

function openDb() {
  if (dbPromise) return dbPromise;
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
  return openDb().then((db) => db.transaction(STORE_NAME, storeMode).objectStore(STORE_NAME));
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not resize image."));
    }, type, quality);
  });
}

function resizedDimensions(width, height) {
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function safeAltText(name) {
  return String(name || "image")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[\][()]/g, "")
    .trim() || "image";
}

function safeStorageName(name) {
  return String(name || "file")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "file";
}

function storageExtensionForType(type, fallback = "jpg") {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  return fallback;
}

export function localAssetUrl(id) {
  return `${ASSET_PREFIX}${id}`;
}

export function localAssetIdFromUrl(url) {
  const text = String(url || "");
  return text.startsWith(ASSET_PREFIX) ? text.slice(ASSET_PREFIX.length) : "";
}

export async function storeLocalImage(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Only image files can be added.");
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
    ? storageExtensionForType(file.type, safeStorageName(file.name).split(".").pop() || "img")
    : "jpg";
  const id = `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record = {
    id,
    name: file.name || `${id}.${extension}`,
    type,
    size: blob.size,
    width,
    height,
    originalType: file.type,
    originalSize: file.size,
    created: new Date().toISOString(),
    storage: "indexeddb",
    futureStoragePath: `note-images/${id}.${extension}`,
    blob
  };
  const store = await transaction("readwrite");
  await requestToPromise(store.put(record));
  return {
    ...record,
    markdown: `![${safeAltText(record.name)}](${localAssetUrl(id)})`
  };
}

export async function storeLocalFile(file, folder = "life-attachments") {
  if (!file) throw new Error("No file selected.");
  const id = `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record = {
    id,
    name: file.name || id,
    type: file.type || "application/octet-stream",
    size: file.size || 0,
    created: new Date().toISOString(),
    storage: "indexeddb",
    futureStoragePath: `${folder}/${id}-${safeStorageName(file.name || id)}`,
    blob: file
  };
  const store = await transaction("readwrite");
  await requestToPromise(store.put(record));
  const { blob, ...metadata } = record;
  return metadata;
}

export async function listLocalImages() {
  const store = await transaction("readonly");
  const records = await requestToPromise(store.getAll());
  return records
    .filter((record) => record?.type?.startsWith("image/"))
    .map(({ blob, ...metadata }) => metadata)
    .sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
}

export async function deleteLocalImages(ids) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return;
  const store = await transaction("readwrite");
  await Promise.all(uniqueIds.map((id) => requestToPromise(store.delete(id))));
  uniqueIds.forEach((id) => {
    const url = objectUrlCache.get(id);
    if (url) URL.revokeObjectURL(url);
    objectUrlCache.delete(id);
  });
}

export async function clearLocalFiles() {
  const store = await transaction("readwrite");
  await requestToPromise(store.clear());
  objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
  objectUrlCache.clear();
}

export async function exportLocalFiles() {
  const store = await transaction("readonly");
  const records = await requestToPromise(store.getAll());
  return await Promise.all(records.map(async (record) => {
    const { blob, ...metadata } = record;
    return {
      ...metadata,
      dataUrl: blob ? await blobToDataUrl(blob) : ""
    };
  }));
}

export async function importLocalFiles(records) {
  if (!Array.isArray(records)) return;
  await clearLocalFiles();
  const restoredRecords = await Promise.all(records.filter((record) => record?.id).map(async (record) => {
    const { dataUrl, ...metadata } = record;
    const blob = dataUrl ? await dataUrlToBlob(dataUrl) : new Blob([], { type: metadata.type || "application/octet-stream" });
    return { ...metadata, blob };
  }));
  const store = await transaction("readwrite");
  await Promise.all(restoredRecords.map((record) => requestToPromise(store.put(record))));
}

export async function resolveLocalImageUrl(id) {
  if (!id) return "";
  if (objectUrlCache.has(id)) return objectUrlCache.get(id);
  const store = await transaction("readonly");
  const record = await requestToPromise(store.get(id));
  if (!record?.blob) return "";
  const url = URL.createObjectURL(record.blob);
  objectUrlCache.set(id, url);
  return url;
}

export async function resolveLocalFileUrl(id) {
  return resolveLocalImageUrl(id);
}
