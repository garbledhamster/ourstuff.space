# Ourstuff App Lingo

Use this as the shared vocabulary map for `ourstuff.space`. It is meant to help the user, Codex, and future contributors point at the same app areas without needing a long explanation every time.

Keep this file current when a major view, mode, storage key, route, or visible UI term changes. If this file disagrees with the code, the code is the source of truth and this file should be updated in the same change.

## Quick Picture

`ourstuff.space` is a static, local-first life dashboard hosted from GitHub Pages. The first screen is the home dashboard. The main four areas are:

- `Mind`: compendiums, sections, knowledge notes, ideas, questions.
- `Body`: timers, nutrition, workouts, physical notes.
- `Spirit`: reading plans, reflection notes, progress, lookup links.
- `Life`: calendar-first journal, todo list, projects, task notes, attachments.

Utility views live beside those areas:

- `Settings`: setup, thought orb editing, goal orb editing, interface and theme controls.
- `PYXDIA PENPAL`: reflective letter exchange with local drafts, signed-in backend processing, output letters, and compact memory.
- `Data Controls`: account, subscription, billing, manual cloud sync, Obsidian Sync, and local data reset controls inside Settings.
- `Gallery`: local image library for images inserted into notes.
- `Thanks / Donate`: donation modal and thanks page backed by the shared Stripe Worker.
- `Trash`: user-scoped Cloud lifecycle page for soft-deleted items before permanent removal.
- `Import / Export`: local data portability controls in the sidebar footer.

## Layout Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| App shell | The root mount where the app renders. | `index.html`, `.app-shell` |
| Workspace | The two-column app layout containing sidebar and content. | `.workspace` |
| Sidebar | Left navigation rail with dashboard groups, period slider, donation button, and footer links. | `sidebarHtml()`, `.sidebar` |
| Sidebar group | Expandable Mind, Body, Spirit, or Life section in the sidebar. | `.sidebar-group` |
| Sidebar page controls | Small previous/next controls when a sidebar group has more than five entries. | `sidebarPagedItemsHtml()` |
| Mobile menu | Phone-sized sidebar toggle and slide behavior. | `.mobile-menu-toggle`, `mobileMenuOpen` |
| Content shell | Main right-side stage where the active view appears. | `.content-shell` |
| Path bar | Breadcrumb row above content: Dashboard / Area / Item. | `pathBarHtml()`, `.path-bar` |
| Panel | Standard framed content wrapper for most views. | `panelHtml()` |
| Header | View title, subtitle, and right-side actions. | `headerHtml()` |
| Header snap | Scroll-triggered collapse that snaps page title/actions and dashboard orbs out of view, with a child-scroll handoff buffer so inner scrollers must reach an edge before the outer snap can move. | `.is-header-snapped`, `bindHeaderSnap()` |
| Action row | Horizontal button group inside headers and forms. | `.action-row` |
| Empty state | Placeholder card for views with no content yet. | `emptyStateHtml()` |

## Home Dashboard Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Home dashboard | First screen with analytics and four area cards. | `dashboardGridHtml()`, `.dashboard-home` |
| Dashboard card | Square Mind, Body, Spirit, or Life card. First click flips, second click opens. | `.dashboard-card`, `openDashboardCard()` |
| Card back | Flipped dashboard card summary with recent activity. | `dashboardCardBackHtml()` |
| Dashboard identity | User-customized area numbers, labels, and icons. | `DASHBOARD_IDENTITY_KEY` |
| Balance tabs | Draggable home dashboard tabs for Orbs, Pie, and Bar. The saved tab order decides the default tab on refresh. | `dashboardAnalyticsHtml()`, `DASHBOARD_CHART_TABS_KEY` |
| Period slider | Time range filter for dashboard analytics. The sidebar/menu board still lists saved notes and thoughts across time so older records do not look missing. | `dashboardPeriod`, `DASHBOARD_PERIOD_OPTIONS` |
| Linked hover | Card and chart segment highlight each other through `data-balance-key`. | `.is-linked-hover` |

