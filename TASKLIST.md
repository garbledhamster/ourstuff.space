# TASKLIST.md

## Cloud Subscription Implementation

### Phase 0 - Discovery

- [x] Identify app framework and build system.
- [x] Identify settings or Link Settings UI file(s).
- [x] Identify local storage module and storage key.
- [x] Identify current app state shape.
- [x] Identify whether full JSON export/import already exists.
- [x] Identify Firebase client files, if any.
- [x] Identify payment/donation files, if any.
- [x] Record findings in `OURSTUFF_CLOUD_CONTEXT.md`.

### Phase 1 - Documentation

- [x] Create or update `OURSTUFF_CLOUD_CONTEXT.md`.
- [x] Confirm `FIREBASE_MCP_CODEX.md` is current.
- [x] Confirm `OURSTUFF_PAYMENTS_DEV.md` is current.
- [x] Add current `APP_ID` to `OURSTUFF_CLOUD_CONTEXT.md`.
- [x] Add unresolved assumptions to `OURSTUFF_CLOUD_CONTEXT.md`.

### Phase 2 - Firebase Setup

- [x] Use Firebase MCP to identify/select the Firebase project.
- [x] Confirm the Web App config is available.
- [x] Confirm Authentication is enabled.
- [x] Confirm required sign-in providers are enabled.
- [x] Confirm Firestore is created.
- [x] Confirm Firestore rules match `FIREBASE_MCP_CODEX.md`.
- [x] Confirm custom-claim strategy is backend-only.

### Phase 3 - App State Contract

- [x] Define `APP_ID`.
- [x] Implement or identify `exportAppStateJson()`.
- [x] Implement or identify `importAppStateJson(json)`.
- [x] Add `estimateJsonBytes(json)`.
- [x] Add safe Firestore document-size guard.
- [x] Add local `deviceId`.
- [x] Add local `lastCloudSyncAt` metadata.
- [x] Document the app state contract.

### Phase 4 - Auth UI

- [x] Add Cloud/account section in Link Settings.
- [x] Signed-out state shows `Sign in / Upgrade`.
- [x] Signed-in state shows current username/display name.
- [x] Signed-in state shows `Sign out`.
- [x] Non-premium signed-in state shows `Subscribe`.
- [x] Premium signed-in state shows `Sync now`.
- [x] Billing-capable user sees `Manage Billing`.
- [x] Sign out keeps local data intact.

### Phase 5 - Client Firebase Integration

- [x] Add Firebase app initialization.
- [x] Add Auth initialization.
- [x] Add Firestore initialization.
- [x] Add Google sign-in.
- [x] Add email/password sign-in.
- [x] Add email-link sign-in only if needed.
- [x] Add auth state listener.
- [x] Add backend bootstrap call after sign-in.
- [x] Force-refresh ID token after bootstrap.
- [x] Read entitlement from custom claims and `/users/{uid}`.

### Phase 6 - Cloud Sync

- [x] Save full app JSON to `/users/{uid}/apps/{appId}`.
- [x] Load full app JSON from `/users/{uid}/apps/{appId}`.
- [x] Require `cloud=true` or `admin=true` before syncing.
- [x] Prevent oversized JSON writes.
- [x] Avoid destructive overwrite without confirmation.
- [x] Add manual `Sync now`.

### Phase 7 - Payments Integration

- [x] Use shared payments Worker URL from config.
- [x] Send Firebase ID token to subscription endpoints.
- [x] Start Stripe subscription checkout from Worker endpoint.
- [x] Open billing portal from Worker endpoint.
- [x] Honor cancellation-at-period-end so Cloud access remains active through the paid period.
- [x] Never call Stripe secret APIs from browser.
- [x] Never access D1 from browser.

### Phase 8 - Security Checks

- [x] Signed-out user cannot access Firestore user/app docs.
- [x] Signed-in non-cloud user cannot write cloud app state.
- [x] User cannot read/write another user's docs.
- [x] Frontend cannot write role/admin/cloud/subscription fields.
- [x] Owner/admin override is configured through backend env/secrets, with a narrow owner UID fallback in Firestore rules.
- [x] No emails or secrets are committed.
- [x] Logs do not print ID tokens, emails, checkout payloads, or service keys.

