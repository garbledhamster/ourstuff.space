# Ourstuff Cloud Context

## Purpose

Reusable implementation context for adding the shared ourstuff.space Cloud subscription system to this app and future apps.

Do not store secrets or personal identifiers in this file.

## Current App

- App name: Ourstuff
- APP_ID: `ourstuff-main`
- SITE_ID: `ourstuff`
- Repo type: static HTML, CSS, and browser ES modules; no build step
- Local storage key: `ourstuff.artifactStore.v1`
- Settings UI file(s): `assets/js/app.js`, `assets/css/app.css`
- App state export/import file(s): `assets/js/app.js`, `assets/js/storage.js`
- Firebase client file(s): `assets/js/config.js`, `assets/js/cloud.js`, `assets/js/trash.js`
- Payment integration file(s): `assets/js/config.js`, `assets/js/cloud.js`, `assets/js/donations.js`
- Worker repo: `C:\Codex\stripe-worker-api`
- Obsidian sync source: `obsidian-plugin`, `OBSIDIAN_SYNC.md`, and Worker `/api/obsidian/*` routes

## Architecture

- Local-first app by default.
- Firebase Auth provides shared identity.
- Firestore stores frontend-readable entitlement copy and per-app artifact collections.
- The browser app imports Firestore Lite for app data reads/writes because it only needs one-shot `getDoc`, `getDocs`, `setDoc`, and batched writes; this avoids the full SDK's WebChannel listen transport that browser blockers can repeatedly block.
- Stripe handles billing.
- Cloudflare Worker handles trusted payment/backend actions.
- Cloudflare D1 stores private subscription/payment state.
- Cloudflare D1 also stores Obsidian sync key metadata and hashes; raw keys are returned once and are never stored.
- Firebase Functions owns Trash lifecycle operations that should not trust client-supplied user IDs.
- A localhost-only subscribed demo path exists for development and is disabled on production hosts.

## Public Config

- `APP_ID`: `ourstuff-main`
- `SITE_ID`: `ourstuff`
- `PAYMENTS_WORKER_URL`: `https://stripe-worker-api.jrice.workers.dev`
- `MAX_FIRESTORE_APPSTATE_BYTES`: `900000` per artifact document guard
- Firebase Web SDK config is public browser config only; no service account or private key is in frontend code.

## Firebase

- Active project: shared Ourstuff Firebase project.
- Web app config was retrieved through Firebase MCP.
- Auth providers were initialized through Firebase MCP for Google and email/password.
- Firestore rules live in `firestore.rules`.
- Firebase deploy config lives in `firebase.json` and `.firebaserc`.

## Firebase Artifact Collection Sync

Firestore is now the app data source for cloud sync. The parent app document stores metadata only; actual app data is split into artifact-shaped documents in the app's `artifacts` subcollection.

Paths:

- `/users/{uid}/apps/{appId}`: metadata, storage version, deletion marker, doc counts, byte estimate.
- `/users/{uid}/apps/{appId}/artifacts/{artifactId}`: actual artifact documents.

Artifact document shape follows the shared `artifacts` collection example:

- `id`, `type`, `title`, `owner`, `acl`, `visibility`, `tags`, `status`, `schemaVersion`.
- `createdAt`, `updatedAt`, `refs`, `data`, `extraAttributes`.
- Local app artifacts are preserved in `data.ourstuff.artifact`.
- Settings are split into `app_state` documents such as theme, dashboard identity, trackers, goals, Body, Spirit, and Life state.
- Local media metadata exports into `asset` documents. Binary media uploads to encrypted Firebase Storage when Cloud media sync is active.
- The parent app document stores `storageUsage` with Storage bytes, Firebase artifact bytes, total bytes, and the `1,000,000,000` byte limit.

Rules:

- Local changes are saved to local storage first, then debounced into Firebase artifacts when Cloud is active.
- Cloud upload and sync are blocked when Firebase Storage media plus Firestore artifact payload bytes would exceed `CLOUD_STORAGE_LIMIT_BYTES` (`1,000,000,000` bytes).
- Auto sync uploads this device's current state. It does not download over existing local data.
- First sign-in only downloads Firebase artifacts automatically when this browser has no stored local app data.
- Manual `Load cloud` is the destructive download path and asks for confirmation.
- Importing a JSON export with Cloud active rebuilds the Firebase artifact collection: delete old artifact docs, import local JSON, then write the replacement artifact docs.
- Cloud-delete actions mark the app metadata deleted, remove the artifact docs, and reset this browser.
- Firestore rules allow signed-in users to read/write only their own app metadata and artifact docs. Entitlement/profile fields remain backend/admin-written, and the frontend still gates Cloud controls through Worker/bootstrap entitlement state.

## Obsidian Compendium Sync