## Shared Content Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Artifact | A persisted content object in the shared local store. | `assets/js/storage.js` |
| Artifact store | Local-first JSON database for notes, compendiums, sections, and future synced records. Deleted records stay in place until permanent deletion and are hidden from active views. | `ourstuff.artifactStore.v1` |
| Root note | A non-deleted note with no `parentId`, shown under its dashboard area. | `rootNotesForDashboard()` |
| Compendium | Mind container for structured knowledge. | `type: "compendium"` |
| Section | A child note inside a compendium. | `properties.role: "compendium-section"` |
| Obsidian Sync | Cloud-only bridge that maps compendiums to folders and sections to Markdown files. | `obsidian-plugin`, `settingsCloudHtml()`, Worker `/api/obsidian/*` |
| Reader | Read-only formatted view for notes, sections, and compendiums. | `artifactReaderHtml()`, `compendiumReaderHtml()` |
| Viewer | Any open read-only artifact state. | `artifactMode: "viewer"` |
| Editor | Title/body form for notes, sections, and compendiums. | `editorHtml()`, `dashboardNoteEditorHtml()` |
| Return context | The remembered area to return to after closing a note opened from another area. | `artifactReturnActive` |
| Markdown body | Rendered note text with headings, lists, quotes, code, links, and images. | `.markdown-body`, `assets/js/markdown.js` |
| Audit trail | Save metadata stored in artifact `analysis` so edits remain traceable. | `auditEntryForSave()` |

## Internal Utility Belt Candidates

These helpers are local to `assets/js/app.js` for now. Keep them small and portable; promote them only after a second app needs the same behavior.

| Utility | Six Hats review |
| --- | --- |
| `inferPageDisplayMode({ title, body })` | Blue: decides whether a reader page is normal, part, chapter, focus, or body-only. White: expects title/body strings and returns a mode string; it treats one non-empty body line as single-line and two or more as multiline. Yellow: keeps reader/editor display rules in one place. Green: portable to other title/body readers. Black: can feel too magical if users expect manual display-mode control. Blue: keep as a utility with this exact name. |
| `parseSingleLineContent(line)` | Blue: turns a focus-page loader line into image, YouTube, gallery, video list, quote list, or text data. White: expects one trimmed string and returns a parsed object; mixed comma lists fall back to text. Yellow: reusable for simple content-loader pages. Green: can later support more providers by adding parser branches. Black: URL edge cases and quoted CSV edge cases can outgrow a lightweight parser. Blue: keep local until more formats are needed. |
| `themedChildViewerHtml(parsed)` | Blue: renders focus-page child content inside the active theme. White: expects parsed content from `parseSingleLineContent()` and returns escaped HTML. Yellow: prevents hardcoded gallery/video/quote styling. Green: portable if future apps keep the same theme-token contract. Black: can become too broad if it starts owning interaction state. Blue: keep as a renderer utility, not a stateful component. |
| `pageNumberOverlayHtml({ current, total, label })` | Blue: provides a small page/editing position label. White: expects numeric current/total plus an optional label and returns escaped HTML. Yellow: gives readers and editors one shared page-number pattern. Green: portable to sliders, book readers, and paged editors. Black: can overlap cramped controls if parent layouts lack stable dimensions. Blue: keep simple and CSS-positioned by parent context. |
| `cameraOrUploadInputHtml(options)` | Blue: renders the single editor media entrypoint. White: expects optional class/label strings and returns one icon-only camera button. Yellow: keeps editors from drifting back to separate camera/upload controls. Green: can be reused anywhere the insertion pipeline is `openCamera()` plus `insertEditorImages()`. Black: browser camera/upload behavior differs by device, so avoid promising phone-native save/export. Blue: keep local and tied to existing media bindings. |

## Thought Orb Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Thought orb | Small icon button for quickly capturing a typed thought by area and type. It can be transferred to Goal from the orb editor. | `trackerOrbHtml()`, `transferTrackerKind()` |
| Tracker strip | Row of thought or goal orbs at the top of Mind, Body, Spirit, and Life. | `trackerStripHtml()` |
| Dashboard orb nav | Same-styled tracker strips for Thoughts and Goals inside area dashboards, plus the home dashboard Orbs tab for all active quick-access orbs. | `dashboardOrbNavHtml()`, `dashboardQuickOrbsHtml()` |
| Thought toast | Temporary quick-note popup created after pressing a thought orb. | `thoughtToastHtml()` |
| Thought note | Artifact note created from a thought orb. | `properties.role: "thought"` |
| Thought settings | Settings tab where orbs are added, edited, removed, reordered, and iconified. | `settingsThoughtsHtml()` |
| Icon picker | Searchable Iconify/IconBuddy-style picker used for orb and dashboard icons. | `iconPickerOverlayHtml()` |