### Phase 9 - Final Verification

- [x] Local-only app works without sign-in.
- [ ] Google sign-in works.
  Blocked: OAuth popup requires an interactive browser user check.
- [ ] Email/password sign-in works.
  Blocked: Requires an interactive Firebase account credential check.
- [x] Username/display name appears when signed in.
- [x] Subscription checkout route is deployed and no longer returns `Route not found`.
  Verified: Live route now returns Firebase auth errors for unsigned/invalid tokens instead of a missing-route error.
- [ ] Subscribe flow redirects to Stripe Checkout with a valid Firebase token.
  Blocked: Requires an interactive signed-in browser check or test Firebase credentials.
- [ ] Webhook updates D1 and Firebase entitlement copy.
  Blocked: Requires a live Stripe webhook event and Worker service-account secret.
- [x] Owner premium user can save/load cloud app state.
- [ ] Billing portal works.
  Blocked: Requires a live Stripe customer for the signed-in user.
- [x] Sign out preserves local state.
- [x] `OURSTUFF_CLOUD_CONTEXT.md` is current.

### Phase 10 - D1-First Cloud State

Superseded for app data by Phase 11. D1 remains payment/subscription storage only.

- [x] Add D1 app-state source-of-truth schema in the Worker.
- [x] Add Worker save/load/delete routes for cloud app state.
- [x] Route frontend cloud save/load through the Worker instead of direct Firestore writes.
- [x] Mirror Worker-accepted D1 state into Firebase for app loading.
- [x] Add first-sign-in detection for existing cloud data.
- [x] Warn before replacing cloud data from another device.
- [x] Add app cloud-data deletion control.
- [x] Add full cloud-account deletion control.
- [x] Reset local app data after cloud-data or cloud-account deletion for clean testing.
- [x] Document D1-first app-state architecture.
- [ ] Apply `0006_app_state_source_of_truth.sql` to remote D1.
  Blocked: Requires deployment/migration command against the live Cloudflare account.
- [ ] Deploy the updated Worker.
  Blocked: Requires live deployment after migration.
- [ ] Verify first phone sign-in imports existing cloud data instead of overwriting it.
  Blocked: Requires interactive signed-in multi-device test.

### Phase 11 - Firebase Artifact Collection Sync

- [x] Replace full cloud JSON document writes with Firebase artifact collection writes.
- [x] Store parent app metadata at `/users/{uid}/apps/{appId}`.
- [x] Store actual user app data in `/users/{uid}/apps/{appId}/artifacts/{artifactId}`.
- [x] Convert local artifact JSON into artifact-shaped Firestore docs.
- [x] Split app settings into `app_state` artifact docs, including theme.
- [x] Keep JSON export in the same import/export format as the current app.
- [x] Make JSON import rebuild the Firebase artifact collection after wiping existing app artifact docs.
- [x] Prevent auto sync from downloading over existing local data.
- [x] Add debounced local-change uploads to Firebase artifacts when Cloud is active.
- [x] Deploy Firestore rules for app artifact subcollections.
- [x] Allow signed-in users to write only their own app artifact docs so claim/profile drift cannot block sync.
- [x] Switch app-data sync to Firestore Lite to avoid repeated blocked WebChannel listen requests.
- [x] Run syntax checks for touched JS modules.
- [ ] Verify signed-in browser writes the expected artifact docs.
  Blocked: Requires interactive signed-in browser test with the Cloud-enabled account.

## Obsidian Compendium Sync

### Phase 0 - Worker Contract

- [x] Add D1 schema for one active Obsidian sync key per user without storing raw keys.
- [x] Add Firebase-token key management routes under `/api/obsidian/key`.
- [x] Add Bearer-key plugin routes for compendium snapshot and hash-checked sync.
- [x] Gate key creation and key usage through active Cloud entitlement or owner/admin access.
- [x] Keep compendium content in the existing Firestore artifact collection.
- [x] Avoid logging raw API keys, Firebase ID tokens, note bodies, or private content.

