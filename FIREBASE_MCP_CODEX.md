# Firebase MCP for Codex

## Purpose

Use Firebase MCP to configure and inspect Firebase services for ourstuff.space apps.

Firebase is responsible for:

- Shared identity across ourstuff.space apps.
- Google sign-in.
- Email/password sign-in.
- Optional email-link sign-in.
- Firestore user/profile documents.
- Firestore per-app artifact collections written by signed-in Cloud users.
- Firestore Security Rules.
- Custom-claim based access control.

Do not store personal account identifiers, raw user PII, service-account private keys, Firebase ID tokens, or secrets in repo docs.

## MCP Configuration

Codex should use a Firebase MCP server configured with stdio transport:

```toml
[mcp_servers.firebase]
command = "npx"
args = ["-y", "firebase-tools@latest", "mcp"]
```

Add again if needed:

```powershell
codex mcp add firebase -- npx -y firebase-tools@latest mcp
```

Remove if needed:

```powershell
codex mcp remove firebase
```

Verify:

```powershell
codex mcp list
codex mcp get firebase
npx -y firebase-tools@latest login:list
npx -y firebase-tools@latest projects:list
```

## Use In Codex

Start a new Codex thread or restart Codex after adding the MCP server.

Useful requests:

```text
Use Firebase MCP to list Firebase projects.
Use Firebase MCP to inspect the selected Firebase project.
Use Firebase MCP to inspect Authentication providers.
Use Firebase MCP to inspect Firestore rules.
Use Firebase MCP to inspect Firestore indexes.
Use Firebase MCP to confirm the Web App config.
```

If the workspace contains `firebase.json`, Firebase MCP may detect project context. If not, ask Codex to select the correct Firebase project through Firebase MCP before editing Firebase config.

## Firebase Setup Checklist

Codex must keep the setup simple and secure.

### 1. Project

- [ ] Select the shared Firebase project for ourstuff.space apps.
- [ ] Confirm project ID.
- [ ] Confirm the Web App exists.
- [ ] Confirm the app domain(s) are authorized for Firebase Auth.
- [ ] Add localhost dev origins only where needed.
- [ ] Do not commit project owner identities or account emails.

### 2. Authentication

Enable only these providers unless the user asks for more:

- [ ] Google
- [ ] Email/password
- [ ] Email link, only if the app is ready to handle email action links

Behavior:

- Local-only users do not need Auth.
- Sign-in appears from Link Settings or Settings.
- A signed-in user is not automatically premium.
- A signed-in non-premium user may exist, but cannot sync cloud data.
- Cloud sync requires custom claim `cloud=true` or `admin=true`.
- Owner/admin access should be configured with backend-only env/secrets, preferably by UID.

### 3. Firestore

Use Firestore for the frontend-readable cloud app data:

```text
/users/{uid}
/users/{uid}/apps/{appId}
/users/{uid}/apps/{appId}/artifacts/{artifactId}
```

Create Firestore in production mode or deploy locked rules immediately.

Do not use Firestore as the Stripe source of truth. Stripe events flow into Cloudflare D1 first, then the Worker writes a minimal entitlement copy into Firestore.

Do not store app data as one full JSON document. The parent app doc is metadata only, and the app data is split into artifact-shaped docs under the `artifacts` subcollection. Stripe and subscription truth still stay in D1.

### 4. Custom Claims

Custom claims are the access-control source for Firestore rules.

Required claims:

```json
{
  "cloud": true,
  "admin": false,
  "role": "member"
}
```

Owner/admin claims:

```json
{
  "cloud": true,
  "admin": true,
  "role": "admin"
}
```

Signed-in but non-premium user claims:

```json
{
  "cloud": false,
  "admin": false,
  "role": "member"
}
```

Rules:

- Frontend must never set custom claims.
- Worker/backend sets custom claims after verifying identity and entitlement.
- Firestore app-data rules may use the backend-written `/users/{uid}` entitlement copy as a fallback when custom claims have not propagated, because frontend clients cannot write that profile document.
- Prefer `OWNER_UIDS` in backend env/secrets for owner bootstrap.
- If `OWNER_EMAILS` is used, it must be server-only and must require `email_verified === true`.
- Do not commit owner identifiers to repo files.