Default thought orb labels:

- `Mind`: Note Making, Compendium, Idea, Question.
- `Body`: Workout, Ate Healthy, Drank Water, Sleep.
- `Spirit`: Studied, Meditated, Reflection, Prayer.
- `Life`: Family, Friends, Work, Clean.

## Goal Orb Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Goal orb | Same visual orb button as a thought orb, but it checks off progress toward a goal and exposes frequency controls. It can be transferred to Thought while preserving goal settings for later. | `trackerOrbHtml()`, `transferTrackerKind()` |
| Goal progress note | Artifact note created when a goal orb is pressed. | `properties.role: "goal-progress"` |
| Goal burst | Short confetti-style animation emitted from a pressed goal orb. | `launchGoalBurst()` |
| Goal settings | Settings tab where goal orbs are added, edited, removed, reordered, and iconified. | `settingsGoalsHtml()` |

## Mind Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Mind grid | Main compendium picker/rotator. | `mindGridHtml()` |
| Compendium tile | Button for one compendium in the Mind grid. | `.compendium-tile` |
| Compendium picker | Popover overview for jumping across compendiums. | `.compendium-picker-popover` |
| Compendium manager | View listing sections and actions for one compendium. | `compendiumManagerHtml()` |
| Section list | Ordered section rows. Numbers are displayed bottom-to-top. | `sectionListHtml()` |
| Section handle | Drag target for reordering sections. | `.section-number-handle` |
| Compendium reader | Page-like reader for a compendium cover and its sections. | `compendiumReaderHtml()` |
| Section viewer | Read-only view of a single compendium section. | `mindMode: "section-viewer"` |

## Body Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Body dashboard | Body area wrapper with tracker strip and mode switcher. | `bodyHtml()`, `.body-dashboard` |
| Body mode switcher | Tabs for Timers, Nutrition, Workout, and Notes. | `bodyModeSwitcherHtml()` |
| Timer panel | Ring timer for one active timer mode. | `bodyTimerPanelHtml()` |
| Timer modes | Fasting, Sleep, Exercise, and Cardio. | `BODY_TIMER_MODES` |
| Nutrition daily tracker | Calories/macros form plus daily note. | `bodyNutritionDailyHtml()` |
| Nutrition goals | Daily calorie and macro targets. | `bodyNutritionGoalsHtml()` |
| Workout log | Manual form that saves workout details as a Body note. | `addBodyWorkout()` |
| Body notes | Root Body notes list. | `rootNotesForDashboard("Body")` |

## Spirit Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Spirit dashboard | Reading-plan view with thought and goal orbs, plan picker, and year navigation. | `spiritHtml()` |
| Plan selector | Dropdown for choosing the active reading plan. | `select-spirit-plan` |
| Year nav | Previous/next and year buttons for reading-plan years. | `.spirit-year-nav` |
| Reading row | One work in the selected reading year. | `spiritReadingRowHtml()` |
| Book detail | Open view for one reading-plan work. | `spiritBookHtml()` |
| Lookup bar | Direct outbound lookup links for the selected work. | `spiritLookupBarHtml()` |
| Great Ideas | Work-level idea tags shown in book detail. | `work.greatIdeas` |
| Reading Focus | Inputs or outputs from the work's black-box metadata. | `work.blackBox` |
| Mark Complete | Spirit work completion toggle. The reverse label is `Mark Incomplete`. | `toggleSpiritComplete()` |
| Spirit progress | Stored completion state for plan works. | `ourstuff.spiritPlanProgress.v1` |

