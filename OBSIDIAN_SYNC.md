# Obsidian Compendium Sync

This is the v1 bridge between Ourstuff Mind compendiums and Obsidian.

## Shape

- Plugin id: `ourstuff-obsidian-sync`
- App UI: Settings > Data Controls > Obsidian Sync
- Worker source: `C:\Codex\stripe-worker-api`
- Public sync endpoint: `https://api.ourstuff.space`
- Static plugin source: `obsidian-plugin`
- Vault root: `Ourstuff/Compendiums`

Vault layout:

```text
Ourstuff/Compendiums/<compendium title> [<compendiumId>]/_index.md
Ourstuff/Compendiums/<compendium title> [<compendiumId>]/NN - <section title> [<sectionId>].md
Ourstuff/Compendiums/_Conflicts/...
Ourstuff/Compendiums/.ourstuff-sync/manifest.json
Ourstuff/Compendiums/.ourstuff-sync/plugin.log
```

Compendiums are folders. Sections are Markdown files. Stable IDs live in frontmatter and in the bracketed file or folder suffix, so title edits and safe renames do not break identity.

## Filename Safety

The plugin normalizes generated path parts for Windows and common cross-platform issues:

- strips combining marks after Unicode normalization
- replaces `< > : " / \ | ? *` and control characters
- collapses repeated whitespace
- trims trailing dots and spaces
- avoids reserved Windows device names such as `CON`, `PRN`, `AUX`, `NUL`, `COM1`, and `LPT1`
- truncates long path parts before appending the stable ID suffix
- de-duplicates same-name section files within the compendium folder

## Worker API

Firebase-token key management endpoints:

- `GET /api/obsidian/key`: active key metadata only
- `POST /api/obsidian/key`: create or rotate one active key and return the raw key once
- `DELETE /api/obsidian/key`: revoke the active key

Plugin endpoints:

- `GET /api/obsidian/compendiums`
- `GET /api/obsidian/compendiums/status`: lightweight revision, count, and timestamp check for passive sync
- `POST /api/obsidian/compendiums/sync`

The raw key format is `ost_live_<prefix>_<secret>`. D1 stores only UID hash, prefix, key hash, scope, status, and safe timestamps/events. Raw keys, Firebase ID tokens, and note bodies must not be logged.

## Sync Rules

- V1 syncs Mind compendiums and sections only.
- Pull reads the current Firestore artifact collection for `ourstuff-main`.
- Push sends only changed local files with their manifest `baseHash`.
- If local and remote both changed, the backend resolves the conflict so all clients converge: the artifact with the newest `edited` timestamp stays as the main page, and the losing version becomes a visible conflict page. If timestamps tie or are invalid, the current dashboard/server version stays main.
- If 5 or more conflicts arrive in one sync, the backend stops that batch and creates one visible `Sync Conflict Review Needed` page instead of creating many conflict copies.
- If a previously synced local file is missing and the remote hash still matches the manifest, the plugin sends a delete.
- If a previously synced local file is missing but the remote changed, the plugin creates a conflict instead of deleting.
- Section ordering is inferred from the `NN -` file prefixes and only changes remote `childIds` through the same hash-checked sync route.
- Passive sync is quiet by default: local compendium Markdown edits are debounced, remote checks use the status endpoint, and full sync runs only when a local change or remote revision change is detected.

## Checks

The Obsidian runtime entrypoint is a single generated `main.js`, matching the shape of known-good local plugins. The plugin uses Obsidian's `requestUrl` helper and calls `https://api.ourstuff.space`; Stripe, D1, subscription checks, and entitlement decisions stay inside the backend Worker. Edit `obsidian-plugin/main-source.cjs` and `obsidian-plugin/sync-core.cjs`, then build:

```powershell
cd .\obsidian-plugin
npm run build
npm run check
npm test
```

The plugin writes a JSONL diagnostic log at `Ourstuff/Compendiums/.ourstuff-sync/plugin.log` on load, pull, sync, API failure, and conflict handling. It redacts API keys, bearer tokens, note bodies, and long private values.

```powershell
.\scripts\check-obsidian-sync.ps1
```

Install or dry-run install through the shared utility belt:

```powershell
.\scripts\install-obsidian-plugin.ps1 -VaultPath "C:\Path\To\Vault" -WhatIf
.\scripts\install-obsidian-plugin.ps1 -VaultPath "C:\Path\To\Vault"
```

Live API smoke after creating a key in Settings:

```powershell
$env:OURSTUFF_OBSIDIAN_API_KEY = "<paste key locally>"
.\scripts\obsidian-sync-smoke.ps1
Remove-Item Env:\OURSTUFF_OBSIDIAN_API_KEY
```

The smoke report stores only counts, revision, server time, and API base. It does not write the key or note content.