## Recommended Frontend Files

Adapt paths to the repo structure.

```text
assets/js/config.js
assets/js/firebase.js
assets/js/auth.js
assets/js/cloudSync.js
```

Responsibilities:

### config.js

```js
export const APP_ID = "<APP_ID>";
export const PAYMENTS_WORKER_URL = "<PAYMENTS_WORKER_URL>";
export const MAX_FIRESTORE_APPSTATE_BYTES = 900000;
```

Only public config goes in frontend files.

### firebase.js

- Initialize Firebase app.
- Export `auth`.
- Export `db`.
- Do not include service-account secrets.

### auth.js

- Auth state listener.
- Google sign-in.
- Email/password sign-in.
- Optional email-link sign-in.
- Sign out.
- ID token retrieval.
- Bootstrap call to Worker.
- Username/display-name helper.

Display helper:

```js
export function getDisplayUsername(user) {
  return user?.displayName || user?.email || user?.uid || "Signed in";
}
```

PII note:

- It is acceptable to show the current user's own email in their own UI.
- Do not write raw email into repo docs.
- Avoid writing raw email to Firestore unless a clear need exists.
- Do not log email, ID token, or provider payloads.

### cloudSync.js

- `exportAppStateJson()` integration.
- `importAppStateJson(json)` integration.
- `estimateJsonBytes(json)`.
- `saveCloudState()`.
- `loadCloudState()`.
- `syncOnLogin()`.
- `syncNow()`.

## Firestore Database Structure

Use the smallest cross-app shape.

### User profile / entitlement copy

Path:

```text
/users/{uid}
```

Recommended fields:

```json
{
  "role": "member",
  "cloud": false,
  "admin": false,
  "subscriptionStatus": "inactive",
  "plan": null,
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

For premium:

```json
{
  "role": "member",
  "cloud": true,
  "admin": false,
  "subscriptionStatus": "active",
  "plan": "cloud",
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

For admin:

```json
{
  "role": "admin",
  "cloud": true,
  "admin": true,
  "subscriptionStatus": "owner",
  "plan": "owner",
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

Keep Stripe customer/subscription IDs in D1 unless the frontend has a specific need. If copied to Firestore, they must be readable only by the owner user and admins.

### App cloud artifact collection

Path:

```text
/users/{uid}/apps/{appId}
/users/{uid}/apps/{appId}/artifacts/{artifactId}
```

Parent app metadata shape:

```json
{
  "appId": "<APP_ID>",
  "version": 2,
  "storage": "firestore-artifacts",
  "collection": "artifacts",
  "deleted": false,
  "updatedAt": "2026-05-23T00:00:00.000Z",
  "deviceId": "local-device-id",
  "jsonBytes": 12345,
  "docCount": 42
}
```

Rules:

- App artifacts live under the `artifacts` subcollection.
- Each artifact doc has `id`, `type`, `title`, `owner`, `acl`, `visibility`, `tags`, `status`, `createdAt`, `updatedAt`, `refs`, `data`, and `extraAttributes`.
- Existing local artifacts round-trip through `data.ourstuff.artifact`.
- App settings round-trip through `app_state` docs.
- Importing JSON while Cloud is active deletes the existing artifact docs first, then writes the imported structure.
- Use `MAX_FIRESTORE_APPSTATE_BYTES = 900000` as the conservative per-document guard. If individual assets exceed it, move those blobs to Firebase Storage.

## Firestore Security Rules

Use this rule shape:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn() && request.auth.token.admin == true;
    }

    function isCloudUser() {
      return signedIn() && request.auth.token.cloud == true;
    }

    function isSelf(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    match /users/{uid} {
      allow read: if isAdmin() || isSelf(uid);
      allow create, update, delete: if isAdmin();
    }

    match /users/{uid}/apps/{appId} {
      allow read, write: if isAdmin() || (isSelf(uid) && isCloudUser());
    }

    match /users/{uid}/apps/{appId}/artifacts/{artifactId} {
      allow read: if isAdmin() || (isSelf(uid) && isCloudUser());
      allow create, update: if isAdmin()
        || (isSelf(uid) && isCloudUser()
          && request.resource.data.owner == uid
          && request.auth.uid in request.resource.data.acl.owners);
      allow delete: if isAdmin() || (isSelf(uid) && isCloudUser());
    }
  }
}
```

Notes:

- Backend writes `/users/{uid}`.
- Frontend writes only `/users/{uid}/apps/{appId}` and that app's `artifacts` subcollection.
- Non-cloud signed-in users cannot sync.
- Signed-out users cannot access cloud docs.
- Users cannot access other users' docs.

## Sign-In UI Requirements

Place Cloud/account controls inside Link Settings or Settings.

Signed out:

```text
Cloud
Local use is free. Cloud sync requires a subscription.
[Sign in / Upgrade]
```

Signed in, no cloud:

```text
Cloud
Signed in as {username}
Cloud sync inactive
[Subscribe]
[Sign out]
```

Signed in, cloud member:

```text
Cloud
Signed in as {username}
Cloud sync active
[Sync now]
[Manage Billing]
[Sign out]
```

Signed in, admin:

```text
Cloud
Signed in as {username}
Admin / Cloud enabled
[Sync now]
[Sign out]
```

Sign-out rules:

- Sign out of Firebase.
- Stop cloud sync.
- Keep local data intact.
- Do not erase local state.

## Auth Flow

```text
User opens Settings
↓
Clicks Sign in / Upgrade
↓
Chooses Google, email/password, or email link
↓
Firebase sign-in completes
↓
Frontend gets Firebase ID token
↓
Frontend calls Worker /api/bootstrap-user
↓
Worker verifies token, computes entitlement, writes Firebase profile, sets custom claims
↓
Frontend force-refreshes ID token
↓
Frontend reads claims and /users/{uid}
↓
If cloud/admin: allow sync
↓
If not cloud: show Subscribe
```

## Cloud Sync Flow

```text
saveCloudState()
↓
Require signed-in user
↓
Require cloud/admin claim
↓
Export full app JSON
↓
Convert export into artifact docs
↓
Block any oversized artifact doc
↓
Write /users/{uid}/apps/{appId} metadata
↓
Wipe and rewrite /users/{uid}/apps/{appId}/artifacts/*
↓
```

```text
loadCloudState()
↓
Require signed-in user
↓
Require cloud/admin claim
↓
/users/{uid}/apps/{appId}/artifacts/*
↓
Rebuild the normal JSON export shape
↓
Import json into local app state
```

First sign-in rule:

```text
User signs in on a device
↓
Frontend checks /users/{uid}/apps/{appId} and its artifacts collection
↓
If Firebase has existing cloud data and this browser has no stored local data, import it
↓
If this browser already has local data, auto sync uploads this device instead of downloading over local changes
```

## Firebase MCP Task Prompts

Use these as needed:

```text
Use Firebase MCP to inspect the active Firebase project and summarize enabled products.
Use Firebase MCP to inspect Authentication providers and tell me whether Google and email/password are enabled.
Use Firebase MCP to inspect Firestore rules and compare them to FIREBASE_MCP_CODEX.md.
Use Firebase MCP to help create firebase.json and firestore.rules for this repo if missing.
Use Firebase MCP to confirm the Web App config fields needed by the frontend.
```

## Security And PII Rules

- Do not commit raw emails, owner identifiers, account usernames, or private keys.
- Do not store Stripe secrets in Firebase client config.
- Do not log Firebase ID tokens.
- Do not log raw provider payloads.
- Do not let frontend write entitlement fields.
- Do not use Firestore profile fields as security authority; use custom claims.
- Keep raw billing/customer details inside Stripe and private D1 records.
- Store only minimal frontend-readable entitlement fields in Firestore.

## Official Reference Links

- Firebase MCP server: https://firebase.google.com/docs/ai-assistance/mcp-server
- Firebase Auth custom claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Firebase Google sign-in for Web: https://firebase.google.com/docs/auth/web/google-signin
- Firebase password auth for Web: https://firebase.google.com/docs/auth/web/password-auth
- Firebase email-link auth for Web: https://firebase.google.com/docs/auth/web/email-link-auth
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Firestore quotas and limits: https://firebase.google.com/docs/firestore/quotas
