import {
  APP_ID,
  FIREBASE_CONFIG,
  FIREBASE_SDK_VERSION,
  LOCAL_CLOUD_DEMO_CONFIG_URL,
  MAX_FIRESTORE_APPSTATE_BYTES,
  PAYMENTS_WORKER_URL,
  SITE_ID
} from "./config.js";

const DEVICE_ID_KEY = "ourstuff.cloudDeviceId.v1";
const LAST_SYNC_KEY = "ourstuff.lastCloudSyncAt.v1";
const LOCAL_DEMO_SESSION_KEY = "ourstuff.localCloudDemoSession.v1";
const LOCAL_DEMO_STATE_KEY = "ourstuff.localCloudDemoState.v1";

const INACTIVE_ENTITLEMENT = {
  role: "member",
  cloud: false,
  admin: false,
  subscriptionStatus: "inactive",
  plan: null
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
  lastCloudSyncAt: loadLastCloudSyncAt(),
  message: "",
  error: "",
  isLocalDemo: false,
  localDemoAvailable: isLocalDemoHost(),
  firebaseAvailable: false,
  billingCapable: false
};

export function getCloudAccountState() {
  return {
    ...cloudState,
    user: cloudState.user ? { ...cloudState.user } : null,
    entitlement: { ...cloudState.entitlement }
  };
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
    emitCloudState(localDemoState(demoSession.user, "Subscribed local session restored."));
    return getCloudAccountState();
  }

  try {
    await ensureFirebase();
    if (authUnsubscribe) authUnsubscribe();
    authUnsubscribe = firebaseModules.onAuthStateChanged(firebaseAuth, (user) => {
      void handleFirebaseAuthChange(user);
    });
  } catch (error) {
    emitCloudState({
      ready: true,
      mode: "signed-out",
      firebaseAvailable: false,
      message: "Cloud sign-in is unavailable right now.",
      error: errorMessage(error)
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
  emitCloudState({ busy: true, message: "Opening Google sign-in...", error: "" });
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
    error: ""
  });

  if (options.create) {
    await modules.createUserWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
  } else {
    await modules.signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
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
    displayName: profile.displayName || "Subscribed local user"
  };
  saveLocalDemoSession(user);
  emitCloudState(localDemoState(user, "Subscribed local session active."));
  return getCloudAccountState();
}

export async function signOutCloud() {
  if (cloudState.isLocalDemo) {
    clearLocalDemoSession();
    emitCloudState(signedOutState("Signed out. Local data is still on this device."));
    return getCloudAccountState();
  }

  if (firebaseAuth) {
    emitCloudState({ busy: true, message: "Signing out...", error: "" });
    await firebaseModules.signOut(firebaseAuth);
  } else {
    emitCloudState(signedOutState("Signed out. Local data is still on this device."));
  }
  return getCloudAccountState();
}

export async function startCloudSubscription(returnUrl = currentReturnUrl()) {
  if (cloudState.isLocalDemo) {
    emitCloudState({ message: "Local subscribed demo already has Cloud enabled.", error: "" });
    return getCloudAccountState();
  }

  const user = requireSignedInFirebaseUser();
  const idToken = await user.getIdToken();
  emitCloudState({ busy: true, message: "Opening subscription checkout...", error: "" });
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/subscriptions/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      site: SITE_ID,
      appId: APP_ID,
      returnUrl
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    emitCloudState({ busy: false, error: result?.error?.message || "Subscription checkout failed." });
    throw new Error(result?.error?.message || "Subscription checkout failed.");
  }
  if (result.url) {
    window.location.assign(result.url);
  }
  emitCloudState({ busy: false, message: "Subscription checkout opened.", error: "" });
  return result;
}

export async function openBillingPortal(returnUrl = currentReturnUrl()) {
  if (cloudState.isLocalDemo) {
    emitCloudState({ message: "Billing is not needed for the local subscribed demo.", error: "" });
    return getCloudAccountState();
  }

  const user = requireSignedInFirebaseUser();
  const idToken = await user.getIdToken();
  emitCloudState({ busy: true, message: "Opening billing portal...", error: "" });
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/subscriptions/portal`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ returnUrl })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    emitCloudState({ busy: false, error: result?.error?.message || "Billing portal failed." });
    throw new Error(result?.error?.message || "Billing portal failed.");
  }
  if (result.url) {
    window.location.assign(result.url);
  }
  emitCloudState({ busy: false, message: "Billing portal opened.", error: "" });
  return result;
}

export async function saveCloudStateJson(json) {
  requireCloudEntitlement();
  const jsonBytes = estimateJsonBytes(json);
  if (jsonBytes > MAX_FIRESTORE_APPSTATE_BYTES) {
    throw new Error(`Cloud sync is limited to ${MAX_FIRESTORE_APPSTATE_BYTES} bytes for now.`);
  }

  if (cloudState.isLocalDemo) {
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(LOCAL_DEMO_STATE_KEY, JSON.stringify({
      appId: APP_ID,
      version: 1,
      updatedAt: savedAt,
      deviceId: getDeviceId(),
      jsonBytes,
      json
    }));
    saveLastCloudSyncAt(savedAt);
    emitCloudState({ lastCloudSyncAt: savedAt, message: "Local demo cloud state saved.", error: "" });
    return { updatedAt: savedAt, jsonBytes };
  }

  const user = requireSignedInFirebaseUser();
  const savedAt = new Date().toISOString();
  const idToken = await user.getIdToken();
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/cloud/apps/${encodeURIComponent(APP_ID)}/state`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      deviceId: getDeviceId(),
      json
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || "Cloud state save failed.");
  }
  const syncedAt = normalizeSyncTimestamp(result?.updatedAt || savedAt);
  saveLastCloudSyncAt(syncedAt);
  emitCloudState({ lastCloudSyncAt: syncedAt, message: "Cloud state saved.", error: "" });
  return { ...result, updatedAt: syncedAt, jsonBytes };
}

