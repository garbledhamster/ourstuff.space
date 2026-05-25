import {
	APP_ID,
	CLOUD_STORAGE_LIMIT_BYTES,
	FIREBASE_CONFIG,
	FIREBASE_SDK_VERSION,
	LOCAL_CLOUD_DEMO_CONFIG_URL,
	MAX_FIRESTORE_APPSTATE_BYTES,
	PAYMENTS_WORKER_URL,
	SITE_ID,
} from "./config.js?v=storage-quota-20260523a";

const DEVICE_ID_KEY = "ourstuff.cloudDeviceId.v1";
const LAST_SYNC_KEY = "ourstuff.lastCloudSyncAt.v1";
const LOCAL_DEMO_SESSION_KEY = "ourstuff.localCloudDemoSession.v1";
const LOCAL_DEMO_STATE_KEY = "ourstuff.localCloudDemoState.v1";
const CLOUD_STORAGE_VERSION = 2;
const CLOUD_SCHEMA_VERSION = 1;
const CLOUD_ARTIFACTS_COLLECTION = "artifacts";
const CLOUD_STATE_DOC_PREFIX = "__ourstuff_state__";
const CLOUD_LOCAL_FILE_DOC_PREFIX = "__ourstuff_file__";
const CLOUD_BATCH_LIMIT = 450;
const CLOUD_APP_STATE_KEYS = [
	"bodyTracker",
	"spiritProgress",
	"lifePlanner",
	"thoughtSettings",
	"goalSettings",
	"dashboardIdentity",
	"cloudMediaKey",
	"theme",
];
const CLOUD_APP_STATE_TITLES = {
	bodyTracker: "Body tracker state",
	spiritProgress: "Spirit progress state",
	lifePlanner: "Life planner state",
	thoughtSettings: "Thought settings",
	goalSettings: "Goal settings",
	dashboardIdentity: "Dashboard identity settings",
	cloudMediaKey: "Cloud media key",
	theme: "Interface theme",
};

const INACTIVE_ENTITLEMENT = {
	role: "member",
	cloud: false,
	admin: false,
	subscriptionStatus: "inactive",
	plan: null,
};

let firebaseModulesPromise = null;
let firebaseModules = null;
let firebaseAuth = null;
let firebaseDb = null;
let authUnsubscribe = null;
let currentFirebaseUser = null;

const listeners = new Set();
let cloudState = {
	ready: false,
	busy: false,
	mode: "loading",
	user: null,
	claims: {},
	profile: null,
	entitlement: { ...INACTIVE_ENTITLEMENT },
	deviceId: getDeviceId(),
	lastCloudSyncAt: loadLastCloudSyncAt(""),
	message: "",
	error: "",
	isLocalDemo: false,
	localDemoAvailable: isLocalDemoHost(),
	firebaseAvailable: false,
	billingCapable: false,
};

export function getCloudAccountState() {
	return {
		...cloudState,
		user: cloudState.user ? { ...cloudState.user } : null,
		entitlement: { ...cloudState.entitlement },
	};
}

export async function getCloudIdToken(options = {}) {
	if (!currentFirebaseUser) {
		if (options.optional === true) return null;
		throw new Error("Sign in before using PYXIDA.");
	}
	return currentFirebaseUser.getIdToken(options.forceRefresh === true);
}

export function subscribeCloudAccount(listener) {
	listeners.add(listener);
	listener(getCloudAccountState());
	return () => listeners.delete(listener);
}

export async function initCloudAccount(listener) {
	if (listener) subscribeCloudAccount(listener);
	const demoSession = loadLocalDemoSession();
	if (demoSession && isLocalDemoHost()) {
		emitCloudState(
			localDemoState(demoSession.user, "Subscribed local session restored."),
		);
		return getCloudAccountState();
	}

	try {
		await ensureFirebase();
		if (authUnsubscribe) authUnsubscribe();
		authUnsubscribe = firebaseModules.onAuthStateChanged(
			firebaseAuth,
			(user) => {
				void handleFirebaseAuthChange(user);
			},
		);
	} catch (error) {
		emitCloudState({
			ready: true,
			mode: "signed-out",
			firebaseAvailable: false,
			message: "Cloud sign-in is unavailable right now.",
			error: errorMessage(error),
		});
	}
	return getCloudAccountState();
}

export async function signInToCloud() {
	if (isLocalDemoHost()) {
		return signInLocalSubscribedDemo();
	}
	return signInWithGoogle();
}

export async function signInWithGoogle() {
	const modules = await ensureFirebase();
	emitCloudState({
		busy: true,
		message: "Opening Google sign-in...",
		error: "",
	});
	const provider = new modules.GoogleAuthProvider();
	provider.setCustomParameters({ prompt: "select_account" });
	await modules.signInWithPopup(firebaseAuth, provider);
	return getCloudAccountState();
}

export async function signInWithEmailPassword(email, password, options = {}) {
	const modules = await ensureFirebase();
	const cleanEmail = String(email || "").trim();
	const cleanPassword = String(password || "");
	if (!cleanEmail || !cleanPassword) {
		throw new Error("Email and password are required.");
	}

	emitCloudState({
		busy: true,
		message: options.create ? "Creating account..." : "Signing in...",
		error: "",
	});

	if (options.create) {
		await modules.createUserWithEmailAndPassword(
			firebaseAuth,
			cleanEmail,
			cleanPassword,
		);
	} else {
		await modules.signInWithEmailAndPassword(
			firebaseAuth,
			cleanEmail,
			cleanPassword,
		);
	}
	return getCloudAccountState();
}

export async function signInLocalSubscribedDemo() {
	if (!isLocalDemoHost()) {
		throw new Error("Local subscribed demo is only available on localhost.");
	}

	const profile = await loadLocalDemoProfile();
	const user = {
		uid: "local-demo-subscribed-user",
		email: profile.email || "",
		displayName: profile.displayName || "Subscribed local user",
	};
	saveLocalDemoSession(user);
	emitCloudState(localDemoState(user, "Subscribed local session active."));
	return getCloudAccountState();
}