V1 exposes Mind compendiums and sections to an Obsidian plugin without moving the app's source-of-truth content away from the current Firestore artifact collection.

Frontend:

- `assets/js/cloud.js`: Firebase-token calls for `GET`, `POST`, and `DELETE /api/obsidian/key`, plus in-memory one-time raw key copy support.
- `assets/js/app.js`: Settings > Data Controls > Obsidian Sync controls.
- `obsidian-plugin`: Obsidian plugin package for pulling compendiums into Markdown and pushing hash-checked edits.
- `OBSIDIAN_SYNC.md`: sync contract and local smoke instructions.

Worker:

- D1 migration: `0010_obsidian_sync.sql`.
- Worker secrets: `FIREBASE_SERVICE_ACCOUNT_JSON` for Firestore server access and `OBSIDIAN_API_KEY_SECRET` for Obsidian key encryption/HMAC.
- Key management routes use Firebase ID tokens and require active Cloud entitlement or owner/admin access.
- Plugin routes use `Authorization: Bearer ost_live_...` and re-check active entitlement on every request.
- `GET /api/obsidian/compendiums` returns a compendium snapshot, revision, server time, and hashes.
- `POST /api/obsidian/compendiums/sync` applies upsert/delete changes only when the caller's `baseHash` still matches the server artifact hash.

Vault mapping:

- Compendium: `Ourstuff/Compendiums/<title> [<compendiumId>]/_index.md`
- Section: `Ourstuff/Compendiums/<title> [<compendiumId>]/NN - <section title> [<sectionId>].md`
- Conflicts: `Ourstuff/Compendiums/_Conflicts/...`
- Manifest: `Ourstuff/Compendiums/.ourstuff-sync/manifest.json`

The plugin sanitizes Windows-unsafe path characters, reserved device names, trailing dots/spaces, long names, and same-folder duplicates. Stable IDs remain in frontmatter and bracketed path suffixes so renames do not break identity.

Live verification on May 27, 2026 created an owner key, copied the final active raw key to the local clipboard only, retrieved 2 compendiums and 6 sections, ran disposable create/edit/delete through the API, confirmed the rotated old key returns `401`, and exercised the plugin sync-core against a temporary fake vault.

## Firestore Paths

- `/users/{uid}`: backend-written profile/entitlement copy.
- `/users/{uid}/apps/{appId}`: client-written app cloud metadata for cloud/admin users.
- `/users/{uid}/apps/{appId}/artifacts/{artifactId}`: client-written artifact collection for cloud/admin users.
- `/users/{uid}/settings/trash`: backend-written Trash retention setting.
- `/users/{uid}/trash/{trashItemId}`: backend-written lightweight unified Trash index.

## Required App Functions

- `exportAppStateJson()`: exports artifacts plus app-local state.
- `importAppStateJson(json)`: imports artifacts plus app-local state after confirmation.
- `saveCloudStateJson(json)`: wipes and rewrites the user's Firebase artifact collection for this app.
- `loadCloudStateJson()`: rebuilds the normal JSON export shape from Firebase artifact docs.
- `getCloudStateInfo()`: checks whether cloud data or deletion markers exist before first-device sync.
- `deleteCloudStateJson()`: deletes app artifact docs and marks the app metadata deleted.
- `deleteCloudAccount()`: requests full cloud-account deletion.
- `clearAppData({ silent: true })`: clears this browser after a cloud delete so testing can restart from a clean local app state.
- `syncCloudNow()`: manual save-this-device-to-Firebase command.
- `loadCloudIntoLocalApp()`: manual Firebase-artifacts-to-local command with destructive overwrite confirmation.
- `calculateCloudStorageUsage()`: combines encrypted Firebase Storage media bytes with Firestore artifact bytes for the Cloud settings usage display.
- `estimateCloudStateStorageUsage(json)`: estimates the exact app-counted Firestore payload bytes before sync.

## Subscription Worker Contract

Frontend calls the shared Worker only with safe intent and Firebase ID tokens:

- `POST /api/bootstrap-user`
- `POST /api/subscriptions/checkout`
- `POST /api/subscriptions/portal`

The Worker owns:

- Firebase ID token verification.
- Subscription checkout creation.
- Billing portal session creation.
- D1 subscription lookup.
- Optional Firebase custom-claim/profile sync when the service-account secret is configured.

## PYXDIA PENPAL

PYXDIA is implemented as a local-first letter workspace in the static app plus a Firebase Functions backend for signed-in AI processing.

Frontend files:

- `assets/js/pyxdia.js`: settings normalization, note metadata references, three-context normalization, letter size checks, and authenticated API calls.
- `assets/js/app.js`: sidebar group, PYXDIA view, draft/output/thread UI, Settings > PYXDIA, local demo lifecycle, all-notes-by-default metadata selector with filters/budget warnings, user-selected context, and memory display/reset controls.
- `assets/css/app.css`: PYXDIA sidebar, editor, output, conversation, and settings layout.