export async function loadCloudStateJson() {
  requireCloudEntitlement();

  if (cloudState.isLocalDemo) {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_DEMO_STATE_KEY) || "null");
    if (!parsed?.json) {
      throw new Error("No local demo cloud state has been saved yet.");
    }
    emitCloudState({ message: "Local demo cloud state loaded.", error: "" });
    return parsed.json;
  }

  const user = requireSignedInFirebaseUser();
  const idToken = await user.getIdToken();
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/cloud/apps/${encodeURIComponent(APP_ID)}/state`, {
    headers: { authorization: `Bearer ${idToken}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloud state load failed.");
  }
  if (data.deleted) {
    throw new Error("Cloud state has been deleted.");
  }
  if (!data.exists) {
    throw new Error("No cloud state has been saved yet.");
  }
  if (!data?.json || data.appId !== APP_ID) {
    throw new Error("Saved cloud state is not valid for this app.");
  }
  emitCloudState({ message: "Cloud state loaded.", error: "" });
  return data.json;
}

export async function getCloudStateInfo() {
  requireCloudEntitlement();

  if (cloudState.isLocalDemo) {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_DEMO_STATE_KEY) || "null");
    return {
      appId: APP_ID,
      exists: Boolean(parsed?.json),
      deleted: false,
      deviceId: parsed?.deviceId || null,
      updatedAt: parsed?.updatedAt || "",
      jsonBytes: parsed?.jsonBytes || 0,
      json: parsed?.json || null
    };
  }

  const user = requireSignedInFirebaseUser();
  const idToken = await user.getIdToken();
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/cloud/apps/${encodeURIComponent(APP_ID)}/state`, {
    headers: { authorization: `Bearer ${idToken}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || "Cloud state check failed.");
  }
  return result;
}

export function recordCloudSyncAt(value = new Date().toISOString(), message = "Cloud state synced.") {
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
  const idToken = await user.getIdToken();
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/cloud/apps/${encodeURIComponent(APP_ID)}/state`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${idToken}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || "Cloud state delete failed.");
  }
  emitCloudState({ message: "Cloud state marked for deletion.", error: "" });
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
  const idToken = await user.getIdToken();
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/cloud/account`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${idToken}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || "Cloud account delete failed.");
  }
  emitCloudState(signedOutState("Cloud account deletion requested."));
  return result;
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
      ...(patch.entitlement || {})
    }
  };
  listeners.forEach((listener) => listener(getCloudAccountState()));
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
    message: "Checking Cloud subscription...",
    error: ""
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
    message: entitlement.cloud ? "Cloud sync active." : "Cloud sync inactive.",
    error: bootstrap?.error || ""
  });
}

async function bootstrapUser(user) {
  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`${PAYMENTS_WORKER_URL}/api/bootstrap-user`, {
      method: "POST",
      headers: { authorization: `Bearer ${idToken}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: result?.error?.message || "Subscription bootstrap failed." };
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
  const admin = claims.admin === true || profile?.admin === true || bootstrap?.admin === true;
  const cloud = admin || claims.cloud === true || profile?.cloud === true || bootstrap?.cloud === true;
  return {
    role: admin ? "admin" : String(source?.role || "member"),
    admin,
    cloud,
    subscriptionStatus: String(source?.subscriptionStatus || (cloud ? "active" : "inactive")),
    plan: source?.plan || (cloud ? "cloud" : null)
  };
}

function localDemoState(user, message) {
  const entitlement = {
    role: "member",
    cloud: true,
    admin: false,
    subscriptionStatus: "active",
    plan: "cloud"
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
    lastCloudSyncAt: loadLastCloudSyncAt()
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
    error: ""
  };
}

async function ensureFirebase() {
  if (firebaseModules && firebaseAuth && firebaseDb) return firebaseModules;
  if (!firebaseModulesPromise) {
    firebaseModulesPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ]).then(([appModule, authModule, firestoreModule]) => ({
      ...appModule,
      ...authModule,
      ...firestoreModule
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
    displayName: user.displayName || user.email || "Signed in"
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

function loadLastCloudSyncAt() {
  try {
    return window.localStorage.getItem(LAST_SYNC_KEY) || "";
  } catch {
    return "";
  }
}

function saveLastCloudSyncAt(value) {
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, value);
  } catch {
    // Sync still succeeds if the convenience timestamp cannot be persisted.
  }
}

function normalizeSyncTimestamp(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? new Date().toISOString() : new Date(time).toISOString();
}

function isLocalDemoHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function loadLocalDemoProfile() {
  try {
    const response = await fetch(LOCAL_CLOUD_DEMO_CONFIG_URL, { cache: "no-store" });
    if (!response.ok) return {};
    const parsed = await response.json();
    return {
      email: typeof parsed.email === "string" ? parsed.email.trim() : "",
      displayName: typeof parsed.displayName === "string" ? parsed.displayName.trim() : ""
    };
  } catch {
    return {};
  }
}

function loadLocalDemoSession() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_DEMO_SESSION_KEY) || "null");
    return parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}

function saveLocalDemoSession(user) {
  window.localStorage.setItem(LOCAL_DEMO_SESSION_KEY, JSON.stringify({
    user,
    signedInAt: new Date().toISOString()
  }));
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