export async function signOutCloud() {
	if (cloudState.isLocalDemo) {
		clearLocalDemoSession();
		emitCloudState(
			signedOutState("Signed out. Local data is still on this device."),
		);
		return getCloudAccountState();
	}

	if (firebaseAuth) {
		emitCloudState({ busy: true, message: "Signing out...", error: "" });
		await firebaseModules.signOut(firebaseAuth);
	} else {
		emitCloudState(
			signedOutState("Signed out. Local data is still on this device."),
		);
	}
	return getCloudAccountState();
}

export async function startCloudSubscription(returnUrl = currentReturnUrl()) {
	if (cloudState.isLocalDemo) {
		emitCloudState({
			message: "Local subscribed demo already has Cloud enabled.",
			error: "",
		});
		return getCloudAccountState();
	}

	const user = requireSignedInFirebaseUser();
	const idToken = await user.getIdToken();
	emitCloudState({
		busy: true,
		message: "Opening subscription checkout...",
		error: "",
	});
	const response = await fetch(
		`${PAYMENTS_WORKER_URL}/api/subscriptions/checkout`,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${idToken}`,
			},
			body: JSON.stringify({
				site: SITE_ID,
				appId: APP_ID,
				returnUrl,
			}),
		},
	);
	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		emitCloudState({
			busy: false,
			error: result?.error?.message || "Subscription checkout failed.",
		});
		throw new Error(result?.error?.message || "Subscription checkout failed.");
	}
	if (result.url) {
		window.location.assign(result.url);
	}
	emitCloudState({
		busy: false,
		message: "Subscription checkout opened.",
		error: "",
	});
	return result;
}

export async function openBillingPortal(returnUrl = currentReturnUrl()) {
	if (cloudState.isLocalDemo) {
		emitCloudState({
			message: "Billing is not needed for the local subscribed demo.",
			error: "",
		});
		return getCloudAccountState();
	}

	const user = requireSignedInFirebaseUser();
	const idToken = await user.getIdToken();
	emitCloudState({
		busy: true,
		message: "Opening billing portal...",
		error: "",
	});
	const response = await fetch(
		`${PAYMENTS_WORKER_URL}/api/subscriptions/portal`,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${idToken}`,
			},
			body: JSON.stringify({ returnUrl }),
		},
	);
	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		emitCloudState({
			busy: false,
			error: result?.error?.message || "Billing portal failed.",
		});
		throw new Error(result?.error?.message || "Billing portal failed.");
	}
	if (result.url) {
		window.location.assign(result.url);
	}
	emitCloudState({ busy: false, message: "Billing portal opened.", error: "" });
	return result;
}

export async function saveCloudStateJson(json, options = {}) {
	requireCloudEntitlement();
	const jsonBytes = estimateJsonBytes(json);

	if (cloudState.isLocalDemo) {
		const savedAt = new Date().toISOString();
		const usage = estimateCloudStateStorageUsage(json, {
			uid: cloudState.user?.uid || "local-demo-subscribed-user",
			updatedAt: savedAt,
			deviceId: getDeviceId(),
			storageBytes: options.storageBytes,
		});
		assertStorageUsageWithinLimit(usage);
		window.localStorage.setItem(
			LOCAL_DEMO_STATE_KEY,
			JSON.stringify({
				appId: APP_ID,
				version: 1,
				updatedAt: savedAt,
				deviceId: getDeviceId(),
				jsonBytes,
				storageUsage: usage,
				json,
			}),
		);
		saveLastCloudSyncAt(
			savedAt,
			cloudState.user?.uid || "local-demo-subscribed-user",
		);
		emitCloudState({
			lastCloudSyncAt: savedAt,
			message: "Local demo cloud state saved.",
			error: "",
		});
		return { updatedAt: savedAt, jsonBytes, storageUsage: usage, ...usage };
	}

	const user = requireSignedInFirebaseUser();
	const savedAt = new Date().toISOString();
	const result = await replaceCloudArtifactCollection(user.uid, json, {
		updatedAt: savedAt,
		deviceId: getDeviceId(),
		storageBytes: options.storageBytes,
	});
	const syncedAt = normalizeSyncTimestamp(result?.updatedAt || savedAt);
	saveLastCloudSyncAt(syncedAt, user.uid);
	emitCloudState({
		lastCloudSyncAt: syncedAt,
		message: "Firebase artifacts saved.",
		error: "",
	});
	return { ...result, updatedAt: syncedAt, jsonBytes };
}

export async function loadCloudStateJson() {
	requireCloudEntitlement();

	if (cloudState.isLocalDemo) {
		const parsed = JSON.parse(
			window.localStorage.getItem(LOCAL_DEMO_STATE_KEY) || "null",
		);
		if (!parsed?.json) {
			throw new Error("No local demo cloud state has been saved yet.");
		}
		emitCloudState({ message: "Local demo cloud state loaded.", error: "" });
		return parsed.json;
	}

	const user = requireSignedInFirebaseUser();
	const data = await readCloudArtifactCollection(user.uid);
	if (data.deleted) {
		throw new Error("Cloud state has been deleted.");
	}
	if (!data.exists) {
		throw new Error("No cloud state has been saved yet.");
	}
	if (!data?.json || data.appId !== APP_ID) {
		throw new Error("Saved cloud state is not valid for this app.");
	}
	emitCloudState({ message: "Firebase artifacts loaded.", error: "" });
	return data.json;
}