Local keys:

- `ourstuff.pyxdiaSettings.v1`: local UI defaults and offline settings fallback.
- `ourstuff.pyxdiaPenpal.v1`: local/dev draft, local demo letters, user-selected context, static memory, and dynamic retrieval metadata.

Backend files:

- `functions/index.js`: Firebase v2 entrypoints `pyxdiaApi`, `aiApi`, and scheduled `processPyxdiaJobs`.
- `functions/package.json`: Node 22 Functions runtime dependencies.
- The original implementation plan allowed Python for a richer scrubber, but this repo uses Node Functions so Firebase CLI discovery and deploy are stable from this workspace.

API defaults:

- `PYXDIA_API_URL`: `https://us-central1-ourstuff-firebase.cloudfunctions.net/pyxdiaApi`
- `PYXDIA_AI_API_URL`: `https://us-central1-ourstuff-firebase.cloudfunctions.net/aiApi`

Routes:

- `GET /state`
- `POST /draft`
- `POST /letters`
- `POST /letters/{letterId}/retry`
- `PATCH /settings`
- `POST /memory/reset`

Firestore paths:

- `/users/{uid}/apps/{APP_ID}/pyxdiaSettings/default`
- `/users/{uid}/apps/{APP_ID}/pyxdiaThreads/{threadId}`
- `/users/{uid}/apps/{APP_ID}/pyxdiaLetters/{letterId}`
- `/users/{uid}/apps/{APP_ID}/pyxdiaMemories/current`
- `/users/{uid}/apps/{APP_ID}/pyxdiaProcessingJobs/{jobId}`

Memory/context architecture:

- User-selected context is highest authority and travels on drafts/letters as `userSelectedContext`; it contains only user-pasted text and selected metadata references unless the user explicitly pastes body text. Note metadata starts all selected by default, can be filtered/customized, and is capped at 300 refs or 40,000 serialized metadata characters before Send is allowed.
- Static memory lives inside `/pyxdiaMemories/current` as `staticMemory`; it is a compact PII-safe profile of durable patterns with confidence, status, reasons, and source letter IDs, not raw notes, chats, or full letters.
- Dynamic retrieval memory is built by the backend per processed letter as `dynamicRetrievalMemory`; it currently uses bounded prior PYXDIA letter summaries and memory markers with retrieval reasons.
- Prompt assembly names all three systems and tells the model to prefer current user-selected context over static memory, and static memory over dynamic retrieval.

Security behavior:

- Browser code never calls an LLM provider directly and never stores provider keys.
- Full note bodies are not sent automatically; the UI sends selected note metadata plus any user-pasted context as highest-authority user-selected context.
- Provider prompts omit raw note bodies and raw note IDs. Backend prompt formatting scrubs/redacts note title/dashboard/role/date metadata before provider use.
- Static memory updates use scrubbed/minimized letter text and only keep durable-pattern candidates; dynamic retrieval stores summaries and reasons instead of full history.
- Sending requires a signed-in Cloud/Firebase user in production. Localhost can use the existing local subscribed demo path and deterministic local completion for UI testing.
- The backend blocks likely API keys, auth tokens, private keys, and valid card-number patterns instead of redacting and continuing.
- The backend rate-limits PYXDIA writes per signed-in user, claims processing jobs transactionally, skips jobs until `availableAt`, and stores rate-limit buckets in backend-owned Firestore docs.
- When `OPENROUTER_API_KEY` is configured, paid model calls require `admin` or `cloud` entitlement from Firebase claims/profile unless `PYXDIA_ALLOW_ALL_SIGNED_IN=true` is intentionally set.
- OpenRouter is used only server-side when `OPENROUTER_API_KEY` is configured. The model default is `PYXDIA_MODEL || PYXIDA_MODEL || "~openai/gpt-latest"`. Without that secret, production surfaces a safe provider-not-configured failure; emulator/test/explicit `PYXDIA_ALLOW_LOCAL_FALLBACK=true` can still use the deterministic non-provider plain-text fallback.
- Function CORS is scoped to `https://ourstuff.space`, `https://*.ourstuff.space`, `localhost`, and `127.0.0.1`.

## Trash Lifecycle

Trash is a platform-level lifecycle system for signed-in, user-owned deleted items. Current delete actions for artifact-backed notes, compendiums/sections, artifacts, and PYXDIA letters use the shared Trash API instead of local-only permanent deletion.

Frontend files:

- `assets/js/trash.js`: authenticated Trash API client, retention normalization, list normalization, shared delete, restore, and hard-delete helpers.
- `assets/js/app.js`: Trash page, retention setting UI, app-area delete integration, restore/hard-delete actions, and the sidebar link below Thanks / Donate.
- `assets/css/app.css`: Trash page/list responsive layout.