### Phase 1 - App UI

- [x] Add Settings > Data Controls > Obsidian Sync controls.
- [x] Show `Create API Key` when no active key exists.
- [x] Show `Refresh API Key` and delete control when a key exists.
- [x] Keep raw key copy-only and in memory after create/refresh.
- [x] Show only safe key metadata for existing keys.
- [x] Disable creation for signed-in users without Cloud entitlement.

### Phase 2 - Obsidian Plugin

- [x] Add `obsidian-plugin` package.
- [x] Map compendiums to folders and sections to Markdown files.
- [x] Keep stable IDs in frontmatter and filenames.
- [x] Sanitize Windows-unsafe names, reserved names, trailing dots/spaces, long names, and duplicates.
- [x] Push only changed files with `baseHash`.
- [x] Preserve remote content and create conflict files when both sides changed.
- [x] Treat missing local files as deletes only when the remote hash still matches the manifest.
- [x] Infer section order from `NN -` filenames and update compendium `childIds` through the hash-checked route.
- [x] Bundle the runtime plugin as one Obsidian-loaded `main.js`.
- [x] Add a vault-local diagnostic log for plugin load, pull, sync, API failures, and conflicts.
- [x] Use Obsidian `requestUrl` and the public `api.ourstuff.space` sync endpoint instead of exposing the legacy Worker hostname in plugin settings.
- [x] Add quiet passive sync with debounced local vault edits and lightweight remote revision checks.

### Phase 3 - Verification

- [x] Run Worker typecheck.
- [x] Run frontend syntax checks.
- [x] Run Obsidian plugin syntax checks and unit tests.
- [x] Apply `0010_obsidian_sync.sql` to remote D1.
- [x] Deploy the updated Worker.
- [x] Create first live key for the owner user and copy the final active raw key to the local clipboard only.
- [x] Run live API smoke against real compendium data.
  Verified: Live route returned 2 compendiums and 6 sections, disposable create/edit/delete succeeded, and the rotated old key returned `401`.
- [x] Run plugin sync-core against a disposable fake vault.
  Verified: Live snapshot generated 9 vault files, detected a fake local section edit, and deleted the temporary vault.
- [x] Reinstall the plugin into both local vault plugin folders through the utility belt.
- [x] Smoke-load the generated plugin with a mocked Obsidian API and confirm it writes `plugin_loaded`.
- [x] Deploy and verify the passive sync status endpoint.

## Global Trashcan Lifecycle

### Phase 0 - Backend Contract

- [x] Add `trashRetentionDays` setting with default `30`.
- [x] Preserve `trashRetentionDays = 0` as immediate permanent delete behavior.
- [x] Add backend-derived UID handling for every Trash API route.
- [x] Add shared delete, restore, hard-delete, and list helpers.
- [x] Add lightweight user-scoped trash index at `/users/{uid}/trash/{trashItemId}`.
- [x] Keep original soft-deleted item in its original collection with lifecycle fields.
- [x] Add daily scheduled cleanup for expired trash items.
- [x] Add bounded storage-reference cleanup for permanent deletes.

### Phase 1 - Frontend Surface

- [x] Add `assets/js/trash.js` authenticated Trash API client.
- [x] Add Trash page with title, type, snippet, deleted date, auto-delete date, restore, and permanent delete actions.
- [x] Add Trash retention setting UI.
- [x] Add Trash link below Thanks / Donate in the sidebar.
- [x] Wire app-area delete actions for artifact-backed notes, compendiums/sections, artifacts, and PYXDIA letters through Trash.
- [x] Hide soft-deleted artifacts from active note/artifact lists, dashboard note lists, PYXDIA note references, and Life/Spirit derived surfaces.
- [x] Hide soft-deleted PYXDIA letters from Last Letter, conversations, state payloads, retry, and processing jobs.
- [x] Add index lifecycle helper for `quicknoteIndex`, `noteSearchIndex`, `pyxdiaDynamicMemoryIndex`, PYXDIA thread indexes, and static-memory source references.
- [x] Preserve linked media on soft delete/restore and use backend storage cleanup on hard delete.