export async function getCloudStateInfo() {
	requireCloudEntitlement();

	if (cloudState.isLocalDemo) {
		const parsed = JSON.parse(
			window.localStorage.getItem(LOCAL_DEMO_STATE_KEY) || "null",
		);
		return {
			appId: APP_ID,
			exists: Boolean(parsed?.json),
			deleted: false,
			deviceId: parsed?.deviceId || null,
			updatedAt: parsed?.updatedAt || "",
			jsonBytes: parsed?.jsonBytes || 0,
			storageUsage: normalizeStoredUsage(
				parsed?.storageUsage,
				parsed?.jsonBytes || 0,
			),
			json: parsed?.json || null,
		};
	}

	const user = requireSignedInFirebaseUser();
	return await readCloudArtifactCollection(user.uid);
}

export function recordCloudSyncAt(
	value = new Date().toISOString(),
	message = "Cloud state synced.",
) {
	const syncedAt = normalizeSyncTimestamp(value);
	saveLastCloudSyncAt(syncedAt);
	emitCloudState({ lastCloudSyncAt: syncedAt, message, error: "" });
	return syncedAt;
}

export async function deleteCloudStateJson() {
	requireCloudEntitlement();

	if (cloudState.isLocalDemo) {
		window.localStorage.removeItem(LOCAL_DEMO_STATE_KEY);
		emitCloudState({ message: "Local demo cloud state deleted.", error: "" });
		return { deleted: true };
	}

	const user = requireSignedInFirebaseUser();
	const result = await deleteCloudArtifactCollection(user.uid, {
		updatedAt: new Date().toISOString(),
		deviceId: getDeviceId(),
	});
	emitCloudState({ message: "Firebase artifacts deleted.", error: "" });
	return result;
}