Backend files:

- `functions/index.js`: Firebase v2 entrypoints `trashApi` and scheduled `cleanupExpiredTrash`.
- `functions/package.json`: Node 22 Functions runtime dependencies.

API default:

- `TRASH_API_URL`: `https://us-central1-ourstuff-firebase.cloudfunctions.net/trashApi`

Routes:

- `GET /state` or `GET /items`
- `PATCH /settings`
- `POST /delete`
- `POST /restore`
- `POST /hard-delete`

Firestore paths:

- `/users/{uid}/settings/trash`
- `/users/{uid}/trash/{trashItemId}`
- `/users/{uid}/apps/{APP_ID}/artifacts/{artifactId}` for current artifact originals, including artifact-backed notes.
- `/users/{uid}/apps/{APP_ID}/pyxdiaLetters/{letterId}` for PYXDIA letter originals.

Lifecycle behavior:

- Default `trashRetentionDays` is `30`.
- `trashRetentionDays > 0` soft-deletes the original item, sets `deleted`, `deletedAt`, `deleteAfter`, `deletedBy`, `deleteMode`, and `originalCollection`, then creates a lightweight trash index item.
- `trashRetentionDays = 0` skips Trash and permanently deletes the original item immediately.
- Restore clears soft-delete fields on the original item and removes the trash index item.
- Hard delete removes the original item, deletes linked Firebase Storage media paths under the user's app media prefix when found, and removes the trash index item.
- `cleanupExpiredTrash` runs daily and permanently deletes trash items whose `deleteAfter` is due.
- Active note/artifact lists, PYXDIA note references, PYXDIA state, letter history, retry/job claiming, thread context, and dynamic retrieval memory filter out records with `deleted: true` or `deleteMode: "soft"`.
- Trash lifecycle mutations call `rebuildUserIndexesForItem`, which deactivates or removes matching `quicknoteIndex`, `noteSearchIndex`, and `pyxdiaDynamicMemoryIndex` entries when those index collections exist.
- Static PYXDIA memory keeps durable entries only when they still have active sources; deleted source letters are removed, source-only entries become `stale_pending_review`, and old prior-letter markers are removed from memory.

Security behavior:

- Backend functions derive `uid` from the Firebase ID token with `verifyAuth`; clients never supply a trusted UID.
- Firestore rules allow users to read only their own Trash settings and index.
- Firestore rules block client writes to `/users/{uid}/settings/{settingId}` and `/users/{uid}/trash/{trashItemId}`; writes happen through Admin SDK functions.
- The trash index stores lightweight title/snippet metadata only. Full item bodies stay in the original collection until restore or permanent deletion.

## Cancellation Policy

- Stripe remains the billing source of truth.
- If a user cancels at period end, the Worker keeps Cloud access active while the current paid period is still open.
- D1 tracks subscription status, `cancel_at_period_end`, current period timestamps, and `access_expires_at`.
- Cloud access expires after `current_period_end` unless Stripe renewal/update webhooks extend the period.
- Immediate cancellations or unpaid/incomplete states resolve to inactive access.

## Local Development

Use:

```powershell
python -m http.server 4173
```

Open:

```text
http://localhost:4173
```

For localhost testing only, `assets/js/cloud.js` may read ignored file `assets/local-cloud-dev.json` to display a subscribed demo account. That file is intentionally listed in `.gitignore` and must not be committed.

## Security Notes

- Do not store raw PII in docs.
- Do not log Firebase ID tokens.
- Do not log raw Stripe webhook bodies after verification except in secure debug environments.
- Do not let frontend write entitlement fields.
- Do not expose D1 payment/subscription state to frontend.
- Use backend-set custom claims for subscriber access control.
- The requested owner account has a narrow Firebase UID fallback in Firestore rules so owner sync works before service-account custom-claim sync is configured.
- The local subscribed demo path is host-gated to `localhost`, `127.0.0.1`, and `::1`.

## Unresolved Risks

- Live Google and email/password sign-in still require interactive browser verification.
- The subscription Worker routes are deployed, and `0005_subscription_periods.sql` is applied remotely.
- Live Stripe Checkout and Billing Portal redirects still require a real/test signed-in Firebase customer flow.
- Firebase custom-claim/profile sync for normal paid subscribers requires `FIREBASE_SERVICE_ACCOUNT_JSON` to be set as a Worker secret.
- Long-term owner override should prefer backend-only `OWNER_UIDS` or verified `OWNER_EMAILS`; the Firestore owner UID fallback is intentionally narrow and does not include an email address.
- Binary media should stay in encrypted Firebase Storage; Firestore `asset` documents should keep metadata and encrypted storage references only.
- Trash Functions and Firestore rules must be deployed before the production Trash page can perform live restore/hard-delete operations.