### Phase 2 - Security And Validation

- [x] Add rules that let users read only their own Trash settings/index.
- [x] Block client writes to Trash settings and index so backend functions own lifecycle mutations.
- [x] Run JS syntax checks for touched modules.
- [x] Run Firebase Functions module load/export check.
- [ ] Deploy `trashApi`, `cleanupExpiredTrash`, and Firestore rules.
  Blocked: This request changed local code only; deploy should be explicit because it affects production lifecycle behavior.
- [ ] Verify live signed-in restore/permanent-delete flow.
  Blocked: Requires deployed Trash Functions and an interactive signed-in browser check.

## PYXDIA PENPAL Implementation

### Phase 0 - Frontend

- [x] Add `assets/js/pyxdia.js` API/settings helper.
- [x] Export safe Firebase ID token helper from `assets/js/cloud.js`.
- [x] Add PYXDIA sidebar group before dashboard groups.
- [x] Add Send Letter, Input Letter, Output Letter, and conversation list states.
- [x] Add local draft persistence and size limits.
- [x] Add note metadata selection without automatic note-body transfer.
- [x] Add all-notes-by-default metadata selection with search, area/role filters, selected/recent filters, bulk controls, and visible metadata budget warnings.
- [x] Render output as escaped plain text, not markdown.
- [x] Add Settings > PYXDIA with enable, delay, instructions, memory, and reset controls.

### Phase 1 - Backend

- [x] Add Firebase Functions Node 22 backend.
- [x] Add authenticated `pyxdiaApi` routes for state, draft, letters, retry, settings, and memory reset.
- [x] Add authenticated `aiApi` scrub/LLM route modes.
- [x] Add PII/secret/card blocking and basic scrub reports.
- [x] Add queued processing job model and scheduled processor with transaction-based claiming.
- [x] Add server-side OpenRouter client with deterministic no-secret fallback for testability.
- [x] Default PYXDIA provider calls to `PYXDIA_MODEL || PYXIDA_MODEL || "~openai/gpt-latest"` and keep local fallback limited to emulator/test/explicit fallback mode.
- [x] Rewrite PYXDIA prompt/fallback toward a warm balance-oriented penpal letter instead of framework exposition.
- [x] Add compact PYXDIA memory update.
- [x] Split PYXDIA context into user-selected context, static memory, and dynamic retrieval memory without adding new stores.
- [x] Add paid-AI entitlement guard for provider-backed calls.
- [x] Add coarse signed-in user rate limits for PYXDIA backend routes.

### Phase 2 - Security And Rules

- [x] Add user-scoped Firestore rules for PYXDIA settings, threads, letters, memory, and jobs.
- [x] Add backend-owned Firestore rules for PYXDIA rate-limit buckets.
- [x] Keep processing jobs and completed output backend-owned.
- [x] Keep provider keys out of frontend code.
- [x] Scrub note metadata server-side before model use and omit note bodies/raw note IDs from provider prompts.
- [x] Update `OURSTUFF_CLOUD_CONTEXT.md` and `APP_LINGO.md`.

### Phase 3 - Verification

- [x] Run JS syntax checks.
- [x] Run Firebase Functions Node syntax/export checks.
- [x] Add PYXDIA smoke coverage for model alias, metadata-only provider prompt, server-side metadata scrubbing, and non-template fallback wording.
- [x] Run local browser smoke test on desktop and mobile viewport.
- [x] Deploy Firebase Functions.
  Verified: Targeted deploy created/updated `pyxdiaApi`, `aiApi`, and `processPyxdiaJobs` in `us-central1` without deleting existing `verifyRecaptcha`.
- [x] Deploy Firestore rules.
- [x] Verify auth-required live routes reject unsigned requests.
- [x] Verify CORS allows `http://localhost:4173` and `https://ourstuff.space`.
- [ ] Configure `OPENROUTER_API_KEY` in backend secret/env for production AI replies.
  Blocked: Requires provider key setup outside frontend code. In production, missing provider config now surfaces a safe provider-not-configured failure instead of pretending a canned fallback is a model reply; emulator/test can still use the deterministic fallback.