## Life Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Life dashboard | Calendar-first journal, orb tracker metadata, tasks, and project area. | `lifeHtml()`, `.life-dashboard` |
| Life tool switcher | Tabs for Calendar, Todo List, Projects, and Notes. | `lifeToolSwitcherHtml()` |
| Calendar viewer | Calendar tool wrapper. | `lifeCalendarPanelHtml()` |
| Calendar modes | Month, Week, Day, and List. | `lifeCalendarModeSwitcherHtml()` |
| FullCalendar month | Enhanced month calendar when FullCalendar is available. | `.life-fullcalendar` |
| Fallback month | Static month grid if FullCalendar cannot render. | `lifeMonthFallbackHtml()` |
| Life event | Calendar row/event derived from journal notes, tasks, projects, or activity. | `lifeEvents()` |
| Life journal | Date-based Life note with mood, energy, and selected thought/goal orb metadata. | `properties.role: "life-journal"` |
| Life tracker pill | Toggle-style thought or goal orb selector inside the Life journal editor. | `.life-tracker-pill` |
| Todo list | Life task board with direct todos and project tasks together. | `lifeTodoHtml()` |
| Project task | Task owned by a project phase but also surfaced in Todo. | `lifeProjectTaskItems()` |
| Shared task item | Normalized row used for both direct todos and project tasks. | `lifeTaskItems()` |
| Project | Container for phases, tasks, notes, attachments, and status. | `lifeProjectsHtml()` |
| Phase | Project workflow step that can contain tasks and attachments. | `lifeProjectDetailHtml("phase")` |
| Life attachment | IndexedDB-backed file metadata attached to projects, phases, or tasks. | `storeLocalFile()` |
| Life planner store | Local state for todos and projects. | `ourstuff.lifePlanner.v1` |

## Settings And Utility Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Settings tabs | Getting Started, Thoughts, Goals, Interface, Data Controls. | `settingsTabsHtml()` |
| Getting Started | In-app explanation of the four-area rhythm. | `settingsGettingStartedHtml()` |
| Thoughts | Thought orb management. | `settingsThoughtsHtml()` |
| Goals | Goal orb management and per-dashboard progress check counts. | `settingsGoalsHtml()` |
| Interface | Dashboard identity and theme controls. | `settingsInterfaceHtml()` |
| Data Controls | Firebase sign-in, subscription state, billing, manual sync controls, Obsidian Sync keys, and local Clear Data. | `settingsCloudHtml()`, `assets/js/cloud.js` |
| Theme catalog | App-specific named themes and font sets. | `APP_THEMES`, `THEME_FONT_SETS` |
| Theme engine | Portable helper that applies theme variables and previews. | `assets/js/themeSystem.js` |
| Colorblind mode | Global accessibility adapter layered over the selected theme. | `ourstuff.colorMode.v1`, `.theme-accessibility-colorblind` |
| Gallery | Local images inserted into markdown notes. | `galleryHtml()` |
| Local media | IndexedDB-backed images and files. Images use `ourstuff-asset:` URLs. | `assets/js/localMedia.js` |
| Trash | Global user-owned deletion lifecycle for notes, artifacts, and PYXDIA letters: retention settings, restore, permanent delete, active-view filtering, and the unified trash index. | `trashHtml()`, `assets/js/trash.js`, `trashApi` |
| Trash retention | Signed-in Cloud setting where `30` is the default soft-delete window and `0` means delete permanently immediately. | `/users/{uid}/settings/trash` |

## PYXDIA Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| PYXDIA PENPAL | Reflective AI trainer letter exchange. It is not a therapist, doctor, clinician, or replacement for care. | `pyxdiaHtml()`, `assets/js/pyxdia.js` |
| PYXDIA sidebar group | Top sidebar section with Write A Letter and the Letter Chain list. | `pyxdiaSidebarHtml()` |
| Write A Letter | Draft editor for the user's letter and user-selected context. | `pyxdiaInputHtml()` |
| Latest Reply | Plain-text reply state. Pending, processing, failed, and completed states render without markdown. | `pyxdiaOutputHtml()` |
| Letter Chain | Thread of submitted letters and replies over time, with Reply opening Write A Letter for that `threadId`. | `pyxdiaThreadHtml()` |
| Note metadata | Selected note references used as PYXDIA context: number, title, dashboard, role, edited date, and word count only. The UI starts with all non-deleted notes checked, supports filters and bulk controls, and the backend omits raw note IDs/bodies from provider prompts. | `pyxdiaNoteRefsFromArtifacts()` |
| Balance statistics | Optional PYXDIA slider that adds dashboard/activity counts and percentages to user-selected context without raw note bodies or browser-extension data. | `pyxdiaBalanceStatisticsForSettings()` |
| PYXDIA settings | Enable, delay, instruction, "what PYXDIA should know", memory, AI Brain, balance statistics, and reset controls. | `settingsPyxdiaHtml()` |
| User-selected context | Highest-authority context explicitly chosen for the current letter: pasted text, selected metadata references, and optional balance statistics. | `userSelectedContext`, `normalizePyxdiaUserSelectedContext()` |
| PYXDIA static memory | Compact visible/resettable PII-safe profile of durable patterns, not raw notes, chats, or full letters. | `pyxdiaMemory.staticMemory`, `/pyxdiaMemories/current` |
| AI Brain memory | Optional server-side PYXDIA read/write integration. Approved context is read into prompts; completed themes/statistics are written as draft memories with raw storage disabled. | `AI_BRAIN_*`, `functions/index.js` |
| PYXDIA dynamic retrieval memory | Backend-selected supporting context for a letter, stored with retrieval reasons and lower authority than user-selected context. | `dynamicRetrievalMemory`, `buildDynamicRetrievalMemory()` |
| PYXDIA backend | Firebase Node 22 Functions API that verifies Firebase ID tokens, rate-limits user requests, scrubs input, queues jobs, calls the server-side provider, and writes Firestore state. | `functions/index.js` |