export async function deleteCloudAccount() {
	if (cloudState.isLocalDemo) {
		clearLocalDemoSession();
		window.localStorage.removeItem(LOCAL_DEMO_STATE_KEY);
		emitCloudState(signedOutState("Local demo cloud account deleted."));
		return { deleted: true };
	}

	const user = requireSignedInFirebaseUser();
	await deleteCloudArtifactCollection(user.uid, {
		updatedAt: new Date().toISOString(),
		deviceId: getDeviceId(),
	});
	const idToken = await user.getIdToken();
	const response = await fetch(`${PAYMENTS_WORKER_URL}/api/cloud/account`, {
		method: "DELETE",
		headers: { authorization: `Bearer ${idToken}` },
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(result?.error?.message || "Cloud account delete failed.");
	}
	emitCloudState(signedOutState("Cloud account deletion requested."));
	return result;
}

async function replaceCloudArtifactCollection(uid, json, options = {}) {
	const modules = await ensureFirebase();
	const updatedAt =
		normalizeSyncTimestamp(options.updatedAt) || new Date().toISOString();
	const deviceId = options.deviceId || getDeviceId();
	const normalized = normalizeExportJson(json, { updatedAt, deviceId });
	assertNoBase64MediaForCloud(normalized);
	const docs = appJsonToCloudArtifactDocs(normalized, uid, {
		updatedAt,
		deviceId,
	});
	assertCloudDocsWithinLimit(docs);
	const usageResult = cloudStorageUsageResult(normalized, docs, {
		uid,
		updatedAt,
		deviceId,
		storageBytes: options.storageBytes,
	});
	assertStorageUsageWithinLimit(usageResult.storageUsage);

	const collectionRef = userAppArtifactsCollectionRef(modules, uid);
	await deleteCollectionDocs(modules, collectionRef);
	await writeCollectionDocs(modules, collectionRef, docs);

	const appDoc = userAppDocRef(modules, uid);
	await modules.setDoc(appDoc, usageResult.appDoc, { merge: true });

	return {
		appId: APP_ID,
		exists: true,
		deleted: false,
		storage: "firestore-artifacts",
		collection: CLOUD_ARTIFACTS_COLLECTION,
		updatedAt,
		deviceId,
		jsonBytes: usageResult.appDoc.jsonBytes,
		firebaseBytes: usageResult.storageUsage.firebaseBytes,
		storageBytes: usageResult.storageUsage.storageBytes,
		totalBytes: usageResult.storageUsage.totalBytes,
		limitBytes: usageResult.storageUsage.limitBytes,
		storageUsage: usageResult.storageUsage,
		docCount: docs.length,
		artifactCount: normalized.artifacts.length,
	};
}

async function readCloudArtifactCollection(uid) {
	const modules = await ensureFirebase();
	const appSnapshot = await modules.getDoc(userAppDocRef(modules, uid));
	const appData = appSnapshot.exists() ? appSnapshot.data() : {};
	const updatedAt = normalizeSyncTimestampFromFirestore(appData?.updatedAt);
	if (appData?.deleted === true) {
		return {
			appId: APP_ID,
			exists: false,
			deleted: true,
			storage: "firestore-artifacts",
			collection: CLOUD_ARTIFACTS_COLLECTION,
			updatedAt,
			deviceId: appData?.deviceId || "",
			jsonBytes: Number(appData?.jsonBytes) || 0,
			storageUsage: normalizeStoredUsage(appData?.storageUsage, 0),
			docCount: 0,
			json: null,
		};
	}

	const snapshot = await modules.getDocs(
		userAppArtifactsCollectionRef(modules, uid),
	);
	const docs = snapshot.docs.map((docSnapshot) => ({
		id: docSnapshot.id,
		...docSnapshot.data(),
	}));
	const exists = docs.length > 0;
	const json = exists ? cloudArtifactDocsToAppJson(docs, appData) : null;
	const firebaseBytes = estimateFirestorePayloadBytes(appData, docs);
	return {
		appId: APP_ID,
		exists,
		deleted: false,
		storage: "firestore-artifacts",
		collection: CLOUD_ARTIFACTS_COLLECTION,
		updatedAt:
			updatedAt || normalizeSyncTimestamp(json?.metadata?.localUpdatedAt),
		deviceId: appData?.deviceId || "",
		jsonBytes:
			Number(appData?.jsonBytes) || (json ? estimateJsonBytes(json) : 0),
		firebaseBytes,
		storageUsage: normalizeStoredUsage(appData?.storageUsage, firebaseBytes),
		docCount: docs.length,
		artifactCount: json?.artifacts?.length || 0,
		json,
	};
}

async function deleteCloudArtifactCollection(uid, options = {}) {
	const modules = await ensureFirebase();
	const updatedAt =
		normalizeSyncTimestamp(options.updatedAt) || new Date().toISOString();
	const deviceId = options.deviceId || getDeviceId();
	const collectionRef = userAppArtifactsCollectionRef(modules, uid);
	const deletedDocs = await deleteCollectionDocs(modules, collectionRef);
	await modules.setDoc(
		userAppDocRef(modules, uid),
		{
			appId: APP_ID,
			version: CLOUD_STORAGE_VERSION,
			schemaVersion: CLOUD_SCHEMA_VERSION,
			storage: "firestore-artifacts",
			collection: CLOUD_ARTIFACTS_COLLECTION,
			deleted: true,
			rootId: "ourstuff-root",
			updatedAt,
			deviceId,
			jsonBytes: 0,
			docCount: 0,
			artifactCount: 0,
			storageUsage: emptyStorageUsage(updatedAt),
		},
		{ merge: true },
	);
	return {
		appId: APP_ID,
		exists: false,
		deleted: true,
		storage: "firestore-artifacts",
		collection: CLOUD_ARTIFACTS_COLLECTION,
		updatedAt,
		deviceId,
		deletedDocs,
		storageUsage: emptyStorageUsage(updatedAt),
	};
}

function userAppDocRef(modules, uid) {
	return modules.doc(firebaseDb, "users", uid, "apps", APP_ID);
}

function userAppArtifactsCollectionRef(modules, uid) {
	return modules.collection(
		firebaseDb,
		"users",
		uid,
		"apps",
		APP_ID,
		CLOUD_ARTIFACTS_COLLECTION,
	);
}

async function deleteCollectionDocs(modules, collectionRef) {
	const snapshot = await modules.getDocs(collectionRef);
	let batch = modules.writeBatch(firebaseDb);
	let operationCount = 0;
	let deletedCount = 0;

	for (const docSnapshot of snapshot.docs) {
		batch.delete(docSnapshot.ref);
		operationCount += 1;
		deletedCount += 1;
		if (operationCount >= CLOUD_BATCH_LIMIT) {
			await batch.commit();
			batch = modules.writeBatch(firebaseDb);
			operationCount = 0;
		}
	}

	if (operationCount > 0) await batch.commit();
	return deletedCount;
}

async function writeCollectionDocs(modules, collectionRef, docs) {
	let batch = modules.writeBatch(firebaseDb);
	let operationCount = 0;

	for (const item of docs) {
		batch.set(modules.doc(collectionRef, item.id), item);
		operationCount += 1;
		if (operationCount >= CLOUD_BATCH_LIMIT) {
			await batch.commit();
			batch = modules.writeBatch(firebaseDb);
			operationCount = 0;
		}
	}

	if (operationCount > 0) await batch.commit();
}

function normalizeExportJson(json, context = {}) {
	const updatedAt =
		normalizeSyncTimestamp(context.updatedAt) || new Date().toISOString();
	const metadata =
		json?.metadata && typeof json.metadata === "object" ? json.metadata : {};
	return {
		schemaVersion:
			json?.schemaVersion === CLOUD_SCHEMA_VERSION
				? CLOUD_SCHEMA_VERSION
				: CLOUD_SCHEMA_VERSION,
		rootId: String(json?.rootId || "ourstuff-root"),
		artifacts: Array.isArray(json?.artifacts)
			? json.artifacts.map(jsonSafe)
			: [],
		metadata: {
			...jsonSafe(metadata),
			localUpdatedAt:
				normalizeSyncTimestamp(metadata.localUpdatedAt) || updatedAt,
			cloudStorage: "firestore-artifacts",
			deviceId: context.deviceId || metadata.deviceId || "",
		},
		appState:
			json?.appState && typeof json.appState === "object"
				? jsonSafe(json.appState)
				: {},
	};
}

export function estimateCloudStateStorageUsage(json, options = {}) {
	const updatedAt =
		normalizeSyncTimestamp(
			options.updatedAt || json?.metadata?.localUpdatedAt,
		) || new Date().toISOString();
	const deviceId =
		options.deviceId || json?.metadata?.deviceId || getDeviceId();
	const uid = String(
		options.uid || cloudState.user?.uid || "storage-estimate-user",
	);
	const normalized = normalizeExportJson(json, { updatedAt, deviceId });
	assertNoBase64MediaForCloud(normalized);
	const docs = appJsonToCloudArtifactDocs(normalized, uid, {
		updatedAt,
		deviceId,
	});
	assertCloudDocsWithinLimit(docs);
	return cloudStorageUsageResult(normalized, docs, {
		uid,
		updatedAt,
		deviceId,
		storageBytes: options.storageBytes,
	}).storageUsage;
}

function cloudAppDocBase(json, docs, context = {}) {
	return {
		appId: APP_ID,
		version: CLOUD_STORAGE_VERSION,
		schemaVersion: json.schemaVersion,
		storage: "firestore-artifacts",
		collection: CLOUD_ARTIFACTS_COLLECTION,
		deleted: false,
		rootId: json.rootId,
		updatedAt: context.updatedAt,
		deviceId: context.deviceId,
		jsonBytes: estimateJsonBytes(json),
		docCount: docs.length,
		artifactCount: json.artifacts.length,
	};
}

function cloudStorageUsageResult(json, docs, context = {}) {
	const docsBytes = docs.reduce(
		(total, doc) => total + estimateJsonBytes(doc),
		0,
	);
	const storageBytes = Math.max(0, Number(context.storageBytes) || 0);
	const baseAppDoc = cloudAppDocBase(json, docs, context);
	let appDoc = { ...baseAppDoc };
	let storageUsage = emptyStorageUsage(context.updatedAt);

	for (let index = 0; index < 8; index += 1) {
		const firebaseBytes = docsBytes + estimateJsonBytes(appDoc);
		const nextUsage = {
			limitBytes: CLOUD_STORAGE_LIMIT_BYTES,
			storageBytes,
			firebaseBytes,
			totalBytes: storageBytes + firebaseBytes,
			updatedAt: context.updatedAt,
		};
		if (
			nextUsage.firebaseBytes === storageUsage.firebaseBytes &&
			nextUsage.totalBytes === storageUsage.totalBytes &&
			appDoc.storageUsage
		) {
			storageUsage = nextUsage;
			break;
		}
		storageUsage = nextUsage;
		appDoc = { ...baseAppDoc, storageUsage };
	}

	appDoc = { ...baseAppDoc, storageUsage };
	return { appDoc, storageUsage };
}

function emptyStorageUsage(updatedAt = "") {
	return {
		limitBytes: CLOUD_STORAGE_LIMIT_BYTES,
		storageBytes: 0,
		firebaseBytes: 0,
		totalBytes: 0,
		updatedAt,
	};
}

function normalizeStoredUsage(value, firebaseBytes = 0) {
	const storageBytes = Math.max(0, Number(value?.storageBytes) || 0);
	const normalizedFirebaseBytes = Math.max(
		0,
		Number(value?.firebaseBytes) || Number(firebaseBytes) || 0,
	);
	return {
		limitBytes: Number(value?.limitBytes) || CLOUD_STORAGE_LIMIT_BYTES,
		storageBytes,
		firebaseBytes: normalizedFirebaseBytes,
		totalBytes: Math.max(
			0,
			Number(value?.totalBytes) || storageBytes + normalizedFirebaseBytes,
		),
		updatedAt: value?.updatedAt ? normalizeSyncTimestamp(value.updatedAt) : "",
	};
}

function estimateFirestorePayloadBytes(appData, docs) {
	return (
		estimateJsonBytes(appData || {}) +
		docs.reduce((total, doc) => total + estimateJsonBytes(doc), 0)
	);
}

function formatStorageGb(size) {
	const bytes = Math.max(0, Number(size) || 0);
	return `${(bytes / 1000000000).toFixed(1)}GB`;
}

function assertStorageUsageWithinLimit(usage) {
	const totalBytes = Math.max(0, Number(usage?.totalBytes) || 0);
	if (totalBytes <= CLOUD_STORAGE_LIMIT_BYTES) return;
	throw new Error(
		`Cloud storage limit reached: ${formatStorageGb(totalBytes)} would exceed the 1GB limit.`,
	);
}

function appJsonToCloudArtifactDocs(json, uid, context = {}) {
	const updatedAt =
		normalizeSyncTimestamp(context.updatedAt) || new Date().toISOString();
	const docs = [];

	json.artifacts.forEach((artifact, index) => {
		docs.push(
			localArtifactToCloudDoc(artifact, uid, {
				order: index,
				rootId: json.rootId,
				updatedAt,
			}),
		);
	});

	CLOUD_APP_STATE_KEYS.forEach((stateKey, index) => {
		if (!Object.hasOwn(json.appState, stateKey)) return;
		docs.push(
			appStateToCloudDoc(stateKey, json.appState[stateKey], uid, {
				order: index,
				updatedAt,
			}),
		);
	});

	const localFiles = Array.isArray(json.appState?.localFiles)
		? json.appState.localFiles
		: [];
	localFiles.forEach((file, index) => {
		docs.push(
			localFileToCloudDoc(file, uid, {
				order: index,
				updatedAt,
			}),
		);
	});

	return docs;
}

function localArtifactToCloudDoc(artifact, uid, context = {}) {
	const safeArtifact = jsonSafe(artifact || {});
	const dashboard = String(safeArtifact.dashboard || "Dashboard");
	const type = String(safeArtifact.type || "note");
	const createdAt =
		normalizeSyncTimestamp(safeArtifact.created) || context.updatedAt;
	const updatedAt =
		normalizeSyncTimestamp(safeArtifact.edited) ||
		createdAt ||
		context.updatedAt;
	const title = String(safeArtifact.title || "Untitled");
	const deleted = safeArtifact.deleted === true;
	const status = deleted
		? "deleted"
		: String(safeArtifact.properties?.status || "active");
	const id = firestoreDocId(safeArtifact.id, `artifact-${context.order || 0}`);

	return cloudDocBase({
		id,
		uid,
		type,
		title,
		tags: uniqueStrings(["ourstuff", APP_ID, dashboard.toLowerCase(), type]),
		status,
		deleted,
		deletedAt: safeArtifact.deletedAt || null,
		deleteAfter: safeArtifact.deleteAfter || null,
		deletedBy: safeArtifact.deletedBy || "",
		deleteMode: safeArtifact.deleteMode || "",
		originalCollection: safeArtifact.originalCollection || "",
		createdAt,
		updatedAt,
		refs: {
			assets: collectLocalAssetRefs(safeArtifact),
			sources: [],
			links: [],
		},
		data: {
			core: {
				text: String(safeArtifact.body || ""),
				context: {
					appId: APP_ID,
					dashboard,
					parentId: safeArtifact.parentId || null,
					childIds: Array.isArray(safeArtifact.childIds)
						? safeArtifact.childIds
						: [],
				},
			},
			ourstuff: {
				kind: "artifact",
				rootId: context.rootId || "ourstuff-root",
				order: Number(context.order) || 0,
				dashboard,
				parentId: safeArtifact.parentId || null,
				artifact: safeArtifact,
			},
		},
		extraAttributes: {
			extraAttribute1: dashboard,
			extraAttribute2: type,
			extraAttribute3: status,
			extraAttribute4: Boolean(safeArtifact.parentId),
			extraAttribute5: APP_ID,
		},
	});
}

function appStateToCloudDoc(stateKey, value, uid, context = {}) {
	const updatedAt = context.updatedAt || new Date().toISOString();
	const title = CLOUD_APP_STATE_TITLES[stateKey] || `${stateKey} state`;
	return cloudDocBase({
		id: `${CLOUD_STATE_DOC_PREFIX}${firestoreDocId(stateKey, "state")}`,
		uid,
		type: "app_state",
		title,
		tags: uniqueStrings(["ourstuff", APP_ID, "settings", stateKey]),
		status: "active",
		createdAt: updatedAt,
		updatedAt,
		refs: { assets: [], sources: [], links: [] },
		data: {
			core: {
				text: title,
				context: { appId: APP_ID, stateKey },
			},
			ourstuff: {
				kind: "appState",
				order: Number(context.order) || 0,
				stateKey,
				value: jsonSafe(value),
			},
		},
		extraAttributes: {
			extraAttribute1: "settings",
			extraAttribute2: stateKey,
			extraAttribute3: "",
			extraAttribute4: false,
			extraAttribute5: APP_ID,
		},
	});
}

function localFileToCloudDoc(file, uid, context = {}) {
	const safeFile = cloudSafeLocalFile(file);
	const fileId = firestoreDocId(
		safeFile.id,
		`local-file-${context.order || 0}`,
	);
	const updatedAt =
		normalizeSyncTimestamp(safeFile.created) ||
		context.updatedAt ||
		new Date().toISOString();
	return cloudDocBase({
		id: `${CLOUD_LOCAL_FILE_DOC_PREFIX}${fileId}`,
		uid,
		type: "asset",
		title: String(safeFile.name || safeFile.id || "Local file"),
		tags: uniqueStrings([
			"ourstuff",
			APP_ID,
			"local-file",
			String(safeFile.type || "").split("/")[0],
		]),
		status: "active",
		createdAt: updatedAt,
		updatedAt,
		refs: { assets: [safeFile.id].filter(Boolean), sources: [], links: [] },
		data: {
			core: {
				text: String(safeFile.name || safeFile.id || "Local file"),
				context: {
					appId: APP_ID,
					stateKey: "localFiles",
					type: safeFile.type || "",
					size: Number(safeFile.size) || 0,
				},
			},
			ourstuff: {
				kind: "localFile",
				order: Number(context.order) || 0,
				stateKey: "localFiles",
				file: safeFile,
			},
		},
		extraAttributes: {
			extraAttribute1: "asset",
			extraAttribute2: "localFiles",
			extraAttribute3: safeFile.type || "",
			extraAttribute4: false,
			extraAttribute5: APP_ID,
		},
	});
}

function cloudSafeLocalFile(file) {
	const safeFile = jsonSafe(file || {});
	delete safeFile.blob;
	delete safeFile.dataUrl;
	if (typeof safeFile.url === "string" && safeFile.url.startsWith("data:"))
		delete safeFile.url;
	if (
		typeof safeFile.downloadUrl === "string" &&
		safeFile.downloadUrl.startsWith("data:")
	)
		delete safeFile.downloadUrl;
	return safeFile;
}

function cloudDocBase({
	id,
	uid,
	type,
	title,
	tags,
	status,
	deleted = false,
	deletedAt = null,
	deleteAfter = null,
	deletedBy = "",
	deleteMode = "",
	originalCollection = "",
	createdAt,
	updatedAt,
	refs,
	data,
	extraAttributes,
}) {
	return jsonSafe({
		id,
		type,
		title,
		owner: uid,
		acl: { owners: [uid], editors: [], viewers: [] },
		visibility: "private",
		primaryProjectId: null,
		projectIds: [],
		tags,
		status,
		deleted,
		deletedAt,
		deleteAfter,
		deletedBy,
		deleteMode,
		originalCollection,
		schemaVersion: CLOUD_SCHEMA_VERSION,
		createdAt,
		updatedAt,
		refs,
		data,
		extraAttributes,
	});
}

function cloudArtifactDocsToAppJson(docs, appData = {}) {
	const artifactRows = [];
	const stateRows = [];
	const localFileRows = [];

	docs.forEach((doc, index) => {
		const ourstuff = doc?.data?.ourstuff || {};
		if (ourstuff.kind === "artifact" && ourstuff.artifact) {
			artifactRows.push({
				order: numberOrFallback(ourstuff.order, index),
				artifact: cloudLifecycleToLocalArtifact(ourstuff.artifact, doc),
			});
			return;
		}
		if (ourstuff.kind === "appState" && ourstuff.stateKey) {
			stateRows.push({
				order: numberOrFallback(ourstuff.order, index),
				key: String(ourstuff.stateKey),
				value: jsonSafe(ourstuff.value),
			});
			return;
		}
		if (ourstuff.kind === "localFile" && ourstuff.file) {
			localFileRows.push({
				order: numberOrFallback(ourstuff.order, index),
				file: jsonSafe(ourstuff.file),
			});
			return;
		}
		if (!String(doc?.id || "").startsWith("__ourstuff_")) {
			artifactRows.push({
				order: index,
				artifact: cloudDocToLocalArtifact(doc),
			});
		}
	});

	const appState = {};
	stateRows
		.sort((a, b) => a.order - b.order)
		.forEach((row) => {
			appState[row.key] = row.value;
		});
	appState.localFiles = localFileRows
		.sort((a, b) => a.order - b.order)
		.map((row) => row.file);

	return {
		schemaVersion: CLOUD_SCHEMA_VERSION,
		rootId: String(appData?.rootId || "ourstuff-root"),
		artifacts: artifactRows
			.sort((a, b) => a.order - b.order)
			.map((row) => row.artifact),
		metadata: {
			localUpdatedAt:
				normalizeSyncTimestampFromFirestore(appData?.updatedAt) ||
				new Date().toISOString(),
			cloudStorage: "firestore-artifacts",
			deviceId: appData?.deviceId || "",
			docCount: docs.length,
		},
		appState,
	};
}

function cloudDocToLocalArtifact(doc) {
	const created =
		normalizeSyncTimestampFromFirestore(doc?.createdAt) ||
		new Date().toISOString();
	const edited = normalizeSyncTimestampFromFirestore(doc?.updatedAt) || created;
	const ourstuff = doc?.data?.ourstuff || {};
	return cloudLifecycleToLocalArtifact({
		id: String(doc?.id || `artifact-${Date.now()}`),
		type: String(doc?.type || "note"),
		dashboard: String(ourstuff.dashboard || "Mind"),
		parentId: ourstuff.parentId || null,
		title: String(doc?.title || "Untitled"),
		body: String(doc?.data?.core?.text || ""),
		created,
		edited,
		childIds: Array.isArray(ourstuff.childIds) ? ourstuff.childIds : [],
		properties: ourstuff.properties || {
			status: String(doc?.status || "active"),
		},
		analysis: ourstuff.analysis || {},
	}, doc);
}

function cloudLifecycleToLocalArtifact(artifact, doc = {}) {
	const safeArtifact = jsonSafe(artifact || {});
	return {
		...safeArtifact,
		deleted: doc.deleted === true,
		deletedAt: doc.deletedAt || null,
		deleteAfter: doc.deleteAfter || null,
		deletedBy: doc.deletedBy || "",
		deleteMode: doc.deleteMode || "",
		originalCollection: doc.originalCollection || safeArtifact.originalCollection || "",
	};
}

function assertCloudDocsWithinLimit(docs) {
	const oversized = docs.find(
		(doc) => estimateJsonBytes(doc) > MAX_FIRESTORE_APPSTATE_BYTES,
	);
	if (!oversized) return;
	throw new Error(
		`Firebase artifact "${oversized.title || oversized.id}" is too large to sync as one document.`,
	);
}

function assertNoBase64MediaForCloud(json) {
	const serialized = JSON.stringify(json ?? {});
	if (/data:image\/[a-z0-9.+-]+;base64,/i.test(serialized)) {
		throw new Error(
			"Base64 images must be uploaded to encrypted Firebase Storage before Firebase artifact sync.",
		);
	}
}

function collectLocalAssetRefs(artifact) {
	const refs = new Set();
	const text = JSON.stringify(artifact || {});
	const matcher = /ourstuff-asset:([a-z0-9_.:-]+)/gi;
	let match = matcher.exec(text);
	while (match) {
		refs.add(match[1]);
		match = matcher.exec(text);
	}
	return Array.from(refs);
}

function firestoreDocId(value, fallback) {
	return (
		String(value || fallback || "doc")
			.replace(/\//g, "_")
			.slice(0, 512) || "doc"
	);
}

function jsonSafe(value) {
	return JSON.parse(JSON.stringify(value ?? null));
}

function uniqueStrings(values) {
	return Array.from(
		new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
	);
}

function numberOrFallback(value, fallback) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function normalizeSyncTimestampFromFirestore(value) {
	if (value?.toDate) return value.toDate().toISOString();
	if (typeof value?.seconds === "number")
		return new Date(value.seconds * 1000).toISOString();
	return normalizeSyncTimestamp(value);
}

export function estimateJsonBytes(json) {
	return new TextEncoder().encode(JSON.stringify(json ?? null)).byteLength;
}

function emitCloudState(patch) {
	cloudState = {
		...cloudState,
		...patch,
		entitlement: {
			...INACTIVE_ENTITLEMENT,
			...(cloudState.entitlement || {}),
			...(patch.entitlement || {}),
		},
	};
	listeners.forEach((listener) => {
		listener(getCloudAccountState());
	});
}

async function handleFirebaseAuthChange(user) {
	currentFirebaseUser = user || null;
	if (!user) {
		emitCloudState(signedOutState("Local use is active on this device."));
		return;
	}

	emitCloudState({
		ready: true,
		busy: true,
		mode: "signed-in",
		user: firebaseUserProfile(user),
		firebaseAvailable: true,
		isLocalDemo: false,
		lastCloudSyncAt: loadLastCloudSyncAt(user.uid),
		message: "Checking Cloud subscription...",
		error: "",
	});

	const bootstrap = await bootstrapUser(user);
	const tokenResult = await user.getIdTokenResult(true).catch(() => null);
	const claims = tokenResult?.claims || {};
	const profile = await readUserProfile(user.uid).catch(() => null);
	const entitlement = resolveEntitlement({ claims, profile, bootstrap });

	emitCloudState({
		ready: true,
		busy: false,
		mode: "signed-in",
		user: firebaseUserProfile(user),
		claims,
		profile,
		entitlement,
		firebaseAvailable: true,
		isLocalDemo: false,
		billingCapable: Boolean(entitlement.cloud && !entitlement.admin),
		lastCloudSyncAt: loadLastCloudSyncAt(user.uid),
		message: entitlement.cloud ? "Cloud sync active." : "Cloud sync inactive.",
		error: bootstrap?.error || "",
	});
}

async function bootstrapUser(user) {
	try {
		const idToken = await user.getIdToken();
		const response = await fetch(`${PAYMENTS_WORKER_URL}/api/bootstrap-user`, {
			method: "POST",
			headers: { authorization: `Bearer ${idToken}` },
		});
		const result = await response.json().catch(() => ({}));
		if (!response.ok) {
			return {
				error: result?.error?.message || "Subscription bootstrap failed.",
			};
		}
		return result;
	} catch (error) {
		return { error: errorMessage(error) };
	}
}

async function readUserProfile(uid) {
	const modules = await ensureFirebase();
	const snapshot = await modules.getDoc(modules.doc(firebaseDb, "users", uid));
	return snapshot.exists() ? snapshot.data() : null;
}

function resolveEntitlement({ claims = {}, profile = null, bootstrap = null }) {
	const source = bootstrap?.cloud !== undefined ? bootstrap : profile || claims;
	const admin =
		claims.admin === true ||
		profile?.admin === true ||
		bootstrap?.admin === true;
	const cloud =
		admin ||
		claims.cloud === true ||
		profile?.cloud === true ||
		bootstrap?.cloud === true;
	return {
		role: admin ? "admin" : String(source?.role || "member"),
		admin,
		cloud,
		subscriptionStatus: String(
			source?.subscriptionStatus || (cloud ? "active" : "inactive"),
		),
		plan: source?.plan || (cloud ? "cloud" : null),
	};
}

function localDemoState(user, message) {
	const entitlement = {
		role: "member",
		cloud: true,
		admin: false,
		subscriptionStatus: "active",
		plan: "cloud",
	};
	return {
		ready: true,
		busy: false,
		mode: "signed-in",
		user,
		claims: { cloud: true, admin: false, role: "member" },
		profile: entitlement,
		entitlement,
		firebaseAvailable: false,
		isLocalDemo: true,
		localDemoAvailable: true,
		billingCapable: false,
		message,
		error: "",
		lastCloudSyncAt: loadLastCloudSyncAt(user?.uid),
	};
}

function signedOutState(message = "") {
	currentFirebaseUser = null;
	return {
		ready: true,
		busy: false,
		mode: "signed-out",
		user: null,
		claims: {},
		profile: null,
		entitlement: { ...INACTIVE_ENTITLEMENT },
		isLocalDemo: false,
		localDemoAvailable: isLocalDemoHost(),
		billingCapable: false,
		message,
		error: "",
	};
}

async function ensureFirebase() {
	if (firebaseModules && firebaseAuth && firebaseDb) return firebaseModules;
	if (!firebaseModulesPromise) {
		firebaseModulesPromise = Promise.all([
			import(
				`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
			),
			import(
				`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`
			),
			import(
				`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore-lite.js`
			),
		]).then(([appModule, authModule, firestoreModule]) => ({
			...appModule,
			...authModule,
			...firestoreModule,
		}));
	}

	firebaseModules = await firebaseModulesPromise;
	const firebaseApp = firebaseModules.getApps().length
		? firebaseModules.getApps()[0]
		: firebaseModules.initializeApp(FIREBASE_CONFIG);
	firebaseAuth = firebaseModules.getAuth(firebaseApp);
	firebaseDb = firebaseModules.getFirestore(firebaseApp);
	emitCloudState({ firebaseAvailable: true });
	return firebaseModules;
}

function requireSignedInFirebaseUser() {
	if (!currentFirebaseUser) {
		throw new Error("Sign in before using Cloud.");
	}
	return currentFirebaseUser;
}

function requireCloudEntitlement() {
	if (!cloudState.entitlement?.cloud && !cloudState.entitlement?.admin) {
		throw new Error("Cloud sync requires an active subscription.");
	}
}

function firebaseUserProfile(user) {
	return {
		uid: user.uid,
		email: user.email || "",
		displayName: user.displayName || user.email || "Signed in",
	};
}

function getDeviceId() {
	try {
		const existing = window.localStorage.getItem(DEVICE_ID_KEY);
		if (existing) return existing;
		const next = `device-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
		window.localStorage.setItem(DEVICE_ID_KEY, next);
		return next;
	} catch {
		return "device-unavailable";
	}
}

function currentCloudUserUid() {
	try {
		return cloudState?.user?.uid || "";
	} catch {
		return "";
	}
}

function lastCloudSyncStorageKey(uid = "") {
	const normalized = String(uid || "").trim();
	return normalized ? `${LAST_SYNC_KEY}:${normalized}` : LAST_SYNC_KEY;
}

function loadLastCloudSyncAt(uid = "") {
	try {
		const normalized = String(uid || "").trim();
		if (normalized)
			return window.localStorage.getItem(lastCloudSyncStorageKey(normalized)) || "";
		return window.localStorage.getItem(LAST_SYNC_KEY) || "";
	} catch {
		return "";
	}
}

function saveLastCloudSyncAt(value, uid = "") {
	try {
		window.localStorage.setItem(
			lastCloudSyncStorageKey(uid || currentCloudUserUid()),
			value,
		);
	} catch {
		// Sync still succeeds if the convenience timestamp cannot be persisted.
	}
}

function normalizeSyncTimestamp(value) {
	const time = Date.parse(value || "");
	return Number.isNaN(time)
		? new Date().toISOString()
		: new Date(time).toISOString();
}

function isLocalDemoHost() {
	const host = window.location.hostname;
	return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function loadLocalDemoProfile() {
	try {
		const response = await fetch(LOCAL_CLOUD_DEMO_CONFIG_URL, {
			cache: "no-store",
		});
		if (!response.ok) return {};
		const parsed = await response.json();
		return {
			email: typeof parsed.email === "string" ? parsed.email.trim() : "",
			displayName:
				typeof parsed.displayName === "string" ? parsed.displayName.trim() : "",
		};
	} catch {
		return {};
	}
}

function loadLocalDemoSession() {
	try {
		const parsed = JSON.parse(
			window.localStorage.getItem(LOCAL_DEMO_SESSION_KEY) || "null",
		);
		return parsed?.user ? parsed : null;
	} catch {
		return null;
	}
}

function saveLocalDemoSession(user) {
	window.localStorage.setItem(
		LOCAL_DEMO_SESSION_KEY,
		JSON.stringify({
			user,
			signedInAt: new Date().toISOString(),
		}),
	);
}

function clearLocalDemoSession() {
	try {
		window.localStorage.removeItem(LOCAL_DEMO_SESSION_KEY);
	} catch {
		// Local sign-out should continue even if storage is blocked.
	}
}

function currentReturnUrl() {
	return `${window.location.origin}${window.location.pathname}`;
}

function errorMessage(error) {
	return error instanceof Error ? error.message : "Cloud action failed.";
}
