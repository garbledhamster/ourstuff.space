const DB_NAME = "ourstuff.localMedia.v1";
const DB_VERSION = 1;
const STORE_NAME = "files";
const ASSET_PREFIX = "ourstuff-asset:";
const MAX_IMAGE_EDGE = 1280;
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
  const { width, height } = resizedDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  const id = `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record = {
    id,
    name: file.name || `${id}.jpg`,
    type: "image/jpeg",
    size: blob.size,
    width,
    height,
    originalType: file.type,
    originalSize: file.size,
    created: new Date().toISOString(),
    storage: "indexeddb",
    futureStoragePath: `note-images/${id}.jpg`,
    blob
  };
  const store = await transaction("readwrite");
  await requestToPromise(store.put(record));
  return {
    ...record,
    markdown: `![${safeAltText(record.name)}](${localAssetUrl(id)})`
  };
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