## Donation Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Thanks / Donate | Sidebar primary donation action. | `.donate-sidebar` |
| Trash nav button | Square icon button beside the sidebar period slider. | `.sidebar-menu-nav-trash`, `openTrash()` |
| Donation modal | Amount entry and checkout launch. | `assets/js/donations.js` |
| Worker checkout | Server-side Stripe Checkout creation. | `https://stripe-worker-api.jrice.workers.dev` |
| Site id | Safe frontend donation identifier. | `site: "ourstuff"` |
| Thank-you page | Post-checkout status page. | `donate/thanks/index.html`, `assets/js/thanks.js` |
| Payment dev notes | Operational contract for Stripe and Worker changes. | `OURSTUFF_PAYMENTS_DEV.md` |

## Cloud Terms

| Term | Meaning | Main code |
| --- | --- | --- |
| Cloud account | Signed-in Firebase identity plus entitlement state. | `assets/js/cloud.js`, `settingsCloudHtml()` |
| Cloud entitlement | Backend-derived `cloud` or `admin` access that allows Firestore sync. | `/api/bootstrap-user`, `/users/{uid}` |
| Cloud storage usage | Combined Firebase Storage media bytes plus Firestore artifact bytes shown against the 1 GB Cloud cap. | `settingsCloudHtml()`, `calculateCloudStorageUsage()` |
| Cloud storage limit | Hard app-side upload/sync cap of `1,000,000,000` bytes. | `CLOUD_STORAGE_LIMIT_BYTES` |
| Local subscribed demo | Localhost-only development sign-in that behaves like an active Cloud subscription. | `assets/js/cloud.js`, `assets/local-cloud-dev.json` |
| Sync now | Manual newest-wins Cloud sync. Downloads when Cloud is newer; uploads when this device is newer. | `syncCloudNow()`, `syncCloudWithNewestWins()` |
| Load cloud | Manual restore of saved Cloud JSON into local app state after confirmation. | `loadCloudIntoLocalApp()`, `loadCloudStateJson()` |
| Obsidian API key | One active Cloud-gated key for the Obsidian plugin; raw value is copy-only after create/refresh. | `createOrRotateObsidianSyncKey()`, `deleteObsidianSyncKey()` |
| Subscription checkout | Firebase-token-authenticated Stripe subscription start. | `/api/subscriptions/checkout` |
| Billing portal | Firebase-token-authenticated Stripe customer portal start. | `/api/subscriptions/portal` |

## Storage Keys

| Key | Owns |
| --- | --- |
| `ourstuff.artifactStore.v1` | Main artifact store and seeded app state. |
| `ourstuff.bodyTracker.v1` | Body timers, nutrition, goals, and workout state. |
| `ourstuff.spiritPlanProgress.v1` | Spirit reading completion state. |
| `ourstuff.lifePlanner.v1` | Life todos, projects, phases, tasks, and attachments. |
| `ourstuff.thoughts.v1` | Thought orb settings per dashboard area. |
| `ourstuff.goals.v1` | Goal orb settings per dashboard area. |
| `ourstuff.dashboardIdentity.v1` | Dashboard area labels, numbers, and icons. |
| `ourstuff.dashboardChartTabs.v1` | Saved home dashboard tab order for Orbs, Pie, and Bar. |
| `ourstuff.sidebarWidth.v1` | Desktop sidebar width. |
| `ourstuff.theme.v1` | Active theme id. |
| `ourstuff.colorMode.v1` | Global color mode: `standard` or `colorblind`. |
| `ourstuff.pyxdiaSettings.v1` | PYXDIA local settings fallback, including balance-statistics level and AI Brain toggle preference. |
| `ourstuff.pyxdiaPenpal.v1` | PYXDIA local/demo draft, letters, user-selected context, optional balance statistics, static memory, and dynamic retrieval metadata. |
| `ourstuff.iconifySearchCache.v1` | Icon picker search cache. |
| `ourstuff.localMedia.v1` | IndexedDB database for local images and files. |
| `ourstuff.mediaCryptoKey.v1.{uid}` | Per-user browser key for encrypted Firebase Storage media. |
| `ourstuff.cloudDeviceId.v1` | Local device id used in Cloud app-state writes. |
| `ourstuff.lastCloudSyncAt.v1` | Last successful Cloud sync timestamp for this device. |
| `ourstuff.localCloudDemoSession.v1` | Localhost-only subscribed demo session. |
| `ourstuff.localCloudDemoState.v1` | Localhost-only saved demo Cloud state. |

## File Map

| File | Use it for |
| --- | --- |
| `index.html` | Small shell, CSS link, Iconify script, FullCalendar script, app module. |
| `assets/js/app.js` | Main state, rendering, actions, and view logic. |
| `assets/js/storage.js` | Artifact store loading, saving, conversion, lookup, upsert, removal. |
| `assets/js/localMedia.js` | IndexedDB images/files, compression, encrypted Firebase Storage media, import/export support. |
| `assets/js/markdown.js` | Safe markdown rendering. |
| `assets/js/data.js` | Dashboard card metadata and shared date constants. |
| `assets/js/donations.js` | Donation modal and checkout request. |
| `obsidian-plugin` | Obsidian plugin package for compendium folder and section Markdown sync. |
| `OBSIDIAN_SYNC.md` | Obsidian sync contract, filename rules, checks, and smoke commands. |
| `assets/js/pyxdia.js` | PYXDIA settings normalization, note metadata references, size checks, and backend API helper. |
| `assets/js/trash.js` | Trash settings, listing, shared delete, restore, and permanent delete API helper. |
| `assets/js/config.js` | Public app, Firebase, and payments Worker config. |
| `assets/js/cloud.js` | Firebase Auth, subscription actions, entitlement state, and Cloud sync helpers. |
| `assets/js/thanks.js` | Donation thank-you page session display. |
| `assets/js/themeSystem.js` | Portable theme engine. |
| `assets/css/app.css` | App layout, components, responsive behavior, theme adapter selectors. |
| `assets/css/theme-contract.css` | Portable theme token helper classes. |
| `assets/data/artifacts.json` | First-load seed data. |
| `CODEX.md` | Build, verification, architecture, and editing notes. |
| `APP_ICONS.md` | Canonical icon choices, Iconify usage rules, and picker defaults. |
| `THEMING_DEV.md` | Theme engine and token contract. |
| `OURSTUFF_PAYMENTS_DEV.md` | Payment Worker contract and verification notes. |
| `APP_LINGO.md` | This vocabulary and app-area map. |
| `TASKLIST.md` | Cloud subscription implementation task tracking. |
| `OURSTUFF_CLOUD_CONTEXT.md` | Durable Cloud/Firebase/Stripe integration context. |
| `firebase.json` | Firebase deploy config for Firestore rules. |
| `firestore.rules` | Firestore custom-claim security rules. |
| `functions/` | Firebase Node 22 Functions backend for PYXDIA, AI gateway, and Trash lifecycle routes. |

## How To Ask For Changes

Good shorthand examples:

- "In the Life calendar month view, make journal events easier to scan."
- "In the Body nutrition daily tracker, move the daily note under macros."
- "In the Mind compendium manager, change the section handle behavior."
- "In Spirit book detail, make Mark Complete match the site button style."
- "In Settings > Thoughts, add another default orb for Life."
- "On the home dashboard, keep flipped cards linked to the balance chart."
- "In the sidebar footer, reorder Gallery and Export."

## Maintenance Checklist

Update this file when you:

- Add or rename an area, mode, settings tab, or sidebar utility.
- Add a new local storage key, IndexedDB store, route, or Worker contract.
- Change what "artifact", "note", "compendium", "section", "thought", "task", or "journal" means.
- Move a major renderer into a new file.
- Add new app-wide UI terms that the user is likely to reference later.
