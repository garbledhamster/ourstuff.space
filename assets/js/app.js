import {
	autoUpdate,
	computePosition,
	flip,
	offset,
	shift,
} from "https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.5/+esm";
import {
	acceptFamilyInvite,
	copyLatestObsidianApiKey,
	createOrRotateObsidianSyncKey,
	deleteCloudAccount,
	deleteCloudStateJson,
	deleteObsidianSyncKey,
	declineFamilyInvite,
	estimateCloudStateStorageUsage,
	estimateJsonBytes,
	getCloudAccountState,
	getCloudIdToken,
	getCloudSpaceStates,
	getCloudStateInfo,
	initCloudAccount,
	leaveFamilySpace,
	loadCloudStateJson,
	openBillingPortal,
	recordCloudSyncAt,
	refreshObsidianSyncKey,
	removeFamilyMember,
	saveCloudStateJson,
	sendFamilyInvite,
	signInToCloud,
	signInWithEmailPassword,
	signInWithGoogle,
	signOutCloud,
	startCloudSubscription,
	updateFamilyMember,
} from "./cloud.js?v=space-isolation-20260605b";
import { CLOUD_STORAGE_LIMIT_BYTES } from "./config.js?v=storage-quota-20260523a";
import { today } from "./data.js";
import { bindDonationFlow, donationModalHtml } from "./donations.js";
import {
	clearLocalFiles,
	configureCloudMedia,
	deleteLocalImages,
	exportCloudMediaKey,
	exportLocalFiles,
	importCloudMediaKey,
	importLocalFiles,
	listLocalFiles,
	listLocalImages,
	migrateLocalMediaToCloud,
	resolveLocalFile,
	storeLocalFile,
	storeLocalImage,
	storeLocalImageFromDataUrl,
} from "./localMedia.js?v=space-20260531a";
import { escapeHtml, renderMarkdown } from "./markdown.js";
import {
	pageContentHtml,
	pageNumberOverlayHtml,
	readerBodyHtml,
} from "./readerContent.js";
import {
	DEFAULT_PYXIDA_SETTINGS,
	estimatePyxdiaLetterSize,
	estimatePyxdiaNoteMetadataSize,
	fetchPyxdiaState,
	markPyxdiaThreadRead,
	normalizePyxdiaDynamicRetrievalMemory,
	normalizePyxdiaSettings,
	normalizePyxdiaStaticMemory,
	normalizePyxdiaUserSelectedContext,
	PYXIDA_NOTE_METADATA_MAX_CHARS,
	PYXIDA_NOTE_METADATA_MAX_REFS,
	pyxdiaNoteRefsFromArtifacts,
	resetPyxdiaMemory,
	retryPyxdiaLetter,
	savePyxdiaDraft,
	savePyxdiaSettings,
	sendPyxdiaLetter,
} from "./pyxdia.js?v=space-20260531b";
import {
	pyxdiaImageMarkdown,
	resolvePyxdiaImageUrl,
	uploadPyxdiaLetterImage,
} from "./pyxdiaMedia.js?v=space-20260531a";
import {
	artifactStoreToCompendiums,
	compendiumsToArtifactStore,
	createEmptyStore,
	findAnyArtifact,
	findArtifact,
	isDeletedArtifact,
	loadArtifactStore,
	loadSeedStore,
	removeArtifact,
	rootNotesForDashboard,
	SCHEMA_VERSION,
	artifactStorageKey,
	upsertArtifact,
	saveArtifactStore as writeArtifactStore,
} from "./storage.js?v=space-isolation-20260605b";
import {
	activeSpace,
	availableCustomSpaceId,
	CUSTOM_SPACE_IDS,
	DATA_SPACES,
	FAMILY_SPACE_ID,
	ACTIVE_SPACE_KEY,
	getActiveSpaceId,
	getActiveSpaceLabel,
	hasSpacePin,
	isShareableSpace,
	isSpaceUnlocked,
	lockSpace,
	migrateLegacyLocalStorageToPersonal,
	PERSONAL_SPACE_ID,
	refreshDataSpaces,
	removeSpacePin,
	saveCustomDataSpace,
	scopedStorageKey,
	setSpacePin,
	switchSpace,
	unlockSpace,
	WORK_SPACE_ID,
} from "./space.js";
import {
	applyThemeVariables as applyThemeSystemVariables,
	loadTheme as loadThemeSelection,
	normalizeTheme as normalizeThemeSelection,
	saveTheme as saveThemeSelection,
	THEME_COLOR_FIELDS,
	themeColors,
	themePreviewStyle,
	themeFontLabel as themeSystemFontLabel,
} from "./themeSystem.js";
import {
	deleteUserItem,
	fetchTrashState,
	hardDeleteTrashItem,
	normalizeTrashItem,
	normalizeTrashSettings,
	restoreTrashItem,
	saveTrashSettings,
} from "./trash.js?v=space-20260531a";

const app = document.getElementById("app");
const DATASET_STORAGE_BASE_KEYS = [
	"ourstuff.artifactStore.v1",
	"ourstuff.bodyTracker.v1",
	"ourstuff.spiritPlanProgress.v1",
	"ourstuff.lifePlanner.v1",
	"ourstuff.thoughts.v1",
	"ourstuff.goals.v1",
	"ourstuff.dashboardIdentity.v1",
	"ourstuff.dashboardChartTabs.v1",
	"ourstuff.theme.v1",
	"ourstuff.colorMode.v1",
	"ourstuff.timerState.v1",
	"ourstuff.timerSettings.v1",
	"ourstuff.pyxdiaSettings.v1",
	"ourstuff.pyxdiaPenpal.v1",
	"ourstuff.dismissedTips.v1",
	"ourstuff.localAppUpdatedAt.v1",
	"ourstuff.appearanceUpdatedAt.v1",
	"ourstuff.localAppOwner.v1",
];
const APP_STATE_STORAGE_BASE_KEYS = [
	"ourstuff.bodyTracker.v1",
	"ourstuff.spiritPlanProgress.v1",
	"ourstuff.lifePlanner.v1",
	"ourstuff.thoughts.v1",
	"ourstuff.goals.v1",
	"ourstuff.dashboardIdentity.v1",
	"ourstuff.dashboardChartTabs.v1",
	"ourstuff.pyxdiaSettings.v1",
	"ourstuff.pyxdiaPenpal.v1",
	"ourstuff.theme.v1",
	"ourstuff.colorMode.v1",
	"ourstuff.timerState.v1",
	"ourstuff.timerSettings.v1",
	"ourstuff.appearanceUpdatedAt.v1",
];
migrateLegacyLocalStorageToPersonal(DATASET_STORAGE_BASE_KEYS);
const BODY_TRACKER_KEY = scopedStorageKey("ourstuff.bodyTracker.v1");
const SPIRIT_PROGRESS_KEY = scopedStorageKey("ourstuff.spiritPlanProgress.v1");
const LIFE_PLANNER_KEY = scopedStorageKey("ourstuff.lifePlanner.v1");
const TRACKER_SETTINGS_KEY = scopedStorageKey("ourstuff.thoughts.v1");
const GOAL_SETTINGS_KEY = scopedStorageKey("ourstuff.goals.v1");
const DASHBOARD_IDENTITY_KEY = scopedStorageKey("ourstuff.dashboardIdentity.v1");
const DASHBOARD_CHART_TABS_KEY = scopedStorageKey("ourstuff.dashboardChartTabs.v1");
const SIDEBAR_WIDTH_KEY = "ourstuff.sidebarWidth.v1";
const ENABLED_DATA_SPACES_KEY = "ourstuff.enabledDataSpaces.v1";
const CUSTOM_SPACE_POST_CREATE_KEY = "ourstuff.customSpacePostCreate.v1";
const THEME_KEY = scopedStorageKey("ourstuff.theme.v1");
const COLOR_MODE_KEY = scopedStorageKey("ourstuff.colorMode.v1");
const TIMER_STATE_KEY = scopedStorageKey("ourstuff.timerState.v1");
const TIMER_SETTINGS_KEY = scopedStorageKey("ourstuff.timerSettings.v1");
const PYXIDA_SETTINGS_KEY = scopedStorageKey("ourstuff.pyxdiaSettings.v1");
const PYXIDA_LOCAL_STATE_KEY = scopedStorageKey("ourstuff.pyxdiaPenpal.v1");
const PYXIDA_RECENT_NOTE_DAYS = 30;
const DISMISSED_TIPS_KEY = scopedStorageKey("ourstuff.dismissedTips.v1");
const ICONIFY_SEARCH_CACHE_KEY = "ourstuff.iconifySearchCache.v1";
const LOCAL_APP_UPDATED_AT_KEY = scopedStorageKey("ourstuff.localAppUpdatedAt.v1");
const APPEARANCE_UPDATED_AT_KEY = scopedStorageKey("ourstuff.appearanceUpdatedAt.v1");
const LOCAL_APP_OWNER_KEY = scopedStorageKey("ourstuff.localAppOwner.v1");
const CLOUD_AUTH_VIEW_PENDING_KEY = "ourstuff.cloudAuthViewPending.v1";
const CLOUD_SYNC_INTERVAL_MS = 2 * 60 * 1000;
const CLOUD_SYNC_MIN_INTERVAL_MS = 20 * 1000;
const CLOUD_SYNC_CLOCK_SKEW_MS = 1000;
const CLOUD_SYNC_DEBOUNCE_MS = 2500;
const CLOUD_SYNC_IDLE_GRACE_MS = 1800;
const ICONIFY_SEARCH_URL = "https://api.iconify.design/search";
const ICONIFY_PREFIXES = "tabler,lucide,ph,mdi,material-symbols";
const ICON_PICKER_PAGE_SIZE = 48;
const ICON_PICKER_DEFAULT_ICONS = [
	"tabler:circle",
	"tabler:brain",
	"tabler:activity",
	"tabler:sun",
	"tabler:calendar-heart",
	"tabler:notes",
	"tabler:school",
	"tabler:bulb",
	"tabler:question-mark",
	"tabler:barbell",
	"tabler:salad",
	"tabler:droplet",
	"tabler:moon",
	"tabler:book",
	"tabler:yoga",
	"tabler:message-circle",
	"tabler:pray",
	"tabler:users",
	"tabler:friends",
	"tabler:briefcase",
	"tabler:sparkles",
	"tabler:heart",
	"tabler:target-arrow",
	"tabler:flame",
	"tabler:leaf",
	"tabler:mountain",
	"tabler:plant-2",
	"tabler:run",
	"tabler:bike",
	"tabler:swimming",
	"tabler:stretching",
	"tabler:bed",
	"tabler:coffee",
	"tabler:apple",
	"tabler:chef-hat",
	"tabler:glass-full",
	"tabler:heartbeat",
	"tabler:lungs",
	"tabler:mood-smile",
	"tabler:bolt",
	"tabler:clock",
	"tabler:calendar",
	"tabler:list-check",
	"tabler:folder",
	"tabler:home",
	"tabler:map-pin",
	"tabler:world",
	"tabler:star",
	"tabler:flag",
	"lucide:brain",
	"lucide:activity",
	"lucide:sun",
	"lucide:calendar-heart",
	"lucide:notebook-pen",
	"lucide:dumbbell",
	"lucide:droplets",
	"lucide:sprout",
	"ph:brain",
	"ph:heartbeat",
	"ph:sun",
	"ph:calendar-heart",
	"mdi:meditation",
	"mdi:run-fast",
	"mdi:home-heart",
	"mdi:book-open-page-variant",
];
const RING_CIRCUMFERENCE = 502.6548245743669;
const MENU_TIMER_DEFAULT_SECONDS = 25 * 60;
const MENU_TIMER_MAX_SECONDS = 99 * 60 + 59;
const MENU_TIMER_PRESETS = [
	{ label: "25 min", seconds: 25 * 60 },
	{ label: "10 min", seconds: 10 * 60 },
	{ label: "5 min", seconds: 5 * 60 },
	{ label: "1 min", seconds: 60 },
];
const MENU_TIMER_ALARMS = [
	{ id: "bell", label: "Bell" },
	{ id: "chime", label: "Chime" },
	{ id: "beep", label: "Beep" },
	{ id: "ding", label: "Ding" },
];
const SIDEBAR_DEFAULT_WIDTH = 270;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 540;
const THOUGHT_COOLDOWN_MS = 7000;
const TRACKER_ORBS_PER_ROW = 8;
const TRACKER_ORB_ROWS = 2;
const TRACKER_ORBS_PER_PAGE = TRACKER_ORBS_PER_ROW * TRACKER_ORB_ROWS;
const THOUGHT_TOOLTIP_LONG_PRESS_MS = 480;
const MOBILE_MENU_QUERY = "(max-width: 860px)";
const INSTALLED_APP_QUERY = "(display-mode: standalone)";
const COMPENDIUM_TWO_QUERY = "(max-width: 820px)";
const COMPENDIUM_ONE_QUERY = "(max-width: 520px)";
const COMPENDIUM_ROWS_PER_PAGE = 2;
const DASHBOARD_LABELS = ["Mind", "Body", "Spirit", "Life"];
const SIMPLE_TOOLTIP_WORD_LIMIT = 7;
const HEADER_SNAP_DISABLE_DELAY_MS = 260;
const NAVIGATION_TOUR_STEPS = [
	{
		id: "menu-button",
		route: "dashboard",
		selector: ".mobile-menu-toggle",
		label: "Tap Menu to open notes, settings, gallery, timer, and data tools.",
		placement: "bottom",
	},
	{
		id: "menu-open",
		route: "dashboard-menu",
		selector: ".sidebar",
		label: "This menu holds your notes, settings, gallery, timer, and data tools.",
		placement: "right",
	},
	{
		id: "menu-groups",
		route: "dashboard-menu",
		selector: ".sidebar-group-toggle",
		label: "Each group opens the notes for one dashboard area.",
		placement: "right",
	},
	{
		id: "menu-settings",
		route: "dashboard-menu",
		selector: ".sidebar-text-link[data-action='open-settings']",
		label: "Settings holds Getting Started, orbs, interface, and data.",
		placement: "top",
	},
	{
		id: "mind",
		route: "Mind",
		selector: ".content-stage .panel-header",
		label: "Mind is for notes, ideas, questions, and compendiums.",
		placement: "top",
	},
	{
		id: "body",
		route: "Body",
		selector: ".content-stage .panel-header",
		label: "Body is for timers, nutrition, workouts, sleep, and physical notes.",
		placement: "top",
	},
	{
		id: "spirit",
		route: "Spirit",
		selector: ".content-stage .panel-header",
		label: "Spirit is for reading, reflection, values, study, and meaning.",
		placement: "top",
	},
	{
		id: "life",
		route: "Life",
		selector: ".content-stage .panel-header",
		label: "Life is for your calendar, journal, tasks, projects, and attachments.",
		placement: "top",
	},
	{
		id: "dashboard-orbs",
		route: "dashboard",
		selector: ".dashboard-chart-switcher",
		label: "Use Orbs, Pie, and Bar to scan your activity from different angles.",
		placement: "top",
	},
	{
		id: "dashboard-cards",
		route: "dashboard",
		selector: ".dashboard-card",
		label: "Open a card to work inside Mind, Body, Spirit, or Life.",
		placement: "top",
	},
	{
		id: "done",
		route: "dashboard",
		selector: ".dashboard-home",
		label: "Navigation tour complete.",
		placement: "top",
	},
];
const GOAL_FREQUENCY_OPTIONS = [
	{ id: "daily", label: "Daily", days: 1 },
	{ id: "weekly", label: "Weekly", days: 7 },
	{ id: "bi-weekly", label: "Bi Weekly", days: 14 },
	{ id: "monthly", label: "Monthly", days: 30 },
	{ id: "yearly", label: "Yearly", days: 365 },
	{ id: "custom", label: "Custom", days: 10 },
];
const DASHBOARD_DISPLAY_OPTIONS = [
	{ id: "title", stateKey: "showTitle", label: "Titles" },
	{ id: "numbers", stateKey: "showNumbers", label: "Numbers" },
	{ id: "icons", stateKey: "showIcons", label: "Icons" },
];
const DEFAULT_DASHBOARD_DISPLAY_OPTION_ORDER = ["numbers", "icons", "title"];
const DEFAULT_DASHBOARD_IDENTITY = {
	displayMode: "numbers",
	showTitle: true,
	showNumbers: true,
	showIcons: false,
	displayOptionOrder: DEFAULT_DASHBOARD_DISPLAY_OPTION_ORDER,
	colorAlwaysOn: false,
	items: {
		Mind: {
			number: "01",
			label: "Mind",
			icon: "tabler:brain",
			color: "#38bdf8",
		},
		Body: {
			number: "02",
			label: "Body",
			icon: "tabler:activity",
			color: "#22c55e",
		},
		Spirit: {
			number: "03",
			label: "Spirit",
			icon: "tabler:sun",
			color: "#f59e0b",
		},
		Life: {
			number: "04",
			label: "Life",
			icon: "tabler:calendar-heart",
			color: "#f472b6",
		},
	},
};
const DASHBOARD_PERIOD_OPTIONS = [
	{ id: "day", label: "1 day", days: 1 },
	{ id: "2-days", label: "2 days", days: 2 },
	{ id: "3-days", label: "3 days", days: 3 },
	{ id: "4-days", label: "4 days", days: 4 },
	{ id: "5-days", label: "5 days", days: 5 },
	{ id: "6-days", label: "6 days", days: 6 },
	{ id: "week", label: "Week", days: 7 },
	{ id: "2-weeks", label: "2 weeks", days: 14 },
	{ id: "month", label: "Month", days: 30 },
	{ id: "3-months", label: "3 months", days: 90 },
	{ id: "year", label: "1 year", days: 365 },
	{ id: "3-years", label: "3 years", days: 365 * 3 },
	{ id: "7-years", label: "7 years", days: 365 * 7 },
	{ id: "10-years", label: "10 years", days: 365 * 10 },
];
const DEFAULT_DASHBOARD_CHART_TABS = ["orbs", "pie", "bar"];
const DASHBOARD_CHART_TAB_DEFS = {
	orbs: { id: "orbs", icon: "ph:sphere", label: "Orbs", title: "Orbs" },
	pie: {
		id: "pie",
		icon: "tabler:chart-pie",
		label: "Pie",
		title: "Pie chart",
	},
	bar: {
		id: "bar",
		icon: "tabler:chart-bar",
		label: "Bar",
		title: "Bar chart",
	},
};
const BODY_TIMER_MODES = [
	{
		key: "fasting",
		stateKey: "fast",
		label: "Fasting",
		shortLabel: "Fast",
		icon: "tabler:clock-hour-4",
		defaultLabel: "Manual fast",
		defaultTargetHours: 16,
		targetLabel: "Target hours",
		targetUnit: "hours",
		activeText: "Active fast",
		idleText: "No active fast",
		startText: "Start Fast",
		stopText: "Stop Fast",
		emptyText: "Start a fast to track elapsed time against your target.",
	},
	{
		key: "sleep",
		stateKey: "sleep",
		label: "Sleep",
		shortLabel: "Sleep",
		icon: "tabler:moon",
		defaultLabel: "Sleep session",
		defaultTargetHours: 8,
		targetLabel: "Target hours",
		targetUnit: "hours",
		activeText: "Sleeping",
		idleText: "No active sleep",
		startText: "Start Sleep",
		stopText: "Stop Sleep",
		emptyText: "Start a sleep timer to track your rest window.",
	},
	{
		key: "exercise",
		stateKey: "exercise",
		label: "Exercise",
		shortLabel: "Exercise",
		icon: "tabler:barbell",
		defaultLabel: "Exercise session",
		defaultTargetHours: 1,
		targetLabel: "Target minutes",
		targetUnit: "minutes",
		activeText: "Exercising",
		idleText: "No active exercise",
		startText: "Start Exercise",
		stopText: "Stop Exercise",
		emptyText:
			"Start an exercise timer for strength, mobility, or focused movement.",
	},
	{
		key: "cardio",
		stateKey: "cardio",
		label: "Cardio",
		shortLabel: "Cardio",
		icon: "tabler:run",
		defaultLabel: "Cardio session",
		defaultTargetHours: 0.5,
		targetLabel: "Target minutes",
		targetUnit: "minutes",
		activeText: "Cardio active",
		idleText: "No active cardio",
		startText: "Start Cardio",
		stopText: "Stop Cardio",
		emptyText:
			"Start a cardio timer for walks, runs, bike rides, or conditioning.",
	},
];
let thoughtToastFadeTimer = null;
let thoughtToastHideTimer = null;
let thoughtTooltipCleanup = null;
let thoughtTooltipLongPressTimer = null;
let thoughtTooltipSuppressClickTarget = null;
let guidedTipCleanup = null;
let guidedTipTarget = null;
let guidedTipTargetClickHandler = null;
let guidedTipDocumentClickHandler = null;
let guidedTipDocumentKeyHandler = null;
let navigationTourReturnFocusElement = null;
let dashboardPeriodGlowTimer = null;
let headerSnapChromeDisabled = false;
let headerSnapChromeDisableTimer = null;
let headerSnapChromeTransitionCleanup = null;
let headerSnapChromeTransitionToken = 0;
let localChangeTrackingSuppressed = 0;
let cloudSyncInFlight = null;
let cloudAutoSyncTimer = null;
let cloudAutoSyncDebounceTimer = null;
let cloudAutoSyncIdleTimer = null;
let lastCloudAutoSyncAttemptAt = 0;
let cloudAutoSyncPrimedFor = "";
let lastUserInterfaceActivityAt = Date.now();
let cloudStorageUsageRefreshTimer = null;
let cloudStorageUsageRefreshInFlight = false;
let cloudStorageUsageSignature = "";
let pyxdiaSettingsPersistTimer = null;
let cameraStream = null;
let cameraRequestToken = 0;
const SPIRIT_PLANS = [
	{
		id: "ten-year",
		label: "Western Paganism",
		url: "/assets/data/bookclub.json",
	},
];
const DASHBOARD_COLORS = {
	Mind: "#38bdf8",
	Body: "#22c55e",
	Spirit: "#f59e0b",
	Life: "#f472b6",
};
const ICON_PICKER_COLOR_PRESETS = [
	"#38bdf8",
	"#0ea5e9",
	"#22c55e",
	"#84cc16",
	"#f59e0b",
	"#f97316",
	"#ef4444",
	"#f43f5e",
	"#f472b6",
	"#a855f7",
	"#6366f1",
	"#14b8a6",
	"#eab308",
	"#fb7185",
	"#94a3b8",
	"#f8fafc",
];
const APP_THEMES = [
	{
		id: "default",
		label: "Default",
		description: "Original Ourstuff dark interface.",
		fontSet: "classic",
	},
	{
		id: "midnight",
		label: "Midnight",
		description: "Fast Track's deep slate theme with cyan accents.",
		colorScheme: "dark",
		fontSet: "midnight",
		colors: {
			primaryColor: "#06b6d4",
			secondaryColor: "#0891b2",
			backgroundColor: "#020617",
			surfaceColor: "#0f172a",
			surfaceMutedColor: "#1e293b",
			borderColor: "#1e293b",
			textColor: "#f8fafc",
			textMutedColor: "#94a3b8",
			dangerColor: "#dc2626",
		},
	},
	{
		id: "ocean",
		label: "Ocean",
		description: "Blue-green shell with bright sky highlights.",
		colorScheme: "dark",
		fontSet: "ocean",
		colors: {
			primaryColor: "#38bdf8",
			secondaryColor: "#0ea5e9",
			backgroundColor: "#071a2b",
			surfaceColor: "#0b2942",
			surfaceMutedColor: "#123a5a",
			borderColor: "#1e3a5f",
			textColor: "#e0f2fe",
			textMutedColor: "#94a3b8",
			dangerColor: "#f97316",
		},
	},
	{
		id: "sunrise",
		label: "Sunrise",
		description: "Warm rose and orange Fast Track palette.",
		colorScheme: "dark",
		fontSet: "sunrise",
		colors: {
			primaryColor: "#fb7185",
			secondaryColor: "#f97316",
			backgroundColor: "#1f0f1a",
			surfaceColor: "#2a1523",
			surfaceMutedColor: "#3b1c2e",
			borderColor: "#4b2237",
			textColor: "#fff1f2",
			textMutedColor: "#fda4af",
			dangerColor: "#f87171",
		},
	},
	{
		id: "light",
		label: "Light",
		description: "Clean white Fast Track palette with blue accents.",
		colorScheme: "light",
		fontSet: "minimal",
		colors: {
			primaryColor: "#2563eb",
			secondaryColor: "#1d4ed8",
			backgroundColor: "#ffffff",
			surfaceColor: "#f8fafc",
			surfaceMutedColor: "#f8fafc",
			borderColor: "#e2e8f0",
			textColor: "#000000",
			textMutedColor: "#000000",
			dangerColor: "#dc2626",
		},
	},
	{
		id: "monokai",
		label: "Monokai (Dark)",
		description: "Editor-like green and cyan on warm charcoal.",
		colorScheme: "dark",
		fontSet: "code",
		colors: {
			primaryColor: "#a6e22e",
			secondaryColor: "#66d9ef",
			backgroundColor: "#272822",
			surfaceColor: "#2d2e28",
			surfaceMutedColor: "#3e3d32",
			borderColor: "#49483e",
			textColor: "#f8f8f2",
			textMutedColor: "#a1a1a1",
			dangerColor: "#f92672",
		},
	},
	{
		id: "monokaiLight",
		label: "Monokai (Light)",
		description: "Light editor palette with teal and violet accents.",
		colorScheme: "light",
		fontSet: "softCode",
		colors: {
			primaryColor: "#2aa198",
			secondaryColor: "#6c71c4",
			backgroundColor: "#faf7ef",
			surfaceColor: "#fffdf7",
			surfaceMutedColor: "#f3eee3",
			borderColor: "#e7decd",
			textColor: "#2b2b2b",
			textMutedColor: "#6b6b6b",
			dangerColor: "#dc322f",
		},
	},
	{
		id: "sand",
		label: "Sand",
		description: "Soft parchment surfaces with amber and teal accents.",
		colorScheme: "light",
		fontSet: "warm",
		colors: {
			primaryColor: "#c17d3b",
			secondaryColor: "#2c6e6f",
			backgroundColor: "#f7f1e3",
			surfaceColor: "#fffaf0",
			surfaceMutedColor: "#efe4cf",
			borderColor: "#e0d2b8",
			textColor: "#2f2a24",
			textMutedColor: "#6b5f52",
			dangerColor: "#b42318",
		},
	},
	{
		id: "yellow",
		label: "Yellow",
		description: "Dark shell with strong yellow highlights.",
		colorScheme: "dark",
		fontSet: "utility",
		colors: {
			primaryColor: "#facc15",
			secondaryColor: "#f59e0b",
			backgroundColor: "#0b0f19",
			surfaceColor: "#121a2a",
			surfaceMutedColor: "#18233a",
			borderColor: "#23324f",
			textColor: "#fff7cc",
			textMutedColor: "#f5e6a8",
			dangerColor: "#ef4444",
		},
	},
	{
		id: "forest",
		label: "Forest (Green)",
		description: "Dark green surfaces with bright leaf accents.",
		colorScheme: "dark",
		fontSet: "humanist",
		colors: {
			primaryColor: "#22c55e",
			secondaryColor: "#16a34a",
			backgroundColor: "#06130b",
			surfaceColor: "#0b1f13",
			surfaceMutedColor: "#0f2a19",
			borderColor: "#173b25",
			textColor: "#ecfdf5",
			textMutedColor: "#86efac",
			dangerColor: "#ef4444",
		},
	},
	{
		id: "cobalt",
		label: "Cobalt (Blue)",
		description: "Deep navy Fast Track palette with blue accents.",
		colorScheme: "dark",
		fontSet: "technical",
		colors: {
			primaryColor: "#3b82f6",
			secondaryColor: "#2563eb",
			backgroundColor: "#070a14",
			surfaceColor: "#0b1224",
			surfaceMutedColor: "#0f1a33",
			borderColor: "#1b2a55",
			textColor: "#eff6ff",
			textMutedColor: "#93c5fd",
			dangerColor: "#f43f5e",
		},
	},
	{
		id: "twilight",
		label: "Twilight",
		description: "Purple night palette with cyan secondary accents.",
		colorScheme: "dark",
		fontSet: "editorial",
		colors: {
			primaryColor: "#8b5cf6",
			secondaryColor: "#22d3ee",
			backgroundColor: "#07051a",
			surfaceColor: "#120a2b",
			surfaceMutedColor: "#1a123a",
			borderColor: "#2b1b55",
			textColor: "#f5f3ff",
			textMutedColor: "#c4b5fd",
			dangerColor: "#fb7185",
		},
	},
	{
		id: "matrix",
		label: "Matrix 1999",
		description: "CRT terminal black with phosphor green highlights.",
		colorScheme: "dark",
		contrastMode: "console",
		fontSet: "matrix",
		colors: {
			primaryColor: "#00ff41",
			secondaryColor: "#8cffc1",
			backgroundColor: "#000500",
			surfaceColor: "#031107",
			surfaceMutedColor: "#08210f",
			borderColor: "#00c853",
			textColor: "#d8ffe3",
			textMutedColor: "#7cff9f",
			dangerColor: "#ff4d4d",
		},
	},
	{
		id: "consolas",
		label: "Consolas",
		description:
			"Slate black console surface with off-white Consolas-style text and borders.",
		colorScheme: "dark",
		contrastMode: "console",
		fontSet: "mono",
		colors: {
			primaryColor: "#efeee7",
			secondaryColor: "#d6d3c9",
			backgroundColor: "#050505",
			surfaceColor: "#080808",
			surfaceMutedColor: "#111111",
			borderColor: "#efeee7",
			textColor: "#f1f0e8",
			textMutedColor: "#d6d3c9",
			dangerColor: "#f0b7b7",
		},
	},
];
const THEME_FONT_SETS = {
	classic: {
		label: "Classic",
		body: '"Aptos", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
		display: 'Georgia, "Times New Roman", serif',
		labelFont: '"Bahnschrift", "Aptos", "Segoe UI", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	midnight: {
		label: "Midnight UI",
		body: '"Segoe UI Variable Text", "Aptos", "Segoe UI", system-ui, sans-serif',
		display:
			'"Aptos Display", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
		labelFont:
			'"Bahnschrift", "Segoe UI Variable Text", "Aptos", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	ocean: {
		label: "Rounded",
		body: 'Corbel, "Candara", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
		display:
			'"Trebuchet MS", Corbel, "Segoe UI Variable Display", system-ui, sans-serif',
		labelFont: '"Trebuchet MS", "Bahnschrift", Corbel, system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	sunrise: {
		label: "Editorial Warm",
		body: 'Candara, "Segoe UI Variable Text", "Aptos", system-ui, sans-serif',
		display: 'Constantia, Georgia, "Palatino Linotype", serif',
		labelFont:
			'"Franklin Gothic Medium", "Bahnschrift", "Aptos", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	minimal: {
		label: "Minimal",
		body: '"Segoe UI Variable Text", "Aptos", "Segoe UI", system-ui, sans-serif',
		display:
			'"Segoe UI Variable Display", "Aptos Display", "Segoe UI", system-ui, sans-serif',
		labelFont:
			'"Segoe UI Variable Small", "Bahnschrift", "Segoe UI", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	editorial: {
		label: "Editorial",
		body: '"Aptos", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
		display: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
		labelFont: '"Bahnschrift", "Aptos", "Segoe UI", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	warm: {
		label: "Parchment",
		body: 'Constantia, Cambria, Georgia, "Times New Roman", serif',
		display: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
		labelFont:
			'"Trebuchet MS", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	humanist: {
		label: "Humanist",
		body: '"Candara", "Segoe UI Variable Text", "Aptos", system-ui, sans-serif',
		display: '"Cambria", Georgia, "Times New Roman", serif',
		labelFont: '"Bahnschrift", "Candara", "Segoe UI", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	utility: {
		label: "Utility",
		body: 'Verdana, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
		display: '"Arial Black", Impact, "Aptos Display", system-ui, sans-serif',
		labelFont: 'Tahoma, Verdana, "Segoe UI", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	technical: {
		label: "Technical",
		body: '"Segoe UI Variable Text", "Aptos", "Segoe UI", system-ui, sans-serif',
		display:
			'"Century Gothic", "Aptos Display", "Segoe UI Variable Display", system-ui, sans-serif',
		labelFont:
			'"Bahnschrift", "Century Gothic", "Segoe UI", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	code: {
		label: "Code",
		body: '"Cascadia Code", "Cascadia Mono", Consolas, "Liberation Mono", monospace',
		display:
			'"Cascadia Code", "Cascadia Mono", Consolas, "Liberation Mono", monospace',
		labelFont: '"Cascadia Mono", Consolas, "Liberation Mono", monospace',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	softCode: {
		label: "Soft Code",
		body: '"Cascadia Mono", "Lucida Console", Consolas, monospace',
		display:
			'"Segoe UI Variable Display", "Aptos Display", "Cascadia Mono", system-ui, sans-serif',
		labelFont: '"Cascadia Mono", "Lucida Console", Consolas, monospace',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
	mono: {
		label: "Mono",
		body: 'Consolas, "Cascadia Mono", "SFMono-Regular", "Liberation Mono", monospace',
		display:
			'Consolas, "Cascadia Mono", "SFMono-Regular", "Liberation Mono", monospace',
		labelFont:
			'Consolas, "Cascadia Mono", "SFMono-Regular", "Liberation Mono", monospace',
		mono: 'Consolas, "Cascadia Mono", "SFMono-Regular", "Liberation Mono", monospace',
	},
	matrix: {
		label: "Matrix Terminal",
		body: '"Lucida Console", "Cascadia Mono", Consolas, "Courier New", monospace',
		display:
			'"Lucida Console", "Cascadia Mono", Consolas, "Courier New", monospace',
		labelFont:
			'"Lucida Console", "Cascadia Mono", Consolas, "Courier New", monospace',
		mono: '"Lucida Console", "Cascadia Mono", Consolas, "Courier New", monospace',
	},
};
const ICON_ALIASES = {
	"tabler:lotus": "tabler:yoga",
	"tabler:hands-pray": "tabler:pray",
};
const DEFAULT_TRACKERS = {
	Mind: [
		{ id: "mind-note-taking", label: "Note Making", icon: "tabler:notes" },
		{
			id: "mind-compendium-learning",
			label: "Compendium",
			icon: "tabler:school",
		},
		{ id: "mind-idea", label: "Idea", icon: "tabler:bulb" },
		{ id: "mind-question", label: "Question", icon: "tabler:question-mark" },
	],
	Body: [
		{ id: "body-exercised", label: "Workout", icon: "tabler:barbell" },
		{ id: "body-ate-healthy", label: "Ate Healthy", icon: "tabler:salad" },
		{ id: "body-drank-water", label: "Drank Water", icon: "tabler:droplet" },
		{ id: "body-slept-well", label: "Sleep", icon: "tabler:moon" },
	],
	Spirit: [
		{ id: "spirit-studied", label: "Studied", icon: "tabler:book" },
		{ id: "spirit-meditated", label: "Meditated", icon: "tabler:yoga" },
		{
			id: "spirit-reflection",
			label: "Reflection",
			icon: "tabler:message-circle",
		},
		{ id: "spirit-prayer", label: "Prayer", icon: "tabler:pray" },
	],
	Life: [
		{ id: "life-family", label: "Family", icon: "tabler:users" },
		{ id: "life-friends", label: "Friends", icon: "tabler:friends" },
		{ id: "life-work", label: "Work", icon: "tabler:briefcase" },
		{ id: "life-home", label: "Clean", icon: "tabler:sparkles" },
	],
};
const DEFAULT_GOALS = {
	Mind: [
		{ id: "mind-read", label: "Read", icon: "tabler:book-2" },
		{ id: "mind-write", label: "Write", icon: "tabler:pencil" },
		{ id: "mind-learn", label: "Learn", icon: "tabler:school" },
		{ id: "mind-plan", label: "Plan", icon: "tabler:list-check" },
	],
	Body: [
		{ id: "body-move", label: "Move", icon: "tabler:run" },
		{ id: "body-hydrate", label: "Hydrate", icon: "tabler:droplet" },
		{ id: "body-sleep", label: "Sleep", icon: "tabler:moon" },
		{ id: "body-nutrition", label: "Nutrition", icon: "tabler:apple" },
	],
	Spirit: [
		{ id: "spirit-read", label: "Read", icon: "tabler:book" },
		{ id: "spirit-pray", label: "Pray", icon: "tabler:pray" },
		{ id: "spirit-reflect", label: "Reflect", icon: "tabler:message-circle" },
		{ id: "spirit-gratitude", label: "Gratitude", icon: "tabler:heart" },
	],
	Life: [
		{ id: "life-family-goal", label: "Family", icon: "tabler:users" },
		{ id: "life-work-goal", label: "Work", icon: "tabler:briefcase" },
		{ id: "life-home-goal", label: "Home", icon: "tabler:home" },
		{ id: "life-budget", label: "Budget", icon: "tabler:coins" },
	],
};
const TRACKER_ID_MIGRATIONS = {
	"mind-lesson-learning": "mind-compendium-learning",
};
const TRACKER_LABEL_MIGRATIONS = {
	"mind-note-taking": {
		from: ["Note Taking"],
		to: "Note Making",
	},
	"mind-compendium-learning": {
		from: ["Lesson/Learning", "Lesson"],
		to: "Compendium",
	},
	"body-exercised": {
		from: ["Exercised"],
		to: "Workout",
	},
	"body-slept-well": {
		from: ["Slept Well"],
		to: "Sleep",
	},
	"life-home": {
		from: ["Home"],
		to: "Clean",
	},
};

function cloneTrackerDefaults(defaults) {
	return Object.fromEntries(
		DASHBOARD_LABELS.map((label) => [
			label,
			defaults[label].map((tracker) => ({ ...tracker })),
		]),
	);
}

function cloneDefaultTrackers() {
	return cloneTrackerDefaults(DEFAULT_TRACKERS);
}

function cloneDefaultGoals() {
	return Object.fromEntries(
		DASHBOARD_LABELS.map((dashboard) => [
			dashboard,
			(DEFAULT_GOALS[dashboard] || []).map((goal) => ({
				...goal,
				enabled: true,
			})),
		]),
	);
}

function workTrackerItems(area) {
	const prefix = area.toLowerCase();
	return [
		{ id: `${prefix}-work-notes`, label: "Notes", icon: "tabler:notes" },
		{ id: `${prefix}-work-tasks`, label: "Tasks", icon: "tabler:checklist" },
		{
			id: `${prefix}-work-meetings`,
			label: "Meetings",
			icon: "tabler:users-group",
		},
		{ id: `${prefix}-work-focus`, label: "Focus", icon: "tabler:focus" },
	];
}

function workGoalItems(area) {
	const prefix = area.toLowerCase();
	return [
		{
			id: `${prefix}-work-deep-work`,
			label: "Deep Work",
			icon: "tabler:target-arrow",
		},
		{ id: `${prefix}-work-admin`, label: "Admin", icon: "tabler:briefcase" },
		{
			id: `${prefix}-work-learning`,
			label: "Learning",
			icon: "tabler:school",
		},
		{
			id: `${prefix}-work-follow-up`,
			label: "Follow Up",
			icon: "tabler:message-forward",
		},
	].map((goal) => ({ ...goal, enabled: true, frequency: "daily", customDays: 10 }));
}

function familyTrackerItems(area) {
	const prefix = area.toLowerCase();
	const labels = {
		Mind: [
			["memory", "Memory", "tabler:photo-heart"],
			["story", "Story", "tabler:book"],
			["question", "Question", "tabler:message-question"],
			["milestone", "Milestone", "tabler:flag-heart"],
		],
		Body: [
			["walk", "Walk", "tabler:walk"],
			["meal", "Family Meal", "tabler:tools-kitchen-2"],
			["outdoor", "Outdoor Time", "tabler:trees"],
			["rest", "Rest", "tabler:moon"],
		],
		Spirit: [
			["study", "Study", "tabler:school"],
			["reading", "Reading", "tabler:book-2"],
			["reflection", "Reflection", "tabler:message-circle"],
			["gratitude", "Gratitude", "tabler:heart"],
		],
		Life: [
			["plan", "Plan", "tabler:calendar"],
			["chore", "Chore", "tabler:home-cog"],
			["event", "Event", "tabler:calendar-event"],
			["check-in", "Check-in", "tabler:users"],
		],
	};
	return (labels[area] || labels.Life).map(([id, label, icon]) => ({
		id: `${prefix}-family-${id}`,
		label,
		icon,
	}));
}

function familyGoalItems(area) {
	const prefix = area.toLowerCase();
	const labels = {
		Mind: [
			["archive", "Archive", "tabler:archive"],
			["share-story", "Share Story", "tabler:message-heart"],
			["organize", "Organize", "tabler:folders"],
			["learn", "Learn", "tabler:school"],
		],
		Body: [
			["move", "Move Together", "tabler:run"],
			["hydrate", "Hydrate", "tabler:droplet"],
			["sleep", "Sleep", "tabler:moon"],
			["cook", "Cook", "tabler:tools-kitchen-2"],
		],
		Spirit: [
			["read", "Read", "tabler:book"],
			["practice", "Practice", "tabler:yoga"],
			["serve", "Serve", "tabler:heart-handshake"],
			["reflect", "Reflect", "tabler:message-circle"],
		],
		Life: [
			["plan-week", "Plan Week", "tabler:calendar-week"],
			["budget", "Budget", "tabler:coins"],
			["reset-home", "Reset Home", "tabler:sparkles"],
			["connect", "Connect", "tabler:users"],
		],
	};
	return (labels[area] || labels.Life).map(([id, label, icon]) => ({
		id: `${prefix}-family-${id}`,
		label,
		icon,
		enabled: true,
		frequency: "weekly",
		customDays: 7,
	}));
}

const SPACE_DEFAULTS = {
	[WORK_SPACE_ID]: {
		icon: "tabler:briefcase",
		emptyLabel: "Create empty Work space",
		defaultLabel: "Restore Work Defaults",
		emptyConfirm:
			"Create an empty Work space on this browser? This replaces only the local Work dataset. Personal and Family stay unchanged.",
		defaultConfirm:
			"Restore Work-safe defaults? This replaces only the local Work dataset with empty notes, empty logs, and work-safe orbs.",
		trackers: workTrackerItems,
		goals: workGoalItems,
	},
	[FAMILY_SPACE_ID]: {
		icon: "tabler:users-group",
		emptyLabel: "Create empty Family space",
		defaultLabel: "Restore Family Defaults",
		emptyConfirm:
			"Create an empty Family space on this browser? This replaces only the local Family dataset. Personal and Work stay unchanged.",
		defaultConfirm:
			"Restore Family defaults? This replaces only the local Family dataset with empty notes, empty logs, and family-focused orbs.",
		trackers: familyTrackerItems,
		goals: familyGoalItems,
	},
};

const GETTING_STARTED_SPACE_GUIDES = {
	[PERSONAL_SPACE_ID]: {
		icon: "fluent:person-heart-24-regular",
		title: "Personal Defaults",
		actionLabel: "Use Self Help Defaults",
		description:
			"Use Personal for the whole-life dashboard: notes, care routines, reading, calendar, and reflection in one private local-first space.",
		defaults:
			"The Self Help Defaults restore the original starter notes, orbs, goals, tips, and app structure for getting steady when life feels scattered.",
		areas: {
			Mind: "Ideas, notes, books, questions, and reusable compendiums.",
			Body: "Fasting, food, workouts, sleep, symptoms, and physical routines.",
			Spirit: "Reading, meaning, values, gratitude, prayer, and reflection.",
			Life: "Calendar, journal, todos, projects, and the thread across days.",
		},
		rhythm: [
			["Capture", "Put each thought, workout, reading note, or day summary where it belongs."],
			["Check", "Use Balance to see where your attention has been going lately."],
			["Return", "Edit notes as your understanding changes so the record shows growth."],
		],
	},
	[WORK_SPACE_ID]: {
		icon: "tabler:briefcase",
		title: "Work Defaults",
		actionLabel: "Restore Work Defaults",
		description:
			"Use Work for job notes, meetings, deliverables, focus routines, and planning without mixing them into your Personal space.",
		defaults:
			"Work Defaults start with empty notes and work-safe orbs for knowledge, movement, focus, and productivity.",
		areas: {
			Mind: "Knowledge, references, meeting notes, decisions, and reusable docs.",
			Body: "Workday movement, breaks, energy, and practical health signals.",
			Spirit: "Focus, reset, study, values, and reflection around work habits.",
			Life: "Projects, tasks, calendars, deliverables, and follow-through.",
		},
		rhythm: [
			["Capture", "Turn meetings, ideas, blockers, and tasks into durable work notes."],
			["Plan", "Use Life for projects and next actions; use Mind for reusable knowledge."],
			["Review", "Use Balance to catch whether planning, focus, or execution needs attention."],
		],
	},
	[FAMILY_SPACE_ID]: {
		icon: "tabler:users-group",
		title: "Family Defaults",
		actionLabel: "Restore Family Defaults",
		description:
			"Use Family for shared memories, routines, planning, study notes, and household coordination.",
		defaults:
			"Family Defaults start with empty notes and family-focused orbs for memories, exercise, study, routines, and connection.",
		areas: {
			Mind: "Memories, household knowledge, family notes, and shared questions.",
			Body: "Exercise, meals, sleep, appointments, and health routines.",
			Spirit: "Study, reflection, gratitude, prayer, and shared learning.",
			Life: "Family planner, events, todos, projects, and recurring routines.",
		},
		rhythm: [
			["Capture", "Save memories, routines, tasks, and plans where everyone can find them."],
			["Coordinate", "Use Life for calendars and tasks; use Mind for shared reference notes."],
			["Reconnect", "Use Spirit and Family orbs to keep reflection and connection visible."],
		],
	},
};

function cloneSpaceTrackers(spaceId = activeSpaceId(), { empty = false } = {}) {
	if (empty) {
		return createEmptyTrackerSettings();
	}
	const config = SPACE_DEFAULTS[spaceId];
	if (!config?.trackers) {
		return cloneDefaultTrackers();
	}
	return Object.fromEntries(
		DASHBOARD_LABELS.map((dashboard) => [dashboard, config.trackers(dashboard)]),
	);
}

function cloneSpaceGoals(spaceId = activeSpaceId(), { empty = false } = {}) {
	if (empty) {
		return createEmptyTrackerSettings();
	}
	const config = SPACE_DEFAULTS[spaceId];
	if (!config?.goals) {
		return cloneDefaultGoals();
	}
	return Object.fromEntries(
		DASHBOARD_LABELS.map((dashboard) => [dashboard, config.goals(dashboard)]),
	);
}

function cloneDefaultTrackersForSpace() {
	return cloneSpaceTrackers(getActiveSpaceId());
}

function cloneDefaultGoalsForSpace() {
	return cloneSpaceGoals(getActiveSpaceId());
}

function createEmptyTrackerSettings() {
	return Object.fromEntries(
		DASHBOARD_LABELS.map((dashboard) => [dashboard, []]),
	);
}

function cloneDefaultDashboardIdentityForSpace(spaceId = activeSpaceId()) {
	const spaceLabels = DATA_SPACES[spaceId]?.dashboardLabels || {};
	return {
		displayMode: DEFAULT_DASHBOARD_IDENTITY.displayMode,
		showTitle: DEFAULT_DASHBOARD_IDENTITY.showTitle,
		showNumbers: DEFAULT_DASHBOARD_IDENTITY.showNumbers,
		showIcons: DEFAULT_DASHBOARD_IDENTITY.showIcons,
		displayOptionOrder: [
			...DEFAULT_DASHBOARD_IDENTITY.displayOptionOrder,
		],
		colorAlwaysOn: DEFAULT_DASHBOARD_IDENTITY.colorAlwaysOn,
		items: Object.fromEntries(
			DASHBOARD_LABELS.map((dashboard) => [
				dashboard,
				{
					...DEFAULT_DASHBOARD_IDENTITY.items[dashboard],
					label:
						spaceLabels[dashboard] ||
						DEFAULT_DASHBOARD_IDENTITY.items[dashboard].label,
				},
			]),
		),
	};
}

function cloneDefaultDashboardIdentity() {
	return cloneDefaultDashboardIdentityForSpace(activeSpaceId());
}

function normalizeIconSource(value) {
	const source = String(value || "").trim();
	return ICON_ALIASES[source] || source;
}

function normalizeHexColor(value, fallback = "") {
	const raw = String(value || "").trim();
	const expanded = raw.replace(
		/^#([0-9a-f]{3})$/i,
		(_, hex) =>
			`#${hex
				.split("")
				.map((char) => `${char}${char}`)
				.join("")}`,
	);
	if (/^#[0-9a-f]{6}$/i.test(expanded)) {
		return expanded.toLowerCase();
	}
	return fallback;
}

function normalizeDashboardDisplayOptionOrder(value) {
	const allowed = new Set(DASHBOARD_DISPLAY_OPTIONS.map((option) => option.id));
	const source = Array.isArray(value)
		? value
		: DEFAULT_DASHBOARD_DISPLAY_OPTION_ORDER;
	const order = source.filter((id) => allowed.has(id));
	DEFAULT_DASHBOARD_DISPLAY_OPTION_ORDER.forEach((id) => {
		if (!order.includes(id)) {
			order.push(id);
		}
	});
	return order;
}

function normalizeDashboardIdentity(value) {
	const defaults = cloneDefaultDashboardIdentity();
	const legacyDisplayMode = value?.displayMode === "icons" ? "icons" : "numbers";
	const showNumbers =
		typeof value?.showNumbers === "boolean"
			? value.showNumbers
			: legacyDisplayMode === "numbers";
	const showIcons =
		typeof value?.showIcons === "boolean"
			? value.showIcons
			: legacyDisplayMode === "icons";
	const showTitle =
		typeof value?.showTitle === "boolean"
			? value.showTitle
			: DEFAULT_DASHBOARD_IDENTITY.showTitle;
	const displayMode =
		showIcons && !showNumbers
			? "icons"
		: showNumbers && !showIcons
			? "numbers"
			: "custom";
	return {
		displayMode,
		showTitle,
		showNumbers,
		showIcons,
		displayOptionOrder: normalizeDashboardDisplayOptionOrder(
			value?.displayOptionOrder,
		),
		colorAlwaysOn: value?.colorAlwaysOn === true,
		items: Object.fromEntries(
			DASHBOARD_LABELS.map((dashboard) => {
				const current = value?.items?.[dashboard] || value?.[dashboard] || {};
				const fallback = defaults.items[dashboard];
				const label =
					String(current.label || fallback.label).trim() || fallback.label;
				const icon =
					normalizeIconSource(current.icon || fallback.icon) || fallback.icon;
				const color = normalizeHexColor(
					current.color,
					fallback.color ||
						DASHBOARD_COLORS[dashboard] ||
						DASHBOARD_COLORS.Mind,
				);
				return [dashboard, { ...fallback, label, icon, color }];
			}),
		),
	};
}

function loadDashboardIdentity() {
	try {
		const raw = window.localStorage.getItem(DASHBOARD_IDENTITY_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		const normalized = normalizeDashboardIdentity(parsed);
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(
				DASHBOARD_IDENTITY_KEY,
				JSON.stringify(normalized),
			);
		}
		return normalized;
	} catch {
		return cloneDefaultDashboardIdentity();
	}
}

function saveDashboardIdentity(identity = state.dashboardIdentity) {
	window.localStorage.setItem(
		DASHBOARD_IDENTITY_KEY,
		JSON.stringify(normalizeDashboardIdentity(identity)),
	);
	markLocalAppChanged();
}

function normalizeDashboardChartTabs(value) {
	const allowed = new Set(Object.keys(DASHBOARD_CHART_TAB_DEFS));
	const source = Array.isArray(value) ? value : DEFAULT_DASHBOARD_CHART_TABS;
	const tabs = source.filter((tab) => allowed.has(tab));
	DEFAULT_DASHBOARD_CHART_TABS.forEach((tab) => {
		if (!tabs.includes(tab)) {
			tabs.push(tab);
		}
	});
	return tabs;
}

function loadDashboardChartTabs() {
	try {
		const raw = window.localStorage.getItem(DASHBOARD_CHART_TABS_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		const normalized = normalizeDashboardChartTabs(parsed);
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(
				DASHBOARD_CHART_TABS_KEY,
				JSON.stringify(normalized),
			);
		}
		return normalized;
	} catch {
		return [...DEFAULT_DASHBOARD_CHART_TABS];
	}
}

function saveDashboardChartTabs(tabs = state.dashboardChartTabs) {
	window.localStorage.setItem(
		DASHBOARD_CHART_TABS_KEY,
		JSON.stringify(normalizeDashboardChartTabs(tabs)),
	);
	markLocalAppChanged();
}

function normalizeColorMode(value) {
	return value === "colorblind" ? "colorblind" : "standard";
}

function loadColorMode() {
	try {
		return normalizeColorMode(window.localStorage.getItem(COLOR_MODE_KEY));
	} catch {
		return "standard";
	}
}

function saveColorMode(mode = state.colorMode) {
	try {
		window.localStorage.setItem(COLOR_MODE_KEY, normalizeColorMode(mode));
		markLocalAppChanged();
	} catch {
		// Accessibility mode is a view preference; localStorage failure should not block the app.
	}
}

function clampTimerSeconds(value, fallback = MENU_TIMER_DEFAULT_SECONDS) {
	const number = Math.round(Number(value));
	if (!Number.isFinite(number)) {
		return fallback;
	}
	return Math.min(Math.max(number, 0), MENU_TIMER_MAX_SECONDS);
}

function normalizeTimerState(value) {
	const original = Math.max(
		1,
		clampTimerSeconds(value?.original, MENU_TIMER_DEFAULT_SECONDS),
	);
	let remaining = clampTimerSeconds(value?.remaining, original);
	const savedAt = Number(value?.savedAt || 0);
	if (value?.running && savedAt > 0) {
		const elapsed = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
		remaining = Math.max(0, remaining - elapsed);
	}
	return {
		remaining,
		original,
		running: Boolean(value?.running && remaining > 0),
		savedAt: value?.running && remaining > 0 ? Date.now() : null,
	};
}

function loadTimerState() {
	try {
		const raw = window.localStorage.getItem(TIMER_STATE_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		const normalized = normalizeTimerState(parsed);
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(normalized));
		}
		return normalized;
	} catch {
		return normalizeTimerState();
	}
}

function saveTimerState(timerState = state.timerState, options = {}) {
	const normalized = normalizeTimerState(timerState);
	try {
		window.localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(normalized));
		if (options.markChanged !== false) {
			markLocalAppChanged();
		}
	} catch {
		// Timer persistence is local convenience; a blocked write should not break the app.
	}
	return normalized;
}

function normalizeTimerSettings(value) {
	const alarmIds = new Set(MENU_TIMER_ALARMS.map((alarm) => alarm.id));
	const alarm = alarmIds.has(value?.alarm) ? value.alarm : "bell";
	const volume = Math.min(
		100,
		Math.max(0, Math.round(Number(value?.volume ?? 70))),
	);
	return { alarm, volume };
}

function loadTimerSettings() {
	try {
		const raw = window.localStorage.getItem(TIMER_SETTINGS_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		const normalized = normalizeTimerSettings(parsed);
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(
				TIMER_SETTINGS_KEY,
				JSON.stringify(normalized),
			);
		}
		return normalized;
	} catch {
		return normalizeTimerSettings();
	}
}

function saveTimerSettings(settings = state.timerSettings) {
	const normalized = normalizeTimerSettings(settings);
	try {
		window.localStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify(normalized));
		markLocalAppChanged();
	} catch {
		// Timer settings can fall back to in-memory values if localStorage is blocked.
	}
	return normalized;
}

function normalizeTracker(tracker, dashboard, index, fallbackType = "Thought") {
	const rawId = String(
		tracker?.id ||
			`${dashboard.toLowerCase()}-tracker-${index}-${makeId("tracker")}`,
	);
	const id = TRACKER_ID_MIGRATIONS[rawId] || rawId;
	const rawLabel =
		String(tracker?.label || "").trim() || `${fallbackType} ${index + 1}`;
	const migration = TRACKER_LABEL_MIGRATIONS[id];
	const label = migration?.from.includes(rawLabel) ? migration.to : rawLabel;
	const icon =
		normalizeIconSource(
			tracker?.icon || tracker?.source || tracker?.url || "tabler:circle",
		) || "tabler:circle";
	const normalized = {
		id,
		label,
		icon,
	};
	if (typeof tracker?.enabled === "boolean") {
		normalized.enabled = tracker.enabled;
	}
	if (typeof tracker?.isGoal === "boolean") {
		normalized.isGoal = tracker.isGoal;
	}
	if (tracker?.frequency || tracker?.customDays) {
		Object.assign(normalized, normalizeGoalFrequency(tracker));
	}
	return normalized;
}

function normalizeGoalFrequency(value) {
	const fallback = GOAL_FREQUENCY_OPTIONS[0];
	const optionIds = new Set(GOAL_FREQUENCY_OPTIONS.map((option) => option.id));
	const frequency = optionIds.has(value?.frequency)
		? value.frequency
		: fallback.id;
	const customDays = Math.min(
		365,
		Math.max(
			1,
			Math.round(
				Number(value?.customDays) ||
					GOAL_FREQUENCY_OPTIONS.find((option) => option.id === "custom")
						?.days ||
					10,
			),
		),
	);
	return { frequency, customDays };
}

function goalFrequencyOptionsHtml(value) {
	const { frequency } = normalizeGoalFrequency(value);
	return GOAL_FREQUENCY_OPTIONS.map(
		(option) =>
			`<option value="${escapeHtml(option.id)}"${frequency === option.id ? " selected" : ""}>${escapeHtml(option.label)}</option>`,
	).join("");
}

function normalizeGoalTracker(goal, dashboard, index) {
	const normalized = normalizeTracker(goal, dashboard, index, "Goal");
	const frequency = normalizeGoalFrequency(goal);
	return {
		...normalized,
		...frequency,
		isGoal: true,
		enabled: typeof goal?.enabled === "boolean" ? goal.enabled : true,
	};
}

function normalizeTrackerSettings(value, defaults = cloneDefaultTrackersForSpace()) {
	return Object.fromEntries(
		DASHBOARD_LABELS.map((dashboard) => {
			const trackers = Array.isArray(value?.[dashboard])
				? value[dashboard].map((tracker, index) =>
						normalizeTracker(tracker, dashboard, index),
					)
				: defaults[dashboard];
			return [dashboard, trackers];
		}),
	);
}

function normalizeGoalSettings(value, defaults = cloneDefaultGoalsForSpace()) {
	return Object.fromEntries(
		DASHBOARD_LABELS.map((dashboard) => {
			const normalizedGoals = Array.isArray(value?.[dashboard])
				? value[dashboard].map((goal, index) =>
						normalizeGoalTracker(goal, dashboard, index),
					)
				: defaults[dashboard];
			const defaultIds = new Set(
				(DEFAULT_GOALS[dashboard] || []).map((goal) => goal.id),
			);
			const allDefaultGoals =
				normalizedGoals.length > 0 &&
				normalizedGoals.every((goal) => defaultIds.has(goal.id));
			const goals =
				allDefaultGoals && !normalizedGoals.some((goal) => goal.enabled)
					? normalizedGoals.map((goal) => ({ ...goal, enabled: true }))
					: normalizedGoals;
			return [dashboard, goals];
		}),
	);
}

function loadTrackerSettings() {
	try {
		const raw = window.localStorage.getItem(TRACKER_SETTINGS_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		const normalized = parsed
			? normalizeTrackerSettings(parsed)
			: cloneDefaultTrackersForSpace();
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(
				TRACKER_SETTINGS_KEY,
				JSON.stringify(normalized),
			);
		}
		return normalized;
	} catch {
		return cloneDefaultTrackersForSpace();
	}
}

function saveTrackerSettings() {
	window.localStorage.setItem(
		TRACKER_SETTINGS_KEY,
		JSON.stringify(state.trackerSettings),
	);
	markLocalAppChanged();
}

function loadGoalSettings() {
	try {
		const raw = window.localStorage.getItem(GOAL_SETTINGS_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		const normalized = parsed
			? normalizeGoalSettings(parsed)
			: cloneDefaultGoalsForSpace();
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(
				GOAL_SETTINGS_KEY,
				JSON.stringify(normalized),
			);
		}
		return normalized;
	} catch {
		return cloneDefaultGoalsForSpace();
	}
}

function saveGoalSettings() {
	window.localStorage.setItem(
		GOAL_SETTINGS_KEY,
		JSON.stringify(state.goalSettings),
	);
	markLocalAppChanged();
}

function loadSidebarWidth() {
	try {
		return clampSidebarWidth(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
	} catch {
		return SIDEBAR_DEFAULT_WIDTH;
	}
}

function saveSidebarWidth(width) {
	try {
		window.localStorage.setItem(
			SIDEBAR_WIDTH_KEY,
			String(clampSidebarWidth(width)),
		);
	} catch {
		// Width persistence is a convenience; resizing should keep working if storage is blocked.
	}
}

function normalizeTheme(value) {
	return normalizeThemeSelection(value, {
		themes: APP_THEMES,
		fallbackId: "default",
	});
}

function loadTheme() {
	return loadThemeSelection({
		storageKey: THEME_KEY,
		themes: APP_THEMES,
		fallbackId: "default",
	});
}

function saveTheme(theme) {
	const saved = saveThemeSelection(theme, {
		storageKey: THEME_KEY,
		themes: APP_THEMES,
		fallbackId: "default",
	});
	markLocalAppChanged();
	return saved;
}

function loadPyxdiaSettings() {
	try {
		const raw = window.localStorage.getItem(PYXIDA_SETTINGS_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		const normalized = normalizePyxdiaSettings(parsed);
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(
				PYXIDA_SETTINGS_KEY,
				JSON.stringify(normalized),
			);
		}
		return normalized;
	} catch {
		return normalizePyxdiaSettings(DEFAULT_PYXIDA_SETTINGS);
	}
}

function savePyxdiaSettingsLocal(settings = state.pyxdiaSettings) {
	const normalized = normalizePyxdiaSettings(settings);
	window.localStorage.setItem(PYXIDA_SETTINGS_KEY, JSON.stringify(normalized));
	return normalized;
}

function createEmptyPyxdiaMemory() {
	const staticMemory = normalizePyxdiaStaticMemory();
	const dynamicRetrievalMemory = normalizePyxdiaDynamicRetrievalMemory();
	return {
		owner: "",
		title: "Pen Pal memories",
		summary: "",
		recurringThemes: [],
		userStatedGoals: [],
		emotionalPatterns: [],
		values: [],
		possibleArchetypePatterns: [],
		guidancePreferences: [],
		priorLetterContext: [],
		entries: [],
		staticMemory,
		dynamicRetrievalMemory,
		lastCompactedAt: "",
		updatedAt: "",
		schemaVersion: 1,
	};
}

function createEmptyPyxdiaDraft() {
	const userSelectedContext = normalizePyxdiaUserSelectedContext();
	const clientLetterId = makeId("pyxdia-letter");
	return {
		id: "local-draft",
		clientLetterId,
		threadId: "",
		state: "draft",
		recipientType: "pyxdia",
		recipientUid: "pyxdia",
		recipientLabel: "PYXIDA",
		toUid: "pyxdia",
		toLabel: "PYXIDA",
		inputText: "",
		imageRefs: [],
		includedNoteRefs: [],
		userIncludedContext: "",
		userSelectedContext,
		contextSelections: [],
		noteSelectionMode: "all",
		updatedAt: "",
		schemaVersion: 1,
	};
}

function normalizePyxdiaImageRefs(value = []) {
	return Array.isArray(value)
		? value
				.filter((item) => item?.id && item?.storagePath)
				.slice(0, 24)
				.map((item) => ({
					id: String(item.id || ""),
					letterId: String(item.letterId || ""),
					name: String(item.name || "image"),
					type: String(item.type || "image/png"),
					size: Math.max(0, Number(item.size) || 0),
					storagePath: String(item.storagePath || ""),
					createdAt: normalizeIsoTimestamp(item.createdAt) || "",
					schemaVersion: 1,
				}))
		: [];
}

function createEmptyPyxdiaLocalState() {
	return {
		schemaVersion: 1,
		threads: [],
		letters: [],
		draft: createEmptyPyxdiaDraft(),
		memory: createEmptyPyxdiaMemory(),
	};
}

function normalizePyxdiaRecipientType(value) {
	return String(value || "").toLowerCase() === "family" ? "family" : "pyxdia";
}

function safePyxdiaRecipientLabel(value, fallback = "Family member") {
	return String(value || fallback)
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 80) || fallback;
}

function normalizePyxdiaReadBy(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	return Object.fromEntries(
		Object.entries(source)
			.map(([key, readAt]) => [String(key || ""), String(readAt || "")])
			.filter(([key, readAt]) => key && readAt),
	);
}

function normalizePyxdiaCorrespondent(value = {}) {
	const uid = String(value.uid || value.recipientUid || "").trim();
	if (!uid) {
		return null;
	}
	return {
		uid,
		label: safePyxdiaRecipientLabel(value.label || value.displayName || value.email),
		recipientType: "family",
		role: String(value.role || ""),
		unreadCount: Math.max(0, Number(value.unreadCount) || 0),
	};
}

function normalizePyxdiaDraft(value = {}) {
	const fallback = createEmptyPyxdiaDraft();
	const draft = value && typeof value === "object" ? value : {};
	const rawContextSelections =
		draft.userSelectedContext?.contextSelections ??
		draft.contextSelections ??
		[];
	const rawSelectedNoteRefs =
		draft.userSelectedContext?.selectedNoteRefs ?? draft.includedNoteRefs ?? [];
	const hasCustomSelection =
		String(draft.noteSelectionMode || "") === "custom" ||
		(!draft.noteSelectionMode &&
			((Array.isArray(rawContextSelections) &&
				rawContextSelections.length > 0) ||
				(Array.isArray(rawSelectedNoteRefs) &&
					rawSelectedNoteRefs.length > 0)));
	const noteSelectionMode = hasCustomSelection ? "custom" : "all";
	const userSelectedContext = normalizePyxdiaUserSelectedContext({
		...(draft.userSelectedContext || {}),
		manualText:
			draft.userSelectedContext?.manualText ?? draft.userIncludedContext ?? "",
		selectedNoteRefs: rawSelectedNoteRefs,
		contextSelections: rawContextSelections,
		balanceStatistics: draft.userSelectedContext?.balanceStatistics,
	});
	return {
		...fallback,
		...draft,
		id: String(draft.id || fallback.id),
		clientLetterId: String(
			draft.clientLetterId || draft.letterId || fallback.clientLetterId,
		),
		threadId: String(draft.threadId || ""),
		state: "draft",
		recipientType: normalizePyxdiaRecipientType(draft.recipientType),
		recipientUid: String(draft.recipientUid || draft.toUid || fallback.recipientUid),
		recipientLabel: safePyxdiaRecipientLabel(
			draft.recipientLabel || draft.toLabel || fallback.recipientLabel,
			"PYXIDA",
		),
		toUid: String(draft.toUid || draft.recipientUid || fallback.toUid),
		toLabel: safePyxdiaRecipientLabel(
			draft.toLabel || draft.recipientLabel || fallback.toLabel,
			"PYXIDA",
		),
		inputText: String(draft.inputText || ""),
		imageRefs: normalizePyxdiaImageRefs(draft.imageRefs),
		includedNoteRefs: userSelectedContext.selectedNoteRefs,
		userIncludedContext: userSelectedContext.manualText,
		userSelectedContext,
		contextSelections: userSelectedContext.contextSelections,
		noteSelectionMode,
		updatedAt: normalizeIsoTimestamp(draft.updatedAt) || "",
		schemaVersion: 1,
	};
}

function normalizePyxdiaThread(value = {}) {
	return {
		id: String(value.id || ""),
		owner: String(value.owner || ""),
		title: String(value.title || "Pen Pal letter thread"),
		status: String(value.status || "active"),
		recipientType: normalizePyxdiaRecipientType(value.recipientType),
		participantUids: Array.isArray(value.participantUids)
			? value.participantUids.map(String).filter(Boolean)
			: [],
		letterIds: Array.isArray(value.letterIds)
			? value.letterIds.map(String).filter(Boolean)
			: [],
		latestLetterId: String(value.latestLetterId || ""),
		latestState: String(value.latestState || "draft"),
		createdAt: normalizeIsoTimestamp(value.createdAt) || "",
		updatedAt: normalizeIsoTimestamp(value.updatedAt) || "",
		schemaVersion: 1,
	};
}

function normalizePyxdiaLetter(value = {}) {
	const userSelectedContext = normalizePyxdiaUserSelectedContext({
		...(value.userSelectedContext || {}),
		manualText:
			value.userSelectedContext?.manualText ?? value.userIncludedContext ?? "",
		selectedNoteRefs:
			value.userSelectedContext?.selectedNoteRefs ??
			value.includedNoteRefs ??
			[],
		contextSelections:
			value.userSelectedContext?.contextSelections ??
			value.contextSelections ??
			[],
	});
	return {
		id: String(value.id || ""),
		threadId: String(value.threadId || ""),
		owner: String(value.owner || ""),
		createdBy: String(value.createdBy || value.owner || ""),
		updatedBy: String(value.updatedBy || ""),
		authorDisplayName: String(value.authorDisplayName || ""),
		authorEmail: String(value.authorEmail || ""),
		authorLabel: String(
			value.authorLabel ||
				value.safeAuthorDisplay ||
				value.authorDisplayName ||
				value.authorEmail ||
				"",
		),
		recipientType: normalizePyxdiaRecipientType(value.recipientType),
		recipientUid: String(value.recipientUid || value.toUid || ""),
		recipientLabel: safePyxdiaRecipientLabel(
			value.recipientLabel || value.toLabel || "PYXIDA",
			"PYXIDA",
		),
		fromUid: String(value.fromUid || value.createdBy || value.owner || ""),
		fromLabel: safePyxdiaRecipientLabel(
			value.fromLabel || value.authorLabel || value.authorDisplayName || "You",
			"You",
		),
		toUid: String(value.toUid || value.recipientUid || "pyxdia"),
		toLabel: safePyxdiaRecipientLabel(
			value.toLabel || value.recipientLabel || "PYXIDA",
			"PYXIDA",
		),
		participantUids: Array.isArray(value.participantUids)
			? value.participantUids.map(String).filter(Boolean)
			: [],
		readBy: normalizePyxdiaReadBy(value.readBy),
		state: String(value.state || "draft"),
		inputText: String(value.inputText || ""),
		scrubbedInputText: String(value.scrubbedInputText || ""),
		outputText: String(value.outputText || ""),
		imageRefs: normalizePyxdiaImageRefs(value.imageRefs),
		includedNoteRefs: userSelectedContext.selectedNoteRefs,
		userIncludedContext: userSelectedContext.manualText,
		userSelectedContext,
		contextSelections: userSelectedContext.contextSelections,
		staticMemorySnapshot: normalizePyxdiaStaticMemory(
			value.staticMemorySnapshot,
		),
		dynamicRetrievalMemory: normalizePyxdiaDynamicRetrievalMemory(
			value.dynamicRetrievalMemory,
		),
		scrubReportSummary:
			value.scrubReportSummary && typeof value.scrubReportSummary === "object"
				? value.scrubReportSummary
				: { wasScrubbed: false, redactionCount: 0, blocked: false },
		submittedAt: normalizeIsoTimestamp(value.submittedAt) || null,
		queuedAt: normalizeIsoTimestamp(value.queuedAt) || null,
		availableAt: normalizeIsoTimestamp(value.availableAt) || null,
		processingAt: normalizeIsoTimestamp(value.processingAt) || null,
		completedAt: normalizeIsoTimestamp(value.completedAt) || null,
		failedAt: normalizeIsoTimestamp(value.failedAt) || null,
		errorCode: String(value.errorCode || ""),
		errorMessageSafe: String(value.errorMessageSafe || ""),
		modelName: String(value.modelName || ""),
		deleted: value.deleted === true,
		deletedAt: normalizeIsoTimestamp(value.deletedAt) || null,
		deleteAfter: normalizeIsoTimestamp(value.deleteAfter) || null,
		deletedBy: String(value.deletedBy || ""),
		deleteMode: String(value.deleteMode || ""),
		originalCollection: String(value.originalCollection || ""),
		createdAt: normalizeIsoTimestamp(value.createdAt) || "",
		updatedAt: normalizeIsoTimestamp(value.updatedAt) || "",
		schemaVersion: 1,
	};
}

function normalizePyxdiaMemory(value = {}) {
	const fallback = createEmptyPyxdiaMemory();
	const memory = value && typeof value === "object" ? value : {};
	const staticMemory = normalizePyxdiaStaticMemory({
		...(memory.staticMemory || {}),
		summary: memory.staticMemory?.summary || memory.summary || "",
		entries: memory.staticMemory?.entries || memory.entries || [],
		updatedAt: memory.staticMemory?.updatedAt || memory.updatedAt || "",
	});
	const dynamicRetrievalMemory = normalizePyxdiaDynamicRetrievalMemory(
		memory.dynamicRetrievalMemory,
	);
	const entries = staticMemory.entries.length
		? staticMemory.entries.map((entry) => ({
				id: entry.id || makeId("pyxdia-memory"),
				text: entry.text || entry.summary,
				reasonRemembered: entry.reasonRemembered,
				sourceLetterIds: entry.sourceLetterIds,
				sensitivity: entry.sensitivity,
				createdAt: normalizeIsoTimestamp(entry.createdAt) || nowIso(),
				updatedAt: normalizeIsoTimestamp(entry.updatedAt) || nowIso(),
			}))
		: Array.isArray(memory.entries)
			? memory.entries
					.filter((entry) => entry?.text)
					.slice(-50)
					.map((entry) => ({
						id: String(entry.id || makeId("pyxdia-memory")),
						text: String(entry.text || ""),
						reasonRemembered: String(entry.reasonRemembered || ""),
						sourceLetterIds: Array.isArray(entry.sourceLetterIds)
							? entry.sourceLetterIds.map(String).filter(Boolean)
							: [],
						sensitivity: String(entry.sensitivity || "private_minimized"),
						createdAt: normalizeIsoTimestamp(entry.createdAt) || nowIso(),
						updatedAt: normalizeIsoTimestamp(entry.updatedAt) || nowIso(),
					}))
			: [];
	return {
		...fallback,
		...memory,
		title: String(memory.title || fallback.title),
		summary: String(memory.summary || staticMemory.summary || ""),
		entries,
		staticMemory,
		dynamicRetrievalMemory,
		updatedAt: normalizeIsoTimestamp(memory.updatedAt) || "",
		lastCompactedAt: normalizeIsoTimestamp(memory.lastCompactedAt) || "",
		schemaVersion: 1,
	};
}

function normalizePyxdiaLocalState(value = {}) {
	const fallback = createEmptyPyxdiaLocalState();
	const source = value && typeof value === "object" ? value : {};
	return {
		schemaVersion: 1,
		threads: Array.isArray(source.threads)
			? source.threads.map(normalizePyxdiaThread).filter((item) => item.id)
			: fallback.threads,
		letters: Array.isArray(source.letters)
			? source.letters.map(normalizePyxdiaLetter).filter((item) => item.id)
			: fallback.letters,
		draft: normalizePyxdiaDraft(source.draft || fallback.draft),
		memory: normalizePyxdiaMemory(source.memory || fallback.memory),
	};
}

function loadPyxdiaLocalState() {
	try {
		const raw = window.localStorage.getItem(PYXIDA_LOCAL_STATE_KEY);
		return normalizePyxdiaLocalState(raw ? JSON.parse(raw) : null);
	} catch {
		return createEmptyPyxdiaLocalState();
	}
}

function savePyxdiaLocalState() {
	const next = normalizePyxdiaLocalState({
		threads: state.pyxdiaThreads,
		letters: state.pyxdiaLetters,
		draft: state.pyxdiaDraft,
		memory: state.pyxdiaMemory,
	});
	window.localStorage.setItem(PYXIDA_LOCAL_STATE_KEY, JSON.stringify(next));
	return next;
}

function loadDismissedTips() {
	try {
		const parsed = JSON.parse(
			window.localStorage.getItem(DISMISSED_TIPS_KEY) || "[]",
		);
		return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
	} catch {
		return [];
	}
}

function saveDismissedTips(tips = state.dismissedTips) {
	window.localStorage.setItem(
		DISMISSED_TIPS_KEY,
		JSON.stringify(Array.from(new Set(tips || []))),
	);
}

function clearDismissedTips() {
	try {
		window.localStorage.removeItem(DISMISSED_TIPS_KEY);
	} catch {
		// Tip dismissal state is optional; reset should continue if storage is blocked.
	}
	state.dismissedTips = [];
}

function simpleTooltipText(value, maxWords = SIMPLE_TOOLTIP_WORD_LIMIT) {
	const text = String(value || "")
		.trim()
		.replace(/\s+/g, " ");
	if (!text) {
		return "";
	}
	const words = text.split(" ");
	return words.slice(0, maxWords).join(" ");
}

function rememberDismissedTip(tip) {
	if (!tip) {
		return;
	}
	const dismissedTips = Array.from(
		new Set([...(state.dismissedTips || []), tip]),
	);
	state.dismissedTips = dismissedTips;
	saveDismissedTips(dismissedTips);
}

function setCoreTooltip(element, label, options = {}) {
	if (!element) {
		return;
	}
	if (!options.override && element.dataset.thoughtTooltip) {
		return;
	}
	const text = simpleTooltipText(label);
	if (!text) {
		return;
	}
	element.dataset.thoughtTooltip = text;
	if (!element.getAttribute("aria-label") && !element.textContent.trim()) {
		element.setAttribute("aria-label", text);
	}
	if (!element.getAttribute("title")) {
		element.setAttribute("title", text);
	}
}

function applyCoreTooltips() {
	const coreRules = [
		[".dashboard-home-link", "Return home"],
		[".dashboard-period-range", "Change time range"],
		[".dashboard-chart-switcher [data-chart='orbs']", "Orbs"],
		[".dashboard-chart-switcher [data-chart='pie']", "Pie chart"],
		[".dashboard-chart-switcher [data-chart='bar']", "Bar chart"],
		[".sidebar-menu-nav-button", "Toggle side sections"],
		[".sidebar-text-link[data-action='open-settings']", "Open settings"],
		[".sidebar-text-link[data-action='open-gallery']", "Open gallery"],
		[".cloud-action-nav [data-action='import-artifacts']", "Import data"],
		[".cloud-action-nav [data-action='export-artifacts']", "Export data"],
		[".reader-page-indicator", "Open overview"],
		[".compendium-rotator-edge--prev", "Previous compendiums"],
		[".compendium-rotator-edge--next", "Next compendiums"],
		[".tracker-page-controls [data-direction='prev']", "Previous orbs"],
		[".tracker-page-controls [data-direction='next']", "Next orbs"],
		[".sidebar-page-controls [data-direction='prev']", "Previous page"],
		[".sidebar-page-controls [data-direction='next']", "Next page"],
	];

	coreRules.forEach(([selector, label]) => {
		app.querySelectorAll(selector).forEach((element) => {
			setCoreTooltip(element, label);
		});
	});

	app.querySelectorAll(".mobile-menu-toggle").forEach((element) => {
		setCoreTooltip(element, state.mobileMenuOpen ? "Close menu" : "Open menu", {
			override: true,
		});
	});

	DASHBOARD_LABELS.forEach((dashboard) => {
		app
			.querySelectorAll(`.dashboard-card[data-section='${dashboard}']`)
			.forEach((element) => {
				setCoreTooltip(element, `Open ${dashboardDisplayLabel(dashboard)}`);
			});
		app
			.querySelectorAll(`.sidebar-group-toggle[data-section='${dashboard}']`)
			.forEach((element) => {
				setCoreTooltip(element, `Open ${dashboardDisplayLabel(dashboard)}`);
			});
	});

	app.querySelectorAll(".body-mode-button, .icon-button").forEach((button) => {
		setCoreTooltip(button, headerActionLabel(button));
	});
}

let appliedThemeId = "";

function applyThemeVariables(themeId) {
	const normalizedTheme = normalizeTheme(themeId);
	const root = document.documentElement;
	if (
		appliedThemeId === normalizedTheme &&
		app.dataset.theme === normalizedTheme &&
		root.classList.contains(`theme-${normalizedTheme}`)
	) {
		return null;
	}
	appliedThemeId = normalizedTheme;
	return applyThemeSystemVariables(normalizedTheme, {
		themes: APP_THEMES,
		fontSets: THEME_FONT_SETS,
		fallbackId: "default",
		target: app,
	});
}

function applyColorMode(mode = state.colorMode) {
	const colorMode = normalizeColorMode(mode);
	const root = document.documentElement;
	root.classList.toggle(
		"theme-accessibility-colorblind",
		colorMode === "colorblind",
	);
	root.dataset.colorMode = colorMode;
	app.dataset.colorMode = colorMode;
}

function themeFontLabel(theme) {
	return themeSystemFontLabel(theme, {
		fontSets: THEME_FONT_SETS,
		fallbackFontSet: "classic",
	});
}

function themePaletteHtml(theme) {
	const colors = themeColors(theme);
	return `
    <span class="theme-choice-palette" aria-label="${escapeHtml(`${theme.label} color parameters`)}">
      ${THEME_COLOR_FIELDS.map((field) => {
				const color = colors[field];
				return `
          <span
            class="theme-choice-swatch"
            style="--theme-swatch-color: ${escapeHtml(color)};"
            data-theme-label="${escapeHtml(field)}"
            data-thought-tooltip="${escapeHtml(field)}"
            title="${escapeHtml(field)}"
            aria-hidden="true"
          ></span>
        `;
			}).join("")}
    </span>
  `;
}

function loadIconifySearchCache() {
	try {
		const parsed = JSON.parse(
			window.localStorage.getItem(ICONIFY_SEARCH_CACHE_KEY),
		);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

function saveIconifySearchCache(cache) {
	try {
		window.localStorage.setItem(
			ICONIFY_SEARCH_CACHE_KEY,
			JSON.stringify(cache),
		);
	} catch {
		// Icon search should still work without persistence.
	}
}

function createDefaultBodyTimer(config) {
	return {
		active: false,
		label: config.defaultLabel,
		targetHours: config.defaultTargetHours,
		startTimestamp: null,
		lastCompletedHours: 0,
	};
}

function createDefaultBodyTracker() {
	const timers = Object.fromEntries(
		BODY_TIMER_MODES.filter((config) => config.stateKey !== "fast").map(
			(config) => [config.stateKey, createDefaultBodyTimer(config)],
		),
	);
	return {
		fast: createDefaultBodyTimer(BODY_TIMER_MODES[0]),
		timers,
		nutrition: {
			dateKey: todayDateKey(),
			targetCalories: 2000,
			targetProtein: 120,
			targetCarbs: 200,
			targetFat: 70,
			calories: 0,
			protein: 0,
			carbs: 0,
			fat: 0,
			note: "",
		},
		workouts: [],
	};
}

function normalizeBodyTimer(value, config) {
	const defaults = createDefaultBodyTimer(config);
	return {
		...defaults,
		...(value || {}),
		label: String(value?.label || defaults.label),
		targetHours: Math.max(
			1 / 60,
			Number(value?.targetHours ?? defaults.targetHours) ||
				defaults.targetHours,
		),
		active: Boolean(value?.active),
		startTimestamp: value?.startTimestamp || null,
		lastCompletedHours: Math.max(0, Number(value?.lastCompletedHours) || 0),
	};
}

function normalizeBodyTracker(value) {
	const defaults = createDefaultBodyTracker();
	const timers = { ...defaults.timers };
	BODY_TIMER_MODES.filter((config) => config.stateKey !== "fast").forEach(
		(config) => {
			timers[config.stateKey] = normalizeBodyTimer(
				value?.timers?.[config.stateKey],
				config,
			);
		},
	);
	return {
		...defaults,
		...(value || {}),
		fast: normalizeBodyTimer(value?.fast, BODY_TIMER_MODES[0]),
		timers,
		nutrition: { ...defaults.nutrition, ...(value?.nutrition || {}) },
		workouts: Array.isArray(value?.workouts) ? value.workouts : [],
	};
}

function loadBodyTracker() {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(BODY_TRACKER_KEY));
		if (!parsed?.fast || !parsed?.nutrition) {
			return createDefaultBodyTracker();
		}
		const normalized = normalizeBodyTracker(parsed);
		if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(BODY_TRACKER_KEY, JSON.stringify(normalized));
		}
		return normalized;
	} catch {
		return createDefaultBodyTracker();
	}
}

function saveBodyTracker() {
	window.localStorage.setItem(
		BODY_TRACKER_KEY,
		JSON.stringify(state.bodyTracker),
	);
	markLocalAppChanged();
}

function loadSpiritProgress() {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(SPIRIT_PROGRESS_KEY));
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

function saveSpiritProgress() {
	window.localStorage.setItem(
		SPIRIT_PROGRESS_KEY,
		JSON.stringify(state.spiritProgress),
	);
	markLocalAppChanged();
}

function currentTimestampLabel() {
	return new Date().toLocaleString();
}

function nowIso() {
	return new Date().toISOString();
}

function normalizeIsoTimestamp(value) {
	const time = Date.parse(value || "");
	return Number.isNaN(time) ? "" : new Date(time).toISOString();
}

function _compareIsoTimestamps(left, right) {
	const leftTime = Date.parse(left || "");
	const rightTime = Date.parse(right || "");
	const hasLeft = !Number.isNaN(leftTime);
	const hasRight = !Number.isNaN(rightTime);
	if (!hasLeft && !hasRight) {
		return 0;
	}
	if (hasLeft && !hasRight) {
		return 1;
	}
	if (!hasLeft && hasRight) {
		return -1;
	}
	const diff = leftTime - rightTime;
	if (Math.abs(diff) <= CLOUD_SYNC_CLOCK_SKEW_MS) {
		return 0;
	}
	return diff > 0 ? 1 : -1;
}

function latestIsoTimestamp(values) {
	return (
		values
			.map(normalizeIsoTimestamp)
			.filter(Boolean)
			.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || ""
	);
}

function collectIsoTimestamp(value, bucket) {
	const normalized = normalizeIsoTimestamp(value);
	if (normalized) {
		bucket.push(normalized);
	}
}

function collectLifeEntityTimestamps(entity, bucket) {
	if (!entity) {
		return;
	}
	collectIsoTimestamp(entity.edited, bucket);
	collectIsoTimestamp(entity.created, bucket);
	(entity.attachments || []).forEach((attachment) => {
		collectIsoTimestamp(attachment.created, bucket);
		collectIsoTimestamp(attachment.edited, bucket);
	});
}

function deriveLocalAppUpdatedAt() {
	const candidates = [];
	(state.artifactStore?.artifacts || []).forEach((artifact) => {
		collectIsoTimestamp(artifact.edited, candidates);
		collectIsoTimestamp(artifact.created, candidates);
		(artifact.properties?.audit || []).forEach((entry) => {
			collectIsoTimestamp(entry.at, candidates);
		});
	});
	(state.bodyTracker?.workouts || []).forEach((workout) => {
		collectIsoTimestamp(workout.edited, candidates);
		collectIsoTimestamp(workout.created, candidates);
	});
	(state.lifePlanner?.todos || []).forEach((todo) => {
		collectLifeEntityTimestamps(todo, candidates);
	});
	(state.lifePlanner?.projects || []).forEach((project) => {
		collectLifeEntityTimestamps(project, candidates);
		(project.phases || []).forEach((phase) => {
			collectLifeEntityTimestamps(phase, candidates);
			(phase.tasks || []).forEach((task) => {
				collectLifeEntityTimestamps(task, candidates);
			});
		});
	});
	return latestIsoTimestamp(candidates);
}

function loadLocalAppUpdatedAt() {
	try {
		return normalizeIsoTimestamp(
			window.localStorage.getItem(LOCAL_APP_UPDATED_AT_KEY),
		);
	} catch {
		return "";
	}
}

function loadAppearanceUpdatedAt() {
	try {
		return normalizeIsoTimestamp(
			window.localStorage.getItem(APPEARANCE_UPDATED_AT_KEY),
		);
	} catch {
		return "";
	}
}

function saveLocalAppUpdatedAt(value = nowIso()) {
	const normalized = normalizeIsoTimestamp(value) || nowIso();
	try {
		window.localStorage.setItem(LOCAL_APP_UPDATED_AT_KEY, normalized);
	} catch {
		// Sync can still compare the in-memory timestamp if localStorage is blocked.
	}
	try {
		state.localAppUpdatedAt = normalized;
	} catch {
		// State may not be initialized while helpers are being defined.
	}
	return normalized;
}

function saveAppearanceUpdatedAt(value = nowIso()) {
	const normalized = normalizeIsoTimestamp(value) || nowIso();
	try {
		window.localStorage.setItem(APPEARANCE_UPDATED_AT_KEY, normalized);
	} catch {
		// Appearance can still use in-memory state if localStorage is blocked.
	}
	try {
		state.appearanceUpdatedAt = normalized;
	} catch {
		// State may not be initialized while helpers are being defined.
	}
	return normalized;
}

function markLocalAppChanged(value = nowIso()) {
	if (localChangeTrackingSuppressed > 0) {
		return "";
	}
	const updatedAt = saveLocalAppUpdatedAt(value);
	queueCloudSyncAfterLocalChange();
	return updatedAt;
}

function markAppearanceChanged(value = nowIso()) {
	if (localChangeTrackingSuppressed > 0) {
		return "";
	}
	const updatedAt = saveAppearanceUpdatedAt(value);
	markLocalAppChanged(updatedAt);
	return updatedAt;
}

function markUserInterfaceActivity() {
	lastUserInterfaceActivityAt = Date.now();
}

function isInterfaceIdle() {
	return Date.now() - lastUserInterfaceActivityAt >= CLOUD_SYNC_IDLE_GRACE_MS;
}

function shouldDeferBackgroundSync() {
	return isUserEditingInterface() || !isInterfaceIdle();
}

function scheduleCloudAutoSyncWhenIdle(source = "interval", options = {}) {
	if (cloudAutoSyncIdleTimer) {
		window.clearTimeout(cloudAutoSyncIdleTimer);
	}
	const idleDelay = Math.max(
		isUserEditingInterface() ? CLOUD_SYNC_IDLE_GRACE_MS : 250,
		CLOUD_SYNC_IDLE_GRACE_MS - (Date.now() - lastUserInterfaceActivityAt),
	);
	cloudAutoSyncIdleTimer = window.setTimeout(() => {
		cloudAutoSyncIdleTimer = null;
		void triggerCloudAutoSync(source, { ...options, fromIdleRetry: true });
	}, idleDelay);
}

async function withLocalChangeTrackingSuppressed(action) {
	localChangeTrackingSuppressed += 1;
	try {
		return await action();
	} finally {
		localChangeTrackingSuppressed -= 1;
	}
}

function localAppUpdatedAt(options = {}) {
	const stored = normalizeIsoTimestamp(
		state.localAppUpdatedAt || loadLocalAppUpdatedAt(),
	);
	if (stored) {
		return stored;
	}
	const derived = deriveLocalAppUpdatedAt();
	if (derived && options.persistDerived !== false) {
		saveLocalAppUpdatedAt(derived);
	}
	return derived;
}

function localAppearanceUpdatedAt() {
	return normalizeIsoTimestamp(
		state.appearanceUpdatedAt || loadAppearanceUpdatedAt(),
	);
}

function localCloudOwnerId(cloud = state.cloud) {
	if (cloud?.mode !== "signed-in" || !cloud.user?.uid) {
		return "";
	}
	return `${cloud.isLocalDemo ? "local-demo" : "firebase"}:${cloud.user.uid}`;
}

function loadLocalAppOwner() {
	try {
		return String(
			window.localStorage.getItem(LOCAL_APP_OWNER_KEY) || "",
		).trim();
	} catch {
		return "";
	}
}

function saveLocalAppOwner(ownerId = localCloudOwnerId()) {
	const normalized = String(ownerId || "").trim();
	try {
		if (normalized) {
			window.localStorage.setItem(LOCAL_APP_OWNER_KEY, normalized);
		} else {
			window.localStorage.removeItem(LOCAL_APP_OWNER_KEY);
		}
	} catch {
		// Owner tracking prevents cross-account writes, but sync can still fall back to timestamps.
	}
	return normalized;
}

function removeLocalAppStorageKeys() {
	[
		artifactStorageKey(),
		BODY_TRACKER_KEY,
		SPIRIT_PROGRESS_KEY,
		LIFE_PLANNER_KEY,
		TRACKER_SETTINGS_KEY,
		GOAL_SETTINGS_KEY,
		DASHBOARD_IDENTITY_KEY,
		DASHBOARD_CHART_TABS_KEY,
		THEME_KEY,
		COLOR_MODE_KEY,
		TIMER_STATE_KEY,
		TIMER_SETTINGS_KEY,
		ICONIFY_SEARCH_CACHE_KEY,
		LOCAL_APP_UPDATED_AT_KEY,
		LOCAL_APP_OWNER_KEY,
	].forEach((key) => {
		try {
			window.localStorage.removeItem(key);
		} catch {
			// Local reset should keep going even if one optional key is blocked.
		}
	});
	clearDismissedTips();
}

async function resetLocalAppForAccountSwitch(ownerId) {
	const preserveCloudSettings =
		state.sidebarSubmenu === "settings" && state.settingsTab === "cloud";
	const emptyStore = createEmptyStore();
	removeLocalAppStorageKeys();
	await clearLocalFiles({ deleteRemote: false }).catch(() => {});
	state.artifactStore = emptyStore;
	state.compendiums = [];
	state.bodyTracker = createDefaultBodyTracker();
	state.spiritProgress = {};
	state.lifePlanner = createDefaultLifePlanner();
	state.trackerSettings = cloneDefaultTrackers();
	state.goalSettings = cloneDefaultGoals();
	state.dashboardIdentity = cloneDefaultDashboardIdentity();
	state.theme = "default";
	state.colorMode = "standard";
	state.timerState = normalizeTimerState();
	state.timerSettings = normalizeTimerSettings();
	state.timerOpen = false;
	state.localAppUpdatedAt = "";
	state.settingsTab = preserveCloudSettings ? "cloud" : "getting-started";
	state.trackerAddArea = "";
	state.trackerEditKey = "";
	state.trackerDeleteKey = "";
	state.suppressNextDashboardChartClick = false;
	state.active = "Dashboard";
	state.flipped = null;
	state.mindMode = "grid";
	state.artifactMode = "grid";
	state.selectedCompendiumId = null;
	state.selectedSectionId = null;
	state.selectedArtifactId = null;
	state.selectedSpiritBookKey = null;
	state.lifeTool = "";
	state.selectedLifeProjectId = null;
	state.selectedLifePhaseId = null;
	state.selectedLifeTaskId = null;
	state.galleryImages = null;
	state.gallerySelectedIds = [];
	state.cloudStorageUsage = null;
	saveLocalAppOwner(ownerId);
	render();
}

async function ensureLocalAccountBoundary(cloud = state.cloud) {
	const ownerId = localCloudOwnerId(cloud);
	if (!ownerId) {
		return false;
	}
	const previousOwner = loadLocalAppOwner();
	if (previousOwner && previousOwner !== ownerId && hasStoredLocalData()) {
		await resetLocalAppForAccountSwitch(ownerId);
		return true;
	}
	if (!previousOwner && !hasStoredLocalData()) {
		saveLocalAppOwner(ownerId);
	}
	return false;
}

function saveArtifactStore(store) {
	writeArtifactStore(store);
	markLocalAppChanged();
}

function queueCloudSyncAfterLocalChange() {
	try {
		if (!cloudHasSyncAccess()) {
			return;
		}
		if (cloudAutoSyncDebounceTimer) {
			window.clearTimeout(cloudAutoSyncDebounceTimer);
		}
		cloudAutoSyncDebounceTimer = window.setTimeout(() => {
			cloudAutoSyncDebounceTimer = null;
			void triggerCloudAutoSync("local-change", { force: true });
		}, CLOUD_SYNC_DEBOUNCE_MS);
	} catch {
		// During startup, state and cloud access may not be ready yet.
	}
}

function initialMenuOpen() {
	return false;
}

function isInstalledWebApp() {
	return Boolean(
		window.matchMedia?.(INSTALLED_APP_QUERY).matches ||
			window.navigator?.standalone === true,
	);
}

function isMobileViewport() {
	return Boolean(window.matchMedia?.(MOBILE_MENU_QUERY).matches);
}

function applyEnvironmentClasses() {
	const installed = isInstalledWebApp();
	const mobile = isMobileViewport();
	const theme = normalizeTheme(state?.theme);
	const colorMode = normalizeColorMode(state?.colorMode);
	app.classList.toggle("is-installed-app", installed);
	app.classList.toggle("is-browser-mode", !installed);
	app.classList.toggle("is-mobile-viewport", mobile);
	app.classList.toggle("is-desktop-viewport", !mobile);
	app.dataset.displayMode = installed ? "standalone" : "browser";
	app.dataset.viewportMode = mobile ? "mobile" : "desktop";
	applyThemeVariables(theme);
	applyColorMode(colorMode);
	app.dataset.theme = theme;
}

function bindEnvironmentMedia(media) {
	if (!media) {
		return;
	}
	const update = () => {
		applyEnvironmentClasses();
		render();
	};
	if (typeof media.addEventListener === "function") {
		media.addEventListener("change", update);
	} else if (typeof media.addListener === "function") {
		media.addListener(update);
	}
}

function createDefaultLifePlanner() {
	return {
		schemaVersion: 1,
		todos: [],
		projects: [],
	};
}

function normalizeLifeAttachments(attachments) {
	return Array.isArray(attachments)
		? attachments
				.filter((item) => item?.id)
				.map((item) => ({
					id: item.id,
					name: item.name || item.id,
					type: item.type || "application/octet-stream",
					size: Number(item.size) || 0,
					created: item.created || nowIso(),
					storage: item.storage || "indexeddb",
					futureStoragePath:
						item.futureStoragePath || `life-attachments/${item.id}`,
				}))
		: [];
}

function normalizeLifeAssignment(dateKey, status) {
	const value = dateKey ? dateKeyFromValue(dateKey) : "";
	if (!value || status === "complete") {
		return value;
	}
	return value < todayDateKey() ? "" : value;
}

function normalizeLifeTodo(todo) {
	const status = todo?.status === "complete" ? "complete" : "todo";
	const created = todo?.created || nowIso();
	return {
		id: todo?.id || makeId("todo"),
		title: todo?.title || "Untitled task",
		notes: todo?.notes || "",
		status,
		assignedDate: normalizeLifeAssignment(todo?.assignedDate, status),
		created,
		edited: todo?.edited || created,
	};
}

function normalizeLifeTask(task) {
	const status = ["todo", "active", "waiting", "complete"].includes(
		task?.status,
	)
		? task.status
		: "todo";
	const created = task?.created || nowIso();
	return {
		id: task?.id || makeId("task"),
		title: task?.title || "Untitled task",
		status,
		assignedTo: task?.assignedTo || "",
		assignedDate: normalizeLifeAssignment(task?.assignedDate, status),
		notes: task?.notes || "",
		attachments: normalizeLifeAttachments(task?.attachments),
		created,
		edited: task?.edited || created,
	};
}

function normalizeLifePhase(phase) {
	const status = ["planned", "active", "waiting", "complete"].includes(
		phase?.status,
	)
		? phase.status
		: "planned";
	const created = phase?.created || nowIso();
	return {
		id: phase?.id || makeId("phase"),
		title: phase?.title || "Untitled phase",
		status,
		assignedTo: phase?.assignedTo || "",
		assignedDate: normalizeLifeAssignment(phase?.assignedDate, status),
		notes: phase?.notes || "",
		attachments: normalizeLifeAttachments(phase?.attachments),
		tasks: Array.isArray(phase?.tasks)
			? phase.tasks.map(normalizeLifeTask)
			: [],
		created,
		edited: phase?.edited || created,
	};
}

function normalizeLifeProject(project) {
	const status = ["planned", "active", "waiting", "complete"].includes(
		project?.status,
	)
		? project.status
		: "planned";
	const created = project?.created || nowIso();
	return {
		id: project?.id || makeId("project"),
		title: project?.title || "Untitled project",
		status,
		assignedTo: project?.assignedTo || "",
		assignedDate: normalizeLifeAssignment(project?.assignedDate, status),
		notes: project?.notes || "",
		attachments: normalizeLifeAttachments(project?.attachments),
		phases: Array.isArray(project?.phases)
			? project.phases.map(normalizeLifePhase)
			: [],
		created,
		edited: project?.edited || created,
	};
}

function normalizeLifePlanner(planner) {
	return {
		schemaVersion: 1,
		todos: Array.isArray(planner?.todos)
			? planner.todos.map(normalizeLifeTodo)
			: [],
		projects: Array.isArray(planner?.projects)
			? planner.projects.map(normalizeLifeProject)
			: [],
	};
}

function saveLifePlannerStore(planner) {
	window.localStorage.setItem(LIFE_PLANNER_KEY, JSON.stringify(planner));
	markLocalAppChanged();
}

function loadLifePlanner() {
	try {
		const raw = window.localStorage.getItem(LIFE_PLANNER_KEY);
		const parsed = raw ? JSON.parse(raw) : createDefaultLifePlanner();
		const normalized = normalizeLifePlanner(parsed);
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			saveLifePlannerStore(normalized);
		}
		return normalized;
	} catch {
		return createDefaultLifePlanner();
	}
}

async function exportAppState(options = {}) {
	return {
		bodyTracker: state.bodyTracker || createDefaultBodyTracker(),
		spiritProgress: state.spiritProgress || {},
		lifePlanner: normalizeLifePlanner(
			state.lifePlanner || createDefaultLifePlanner(),
		),
		thoughtSettings: normalizeTrackerSettings(
			state.trackerSettings || cloneDefaultTrackers(),
		),
		goalSettings: normalizeGoalSettings(
			state.goalSettings || cloneDefaultGoals(),
		),
		dashboardIdentity: normalizeDashboardIdentity(
			state.dashboardIdentity || cloneDefaultDashboardIdentity(),
		),
		dashboardChartTabs: normalizeDashboardChartTabs(
			state.dashboardChartTabs || DEFAULT_DASHBOARD_CHART_TABS,
		),
		theme: normalizeTheme(state.theme),
		colorMode: normalizeColorMode(state.colorMode),
		appearanceUpdatedAt: localAppearanceUpdatedAt(),
		timerState: normalizeTimerState(state.timerState),
		timerSettings: normalizeTimerSettings(state.timerSettings),
		cloudMediaKey: await exportCloudMediaKey(),
		localFiles: await exportLocalFiles({
			includeData: options.includeLocalFileData !== false,
		}).catch(() => []),
	};
}

async function exportAppStateJson(options = {}) {
	const artifactStore = options.artifactStore || state.artifactStore;
	const spaceId = normalizeDataSpaceId(options.spaceId || activeSpaceId());
	const space = DATA_SPACES[spaceId] || DATA_SPACES[PERSONAL_SPACE_ID];
	return {
		schemaVersion: SCHEMA_VERSION,
		rootId: artifactStore?.rootId || "ourstuff-root",
		artifacts: Array.isArray(artifactStore?.artifacts)
			? artifactStore.artifacts
			: [],
		metadata: {
			spaceId,
			spaceLabel: space.label,
			cloudAppId: space.cloudAppId,
			localUpdatedAt: localAppUpdatedAt(),
			exportedAt: nowIso(),
			deviceId: state.cloud?.deviceId || "",
		},
		appState: await exportAppState(options),
	};
}

function assertAppStateSpace(json, expectedSpaceId = activeSpaceId()) {
	const normalizedSpaceId = normalizeDataSpaceId(expectedSpaceId);
	const expectedSpace =
		DATA_SPACES[normalizedSpaceId] || DATA_SPACES[PERSONAL_SPACE_ID];
	const metadata =
		json?.metadata && typeof json.metadata === "object" ? json.metadata : {};
	const actualSpaceId = String(metadata.spaceId || "").trim();
	const actualCloudAppId = String(metadata.cloudAppId || metadata.appId || "").trim();
	if (actualSpaceId && normalizeDataSpaceId(actualSpaceId) !== normalizedSpaceId) {
		throw new Error(
			`This export belongs to the ${DATA_SPACES[normalizeDataSpaceId(actualSpaceId)]?.label || actualSpaceId} space, not ${expectedSpace.label}.`,
		);
	}
	if (actualCloudAppId && actualCloudAppId !== expectedSpace.cloudAppId) {
		throw new Error(
			`This export belongs to ${actualCloudAppId}, not ${expectedSpace.cloudAppId}.`,
		);
	}
}

async function restoreImportedAppState(appState) {
	if (!appState) {
		return;
	}
	const bodyTracker = appState?.bodyTracker
		? normalizeBodyTracker(appState.bodyTracker)
		: createDefaultBodyTracker();
	const spiritProgress =
		appState?.spiritProgress && typeof appState.spiritProgress === "object"
			? appState.spiritProgress
			: {};
	const lifePlanner = normalizeLifePlanner(
		appState?.lifePlanner || createDefaultLifePlanner(),
	);
	const trackerSettings = normalizeTrackerSettings(
		appState?.thoughtSettings ||
			appState?.trackerSettings ||
			cloneDefaultTrackersForSpace(),
	);
	const goalSettings = normalizeGoalSettings(
		appState?.goalSettings || appState?.goals || cloneDefaultGoalsForSpace(),
	);
	const dashboardIdentity = normalizeDashboardIdentity(
		appState?.dashboardIdentity || cloneDefaultDashboardIdentity(),
	);
	const dashboardChartTabs = normalizeDashboardChartTabs(
		appState?.dashboardChartTabs || DEFAULT_DASHBOARD_CHART_TABS,
	);
	const theme = normalizeTheme(appState?.theme || state.theme);
	const colorMode = normalizeColorMode(appState?.colorMode || state.colorMode);
	const appearanceUpdatedAt = normalizeIsoTimestamp(
		appState?.appearanceUpdatedAt,
	);
	const timerState = normalizeTimerState(appState?.timerState || state.timerState);
	const timerSettings = normalizeTimerSettings(
		appState?.timerSettings || state.timerSettings,
	);

	state.bodyTracker = bodyTracker;
	state.spiritProgress = spiritProgress;
	state.lifePlanner = lifePlanner;
	state.trackerSettings = trackerSettings;
	state.goalSettings = goalSettings;
	state.dashboardIdentity = dashboardIdentity;
	state.dashboardChartTabs = dashboardChartTabs;
	state.dashboardChartType =
		dashboardChartTabs[0] || DEFAULT_DASHBOARD_CHART_TABS[0];
	state.theme = theme;
	state.colorMode = colorMode;
	state.timerState = timerState;
	state.timerSettings = timerSettings;
	saveBodyTracker();
	saveSpiritProgress();
	saveLifePlannerStore(lifePlanner);
	saveTrackerSettings();
	saveGoalSettings();
	saveDashboardIdentity(dashboardIdentity);
	saveDashboardChartTabs(dashboardChartTabs);
	saveTheme(theme);
	saveColorMode(colorMode);
	if (appearanceUpdatedAt) {
		saveAppearanceUpdatedAt(appearanceUpdatedAt);
	}
	saveTimerState(timerState);
	saveTimerSettings(timerSettings);
	if (timerState.running) {
		startTimerInterval();
	} else {
		stopTimerInterval();
	}
	if (appState.cloudMediaKey) {
		importCloudMediaKey(appState.cloudMediaKey);
	}
	if (Array.isArray(appState.localFiles)) {
		await importLocalFiles(appState.localFiles, localMediaImportOptions());
		scheduleCloudStorageUsageRefresh({ force: true });
	}
}

async function importAppStateJson(json, options = {}) {
	if (
		json?.schemaVersion !== SCHEMA_VERSION ||
		!Array.isArray(json.artifacts)
	) {
		throw new Error("Cloud state is not a valid Ourstuff app export.");
	}
	assertAppStateSpace(json, options.spaceId || activeSpaceId());
	const importedStore = {
		schemaVersion: json.schemaVersion,
		rootId: json.rootId || "ourstuff-root",
		artifacts: json.artifacts,
	};
	const sourceUpdatedAt = normalizeIsoTimestamp(options.sourceUpdatedAt);
	const appliedAt = sourceUpdatedAt || nowIso();
	const appState = { ...(json.appState || {}) };
	const localAppearance = {
		theme: normalizeTheme(state.theme),
		colorMode: normalizeColorMode(state.colorMode),
		updatedAt: localAppearanceUpdatedAt(),
	};
	const incomingAppearanceUpdatedAt = normalizeIsoTimestamp(
		appState.appearanceUpdatedAt,
	);
	const preserveLocalAppearance =
		Boolean(localAppearance.updatedAt) &&
		_compareIsoTimestamps(localAppearance.updatedAt, incomingAppearanceUpdatedAt) >
			0;
	if (preserveLocalAppearance) {
		appState.theme = localAppearance.theme;
		appState.colorMode = localAppearance.colorMode;
		appState.appearanceUpdatedAt = localAppearance.updatedAt;
	} else if (!incomingAppearanceUpdatedAt && (appState.theme || appState.colorMode)) {
		appState.appearanceUpdatedAt = appliedAt;
	}
	const restore = async () => {
		persistArtifactStore(importedStore);
		await restoreImportedAppState(appState);
		setState({
			active: "Dashboard",
			flipped: null,
			mindMode: "grid",
			artifactMode: "grid",
			selectedCompendiumId: null,
			selectedSectionId: null,
			selectedArtifactId: null,
			selectedSpiritBookKey: null,
		});
	};
	await withLocalChangeTrackingSuppressed(restore);
	saveLocalAppUpdatedAt(appliedAt);
	saveLocalAppOwner();
	if (options.replaceCloud === true && cloudHasSyncAccess()) {
		const result = await uploadLocalStateToCloud();
		recordCloudSyncAt(
			result.updatedAt || appliedAt,
			"Imported JSON rebuilt Cloud records.",
		);
	} else if (!sourceUpdatedAt && options.queueCloudSync !== false) {
		queueCloudSyncAfterLocalChange();
	}
	return { updatedAt: appliedAt, appearanceLocalPreserved: preserveLocalAppearance };
}

function storageKeyForSpace(baseKey, spaceId) {
	return scopedStorageKey(baseKey, normalizeDataSpaceId(spaceId));
}

function setSpaceStorageJson(spaceId, baseKey, value) {
	window.localStorage.setItem(
		storageKeyForSpace(baseKey, spaceId),
		JSON.stringify(value),
	);
}

function setSpaceStorageText(spaceId, baseKey, value) {
	window.localStorage.setItem(storageKeyForSpace(baseKey, spaceId), String(value));
}

function loadLocalAppUpdatedAtForSpace(spaceId) {
	try {
		return normalizeIsoTimestamp(
			window.localStorage.getItem(
				storageKeyForSpace("ourstuff.localAppUpdatedAt.v1", spaceId),
			),
		);
	} catch {
		return "";
	}
}

function loadAppearanceUpdatedAtForSpace(spaceId) {
	try {
		return normalizeIsoTimestamp(
			window.localStorage.getItem(
				storageKeyForSpace("ourstuff.appearanceUpdatedAt.v1", spaceId),
			),
		);
	} catch {
		return "";
	}
}

function saveLocalAppUpdatedAtForSpace(spaceId, value = nowIso()) {
	const normalized = normalizeIsoTimestamp(value) || nowIso();
	setSpaceStorageText(spaceId, "ourstuff.localAppUpdatedAt.v1", normalized);
	return normalized;
}

function saveAppearanceUpdatedAtForSpace(spaceId, value = nowIso()) {
	const normalized = normalizeIsoTimestamp(value) || nowIso();
	setSpaceStorageText(spaceId, "ourstuff.appearanceUpdatedAt.v1", normalized);
	return normalized;
}

function saveLocalAppOwnerForSpace(spaceId, ownerId = localCloudOwnerId()) {
	const normalized = String(ownerId || "").trim();
	const key = storageKeyForSpace("ourstuff.localAppOwner.v1", spaceId);
	if (normalized) {
		window.localStorage.setItem(key, normalized);
	} else {
		window.localStorage.removeItem(key);
	}
	return normalized;
}

function hasStoredAppStateForSpace(spaceId) {
	return APP_STATE_STORAGE_BASE_KEYS.some((baseKey) =>
		Boolean(window.localStorage.getItem(storageKeyForSpace(baseKey, spaceId))),
	);
}

function hasStoredLocalDataForSpace(spaceId) {
	return Boolean(
		window.localStorage.getItem(
			storageKeyForSpace("ourstuff.artifactStore.v1", spaceId),
		) || hasStoredAppStateForSpace(spaceId),
	);
}

function cloudSpaceOwnerMarker(info, cloud = state.cloud) {
	const uid = String(cloud?.user?.uid || info?.cloudOwnerUid || "").trim();
	if (!uid) {
		return "";
	}
	return `${cloud?.isLocalDemo ? "local-demo" : "firebase"}:${uid}`;
}

async function importAppStateJsonForSpace(spaceId, json, options = {}) {
	const normalizedSpaceId = normalizeDataSpaceId(spaceId);
	if (
		json?.schemaVersion !== SCHEMA_VERSION ||
		!Array.isArray(json.artifacts)
	) {
		throw new Error("Cloud state is not a valid Ourstuff app export.");
	}
	assertAppStateSpace(json, normalizedSpaceId);
	const appState = json.appState || {};
	const sourceUpdatedAt = normalizeIsoTimestamp(options.sourceUpdatedAt);
	const appliedAt =
		sourceUpdatedAt ||
		normalizeIsoTimestamp(json?.metadata?.localUpdatedAt) ||
		nowIso();
	const localAppearanceStamp =
		normalizedSpaceId === activeSpaceId()
			? localAppearanceUpdatedAt()
			: loadAppearanceUpdatedAtForSpace(normalizedSpaceId);
	const incomingAppearanceUpdatedAt = normalizeIsoTimestamp(
		appState.appearanceUpdatedAt,
	);
	const preserveLocalAppearance =
		Boolean(localAppearanceStamp) &&
		_compareIsoTimestamps(localAppearanceStamp, incomingAppearanceUpdatedAt) >
			0;
	const theme = preserveLocalAppearance
		? window.localStorage.getItem(
				storageKeyForSpace("ourstuff.theme.v1", normalizedSpaceId),
			) || "default"
		: appState.theme || "default";
	const colorMode = preserveLocalAppearance
		? window.localStorage.getItem(
				storageKeyForSpace("ourstuff.colorMode.v1", normalizedSpaceId),
			) || "standard"
		: appState.colorMode;
	const appearanceUpdatedAt =
		preserveLocalAppearance ? localAppearanceStamp : incomingAppearanceUpdatedAt;

	setSpaceStorageJson(normalizedSpaceId, "ourstuff.artifactStore.v1", {
		schemaVersion: json.schemaVersion,
		rootId: json.rootId || "ourstuff-root",
		artifacts: json.artifacts,
	});
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.bodyTracker.v1",
		appState.bodyTracker
			? normalizeBodyTracker(appState.bodyTracker)
			: createDefaultBodyTracker(),
	);
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.spiritPlanProgress.v1",
		appState.spiritProgress && typeof appState.spiritProgress === "object"
			? appState.spiritProgress
			: {},
	);
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.lifePlanner.v1",
		normalizeLifePlanner(appState.lifePlanner || createDefaultLifePlanner()),
	);
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.thoughts.v1",
		normalizeTrackerSettings(
			appState.thoughtSettings ||
				appState.trackerSettings ||
				cloneSpaceTrackers(normalizedSpaceId),
		),
	);
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.goals.v1",
		normalizeGoalSettings(
			appState.goalSettings ||
				appState.goals ||
				cloneSpaceGoals(normalizedSpaceId),
		),
	);
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.dashboardIdentity.v1",
		normalizeDashboardIdentity(
			appState.dashboardIdentity ||
				cloneDefaultDashboardIdentityForSpace(normalizedSpaceId),
		),
	);
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.dashboardChartTabs.v1",
		normalizeDashboardChartTabs(
			appState.dashboardChartTabs || DEFAULT_DASHBOARD_CHART_TABS,
		),
	);
	setSpaceStorageText(
		normalizedSpaceId,
		"ourstuff.theme.v1",
		normalizeTheme(theme),
	);
	setSpaceStorageText(
		normalizedSpaceId,
		"ourstuff.colorMode.v1",
		normalizeColorMode(colorMode),
	);
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.timerState.v1",
		normalizeTimerState(appState.timerState),
	);
	setSpaceStorageJson(
		normalizedSpaceId,
		"ourstuff.timerSettings.v1",
		normalizeTimerSettings(appState.timerSettings),
	);
	if (appState.pyxdiaSettings) {
		setSpaceStorageJson(
			normalizedSpaceId,
			"ourstuff.pyxdiaSettings.v1",
			normalizePyxdiaSettings(appState.pyxdiaSettings),
		);
	}
	if (appState.pyxdiaLocalState || appState.pyxdiaPenpal) {
		setSpaceStorageJson(
			normalizedSpaceId,
			"ourstuff.pyxdiaPenpal.v1",
			normalizePyxdiaLocalState(
				appState.pyxdiaLocalState || appState.pyxdiaPenpal,
			),
		);
	}
	if (appearanceUpdatedAt) {
		saveAppearanceUpdatedAtForSpace(normalizedSpaceId, appearanceUpdatedAt);
	}
	saveLocalAppUpdatedAtForSpace(normalizedSpaceId, appliedAt);
	saveLocalAppOwnerForSpace(normalizedSpaceId, options.ownerId);
	return { updatedAt: appliedAt, appearanceLocalPreserved: preserveLocalAppearance };
}

function cloudReturnUrl() {
	return `${window.location.origin}${window.location.pathname}`;
}

function cloudHasSyncAccess(cloud = state.cloud) {
	return Boolean(
		state.artifactStore && cloud?.mode === "signed-in" && cloud.user,
	);
}

function cloudCanWriteActiveSpace(cloud = state.cloud) {
	return cloudHasSyncAccess(cloud) && cloud?.spaceRole !== "reader";
}

function cloudCanOwnActiveSpace(cloud = state.cloud) {
	return cloudHasSyncAccess(cloud) && (!cloud?.spaceRole || cloud.spaceRole === "owner");
}

function cloudMediaSyncAccess(cloud = state.cloud) {
	return Boolean(
		cloud?.mode === "signed-in" && cloud.user?.uid && !cloud.isLocalDemo,
	);
}

function configureMediaCloudContext(cloud = state.cloud) {
	configureCloudMedia({
		uid: cloud?.cloudOwnerUid || cloud?.user?.uid || "",
		enabled: cloudMediaSyncAccess(cloud),
	});
}

function safeMigratedImageName(artifact, index) {
	const title =
		String(artifact?.title || artifact?.id || "note-image")
			.replace(/[^a-z0-9._-]+/gi, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 60) || "note-image";
	return `${title}-${index + 1}`;
}

function inlineBase64ImageMatches(body) {
	const matcher = /!\[([^\]]*)\]\((data:image\/[a-z0-9.+-]+;base64,[^)]+)\)/gi;
	return Array.from(String(body || "").matchAll(matcher));
}

async function migrateInlineBase64ImagesInArtifacts() {
	if (!state.artifactStore?.artifacts?.length || !cloudMediaSyncAccess()) {
		return { migrated: 0 };
	}

	let migrated = 0;
	const now = nowIso();
	const artifacts = [];

	for (const artifact of state.artifactStore.artifacts) {
		const matches = inlineBase64ImageMatches(artifact.body);
		if (!matches.length) {
			artifacts.push(artifact);
			continue;
		}

		let body = artifact.body;
		for (let index = 0; index < matches.length; index += 1) {
			const [fullMarkdown, altText, dataUrl] = matches[index];
			const stored = await storeLocalImageFromDataUrl(
				dataUrl,
				safeMigratedImageName(artifact, index),
				localMediaStoreOptions(),
			);
			const label =
				String(altText || stored.name || "image")
					.replace(/[\][()]/g, "")
					.trim() || "image";
			body = body.replace(
				fullMarkdown,
				`![${label}](ourstuff-asset:${stored.id})`,
			);
			migrated += 1;
		}

		artifacts.push({ ...artifact, body, edited: now });
	}

	if (migrated > 0) {
		const nextStore = { ...state.artifactStore, artifacts };
		state.artifactStore = nextStore;
		state.compendiums = normalizeCompendiums(
			artifactStoreToCompendiums(nextStore),
		);
		writeArtifactStore(nextStore);
		saveLocalAppUpdatedAt(now);
		if (state.active === "Gallery") {
			await refreshGalleryImages();
		}
	}

	return { migrated };
}

function assertNoCloudBase64Images(json) {
	const serialized = JSON.stringify(json ?? {});
	if (/data:image\/[a-z0-9.+-]+;base64,/i.test(serialized)) {
		throw new Error(
			"Base64 images must be migrated to encrypted Cloud media before Cloud sync.",
		);
	}
}

async function migrateLocalImagesToCloudBeforeSync() {
	configureMediaCloudContext();
	if (!cloudMediaSyncAccess()) {
		return { migrated: 0 };
	}
	const inline = await migrateInlineBase64ImagesInArtifacts();
	const local = await migrateLocalMediaToCloud({
		uid: state.cloud.user.uid,
		repairMissingRemote: true,
		...localMediaStoreOptions(),
	});
	const migrated = (inline.migrated || 0) + (local.migrated || 0);
	if (migrated > 0 && state.active === "Gallery") {
		await refreshGalleryImages();
	}
	return { migrated };
}

function cloudSyncIntervalLabel() {
	const minutes = Math.max(1, Math.round(CLOUD_SYNC_INTERVAL_MS / 60000));
	return `${minutes} min`;
}

function cloudInfoUpdatedAt(info) {
	return normalizeIsoTimestamp(
		info?.updatedAt || info?.updated_at || info?.savedAt || info?.createdAt,
	);
}

function localFileStorageBytes(file) {
	return Math.max(
		0,
		Number(file?.storageBytes) ||
			Number(file?.cloudStorageBytes) ||
			Number(file?.size) ||
			0,
	);
}

function sumLocalFileStorageBytes(files) {
	return (Array.isArray(files) ? files : []).reduce(
		(total, file) => total + localFileStorageBytes(file),
		0,
	);
}

async function localMediaStorageBytes() {
	return sumLocalFileStorageBytes(await listLocalFiles());
}

function storageUsagePercent(usage) {
	const limit = Math.max(
		1,
		Number(usage?.limitBytes) || CLOUD_STORAGE_LIMIT_BYTES,
	);
	return Math.min(
		100,
		Math.max(0, ((Number(usage?.totalBytes) || 0) / limit) * 100),
	);
}

function storageUsageWithTotals({
	storageBytes = 0,
	firebaseBytes = 0,
	updatedAt = "",
	source = "current-device",
} = {}) {
	const normalizedStorageBytes = Math.max(0, Number(storageBytes) || 0);
	const normalizedFirebaseBytes = Math.max(0, Number(firebaseBytes) || 0);
	const totalBytes = normalizedStorageBytes + normalizedFirebaseBytes;
	return {
		limitBytes: CLOUD_STORAGE_LIMIT_BYTES,
		storageBytes: normalizedStorageBytes,
		firebaseBytes: normalizedFirebaseBytes,
		totalBytes,
		percent: storageUsagePercent({
			limitBytes: CLOUD_STORAGE_LIMIT_BYTES,
			totalBytes,
		}),
		updatedAt,
		source,
	};
}

async function calculateCloudStorageUsage(options = {}) {
	const storageBytes = Number.isFinite(Number(options.storageBytes))
		? Math.max(0, Number(options.storageBytes))
		: await localMediaStorageBytes();
	if (options.json) {
		const projected = estimateCloudStateStorageUsage(options.json, {
			uid: state.cloud?.user?.uid || "",
			deviceId: state.cloud?.deviceId || "",
			storageBytes,
		});
		return storageUsageWithTotals({
			storageBytes,
			firebaseBytes: projected.firebaseBytes,
			updatedAt: projected.updatedAt || nowIso(),
			source: "current-sync-payload",
		});
	}

	if (cloudHasSyncAccess()) {
		const info = await getCloudStateInfo().catch((error) => {
			if (options.requireCloudInfo) {
				throw error;
			}
			return null;
		});
		const storedUsage = info?.storageUsage || {};
		return storageUsageWithTotals({
			storageBytes,
			firebaseBytes:
				Number(storedUsage.firebaseBytes) ||
				Number(info?.firebaseBytes) ||
				Number(info?.jsonBytes) ||
				0,
			updatedAt: cloudInfoUpdatedAt(info) || storedUsage.updatedAt || "",
			source: info?.exists ? "cloud-records" : "current-device",
		});
	}

	return storageUsageWithTotals({ storageBytes, firebaseBytes: 0 });
}

function cloudStorageUsageMessage(usage) {
	const totalBytes = Math.max(0, Number(usage?.totalBytes) || 0);
	const limitBytes = Math.max(
		1,
		Number(usage?.limitBytes) || CLOUD_STORAGE_LIMIT_BYTES,
	);
	return `Cloud storage limit reached: ${formatStorageGb(totalBytes)} would exceed the ${formatStorageLimitGb(limitBytes)} limit. Delete uploads or cloud data before adding more.`;
}

function assertCloudStorageUsageAllowed(usage) {
	if ((Number(usage?.totalBytes) || 0) <= CLOUD_STORAGE_LIMIT_BYTES) {
		return;
	}
	throw new Error(cloudStorageUsageMessage(usage));
}

async function assertCanStoreLocalMedia(metadata) {
	const files = await listLocalFiles();
	const currentStorageBytes = sumLocalFileStorageBytes(files);
	const existingBytes = localFileStorageBytes(
		files.find((file) => file.id === metadata?.id),
	);
	const usage = await calculateCloudStorageUsage({
		storageBytes: currentStorageBytes,
		requireCloudInfo: true,
	});
	const projected = storageUsageWithTotals({
		storageBytes: Math.max(
			0,
			usage.storageBytes - existingBytes + localFileStorageBytes(metadata),
		),
		firebaseBytes: usage.firebaseBytes,
		updatedAt: usage.updatedAt,
		source: "local-upload",
	});
	assertCloudStorageUsageAllowed(projected);
}

function localMediaStoreOptions() {
	return { beforeStore: assertCanStoreLocalMedia };
}

async function assertCanImportLocalMedia(records) {
	const importedStorageBytes = sumLocalFileStorageBytes(records);
	const usage = await calculateCloudStorageUsage({
		storageBytes: 0,
		requireCloudInfo: true,
	});
	assertCloudStorageUsageAllowed(
		storageUsageWithTotals({
			storageBytes: importedStorageBytes,
			firebaseBytes: usage.firebaseBytes,
			updatedAt: usage.updatedAt,
			source: "local-import",
		}),
	);
}

function localMediaImportOptions() {
	return { beforeImport: assertCanImportLocalMedia };
}

function cloudStorageUsageFingerprint(usage) {
	return [
		usage?.limitBytes || 0,
		usage?.storageBytes || 0,
		usage?.firebaseBytes || 0,
		usage?.totalBytes || 0,
		usage?.updatedAt || "",
		usage?.source || "",
	].join("|");
}

function scheduleCloudStorageUsageRefresh(options = {}) {
	if (!isReady()) {
		return;
	}
	if (cloudStorageUsageRefreshTimer) {
		window.clearTimeout(cloudStorageUsageRefreshTimer);
	}
	cloudStorageUsageRefreshTimer = window.setTimeout(() => {
		cloudStorageUsageRefreshTimer = null;
		void refreshCloudStorageUsage(options);
	}, options.delayMs ?? 0);
}

function applyCloudStorageUsage(usage) {
	state.cloudStorageUsage = usage;
	if (state.sidebarSubmenu === "settings" && state.settingsTab === "cloud") {
		const card = app.querySelector(".cloud-usage-card");
		if (card) {
			card.outerHTML = cloudStorageUsageHtml(usage);
			return;
		}
	}
	render();
}

async function refreshCloudStorageUsage(options = {}) {
	if (cloudStorageUsageRefreshInFlight) {
		return;
	}
	cloudStorageUsageRefreshInFlight = true;
	try {
		const usage = await calculateCloudStorageUsage();
		const fingerprint = cloudStorageUsageFingerprint(usage);
		if (options.force || fingerprint !== cloudStorageUsageSignature) {
			cloudStorageUsageSignature = fingerprint;
			applyCloudStorageUsage(usage);
		}
	} catch (error) {
		const fallback = storageUsageWithTotals({ source: "usage-error" });
		fallback.error =
			error instanceof Error
				? error.message
				: "Could not calculate storage usage.";
		const fingerprint = cloudStorageUsageFingerprint(fallback);
		if (options.force || fingerprint !== cloudStorageUsageSignature) {
			cloudStorageUsageSignature = fingerprint;
			applyCloudStorageUsage(fallback);
		}
	} finally {
		cloudStorageUsageRefreshInFlight = false;
	}
}

async function uploadLocalStateToCloud(options = {}) {
	await migrateLocalImagesToCloudBeforeSync();
	const json = await exportAppStateJson({ includeLocalFileData: false });
	return saveAppStateJsonToCloud(json, options);
}

async function uploadArtifactStoreSnapshotToCloud(artifactStore) {
	const json = await exportAppStateJson({
		includeLocalFileData: false,
		artifactStore,
	});
	return saveAppStateJsonToCloud(json);
}

async function saveAppStateJsonToCloud(json, options = {}) {
	assertNoCloudBase64Images(json);
	const storageBytes = await localMediaStorageBytes();
	const usage = await calculateCloudStorageUsage({ json, storageBytes });
	assertCloudStorageUsageAllowed(usage);
	const result = await saveCloudStateJson(json, {
		storageBytes,
		quiet: options.quiet === true,
	});
	const updatedAt = normalizeIsoTimestamp(result?.updatedAt) || nowIso();
	saveLocalAppUpdatedAt(updatedAt);
	saveLocalAppOwner();
	if (options.quiet !== true) {
		scheduleCloudStorageUsageRefresh({ force: true });
	}
	return { updatedAt };
}

async function importCloudInfoIntoLocal(info) {
	const cloudUpdatedAt = cloudInfoUpdatedAt(info);
	const json = info?.json || (await loadCloudStateJson());
	const importResult = await importAppStateJson(json, {
		sourceUpdatedAt:
			cloudUpdatedAt ||
			normalizeIsoTimestamp(json?.metadata?.localUpdatedAt) ||
			nowIso(),
	});
	if (importResult?.appearanceLocalPreserved && cloudCanWriteActiveSpace()) {
		return await uploadLocalStateToCloud({ quiet: true });
	}
	const migration = await migrateLocalImagesToCloudBeforeSync();
	if (migration.migrated > 0) {
		return await uploadLocalStateToCloud();
	}
	return { updatedAt: cloudUpdatedAt };
}

async function clearLocalFromCloudDelete(info) {
	const cloudUpdatedAt = cloudInfoUpdatedAt(info) || nowIso();
	await withLocalChangeTrackingSuppressed(() => clearAppData({ silent: true }));
	saveLocalAppUpdatedAt(cloudUpdatedAt);
	return { updatedAt: cloudUpdatedAt };
}

function cloudSyncMessage(action, source = "manual") {
	const prefix = source === "manual" ? "Sync" : "Auto sync";
	if (action === "uploaded") {
		return `${prefix} saved this device to Cloud records and encrypted media.`;
	}
	if (action === "downloaded") {
		return `${prefix} loaded Cloud records into this device.`;
	}
	if (action === "cleared") {
		return `${prefix} applied the Cloud deletion.`;
	}
	return `${prefix} checked. Already current.`;
}

function finishCloudSyncResult(result, source = "manual", options = {}) {
	if (!result || result.action === "skipped") {
		return result;
	}
	const message = cloudSyncMessage(result.action, source);
	recordCloudSyncAt(nowIso(), message, { quiet: options.quiet === true });
	if (options.quiet === true) {
		state.cloud = getCloudAccountState();
		patchVisibleCloudStatus();
	}
	return { ...result, message };
}

async function syncCloudWithNewestWins(options = {}) {
	const source = options.source || "manual";
	const quiet = options.quiet === true;
	if (!cloudHasSyncAccess()) {
		return { action: "skipped", message: "Cloud sync is not active." };
	}
	if (source !== "manual" && shouldDeferBackgroundSync()) {
		return { action: "skipped", message: "Auto sync paused while editing." };
	}
	if (cloudSyncInFlight) {
		return cloudSyncInFlight;
	}

	cloudSyncInFlight = (async () => {
		const hadLocalOwner = Boolean(loadLocalAppOwner());
		const accountSwitched = await ensureLocalAccountBoundary(state.cloud);
		const info = await getCloudStateInfo();
		const cloudUpdatedAt = cloudInfoUpdatedAt(info);
		const localUpdatedAt = localAppUpdatedAt();
		const localHasStoredData = hasStoredLocalData();
		const syncComparison = _compareIsoTimestamps(
			cloudUpdatedAt,
			localUpdatedAt,
		);

		if (
			source === "sign-in" &&
			info?.exists &&
			(accountSwitched ||
				!hadLocalOwner ||
				!localHasStoredData ||
				syncComparison >= 0)
		) {
			const result = await importCloudInfoIntoLocal(info);
			return finishCloudSyncResult(
				{ action: "downloaded", ...result },
				source,
				{ quiet },
			);
		}

		if (source === "interval" && info?.exists && !localHasStoredData) {
			const result = await importCloudInfoIntoLocal(info);
			return finishCloudSyncResult(
				{ action: "downloaded", ...result },
				source,
				{ quiet },
			);
		}

		if (info?.exists && localHasStoredData && syncComparison > 0) {
			const result = await importCloudInfoIntoLocal(info);
			return finishCloudSyncResult(
				{ action: "downloaded", ...result },
				source,
				{ quiet },
			);
		}

		if (info?.exists && localHasStoredData && syncComparison === 0) {
			saveLocalAppOwner();
			return finishCloudSyncResult(
				{ action: "checked", updatedAt: cloudUpdatedAt || localUpdatedAt },
				source,
				{ quiet },
			);
		}

		if (
			source === "manual" &&
			info?.deleted &&
			(!localHasStoredData || syncComparison >= 0)
		) {
			const result = await clearLocalFromCloudDelete(info);
			return finishCloudSyncResult({ action: "cleared", ...result }, source, {
				quiet,
			});
		}

		if (!info?.exists && !localHasStoredData) {
			saveLocalAppOwner();
			return finishCloudSyncResult(
				{ action: "checked", updatedAt: cloudUpdatedAt || localUpdatedAt },
				source,
				{ quiet },
			);
		}

		if (
			!hadLocalOwner &&
			(source === "sign-in" || source === "interval") &&
			!info?.exists
		) {
			return finishCloudSyncResult(
				{ action: "checked", updatedAt: cloudUpdatedAt || localUpdatedAt },
				source,
				{ quiet },
			);
		}

		const result = await uploadLocalStateToCloud({ quiet });
		return finishCloudSyncResult(
			{
				action: "uploaded",
				updatedAt: cloudUpdatedAt || localUpdatedAt,
				...result,
			},
			source,
			{ quiet },
		);
	})();

	try {
		return await cloudSyncInFlight;
	} finally {
		cloudSyncInFlight = null;
	}
}

async function triggerCloudAutoSync(source = "interval", options = {}) {
	if (!cloudHasSyncAccess()) {
		return { action: "skipped" };
	}
	if (source !== "manual" && shouldDeferBackgroundSync()) {
		if (source !== "interval" || options.fromIdleRetry === true) {
			scheduleCloudAutoSyncWhenIdle(source, options);
		}
		return { action: "skipped", message: "Auto sync paused while editing." };
	}
	const now = Date.now();
	if (
		!options.force &&
		now - lastCloudAutoSyncAttemptAt < CLOUD_SYNC_MIN_INTERVAL_MS
	) {
		return { action: "skipped" };
	}
	lastCloudAutoSyncAttemptAt = now;
	try {
		return await syncCloudWithNewestWins({
			source,
			quiet: source !== "manual",
		});
	} catch (error) {
		if (source === "manual") {
			setCloudStatus({
				...getCloudAccountState(),
				busy: false,
				message: "Auto sync failed.",
				error: error instanceof Error ? error.message : "Cloud sync failed.",
			});
		}
		return { action: "error" };
	}
}

function configureCloudAutoSync() {
	if (!cloudHasSyncAccess()) {
		if (cloudAutoSyncTimer) {
			window.clearInterval(cloudAutoSyncTimer);
		}
		if (cloudAutoSyncDebounceTimer) {
			window.clearTimeout(cloudAutoSyncDebounceTimer);
		}
		if (cloudAutoSyncIdleTimer) {
			window.clearTimeout(cloudAutoSyncIdleTimer);
		}
		cloudAutoSyncTimer = null;
		cloudAutoSyncDebounceTimer = null;
		cloudAutoSyncIdleTimer = null;
		lastCloudAutoSyncAttemptAt = 0;
		cloudAutoSyncPrimedFor = "";
		return;
	}
	if (cloudAutoSyncTimer) {
		return;
	}
	cloudAutoSyncTimer = window.setInterval(() => {
		void triggerCloudAutoSync("interval");
	}, CLOUD_SYNC_INTERVAL_MS);
}

async function syncCloudNow() {
	return syncCloudWithNewestWins({ source: "manual" });
}

async function loadCloudIntoLocalApp() {
	const confirmed = window.confirm(
		`Load the saved ${activeSpaceLabel()} Cloud records into this browser? This replaces the current local ${activeSpaceLabel()} app state. Export first if you need a backup.`,
	);
	if (!confirmed) {
		return;
	}
	const info = await getCloudStateInfo().catch(() => null);
	if (info?.json) {
		await importCloudInfoIntoLocal(info);
	} else {
		const json = await loadCloudStateJson();
		await importAppStateJson(json, {
			sourceUpdatedAt:
				cloudInfoUpdatedAt(info) ||
				normalizeIsoTimestamp(json?.metadata?.localUpdatedAt) ||
				nowIso(),
		});
	}
	recordCloudSyncAt(nowIso(), "Cloud records loaded.");
	return { message: `${activeSpaceLabel()} Cloud records loaded.` };
}

async function deleteCloudData() {
	const confirmed = window.confirm(
		`Clear the ${activeSpaceLabel()} space everywhere? This deletes the ${activeSpaceLabel()} Cloud records and resets this browser's local ${activeSpaceLabel()} data. Export first if you need a backup.`,
	);
	if (!confirmed) {
		return;
	}
	const result = await deleteCloudStateJson();
	await withLocalChangeTrackingSuppressed(() => clearAppData({ silent: true }));
	saveLocalAppUpdatedAt(cloudInfoUpdatedAt(result) || nowIso());
	return { message: `${activeSpaceLabel()} space cleared from this browser and Cloud.` };
}

async function clearActiveSpaceData() {
	const label = activeSpaceLabel();
	if (cloudHasSyncAccess()) {
		if (!cloudCanOwnActiveSpace()) {
			window.alert(`Only the ${label} owner can clear the shared Cloud space.`);
			return { message: "" };
		}
		return await deleteCloudData();
	}
	const confirmed = window.confirm(
		`Clear the ${label} space from this browser? This cannot be undone unless you have an export. If you also have Cloud data for this space, sign in before clearing so Cloud can be cleared too.`,
	);
	if (!confirmed) {
		return { message: "" };
	}
	await withLocalChangeTrackingSuppressed(() => clearAppData({ silent: true }));
	saveLocalAppUpdatedAt(nowIso());
	return { message: `${label} space cleared from this browser.` };
}

async function deleteCloudAccountData() {
	const confirmed = window.confirm(
		"Fully delete your cloud account and reset this browser? This removes Cloud app records, requests cloud account deletion, and clears local app data. Export first if you need a backup.",
	);
	if (!confirmed) {
		return;
	}
	await deleteCloudAccount();
	await withLocalChangeTrackingSuppressed(() => clearAppData({ silent: true }));
	saveLocalAppUpdatedAt(nowIso());
	return { message: "Cloud account deletion requested." };
}

async function deleteObsidianKeyAction() {
	const confirmed = window.confirm(
		"Delete the Obsidian sync API key? Any Obsidian plugin using it will stop syncing until you create a new key.",
	);
	if (!confirmed) {
		return;
	}
	return await deleteObsidianSyncKey();
}

async function maybePromptCloudImport(cloud) {
	if (!cloudHasSyncAccess(cloud)) {
		return;
	}
	const userKey = `${cloud.user?.uid || cloud.user?.email || "cloud-user"}:${cloud.deviceId || ""}`;
	if (cloudAutoSyncPrimedFor === userKey) {
		return;
	}
	if (shouldDeferBackgroundSync()) {
		scheduleCloudAutoSyncWhenIdle("sign-in", { force: true });
		return;
	}
	cloudAutoSyncPrimedFor = userKey;
	await restoreInactiveCloudSpacesOnSignIn(cloud).catch((error) => {
		setCloudStatus({
			...getCloudAccountState(),
			busy: false,
			message: "Signed in. Some spaces could not be checked.",
			error:
				error instanceof Error
					? error.message
					: "Could not restore all spaces.",
		});
	});
	await triggerCloudAutoSync("sign-in", { force: true });
}

function shouldImportCloudSpace(info) {
	if (!info?.exists || !info?.json || info.deleted) {
		return false;
	}
	if (info.spaceId === activeSpaceId()) {
		return false;
	}
	if (!hasStoredLocalDataForSpace(info.spaceId)) {
		return true;
	}
	const cloudUpdatedAt = cloudInfoUpdatedAt(info);
	const localUpdatedAt = loadLocalAppUpdatedAtForSpace(info.spaceId);
	return _compareIsoTimestamps(cloudUpdatedAt, localUpdatedAt) > 0;
}

async function restoreInactiveCloudSpacesOnSignIn(cloud = state.cloud) {
	if (!cloudHasSyncAccess(cloud)) {
		return { imported: 0, enabled: 0 };
	}
	const infos = await getCloudSpaceStates(Object.keys(DATA_SPACES));
	let imported = 0;
	const enabled = new Set(enabledSpaceIds());
	for (const info of infos) {
		if (info?.exists && !info.deleted) {
			enabled.add(info.spaceId);
		}
		if (!shouldImportCloudSpace(info)) {
			continue;
		}
		await importAppStateJsonForSpace(info.spaceId, info.json, {
			sourceUpdatedAt: cloudInfoUpdatedAt(info),
			ownerId: cloudSpaceOwnerMarker(info, cloud),
		});
		imported += 1;
	}
	const nextEnabled = saveEnabledSpaceIds([...enabled]);
	const enabledChanged =
		JSON.stringify(nextEnabled) !== JSON.stringify(state.enabledSpaceIds);
	if (enabledChanged) {
		state.enabledSpaceIds = nextEnabled;
		if (!isUserEditingInterface()) {
			render();
		}
	}
	return { imported, enabled: nextEnabled.length };
}

function cloudEmailCredentialsFromDom() {
	const email = document.getElementById("cloud-email")?.value || "";
	const password = document.getElementById("cloud-password")?.value || "";
	return { email, password };
}

function rememberCloudAuthView() {
	try {
		window.sessionStorage.setItem(CLOUD_AUTH_VIEW_PENDING_KEY, "1");
	} catch {
		// Auth still works if sessionStorage is blocked.
	}
}

function consumeCloudAuthView() {
	try {
		const pending =
			window.sessionStorage.getItem(CLOUD_AUTH_VIEW_PENDING_KEY) === "1";
		if (pending) {
			window.sessionStorage.removeItem(CLOUD_AUTH_VIEW_PENDING_KEY);
		}
		return pending;
	} catch {
		return false;
	}
}

function consumeCustomSpacePostCreate() {
	try {
		const pending =
			window.sessionStorage.getItem(CUSTOM_SPACE_POST_CREATE_KEY) === "1";
		if (pending) {
			window.sessionStorage.removeItem(CUSTOM_SPACE_POST_CREATE_KEY);
		}
		return pending;
	} catch {
		return false;
	}
}

async function signInWithEmailForm(credentials, options = {}) {
	await signInWithEmailPassword(
		credentials?.email || "",
		credentials?.password || "",
		options,
	);
}

function customSpaceQuestionnaireValues() {
	const nameInput = document.getElementById("custom-space-name");
	const descriptionInput = document.getElementById("custom-space-description");
	const label = String(nameInput?.value || "").trim();
	if (!label) {
		nameInput?.focus?.();
		throw new Error("Enter a name for the new space.");
	}
	const dashboardLabels = Object.fromEntries(
		DASHBOARD_LABELS.map((dashboard) => {
			const input = document.getElementById(`custom-space-label-${dashboard}`);
			return [dashboard, String(input?.value || dashboard).trim() || dashboard];
		}),
	);
	return {
		label,
		description: String(descriptionInput?.value || "").trim(),
		dashboardLabels,
		inviteAfter:
			document.getElementById("custom-space-invite-after")?.checked === true,
	};
}

async function createCustomSpaceFromDom() {
	const spaceId = availableCustomSpaceId();
	if (!spaceId) {
		throw new Error("You can create up to two additional spaces.");
	}
	const values = customSpaceQuestionnaireValues();
	const space = saveCustomDataSpace({ ...values, id: spaceId });
	const reset = createSpaceDatasetReset(space.id, { defaults: false });
	resetSpaceDatasetStorage(space.id, { reset });
	state.enabledSpaceIds = saveEnabledSpaceIds([...enabledSpaceIds(), space.id]);
	if (values.inviteAfter) {
		try {
			window.sessionStorage.setItem(CUSTOM_SPACE_POST_CREATE_KEY, "1");
		} catch {
			// Opening the sharing tab after reload is a convenience only.
		}
	}
	switchSpace(space.id);
}

function localSpaceIdFromInvite(invite = {}) {
	const explicit = String(invite.spaceId || "");
	if (DATA_SPACES[explicit] || CUSTOM_SPACE_IDS.includes(explicit)) {
		return explicit;
	}
	const appId = String(invite.appId || "");
	const customIndex = CUSTOM_SPACE_IDS.findIndex(
		(id) => appId === `ourstuff-main-custom-${CUSTOM_SPACE_IDS.indexOf(id) + 1}`,
	);
	if (customIndex >= 0) {
		return CUSTOM_SPACE_IDS[customIndex];
	}
	return appId === "ourstuff-main-family" ? FAMILY_SPACE_ID : "";
}

function ensureInviteSpaceLocally(invite = {}) {
	const spaceId = localSpaceIdFromInvite(invite);
	if (!CUSTOM_SPACE_IDS.includes(spaceId) || DATA_SPACES[spaceId]) {
		return spaceId;
	}
	const created = saveCustomDataSpace({
		id: spaceId,
		label: invite.spaceLabel || "Shared space",
		description: `${invite.spaceLabel || "Shared space"} shared notes, trackers, Pen Pal, themes, and media.`,
		dashboardLabels: invite.dashboardLabels || {},
	});
	const reset = createSpaceDatasetReset(created.id, { defaults: false });
	resetSpaceDatasetStorage(created.id, { reset });
	state.enabledSpaceIds = saveEnabledSpaceIds([...enabledSpaceIds(), created.id]);
	return created.id;
}

async function acceptFamilyInviteAction(inviteId) {
	const invite = (state.cloud?.familyInvites || []).find(
		(item) => item.inviteId === inviteId,
	);
	const result = await acceptFamilyInvite(inviteId);
	const spaceId = ensureInviteSpaceLocally(invite || result?.sharedSpace || {});
	if (spaceId && DATA_SPACES[spaceId]) {
		state.enabledSpaceIds = saveEnabledSpaceIds([...enabledSpaceIds(), spaceId]);
		switchSpace(spaceId);
	}
	return result;
}

async function sendFamilyInviteFromDom(sourceElement = null) {
	const form = sourceElement?.closest?.(".cloud-email-form") || document;
	const emailInput = form.querySelector?.("#family-member-email") || document.getElementById("family-member-email");
	const roleInput = form.querySelector?.("#family-member-role") || document.getElementById("family-member-role");
	const email = String(emailInput?.value || "").trim().toLowerCase();
	const role = String(roleInput?.value || "reader").trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		emailInput?.focus?.();
		throw new Error("Enter a valid invite email address.");
	}
	const result = await sendFamilyInvite(email, role);
	if (emailInput) {
		emailInput.value = "";
	}
	return result;
}

async function removeFamilyMemberAction(uid) {
	if (!uid) {
		return null;
	}
	const confirmed = window.confirm(
		`Remove this member from the ${activeSpaceLabel()} space? Their previous joined space will be restored when possible.`,
	);
	if (!confirmed) {
		return null;
	}
	return await removeFamilyMember(uid);
}

async function leaveFamilySpaceAction() {
	const confirmed = window.confirm(
		`Leave this ${activeSpaceLabel()} space? Your previous joined space will be restored when possible.`,
	);
	if (!confirmed) {
		return null;
	}
	return await leaveFamilySpace();
}

function hasStoredAppState() {
	return Boolean(
		window.localStorage.getItem(BODY_TRACKER_KEY) ||
			window.localStorage.getItem(SPIRIT_PROGRESS_KEY) ||
			window.localStorage.getItem(LIFE_PLANNER_KEY) ||
			window.localStorage.getItem(TRACKER_SETTINGS_KEY) ||
			window.localStorage.getItem(GOAL_SETTINGS_KEY) ||
			window.localStorage.getItem(DASHBOARD_IDENTITY_KEY) ||
			window.localStorage.getItem(DASHBOARD_CHART_TABS_KEY) ||
			window.localStorage.getItem(PYXIDA_SETTINGS_KEY) ||
			window.localStorage.getItem(PYXIDA_LOCAL_STATE_KEY) ||
			window.localStorage.getItem(THEME_KEY) ||
			window.localStorage.getItem(COLOR_MODE_KEY) ||
			window.localStorage.getItem(TIMER_STATE_KEY) ||
			window.localStorage.getItem(TIMER_SETTINGS_KEY),
	);
}

function hasStoredLocalData() {
	return Boolean(
		window.localStorage.getItem(artifactStorageKey()) || hasStoredAppState(),
	);
}

const initialPyxdiaLocalState = loadPyxdiaLocalState();
const initialDashboardChartTabs = loadDashboardChartTabs();
const initialEnabledSpaceIds = loadEnabledSpaceIds();
const initialCustomSpacePostCreate = consumeCustomSpacePostCreate();

const state = {
	activeSpace: activeSpace(),
	enabledSpaceIds: initialEnabledSpaceIds,
	spaceLockError: "",
	active: initialCustomSpacePostCreate ? "Settings" : "Dashboard",
	flipped: null,
	artifactStore: null,
	compendiums: [],
	selectedCompendiumId: null,
	selectedSectionId: null,
	mindCompendiumPage: 0,
	mindCompendiumPickerOpen: false,
	compendiumReaderPages: {},
	readerGalleryPages: {},
	selectedArtifactId: null,
	artifactReturnActive: "",
	mindMode: "grid",
	artifactMode: "grid",
	bodyMode: "timers",
	bodyTimerMode: "fasting",
	bodyNutritionMode: "daily",
	lifeTool: "",
	lifeMode: "month",
	settingsTab: initialCustomSpacePostCreate ? "cloud" : "getting-started",
	headerSnapped: false,
	contentScrollPositions: {},
	theme: loadTheme(),
	colorMode: loadColorMode(),
	pyxdiaSettings: loadPyxdiaSettings(),
	pyxdiaThreads: initialPyxdiaLocalState.threads,
	pyxdiaLetters: initialPyxdiaLocalState.letters,
	pyxdiaDraft: initialPyxdiaLocalState.draft,
	pyxdiaMemory: initialPyxdiaLocalState.memory,
	pyxdiaAiBrain: null,
	pyxdiaExpanded: false,
	pyxdiaView: "input",
	pyxdiaActiveThreadId: "",
	pyxdiaRecipientType: "pyxdia",
	pyxdiaRecipientUid: "pyxdia",
	pyxdiaCorrespondents: [],
	pyxdiaUnreadBySpace: {},
	pyxdiaStatus: "",
	pyxdiaError: "",
	pyxdiaBusy: false,
	pyxdiaLastRefreshAt: "",
	pyxdiaNoteFilters: createDefaultPyxdiaNoteFilters(),
	dismissedTips: loadDismissedTips(),
	navigationTour: null,
	dashboardIdentity: loadDashboardIdentity(),
	trackerAddArea: "",
	trackerEditKey: "",
	trackerDeleteKey: "",
	suppressNextTrackerEditClick: false,
	suppressNextTrackerClick: false,
	suppressNextDashboardChartClick: false,
	iconPicker: null,
	iconSearchCache: loadIconifySearchCache(),
	iconSearchInFlight: {},
	thoughtToast: null,
	thoughtCooldowns: {},
	thoughtCreateLocks: {},
	dashboardPeriod: "day",
	dashboardPeriodGlowUntil: 0,
	dashboardChartTabs: initialDashboardChartTabs,
	dashboardChartType:
		initialDashboardChartTabs[0] || DEFAULT_DASHBOARD_CHART_TABS[0],
	timerOpen: false,
	timerState: loadTimerState(),
	timerSettings: loadTimerSettings(),
	bodyTracker: loadBodyTracker(),
	trackerSettings: loadTrackerSettings(),
	goalSettings: loadGoalSettings(),
	localAppUpdatedAt: loadLocalAppUpdatedAt(),
	appearanceUpdatedAt: loadAppearanceUpdatedAt(),
	cloud: getCloudAccountState(),
	cloudStorageUsage: null,
	trashSettings: normalizeTrashSettings(),
	trashItems: [],
	trashCursor: "",
	trashBusy: false,
	trashStatus: "",
	trashError: "",
	cameraOpen: false,
	cameraTarget: null,
	cameraStatus: "",
	cameraError: "",
	cameraBusy: false,
	cameraSaveToDevice: false,
	editorDrafts: {},
	spiritPlan: null,
	spiritPlanError: "",
	spiritPlanId: "ten-year",
	spiritYear: 1,
	selectedSpiritBookKey: null,
	spiritProgress: loadSpiritProgress(),
	lifePlanner: loadLifePlanner(),
	selectedLifeProjectId: null,
	selectedLifePhaseId: null,
	selectedLifeTaskId: null,
	galleryImages: null,
	gallerySelectedIds: [],
	galleryThumbSize: 180,
	mobileMenuOpen: initialMenuOpen(),
	sidebarSubmenu: "",
	sidebarWidth: loadSidebarWidth(),
	suppressNextMenuToggle: false,
	sidebarExpanded: {
		Mind: false,
		Body: false,
		Spirit: false,
		Life: false,
	},
	sidebarPages: {},
	trackerPages: {},
};

let skipNextRenderScrollCapture = false;
let menuTimerInterval = null;
let menuTimerAudioContext = null;

function contentScrollKey(source = state) {
	const active = source.active || "Dashboard";
	if (active === "PYXIDA") {
		const view = ["input", "output", "thread"].includes(source.pyxdiaView)
			? source.pyxdiaView
			: "input";
		const threadId = view === "thread" ? source.pyxdiaActiveThreadId || "" : "";
		return `PYXIDA:${view}:${threadId}`;
	}
	if (active === "Life") {
		return [
			"Life",
			source.lifeTool || "",
			source.lifeMode || "",
			source.selectedArtifactId || "",
		].join(":");
	}
	if (active === "Mind") {
		return [
			"Mind",
			source.mindMode || "",
			source.artifactMode || "",
			source.selectedCompendiumId || "",
			source.selectedSectionId || "",
			source.selectedArtifactId || "",
		].join(":");
	}
	if (active === "Spirit") {
		return [
			"Spirit",
			source.spiritYear || "",
			source.selectedSpiritBookKey || "",
			source.selectedArtifactId || "",
		].join(":");
	}
	return [
		active,
		source.artifactMode || "",
		source.selectedArtifactId || "",
		source.settingsTab || "",
	].join(":");
}

function captureContentScrollPosition(source = state) {
	const contentStage = app.querySelector(".content-stage");
	if (!contentStage) {
		return;
	}
	state.contentScrollPositions = {
		...(state.contentScrollPositions || {}),
		[contentScrollKey(source)]: contentStage.scrollTop,
	};
}

function restoreContentScrollPosition(key = contentScrollKey()) {
	const contentStage = app.querySelector(".content-stage");
	if (!contentStage) {
		return;
	}
	if (contentStage.classList.contains("is-header-snapped")) {
		return;
	}
	const scrollTop = state.contentScrollPositions?.[key];
	if (!Number.isFinite(scrollTop)) {
		return;
	}
	contentStage.scrollTop = Math.min(
		Math.max(0, scrollTop),
		Math.max(0, contentStage.scrollHeight - contentStage.clientHeight),
	);
}

function makeId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayDateKey() {
	const date = new Date();
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeyFromValue(value) {
	if (!value) {
		return todayDateKey();
	}
	const text = String(value);
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
		return text;
	}
	const date = new Date(text);
	if (Number.isNaN(date.getTime())) {
		return todayDateKey();
	}
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function dateKeyFromDate(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateKey, options = {}) {
	const date = new Date(`${dateKey}T12:00:00`);
	return new Intl.DateTimeFormat(
		undefined,
		options.weekday
			? {
					weekday: "short",
					month: "short",
					day: "numeric",
					year: options.year ? "numeric" : undefined,
				}
			: {
					month: "short",
					day: "numeric",
					year: options.year ? "numeric" : undefined,
				},
	).format(date);
}

function formatEventTime(value) {
	if (!value) {
		return "";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function daysBetween(dateKey, compareKey = todayDateKey()) {
	const date = new Date(`${dateKey}T12:00:00`);
	const compare = new Date(`${compareKey}T12:00:00`);
	return Math.floor((compare - date) / 86400000);
}

function dashboardPeriodOption(period) {
	return (
		DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period) ||
		DASHBOARD_PERIOD_OPTIONS[0]
	);
}

function dashboardPeriodIndex(period) {
	const index = DASHBOARD_PERIOD_OPTIONS.findIndex(
		(option) => option.id === period,
	);
	return index >= 0 ? index : 0;
}

function dashboardPeriodOptionForIndex(index) {
	const nextIndex = Number.isFinite(Number(index))
		? Math.min(
				Math.max(Math.round(Number(index)), 0),
				DASHBOARD_PERIOD_OPTIONS.length - 1,
			)
		: 0;
	return DASHBOARD_PERIOD_OPTIONS[nextIndex];
}

function eventIsInPeriod(event, period) {
	const age = daysBetween(event.dateKey);
	const option = dashboardPeriodOption(period);
	return age >= 0 && age < option.days;
}

function itemDateKey(item) {
	const value =
		item?.properties?.dateKey ||
		item?.dateKey ||
		item?.properties?.goalLoggedAt ||
		item?.properties?.thoughtLoggedAt ||
		activityTimestamp(item);
	return value ? dateKeyFromValue(value) : "";
}

function _itemIsInPeriod(item, period) {
	const dateKey = itemDateKey(item);
	return !dateKey || eventIsInPeriod({ dateKey }, period);
}

function iconHtml(name) {
	const icon = normalizeIconSource(name) || "tabler:circle";
	return `<iconify-icon class="button-icon" icon="${escapeHtml(icon)}" aria-hidden="true"></iconify-icon>`;
}

function buttonContent(icon, label, labelClass = "button-label") {
	return `${iconHtml(icon)}<span class="${escapeHtml(labelClass)}" data-fit-nav-label>${escapeHtml(label)}</span>`;
}

function fitNavButtonLabels(root = app) {
	root.querySelectorAll("[data-fit-nav-label]").forEach((label) => {
		label.style.fontSize = "";
		label.classList.remove("is-fit-shrunk");
		const text = label.textContent?.trim() || "";
		if (!text || /\s/.test(text)) {
			return;
		}
		const available = label.clientWidth;
		const needed = label.scrollWidth;
		if (!available || needed <= available + 1) {
			return;
		}
		const scale = Math.max(0.62, Math.min(1, (available - 1) / needed));
		label.style.fontSize = `${scale.toFixed(3)}em`;
		label.classList.add("is-fit-shrunk");
	});
}

function pageActionButton(action, icon, label, options = {}) {
	const dataAttrs = options.data
		? Object.entries(options.data)
				.filter(
					([, value]) => value !== undefined && value !== null && value !== "",
				)
				.map(([key, value]) => ` data-${key}="${escapeHtml(value)}"`)
				.join("")
		: "";
	return `<button class="icon-button page-action-button${options.danger ? " danger-button" : ""}${options.className ? ` ${escapeHtml(options.className)}` : ""}" data-action="${escapeHtml(action)}"${dataAttrs} type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"${options.disabled ? " disabled" : ""}>${iconHtml(icon)}</button>`;
}

function activeCameraTarget() {
	if (state.active === "PYXIDA") {
		return { kind: "pyxdia" };
	}
	if (DASHBOARD_LABELS.includes(state.active)) {
		return { kind: "dashboard", dashboard: state.active };
	}
	return null;
}

function normalizeCameraTarget(target = {}) {
	const kind =
		target.kind === "pyxdia" || target.kind === "editor"
			? target.kind
			: "dashboard";
	const dashboard = DASHBOARD_LABELS.includes(target.dashboard)
		? target.dashboard
		: DASHBOARD_LABELS.includes(state.active)
			? state.active
			: "Mind";
	return {
		kind,
		dashboard,
		start: Number.isFinite(target.start) ? target.start : null,
		end: Number.isFinite(target.end) ? target.end : null,
	};
}

function cameraTargetFromElement(element) {
	const explicitKind = element?.dataset?.cameraTarget || "";
	if (explicitKind === "pyxdia") {
		return { kind: "pyxdia" };
	}
	if (explicitKind === "editor") {
		return { kind: "editor" };
	}
	const dashboard = element?.dataset?.dashboard || state.active;
	return normalizeCameraTarget({ kind: "dashboard", dashboard });
}

function cameraTargetLabel(target = state.cameraTarget) {
	const normalized = normalizeCameraTarget(
		target || activeCameraTarget() || {},
	);
	if (normalized.kind === "pyxdia") {
		return "Pen Pal letter";
	}
	if (normalized.kind === "editor") {
		return "Current note";
	}
	return `${dashboardDisplayLabel(normalized.dashboard)} note`;
}

function pathCameraButtonHtml() {
	const target = activeCameraTarget();
	if (!target) {
		return "";
	}
	const attrs =
		target.kind === "pyxdia"
			? 'data-camera-target="pyxdia"'
			: `data-camera-target="dashboard" data-dashboard="${escapeHtml(
					target.dashboard,
				)}"`;
	return `
      <button class="path-camera-button" data-action="open-camera" ${attrs} type="button" aria-label="Open camera" title="Open camera">
        ${iconHtml("tabler:camera")}
      </button>
  `;
}

function cameraClosedState() {
	return {
		cameraOpen: false,
		cameraTarget: null,
		cameraStatus: "",
		cameraError: "",
		cameraBusy: false,
		cameraSaveToDevice: false,
	};
}

function padTimerUnit(value) {
	return String(Math.max(0, Math.floor(Number(value) || 0))).padStart(2, "0");
}

function formatTimerDisplay(seconds) {
	const normalized = clampTimerSeconds(seconds, 0);
	return `${padTimerUnit(normalized / 60)}:${padTimerUnit(normalized % 60)}`;
}

function timerButtonLabel(timerState = state.timerState) {
	if (timerState.running) {
		return "Pause";
	}
	if (timerState.remaining < timerState.original && timerState.remaining > 0) {
		return "Resume";
	}
	return "Start";
}

function updateTimerDom() {
	const timerState = state.timerState || normalizeTimerState();
	const display = app.querySelector("[data-timer-display]");
	if (display) {
		display.textContent = formatTimerDisplay(timerState.remaining);
		display.classList.toggle("is-running", Boolean(timerState.running));
	}
	const startButton = app.querySelector("[data-timer-start-pause]");
	if (startButton) {
		const label = timerButtonLabel(timerState);
		startButton.innerHTML = buttonContent(
			timerState.running ? "tabler:player-pause" : "tabler:player-play",
			label,
		);
		startButton.setAttribute("aria-label", `${label} timer`);
	}
	app.querySelectorAll("[data-menu-timer-button]").forEach((button) => {
		button.classList.toggle("is-active", Boolean(timerState.running));
	});
}

function stopTimerInterval() {
	if (menuTimerInterval) {
		window.clearInterval(menuTimerInterval);
		menuTimerInterval = null;
	}
}

function startTimerInterval() {
	stopTimerInterval();
	menuTimerInterval = window.setInterval(tickMenuTimer, 1000);
}

function setTimerState(next, options = {}) {
	state.timerState = normalizeTimerState({
		...(state.timerState || normalizeTimerState()),
		...next,
		savedAt: next?.running ? Date.now() : next?.savedAt,
	});
	saveTimerState(state.timerState, { markChanged: options.markChanged });
	updateTimerDom();
	if (options.render) {
		render();
	}
}

function tickMenuTimer() {
	const current = state.timerState || normalizeTimerState();
	if (!current.running) {
		stopTimerInterval();
		return;
	}
	const remaining = Math.max(0, current.remaining - 1);
	state.timerState = normalizeTimerState({
		...current,
		remaining,
		running: remaining > 0,
		savedAt: remaining > 0 ? Date.now() : null,
	});
	updateTimerDom();
	if (remaining > 0) {
		return;
	}
	stopTimerInterval();
	saveTimerState(state.timerState);
	playTimerAlarm();
	notifyTimerDone();
	render();
}

function openTimer() {
	setState({ timerOpen: true });
}

function closeTimer(options = {}) {
	if (options.render === false) {
		state.timerOpen = false;
		return;
	}
	setState({ timerOpen: false });
}

function toggleTimerRunning() {
	const current = state.timerState || normalizeTimerState();
	if (current.remaining <= 0) {
		return;
	}
	if (current.running) {
		setTimerState({ ...current, running: false, savedAt: null }, { render: true });
		stopTimerInterval();
		return;
	}
	setTimerState({ ...current, running: true, savedAt: Date.now() }, { render: true });
	startTimerInterval();
}

function resetTimer() {
	const current = state.timerState || normalizeTimerState();
	stopTimerInterval();
	setTimerState(
		{
			remaining: current.original || MENU_TIMER_DEFAULT_SECONDS,
			original: current.original || MENU_TIMER_DEFAULT_SECONDS,
			running: false,
			savedAt: null,
		},
		{ render: true },
	);
}

function setTimerDuration(seconds) {
	const duration = Math.max(
		1,
		clampTimerSeconds(seconds, MENU_TIMER_DEFAULT_SECONDS),
	);
	stopTimerInterval();
	setTimerState(
		{
			remaining: duration,
			original: duration,
			running: false,
			savedAt: null,
		},
		{ render: true },
	);
}

function setCustomTimerFromDom() {
	const mins = Math.min(
		99,
		Math.max(
			0,
			Math.round(Number(app.querySelector("[data-timer-custom-mins]")?.value) || 0),
		),
	);
	const secs = Math.min(
		59,
		Math.max(
			0,
			Math.round(Number(app.querySelector("[data-timer-custom-secs]")?.value) || 0),
		),
	);
	const total = mins * 60 + secs;
	if (total > 0) {
		setTimerDuration(total);
	}
}

function updateTimerSettingsFromDom(options = {}) {
	const settings = normalizeTimerSettings({
		alarm:
			app.querySelector("[data-timer-alarm-select]")?.value ||
			state.timerSettings?.alarm,
		volume:
			app.querySelector("[data-timer-volume-slider]")?.value ??
			state.timerSettings?.volume,
	});
	state.timerSettings = settings;
	const volumeLabel = app.querySelector("[data-timer-volume-label]");
	if (volumeLabel) {
		volumeLabel.textContent = `${settings.volume}%`;
	}
	if (options.persist) {
		saveTimerSettings(settings);
	}
}

function getTimerAudioContext() {
	if (!menuTimerAudioContext) {
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtor) {
			return null;
		}
		menuTimerAudioContext = new AudioCtor();
	}
	if (menuTimerAudioContext.state === "suspended") {
		void menuTimerAudioContext.resume();
	}
	return menuTimerAudioContext;
}

function timerVolume() {
	return Math.max(
		0,
		Math.min(1, Number(state.timerSettings?.volume ?? 70) / 100),
	);
}

function playTimerBell(ctx, vol, when) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.type = "sine";
	osc.frequency.setValueAtTime(880, when);
	osc.frequency.exponentialRampToValueAtTime(440, when + 1.2);
	gain.gain.setValueAtTime(vol, when);
	gain.gain.exponentialRampToValueAtTime(0.001, when + 1.8);
	osc.start(when);
	osc.stop(when + 1.8);
}

function playTimerChime(ctx, vol, when) {
	[
		[523, 0],
		[659, 0.25],
		[784, 0.5],
		[1047, 0.75],
	].forEach(([freq, offsetValue]) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const time = when + offsetValue;
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.type = "triangle";
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(vol, time);
		gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
		osc.start(time);
		osc.stop(time + 0.8);
	});
}

function playTimerBeep(ctx, vol, when) {
	[0, 0.35, 0.7].forEach((offsetValue) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const time = when + offsetValue;
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.type = "square";
		osc.frequency.value = 1000;
		gain.gain.setValueAtTime(vol * 0.3, time);
		gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
		osc.start(time);
		osc.stop(time + 0.2);
	});
}

function playTimerDing(ctx, vol, when) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.type = "sine";
	osc.frequency.setValueAtTime(1318, when);
	gain.gain.setValueAtTime(vol, when);
	gain.gain.exponentialRampToValueAtTime(0.001, when + 1.4);
	osc.start(when);
	osc.stop(when + 1.4);
}

function playTimerAlarm() {
	try {
		updateTimerSettingsFromDom({ persist: false });
		const ctx = getTimerAudioContext();
		if (!ctx) {
			return;
		}
		const vol = timerVolume();
		const when = ctx.currentTime + 0.05;
		const alarm = state.timerSettings?.alarm || "bell";
		if (alarm === "chime") {
			playTimerChime(ctx, vol, when);
		} else if (alarm === "beep") {
			playTimerBeep(ctx, vol, when);
		} else if (alarm === "ding") {
			playTimerDing(ctx, vol, when);
		} else {
			playTimerBell(ctx, vol, when);
		}
	} catch {
		// Audio is optional and can be blocked by browser policy.
	}
}

function notifyTimerDone() {
	if (typeof Notification === "undefined") {
		return;
	}
	if (Notification.permission === "granted") {
		try {
			new Notification("Timer done");
		} catch {
			// Notifications are optional.
		}
		return;
	}
	if (Notification.permission !== "denied") {
		void Notification.requestPermission().then((permission) => {
			if (permission === "granted") {
				try {
					new Notification("Timer done");
				} catch {
					// Notifications are optional.
				}
			}
		});
	}
}

function bindTimerControls() {
	const modal = app.querySelector("[data-timer-modal]");
	if (!modal || !state.timerOpen) {
		updateTimerDom();
		return;
	}
	modal.addEventListener("click", (event) => {
		if (event.target === modal) {
			closeTimer();
		}
	});
	modal.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			event.preventDefault();
			closeTimer();
		}
	});
	modal.querySelector("[data-timer-volume-slider]")?.addEventListener("input", () => {
		updateTimerSettingsFromDom({ persist: false });
	});
	modal
		.querySelector("[data-timer-volume-slider]")
		?.addEventListener("change", () => {
			updateTimerSettingsFromDom({ persist: true });
		});
	modal
		.querySelector("[data-timer-alarm-select]")
		?.addEventListener("change", () => {
			updateTimerSettingsFromDom({ persist: true });
		});
	modal.focus();
	updateTimerDom();
}

function dashboardIdentityItem(dashboard) {
	return (
		normalizeDashboardIdentity(state.dashboardIdentity).items[dashboard] ||
		DEFAULT_DASHBOARD_IDENTITY.items[dashboard]
	);
}

function dashboardDisplayLabel(dashboard) {
	return dashboardIdentityItem(dashboard)?.label || dashboard;
}

function dashboardDisplayIcon(dashboard) {
	return (
		dashboardIdentityItem(dashboard)?.icon ||
		DEFAULT_DASHBOARD_IDENTITY.items[dashboard]?.icon ||
		"tabler:circle"
	);
}

function dashboardColor(dashboard) {
	const fallback = DASHBOARD_COLORS[dashboard] || DASHBOARD_COLORS.Mind;
	return normalizeHexColor(dashboardIdentityItem(dashboard)?.color, fallback);
}

function dashboardDisplayNumber(dashboard) {
	return (
		dashboardIdentityItem(dashboard)?.number ||
		DEFAULT_DASHBOARD_IDENTITY.items[dashboard]?.number ||
		""
	);
}

function dashboardDisplayNameList() {
	const labels = DASHBOARD_LABELS.map(dashboardDisplayLabel);
	return labels.length > 1
		? `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`
		: labels[0] || "";
}

function dashboardTitleHtml(dashboard) {
	const parts = [];
	const identity = normalizeDashboardIdentity(state.dashboardIdentity);
	const optionHtml = {
		title: () =>
			`<span class="dashboard-card-name">${escapeHtml(
				dashboardDisplayLabel(dashboard).toUpperCase(),
			)}</span>`,
		numbers: () =>
			`<span class="dashboard-card-number">${escapeHtml(dashboardDisplayNumber(dashboard))}</span>`,
		icons: () =>
			`<span class="dashboard-card-icon">${iconHtml(dashboardDisplayIcon(dashboard))}</span>`,
	};
	identity.displayOptionOrder.forEach((optionId) => {
		const option = DASHBOARD_DISPLAY_OPTIONS.find((item) => item.id === optionId);
		if (!option || identity[option.stateKey] !== true) {
			return;
		}
		parts.push(optionHtml[option.id]());
	});
	if (!parts.length) {
		parts.push(optionHtml.numbers());
	}
	return parts.join("");
}

function dashboardTitleClassName() {
	const identity = normalizeDashboardIdentity(state.dashboardIdentity);
	const showsIconOnly =
		identity.showIcons === true &&
		identity.showTitle !== true &&
		identity.showNumbers !== true;
	return showsIconOnly
		? "dashboard-card-title dashboard-card-title--icon-only"
		: "dashboard-card-title";
}

function dashboardInlineLabelHtml(dashboard) {
	return `<span aria-hidden="true">${iconHtml(dashboardDisplayIcon(dashboard))}</span><span>${escapeHtml(
		dashboardDisplayLabel(dashboard),
	)}</span>`;
}

function dashboardHeaderTitleHtml(dashboard) {
	return `<span class="dashboard-header-title">${dashboardInlineLabelHtml(dashboard)}</span>`;
}

function isImageIconSource(value) {
	return /^(https?:\/\/|data:image\/|blob:|\/|\.\.?\/)[^"'<>]+$/i.test(
		String(value || "").trim(),
	);
}

function sanitizeSvgText(value) {
	const source = String(value || "").trim();
	if (!/^<svg[\s>]/i.test(source) || source.length > 16000) {
		return "";
	}
	try {
		const doc = new DOMParser().parseFromString(source, "image/svg+xml");
		if (
			doc.querySelector("parsererror") ||
			doc.documentElement?.tagName?.toLowerCase() !== "svg"
		) {
			return "";
		}
		doc
			.querySelectorAll("script, foreignObject, iframe, object, embed")
			.forEach((element) => {
				element.remove();
			});
		doc.querySelectorAll("*").forEach((element) => {
			Array.from(element.attributes).forEach((attribute) => {
				const name = attribute.name.toLowerCase();
				const rawValue = String(attribute.value || "");
				if (name.startsWith("on") || /javascript:/i.test(rawValue)) {
					element.removeAttribute(attribute.name);
				}
			});
		});
		return new XMLSerializer().serializeToString(doc.documentElement);
	} catch {
		return "";
	}
}

function svgIconDataUrl(value) {
	const sanitized = sanitizeSvgText(value);
	return sanitized
		? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(sanitized)}`
		: "";
}

function trackerIconHtml(source) {
	const value = String(source || "").trim();
	if (/^<svg[\s>]/i.test(value)) {
		const dataUrl = svgIconDataUrl(value);
		if (dataUrl) {
			return `<img class="tracker-orb-image" src="${escapeHtml(dataUrl)}" alt="">`;
		}
	}
	if (isImageIconSource(value)) {
		return `<img class="tracker-orb-image" src="${escapeHtml(value)}" alt="">`;
	}
	return iconHtml(value || "tabler:circle");
}

function iconDisplayName(icon) {
	const value = normalizeIconSource(icon);
	if (!value) {
		return "Pick icon";
	}
	if (/^<svg[\s>]/i.test(value) || isImageIconSource(value)) {
		return "Custom";
	}
	return iconifyIconLabel(value) || value;
}

function iconPickerFieldHtml({
	fieldId,
	value,
	title,
	color = "var(--accent)",
	colorFieldId = "",
	colorValue = "",
	previewId = "",
	showLabel = true,
}) {
	const icon = normalizeIconSource(value) || "tabler:circle";
	const label = iconDisplayName(icon);
	const resolvedColor = normalizeHexColor(
		colorValue,
		normalizeHexColor(color, color) || color,
	);
	const triggerText = showLabel
		? `<span class="icon-picker-trigger-label">${escapeHtml(label)}</span>`
		: "";
	return `
    <input class="icon-picker-input" id="${escapeHtml(fieldId)}" type="hidden" value="${escapeHtml(icon)}">
    ${colorFieldId ? `<input class="icon-picker-input" id="${escapeHtml(colorFieldId)}" type="hidden" value="${escapeHtml(resolvedColor)}">` : ""}
    <button class="icon-picker-trigger" data-action="open-icon-picker" data-icon-field="${escapeHtml(fieldId)}" data-icon-title="${escapeHtml(title || "Choose icon")}" data-icon-color="${escapeHtml(resolvedColor)}"${colorFieldId ? ` data-icon-color-field="${escapeHtml(colorFieldId)}"` : ""}${previewId ? ` data-icon-preview="${escapeHtml(previewId)}"` : ""} type="button" aria-label="${escapeHtml(`Choose icon: ${label}`)}" title="${escapeHtml(`Choose icon: ${label}`)}" style="--icon-picker-color: ${escapeHtml(resolvedColor)};">
      <span class="icon-picker-trigger-symbol" aria-hidden="true">${trackerIconHtml(icon)}</span>
      ${triggerText}
    </button>
  `;
}

function trackerEditKey(area, id, kind = "thought") {
	return `${trackerKind(kind)}:${area}:${id}`;
}

function parseTrackerEditKey(value) {
	const parts = String(value || "").split(":");
	if (parts.length >= 3) {
		return {
			kind: trackerKind(parts[0]),
			area: parts[1] || "",
			id: parts.slice(2).join(":"),
		};
	}
	return {
		kind: "thought",
		area: parts[0] || "",
		id: parts[1] || "",
	};
}

function iconifySearchKey(query, limit = 7) {
	return `${String(query || "")
		.trim()
		.toLowerCase()}|${limit}|${ICONIFY_PREFIXES}`;
}

function normalizeIconifyIcon(value) {
	return normalizeIconSource(String(value || "").trim());
}

function iconifyIconLabel(icon) {
	return normalizeIconifyIcon(icon).replace(/^[^:]+:/, "");
}

function iconSuggestionsForLabel(label, limit = 7) {
	const query = String(label || "").trim();
	if (query.length < 3) {
		return [];
	}
	return (state.iconSearchCache?.[iconifySearchKey(query, limit)] || [])
		.slice(0, limit)
		.map((icon) => ({ icon: normalizeIconifyIcon(icon) }));
}

function firstIconSuggestion(label, fallback = "tabler:circle") {
	return iconSuggestionsForLabel(label, 1)[0]?.icon || fallback;
}

async function searchIconifyIcons(label, limit = 7) {
	const query = String(label || "").trim();
	if (query.length < 3) {
		return [];
	}
	const cacheKey = iconifySearchKey(query, limit);
	if (Array.isArray(state.iconSearchCache?.[cacheKey])) {
		return state.iconSearchCache[cacheKey];
	}
	if (state.iconSearchInFlight[cacheKey]) {
		return state.iconSearchInFlight[cacheKey];
	}

	const params = new URLSearchParams({
		query,
		limit: String(Math.max(32, limit)),
		prefixes: ICONIFY_PREFIXES,
	});
	state.iconSearchInFlight[cacheKey] = fetch(
		`${ICONIFY_SEARCH_URL}?${params.toString()}`,
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Iconify search failed (${response.status}).`);
			}
			return response.json();
		})
		.then((payload) => {
			const icons = Array.isArray(payload.icons)
				? payload.icons
						.map(normalizeIconifyIcon)
						.filter(Boolean)
						.slice(0, Math.max(32, limit))
				: [];
			state.iconSearchCache = {
				...(state.iconSearchCache || {}),
				[cacheKey]: icons,
			};
			saveIconifySearchCache(state.iconSearchCache);
			return icons;
		})
		.catch(() => [])
		.finally(() => {
			const { [cacheKey]: _done, ...rest } = state.iconSearchInFlight;
			state.iconSearchInFlight = rest;
		});
	return state.iconSearchInFlight[cacheKey];
}

function iconPickerSearchResults(query, limit) {
	const normalizedQuery = String(query || "")
		.trim()
		.toLowerCase();
	const selected = normalizeIconSource(state.iconPicker?.selected || "");
	const withSelected = (icons) => {
		const unique = [
			...new Set(icons.map(normalizeIconifyIcon).filter(Boolean)),
		];
		if (
			selected &&
			!unique.includes(selected) &&
			(!normalizedQuery || selected.toLowerCase().includes(normalizedQuery))
		) {
			unique.unshift(selected);
		}
		return unique.slice(0, limit);
	};
	if (!normalizedQuery) {
		return withSelected(ICON_PICKER_DEFAULT_ICONS);
	}
	if (normalizedQuery.length < 3) {
		return withSelected(
			ICON_PICKER_DEFAULT_ICONS.filter((icon) =>
				icon.toLowerCase().includes(normalizedQuery),
			),
		);
	}
	return withSelected(
		state.iconSearchCache?.[iconifySearchKey(normalizedQuery, limit)] || [],
	);
}

function iconPickerGridHtml() {
	const picker = state.iconPicker;
	if (!picker) {
		return "";
	}
	const selected = normalizeIconSource(picker.selected || "tabler:circle");
	const query = String(picker.query || "").trim();
	const limit = Math.max(
		ICON_PICKER_PAGE_SIZE,
		Number(picker.limit) || ICON_PICKER_PAGE_SIZE,
	);
	const icons = iconPickerSearchResults(query, limit);
	const isSearchable = query.length >= 3;
	const isSearching =
		isSearchable &&
		Boolean(state.iconSearchInFlight?.[iconifySearchKey(query, limit)]);
	const emptyText =
		query.length && query.length < 3
			? "Type at least 3 letters to search more icons."
			: isSearching
				? "Loading icons..."
				: "No icons found yet.";
	return `
    <div class="icon-picker-grid" role="listbox" aria-label="Icon choices">
      ${
				icons.length
					? icons
							.map(
								(icon) => `
        <button class="icon-picker-option${selected === icon ? " is-selected" : ""}" data-action="select-icon-picker-icon" data-icon="${escapeHtml(icon)}" type="button" role="option" aria-selected="${selected === icon ? "true" : "false"}" title="${escapeHtml(icon)}">
          <span class="icon-picker-option-symbol" aria-hidden="true">${trackerIconHtml(icon)}</span>
          <span>${escapeHtml(iconDisplayName(icon))}</span>
        </button>
      `,
							)
							.join("")
					: `<div class="icon-picker-empty">${escapeHtml(emptyText)}</div>`
			}
    </div>
    <button class="secondary-button icon-picker-load-more" data-action="load-more-icon-picker" type="button"${query.length && query.length < 3 ? " disabled" : ""}>
      ${buttonContent("tabler:plus", "Load More")}
    </button>
  `;
}

function iconPickerColorHtml() {
	const picker = state.iconPicker;
	if (!picker?.colorFieldId) {
		return "";
	}
	const selectedColor = normalizeHexColor(
		picker.selectedColor,
		normalizeHexColor(picker.color, DASHBOARD_COLORS.Mind),
	);
	const presets = Array.from(
		new Set([selectedColor, ...ICON_PICKER_COLOR_PRESETS]),
	);
	return `
    <section class="icon-picker-color" aria-label="Color picker">
      <div class="icon-picker-color-top">
        <span>Color</span>
        <label class="icon-picker-hex">
          <span class="icon-picker-color-preview" style="--picked-color: ${escapeHtml(selectedColor)};" aria-hidden="true"></span>
          <input data-icon-picker-color-input type="text" value="${escapeHtml(selectedColor)}" inputmode="text" maxlength="7" spellcheck="false" aria-label="Hex color">
        </label>
      </div>
      <div class="icon-picker-swatches" role="listbox" aria-label="Color choices">
        ${presets
					.map(
						(color) => `
          <button class="icon-picker-swatch${selectedColor === color ? " is-selected" : ""}" data-action="select-icon-picker-color" data-color="${escapeHtml(color)}" type="button" role="option" aria-selected="${selectedColor === color ? "true" : "false"}" aria-label="${escapeHtml(color)}" title="${escapeHtml(color)}" style="--picked-color: ${escapeHtml(color)};"></button>
        `,
					)
					.join("")}
      </div>
    </section>
  `;
}

function iconPickerOverlayHtml() {
	const picker = state.iconPicker;
	if (!picker) {
		return "";
	}
	const selected = normalizeIconSource(picker.selected || "tabler:circle");
	const title = picker.title || "Choose icon";
	const color = picker.color || "var(--accent)";
	return `
    <div class="icon-picker-overlay" data-icon-picker-overlay>
      <section class="icon-picker-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}" style="--icon-picker-color: ${escapeHtml(color)};">
        <header class="icon-picker-header">
          <div class="icon-picker-current" aria-hidden="true">
            <span data-icon-picker-current-symbol>${trackerIconHtml(selected)}</span>
          </div>
          <div>
            <h2>${escapeHtml(title)}</h2>
            <p>Search icons and pick one from the grid.</p>
          </div>
          <div class="icon-picker-header-actions" aria-label="Icon picker actions">
            <button class="icon-button icon-picker-cancel" data-action="close-icon-picker" type="button" aria-label="Cancel icon selection" title="Cancel">${iconHtml("tabler:x")}</button>
            <button class="icon-button icon-picker-save" data-action="save-icon-picker" type="button" aria-label="Save icon selection" title="Save">${iconHtml("tabler:device-floppy")}</button>
          </div>
        </header>
        <label class="icon-picker-search">
          <span>Search</span>
          <input data-icon-picker-search type="search" value="${escapeHtml(picker.query || "")}" placeholder="brain, calendar, prayer, run">
        </label>
        ${iconPickerColorHtml()}
        <div class="icon-picker-results" data-icon-picker-results>
          ${iconPickerGridHtml()}
        </div>
      </section>
    </div>
  `;
}

function trackerKind(kind) {
	return kind === "goal" ? "goal" : "thought";
}

function trackerKindConfig(kind) {
	const normalized = trackerKind(kind);
	return normalized === "goal"
		? {
				kind: "goal",
				noun: "goal",
				plural: "goals",
				proper: "Goal",
				properPlural: "Goals",
				addLabel: "Add Goal",
				addTooltip: "Add goal",
				emptyNameAlert: "Add a goal name.",
				timestampVerb: "Checked",
				role: "goal-progress",
				labelProp: "goalLabel",
				iconProp: "goalIcon",
				idProp: "goalId",
				loggedProp: "goalLoggedAt",
			}
		: {
				kind: "thought",
				noun: "thought",
				plural: "thoughts",
				proper: "Thought",
				properPlural: "Thoughts",
				addLabel: "Add Thought",
				addTooltip: "Add thought",
				emptyNameAlert: "Add a thought name.",
				timestampVerb: "Logged",
				role: "thought",
				labelProp: "thoughtLabel",
				iconProp: "thoughtIcon",
				idProp: "thoughtId",
				loggedProp: "thoughtLoggedAt",
			};
}

function trackerSettingsForKind(kind) {
	return trackerKind(kind) === "goal"
		? state.goalSettings
		: state.trackerSettings;
}

function saveTrackerSettingsForKind(kind) {
	if (trackerKind(kind) === "goal") {
		saveGoalSettings();
	} else {
		saveTrackerSettings();
	}
}

function _normalizeTrackerSettingsForKind(kind, settings) {
	return trackerKind(kind) === "goal"
		? normalizeGoalSettings(settings)
		: normalizeTrackerSettings(settings);
}

function trackerAddKey(area, kind = "thought") {
	return `${trackerKind(kind)}:${area}`;
}

function isTrackerAddOpen(area, kind = "thought") {
	const key = state.trackerAddArea || "";
	return (
		key === trackerAddKey(area, kind) ||
		(trackerKind(kind) === "thought" && key === area)
	);
}

function trackerStripHtml(dashboard, options = {}) {
	const kind = trackerKind(options.kind);
	const isCombined = options.combined === true;
	const config = isCombined
		? {
				kind: "combined",
				noun: "orb",
				plural: "orbs",
				proper: "Orb",
				properPlural: "Orbs",
				addLabel: "Add Orb",
				addTooltip: "Add orb",
				emptyNameAlert: "Add an orb name.",
				timestampVerb: "Saved",
				role: "thought",
				labelProp: "thoughtLabel",
				iconProp: "thoughtIcon",
				idProp: "thoughtId",
				loggedProp: "thoughtLoggedAt",
			}
		: trackerKindConfig(kind);
	const normalizedKind = trackerKind(kind);
	const editable = Boolean(options.editable);
	const compact = Boolean(options.compact);
	const stripLabel = options.label || "";
	const stripIcon = options.icon || "";
	let entries = [];
	let maxPage = 0;
	let page = 0;
	const maxVisibleOrbs = TRACKER_ORBS_PER_ROW * TRACKER_ORB_ROWS;
	let reorderEnabled = editable;
	if (isCombined) {
		const thoughtTrackers =
			trackerSettingsForKind("thought")?.[dashboard] || [];
		const goalTrackers = trackerSettingsForKind("goal")?.[dashboard] || [];
		const enabledGoals = goalTrackers.filter((goal) => goal?.enabled);
		entries = [
			...thoughtTrackers.map((tracker) => ({
				...tracker,
				trackerKind: "thought",
			})),
			...enabledGoals.map((goal) => ({ ...goal, trackerKind: "goal" })),
		];
		reorderEnabled = entries.length >= maxVisibleOrbs;
	} else {
		const allTrackers =
			trackerSettingsForKind(normalizedKind)?.[dashboard] || [];
		entries =
			normalizedKind === "goal"
				? allTrackers.filter((tracker) => tracker?.enabled)
				: allTrackers;
		if (editable) {
			entries = [
				...allTrackers,
				{
					id: "__add__",
					label: config.addTooltip,
					icon: "tabler:plus",
					isAdd: true,
				},
			];
		}
		maxPage = Math.max(
			0,
			Math.ceil(entries.length / TRACKER_ORBS_PER_PAGE) - 1,
		);
		page = trackerPage(dashboard, editable, maxPage, kind);
	}
	const visibleEntries = isCombined
		? reorderEnabled
			? entries
			: entries.slice(0, maxVisibleOrbs)
		: entries.slice(
				page * TRACKER_ORBS_PER_PAGE,
				(page + 1) * TRACKER_ORBS_PER_PAGE,
			);
	if (!editable && !visibleEntries.length) {
		return "";
	}
	return `
    <section class="tracker-strip${compact ? " tracker-strip--compact" : ""}${editable ? " is-editable" : ""}" aria-label="${escapeHtml(dashboard)} ${escapeHtml(config.plural)}" style="--thought-color: ${dashboardColor(dashboard)};">
      ${stripLabel ? `<div class="tracker-strip-heading">${stripIcon ? `${iconHtml(stripIcon)} ` : ""}<span>${escapeHtml(stripLabel)}</span></div>` : ""}
      <div class="tracker-orb-row${isCombined ? " tracker-orb-row--combined" : ""}${reorderEnabled ? " is-reorder-enabled" : ""}" data-kind="${isCombined ? "combined" : kind}" data-area="${escapeHtml(dashboard)}" data-tracker-combined="${isCombined ? "true" : "false"}" data-tracker-draggable="${reorderEnabled ? "true" : "false"}"${editable || reorderEnabled ? ` data-tracker-reorder-row data-kind="${isCombined ? "combined" : kind}" data-area="${escapeHtml(dashboard)}"` : ""}>
        ${visibleEntries
					.map((tracker) =>
						tracker.isAdd
							? `
          <span class="tracker-orb-wrap">
            <button class="tracker-orb tracker-orb--add" data-action="start-add-tracker" data-kind="${kind}" data-area="${escapeHtml(dashboard)}" data-thought-tooltip="${escapeHtml(config.addTooltip)}" type="button" aria-label="Add ${escapeHtml(dashboard)} ${escapeHtml(config.noun)}">
              ${iconHtml("tabler:plus")}
            </button>
          </span>
        `
							: trackerOrbHtml(
									dashboard,
									tracker,
									editable,
									tracker.trackerKind || kind,
									reorderEnabled,
								),
					)
					.join("")}
      </div>
      ${
				maxPage > 0
					? `
        <div class="tracker-page-controls" aria-label="${escapeHtml(dashboard)} ${escapeHtml(config.noun)} pages">
          <button data-action="tracker-page" data-kind="${kind}" data-area="${escapeHtml(dashboard)}" data-direction="prev" data-max-page="${maxPage}" data-editable="${editable ? "true" : "false"}" type="button" aria-label="Previous ${escapeHtml(dashboard)} ${escapeHtml(config.plural)}"${page <= 0 ? " disabled" : ""}>${iconHtml("tabler:chevron-left")}</button>
          <span>${page + 1} / ${maxPage + 1}</span>
          <button data-action="tracker-page" data-kind="${kind}" data-area="${escapeHtml(dashboard)}" data-direction="next" data-max-page="${maxPage}" data-editable="${editable ? "true" : "false"}" type="button" aria-label="Next ${escapeHtml(dashboard)} ${escapeHtml(config.plural)}"${page >= maxPage ? " disabled" : ""}>${iconHtml("tabler:chevron-right")}</button>
        </div>
      `
					: ""
			}
    </section>
  `;
}

function trackerTooltipLabel(dashboard, tracker, kind = "thought") {
	if (trackerKind(kind) !== "goal") {
		return tracker.label;
	}
	const count = goalProgressCount(dashboard, tracker.id);
	return count
		? `${tracker.label} / ${count} check${count === 1 ? "" : "s"}`
		: tracker.label;
}

function trackerOrbHtml(
	dashboard,
	tracker,
	editable = false,
	kind = "thought",
	allowReorder = false,
	options = {},
) {
	const resolvedKind = tracker?.trackerKind || kind;
	const normalizedKind = trackerKind(resolvedKind);
	const config = trackerKindConfig(normalizedKind);
	const cooldownRemaining = editable
		? 0
		: thoughtCooldownRemaining(dashboard, tracker.id, normalizedKind);
	const isCooling = cooldownRemaining > 0;
	const isEnabled = normalizedKind !== "goal" || tracker?.enabled;
	const isEditing =
		state.trackerEditKey ===
		trackerEditKey(dashboard, tracker.id, normalizedKind);
	const actionAttrs = editable
		? ` data-action="start-edit-tracker" data-kind="${normalizedKind}" data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"`
		: isEnabled
			? ` data-action="${normalizedKind === "goal" ? "quick-goal" : "quick-thought"}" data-kind="${normalizedKind}" data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"`
			: "";
	const tooltip =
		normalizedKind === "goal" && !tracker?.enabled
			? "Enable in settings first"
			: trackerTooltipLabel(dashboard, tracker, normalizedKind);
	const isDraggable = editable || allowReorder;
	const wrapClass = options.wrapClass
		? ` ${escapeHtml(options.wrapClass)}`
		: "";
	const wrapStyle = options.inlineColor
		? ` style="--thought-color: ${escapeHtml(dashboardColor(dashboard))};"`
		: "";
	return `
    <span class="tracker-orb-wrap${wrapClass}"${isDraggable ? ` data-tracker-orb-wrap data-kind="${normalizedKind}" data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"` : ""}${wrapStyle}>
      <button class="tracker-orb${isCooling ? " is-cooling" : ""}${isEditing ? " is-editing" : ""}${isEnabled ? "" : " is-disabled"}" type="button"${actionAttrs} data-thought-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`${dashboardDisplayLabel(dashboard)} ${config.noun}: ${tracker.label}`)}"${isCooling || (!isEnabled && !editable) ? " disabled" : ""}>
        ${isCooling ? `<span class="tracker-cooldown-pie" aria-hidden="true"${thoughtCooldownPieStyle(cooldownRemaining)}></span>` : ""}
        <span class="tracker-orb-icon">${trackerIconHtml(tracker.icon)}</span>
      </button>
    </span>
  `;
}

function hasDashboardOrbs(dashboard) {
	const thoughtTrackers = trackerSettingsForKind("thought")?.[dashboard] || [];
	const enabledGoals = (
		trackerSettingsForKind("goal")?.[dashboard] || []
	).filter((goal) => goal?.enabled);
	return thoughtTrackers.length > 0 || enabledGoals.length > 0;
}

function dashboardOrbNavHtml(dashboard) {
	if (!hasDashboardOrbs(dashboard)) {
		return "";
	}
	return `
    <div class="dashboard-orb-nav" aria-label="${escapeHtml(dashboardDisplayLabel(dashboard))} orbs">
      ${trackerStripHtml(dashboard, { combined: true, label: "", icon: "tabler:planet" })}
    </div>
  `;
}

function dashboardQuickOrbEntries(kind) {
	const normalizedKind = trackerKind(kind);
	const settings = trackerSettingsForKind(normalizedKind) || {};
	return DASHBOARD_LABELS.flatMap((dashboard) =>
		(settings[dashboard] || [])
			.filter((tracker) =>
				normalizedKind === "goal" ? tracker?.enabled : true,
			)
			.map((tracker) => ({ dashboard, tracker, kind: normalizedKind })),
	);
}

function dashboardQuickOrbGroupHtml(kind, label) {
	const entries = dashboardQuickOrbEntries(kind);
	if (!entries.length) {
		return "";
	}
	const config = trackerKindConfig(kind);
	return `
    <fieldset class="dashboard-orb-fieldset dashboard-orb-fieldset--${escapeHtml(kind)}">
      <legend>${escapeHtml(label)}</legend>
      <div class="dashboard-orb-scroll" data-dashboard-orb-scroll tabindex="0" aria-label="${escapeHtml(label)} quick ${escapeHtml(config.plural)}">
        <div class="dashboard-orb-scroll-track">
          ${entries
						.map(({ dashboard, tracker }) =>
							trackerOrbHtml(dashboard, tracker, false, kind, false, {
								inlineColor: true,
								wrapClass: "dashboard-orb-quick-item",
							}),
						)
						.join("")}
        </div>
      </div>
    </fieldset>
  `;
}

function dashboardQuickOrbsHtml() {
	const thoughtOrbs = dashboardQuickOrbGroupHtml("thought", "Thoughts");
	const goalOrbs = dashboardQuickOrbGroupHtml("goal", "Goals");
	if (!thoughtOrbs && !goalOrbs) {
		return "";
	}
	return `
    <div class="dashboard-orbs-panel" aria-label="Quick tracker orbs">
      ${thoughtOrbs}
      ${goalOrbs}
    </div>
  `;
}

function trackerFieldId(area, field) {
	return `tracker-${String(area).toLowerCase()}-${field}`;
}

function addTracker(area, kind = "thought") {
	if (!DASHBOARD_LABELS.includes(area)) {
		return;
	}
	const normalizedKind = trackerKind(kind);
	const config = trackerKindConfig(normalizedKind);
	const label = document
		.getElementById(trackerFieldId(area, "label"))
		?.value.trim();
	const iconInput = document
		.getElementById(trackerFieldId(area, "icon"))
		?.value.trim();
	const icon = iconInput || firstIconSuggestion(label);
	if (!label) {
		window.alert(config.emptyNameAlert);
		return;
	}
	const currentSettings = trackerSettingsForKind(normalizedKind);
	const next = {
		...currentSettings,
		[area]: [
			...(currentSettings?.[area] || []),
			{
				id: makeId(`${area.toLowerCase()}-tracker`),
				label,
				icon,
				isGoal: normalizedKind === "goal",
				...(normalizedKind === "goal"
					? { enabled: true, ...normalizeGoalFrequency({}) }
					: {}),
			},
		],
	};
	if (normalizedKind === "goal") {
		state.goalSettings = normalizeGoalSettings(next);
	} else {
		state.trackerSettings = normalizeTrackerSettings(next);
	}
	saveTrackerSettingsForKind(normalizedKind);
	setState({ trackerAddArea: "", trackerEditKey: "", trackerDeleteKey: "" });
}

function trackerDraftFromEditForm(area, id, kind = "thought", current = {}) {
	const normalizedKind = trackerKind(kind);
	const label = document
		.getElementById(trackerFieldId(`${area}-${id}`, "label"))
		?.value.trim();
	const iconInput = document
		.getElementById(trackerFieldId(`${area}-${id}`, "icon"))
		?.value.trim();
	const icon =
		iconInput || firstIconSuggestion(label, current.icon || "tabler:circle");
	const draft = {
		...current,
		label,
		icon,
	};
	if (normalizedKind === "goal") {
		const enabledInput = document.getElementById(
			trackerFieldId(`${area}-${id}`, "enabled"),
		);
		const frequencyInput = document.getElementById(
			trackerFieldId(`${area}-${id}`, "frequency"),
		);
		const customDaysInput = document.getElementById(
			trackerFieldId(`${area}-${id}`, "custom-days"),
		);
		return {
			...draft,
			enabled: Boolean(enabledInput?.checked),
			...normalizeGoalFrequency({
				frequency: frequencyInput?.value || current.frequency,
				customDays: customDaysInput?.value || current.customDays,
			}),
		};
	}
	return draft;
}

function updateTracker(area, id, kind = "thought", options = {}) {
	if (!DASHBOARD_LABELS.includes(area) || !id) {
		return;
	}
	const closeEditor = options.close !== false;
	const silent = Boolean(options.silent);
	const normalizedKind = trackerKind(kind);
	const config = trackerKindConfig(normalizedKind);
	const isGoal = normalizedKind === "goal";
	const currentSettings = trackerSettingsForKind(normalizedKind);
	const current = (currentSettings?.[area] || []).find(
		(tracker) => tracker.id === id,
	);
	const draft = current
		? trackerDraftFromEditForm(area, id, normalizedKind, current)
		: null;
	const label = draft?.label;
	if (!current || !label) {
		if (!silent) {
			window.alert(config.emptyNameAlert);
		}
		return;
	}
	const next = {
		...currentSettings,
		[area]: (currentSettings?.[area] || []).map((tracker) =>
			tracker.id === id
				? {
						...tracker,
						...draft,
						isGoal,
						...(isGoal ? normalizeGoalFrequency(draft) : {}),
					}
				: tracker,
		),
	};
	if (normalizedKind === "goal") {
		state.goalSettings = normalizeGoalSettings(next);
	} else {
		state.trackerSettings = normalizeTrackerSettings(next);
	}
	saveTrackerSettingsForKind(normalizedKind);
	if (closeEditor) {
		setState({ trackerEditKey: "", trackerDeleteKey: "" });
	}
}

function transferTrackerKind(area, id, kind = "thought") {
	if (!DASHBOARD_LABELS.includes(area) || !id) {
		return;
	}
	const sourceKind = trackerKind(kind);
	const targetKind = sourceKind === "goal" ? "thought" : "goal";
	const sourceSettings = trackerSettingsForKind(sourceKind);
	const targetSettings = trackerSettingsForKind(targetKind);
	const sourceTrackers = sourceSettings?.[area] || [];
	const current = sourceTrackers.find((tracker) => tracker.id === id);
	if (!current) {
		return;
	}
	const sourceConfig = trackerKindConfig(sourceKind);
	const draft = trackerDraftFromEditForm(area, id, sourceKind, current);
	if (!draft.label) {
		window.alert(sourceConfig.emptyNameAlert);
		return;
	}
	const movedTracker =
		targetKind === "goal"
			? normalizeGoalTracker(
					{
						...draft,
						isGoal: true,
						enabled: typeof draft.enabled === "boolean" ? draft.enabled : true,
						...normalizeGoalFrequency(draft),
					},
					area,
					(targetSettings?.[area] || []).length,
				)
			: normalizeTracker(
					{ ...draft, isGoal: false },
					area,
					(targetSettings?.[area] || []).length,
				);
	const nextSource = {
		...sourceSettings,
		[area]: sourceTrackers.filter((tracker) => tracker.id !== id),
	};
	const nextTarget = {
		...targetSettings,
		[area]: [
			...(targetSettings?.[area] || []).filter((tracker) => tracker.id !== id),
			movedTracker,
		],
	};
	if (sourceKind === "goal") {
		state.goalSettings = normalizeGoalSettings(nextSource);
		state.trackerSettings = normalizeTrackerSettings(nextTarget);
	} else {
		state.trackerSettings = normalizeTrackerSettings(nextSource);
		state.goalSettings = normalizeGoalSettings(nextTarget);
	}
	saveTrackerSettings();
	saveGoalSettings();
	setState({
		trackerEditKey: trackerEditKey(area, id, targetKind),
		trackerDeleteKey: "",
		trackerAddArea: "",
		settingsTab:
			state.sidebarSubmenu === "settings"
				? targetKind === "goal"
					? "goals"
					: "thoughts"
				: state.settingsTab,
	});
}

function reorderTracker(area, trackerId, targetIndex, kind = "thought") {
	if (!DASHBOARD_LABELS.includes(area)) {
		return false;
	}
	const normalizedKind = trackerKind(kind);
	const currentSettings = trackerSettingsForKind(normalizedKind);
	const trackers = currentSettings?.[area] || [];
	const fromIndex = trackers.findIndex((tracker) => tracker.id === trackerId);
	if (fromIndex < 0) {
		return false;
	}

	const nextTrackers = [...trackers];
	const [movedTracker] = nextTrackers.splice(fromIndex, 1);
	const nextIndex = Math.min(Math.max(targetIndex, 0), nextTrackers.length);
	nextTrackers.splice(nextIndex, 0, movedTracker);
	if (
		nextTrackers.map((tracker) => tracker.id).join("|") ===
		trackers.map((tracker) => tracker.id).join("|")
	) {
		return false;
	}

	const next = {
		...currentSettings,
		[area]: nextTrackers,
	};
	if (normalizedKind === "goal") {
		state.goalSettings = normalizeGoalSettings(next);
	} else {
		state.trackerSettings = normalizeTrackerSettings(next);
	}
	saveTrackerSettingsForKind(normalizedKind);
	setState({ trackerEditKey: "", trackerDeleteKey: "", trackerAddArea: "" });
	return true;
}

function removeTracker(area, id, kind = "thought") {
	if (!DASHBOARD_LABELS.includes(area) || !id) {
		return;
	}
	const normalizedKind = trackerKind(kind);
	const currentSettings = trackerSettingsForKind(normalizedKind);
	const next = {
		...currentSettings,
		[area]: (currentSettings?.[area] || []).filter(
			(tracker) => tracker.id !== id,
		),
	};
	if (normalizedKind === "goal") {
		state.goalSettings = normalizeGoalSettings(next);
	} else {
		state.trackerSettings = normalizeTrackerSettings(next);
	}
	saveTrackerSettingsForKind(normalizedKind);
	setState({
		trackerAddArea:
			state.trackerAddArea === trackerAddKey(area, normalizedKind)
				? ""
				: state.trackerAddArea,
		trackerEditKey:
			state.trackerEditKey === trackerEditKey(area, id, normalizedKind)
				? ""
				: state.trackerEditKey,
		trackerDeleteKey:
			state.trackerDeleteKey === trackerEditKey(area, id, normalizedKind)
				? ""
				: state.trackerDeleteKey,
	});
}

function thoughtCooldownKey(area, id, kind = "thought") {
	return `${trackerKind(kind)}:${area}:${id}`;
}

function thoughtCooldownRemaining(area, id, kind = "thought") {
	const endTime =
		state.thoughtCooldowns?.[thoughtCooldownKey(area, id, kind)] || 0;
	return Math.max(0, endTime - Date.now());
}

function thoughtCooldownPieStyle(remaining) {
	const remainingMs = Math.max(0, Math.ceil(Number(remaining) || 0));
	const angle = Math.max(
		0,
		Math.min(360, (remainingMs / THOUGHT_COOLDOWN_MS) * 360),
	);
	return ` style="--cooldown-start-angle: ${angle.toFixed(3)}deg; --cooldown-duration: ${remainingMs}ms;"`;
}

function thoughtTimestampLabel(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return currentTimestampLabel();
	}
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function thoughtDateInputValue(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return todayDateKey();
	}
	return dateKeyFromDate(date);
}

function thoughtTimeInputValue(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		const now = new Date();
		return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
	}
	return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function thoughtTimestampFromToastControls() {
	const dateValue =
		document.getElementById("thought-toast-date")?.value ||
		thoughtDateInputValue(state.thoughtToast?.timestamp);
	const timeValue =
		document.getElementById("thought-toast-time")?.value ||
		thoughtTimeInputValue(state.thoughtToast?.timestamp);
	const date = new Date(`${dateValue}T${timeValue}`);
	return Number.isNaN(date.getTime())
		? state.thoughtToast?.timestamp || nowIso()
		: date.toISOString();
}

function trackerKindForNote(note) {
	return note?.properties?.role === "goal-progress" ? "goal" : "thought";
}

function thoughtNoteWithTimestamp(note, timestamp) {
	const date = new Date(timestamp);
	if (!note || Number.isNaN(date.getTime())) {
		return note;
	}
	if (note.properties?.role === "body-log") {
		const dateKey = dateKeyFromDate(date);
		const audit = Array.isArray(note.properties?.audit)
			? note.properties.audit
			: [];
		return {
			...note,
			created: timestamp,
			properties: {
				...(note.properties || {}),
				dateKey,
				bodyLoggedAt: timestamp,
				audit: audit.map((entry) =>
					entry.action === "created"
						? { ...entry, at: timestamp, dateKey }
						: entry,
				),
			},
		};
	}
	const kind = trackerKindForNote(note);
	const config = trackerKindConfig(kind);
	const label =
		note.properties?.[config.labelProp] ||
		state.thoughtToast?.label ||
		note.title;
	const dateKey = dateKeyFromDate(date);
	const title =
		kind === "goal"
			? `${label} Progress ${formatEventTime(timestamp) || thoughtTimestampLabel(timestamp)}`
			: `${label} ${formatEventTime(timestamp) || thoughtTimestampLabel(timestamp)}`;
	const timestampLine = `${config.timestampVerb}: ${thoughtTimestampLabel(timestamp)}`;
	const markerPattern = new RegExp(`${config.timestampVerb}: .*`);
	const body = markerPattern.test(String(note.body || ""))
		? String(note.body || "").replace(markerPattern, timestampLine)
		: `${String(note.body || "").trimEnd()}\n${timestampLine}`;
	const audit = Array.isArray(note.properties?.audit)
		? note.properties.audit
		: [];
	return {
		...note,
		title,
		body,
		created: timestamp,
		properties: {
			...(note.properties || {}),
			dateKey,
			[config.loggedProp]: timestamp,
			audit: audit.map((entry) =>
				entry.action === "created"
					? { ...entry, at: timestamp, title, dateKey }
					: entry,
			),
		},
	};
}

function scheduleThoughtToastFade(toast = state.thoughtToast, delay = 3500) {
	window.clearTimeout(thoughtToastFadeTimer);
	window.clearTimeout(thoughtToastHideTimer);
	if (!toast) {
		return;
	}
	thoughtToastFadeTimer = window.setTimeout(() => {
		if (isThoughtToastHeldOpen()) {
			pauseThoughtToastFade();
			return;
		}
		const element = app.querySelector(".thought-toast");
		element?.classList.remove("is-held");
		element?.classList.add("is-fading");
	}, delay);
	thoughtToastHideTimer = window.setTimeout(() => {
		if (isThoughtToastHeldOpen()) {
			pauseThoughtToastFade();
			return;
		}
		if (state.thoughtToast?.noteId === toast.noteId) {
			state.thoughtToast = null;
			render();
		}
	}, delay + 2000);
}

function pauseThoughtToastFade() {
	window.clearTimeout(thoughtToastFadeTimer);
	window.clearTimeout(thoughtToastHideTimer);
	const toast = app.querySelector(".thought-toast");
	toast?.classList.add("is-held");
	toast?.classList.remove("is-fading");
}

function isThoughtToastHeldOpen() {
	const toast = app.querySelector(".thought-toast");
	return Boolean(
		toast &&
			(toast.contains(document.activeElement) || toast.matches(":hover")),
	);
}

function resumeThoughtToastFade(delay = 0) {
	if (isThoughtToastHeldOpen()) {
		pauseThoughtToastFade();
		return;
	}
	app.querySelector(".thought-toast")?.classList.remove("is-held");
	scheduleThoughtToastFade(state.thoughtToast, delay);
}

function showThoughtToast(toast) {
	state.thoughtToast = toast;
	render();
	scheduleThoughtToastFade(toast);
}

function captureThoughtToastFocus() {
	const active = document.activeElement;
	if (
		!(active instanceof HTMLInputElement) ||
		!active.id.startsWith("thought-toast-")
	) {
		return null;
	}
	return {
		id: active.id,
		start: active.type === "text" ? active.selectionStart : null,
		end: active.type === "text" ? active.selectionEnd : null,
	};
}

function restoreThoughtToastFocus(focusState) {
	if (!focusState) {
		return;
	}
	const input = document.getElementById(focusState.id);
	if (!(input instanceof HTMLInputElement)) {
		return;
	}
	input.focus({ preventScroll: true });
	if (
		input.type === "text" &&
		typeof focusState.start === "number" &&
		typeof focusState.end === "number"
	) {
		input.setSelectionRange(focusState.start, focusState.end);
	}
	pauseThoughtToastFade();
}

function editorDraftKeyFor(saveAction, id) {
	if (!id) {
		return "";
	}
	if (saveAction === "save-compendium") {
		return `compendium:${id}`;
	}
	if (saveAction === "save-section") {
		return `section:${id}`;
	}
	if (saveAction === "save-artifact-note") {
		return `artifact:${id}`;
	}
	return "";
}

function currentEditorDraftKey() {
	if (state.active === "Mind" && state.mindMode === "compendium-editor") {
		return editorDraftKeyFor("save-compendium", state.selectedCompendiumId);
	}
	if (state.active === "Mind" && state.mindMode === "section-editor") {
		return editorDraftKeyFor("save-section", state.selectedSectionId);
	}
	if (state.artifactMode === "editor") {
		return editorDraftKeyFor("save-artifact-note", state.selectedArtifactId);
	}
	return "";
}

function editorDraftFieldValue(key, fieldId, fallback = "") {
	const value = state.editorDrafts?.[key]?.fields?.[fieldId];
	return value === undefined || value === null ? fallback : String(value);
}

function editorDraftArrayValues(key, fieldId, fallback = []) {
	const value = state.editorDrafts?.[key]?.fields?.[fieldId];
	return Array.isArray(value) ? value : fallback;
}

function clearEditorDraft(key) {
	if (!key || !state.editorDrafts?.[key]) {
		return;
	}
	const nextDrafts = { ...state.editorDrafts };
	delete nextDrafts[key];
	state.editorDrafts = nextDrafts;
}

function _clearCurrentEditorDraft() {
	const formKey =
		app.querySelector("[data-editor-draft-key]")?.dataset.editorDraftKey || "";
	clearEditorDraft(formKey || currentEditorDraftKey());
}

function captureFieldSelection(field) {
	try {
		if (
			typeof field.selectionStart === "number" &&
			typeof field.selectionEnd === "number"
		) {
			return {
				start: field.selectionStart,
				end: field.selectionEnd,
			};
		}
	} catch {
		// Some input types do not expose text selection.
	}
	return { start: null, end: null };
}

function captureEditorDraft() {
	const form = app.querySelector("[data-editor-draft-key]");
	const key = form?.dataset.editorDraftKey || "";
	if (!key) {
		return null;
	}

	const fields = {};
	form.querySelectorAll("input, textarea, select").forEach((field) => {
		if (!field.id) {
			return;
		}
		if (field instanceof HTMLInputElement && field.type === "checkbox") {
			fields[field.id] = field.checked;
			return;
		}
		fields[field.id] = field.value;
	});

	if (form.querySelector("[data-life-tracker]")) {
		["thought", "goal"].forEach((kind) => {
			fields[`life-${kind}-trackers`] = Array.from(
				form.querySelectorAll(`[data-life-tracker="${kind}"]:checked`),
			).map((field) => field.value);
		});
	}

	const active = document.activeElement;
	let focus = null;
	if (
		active &&
		form.contains(active) &&
		(active instanceof HTMLInputElement ||
			active instanceof HTMLTextAreaElement ||
			active instanceof HTMLSelectElement)
	) {
		focus = {
			id: active.id || "",
			...captureFieldSelection(active),
		};
	}

	const draft = {
		key,
		fields,
		focus,
	};
	state.editorDrafts = {
		...(state.editorDrafts || {}),
		[key]: draft,
	};
	return draft;
}

function restoreEditorDraftFocus(draft) {
	if (!draft?.focus?.id) {
		return;
	}
	const form = app.querySelector("[data-editor-draft-key]");
	if (form?.dataset.editorDraftKey !== draft.key) {
		return;
	}
	const field = document.getElementById(draft.focus.id);
	if (
		!(
			field instanceof HTMLInputElement ||
			field instanceof HTMLTextAreaElement ||
			field instanceof HTMLSelectElement
		)
	) {
		return;
	}
	field.focus({ preventScroll: true });
	if (
		typeof draft.focus.start === "number" &&
		typeof draft.focus.end === "number"
	) {
		try {
			field.setSelectionRange(draft.focus.start, draft.focus.end);
		} catch {
			// Non-text inputs can be focused without restoring a selection range.
		}
	}
}

function isEditableAppElement(element) {
	return Boolean(
		element &&
			app.contains(element) &&
			(element instanceof HTMLInputElement ||
				element instanceof HTMLTextAreaElement ||
				element instanceof HTMLSelectElement ||
				element.isContentEditable ||
				element.closest?.("[contenteditable='true']")),
	);
}

function isUserEditingInterface() {
	if (isEditableAppElement(document.activeElement)) {
		return true;
	}
	return Boolean(app.querySelector("[data-editor-draft-key]"));
}

function clearThoughtToast() {
	window.clearTimeout(thoughtToastFadeTimer);
	window.clearTimeout(thoughtToastHideTimer);
	state.thoughtToast = null;
	render();
}

function submitThoughtToastNote(noteId, text) {
	const body = String(text || "").trim();
	if (!body || !noteId || !state.artifactStore) {
		return;
	}
	const current = findArtifact(state.artifactStore, noteId);
	if (!current) {
		return;
	}
	const now = nowIso();
	const timestamp = thoughtTimestampFromToastControls();
	const adjusted = thoughtNoteWithTimestamp(current, timestamp);
	const kind = trackerKindForNote(adjusted);
	const config = trackerKindConfig(kind);
	const entry = `- ${thoughtTimestampLabel(timestamp)}: ${body}`;
	persistArtifactStore(
		upsertArtifact(state.artifactStore, {
			...adjusted,
			body: `${String(adjusted.body || "").trimEnd()}\n\n${entry}`.trim(),
			edited: now,
			properties: {
				...(adjusted.properties || {}),
				quickNotes: [
					...(adjusted.properties?.quickNotes || []).slice(-20),
					{ at: timestamp, body },
				],
				audit: [
					...(adjusted.properties?.audit || []).slice(-20),
					{
						at: timestamp,
						action: "quick-note",
						title: adjusted.title,
						dateKey: dateKeyFromValue(timestamp),
						[config.labelProp]: adjusted.properties?.[config.labelProp] || "",
					},
				],
			},
		}),
	);
	clearThoughtToast();
}

function applyThoughtToastTimestamp(noteId) {
	if (!noteId || !state.artifactStore) {
		return;
	}
	const current = findArtifact(state.artifactStore, noteId);
	if (!current) {
		return;
	}
	persistArtifactStore(
		upsertArtifact(state.artifactStore, {
			...thoughtNoteWithTimestamp(current, thoughtTimestampFromToastControls()),
			edited: nowIso(),
		}),
	);
}

async function deleteThoughtToastNote(noteId) {
	if (!noteId || !state.artifactStore) {
		return;
	}
	const note = findArtifact(state.artifactStore, noteId);
	if (!note) {
		clearThoughtToast();
		return;
	}
	const moved = await moveArtifactToTrash(note, {
		confirmText: `Move "${note.title}" to Trash?`,
	});
	if (!moved) {
		return;
	}
	window.clearTimeout(thoughtToastFadeTimer);
	window.clearTimeout(thoughtToastHideTimer);
	setState({
		thoughtToast: null,
		selectedArtifactId:
			state.selectedArtifactId === noteId ? null : state.selectedArtifactId,
		artifactMode:
			state.selectedArtifactId === noteId ? "grid" : state.artifactMode,
		artifactReturnActive:
			state.selectedArtifactId === noteId ? "" : state.artifactReturnActive,
	});
}

function launchGoalBurst(triggerElement, color = DASHBOARD_COLORS.Mind) {
	if (!(triggerElement instanceof HTMLElement)) {
		return;
	}
	const reducedMotion = Boolean(
		window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
	);
	const rect = triggerElement.getBoundingClientRect();
	if (!rect.width || !rect.height) {
		return;
	}
	const burst = document.createElement("span");
	burst.className = "goal-confetti-burst";
	if (reducedMotion) {
		burst.classList.add("is-reduced-motion");
	}
	burst.style.left = `${rect.left + rect.width / 2}px`;
	burst.style.top = `${rect.top + rect.height / 2}px`;
	burst.style.setProperty("--goal-color", color || DASHBOARD_COLORS.Mind);
	const particles = 12;
	for (let index = 0; index < particles; index += 1) {
		const particle = document.createElement("i");
		const angle = (Math.PI * 2 * index) / particles;
		const distance =
			(reducedMotion ? 14 : 22) + (index % 4) * (reducedMotion ? 3 : 7);
		particle.style.setProperty("--burst-x", `${Math.cos(angle) * distance}px`);
		particle.style.setProperty("--burst-y", `${Math.sin(angle) * distance}px`);
		particle.style.setProperty("--burst-rotate", `${index * 37}deg`);
		particle.style.animationDelay = `${index * 18}ms`;
		burst.append(particle);
	}
	document.body.append(burst);
	window.setTimeout(() => burst.remove(), 2100);
}

function goalProgressArtifacts(area, goalId = "") {
	if (!state.artifactStore) {
		return [];
	}
	return rootNotesForDashboard(state.artifactStore, area)
		.filter((note) => note.properties?.role === "goal-progress")
		.filter((note) => !goalId || note.properties?.goalId === goalId);
}

function goalProgressCount(area, goalId = "") {
	return goalProgressArtifacts(area, goalId).length;
}

function quickTrackerEntry(area, id, kind = "thought", triggerElement = null) {
	if (!state.artifactStore || !DASHBOARD_LABELS.includes(area)) {
		return;
	}
	const normalizedKind = trackerKind(kind);
	const config = trackerKindConfig(normalizedKind);
	const cooldownKey = thoughtCooldownKey(area, id, normalizedKind);
	const tracker = (trackerSettingsForKind(normalizedKind)?.[area] || []).find(
		(item) => item.id === id,
	);
	if (!tracker || (normalizedKind === "goal" && !tracker.enabled)) {
		return;
	}
	if (
		thoughtCooldownRemaining(area, id, normalizedKind) > 0 ||
		state.thoughtCreateLocks[cooldownKey]
	) {
		return;
	}
	if (normalizedKind === "goal") {
		launchGoalBurst(triggerElement, dashboardColor(area));
	}
	state.thoughtCreateLocks = {
		...state.thoughtCreateLocks,
		[cooldownKey]: true,
	};
	const now = nowIso();
	const title =
		normalizedKind === "goal"
			? `${tracker.label} Progress ${formatEventTime(now) || thoughtTimestampLabel(now)}`
			: `${tracker.label} ${formatEventTime(now) || thoughtTimestampLabel(now)}`;
	const note = {
		id: makeId(normalizedKind === "goal" ? "goal" : "thought"),
		type: "note",
		dashboard: area,
		parentId: null,
		title,
		body: [
			`## ${tracker.label}`,
			"",
			`${config.timestampVerb}: ${thoughtTimestampLabel(now)}`,
			"",
		].join("\n"),
		created: now,
		edited: now,
		childIds: [],
		properties: {
			role: config.role,
			status: "active",
			dateKey: todayDateKey(),
			[config.labelProp]: tracker.label,
			[config.iconProp]: tracker.icon,
			[config.idProp]: tracker.id,
			[config.loggedProp]: now,
			audit: [
				{
					at: now,
					action: "created",
					title,
					dateKey: todayDateKey(),
					[config.labelProp]: tracker.label,
				},
			],
		},
		analysis: {},
	};
	state.thoughtCooldowns = {
		...state.thoughtCooldowns,
		[cooldownKey]: Date.now() + THOUGHT_COOLDOWN_MS,
	};
	persistArtifactStore(upsertArtifact(state.artifactStore, note));
	const { [cooldownKey]: _created, ...nextCreateLocks } =
		state.thoughtCreateLocks;
	state.thoughtCreateLocks = nextCreateLocks;
	const progressCount =
		normalizedKind === "goal" ? goalProgressCount(area, tracker.id) : 0;
	showThoughtToast({
		kind: normalizedKind,
		noteId: note.id,
		dashboard: area,
		label: tracker.label,
		timestamp: now,
		metric:
			normalizedKind === "goal"
				? `${progressCount} check${progressCount === 1 ? "" : "s"}`
				: "",
	});
	window.setTimeout(() => {
		if (state.thoughtCooldowns[cooldownKey] <= Date.now()) {
			const { [cooldownKey]: _expired, ...nextCooldowns } =
				state.thoughtCooldowns;
			state.thoughtCooldowns = nextCooldowns;
			render();
		}
	}, THOUGHT_COOLDOWN_MS + 50);
}

function quickThought(area, id) {
	quickTrackerEntry(area, id, "thought");
}

function quickGoal(area, id, triggerElement = null) {
	quickTrackerEntry(area, id, "goal", triggerElement);
}

function duckDuckGoUrl(query, options = "") {
	return `https://duckduckgo.com/?q=${encodeURIComponent(query.trim())}${options}`;
}

function spiritLookupQuery(work, suffix = "") {
	return [work.title, work.author, suffix].filter(Boolean).join(" ");
}

function spiritLookupBarHtml(work) {
	const title = work.title || "";
	const author = work.author || "";
	const freeSites =
		"site:gutenberg.org OR site:gutenberg.net.au OR site:gutenberg.ca OR site:archive.org OR site:wikisource.org OR site:fadedpage.com OR site:standardebooks.org OR site:freeread.de";
	const buySites =
		"site:amazon.com OR site:ebay.com OR site:abebooks.com OR site:barnesandnoble.com OR site:thriftbooks.com OR site:bookshop.org";
	const outlineSites =
		"site:sparknotes.com OR site:litcharts.com OR site:gradesaver.com OR site:cliffsnotes.com OR site:shmoop.com OR site:wikipedia.org OR site:britannica.com OR site:plato.stanford.edu";
	const links = [
		[
			"Wikipedia",
			"tabler:brand-wikipedia",
			`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(spiritLookupQuery(work))}`,
		],
		[
			"WikiSearch",
			"tabler:world-search",
			`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(spiritLookupQuery(work, "summary analysis themes"))}`,
		],
		["Search", "tabler:search", duckDuckGoUrl(spiritLookupQuery(work))],
		[
			"Videos",
			"tabler:player-play",
			duckDuckGoUrl(
				spiritLookupQuery(work, "lecture documentary analysis"),
				"&iax=videos&ia=videos",
			),
		],
		[
			"Audiobooks",
			"tabler:headphones",
			duckDuckGoUrl(
				`"${title}" ${author} public domain audiobook site:librivox.org OR site:archive.org OR site:gutenberg.org`,
			),
		],
		[
			"Free Online",
			"tabler:external-link",
			duckDuckGoUrl(`"${title}" ${author} (${freeSites})`),
		],
		[
			"Buy Book",
			"tabler:shopping-bag",
			duckDuckGoUrl(`"${title}" ${author} (${buySites})`),
		],
		[
			"Goodreads",
			"tabler:book-2",
			`https://www.goodreads.com/search?q=${encodeURIComponent(spiritLookupQuery(work))}`,
		],
		[
			"Outlines",
			"tabler:list-details",
			duckDuckGoUrl(`"${title}" ${author} (${outlineSites})`),
		],
		[
			"Biography",
			"tabler:user",
			duckDuckGoUrl(
				`"${author}" biography life history documentary lecture video`,
			),
		],
		[
			"Context",
			"tabler:world",
			duckDuckGoUrl(
				`"${author}" historical context era time period contemporaries influences philosophy culture`,
			),
		],
	];

	return `
    <section class="spirit-lookup-bar" aria-label="Book lookup links">
      ${links
				.map(
					([label, icon, href]) => `
        <a class="spirit-lookup-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
          ${buttonContent(icon, label)}
        </a>
      `,
				)
				.join("")}
    </section>
  `;
}

function cleanSummaryText(value) {
	return String(value || "")
		.replace(/[#>*`-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function shortSummary(value, fallback = "Nothing yet") {
	const text = cleanSummaryText(value);
	if (!text) {
		return fallback;
	}
	return text.length > 46 ? `${text.slice(0, 43)}...` : text;
}

function lastAuditEntry(item) {
	const audit = item?.properties?.audit;
	return Array.isArray(audit) && audit.length ? audit[audit.length - 1] : null;
}

function activityTimestamp(item) {
	return (
		lastAuditEntry(item)?.at ||
		item?.properties?.goalLoggedAt ||
		item?.properties?.completedAt ||
		item?.properties?.startedAt ||
		item?.properties?.stoppedAt ||
		item?.edited ||
		item?.created ||
		""
	);
}

function activityTime(item) {
	const timestamp = activityTimestamp(item);
	if (!timestamp) {
		return 0;
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(String(timestamp))) {
		return new Date(`${timestamp}T12:00:00`).getTime() || 0;
	}
	return Date.parse(timestamp) || 0;
}

function createdTime(item) {
	const timestamp = item?.created || item?.properties?.createdAt || "";
	if (!timestamp) {
		return 0;
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(String(timestamp))) {
		return new Date(`${timestamp}T12:00:00`).getTime() || 0;
	}
	return Date.parse(timestamp) || 0;
}

function _newestCreatedFirst(items) {
	return [...items].sort((a, b) => {
		const timeDiff = createdTime(b) - createdTime(a);
		if (timeDiff) {
			return timeDiff;
		}
		return String(b.id || "").localeCompare(String(a.id || ""));
	});
}

function newestActivityFirst(items) {
	return [...items].sort((a, b) => {
		const timeDiff = activityTime(b) - activityTime(a);
		if (timeDiff) {
			return timeDiff;
		}
		return String(b.id || "").localeCompare(String(a.id || ""));
	});
}

function latestByActivity(items) {
	return (
		[...items].sort((a, b) => {
			return activityTime(b) - activityTime(a);
		})[0] || null
	);
}

function formatActivityTimestamp(value) {
	if (!value) {
		return "Not started";
	}
	const text = String(value);
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
		return formatDateLabel(text, { year: true });
	}
	const date = new Date(text);
	if (Number.isNaN(date.getTime())) {
		return text;
	}
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function latestDashboardArtifact(dashboard) {
	return latestByActivity(
		(state.artifactStore?.artifacts || []).filter(
			(artifact) =>
				artifact.dashboard === dashboard &&
				["note", "compendium", "reading-plan-item"].includes(artifact.type),
		),
	);
}

function dashboardFlipRows(label) {
	if (label === "Mind") {
		const latestCompendium = latestByActivity(state.compendiums);
		const latestSection = latestByActivity(
			state.compendiums.flatMap((compendium) =>
				(Array.isArray(compendium.sections) ? compendium.sections : []).map(
					(section) => ({ ...section, compendiumTitle: compendium.title }),
				),
			),
		);
		const latest = latestSection || latestCompendium;
		return [
			["What", latest ? shortSummary(latest.title) : "No compendium yet"],
			[
				"Where",
				latest?.compendiumTitle
					? shortSummary(latest.compendiumTitle)
					: dashboardDisplayLabel("Mind"),
			],
			["When", formatActivityTimestamp(activityTimestamp(latest))],
		];
	}

	if (label === "Body") {
		const latestNote = latestDashboardArtifact("Body");
		const latestWorkout = latestByActivity(state.bodyTracker.workouts);
		const latest = latestByActivity(
			[latestNote, latestWorkout].filter(Boolean),
		);
		return [
			[
				"What",
				latest
					? shortSummary(latest.title)
					: `No ${dashboardDisplayLabel("Body").toLowerCase()} log yet`,
			],
			[
				"Detail",
				latest?.minutes
					? `${latest.type || "Workout"} / ${latest.minutes} min`
					: shortSummary(
							latest?.body,
							state.bodyTracker.fast.active
								? `Fasting ${formatDuration(getFastElapsedMs())}`
								: `${Math.round(Number(state.bodyTracker.nutrition.calories) || 0)} cal today`,
						),
			],
			["When", formatActivityTimestamp(activityTimestamp(latest))],
		];
	}

	if (label === "Spirit") {
		const latest = latestDashboardArtifact("Spirit");
		const fallbackWork =
			spiritWorks().find((work) => work.year === state.spiritYear) ||
			spiritWorks()[0];
		const work = latest || fallbackWork;
		return [
			["What", work ? shortSummary(work.title) : "No reading yet"],
			["Who", work?.author || "No author"],
			[
				"When",
				latest
					? formatActivityTimestamp(activityTimestamp(latest))
					: work
						? `Year ${work.year}`
						: "Not started",
			],
		];
	}

	const latestNote = latestDashboardArtifact("Life");
	return [
		[
			"What",
			latestNote
				? shortSummary(latestNote.title)
				: `No ${dashboardDisplayLabel("Life").toLowerCase()} note yet`,
		],
		["Detail", latestNote ? shortSummary(latestNote.body) : "Add a note"],
		["When", formatActivityTimestamp(activityTimestamp(latestNote))],
	];
}

function dashboardCardBackHtml(label) {
	return `
    <span class="dashboard-card-back">
      ${dashboardFlipRows(label)
				.map(
					([key, value]) => `
        <span class="dashboard-card-row"><em>${escapeHtml(key)}</em><strong>${escapeHtml(value)}</strong></span>
      `,
				)
				.join("")}
      <span class="dashboard-card-open">press again to open</span>
    </span>
  `;
}

function noteWordCount(body) {
	return (cleanSummaryText(body).match(/\b[\w']+\b/g) || []).length;
}

function noteSentences(body) {
	return String(body || "")
		.split(/[.!?]+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function repeatedSentenceStarterCount(body) {
	const starts = noteSentences(body)
		.map((sentence) => sentence.match(/\b[\w']+\b/)?.[0]?.toLowerCase())
		.filter(Boolean);
	const counts = new Map();
	starts.forEach((word) => {
		counts.set(word, (counts.get(word) || 0) + 1);
	});
	return Array.from(counts.values())
		.filter((count) => count > 1)
		.reduce((sum, count) => sum + count, 0);
}

function noteCommaCount(body) {
	return (String(body || "").match(/,/g) || []).length;
}

function noteDateLabel(note) {
	const value = note.properties?.dateKey || activityTimestamp(note);
	return value
		? formatDateLabel(dateKeyFromValue(value), { year: true })
		: "No date";
}

function noteSizeLabel(note) {
	const words = noteWordCount(note.body);
	return words >= 1000 ? `${Math.round(words / 100) / 10}k` : String(words);
}

function bodyMetaItems(note) {
	const body = String(note.body || "");
	const readValue = (label) =>
		body.match(new RegExp(`- ${label}:\\s*([^\\n]+)`, "i"))?.[1]?.trim() || "";
	const minutes = readValue("Minutes");
	const effort = readValue("Effort");
	const type = readValue("Type");
	const calories = readValue("Calories");
	const protein = readValue("Protein");
	if (/workout/i.test(note.title) || minutes || effort || type) {
		return [
			["Type", type || "Workout"],
			["Min", minutes || "0"],
			["Effort", effort || "-"],
			["Words", noteSizeLabel(note)],
		];
	}
	return [
		["Cal", calories || "-"],
		["Protein", protein || "-"],
		["Words", noteSizeLabel(note)],
		["Commas", String(noteCommaCount(note.body))],
	];
}

function spiritMetaItems(note) {
	const planItemKey = note.properties?.planItemKey;
	const work = planItemKey
		? spiritWorks().find((item) => item.key === planItemKey)
		: null;
	const year = note.properties?.year || work?.year || "-";
	const sameYear = work
		? spiritWorks().filter((item) => item.year === work.year)
		: [];
	const sequence =
		note.properties?.order ||
		(work ? sameYear.findIndex((item) => item.key === work.key) + 1 : "");
	const complete = planItemKey
		? isSpiritComplete(planItemKey)
		: note.properties?.status === "complete";
	return [
		["Year", String(year)],
		["Seq", sequence ? String(sequence) : "-"],
		["Status", complete ? "\u2713" : "\u25cb"],
		["Words", noteSizeLabel(note)],
	];
}

function lifeTrackerSettings(kind) {
	const trackers = trackerSettingsForKind(kind)?.Life || [];
	return trackerKind(kind) === "goal"
		? trackers.filter((tracker) => tracker?.enabled)
		: trackers;
}

function lifeTrackerIds(note, kind) {
	const prop =
		trackerKind(kind) === "goal" ? "goalTrackerIds" : "thoughtTrackerIds";
	const ids = Array.isArray(note.properties?.[prop])
		? note.properties[prop]
		: [];
	const availableIds = new Set(
		lifeTrackerSettings(kind).map((item) => item.id),
	);
	return ids.filter((id) => availableIds.has(id));
}

function lifeTrackerSelections(note, kind) {
	const selectedIds = new Set(lifeTrackerIds(note, kind));
	return lifeTrackerSettings(kind)
		.filter((tracker) => selectedIds.has(tracker.id))
		.map((tracker) => ({ ...tracker, trackerKind: trackerKind(kind) }));
}

function lifeNoteTrackerSelections(note) {
	return [
		...lifeTrackerSelections(note, "thought"),
		...lifeTrackerSelections(note, "goal"),
	];
}

function legacyLifeHabits(note) {
	return Array.isArray(note.properties?.habits) ? note.properties.habits : [];
}

function lifeTrackerSummaryLabels(note) {
	const trackerLabels = lifeNoteTrackerSelections(note).map(
		(tracker) => tracker.label,
	);
	return trackerLabels.length ? trackerLabels : legacyLifeHabits(note);
}

function lifeMetaItems(note) {
	return [
		["Date", note.properties?.dateKey || noteDateLabel(note)],
		["Words", noteSizeLabel(note)],
	];
}

function noteMetaItems(note) {
	if (note.dashboard === "Mind") {
		return [
			["Words", String(noteWordCount(note.body))],
			["Sent", String(noteSentences(note.body).length)],
			["Starts", String(repeatedSentenceStarterCount(note.body))],
			["Commas", String(noteCommaCount(note.body))],
		];
	}
	if (note.dashboard === "Body") {
		return bodyMetaItems(note);
	}
	if (note.dashboard === "Spirit") {
		return spiritMetaItems(note);
	}
	if (note.dashboard === "Life") {
		return lifeMetaItems(note);
	}
	return [
		["Words", noteSizeLabel(note)],
		["Sent", String(noteSentences(note.body).length)],
		["Commas", String(noteCommaCount(note.body))],
		["Type", note.type || "-"],
	];
}

function _compendiumSidebarArtifact(compendium) {
	const sectionBodies = Array.isArray(compendium.sections)
		? compendium.sections
				.map((section) => section?.body || section?.content || "")
				.filter(Boolean)
		: [];
	return {
		...compendium,
		dashboard: "Mind",
		type: "compendium",
		body: [compendium.body, ...sectionBodies].filter(Boolean).join("\n\n"),
		properties: compendium.properties || {},
	};
}

function mindSidebarItems() {
	const quickNotes = rootNotesForDashboard(state.artifactStore, "Mind").filter(
		(note) => ["thought", "goal-progress"].includes(note.properties?.role),
	);
	const sections = state.compendiums.flatMap((compendium) =>
		(compendium.sections || []).map((section) => ({
			...section,
			dashboard: "Mind",
			type: "mind-section",
			parentId: compendium.id,
			compendiumTitle: compendium.title,
			properties: {
				...(section.properties || {}),
				role: "compendium-section",
			},
		})),
	);
	return newestActivityFirst([...quickNotes, ...sections]);
}

function sidebarOrganizerHtml(item) {
	const metaItems = noteMetaItems(item).slice(0, 4);
	return `
    <span class="sidebar-item-organizer" aria-hidden="true">
      <span class="sidebar-item-date">${escapeHtml(noteDateLabel(item))}</span>
      <span class="sidebar-item-meta-grid">
        ${metaItems
					.map(
						([label, value]) => `
            <span class="sidebar-item-meta-cell">
              <em>${escapeHtml(label)}</em>
              <b>${escapeHtml(value)}</b>
            </span>
          `,
					)
					.join("")}
      </span>
    </span>
  `;
}

function sidebarItemHtml(item, options) {
	const number = Number(options.number) || 1;
	const typeClass =
		item.type === "compendium"
			? " sidebar-item--mind-compendium"
			: item.type === "mind-section"
				? " sidebar-item--mind-section"
				: "";
	const labelHtml = item.compendiumTitle
		? `<span class="sidebar-item-label"><small>${escapeHtml(item.compendiumTitle)}</small><strong>${escapeHtml(item.title)}</strong></span>`
		: `<span class="sidebar-item-label">${escapeHtml(item.title)}</span>`;
	return `
    <button class="sidebar-item${typeClass}${options.active ? " is-active" : ""}" data-action="${options.action}" data-id="${item.id}"${options.parentId ? ` data-parent-id="${escapeHtml(options.parentId)}"` : ""}>
      <span class="sidebar-item-number">${escapeHtml(String(number).padStart(2, "0"))}</span>
      ${labelHtml}
      ${sidebarOrganizerHtml(item)}
    </button>
  `;
}

function numberFromInput(id, fallback = 0) {
	const value = Number(document.getElementById(id)?.value);
	return Number.isFinite(value) ? value : fallback;
}

function formatDuration(ms) {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getFastElapsedMs() {
	return getBodyTimerElapsedMs("fasting");
}

function _getFastProgress() {
	return getBodyTimerProgress("fasting");
}

function getNutritionProgress() {
	const target = Math.max(
		1,
		Number(state.bodyTracker.nutrition.targetCalories) || 1,
	);
	return Math.min(
		1,
		(Number(state.bodyTracker.nutrition.calories) || 0) / target,
	);
}

function bodyTimerConfig(key = state.bodyTimerMode) {
	return (
		BODY_TIMER_MODES.find((config) => config.key === key) || BODY_TIMER_MODES[0]
	);
}

function bodyTimerState(key = state.bodyTimerMode) {
	const config = bodyTimerConfig(key);
	return config.stateKey === "fast"
		? state.bodyTracker.fast
		: state.bodyTracker.timers?.[config.stateKey] ||
				createDefaultBodyTimer(config);
}

function setBodyTimerState(key, timer) {
	const config = bodyTimerConfig(key);
	if (config.stateKey === "fast") {
		state.bodyTracker.fast = timer;
		return;
	}
	state.bodyTracker.timers = {
		...(state.bodyTracker.timers || {}),
		[config.stateKey]: timer,
	};
}

function getBodyTimerElapsedMs(key = state.bodyTimerMode) {
	const timer = bodyTimerState(key);
	const start = timer.startTimestamp;
	if (!timer.active || !start) {
		return 0;
	}
	return Math.max(0, Date.now() - start);
}

function getBodyTimerProgress(key = state.bodyTimerMode) {
	const timer = bodyTimerState(key);
	const targetMs =
		Math.max(1 / 60, Number(timer.targetHours) || 1) * 60 * 60 * 1000;
	return Math.min(1, getBodyTimerElapsedMs(key) / targetMs);
}

function bodyTimerTargetInputValue(key, timer = bodyTimerState(key)) {
	const config = bodyTimerConfig(key);
	return config.targetUnit === "minutes"
		? Math.round((Number(timer.targetHours) || config.defaultTargetHours) * 60)
		: Number(timer.targetHours) || config.defaultTargetHours;
}

function bodyTimerTargetHoursFromInput(key, fallback) {
	const config = bodyTimerConfig(key);
	const inputValue = numberFromInput(
		`body-timer-${key}-target`,
		bodyTimerTargetInputValue(key, fallback),
	);
	return config.targetUnit === "minutes"
		? Math.max(1, inputValue) / 60
		: Math.max(1, inputValue);
}

function selectedCompendium() {
	return (
		state.compendiums.find((item) => item.id === state.selectedCompendiumId) ||
		null
	);
}

function normalizeCompendiumSections(compendium) {
	if (!compendium) {
		return compendium;
	}
	const sections = Array.isArray(compendium.sections)
		? compendium.sections
		: Array.isArray(compendium.blocks)
			? compendium.blocks
			: [];
	return { ...compendium, sections };
}

function normalizeCompendiums(compendiums) {
	return Array.isArray(compendiums)
		? compendiums.map(normalizeCompendiumSections)
		: [];
}

function selectedSection() {
	const compendium = selectedCompendium();
	return (
		compendium?.sections.find(
			(section) => section.id === state.selectedSectionId,
		) || null
	);
}

function spiritWorks() {
	const years = state.spiritPlan?.years || [];
	return years
		.flatMap((yearEntry) => {
			const year = Number(yearEntry.year);
			return (yearEntry.readings || []).flatMap((reading) =>
				(reading.works || []).map((work, workIndex) => {
					const author = reading.author || "";
					const title = work.title || "Untitled";
					const order = Number(reading.order) || 0;
					const key = [
						"spirit",
						year,
						order,
						author.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
						title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
						workIndex,
					].join("-");
					return {
						key,
						year,
						order,
						tier: reading.tier || "",
						author,
						title,
						selection: work.selection || reading.selection || "",
						date: work.date,
						greatIdeas: Array.isArray(work.great_ideas) ? work.great_ideas : [],
						tags: Array.isArray(work.custom_tags) ? work.custom_tags : [],
						blackBox: work.black_box || null,
					};
				}),
			);
		})
		.sort(
			(a, b) =>
				a.year - b.year || a.order - b.order || a.title.localeCompare(b.title),
		);
}

function spiritYears() {
	return (state.spiritPlan?.years || [])
		.map((entry) => Number(entry.year))
		.filter((year) => Number.isFinite(year))
		.sort((a, b) => a - b);
}

function selectedSpiritBook() {
	return (
		spiritWorks().find((work) => work.key === state.selectedSpiritBookKey) ||
		null
	);
}

function spiritArtifactForKey(key) {
	return (
		state.artifactStore?.artifacts.find(
			(artifact) =>
				artifact.dashboard === "Spirit" &&
				artifact.properties?.role === "spirit-reading-plan-item" &&
				artifact.properties?.planItemKey === key,
		) || null
	);
}

function isSpiritComplete(key) {
	if (Object.hasOwn(state.spiritProgress, key)) {
		return Boolean(state.spiritProgress[key]);
	}
	const artifact = spiritArtifactForKey(key);
	if (artifact) {
		return Boolean(artifact.properties?.completed);
	}
	return Boolean(state.spiritProgress[key]);
}

function spiritPlanLabel() {
	return (
		SPIRIT_PLANS.find((entry) => entry.id === state.spiritPlanId)?.label ||
		"Reading Plan"
	);
}

function spiritNotes() {
	return (
		state.artifactStore?.artifacts.filter(
			(artifact) =>
				!isDeletedArtifact(artifact) &&
				artifact.type === "note" &&
				artifact.dashboard === "Spirit",
		) || []
	);
}

function spiritReadingArtifactPayload(work, completed, current = null) {
	const now = nowIso();
	return {
		id: current?.id || `spirit-reading-${work.key}`,
		type: "reading-plan-item",
		dashboard: "Spirit",
		parentId: null,
		title: work.title,
		body: [
			`## ${work.title}`,
			"",
			`Author: ${work.author || "Unknown"}`,
			`Plan: ${spiritPlanLabel()}`,
			`Year: ${work.year}`,
			work.selection ? `Selection: ${work.selection}` : "",
			"",
			"This record stores reading-plan metadata for dashboard analytics.",
		]
			.filter(Boolean)
			.join("\n"),
		created: current?.created || now,
		edited: now,
		childIds: current?.childIds || [],
		properties: {
			...(current?.properties || {}),
			role: "spirit-reading-plan-item",
			status: completed ? "complete" : "open",
			completed,
			completedAt: completed ? now : null,
			planId: state.spiritPlanId,
			planLabel: spiritPlanLabel(),
			planItemKey: work.key,
			sourcePlanUrl:
				SPIRIT_PLANS.find((entry) => entry.id === state.spiritPlanId)?.url ||
				"",
			year: work.year,
			order: work.order,
			tier: work.tier,
			author: work.author,
			title: work.title,
			selection: work.selection,
			date: work.date ?? null,
			greatIdeas: work.greatIdeas,
			tags: work.tags,
		},
		analysis: {
			...(current?.analysis || {}),
			greatIdeas: work.greatIdeas,
			tags: work.tags,
			focus: Array.isArray(work.blackBox?.outputs) ? work.blackBox.outputs : [],
		},
	};
}

function _ensureSpiritReadingArtifact(work) {
	const current = spiritArtifactForKey(work.key);
	const payload = spiritReadingArtifactPayload(
		work,
		isSpiritComplete(work.key),
		current,
	);
	persistArtifactStore(upsertArtifact(state.artifactStore, payload));
	return payload;
}

function setState(next) {
	captureContentScrollPosition();
	skipNextRenderScrollCapture = true;
	Object.assign(state, next);
	render();
}

function scrollPanelIntoView(panel) {
	if (!panel) {
		return;
	}
	const rect = panel.getBoundingClientRect();
	const viewportHeight =
		window.innerHeight || document.documentElement.clientHeight;
	const isMostlyVisible = rect.top >= 80 && rect.bottom <= viewportHeight - 40;
	if (isMostlyVisible) {
		return;
	}
	panel.scrollIntoView({
		behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
			? "auto"
			: "smooth",
		block: "start",
	});
}

function scrollTrackerEditorIntoView(selector) {
	window.requestAnimationFrame(() => {
		scrollPanelIntoView(app.querySelector(selector));
	});
}

function selectorValue(value) {
	const text = String(value ?? "");
	return window.CSS?.escape
		? window.CSS.escape(text)
		: text.replace(/["\\]/g, "\\$&");
}

function setCloudStatus(patch) {
	setState({
		cloud: {
			...state.cloud,
			...patch,
			entitlement: {
				...(state.cloud?.entitlement || {}),
				...(patch.entitlement || {}),
			},
		},
	});
}

function cloudStatusLabel(account = state.cloud || getCloudAccountState()) {
	const entitlement = account.entitlement || {};
	const signedIn = account.mode === "signed-in" && account.user;
	if (!signedIn) {
		return "Signed out";
	}
	if (entitlement.admin) {
		return "Admin / Cloud enabled";
	}
	if (isShareableSpace(activeSpaceId()) && account.spaceRole) {
		return `${activeSpaceLabel()} ${account.spaceRole}`;
	}
	return signedIn ? "Cloud sync active" : "Cloud sync inactive";
}

function cloudUiSignature(account = {}) {
	return JSON.stringify({
		ready: Boolean(account.ready),
		busy: Boolean(account.busy),
		mode: account.mode || "",
		uid: account.user?.uid || "",
		isLocalDemo: Boolean(account.isLocalDemo),
		firebaseAvailable: Boolean(account.firebaseAvailable),
		billingCapable: Boolean(account.billingCapable),
		cloud: Boolean(account.entitlement?.cloud),
		admin: Boolean(account.entitlement?.admin),
		localDemoAvailable: Boolean(account.localDemoAvailable),
		obsidianKeyId: account.obsidianKey?.id || "",
		obsidianKeyCopyAvailable: Boolean(account.obsidianKeyCopyAvailable),
		spaceRole: account.spaceRole || "",
		cloudOwnerUid: account.cloudOwnerUid || "",
		sharedMemberCount: account.sharedSpace?.members?.length || 0,
		sentInviteCount: account.sharedSpace?.invites?.length || 0,
		receivedInviteCount: account.familyInvites?.length || 0,
	});
}

function cloudStatusRegionHtml(
	account = state.cloud || getCloudAccountState(),
) {
	return [
		account.message
			? `<p class="cloud-status-message">${escapeHtml(account.message)}</p>`
			: "",
		account.error
			? `<p class="cloud-status-message cloud-status-message--error">${escapeHtml(account.error)}</p>`
			: "",
	].join("");
}

function patchVisibleCloudStatus() {
	if (state.active !== "Settings" || state.settingsTab !== "cloud") {
		return;
	}
	const account = state.cloud || getCloudAccountState();
	const statusPill = app.querySelector("[data-cloud-status-pill]");
	if (statusPill) {
		const signedIn = account.mode === "signed-in" && account.user;
		statusPill.textContent = cloudStatusLabel(account);
		statusPill.classList.toggle("is-active", Boolean(signedIn));
	}
	const localUpdated = app.querySelector("[data-cloud-local-updated] strong");
	if (localUpdated) {
		const localUpdatedAt = localAppUpdatedAt({ persistDerived: false });
		localUpdated.textContent = localUpdatedAt
			? new Date(localUpdatedAt).toLocaleString()
			: "No local changes";
	}
	const lastSync = app.querySelector("[data-cloud-last-sync] strong");
	if (lastSync) {
		lastSync.textContent = account.lastCloudSyncAt
			? new Date(account.lastCloudSyncAt).toLocaleString()
			: "Not synced";
	}
	const interval = app.querySelector("[data-cloud-auto-sync] strong");
	if (interval) {
		const signedIn = account.mode === "signed-in" && account.user;
		interval.textContent = signedIn
			? `Every ${cloudSyncIntervalLabel()}`
			: "Off";
	}
	const statusRegion = app.querySelector("[data-cloud-status-region]");
	if (statusRegion) {
		statusRegion.innerHTML = cloudStatusRegionHtml(account);
	}
}

async function runCloudAction(message, action) {
	if (state.cloud?.busy) {
		return;
	}
	setCloudStatus({ busy: true, message, error: "" });
	try {
		const result = await action();
		const account = getCloudAccountState();
		setCloudStatus({
			...account,
			busy: false,
			message: result?.message || account.message,
			error: "",
		});
	} catch (error) {
		setCloudStatus({
			...getCloudAccountState(),
			busy: false,
			error: error instanceof Error ? error.message : "Cloud action failed.",
		});
	}
}

function isReady() {
	return Boolean(state.artifactStore);
}

function toggleSidebarSection(section) {
	setState({
		sidebarExpanded: {
			...state.sidebarExpanded,
			[section]: !state.sidebarExpanded[section],
		},
	});
}

function toggleAllSidebarSections() {
	const labels = DASHBOARD_LABELS;
	const expandedCount = labels.filter(
		(label) => state.sidebarExpanded[label],
	).length;
	const shouldExpand = expandedCount < 2;
	setState({
		sidebarExpanded: Object.fromEntries(
			labels.map((label) => [label, shouldExpand]),
		),
	});
}

function setSidebarPage(section, direction, maxPage) {
	const current = state.sidebarPages[section] || 0;
	const nextPage = direction === "prev" ? current - 1 : current + 1;
	setState({
		sidebarPages: {
			...state.sidebarPages,
			[section]: Math.min(Math.max(nextPage, 0), maxPage),
		},
	});
}

function isPyxdiaSignedIn() {
	return Boolean(state.cloud?.mode === "signed-in" && state.cloud?.user?.uid);
}

function pyxdiaActorUid() {
	return String(state.cloud?.user?.uid || state.cloud?.cloudOwnerUid || "local-demo");
}

function pyxdiaActorLabel() {
	const user = state.cloud?.user || {};
	return safePyxdiaRecipientLabel(
		user.displayName || user.email || "You",
		"You",
	);
}

function isFamilyPenPalAvailable() {
	return isShareableSpace(activeSpaceId()) && Boolean(state.cloud?.sharedSpace);
}

function familyPenPalCorrespondents() {
	if (!isFamilyPenPalAvailable()) {
		return [];
	}
	const shared = state.cloud?.sharedSpace || {};
	const actorUid = pyxdiaActorUid();
	const members = Array.isArray(shared.members) ? shared.members : [];
	const fromMembers = members
		.map((member) =>
			normalizePyxdiaCorrespondent({
				uid: member.uid,
				label: member.displayName || member.email || "Family member",
				role: member.role,
			}),
		)
		.filter(Boolean)
		.filter((member) => member.uid !== actorUid);
	if (String(shared.ownerUid || "") && String(shared.ownerUid) !== actorUid) {
		fromMembers.unshift(
			normalizePyxdiaCorrespondent({
				uid: shared.ownerUid,
				label: shared.ownerDisplayName || `${activeSpaceLabel()} owner`,
				role: "owner",
			}),
		);
	}
	const merged = new Map();
	[...(state.pyxdiaCorrespondents || []), ...fromMembers]
		.map(normalizePyxdiaCorrespondent)
		.filter(Boolean)
		.forEach((item) => merged.set(item.uid, { ...merged.get(item.uid), ...item }));
	return [...merged.values()].filter((item) => item.uid !== actorUid);
}

function pyxdiaSelectedRecipient() {
	const type = normalizePyxdiaRecipientType(state.pyxdiaRecipientType);
	if (type !== "family") {
		return {
			recipientType: "pyxdia",
			recipientUid: "pyxdia",
			recipientLabel: "PYXIDA",
		};
	}
	const family = familyPenPalCorrespondents();
	if (!family.length) {
		return {
			recipientType: "pyxdia",
			recipientUid: "pyxdia",
			recipientLabel: "PYXIDA",
		};
	}
	const selected =
		family.find((item) => item.uid === state.pyxdiaRecipientUid) || family[0];
	return selected
		? {
				recipientType: "family",
				recipientUid: selected.uid,
				recipientLabel: selected.label,
			}
		: {
				recipientType: "family",
				recipientUid: "",
				recipientLabel: "Family member",
			};
}

function pyxdiaLetterRoute(letter = {}) {
	const from = safePyxdiaRecipientLabel(
		letter.fromLabel || letter.authorLabel || "You",
		"You",
	);
	const to = safePyxdiaRecipientLabel(
		letter.toLabel || letter.recipientLabel || "PYXIDA",
		"PYXIDA",
	);
	return `From ${from} / To ${to}`;
}

function pyxdiaLetterMatchesRecipient(letter = {}) {
	const selected = pyxdiaSelectedRecipient();
	const type = normalizePyxdiaRecipientType(letter.recipientType);
	if (selected.recipientType !== "family") {
		return type !== "family";
	}
	if (type !== "family" || !selected.recipientUid) {
		return false;
	}
	const participants = Array.isArray(letter.participantUids)
		? letter.participantUids.map(String)
		: [letter.fromUid, letter.toUid, letter.recipientUid, letter.createdBy]
				.map(String)
				.filter(Boolean);
	return participants.includes(selected.recipientUid);
}

function pyxdiaUnreadSpaceCount(spaceId) {
	const unread = state.pyxdiaUnreadBySpace || {};
	return Math.max(0, Number(unread[spaceId] || 0));
}

function pyxdiaStatusText(letter) {
	const stateLabel = String(letter?.state || "").toLowerCase();
	if (stateLabel === "delivered") {
		return "Letter delivered.";
	}
	if (stateLabel === "completed") {
		return isTemplatePyxdiaReply(letter)
			? "Template reply. Regenerate for a real model response."
			: "Reply ready.";
	}
	if (stateLabel === "processing") {
		return "Pen Pal is writing back.";
	}
	if (stateLabel === "queued" || stateLabel === "submitted") {
		return "Reply pending.";
	}
	if (stateLabel === "failed") {
		return letter?.errorMessageSafe || "Pen Pal could not finish. Try again.";
	}
	return "Draft saved.";
}

function isTemplatePyxdiaReply(letter = {}) {
	if (String(letter.modelName || "") === "local-template") {
		return true;
	}
	const output = String(letter.outputText || "");
	return [
		"I read the center of what you sent",
		"In Adlerian language",
		"In DBT terms",
		"archetype language helps",
		"I will keep this grounded and non-clinical",
	].some((marker) => output.includes(marker));
}

function pyxdiaThreadTitleFromText(text = "") {
	const clean = String(text || "")
		.replace(/\s+/g, " ")
		.trim();
	if (!clean) {
		return "Pen Pal letter thread";
	}
	return clean.length > 44 ? `${clean.slice(0, 41)}...` : clean;
}

function pyxdiaLettersByNewest() {
	return activePyxdiaLetters().filter(pyxdiaLetterMatchesRecipient).sort((a, b) => {
		const bTime = Date.parse(b.updatedAt || b.createdAt || "") || 0;
		const aTime = Date.parse(a.updatedAt || a.createdAt || "") || 0;
		if (bTime !== aTime) {
			return bTime - aTime;
		}
		return String(b.id || "").localeCompare(String(a.id || ""));
	});
}

function latestPyxdiaLetter() {
	return pyxdiaLettersByNewest()[0] || null;
}

function latestCompletedPyxdiaLetter() {
	return pyxdiaLettersByNewest().find((letter) => letter.state === "completed");
}

function selectedPyxdiaThread() {
	const threadId =
		state.pyxdiaActiveThreadId || latestPyxdiaLetter()?.threadId || "";
	const activeThreadIds = new Set(
		activePyxdiaLetters()
			.filter(pyxdiaLetterMatchesRecipient)
			.map((letter) => letter.threadId),
	);
	return (
		state.pyxdiaThreads.find(
			(thread) => thread.id === threadId && activeThreadIds.has(thread.id),
		) || null
	);
}

function selectedPyxdiaThreadLetters() {
	const thread = selectedPyxdiaThread();
	if (!thread) {
		return [];
	}
	const ids = new Set(thread.letterIds || []);
	return pyxdiaLettersByNewest()
		.filter((letter) => letter.threadId === thread.id || ids.has(letter.id))
		.reverse();
}

function createDefaultPyxdiaNoteFilters() {
	return {
		search: "",
		dashboard: "",
		role: "",
		selectedOnly: false,
		recentOnly: false,
	};
}

function normalizePyxdiaNoteFilters(value = {}) {
	const source = value && typeof value === "object" ? value : {};
	return {
		...createDefaultPyxdiaNoteFilters(),
		search: String(source.search || "").trim(),
		dashboard: String(source.dashboard || ""),
		role: String(source.role || ""),
		selectedOnly: source.selectedOnly === true,
		recentOnly: source.recentOnly === true,
	};
}

function pyxdiaAllNoteRefs() {
	return pyxdiaNoteRefsFromArtifacts(state.artifactStore);
}

function pyxdiaBalanceStatsLevel(settings = state.pyxdiaSettings) {
	const value = Number(settings?.balanceStatsLevel);
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(100, Math.max(0, Math.round(value / 25) * 25));
}

function pyxdiaTrackerStatistics(events = []) {
	const counts = new Map();
	events.forEach((event) => {
		const kind =
			event.role === "thought"
				? "thought"
				: event.role === "goal-progress"
					? "goal"
					: "";
		const label =
			kind === "thought"
				? event.thoughtLabel
				: kind === "goal"
					? event.goalLabel
					: "";
		const area = DASHBOARD_LABELS.includes(event.dashboard)
			? event.dashboard
			: "Life";
		if (!kind || !label) {
			return;
		}
		const key = `${area}|${kind}|${label}`;
		const current = counts.get(key) || { area, kind, label, count: 0 };
		current.count += 1;
		counts.set(key, current);
	});
	return [...counts.values()]
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
		.slice(0, 16);
}

function pyxdiaBalanceStatisticsForSettings(settings = state.pyxdiaSettings) {
	const level = pyxdiaBalanceStatsLevel(settings);
	if (!level || !state.artifactStore) {
		return null;
	}
	const period = dashboardPeriodOption(state.dashboardPeriod).id;
	const artifacts = (state.artifactStore.artifacts || []).filter(
		(artifact) => !isDeletedArtifact(artifact),
	);
	const notes = artifacts.filter((artifact) => artifact.type === "note");
	const periodEvents = lifeEvents().filter((event) =>
		eventIsInPeriod(event, period),
	);
	const totalEvents = periodEvents.length;
	const areas = DASHBOARD_LABELS.map((area) => {
		const areaEvents = periodEvents.filter((event) => event.dashboard === area);
		const areaNotes = notes.filter((note) => note.dashboard === area).length;
		const thoughts = areaEvents.filter(
			(event) => event.role === "thought",
		).length;
		const goals = areaEvents.filter(
			(event) => event.role === "goal-progress",
		).length;
		return {
			name: area,
			count: areaEvents.length,
			percent: totalEvents
				? Math.round((areaEvents.length / totalEvents) * 100)
				: 0,
			notes: areaNotes,
			thoughts,
			goals,
		};
	});
	const stats = {
		enabled: true,
		level,
		period,
		generatedAt: nowIso(),
		totalEvents,
		totalNotes: notes.length,
		areas,
	};
	if (level >= 50) {
		stats.trackerSummary = pyxdiaTrackerStatistics(periodEvents);
	}
	if (level >= 75) {
		stats.recentActivity = periodEvents
			.slice()
			.sort((a, b) => {
				const bTime = Date.parse(b.timestamp || b.dateKey || "") || 0;
				const aTime = Date.parse(a.timestamp || a.dateKey || "") || 0;
				return bTime - aTime;
			})
			.slice(0, 12)
			.map((event) => ({
				area: DASHBOARD_LABELS.includes(event.dashboard)
					? event.dashboard
					: "Life",
				role: event.role || "note",
				action: event.action || "activity",
				dateKey: event.dateKey || dateKeyFromValue(event.timestamp),
			}));
	}
	return stats;
}

function pyxdiaEffectiveSelectedNoteIds(
	draft = state.pyxdiaDraft,
	refs = pyxdiaAllNoteRefs(),
) {
	const normalized = normalizePyxdiaDraft(draft);
	if (normalized.noteSelectionMode !== "custom") {
		return new Set(refs.map((ref) => ref.id).filter(Boolean));
	}
	return new Set(normalized.contextSelections || []);
}

function pyxdiaSelectedNoteRefs(
	draft = state.pyxdiaDraft,
	refs = pyxdiaAllNoteRefs(),
) {
	const selectedIds = pyxdiaEffectiveSelectedNoteIds(draft, refs);
	return refs
		.filter((ref) => selectedIds.has(ref.id))
		.map((ref) => ({ ...ref, userApprovedContentIncluded: false }));
}

function pyxdiaNoteMetadataBudget(
	draft = state.pyxdiaDraft,
	refs = pyxdiaAllNoteRefs(),
) {
	const selectedRefs = pyxdiaSelectedNoteRefs(draft, refs);
	const size = estimatePyxdiaNoteMetadataSize(selectedRefs);
	return {
		...size,
		overRefs: size.refs > PYXIDA_NOTE_METADATA_MAX_REFS,
		overChars: size.chars > PYXIDA_NOTE_METADATA_MAX_CHARS,
		selectedRefs,
	};
}

function pyxdiaNoteMetadataBudgetError(budget) {
	if (!budget?.overRefs && !budget?.overChars) {
		return "";
	}
	const parts = [];
	if (budget.overRefs) {
		parts.push(
			`${budget.refs} note metadata refs selected; limit is ${PYXIDA_NOTE_METADATA_MAX_REFS}`,
		);
	}
	if (budget.overChars) {
		parts.push(
			`${budget.chars} metadata characters selected; limit is ${PYXIDA_NOTE_METADATA_MAX_CHARS}`,
		);
	}
	return `${parts.join(". ")}. Use filters or clear visible notes before sending.`;
}

function pyxdiaRecentCutoffMs() {
	return Date.now() - PYXIDA_RECENT_NOTE_DAYS * 24 * 60 * 60 * 1000;
}

function isPyxdiaRecentNoteRef(ref) {
	const edited = Date.parse(ref?.edited || "");
	return Number.isFinite(edited) && edited >= pyxdiaRecentCutoffMs();
}

function pyxdiaDraftFromDom(options = {}) {
	const input = document.getElementById("pyxdia-letter-input");
	const context = document.getElementById("pyxdia-context-input");
	const selections = Array.from(
		document.querySelectorAll("[data-pyxdia-note-ref]:checked"),
	).map((item) => item.value);
	const refs = pyxdiaAllNoteRefs();
	const selectedNoteRefs = refs.filter((ref) => selections.includes(ref.id));
	const currentSelectionMode = normalizePyxdiaDraft(
		state.pyxdiaDraft,
	).noteSelectionMode;
	const noteSelectionMode =
		options.noteSelectionMode === "all" ||
		options.noteSelectionMode === "custom"
			? options.noteSelectionMode
			: currentSelectionMode || "all";
	const userSelectedContext = normalizePyxdiaUserSelectedContext({
		manualText: context
			? context.value
			: state.pyxdiaDraft?.userIncludedContext || "",
		selectedNoteRefs,
		contextSelections: selections,
		balanceStatistics: pyxdiaBalanceStatisticsForSettings(state.pyxdiaSettings),
	});
	const now = nowIso();
	const selectedRecipient = pyxdiaSelectedRecipient();
	return normalizePyxdiaDraft({
		...(state.pyxdiaDraft || createEmptyPyxdiaDraft()),
		inputText: input ? input.value : state.pyxdiaDraft?.inputText || "",
		imageRefs: state.pyxdiaDraft?.imageRefs || [],
		recipientType: selectedRecipient.recipientType,
		recipientUid: selectedRecipient.recipientUid,
		recipientLabel: selectedRecipient.recipientLabel,
		toUid: selectedRecipient.recipientUid,
		toLabel: selectedRecipient.recipientLabel,
		userIncludedContext: userSelectedContext.manualText,
		userSelectedContext,
		contextSelections: selections,
		includedNoteRefs: selectedNoteRefs,
		noteSelectionMode,
		updatedAt: now,
	});
}

function pyxdiaCurrentClientLetterId() {
	const current = normalizePyxdiaDraft(state.pyxdiaDraft);
	if (current.clientLetterId) {
		return current.clientLetterId;
	}
	const next = makeId("pyxdia-letter");
	state.pyxdiaDraft = normalizePyxdiaDraft({
		...current,
		clientLetterId: next,
	});
	savePyxdiaLocalState();
	return next;
}

function savePyxdiaDraftLocal(draft, options = {}) {
	const normalized = normalizePyxdiaDraft(draft);
	state.pyxdiaDraft = normalized;
	savePyxdiaLocalState();
	if (options.render !== false) {
		setState({
			pyxdiaDraft: normalized,
			pyxdiaStatus: options.message || "Draft saved.",
			pyxdiaError: "",
		});
	}
	return normalized;
}

function validatePyxdiaDraft(draft, settings = state.pyxdiaSettings) {
	const text = String(draft?.inputText || "").trim();
	const size = estimatePyxdiaLetterSize(text);
	if (!text) {
		return "Write a letter before sending.";
	}
	if (
		normalizePyxdiaRecipientType(draft?.recipientType) === "family" &&
		!String(draft?.recipientUid || "").trim()
	) {
		return "Choose a family member before sending.";
	}
	if (size.words > settings.letterMaxWords) {
		return `Letter is ${size.words} words. Limit is ${settings.letterMaxWords}.`;
	}
	if (size.chars > settings.letterMaxChars) {
		return `Letter is ${size.chars} characters. Limit is ${settings.letterMaxChars}.`;
	}
	const budgetError = pyxdiaNoteMetadataBudgetError(
		pyxdiaNoteMetadataBudget(draft),
	);
	if (budgetError) {
		return budgetError;
	}
	return "";
}

function pyxdiaUnreadBySpaceFromPayload(payload = {}, fallback = {}) {
	const unread = payload.unread || {};
	if (unread.bySpaceId && typeof unread.bySpaceId === "object") {
		return unread.bySpaceId;
	}
	if (unread.byAppId && typeof unread.byAppId === "object") {
		return unread.byAppId;
	}
	return fallback;
}

function applyPyxdiaStatePayload(payload = {}) {
	const local = normalizePyxdiaLocalState({
		threads: payload.threads || state.pyxdiaThreads,
		letters: payload.letters || state.pyxdiaLetters,
		draft: payload.draft || state.pyxdiaDraft,
		memory: payload.memory || state.pyxdiaMemory,
	});
	const settings = normalizePyxdiaSettings(
		payload.settings || state.pyxdiaSettings,
	);
	state.pyxdiaSettings = settings;
	state.pyxdiaThreads = local.threads;
	state.pyxdiaLetters = local.letters;
	state.pyxdiaDraft = local.draft;
	state.pyxdiaMemory = local.memory;
	state.pyxdiaAiBrain = payload.aiBrain || state.pyxdiaAiBrain;
	state.pyxdiaCorrespondents = Array.isArray(payload.correspondents)
		? payload.correspondents.map(normalizePyxdiaCorrespondent).filter(Boolean)
		: state.pyxdiaCorrespondents;
	state.pyxdiaUnreadBySpace = pyxdiaUnreadBySpaceFromPayload(
		payload,
		state.pyxdiaUnreadBySpace,
	);
	savePyxdiaSettingsLocal(settings);
	savePyxdiaLocalState();
	return { settings, ...local };
}

function openPyxdia(view = "input", patch = {}) {
	setState({
		active: "PYXIDA",
		pyxdiaExpanded: true,
		pyxdiaView: view,
		flipped: null,
		artifactMode: "grid",
		selectedArtifactId: null,
		selectedCompendiumId: null,
		selectedSectionId: null,
		selectedSpiritBookKey: null,
		trackerAddArea: "",
		trackerEditKey: "",
		trackerDeleteKey: "",
		...patch,
	});
}

function openPyxdiaReplyToThread(threadId) {
	if (!threadId) {
		openPyxdia("input");
		return;
	}
	selectPyxdiaRecipientForThread(threadId);
	const current = normalizePyxdiaDraft(state.pyxdiaDraft);
	const selectedRecipient = pyxdiaSelectedRecipient();
	const draft = normalizePyxdiaDraft({
		...current,
		threadId,
		recipientType: selectedRecipient.recipientType,
		recipientUid: selectedRecipient.recipientUid,
		recipientLabel: selectedRecipient.recipientLabel,
		toUid: selectedRecipient.recipientUid,
		toLabel: selectedRecipient.recipientLabel,
		clientLetterId:
			current.threadId === threadId
				? current.clientLetterId
				: makeId("pyxdia-letter"),
		updatedAt: nowIso(),
	});
	state.pyxdiaDraft = draft;
	savePyxdiaLocalState();
	openPyxdia("input", {
		pyxdiaActiveThreadId: threadId,
		pyxdiaDraft: draft,
		pyxdiaStatus: "Replying in this letter chain.",
		pyxdiaError: "",
	});
}

function pyxdiaSettingsFromForm() {
	const current = state.pyxdiaSettings || DEFAULT_PYXIDA_SETTINGS;
	const delayEnabled = document.getElementById("pyxdia-setting-delay")?.checked;
	return normalizePyxdiaSettings({
		...current,
		enabled: document.getElementById("pyxdia-setting-enabled")?.checked,
		delayEnabled,
		pyxdiaDelayEnabled: delayEnabled,
		memoryEnabled: document.getElementById("pyxdia-setting-memory")?.checked,
		aiBrainMemoryEnabled: document.getElementById("pyxdia-setting-ai-brain")
			?.checked,
		balanceStatsLevel: document.getElementById("pyxdia-balance-stats-level")
			?.value,
		delayMinHours: document.getElementById("pyxdia-delay-min")?.value,
		delayMaxHours: document.getElementById("pyxdia-delay-max")?.value,
		generalInstructions:
			document.getElementById("pyxdia-general-instructions")?.value ||
			current.generalInstructions,
		userWantsPyxdiaToKnow:
			document.getElementById("pyxdia-know")?.value ||
			current.userWantsPyxdiaToKnow,
	});
}

async function runPyxdiaAction(message, action) {
	setState({ pyxdiaBusy: true, pyxdiaStatus: message, pyxdiaError: "" });
	try {
		await action();
	} catch (error) {
		setState({
			pyxdiaBusy: false,
			pyxdiaError:
				error instanceof Error ? error.message : "Pen Pal action failed.",
		});
	}
}

async function refreshPyxdiaState(options = {}) {
	if (isPyxdiaSignedIn() && !state.cloud?.isLocalDemo) {
		const payload = await fetchPyxdiaState({ getIdToken: getCloudIdToken });
		applyPyxdiaStatePayload(payload);
		setState({
			pyxdiaBusy: false,
			pyxdiaError: "",
			pyxdiaStatus: options.silent ? state.pyxdiaStatus : "Pen Pal refreshed.",
			pyxdiaLastRefreshAt: nowIso(),
		});
		return;
	}
	processDueLocalPyxdiaJobs();
	savePyxdiaLocalState();
	setState({
		pyxdiaBusy: false,
		pyxdiaError: "",
		pyxdiaStatus: options.silent ? state.pyxdiaStatus : "Pen Pal refreshed.",
		pyxdiaLastRefreshAt: nowIso(),
	});
}

async function refreshPyxdiaUnreadSummary(options = {}) {
	if (!isPyxdiaSignedIn() || state.cloud?.isLocalDemo) {
		return;
	}
	const payload = await fetchPyxdiaState({
		getIdToken: getCloudIdToken,
	});
	const next = pyxdiaUnreadBySpaceFromPayload(payload, {});
	if (options.render === false) {
		state.pyxdiaUnreadBySpace = next;
		return;
	}
	setState({ pyxdiaUnreadBySpace: next });
}

async function markSelectedPyxdiaThreadRead() {
	const threadId = state.pyxdiaActiveThreadId || selectedPyxdiaThread()?.id || "";
	if (!threadId || !isPyxdiaSignedIn() || state.cloud?.isLocalDemo) {
		return;
	}
	const payload = await markPyxdiaThreadRead(threadId, {
		getIdToken: getCloudIdToken,
	});
	applyPyxdiaStatePayload(payload);
}

function selectPyxdiaCorrespondent(type, uid = "") {
	let recipientType = normalizePyxdiaRecipientType(type);
	const family = familyPenPalCorrespondents();
	const selected =
		recipientType === "family"
			? family.find((item) => item.uid === uid) || family[0]
			: null;
	if (recipientType === "family" && !selected) {
		recipientType = "pyxdia";
	}
	const patch = {
		pyxdiaRecipientType: recipientType,
		pyxdiaRecipientUid: selected?.uid || "pyxdia",
		pyxdiaActiveThreadId: "",
		pyxdiaView: state.pyxdiaView === "output" ? "thread" : state.pyxdiaView,
		pyxdiaError: "",
	};
	state.pyxdiaRecipientType = patch.pyxdiaRecipientType;
	state.pyxdiaRecipientUid = patch.pyxdiaRecipientUid;
	const draft = normalizePyxdiaDraft({
		...state.pyxdiaDraft,
		recipientType: recipientType,
		recipientUid: selected?.uid || "pyxdia",
		recipientLabel: selected?.label || "PYXIDA",
		toUid: selected?.uid || "pyxdia",
		toLabel: selected?.label || "PYXIDA",
		threadId: "",
		updatedAt: nowIso(),
	});
	state.pyxdiaDraft = draft;
	savePyxdiaLocalState();
	setState({ ...patch, pyxdiaDraft: draft });
}

function selectPyxdiaRecipientForThread(threadId) {
	const letter = activePyxdiaLetters().find((item) => item.threadId === threadId);
	if (!letter) {
		return;
	}
	if (normalizePyxdiaRecipientType(letter.recipientType) === "family") {
		const peerUid = pyxdiaFamilyLetterPeerUid(letter);
		state.pyxdiaRecipientType = "family";
		state.pyxdiaRecipientUid = peerUid;
		return;
	}
	state.pyxdiaRecipientType = "pyxdia";
	state.pyxdiaRecipientUid = "pyxdia";
}

async function savePyxdiaDraftAction() {
	const draft = savePyxdiaDraftLocal(pyxdiaDraftFromDom(), { render: false });
	if (isPyxdiaSignedIn() && !state.cloud?.isLocalDemo) {
		await savePyxdiaDraft(
			{
				draft,
				settings: state.pyxdiaSettings,
			},
			{ getIdToken: getCloudIdToken },
		);
	}
	setState({
		pyxdiaDraft: draft,
		pyxdiaBusy: false,
		pyxdiaStatus: "Draft saved.",
		pyxdiaError: "",
	});
}

async function sendPyxdiaLetterAction() {
	if (isShareableSpace(activeSpaceId()) && state.cloud?.spaceRole === "reader") {
		setState({
			pyxdiaStatus: "",
			pyxdiaError: `${activeSpaceLabel()} readers can view Pen Pal letters but cannot send.`,
		});
		return;
	}
	const draft = savePyxdiaDraftLocal(pyxdiaDraftFromDom(), { render: false });
	const settings = normalizePyxdiaSettings(state.pyxdiaSettings);
	const validation = validatePyxdiaDraft(draft, settings);
	if (validation) {
		setState({ pyxdiaBusy: false, pyxdiaError: validation });
		return;
	}
	if (!settings.enabled) {
		setState({
			pyxdiaBusy: false,
			pyxdiaError: "Pen Pal is turned off in Settings.",
		});
		return;
	}
	if (!isPyxdiaSignedIn()) {
		setState({
			pyxdiaBusy: false,
			pyxdiaStatus: "",
			pyxdiaError: "Sign in to send Pen Pal letters.",
			settingsTab: "cloud",
		});
		return;
	}
	if (!state.cloud?.isLocalDemo) {
		const payload = await sendPyxdiaLetter(
			{
				draft,
				settings,
			},
			{ getIdToken: getCloudIdToken },
		);
		applyPyxdiaStatePayload(payload);
		setState({
			pyxdiaBusy: false,
			pyxdiaStatus: "Letter sent.",
			pyxdiaError: "",
			pyxdiaView: "output",
			pyxdiaActiveThreadId:
				payload.letter?.threadId || latestPyxdiaLetter()?.threadId || "",
		});
		return;
	}
	await submitLocalPyxdiaLetter(draft, settings);
}

async function retryPyxdiaLetterAction(letterId) {
	if (!letterId) {
		return;
	}
	const existingLetter = state.pyxdiaLetters.find((item) => item.id === letterId);
	const isRegeneration = isTemplatePyxdiaReply(existingLetter);
	if (isPyxdiaSignedIn() && !state.cloud?.isLocalDemo) {
		const payload = await retryPyxdiaLetter(letterId, {
			getIdToken: getCloudIdToken,
		});
		applyPyxdiaStatePayload(payload);
		setState({
			pyxdiaBusy: false,
			pyxdiaStatus: isRegeneration ? "Regeneration queued." : "Retry queued.",
			pyxdiaError: "",
		});
		return;
	}
	const letter = existingLetter;
	if (!letter) {
		return;
	}
	state.pyxdiaDraft = normalizePyxdiaDraft({
		...state.pyxdiaDraft,
		threadId: letter.threadId,
		inputText: letter.inputText,
		clientLetterId: letter.id || state.pyxdiaDraft?.clientLetterId,
		imageRefs: letter.imageRefs,
		includedNoteRefs: letter.includedNoteRefs,
		userIncludedContext: letter.userIncludedContext,
		userSelectedContext: letter.userSelectedContext,
		contextSelections: letter.contextSelections,
		updatedAt: nowIso(),
	});
	savePyxdiaLocalState();
	await submitLocalPyxdiaLetter(state.pyxdiaDraft, state.pyxdiaSettings);
}

async function savePyxdiaSettingsAction(nextSettings = null) {
	const settings = normalizePyxdiaSettings(
		nextSettings || pyxdiaSettingsFromForm(),
	);
	state.pyxdiaSettings = settings;
	savePyxdiaSettingsLocal(settings);
	if (isPyxdiaSignedIn() && !state.cloud?.isLocalDemo) {
		await savePyxdiaSettings(settings, { getIdToken: getCloudIdToken });
	}
	if (!settings.delayEnabled) {
		processDueLocalPyxdiaJobs({ force: true });
	}
	savePyxdiaLocalState();
	setState({
		pyxdiaSettings: settings,
		pyxdiaBusy: false,
		pyxdiaStatus: "Pen Pal settings saved.",
		pyxdiaError: "",
	});
}

async function resetPyxdiaMemoryAction() {
	const confirmed = window.confirm("Reset Pen Pal memory for this app?");
	if (!confirmed) {
		setState({ pyxdiaBusy: false, pyxdiaStatus: "", pyxdiaError: "" });
		return;
	}
	if (isPyxdiaSignedIn() && !state.cloud?.isLocalDemo) {
		const payload = await resetPyxdiaMemory({ getIdToken: getCloudIdToken });
		applyPyxdiaStatePayload(payload);
	} else {
		state.pyxdiaMemory = createEmptyPyxdiaMemory();
		savePyxdiaLocalState();
	}
	setState({
		pyxdiaMemory: state.pyxdiaMemory,
		pyxdiaBusy: false,
		pyxdiaStatus: "Pen Pal memory reset.",
		pyxdiaError: "",
	});
}

function isTrashSignedIn() {
	return state.cloud?.mode === "signed-in" && !state.cloud?.isLocalDemo;
}

function trashAuthRequiredMessage() {
	return state.cloud?.spaceRole === "reader"
		? "Readers can view and export only."
		: "Sign in with Cloud to move items to Trash.";
}

function isDeletedPyxdiaLetter(letter) {
	return letter?.deleted === true || letter?.deleteMode === "soft";
}

function activePyxdiaLetters() {
	return (state.pyxdiaLetters || []).filter(
		(letter) => !isDeletedPyxdiaLetter(letter),
	);
}

function applyTrashStatePayload(payload = {}) {
	const settings = normalizeTrashSettings(
		payload.settings || state.trashSettings,
	);
	const items = Array.isArray(payload.items)
		? payload.items.map(normalizeTrashItem).filter((item) => item.trashItemId)
		: state.trashItems;
	state.trashSettings = settings;
	state.trashItems = items;
	state.trashCursor = String(payload.nextCursor || "");
	return { settings, items };
}

function openTrash() {
	setState({
		active: "Trash",
		sidebarSubmenu: "",
		flipped: null,
		artifactMode: "grid",
		selectedArtifactId: null,
		selectedCompendiumId: null,
		selectedSectionId: null,
		selectedSpiritBookKey: null,
		trackerAddArea: "",
		trackerEditKey: "",
		trackerDeleteKey: "",
		trashItems: [],
		trashCursor: "",
	});
	if (isTrashSignedIn()) {
		void runTrashAction("Loading Trash...", refreshTrashState);
	}
}

async function runTrashAction(message, action) {
	setState({ trashBusy: true, trashStatus: message, trashError: "" });
	try {
		await action();
	} catch (error) {
		setState({
			trashBusy: false,
			trashError:
				error instanceof Error ? error.message : "Trash action failed.",
		});
	}
}

async function refreshTrashState() {
	if (!isTrashSignedIn()) {
		setState({
			trashBusy: false,
			trashStatus: "",
			trashError: "Sign in to use Trash.",
		});
		return;
	}
	const payload = await fetchTrashState({ getIdToken: getCloudIdToken });
	applyTrashStatePayload(payload);
	setState({
		trashSettings: state.trashSettings,
		trashItems: state.trashItems,
		trashCursor: state.trashCursor,
		trashBusy: false,
		trashStatus: "Trash refreshed.",
		trashError: "",
	});
}

async function saveTrashSettingsAction() {
	if (!isTrashSignedIn()) {
		setState({
			trashBusy: false,
			trashError: "Sign in to save Trash settings.",
		});
		return;
	}
	const retention = document.getElementById("trash-retention-days")?.value;
	const settings = normalizeTrashSettings({ trashRetentionDays: retention });
	const payload = await saveTrashSettings(settings, {
		getIdToken: getCloudIdToken,
	});
	applyTrashStatePayload(payload);
	setState({
		trashSettings: state.trashSettings,
		trashItems: state.trashItems,
		trashBusy: false,
		trashStatus:
			settings.trashRetentionDays === 0
				? "Trash disabled. Deletes will be permanent."
				: "Trash settings saved.",
		trashError: "",
	});
}

async function restoreTrashItemAction(trashItemId) {
	if (!trashItemId) {
		return;
	}
	const previousItems = state.trashItems;
	const item = state.trashItems.find(
		(entry) => entry.trashItemId === trashItemId,
	);
	const confirmed = window.confirm(`Restore "${item?.title || "this item"}"?`);
	if (!confirmed) {
		setState({ trashBusy: false, trashStatus: "", trashError: "" });
		return;
	}
	state.trashItems = state.trashItems.filter(
		(entry) => entry.trashItemId !== trashItemId,
	);
	setState({ trashItems: state.trashItems, trashStatus: "Restoring item." });
	try {
		const result = await restoreTrashItem(trashItemId, {
			getIdToken: getCloudIdToken,
		});
		const restoredLocal = restoreLocalTrashItem(item || result);
		await refreshTrashState();
		if (!restoredLocal && item?.itemType !== "pyxdia_letter") {
			const info = await getCloudStateInfo().catch(() => null);
			if (info?.json) {
				await importCloudInfoIntoLocal(info);
			}
		}
		setState({ trashStatus: "Item restored." });
	} catch (error) {
		state.trashItems = previousItems;
		setState({ trashItems: state.trashItems });
		throw error;
	}
}

async function hardDeleteTrashItemAction(trashItemId) {
	if (!trashItemId) {
		return;
	}
	const previousItems = state.trashItems;
	const item = state.trashItems.find(
		(entry) => entry.trashItemId === trashItemId,
	);
	const confirmed = window.confirm(
		`This permanently deletes "${item?.title || "this item"}" and cannot be undone.`,
	);
	if (!confirmed) {
		setState({ trashBusy: false, trashStatus: "", trashError: "" });
		return;
	}
	state.trashItems = state.trashItems.filter(
		(entry) => entry.trashItemId !== trashItemId,
	);
	setState({ trashItems: state.trashItems, trashStatus: "Deleting item." });
	try {
		const result = await hardDeleteTrashItem(trashItemId, {
			getIdToken: getCloudIdToken,
		});
		removeLocalTrashItem(item || result);
		await refreshTrashState();
		setState({ trashStatus: "Item permanently deleted." });
	} catch (error) {
		state.trashItems = previousItems;
		setState({ trashItems: state.trashItems });
		throw error;
	}
}

function artifactTrashItemType(artifact) {
	return artifact?.type === "note" ? "note" : "artifact";
}

function localLifecycleFromTrashResult(result = {}) {
	const trashItem = result.trashItem || {};
	return {
		deleted: true,
		deletedAt: trashItem.deletedAt || nowIso(),
		deleteAfter: trashItem.deleteAfter || null,
		deletedBy: trashItem.deletedBy || state.cloud?.user?.uid || "",
		deleteMode: "soft",
		originalCollection: trashItem.originalCollection || "artifacts",
	};
}

function localRestoreLifecyclePatch() {
	return {
		deleted: false,
		deletedAt: null,
		deleteAfter: null,
		deletedBy: "",
		deleteMode: "",
		originalCollection: "",
	};
}

function upsertLocalArtifactLifecycle(itemId, patch) {
	if (!itemId || !state.artifactStore) {
		return false;
	}
	let changed = false;
	const now = nowIso();
	const artifacts = state.artifactStore.artifacts.map((artifact) => {
		if (artifact.id !== itemId) {
			return artifact;
		}
		changed = true;
		return {
			...artifact,
			...patch,
			edited: patch.deleted ? artifact.edited : now,
			properties: {
				...(artifact.properties || {}),
				deleted: patch.deleted === true,
			},
		};
	});
	if (changed) {
		persistArtifactStore({ ...state.artifactStore, artifacts });
	}
	return changed;
}

function removeLocalArtifact(itemId) {
	if (!itemId || !state.artifactStore) {
		return false;
	}
	const current = findAnyArtifact(state.artifactStore, itemId);
	if (!current) {
		return false;
	}
	persistArtifactStore({
		...state.artifactStore,
		artifacts: (state.artifactStore.artifacts || []).filter(
			(artifact) => artifact.id !== itemId,
		),
	});
	return true;
}

function removeLocalArtifactIds(itemIds = []) {
	const ids = new Set((itemIds || []).filter(Boolean));
	if (!ids.size || !state.artifactStore) {
		return false;
	}
	const previousCount = state.artifactStore.artifacts?.length || 0;
	const artifacts = (state.artifactStore.artifacts || []).filter(
		(artifact) => !ids.has(artifact.id) && !ids.has(artifact.parentId),
	);
	if (artifacts.length === previousCount) {
		return false;
	}
	persistArtifactStore({ ...state.artifactStore, artifacts });
	return true;
}

function upsertLocalPyxdiaLetterLifecycle(itemId, patch) {
	if (!itemId) {
		return false;
	}
	let changed = false;
	state.pyxdiaLetters = (state.pyxdiaLetters || []).map((letter) => {
		if (letter.id !== itemId) {
			return letter;
		}
		changed = true;
		return {
			...letter,
			...patch,
			updatedAt: nowIso(),
		};
	});
	if (changed) {
		savePyxdiaLocalState();
	}
	return changed;
}

function removeLocalPyxdiaLetter(itemId) {
	if (!itemId) {
		return false;
	}
	const before = state.pyxdiaLetters?.length || 0;
	state.pyxdiaLetters = (state.pyxdiaLetters || []).filter(
		(letter) => letter.id !== itemId,
	);
	const changed = state.pyxdiaLetters.length !== before;
	if (changed) {
		savePyxdiaLocalState();
	}
	return changed;
}

function restoreLocalTrashItem(item = {}) {
	const itemType = String(item.itemType || "");
	const itemId = item.itemId || item.id;
	if (itemType === "pyxdia_letter") {
		return upsertLocalPyxdiaLetterLifecycle(
			itemId,
			localRestoreLifecyclePatch(),
		);
	}
	if (itemType === "artifact" || itemType === "note") {
		return upsertLocalArtifactLifecycle(itemId, localRestoreLifecyclePatch());
	}
	return false;
}

function removeLocalTrashItem(item = {}) {
	const itemType = String(item.itemType || "");
	const itemId = item.itemId || item.id;
	if (itemType === "pyxdia_letter") {
		return removeLocalPyxdiaLetter(itemId);
	}
	if (itemType === "artifact" || itemType === "note") {
		return removeLocalArtifact(itemId);
	}
	return false;
}

function artifactIdsForTrash(artifact) {
	if (!artifact) {
		return [];
	}
	if (artifact.type !== "compendium") {
		return [artifact.id];
	}
	const childIds = (state.artifactStore?.artifacts || [])
		.filter((item) => item.parentId === artifact.id && !isDeletedArtifact(item))
		.map((item) => item.id);
	return [artifact.id, ...childIds];
}

async function moveArtifactIdsToTrash(ids, options = {}) {
	const cleanIds = Array.from(new Set((ids || []).filter(Boolean)));
	if (!cleanIds.length || !state.artifactStore) {
		return false;
	}
	if (!cloudCanWriteActiveSpace()) {
		window.alert(trashAuthRequiredMessage());
		return false;
	}
	if (!window.confirm(options.confirmText || "Move this item to Trash?")) {
		return false;
	}
	const cloudSyncStore = state.artifactStore;
	const requests = cleanIds.map((itemId) => {
		const artifact = findAnyArtifact(state.artifactStore, itemId);
		return {
			itemId,
			itemType: artifactTrashItemType(artifact),
		};
	});
	try {
		await finishArtifactTrashMove(requests, { cloudSyncStore });
		return true;
	} catch (error) {
		window.alert(
			error instanceof Error ? error.message : "Could not move item to Trash.",
		);
		return false;
	}
}

async function finishArtifactTrashMove(requests, options = {}) {
	await uploadArtifactStoreSnapshotToCloud(
		options.cloudSyncStore || state.artifactStore,
	);
	const results = [];
	for (const { itemId, itemType } of requests) {
		results.push(
			await deleteUserItem(
				{ itemType, itemId },
				{ getIdToken: getCloudIdToken },
			),
		);
	}
	removeLocalArtifactIds(requests.map((request) => request.itemId));
	if (state.active === "Trash") {
		await refreshTrashState().catch(() => {});
	}
	return results;
}

async function moveArtifactToTrash(artifact, options = {}) {
	const ids = artifactIdsForTrash(artifact);
	return moveArtifactIdsToTrash(ids, options);
}

async function deletePyxdiaLetterAction(letterId) {
	const letter = (state.pyxdiaLetters || []).find(
		(item) => item.id === letterId,
	);
	if (!letter || isDeletedPyxdiaLetter(letter)) {
		return;
	}
	if (!isTrashSignedIn()) {
		window.alert(trashAuthRequiredMessage());
		return;
	}
	if (!window.confirm("Move this Pen Pal letter to Trash?")) {
		return;
	}
	upsertLocalPyxdiaLetterLifecycle(letterId, localLifecycleFromTrashResult());
	void finishPyxdiaLetterTrashMove(letterId);
	setState({
		pyxdiaLetters: state.pyxdiaLetters,
		pyxdiaActiveThreadId: selectedPyxdiaThreadLetters().length
			? state.pyxdiaActiveThreadId
			: "",
	});
}

async function finishPyxdiaLetterTrashMove(letterId) {
	try {
		const result = await deleteUserItem(
			{ itemType: "pyxdia_letter", itemId: letterId },
			{ getIdToken: getCloudIdToken },
		);
		if (result.mode === "hard") {
			removeLocalPyxdiaLetter(letterId);
		} else {
			upsertLocalPyxdiaLetterLifecycle(
				letterId,
				localLifecycleFromTrashResult(result),
			);
		}
		if (state.active === "Trash") {
			await refreshTrashState().catch(() => {});
		}
	} catch (error) {
		upsertLocalPyxdiaLetterLifecycle(letterId, localRestoreLifecyclePatch());
		render();
		window.alert(
			error instanceof Error
				? error.message
				: "Could not move letter to Trash.",
		);
	}
}

async function submitLocalPyxdiaLetter(draft, settings) {
	const now = nowIso();
	if (normalizePyxdiaRecipientType(draft.recipientType) === "family") {
		const selected = pyxdiaSelectedRecipient();
		const threadId =
			draft.threadId ||
			`family-direct-${[pyxdiaActorUid(), selected.recipientUid]
				.sort()
				.join("-")}`;
		const letterId = makeId("pyxdia-letter");
		const letter = normalizePyxdiaLetter({
			id: letterId,
			threadId,
			owner: state.cloud?.user?.uid || "local-demo",
			createdBy: pyxdiaActorUid(),
			authorLabel: pyxdiaActorLabel(),
			recipientType: "family",
			recipientUid: selected.recipientUid,
			recipientLabel: selected.recipientLabel,
			fromUid: pyxdiaActorUid(),
			fromLabel: pyxdiaActorLabel(),
			toUid: selected.recipientUid,
			toLabel: selected.recipientLabel,
			participantUids: [pyxdiaActorUid(), selected.recipientUid].filter(Boolean),
			readBy: { [pyxdiaActorUid()]: now },
			state: "delivered",
			inputText: draft.inputText,
			imageRefs: draft.imageRefs,
			submittedAt: now,
			availableAt: now,
			createdAt: now,
			updatedAt: now,
		});
		const existingThread = state.pyxdiaThreads.find((item) => item.id === threadId);
		const thread = normalizePyxdiaThread({
			...(existingThread || {}),
			id: threadId,
			owner: state.cloud?.user?.uid || "local-demo",
			title: existingThread?.title || `Letter with ${selected.recipientLabel}`,
			status: "active",
			recipientType: "family",
			participantUids: letter.participantUids,
			letterIds: Array.from(new Set([...(existingThread?.letterIds || []), letterId])),
			latestLetterId: letterId,
			latestState: "delivered",
			createdAt: existingThread?.createdAt || now,
			updatedAt: now,
		});
		state.pyxdiaThreads = [
			thread,
			...state.pyxdiaThreads.filter((item) => item.id !== threadId),
		];
		state.pyxdiaLetters = [letter, ...state.pyxdiaLetters];
		state.pyxdiaDraft = normalizePyxdiaDraft({
			...createEmptyPyxdiaDraft(),
			recipientType: "family",
			recipientUid: selected.recipientUid,
			recipientLabel: selected.recipientLabel,
			toUid: selected.recipientUid,
			toLabel: selected.recipientLabel,
			threadId,
		});
		savePyxdiaLocalState();
		setState({
			pyxdiaThreads: state.pyxdiaThreads,
			pyxdiaLetters: state.pyxdiaLetters,
			pyxdiaDraft: state.pyxdiaDraft,
			pyxdiaActiveThreadId: threadId,
			pyxdiaView: "thread",
			pyxdiaStatus: "Letter delivered.",
			pyxdiaBusy: false,
			pyxdiaError: "",
		});
		return;
	}
	const threadId = draft.threadId || makeId("pyxdia-thread");
	const letterId = makeId("pyxdia-letter");
	const delayHours = settings.delayEnabled
		? Math.max(0, Number(settings.delayMinHours) || 0)
		: 0;
	const availableAt = new Date(
		Date.now() +
			(state.cloud?.isLocalDemo ? Math.min(delayHours, 0.01) : delayHours) *
				3600000,
	).toISOString();
	const letter = normalizePyxdiaLetter({
		id: letterId,
		threadId,
		owner: state.cloud?.user?.uid || "local-demo",
		createdBy: pyxdiaActorUid(),
		authorLabel: pyxdiaActorLabel(),
		recipientType: "pyxdia",
		recipientUid: "pyxdia",
		recipientLabel: "PYXIDA",
		fromUid: pyxdiaActorUid(),
		fromLabel: pyxdiaActorLabel(),
		toUid: "pyxdia",
		toLabel: "PYXIDA",
		participantUids: [pyxdiaActorUid()],
		readBy: { [pyxdiaActorUid()]: now },
		state: "queued",
		inputText: draft.inputText,
		imageRefs: draft.imageRefs,
		includedNoteRefs: draft.includedNoteRefs,
		userIncludedContext: draft.userIncludedContext,
		userSelectedContext: draft.userSelectedContext,
		contextSelections: draft.contextSelections,
		dynamicRetrievalMemory: createLocalPyxdiaDynamicRetrievalMemory(threadId),
		submittedAt: now,
		queuedAt: now,
		availableAt,
		createdAt: now,
		updatedAt: now,
	});
	const existingThread = state.pyxdiaThreads.find(
		(item) => item.id === threadId,
	);
	const thread = normalizePyxdiaThread({
		...(existingThread || {}),
		id: threadId,
		owner: state.cloud?.user?.uid || "local-demo",
		title: existingThread?.title || pyxdiaThreadTitleFromText(draft.inputText),
		status: "active",
		letterIds: Array.from(
			new Set([...(existingThread?.letterIds || []), letterId]),
		),
		latestLetterId: letterId,
		latestState: "queued",
		createdAt: existingThread?.createdAt || now,
		updatedAt: now,
	});
	state.pyxdiaThreads = [
		thread,
		...state.pyxdiaThreads.filter((item) => item.id !== threadId),
	];
	state.pyxdiaLetters = [letter, ...state.pyxdiaLetters];
	state.pyxdiaDraft = createEmptyPyxdiaDraft();
	state.pyxdiaDraft.threadId = threadId;
	savePyxdiaLocalState();
	setState({
		pyxdiaThreads: state.pyxdiaThreads,
		pyxdiaLetters: state.pyxdiaLetters,
		pyxdiaDraft: state.pyxdiaDraft,
		pyxdiaActiveThreadId: threadId,
		pyxdiaView: "output",
		pyxdiaStatus: settings.delayEnabled
			? "Reply pending."
			: "Pen Pal is preparing a reply.",
		pyxdiaBusy: false,
		pyxdiaError: "",
	});
	if (!settings.delayEnabled) {
		await completeLocalPyxdiaLetter(letterId);
	}
}

function processDueLocalPyxdiaJobs(options = {}) {
	if (!state.pyxdiaLetters?.length) {
		return;
	}
	const now = Date.now();
	const due = state.pyxdiaLetters.find((letter) => {
		if (!["queued", "submitted"].includes(letter.state)) {
			return false;
		}
		if (options.force === true) {
			return true;
		}
		const availableAt = Date.parse(letter.availableAt || "");
		return Number.isFinite(availableAt) && availableAt <= now;
	});
	if (due && !state.pyxdiaSettings?.delayEnabled) {
		void completeLocalPyxdiaLetter(due.id);
	}
}

async function completeLocalPyxdiaLetter(letterId) {
	const letter = state.pyxdiaLetters.find((item) => item.id === letterId);
	if (!letter) {
		return;
	}
	const processingAt = nowIso();
	state.pyxdiaLetters = state.pyxdiaLetters.map((item) =>
		item.id === letterId
			? { ...item, state: "processing", processingAt, updatedAt: processingAt }
			: item,
	);
	state.pyxdiaThreads = state.pyxdiaThreads.map((thread) =>
		thread.id === letter.threadId
			? { ...thread, latestState: "processing", updatedAt: processingAt }
			: thread,
	);
	savePyxdiaLocalState();
	setState({
		pyxdiaLetters: state.pyxdiaLetters,
		pyxdiaThreads: state.pyxdiaThreads,
		pyxdiaStatus: "Pen Pal is writing back.",
		pyxdiaError: "",
	});
	await new Promise((resolve) => window.setTimeout(resolve, 650));
	const completedAt = nowIso();
	const outputText = buildLocalPyxdiaReply(letter, state.pyxdiaSettings);
	state.pyxdiaLetters = state.pyxdiaLetters.map((item) =>
		item.id === letterId
			? {
					...item,
					state: "completed",
					outputText,
					completedAt,
					updatedAt: completedAt,
				}
			: item,
	);
	state.pyxdiaThreads = state.pyxdiaThreads.map((thread) =>
		thread.id === letter.threadId
			? { ...thread, latestState: "completed", updatedAt: completedAt }
			: thread,
	);
	state.pyxdiaMemory = updateLocalPyxdiaMemory(letter, outputText);
	savePyxdiaLocalState();
	setState({
		pyxdiaLetters: state.pyxdiaLetters,
		pyxdiaThreads: state.pyxdiaThreads,
		pyxdiaMemory: state.pyxdiaMemory,
		pyxdiaStatus: "Reply ready.",
		pyxdiaError: "",
	});
}

function buildLocalPyxdiaReply(letter, _settings) {
	const cleanLetter = String(letter.inputText || "")
		.replace(/\s+/g, " ")
		.trim();
	const firstLine =
		String(letter.inputText || "")
			.split(/\n+/)
			.map((line) => line.trim())
			.find(Boolean) || "your letter";
	const noteCount = Array.isArray(letter.includedNoteRefs)
		? letter.includedNoteRefs.length
		: 0;
	const familySignal = /\bfamily|wife|husband|kids?|children|home\b/i.test(
		cleanLetter,
	);
	const workSignal = /\bcode|coding|work|app|project|build|computer\b/i.test(
		cleanLetter,
	);
	const balanceLine =
		familySignal && workSignal
			? "The early signal is not that your work is wrong; it is that your attention may be leaning so hard toward building that the people closest to you are getting the leftovers."
			: "The early signal is a small imbalance in attention: something valuable is asking to be noticed before it becomes a louder problem.";
	const contextLine = noteCount
		? `I also see ${noteCount} note metadata reference${noteCount === 1 ? "" : "s"} attached, so I am treating this as part of a wider pattern rather than a one-off mood.`
		: "I am only using the letter itself here, so I will keep the guidance close to what you actually wrote.";
	return [
		"Dear friend,",
		"",
		`I read this as a real check-in, not as a problem to label: ${firstLine.slice(0, 180)}${firstLine.length > 180 ? "..." : ""}`,
		"",
		`${balanceLine} ${contextLine}`,
		"",
		"Here is the smallest repair I would choose for the next day: name one protected family moment, keep it small enough to actually happen, and put the coding work around it instead of asking family time to survive around the coding work.",
		"",
		"Afterward, notice what resisted it. That resistance is useful information. It may point to pressure, excitement, avoidance, or simply a rhythm that needs a better boundary.",
		"",
		"Pen Pal",
	].join("\n");
}

function createLocalPyxdiaDynamicRetrievalMemory(threadId) {
	const items = pyxdiaLettersByNewest()
		.filter(
			(letter) => letter.threadId === threadId && letter.state === "completed",
		)
		.slice(0, 3)
		.map((letter, index) => ({
			id: `local-letter-${letter.id}`,
			type: "prior_letter_summary",
			summary: String(
				letter.inputText || letter.outputText || "Prior Pen Pal letter",
			)
				.replace(/\s+/g, " ")
				.slice(0, 220),
			reason: "Same local Pen Pal conversation as the current letter.",
			sourceLetterId: letter.id,
			sourceType: "pyxdia_letter",
			score: Math.max(0.2, 0.8 - index * 0.1),
			authority: "automatic_retrieval",
			piiSafe: true,
		}));
	return normalizePyxdiaDynamicRetrievalMemory({
		memoryId: `pyxdia-dynamic-${threadId || "local"}`,
		status: "active",
		retrievedAt: nowIso(),
		query: "same_thread_recent_letters",
		items,
		piiSafe: true,
	});
}

function updateLocalPyxdiaMemory(letter, outputText) {
	const now = nowIso();
	const firstSentence = localPyxdiaMemoryCandidate(letter);
	const entry = {
		id: makeId("pyxdia-memory"),
		type: "stable_pattern",
		text:
			firstSentence.length > 180
				? `${firstSentence.slice(0, 177)}...`
				: firstSentence,
		summary:
			firstSentence.length > 180
				? `${firstSentence.slice(0, 177)}...`
				: firstSentence,
		confidence: 0.62,
		status: "active",
		piiSafe: true,
		reasonRemembered: "Captured as a compact theme from a completed letter.",
		sourceLetterIds: [letter.id],
		sensitivity: "private_minimized",
		createdAt: now,
		updatedAt: now,
	};
	const memory = normalizePyxdiaMemory(state.pyxdiaMemory);
	const entries = [...(memory.staticMemory.entries || []), entry].slice(-50);
	const summary = entries
		.slice(-5)
		.map((item) => item.text || item.summary)
		.join(" ");
	return normalizePyxdiaMemory({
		...memory,
		summary,
		entries,
		staticMemory: {
			...memory.staticMemory,
			summary,
			confidence: entries.length ? 0.65 : 0,
			piiSafe: true,
			entries,
			lastConfirmedAt: memory.staticMemory.lastConfirmedAt || now,
			updatedAt: now,
		},
		dynamicRetrievalMemory:
			letter.dynamicRetrievalMemory || memory.dynamicRetrievalMemory,
		priorLetterContext: [
			...(memory.priorLetterContext || []),
			{
				letterId: letter.id,
				state: "completed",
				rememberedAt: now,
				outputLength: String(outputText || "").length,
			},
		].slice(-10),
		lastCompactedAt: now,
		updatedAt: now,
	});
}

function localPyxdiaMemoryCandidate(letter = {}) {
	const source =
		String(letter.inputText || "")
			.replace(/\s+/g, " ")
			.split(/[.!?]/)
			.map((item) => item.trim())
			.find(Boolean) || "User continued a Pen Pal letter thread.";
	const clean = source
		.replace(/^dear\s+pyx(?:ida|dia),?\s*/i, "")
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "a private email")
		.replace(
			/\b(?:\+?1[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]?\d{4}\b/g,
			"a private phone number",
		)
		.replace(/^i am\b/i, "User is")
		.replace(/^i'm\b/i, "User is")
		.replace(/^i\b/i, "User")
		.trim();
	const looksDurable =
		/\b(often|usually|prefer|goal|value|trying to|working on|routine|pattern|recurring|want to|keep coming back)\b/i.test(
			clean,
		);
	return looksDurable
		? clean
		: "User continued a Pen Pal letter; keep future replies grounded in practical reflection and small next steps.";
}

function trackerPageKey(dashboard, editable = false, kind = "thought") {
	return `${trackerKind(kind)}:${dashboard}:${editable ? "settings" : "quick"}`;
}

function trackerPage(
	dashboard,
	editable = false,
	maxPage = 0,
	kind = "thought",
) {
	const page =
		state.trackerPages?.[trackerPageKey(dashboard, editable, kind)] || 0;
	return Math.min(Math.max(page, 0), Math.max(0, maxPage));
}

function setTrackerPage(
	dashboard,
	direction,
	maxPage,
	editable = false,
	kind = "thought",
) {
	const current = trackerPage(dashboard, editable, maxPage, kind);
	const nextPage = direction === "prev" ? current - 1 : current + 1;
	setState({
		trackerPages: {
			...(state.trackerPages || {}),
			[trackerPageKey(dashboard, editable, kind)]: Math.min(
				Math.max(nextPage, 0),
				Math.max(0, maxPage),
			),
		},
	});
}

function reorderCombinedTrackers(area, trackerId, targetIndex) {
	if (!DASHBOARD_LABELS.includes(area) || !trackerId) {
		return;
	}
	const thoughtTrackers = [...(state.trackerSettings?.[area] || [])];
	const goalTrackers = [...(state.goalSettings?.[area] || [])];
	const enabledGoals = goalTrackers.filter((goal) => goal?.enabled);
	const disabledGoals = goalTrackers.filter((goal) => !goal?.enabled);
	const combinedTrackers = [
		...thoughtTrackers.map((tracker) => ({
			...tracker,
			trackerKind: "thought",
		})),
		...enabledGoals.map((goal) => ({ ...goal, trackerKind: "goal" })),
	];
	const sourceIndex = combinedTrackers.findIndex(
		(tracker) => tracker.id === trackerId,
	);
	if (sourceIndex < 0) {
		return;
	}
	const resolvedTarget = Number.isFinite(Number(targetIndex))
		? Number(targetIndex)
		: 0;
	const clampedTarget = Math.min(
		Math.max(resolvedTarget, 0),
		combinedTrackers.length,
	);
	if (sourceIndex === clampedTarget) {
		return;
	}
	const reordered = [...combinedTrackers];
	const [moved] = reordered.splice(sourceIndex, 1);
	reordered.splice(clampedTarget, 0, moved);

	const orderedThoughts = reordered
		.filter((tracker) => tracker.trackerKind === "thought")
		.map((tracker) => thoughtTrackers.find((entry) => entry.id === tracker.id))
		.filter(Boolean);
	const orderedThoughtIds = new Set(
		orderedThoughts.map((tracker) => tracker.id),
	);
	const nextThoughts = [
		...orderedThoughts,
		...thoughtTrackers.filter((tracker) => !orderedThoughtIds.has(tracker.id)),
	];

	const orderedGoalIds = reordered
		.filter((tracker) => tracker.trackerKind === "goal")
		.map((tracker) => tracker.id);
	const enabledGoalMap = new Map(enabledGoals.map((goal) => [goal.id, goal]));
	const nextEnabledGoals = orderedGoalIds
		.map((goalId) => enabledGoalMap.get(goalId))
		.filter(Boolean);
	const nextGoals = [...nextEnabledGoals, ...disabledGoals];

	setState({
		trackerSettings: {
			...(state.trackerSettings || {}),
			[area]: nextThoughts,
		},
		goalSettings: {
			...(state.goalSettings || {}),
			[area]: nextGoals,
		},
	});
	saveTrackerSettings();
	saveGoalSettings();
}

function clampSidebarWidth(value) {
	return Math.min(
		SIDEBAR_MAX_WIDTH,
		Math.max(
			SIDEBAR_MIN_WIDTH,
			Math.round(Number(value) || SIDEBAR_DEFAULT_WIDTH),
		),
	);
}

function _setSidebarWidth(width, options = {}) {
	const nextWidth = clampSidebarWidth(width);
	state.sidebarWidth = nextWidth;
	saveSidebarWidth(nextWidth);
	const workspace = app.querySelector(".workspace");
	if (workspace) {
		workspace.style.setProperty("--sidebar-width", `${nextWidth}px`);
	}
	const toggle = app.querySelector(".mobile-menu-toggle");
	if (toggle) {
		toggle.style.transform = "";
	}
	if (options.open) {
		state.mobileMenuOpen = true;
		if (workspace) {
			workspace.classList.add("has-mobile-menu");
		}
		if (toggle) {
			toggle.setAttribute("aria-expanded", "true");
			toggle.textContent = menuToggleLabel(true);
		}
	}
}

function toggleMobileMenu() {
	const nextOpen = !state.mobileMenuOpen;
	setState({
		mobileMenuOpen: nextOpen,
		sidebarSubmenu: nextOpen ? state.sidebarSubmenu : "",
	});
}

function closeMobileMenu() {
	if (!state.mobileMenuOpen) {
		return false;
	}
	state.mobileMenuOpen = false;
	state.sidebarSubmenu = "";
	const workspace = app.querySelector(".workspace");
	const toggle = app.querySelector(".mobile-menu-toggle");
	workspace?.classList.remove("has-mobile-menu");
	if (toggle) {
		toggle.setAttribute("aria-expanded", "false");
		toggle.textContent = menuToggleLabel(false);
	}
	return true;
}

function menuToggleLabel(isOpen = state.mobileMenuOpen) {
	return isOpen ? "Close menu" : "Menu";
}

function persistCompendiums() {
	if (!state.artifactStore) {
		return;
	}
	state.compendiums = normalizeCompendiums(state.compendiums);
	state.artifactStore = compendiumsToArtifactStore(
		state.compendiums,
		state.artifactStore,
	);
	saveArtifactStore(state.artifactStore);
}

function persistArtifactStore(nextStore) {
	state.artifactStore = nextStore;
	state.compendiums = normalizeCompendiums(
		artifactStoreToCompendiums(nextStore),
	);
	saveArtifactStore(nextStore);
}

function persistLifePlanner(nextPlanner, nextState = {}) {
	const normalized = normalizeLifePlanner(nextPlanner);
	state.lifePlanner = normalized;
	saveLifePlannerStore(normalized);
	setState(nextState);
}

function lifeProjects() {
	return state.lifePlanner?.projects || [];
}

function lifeTodos() {
	return state.lifePlanner?.todos || [];
}

function selectedLifeProject() {
	return (
		lifeProjects().find(
			(project) => project.id === state.selectedLifeProjectId,
		) || null
	);
}

function selectedLifePhase(project = selectedLifeProject()) {
	return (
		project?.phases?.find((phase) => phase.id === state.selectedLifePhaseId) ||
		null
	);
}

function selectedLifeTask(phase = selectedLifePhase()) {
	return (
		phase?.tasks?.find((task) => task.id === state.selectedLifeTaskId) || null
	);
}

function lifeProjectTaskItems() {
	return lifeProjects().flatMap((project) =>
		(project.phases || []).flatMap((phase) =>
			(phase.tasks || []).map((task) => ({
				...task,
				source: "project-task",
				projectId: project.id,
				phaseId: phase.id,
				taskId: task.id,
				projectTitle: project.title,
				phaseTitle: phase.title,
			})),
		),
	);
}

function lifeTodoTaskItems() {
	return lifeTodos().map((todo) => ({
		...todo,
		source: "todo",
		todoId: todo.id,
		projectTitle: "",
		phaseTitle: "",
	}));
}

function lifeTaskItems() {
	return [...lifeTodoTaskItems(), ...lifeProjectTaskItems()];
}

function setLifeTool(tool) {
	const nextTool = ["todo", "projects", "calendar"].includes(tool)
		? tool
		: "calendar";
	setState({
		lifeTool: nextTool,
		artifactMode: "grid",
		selectedArtifactId: null,
	});
}

async function exportArtifacts() {
	if (!state.artifactStore) {
		return;
	}
	const dateKey = todayDateKey();
	const payload = JSON.stringify(
		{
			...state.artifactStore,
			appState: await exportAppState(),
		},
		null,
		2,
	);
	const blob = new Blob([payload], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `ourstuff-${activeSpaceId()}-artifacts-${dateKey}.json`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function importArtifacts() {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "application/json,.json";
	input.addEventListener("change", async () => {
		const file = input.files?.[0];
		if (!file) {
			return;
		}
		try {
			const parsed = JSON.parse(await file.text());
			if (
				parsed?.schemaVersion !== SCHEMA_VERSION ||
				!Array.isArray(parsed.artifacts)
			) {
				throw new Error("Import file must be an Ourstuff artifact export.");
			}
			const replaceCloud = cloudHasSyncAccess();
			const confirmed = window.confirm(
				replaceCloud
					? `Import this JSON into ${activeSpaceLabel()} and rebuild that Cloud record collection from it? This wipes the current ${activeSpaceLabel()} cloud records first.`
					: `Import this JSON and replace the current local ${activeSpaceLabel()} app data?`,
			);
			if (!confirmed) {
				return;
			}
			await importAppStateJson(parsed, { replaceCloud });
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "Could not import data.",
			);
		}
	});
	input.click();
}

async function clearAppData(options = {}) {
	const silent = options?.silent === true;
	if (!silent) {
		const confirmed = window.confirm(
			`Clear the local ${activeSpaceLabel()} data from this browser, including app data and dismissed tips? This cannot be undone unless you have an export.`,
		);
		if (!confirmed) {
			return;
		}
	}
	await withLocalChangeTrackingSuppressed(async () => {
		const emptyStore = createEmptyStore();
		window.localStorage.removeItem(BODY_TRACKER_KEY);
		window.localStorage.removeItem(SPIRIT_PROGRESS_KEY);
		window.localStorage.removeItem(LIFE_PLANNER_KEY);
		window.localStorage.removeItem(TRACKER_SETTINGS_KEY);
		window.localStorage.removeItem(GOAL_SETTINGS_KEY);
		window.localStorage.removeItem(DASHBOARD_IDENTITY_KEY);
		window.localStorage.removeItem(DASHBOARD_CHART_TABS_KEY);
		window.localStorage.removeItem(PYXIDA_SETTINGS_KEY);
		window.localStorage.removeItem(PYXIDA_LOCAL_STATE_KEY);
		window.localStorage.removeItem(SIDEBAR_WIDTH_KEY);
		window.localStorage.removeItem(THEME_KEY);
		window.localStorage.removeItem(COLOR_MODE_KEY);
		window.localStorage.removeItem(TIMER_STATE_KEY);
		window.localStorage.removeItem(TIMER_SETTINGS_KEY);
		window.localStorage.removeItem(ICONIFY_SEARCH_CACHE_KEY);
		window.localStorage.removeItem(LOCAL_APP_UPDATED_AT_KEY);
		window.localStorage.removeItem(LOCAL_APP_OWNER_KEY);
		window.localStorage.removeItem(APPEARANCE_UPDATED_AT_KEY);
		clearDismissedTips();
		await clearLocalFiles().catch(() => {});
		saveArtifactStore(emptyStore);
		state.artifactStore = emptyStore;
		state.compendiums = [];
		state.bodyTracker = createDefaultBodyTracker();
		state.spiritProgress = {};
		state.lifePlanner = createDefaultLifePlanner();
		state.trackerSettings = createEmptyTrackerSettings();
		state.goalSettings = createEmptyTrackerSettings();
		state.dashboardIdentity = cloneDefaultDashboardIdentity();
		state.dashboardChartTabs = [...DEFAULT_DASHBOARD_CHART_TABS];
		state.dashboardChartType = DEFAULT_DASHBOARD_CHART_TABS[0];
		state.theme = "default";
		state.colorMode = "standard";
		state.timerState = normalizeTimerState();
		state.timerSettings = normalizeTimerSettings();
		state.timerOpen = false;
		state.localAppUpdatedAt = "";
		state.appearanceUpdatedAt = "";
		state.pyxdiaSettings = normalizePyxdiaSettings(DEFAULT_PYXIDA_SETTINGS);
		state.pyxdiaThreads = [];
		state.pyxdiaLetters = [];
		state.pyxdiaDraft = createEmptyPyxdiaDraft();
		state.pyxdiaMemory = createEmptyPyxdiaMemory();
		state.pyxdiaExpanded = false;
		state.pyxdiaView = "input";
		state.pyxdiaActiveThreadId = "";
		state.pyxdiaStatus = "";
		state.pyxdiaError = "";
		state.pyxdiaBusy = false;
		state.trashSettings = normalizeTrashSettings();
		state.trashItems = [];
		state.trashCursor = "";
		state.trashStatus = "";
		state.trashError = "";
		state.trashBusy = false;
		stopTimerInterval();
		state.settingsTab = "getting-started";
		state.trackerAddArea = "";
		state.trackerEditKey = "";
		state.trackerDeleteKey = "";
		state.suppressNextDashboardChartClick = false;
		state.active = "Dashboard";
		state.flipped = null;
		state.mindMode = "grid";
		state.artifactMode = "grid";
		state.selectedCompendiumId = null;
		state.selectedSectionId = null;
		state.selectedArtifactId = null;
		state.selectedSpiritBookKey = null;
		state.lifeTool = "";
		state.selectedLifeProjectId = null;
		state.selectedLifePhaseId = null;
		state.selectedLifeTaskId = null;
		state.galleryImages = null;
		state.gallerySelectedIds = [];
		state.cloudStorageUsage = null;
		saveTrackerSettings();
		saveGoalSettings();
		saveDashboardChartTabs(state.dashboardChartTabs);
		goHome();
	});
}

async function restoreFactoryDefaults() {
	if (activeSpaceId() !== PERSONAL_SPACE_ID) {
		window.alert("Self Help Defaults are for the Personal space. Switch to Personal to restore them.");
		return;
	}
	const confirmed = window.confirm(
		"Restore the Self Help Defaults with the original starter data, tips, orbs, goals, and app structure? This replaces local app data unless you have an export.",
	);
	if (!confirmed) {
		return;
	}
	const seedStore = await loadSeedStore();
	window.localStorage.removeItem(artifactStorageKey());
	window.localStorage.removeItem(BODY_TRACKER_KEY);
	window.localStorage.removeItem(SPIRIT_PROGRESS_KEY);
	window.localStorage.removeItem(LIFE_PLANNER_KEY);
	window.localStorage.removeItem(TRACKER_SETTINGS_KEY);
	window.localStorage.removeItem(GOAL_SETTINGS_KEY);
	window.localStorage.removeItem(DASHBOARD_IDENTITY_KEY);
	window.localStorage.removeItem(DASHBOARD_CHART_TABS_KEY);
	window.localStorage.removeItem(PYXIDA_SETTINGS_KEY);
	window.localStorage.removeItem(PYXIDA_LOCAL_STATE_KEY);
	window.localStorage.removeItem(SIDEBAR_WIDTH_KEY);
	window.localStorage.removeItem(THEME_KEY);
	window.localStorage.removeItem(COLOR_MODE_KEY);
	window.localStorage.removeItem(TIMER_STATE_KEY);
	window.localStorage.removeItem(TIMER_SETTINGS_KEY);
	window.localStorage.removeItem(ICONIFY_SEARCH_CACHE_KEY);
	window.localStorage.removeItem(LOCAL_APP_UPDATED_AT_KEY);
	clearDismissedTips();
	await clearLocalFiles().catch(() => {});
	state.artifactStore = seedStore;
	state.compendiums = normalizeCompendiums(
		artifactStoreToCompendiums(seedStore),
	);
	state.bodyTracker = createDefaultBodyTracker();
	state.spiritProgress = {};
	state.lifePlanner = createDefaultLifePlanner();
	state.trackerSettings = cloneDefaultTrackers();
	state.goalSettings = cloneDefaultGoals();
	state.dashboardIdentity = cloneDefaultDashboardIdentity();
	state.dashboardChartTabs = [...DEFAULT_DASHBOARD_CHART_TABS];
	state.dashboardChartType = DEFAULT_DASHBOARD_CHART_TABS[0];
	state.theme = "default";
	state.colorMode = "standard";
	state.timerState = normalizeTimerState();
	state.timerSettings = normalizeTimerSettings();
	state.timerOpen = false;
	state.pyxdiaSettings = normalizePyxdiaSettings(DEFAULT_PYXIDA_SETTINGS);
	state.pyxdiaThreads = [];
	state.pyxdiaLetters = [];
	state.pyxdiaDraft = createEmptyPyxdiaDraft();
	state.pyxdiaMemory = createEmptyPyxdiaMemory();
	stopTimerInterval();
	state.pyxdiaExpanded = false;
	state.pyxdiaView = "input";
	state.pyxdiaActiveThreadId = "";
	state.pyxdiaStatus = "";
	state.pyxdiaError = "";
	state.pyxdiaBusy = false;
	state.trashSettings = normalizeTrashSettings();
	state.trashItems = [];
	state.trashCursor = "";
	state.trashStatus = "";
	state.trashError = "";
	state.trashBusy = false;
	state.settingsTab = "getting-started";
	state.trackerAddArea = "";
	state.trackerEditKey = "";
	state.trackerDeleteKey = "";
	state.active = "Dashboard";
	state.flipped = null;
	state.mindMode = "grid";
	state.artifactMode = "grid";
	state.selectedCompendiumId = null;
	state.selectedSectionId = null;
	state.selectedArtifactId = null;
	state.selectedSpiritBookKey = null;
	state.lifeTool = "";
	state.selectedLifeProjectId = null;
	state.selectedLifePhaseId = null;
	state.selectedLifeTaskId = null;
	state.galleryImages = null;
	state.gallerySelectedIds = [];
	state.cloudStorageUsage = null;
	if (seedStore.appState) {
		await restoreImportedAppState(seedStore.appState);
	}
	saveArtifactStore(seedStore);
	saveDashboardIdentity(state.dashboardIdentity);
	saveDashboardChartTabs(state.dashboardChartTabs);
	saveTheme(state.theme);
	setState({
		active: "Dashboard",
		flipped: null,
		artifactStore: seedStore,
		compendiums: normalizeCompendiums(artifactStoreToCompendiums(seedStore)),
		dismissedTips: [],
	});
}

async function refreshGalleryImages() {
	try {
		const images = await listLocalImages();
		setState({
			galleryImages: images,
			gallerySelectedIds: state.gallerySelectedIds.filter((id) =>
				images.some((image) => image.id === id),
			),
		});
	} catch {
		setState({ galleryImages: [] });
	}
}

function openGallery() {
	setState({
		active: "Gallery",
		sidebarSubmenu: "",
		flipped: null,
		artifactMode: "grid",
		selectedArtifactId: null,
		selectedCompendiumId: null,
		selectedSectionId: null,
		selectedSpiritBookKey: null,
		galleryImages: null,
		gallerySelectedIds: [],
	});
	refreshGalleryImages();
}

function goHome() {
	setState({
		active: "Dashboard",
		sidebarSubmenu: "",
		flipped: null,
		mindMode: "grid",
		artifactMode: "grid",
		selectedCompendiumId: null,
		selectedSectionId: null,
		selectedArtifactId: null,
		selectedSpiritBookKey: null,
		gallerySelectedIds: [],
	});
}

function openDashboardCard(section) {
	if (state.flipped !== section) {
		setState({ flipped: section });
		return;
	}
	setState({
		active: section,
		sidebarSubmenu: "",
		flipped: null,
		mindMode: section === "Mind" ? "grid" : state.mindMode,
		artifactMode: section === "Mind" ? state.artifactMode : "grid",
		selectedCompendiumId:
			section === "Mind" ? null : state.selectedCompendiumId,
		selectedSectionId: section === "Mind" ? null : state.selectedSectionId,
		selectedArtifactId: null,
		selectedSpiritBookKey: null,
	});
}

function setSpiritYear(year) {
	setState({
		active: "Spirit",
		spiritYear: year,
		selectedSpiritBookKey: null,
		artifactMode: "grid",
		selectedArtifactId: null,
	});
}

function openSpiritBook(key) {
	setState({
		active: "Spirit",
		selectedSpiritBookKey: key,
		selectedArtifactId: null,
		artifactMode: "grid",
	});
}

function exitSpiritBook() {
	setState({ selectedSpiritBookKey: null });
}

function toggleSpiritComplete(key) {
	const work = spiritWorks().find((entry) => entry.key === key);
	if (!work) {
		return;
	}
	const completed = !isSpiritComplete(key);

	state.spiritProgress = { ...state.spiritProgress, [key]: completed };
	saveSpiritProgress();
	render();
}

function addSpiritBookNote(key) {
	const work = spiritWorks().find((entry) => entry.key === key);
	if (!work || !state.artifactStore) {
		return;
	}
	const noteId = makeId("spirit-note");
	const focus = Array.isArray(work.blackBox?.outputs)
		? work.blackBox.outputs
		: [];
	const now = nowIso();
	const note = {
		id: noteId,
		type: "note",
		dashboard: "Spirit",
		parentId: null,
		title: `${work.title} Note`,
		body: [
			`## ${work.title} Note`,
			"",
			`Author: ${work.author || ""}`,
			`Plan: ${spiritPlanLabel()}`,
			`Year: ${work.year}`,
			work.selection ? `Selection: ${work.selection}` : null,
			work.greatIdeas.length ? `Ideas: ${work.greatIdeas.join(", ")}` : null,
			"",
			"### Notes",
			"",
			"",
			"### Questions",
			"",
			"",
			"### Takeaways",
			focus.length ? focus.map((item) => `- ${item}`).join("\n") : "",
		]
			.filter((line) => line !== null)
			.join("\n"),
		created: now,
		edited: now,
		childIds: [],
		properties: {
			role: "spirit-book-note",
			status: "draft",
			planId: state.spiritPlanId,
			planLabel: spiritPlanLabel(),
			planItemKey: work.key,
			year: work.year,
			order: work.order,
			tier: work.tier,
			author: work.author,
			title: work.title,
			selection: work.selection,
			greatIdeas: work.greatIdeas,
			tags: work.tags,
		},
		analysis: {
			greatIdeas: work.greatIdeas,
			tags: work.tags,
			focus,
		},
	};
	persistArtifactStore(upsertArtifact(state.artifactStore, note));
	setState({ selectedArtifactId: noteId, artifactMode: "editor" });
}

async function loadSpiritPlan(planId = state.spiritPlanId) {
	const plan =
		SPIRIT_PLANS.find((entry) => entry.id === planId) || SPIRIT_PLANS[0];
	state.spiritPlanId = plan.id;
	state.spiritPlan = null;
	state.spiritPlanError = "";
	try {
		const response = await fetch(plan.url, { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`Could not load selected plan (${response.status}).`);
		}
		const parsed = await response.json();
		if (!parsed || !Array.isArray(parsed.years)) {
			throw new Error("Selected plan must include a years array.");
		}
		state.spiritPlan = parsed;
		const years = spiritYears();
		state.spiritYear = years.includes(state.spiritYear)
			? state.spiritYear
			: years[0] || 1;
	} catch (error) {
		state.spiritPlanError =
			error instanceof Error ? error.message : "Unknown loading error.";
	}
	render();
}

function selectSpiritPlan(planId) {
	const plan = SPIRIT_PLANS.find((entry) => entry.id === planId);
	if (!plan || plan.id === state.spiritPlanId) {
		return;
	}
	state.selectedSpiritBookKey = null;
	state.spiritYear = 1;
	loadSpiritPlan(plan.id);
}

function openCompendium(id) {
	setState({
		active: "Mind",
		selectedCompendiumId: id,
		selectedSectionId: null,
		selectedArtifactId: null,
		mindMode: "manager",
	});
}

function compendiumReaderPage(compendium) {
	const maxPage = Math.max(0, compendium?.sections?.length || 0);
	const page = state.compendiumReaderPages?.[compendium?.id] || 0;
	return Math.min(Math.max(page, 0), maxPage);
}

function setCompendiumReaderPage(compendiumId, direction, maxPage) {
	const current = state.compendiumReaderPages?.[compendiumId] || 0;
	const nextPage = direction === "prev" ? current - 1 : current + 1;
	setState({
		compendiumReaderPages: {
			...state.compendiumReaderPages,
			[compendiumId]: Math.min(Math.max(nextPage, 0), Math.max(0, maxPage)),
		},
	});
}

function readerGalleryPage(galleryKey) {
	return Math.max(0, state.readerGalleryPages?.[galleryKey] || 0);
}

function setReaderGalleryPage(galleryKey, direction, maxPage) {
	if (!galleryKey) {
		return;
	}
	const current = readerGalleryPage(galleryKey);
	const nextPage = direction === "prev" ? current - 1 : current + 1;
	setState({
		readerGalleryPages: {
			...state.readerGalleryPages,
			[galleryKey]: Math.min(Math.max(nextPage, 0), Math.max(0, maxPage)),
		},
	});
}

function readerPageContext(pageContext, galleryKey) {
	return {
		...pageContext,
		galleryKey,
		galleryPage: readerGalleryPage(galleryKey),
	};
}

function artifactGalleryKey(artifactId) {
	return `artifact:${artifactId}`;
}

function compendiumCoverGalleryKey(compendiumId) {
	return `compendium:${compendiumId}:cover`;
}

function compendiumSectionGalleryKey(compendiumId, sectionId) {
	return `compendium:${compendiumId}:section:${sectionId}`;
}

function sectionGalleryKey(sectionId) {
	const compendium = state.compendiums.find((item) =>
		item.sections.some((section) => section.id === sectionId),
	);
	return compendium
		? compendiumSectionGalleryKey(compendium.id, sectionId)
		: `section:${sectionId}`;
}

function mindCompendiumColumns() {
	if (window.matchMedia?.(COMPENDIUM_ONE_QUERY).matches) {
		return 1;
	}
	if (window.matchMedia?.(COMPENDIUM_TWO_QUERY).matches) {
		return 2;
	}
	return 3;
}

function mindCompendiumsPerPage() {
	return mindCompendiumColumns() * COMPENDIUM_ROWS_PER_PAGE;
}

function chunkItems(items, size) {
	const chunkSize = Math.max(1, size);
	const chunks = [];
	for (let index = 0; index < items.length; index += chunkSize) {
		chunks.push(items.slice(index, index + chunkSize));
	}
	return chunks;
}

function mindCompendiumPage(
	maxPage = Math.max(
		0,
		Math.ceil(state.compendiums.length / mindCompendiumsPerPage()) - 1,
	),
) {
	return Math.min(
		Math.max(state.mindCompendiumPage || 0, 0),
		Math.max(0, maxPage),
	);
}

function setMindCompendiumPage(direction, maxPage) {
	const current = mindCompendiumPage(maxPage);
	const nextPage = direction === "prev" ? current - 1 : current + 1;
	setState({
		mindCompendiumPage: Math.min(Math.max(nextPage, 0), Math.max(0, maxPage)),
		mindCompendiumPickerOpen: false,
	});
}

function toggleMindCompendiumPicker() {
	setState({ mindCompendiumPickerOpen: !state.mindCompendiumPickerOpen });
}

function _closeMindCompendiumPicker() {
	if (!state.mindCompendiumPickerOpen) {
		return;
	}
	setState({ mindCompendiumPickerOpen: false });
}

function selectMindCompendiumFromPicker(compendiumId, index, perPage) {
	setState({
		mindCompendiumPage: Math.floor(Math.max(0, index) / Math.max(1, perPage)),
		mindCompendiumPickerOpen: false,
	});
	openCompendium(compendiumId);
}

function openMindSection(parentId, sectionId) {
	if (!parentId || !sectionId) {
		return;
	}
	const compendium = state.compendiums.find((item) => item.id === parentId);
	if (!compendium?.sections?.some((section) => section.id === sectionId)) {
		return;
	}
	setState({
		active: "Mind",
		selectedCompendiumId: parentId,
		selectedSectionId: sectionId,
		selectedArtifactId: null,
		mindMode: "section-viewer",
	});
}

function openActivityArtifact(id) {
	const artifact = findArtifact(state.artifactStore, id);
	if (!artifact) {
		return;
	}
	if (artifact.dashboard === "Mind" && artifact.type === "compendium") {
		openCompendium(id);
		return;
	}
	if (
		artifact.dashboard === "Mind" &&
		artifact.type === "note" &&
		artifact.parentId
	) {
		openMindSection(artifact.parentId, id);
		return;
	}
	if (artifact.type === "note" && !artifact.parentId) {
		openArtifactNote(id, "Life");
	}
}

function openArtifactNote(id, returnActive = "") {
	const artifact = findArtifact(state.artifactStore, id);
	if (!artifact) {
		return;
	}
	setState({
		active: returnActive || artifact.dashboard,
		selectedArtifactId: id,
		artifactMode: "viewer",
		artifactReturnActive: returnActive,
		selectedCompendiumId: null,
		selectedSectionId: null,
		selectedSpiritBookKey: null,
	});
}

function closeArtifactViewer() {
	setState({
		active: state.artifactReturnActive || state.active,
		selectedArtifactId: null,
		artifactMode: "grid",
		artifactReturnActive: "",
	});
}

function addCompendium() {
	const now = nowIso();
	const next = {
		id: makeId("compendium"),
		title: `Untitled Compendium ${state.compendiums.length + 1}`,
		body: "## New Compendium\n\nDescribe what this compendium is for.",
		created: now,
		edited: now,
		sections: [],
	};
	state.compendiums = [...state.compendiums, next];
	persistCompendiums();
	setState({
		active: "Mind",
		selectedCompendiumId: next.id,
		selectedSectionId: null,
		mindMode: "compendium-editor",
	});
}

function saveCompendium(id, title, body) {
	const now = nowIso();
	state.compendiums = state.compendiums.map((item) =>
		item.id === id ? { ...item, title, body, edited: now } : item,
	);
	persistCompendiums();
	setState({ mindMode: "manager" });
}

async function deleteCompendium(id) {
	const compendium = state.compendiums.find((item) => item.id === id);
	if (!compendium) {
		return;
	}
	const artifact = findArtifact(state.artifactStore, id);
	const moved = await moveArtifactToTrash(artifact, {
		confirmText: `Move "${compendium.title}" and all of its sections to Trash?`,
	});
	if (!moved) {
		return;
	}
	setState({
		selectedCompendiumId: null,
		selectedSectionId: null,
		mindMode: "grid",
	});
}

function addSection() {
	const compendium = selectedCompendium();
	if (!compendium) {
		return;
	}
	const now = nowIso();
	const nextSection = {
		id: makeId("section"),
		title: `Section ${compendium.sections.length + 1}`,
		body: "## New Section\n\nWrite the section body here.",
		created: now,
		edited: now,
	};
	state.compendiums = state.compendiums.map((item) =>
		item.id === compendium.id
			? { ...item, edited: now, sections: [...item.sections, nextSection] }
			: item,
	);
	persistCompendiums();
	setState({ selectedSectionId: nextSection.id, mindMode: "section-editor" });
}

function saveSection(id, title, body) {
	const compendium = selectedCompendium();
	if (!compendium) {
		return;
	}
	const now = nowIso();
	state.compendiums = state.compendiums.map((item) =>
		item.id === compendium.id
			? {
					...item,
					edited: now,
					sections: item.sections.map((section) =>
						section.id === id
							? { ...section, title, body, edited: now }
							: section,
					),
				}
			: item,
	);
	persistCompendiums();
	setState({ mindMode: "section-viewer" });
}

async function deleteSection(id) {
	const compendium = selectedCompendium();
	const section = selectedSection();
	if (!compendium || !section) {
		return;
	}
	const artifact = findArtifact(state.artifactStore, id);
	const moved = await moveArtifactToTrash(artifact, {
		confirmText: `Move "${section.title}" to Trash?`,
	});
	if (!moved) {
		return;
	}
	setState({
		selectedSectionId: null,
		mindMode: "manager",
	});
}

function reorderCompendiumSection(compendiumId, sectionId, targetIndex) {
	let changed = false;
	state.compendiums = state.compendiums.map((compendium) => {
		if (compendium.id !== compendiumId) {
			return compendium;
		}
		const fromIndex = compendium.sections.findIndex(
			(section) => section.id === sectionId,
		);
		if (fromIndex < 0) {
			return compendium;
		}

		const sections = [...compendium.sections];
		const [movedSection] = sections.splice(fromIndex, 1);
		const nextIndex = Math.min(Math.max(targetIndex, 0), sections.length);
		if (nextIndex === fromIndex) {
			return compendium;
		}

		sections.splice(nextIndex, 0, movedSection);
		changed = true;
		return { ...compendium, sections };
	});
	return changed;
}

function touchCompendium(compendiumId) {
	const edited = nowIso();
	state.compendiums = state.compendiums.map((compendium) =>
		compendium.id === compendiumId ? { ...compendium, edited } : compendium,
	);
}

function addDashboardNote(dashboard) {
	const isLife = dashboard === "Life";
	const now = nowIso();
	const note = {
		id: makeId("artifact"),
		type: "note",
		dashboard,
		parentId: null,
		title: `New ${dashboardDisplayLabel(dashboard)} Note`,
		body: isLife
			? ""
			: `## New ${dashboardDisplayLabel(dashboard)} Note\n\nWrite the note here.`,
		created: now,
		edited: now,
		childIds: [],
		properties: isLife
			? {
					role: "life-journal",
					status: "active",
					isNewDraft: true,
					dateKey: todayDateKey(),
					mood: "steady",
					energy: "medium",
					thoughtTrackerIds: [],
					goalTrackerIds: [],
					audit: [
						{
							at: now,
							action: "created",
							title: `New ${dashboardDisplayLabel(dashboard)} Note`,
							dateKey: todayDateKey(),
						},
					],
				}
			: {
					role: "dashboard-note",
					status: "active",
					isNewDraft: true,
				},
		analysis: {},
	};
	persistArtifactStore(upsertArtifact(state.artifactStore, note));
	setState({
		active: dashboard,
		selectedArtifactId: note.id,
		artifactMode: "editor",
		artifactReturnActive: "",
	});
}

function auditEntryForSave(current, title, body, properties = {}) {
	const changed = [];
	if (current.title !== title) {
		changed.push("title");
	}
	if (current.body !== body) {
		changed.push("body");
	}
	if (
		JSON.stringify(current.properties || {}) !==
		JSON.stringify({ ...(current.properties || {}), ...properties })
	) {
		changed.push("metadata");
	}
	return {
		at: nowIso(),
		action: current.properties?.audit?.length ? "edited" : "created",
		title,
		dateKey: properties.dateKey || current.properties?.dateKey || today,
		changed: changed.length ? changed : ["saved"],
	};
}

function saveDashboardNote(id, title, body) {
	const current = findArtifact(state.artifactStore, id);
	if (!current) {
		return;
	}
	if (current.dashboard === "Life") {
		saveLifeJournalNote(id);
		return;
	}
	const now = nowIso();
	persistArtifactStore(
		upsertArtifact(state.artifactStore, {
			...current,
			title,
			body,
			edited: now,
			properties: {
				...(current.properties || {}),
				isNewDraft: false,
				audit: [
					...(current.properties?.audit || []).slice(-20),
					auditEntryForSave(current, title, body),
				],
			},
		}),
	);
	setState({ selectedArtifactId: id, artifactMode: "viewer" });
}

function closeArtifactEditor() {
	const current = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (state.artifactMode === "editor" && current?.properties?.isNewDraft) {
		persistArtifactStore(removeArtifact(state.artifactStore, current.id));
		setState({
			selectedArtifactId: null,
			artifactMode: "grid",
			artifactReturnActive: "",
		});
		return;
	}
	setState({ artifactMode: "viewer" });
}

function saveLifeJournalNote(id) {
	const current = findArtifact(state.artifactStore, id);
	if (!current) {
		return;
	}
	const title = editorTitle();
	const body = editorBody();
	const dateKey = dateKeyFromValue(
		document.getElementById("life-entry-date")?.value,
	);
	const properties = {
		...(current.properties || {}),
		role: "life-journal",
		status: "active",
		isNewDraft: false,
		dateKey,
		mood: current.properties?.mood || "steady",
		energy: current.properties?.energy || "medium",
		thoughtTrackerIds: Array.isArray(current.properties?.thoughtTrackerIds)
			? current.properties.thoughtTrackerIds
			: [],
		goalTrackerIds: Array.isArray(current.properties?.goalTrackerIds)
			? current.properties.goalTrackerIds
			: [],
	};
	properties.audit = [
		...(current.properties?.audit || []).slice(-20),
		auditEntryForSave(current, title, body, properties),
	];
	persistArtifactStore(
		upsertArtifact(state.artifactStore, {
			...current,
			title,
			body,
			edited: nowIso(),
			properties,
		}),
	);
	setState({ selectedArtifactId: id, artifactMode: "viewer" });
}

async function deleteDashboardNote(id) {
	const note = findArtifact(state.artifactStore, id);
	if (!note) {
		return;
	}
	const moved = await moveArtifactToTrash(note, {
		confirmText: `Move "${note.title}" to Trash?`,
	});
	if (!moved) {
		return;
	}
	setState({
		selectedArtifactId: null,
		artifactMode: "grid",
		artifactReturnActive: "",
	});
}

function appendBodyLogNote(title, body, properties = {}) {
	if (!state.artifactStore) {
		return;
	}
	const now = nowIso();
	const note = {
		id: makeId("artifact"),
		type: "note",
		dashboard: "Body",
		parentId: null,
		title,
		body,
		created: now,
		edited: now,
		childIds: [],
		properties: {
			role: "body-log",
			status: "active",
			source: "body-tracker",
			dateKey: dateKeyFromValue(now),
			audit: [
				{
					at: now,
					action: "created",
					title,
					dateKey: dateKeyFromValue(now),
				},
			],
			...properties,
		},
		analysis: {},
	};

	persistArtifactStore(upsertArtifact(state.artifactStore, note));
	return note;
}

function showBodyTimerLogToast(note, summaryAction, metric = "") {
	if (!note) {
		render();
		return;
	}
	showThoughtToast({
		kind: "thought",
		dashboard: "Body",
		label: note.title,
		noteId: note.id,
		timestamp: note.created || nowIso(),
		metric,
		noun: "timer",
		summaryAction,
		detailLabel: "Quick note",
		detailPlaceholder: "Add timer detail",
	});
}

function workoutLogNoteArtifact(workout) {
	const created = workout.created || nowIso();
	const title = workout.title || "Workout";
	const type = workout.type || "General";
	const minutes = Math.max(0, Number(workout.minutes) || 0);
	const effort = Math.max(1, Math.min(10, Number(workout.effort) || 5));
	const notes = String(workout.notes || "").trim();
	return {
		id: makeId("artifact"),
		type: "note",
		dashboard: "Body",
		parentId: null,
		title: `Workout: ${title}`,
		body: `## Workout log\n\nSaved: ${formatActivityTimestamp(created)}\n\n- Name: ${title}\n- Type: ${type}\n- Minutes: ${minutes}\n- Effort: ${effort}/10${notes ? `\n- Notes: ${notes}` : ""}`,
		created,
		edited: created,
		childIds: [],
		properties: {
			role: "body-log",
			status: "active",
			source: "body-tracker",
			sourceType: "workout",
			sourceWorkoutId: workout.id || "",
			workoutType: type,
			workoutMinutes: minutes,
			workoutEffort: effort,
			dateKey: workout.dateKey || dateKeyFromValue(created),
		},
		analysis: {},
	};
}

function migrateBodyWorkoutsToNotes(store) {
	const workouts = Array.isArray(state.bodyTracker?.workouts)
		? state.bodyTracker.workouts
		: [];
	if (!workouts.length) {
		return store;
	}
	const existingWorkoutIds = new Set(
		(store.artifacts || [])
			.map((artifact) => artifact.properties?.sourceWorkoutId)
			.filter(Boolean),
	);
	const migratedNotes = workouts
		.filter((workout) => workout?.id && !existingWorkoutIds.has(workout.id))
		.map(workoutLogNoteArtifact);
	state.bodyTracker = {
		...state.bodyTracker,
		workouts: [],
	};
	saveBodyTracker();
	return migratedNotes.length
		? { ...store, artifacts: [...(store.artifacts || []), ...migratedNotes] }
		: store;
}

function saveBodyTimerSettings(key = state.bodyTimerMode) {
	const config = bodyTimerConfig(key);
	const timer = bodyTimerState(key);
	const nextTimer = {
		...timer,
		label:
			document.getElementById(`body-timer-${key}-label`)?.value.trim() ||
			timer.label ||
			config.defaultLabel,
		targetHours: bodyTimerTargetHoursFromInput(key, timer),
	};
	setBodyTimerState(key, nextTimer);
	saveBodyTracker();
	appendBodyLogNote(
		`${config.label} settings saved`,
		`## ${config.label} settings\n\nSaved: ${currentTimestampLabel()}\n\n- Label: ${nextTimer.label}\n- Target: ${bodyTimerTargetInputValue(key, nextTimer)} ${config.targetUnit}`,
	);
	render();
}

function startBodyTimer(key = state.bodyTimerMode) {
	const config = bodyTimerConfig(key);
	const timer = bodyTimerState(key);
	const nextTimer = {
		...timer,
		label:
			document.getElementById(`body-timer-${key}-label`)?.value.trim() ||
			timer.label ||
			config.defaultLabel,
		targetHours: bodyTimerTargetHoursFromInput(key, timer),
		active: true,
		startTimestamp: Date.now(),
	};
	setBodyTimerState(key, nextTimer);
	saveBodyTracker();
	const note = appendBodyLogNote(
		`${config.shortLabel} started`,
		`## ${config.label} started\n\nStarted: ${currentTimestampLabel()}\n\n- Label: ${nextTimer.label}\n- Target: ${bodyTimerTargetInputValue(key, nextTimer)} ${config.targetUnit}`,
		{
			sourceType: "timer",
			timerKey: key,
			timerAction: "started",
		},
	);
	showBodyTimerLogToast(
		note,
		"started",
		`${bodyTimerTargetInputValue(key, nextTimer)} ${config.targetUnit} target`,
	);
}

function stopBodyTimer(key = state.bodyTimerMode) {
	const config = bodyTimerConfig(key);
	const timer = bodyTimerState(key);
	const completedHours = getBodyTimerElapsedMs(key) / 3600000;
	const nextTimer = {
		...timer,
		active: false,
		startTimestamp: null,
		lastCompletedHours: completedHours,
	};
	setBodyTimerState(key, nextTimer);
	saveBodyTracker();
	const note = appendBodyLogNote(
		`${config.shortLabel} stopped`,
		`## ${config.label} stopped\n\nStopped: ${currentTimestampLabel()}\n\n- Label: ${nextTimer.label}\n- Completed hours: ${completedHours.toFixed(1)}\n- Target: ${bodyTimerTargetInputValue(key, nextTimer)} ${config.targetUnit}`,
		{
			sourceType: "timer",
			timerKey: key,
			timerAction: "stopped",
			completedHours,
		},
	);
	showBodyTimerLogToast(note, "stopped", `${completedHours.toFixed(1)} hours`);
}

function saveBodyFastSettings() {
	saveBodyTimerSettings("fasting");
}

function startBodyFast() {
	startBodyTimer("fasting");
}

function stopBodyFast() {
	stopBodyTimer("fasting");
}

function saveBodyNutrition() {
	const note =
		document.getElementById("body-nutrition-note")?.value.trim() || "";
	state.bodyTracker.nutrition = {
		...state.bodyTracker.nutrition,
		dateKey: todayDateKey(),
		calories: Math.max(0, numberFromInput("body-calories", 0)),
		protein: Math.max(0, numberFromInput("body-protein", 0)),
		carbs: Math.max(0, numberFromInput("body-carbs", 0)),
		fat: Math.max(0, numberFromInput("body-fat", 0)),
		note,
	};
	saveBodyTracker();
	appendBodyLogNote(
		"Nutrition logged",
		`## Nutrition log\n\nSaved: ${currentTimestampLabel()}\n\n- Calories: ${state.bodyTracker.nutrition.calories} / ${state.bodyTracker.nutrition.targetCalories}\n- Protein: ${state.bodyTracker.nutrition.protein}g / ${state.bodyTracker.nutrition.targetProtein}g\n- Carbs: ${state.bodyTracker.nutrition.carbs}g / ${state.bodyTracker.nutrition.targetCarbs}g\n- Fat: ${state.bodyTracker.nutrition.fat}g / ${state.bodyTracker.nutrition.targetFat}g${note ? `\n- Note: ${note}` : ""}`,
	);
	render();
}

function resetBodyNutrition() {
	state.bodyTracker.nutrition = {
		...createDefaultBodyTracker().nutrition,
		targetCalories: state.bodyTracker.nutrition.targetCalories,
		targetProtein: state.bodyTracker.nutrition.targetProtein,
		targetCarbs: state.bodyTracker.nutrition.targetCarbs,
		targetFat: state.bodyTracker.nutrition.targetFat,
	};
	saveBodyTracker();
	appendBodyLogNote(
		"Nutrition reset",
		`## Nutrition reset\n\nSaved: ${currentTimestampLabel()}\n\n- Target calories: ${state.bodyTracker.nutrition.targetCalories}\n- Calories: ${state.bodyTracker.nutrition.calories}\n- Protein: ${state.bodyTracker.nutrition.protein}g\n- Carbs: ${state.bodyTracker.nutrition.carbs}g\n- Fat: ${state.bodyTracker.nutrition.fat}g`,
	);
	render();
}

function saveBodyNutritionGoals() {
	state.bodyTracker.nutrition = {
		...state.bodyTracker.nutrition,
		targetCalories: Math.max(
			1,
			numberFromInput(
				"body-target-calories",
				state.bodyTracker.nutrition.targetCalories || 2000,
			),
		),
		targetProtein: Math.max(
			0,
			numberFromInput(
				"body-target-protein",
				state.bodyTracker.nutrition.targetProtein || 120,
			),
		),
		targetCarbs: Math.max(
			0,
			numberFromInput(
				"body-target-carbs",
				state.bodyTracker.nutrition.targetCarbs || 200,
			),
		),
		targetFat: Math.max(
			0,
			numberFromInput(
				"body-target-fat",
				state.bodyTracker.nutrition.targetFat || 70,
			),
		),
	};
	saveBodyTracker();
	appendBodyLogNote(
		"Nutrition goals saved",
		`## Nutrition goals\n\nSaved: ${currentTimestampLabel()}\n\n- Calories: ${state.bodyTracker.nutrition.targetCalories}\n- Protein: ${state.bodyTracker.nutrition.targetProtein}g\n- Carbs: ${state.bodyTracker.nutrition.targetCarbs}g\n- Fat: ${state.bodyTracker.nutrition.targetFat}g`,
	);
	render();
}

function addBodyWorkout() {
	const title =
		document.getElementById("body-workout-title")?.value.trim() || "Workout";
	const type =
		document.getElementById("body-workout-type")?.value.trim() || "General";
	const minutes = Math.max(0, numberFromInput("body-workout-minutes", 0));
	const effort = Math.max(
		1,
		Math.min(10, numberFromInput("body-workout-effort", 5)),
	);
	const notes =
		document.getElementById("body-workout-notes")?.value.trim() || "";

	appendBodyLogNote(
		`Workout: ${title}`,
		`## Workout log\n\nSaved: ${currentTimestampLabel()}\n\n- Name: ${title}\n- Type: ${type}\n- Minutes: ${minutes}\n- Effort: ${effort}/10${notes ? `\n- Notes: ${notes}` : ""}`,
		{
			sourceType: "workout",
			workoutType: type,
			workoutMinutes: minutes,
			workoutEffort: effort,
			dateKey: todayDateKey(),
		},
	);
	render();
}

function deleteBodyWorkout(id) {
	const workout = state.bodyTracker.workouts.find((entry) => entry.id === id);
	state.bodyTracker.workouts = state.bodyTracker.workouts.filter(
		(entry) => entry.id !== id,
	);
	saveBodyTracker();
	if (workout) {
		appendBodyLogNote(
			"Workout deleted",
			`## Workout deleted\n\nSaved: ${currentTimestampLabel()}\n\n- Name: ${workout.title}\n- Type: ${workout.type}\n- Minutes: ${workout.minutes}\n- Effort: ${workout.effort}/10${workout.notes ? `\n- Notes: ${workout.notes}` : ""}`,
		);
	}
	render();
}

function setBodyMode(mode) {
	const nextMode = mode === "fasting" ? "timers" : mode;
	setState({
		bodyMode: ["timers", "nutrition", "workout", "notes"].includes(nextMode)
			? nextMode
			: "timers",
		artifactMode: "grid",
		selectedArtifactId: null,
	});
}

function setBodyTimerMode(mode) {
	setState({
		bodyMode: "timers",
		bodyTimerMode: BODY_TIMER_MODES.some((config) => config.key === mode)
			? mode
			: "fasting",
		artifactMode: "grid",
		selectedArtifactId: null,
	});
}

function setBodyNutritionMode(mode) {
	setState({
		bodyMode: "nutrition",
		bodyNutritionMode: mode === "goals" ? "goals" : "daily",
		artifactMode: "grid",
		selectedArtifactId: null,
	});
}

function setLifeMode(mode) {
	const nextMode = ["day", "week", "month", "list"].includes(mode)
		? mode
		: "month";
	setState({
		lifeTool: "calendar",
		lifeMode: nextMode,
		artifactMode: "grid",
		selectedArtifactId: null,
	});
}

function addLifeTodo() {
	const title = document.getElementById("life-todo-title")?.value.trim();
	if (!title) {
		return;
	}
	const now = nowIso();
	const todo = {
		id: makeId("todo"),
		title,
		notes: "",
		status: "todo",
		assignedDate: "",
		created: now,
		edited: now,
	};
	persistLifePlanner(
		{
			...state.lifePlanner,
			todos: [todo, ...lifeTodos()],
		},
		{ lifeTool: "todo" },
	);
}

function updateLifeTodo(id, updater) {
	const now = nowIso();
	persistLifePlanner(
		{
			...state.lifePlanner,
			todos: lifeTodos().map((todo) =>
				todo.id === id ? { ...updater(todo), edited: now } : todo,
			),
		},
		{ lifeTool: "todo" },
	);
}

function updateLifeTaskById(
	projectId,
	phaseId,
	taskId,
	updater,
	nextState = {},
) {
	const now = nowIso();
	persistLifePlanner(
		{
			...state.lifePlanner,
			projects: lifeProjects().map((project) =>
				project.id === projectId
					? {
							...project,
							edited: now,
							phases: (project.phases || []).map((phase) =>
								phase.id === phaseId
									? {
											...phase,
											edited: now,
											tasks: (phase.tasks || []).map((task) =>
												task.id === taskId
													? { ...updater(task), edited: now }
													: task,
											),
										}
									: phase,
							),
						}
					: project,
			),
		},
		{ lifeTool: "todo", ...nextState },
	);
}

function updateLifeTaskItem(task, updater, nextState = {}) {
	if (task.source === "todo") {
		updateLifeTodo(task.todoId, updater);
		return;
	}
	updateLifeTaskById(
		task.projectId,
		task.phaseId,
		task.taskId,
		updater,
		nextState,
	);
}

function toggleLifeTodo(id) {
	updateLifeTodo(id, (todo) => ({
		...todo,
		status: todo.status === "complete" ? "todo" : "complete",
	}));
}

function toggleLifeTaskItem(source, id, projectId = "", phaseId = "") {
	const task =
		source === "todo"
			? lifeTodoTaskItems().find((item) => item.todoId === id)
			: lifeProjectTaskItems().find(
					(item) =>
						item.projectId === projectId &&
						item.phaseId === phaseId &&
						item.taskId === id,
				);
	if (!task) {
		return;
	}
	updateLifeTaskItem(task, (item) => ({
		...item,
		status: item.status === "complete" ? "todo" : "complete",
	}));
}

function deleteLifeTodo(id) {
	const todo = lifeTodos().find((item) => item.id === id);
	if (!todo) {
		return;
	}
	if (!window.confirm(`Delete todo "${todo.title}"?`)) {
		return;
	}
	persistLifePlanner(
		{
			...state.lifePlanner,
			todos: lifeTodos().filter((item) => item.id !== id),
		},
		{ lifeTool: "todo" },
	);
}

function editLifeTaskNotes(source, id, projectId = "", phaseId = "") {
	const task =
		source === "todo"
			? lifeTodoTaskItems().find((item) => item.todoId === id)
			: lifeProjectTaskItems().find(
					(item) =>
						item.projectId === projectId &&
						item.phaseId === phaseId &&
						item.taskId === id,
				);
	if (!task) {
		return;
	}
	const notes = window.prompt(`Notes for "${task.title}"`, task.notes || "");
	if (notes === null) {
		return;
	}
	updateLifeTaskItem(task, (item) => ({ ...item, notes }));
}

function openLifeProjectTask(projectId, phaseId, taskId) {
	setState({
		lifeTool: "projects",
		selectedLifeProjectId: projectId,
		selectedLifePhaseId: phaseId,
		selectedLifeTaskId: taskId,
	});
}

function openLifeTaskItem(source, id, projectId = "", phaseId = "") {
	if (source === "project-task") {
		openLifeProjectTask(projectId, phaseId, id);
		return;
	}
	editLifeTaskNotes(source, id, projectId, phaseId);
}

function addLifeProject() {
	const title = document.getElementById("life-project-title")?.value.trim();
	if (!title) {
		return;
	}
	const now = nowIso();
	const project = {
		id: makeId("project"),
		title,
		status: "planned",
		assignedTo: "",
		assignedDate: "",
		notes: "",
		attachments: [],
		phases: [],
		created: now,
		edited: now,
	};
	persistLifePlanner(
		{
			...state.lifePlanner,
			projects: [project, ...lifeProjects()],
		},
		{
			lifeTool: "projects",
			selectedLifeProjectId: project.id,
			selectedLifePhaseId: null,
			selectedLifeTaskId: null,
		},
	);
}

function selectLifeProject(id) {
	setState({
		lifeTool: "projects",
		selectedLifeProjectId: id,
		selectedLifePhaseId: null,
		selectedLifeTaskId: null,
	});
}

function selectLifePhase(id) {
	setState({
		lifeTool: "projects",
		selectedLifePhaseId: id,
		selectedLifeTaskId: null,
	});
}

function selectLifeTask(id) {
	setState({
		lifeTool: "projects",
		selectedLifeTaskId: id,
	});
}

function addLifePhase(projectId) {
	const title = document.getElementById("life-phase-title")?.value.trim();
	if (!title) {
		return;
	}
	const now = nowIso();
	const phase = {
		id: makeId("phase"),
		title,
		status: "planned",
		assignedTo: "",
		assignedDate: "",
		notes: "",
		attachments: [],
		tasks: [],
		created: now,
		edited: now,
	};
	persistLifePlanner(
		{
			...state.lifePlanner,
			projects: lifeProjects().map((project) =>
				project.id === projectId
					? {
							...project,
							phases: [phase, ...(project.phases || [])],
							edited: now,
						}
					: project,
			),
		},
		{
			lifeTool: "projects",
			selectedLifeProjectId: projectId,
			selectedLifePhaseId: phase.id,
			selectedLifeTaskId: null,
		},
	);
}

function addLifeProjectTask(projectId, phaseId) {
	const title = document.getElementById("life-task-title")?.value.trim();
	if (!title) {
		return;
	}
	const now = nowIso();
	const task = {
		id: makeId("task"),
		title,
		status: "todo",
		assignedTo: "",
		assignedDate: "",
		notes: "",
		attachments: [],
		created: now,
		edited: now,
	};
	persistLifePlanner(
		{
			...state.lifePlanner,
			projects: lifeProjects().map((project) =>
				project.id === projectId
					? {
							...project,
							edited: now,
							phases: (project.phases || []).map((phase) =>
								phase.id === phaseId
									? {
											...phase,
											tasks: [task, ...(phase.tasks || [])],
											edited: now,
										}
									: phase,
							),
						}
					: project,
			),
		},
		{
			lifeTool: "projects",
			selectedLifeProjectId: projectId,
			selectedLifePhaseId: phaseId,
			selectedLifeTaskId: task.id,
		},
	);
}

function updateLifeProjectEntity(level, updater, nextState = {}) {
	const now = nowIso();
	const projectId = state.selectedLifeProjectId;
	const phaseId = state.selectedLifePhaseId;
	const taskId = state.selectedLifeTaskId;
	persistLifePlanner(
		{
			...state.lifePlanner,
			projects: lifeProjects().map((project) => {
				if (project.id !== projectId) {
					return project;
				}
				if (level === "project") {
					return { ...updater(project), edited: now };
				}
				return {
					...project,
					edited: now,
					phases: (project.phases || []).map((phase) => {
						if (phase.id !== phaseId) {
							return phase;
						}
						if (level === "phase") {
							return { ...updater(phase), edited: now };
						}
						return {
							...phase,
							edited: now,
							tasks: (phase.tasks || []).map((task) =>
								task.id === taskId ? { ...updater(task), edited: now } : task,
							),
						};
					}),
				};
			}),
		},
		{ lifeTool: "projects", ...nextState },
	);
}

function saveLifeProjectEntity(level) {
	const title =
		document.getElementById("life-entity-title")?.value.trim() || "Untitled";
	const status =
		document.getElementById("life-entity-status")?.value || "planned";
	const assignedTo =
		document.getElementById("life-entity-assigned-to")?.value.trim() || "";
	const assignedDate =
		document.getElementById("life-entity-assigned-date")?.value || "";
	const notes = document.getElementById("life-entity-notes")?.value || "";
	updateLifeProjectEntity(level, (entity) => ({
		...entity,
		title,
		status,
		assignedTo,
		assignedDate,
		notes,
	}));
}

async function uploadLifeAttachment(level) {
	const input = document.createElement("input");
	input.type = "file";
	input.multiple = true;
	input.addEventListener("change", async () => {
		const files = Array.from(input.files || []);
		if (!files.length) {
			return;
		}
		try {
			const attachments = [];
			for (const file of files) {
				attachments.push(
					await storeLocalFile(
						file,
						"life-attachments",
						localMediaStoreOptions(),
					),
				);
			}
			updateLifeProjectEntity(level, (entity) => ({
				...entity,
				attachments: [...(entity.attachments || []), ...attachments],
			}));
			scheduleCloudStorageUsageRefresh({ force: true });
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "Could not upload attachment.",
			);
		}
	});
	input.click();
}

function deleteLifeAttachment(level, attachmentId) {
	updateLifeProjectEntity(level, (entity) => ({
		...entity,
		attachments: (entity.attachments || []).filter(
			(attachment) => attachment.id !== attachmentId,
		),
	}));
	deleteLocalImages([attachmentId])
		.then(() => scheduleCloudStorageUsageRefresh({ force: true }))
		.catch(() => {});
}

function setDashboardPeriod(period) {
	const nextPeriod = dashboardPeriodOption(period).id;
	const glowUntil = Date.now() + 7000;
	window.clearTimeout(dashboardPeriodGlowTimer);
	dashboardPeriodGlowTimer = window.setTimeout(() => {
		if (state.dashboardPeriodGlowUntil <= Date.now()) {
			setState({ dashboardPeriodGlowUntil: 0 });
		}
	}, 7200);
	setState({
		dashboardPeriod: nextPeriod,
		dashboardPeriodGlowUntil: glowUntil,
	});
}

function setDashboardPeriodByIndex(index) {
	setDashboardPeriod(dashboardPeriodOptionForIndex(index).id);
}

function previewDashboardPeriodByIndex(index) {
	const option = dashboardPeriodOptionForIndex(index);
	const optionIndex = dashboardPeriodIndex(option.id);
	const progress =
		DASHBOARD_PERIOD_OPTIONS.length > 1
			? Math.round((optionIndex / (DASHBOARD_PERIOD_OPTIONS.length - 1)) * 100)
			: 0;
	app.querySelectorAll("[data-dashboard-period-slider]").forEach((input) => {
		input.value = String(optionIndex);
		input.style.setProperty("--period-progress", `${progress}%`);
		input.setAttribute("aria-valuetext", option.label);
		input
			.closest(".dashboard-period-slider")
			?.querySelector(".dashboard-period-slider-value")
			?.replaceChildren(option.label);
	});
}

function dashboardChartTabs() {
	return normalizeDashboardChartTabs(state.dashboardChartTabs);
}

function activeDashboardChartType() {
	const tabs = dashboardChartTabs();
	return tabs.includes(state.dashboardChartType)
		? state.dashboardChartType
		: tabs[0] || DEFAULT_DASHBOARD_CHART_TABS[0];
}

function setDashboardChartType(chartType) {
	const tabs = dashboardChartTabs();
	const nextType = tabs.includes(chartType)
		? chartType
		: tabs[0] || DEFAULT_DASHBOARD_CHART_TABS[0];
	setState({
		dashboardChartTabs: tabs,
		dashboardChartType: nextType,
	});
}

function reorderDashboardChartTabs(tabId, targetIndex) {
	const tabs = dashboardChartTabs();
	const sourceIndex = tabs.indexOf(tabId);
	if (sourceIndex < 0) {
		return;
	}
	const resolvedTarget = Number.isFinite(Number(targetIndex))
		? Number(targetIndex)
		: 0;
	const clampedTarget = Math.min(Math.max(resolvedTarget, 0), tabs.length);
	if (sourceIndex === clampedTarget) {
		return;
	}
	const reordered = [...tabs];
	const [moved] = reordered.splice(sourceIndex, 1);
	reordered.splice(clampedTarget, 0, moved);
	state.dashboardChartTabs = normalizeDashboardChartTabs(reordered);
	saveDashboardChartTabs(state.dashboardChartTabs);
	setState({
		dashboardChartTabs: state.dashboardChartTabs,
		dashboardChartType: activeDashboardChartType(),
	});
}

function setTheme(theme) {
	const nextTheme = normalizeTheme(theme);
	const changed = nextTheme !== normalizeTheme(state.theme);
	saveTheme(nextTheme);
	if (changed) {
		markAppearanceChanged();
	}
	setState({ theme: nextTheme });
}

function setColorMode(mode) {
	const nextMode = normalizeColorMode(mode);
	const changed = nextMode !== normalizeColorMode(state.colorMode);
	saveColorMode(nextMode);
	if (changed) {
		markAppearanceChanged();
	}
	setState({ colorMode: nextMode });
}

function saveDashboardIdentitySettings() {
	const current = normalizeDashboardIdentity(state.dashboardIdentity);
	const defaults = cloneDefaultDashboardIdentity();
	const showNumbers =
		document.getElementById("dashboard-show-numbers")?.checked ?? false;
	const showIcons =
		document.getElementById("dashboard-show-icons")?.checked ?? false;
	const showTitle =
		document.getElementById("dashboard-show-title")?.checked ?? true;
	const colorAlwaysOn =
		document.getElementById("dashboard-color-always-on")?.checked ?? false;
	const displayOptionOrder = normalizeDashboardDisplayOptionOrder(
		Array.from(
			document.querySelectorAll("[data-dashboard-display-option-box]"),
		).map((element) => element.dataset.optionId),
	);
	const displayMode =
		showIcons && !showNumbers
			? "icons"
			: showNumbers && !showIcons
				? "numbers"
				: "custom";
	const nextIdentity = {
		displayMode,
		showTitle,
		showNumbers,
		showIcons,
		displayOptionOrder,
		colorAlwaysOn,
		items: Object.fromEntries(
			DASHBOARD_LABELS.map((dashboard) => {
				const label =
					document
						.getElementById(`dashboard-identity-${dashboard}-label`)
						?.value.trim() || defaults.items[dashboard].label;
				const icon =
					document
						.getElementById(`dashboard-identity-${dashboard}-icon`)
						?.value.trim() ||
					current.items[dashboard]?.icon ||
					defaults.items[dashboard].icon;
				const color = normalizeHexColor(
					document.getElementById(`dashboard-identity-${dashboard}-color`)
						?.value,
					current.items[dashboard]?.color ||
						defaults.items[dashboard].color,
				);
				return [
					dashboard,
					{
						...defaults.items[dashboard],
						label,
						icon: normalizeIconSource(icon),
						color,
					},
				];
			}),
		),
	};
	const normalized = normalizeDashboardIdentity(nextIdentity);
	saveDashboardIdentity(normalized);
	setState({ dashboardIdentity: normalized });
}

function resetDashboardIdentityItem(dashboard) {
	if (!DASHBOARD_LABELS.includes(dashboard)) {
		return;
	}
	const fallback = cloneDefaultDashboardIdentity().items[dashboard];
	const labelInput = document.getElementById(
		`dashboard-identity-${dashboard}-label`,
	);
	if (labelInput) {
		labelInput.value = fallback.label;
	}
	updateIconPickerField(`dashboard-identity-${dashboard}-icon`, fallback.icon);
	updateIconPickerColorField(
		`dashboard-identity-${dashboard}-color`,
		fallback.color,
	);
	saveDashboardIdentitySettings();
}

function dashboardDisplayOptionToggleHtml(option, identity) {
	const checked = identity[option.stateKey] === true ? " checked" : "";
	return `
          <label class="dashboard-identity-toggle dashboard-display-option-box" data-dashboard-display-option-box data-option-id="${escapeHtml(option.id)}">
            <span class="dashboard-display-option-handle" data-orderable-drag-handle aria-hidden="true" title="Drag to reorder">${iconHtml("tabler:grip-vertical")}</span>
            <input id="dashboard-show-${escapeHtml(option.id)}" data-dashboard-display-option type="checkbox"${checked}>
            <span>${escapeHtml(option.label)}</span>
          </label>`;
}

function dismissTip(tip, element) {
	if (!tip) {
		return;
	}
	element?.classList.add("is-dismissed");
	rememberDismissedTip(tip);
	window.setTimeout(() => render(), 280);
}

function resetTips() {
	clearDismissedTips();
	render();
}

function render() {
	applyEnvironmentClasses();
	if (cameraStream) {
		stopCameraStream();
	}

	if (!isReady()) {
		app.innerHTML = `
      <div class="workspace">
        <section class="content-shell">
          <div class="panel">
            <div class="empty-state">
              <div>
                <h3>Loading</h3>
                <p>Preparing artifact data.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
		return;
	}

	if (!isSpaceUnlocked(activeSpaceId())) {
		app.innerHTML = spaceLockHtml();
		bindActions();
		const pinInput = app.querySelector("#space-unlock-pin");
		pinInput?.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				void unlockActiveSpaceFromDom();
			}
		});
		pinInput?.focus();
		return;
	}

	if (skipNextRenderScrollCapture) {
		skipNextRenderScrollCapture = false;
	} else {
		captureContentScrollPosition();
	}
	const contentScrollRestoreKey = contentScrollKey();
	const compendium = selectedCompendium();
	const section = selectedSection();
	const spiritBook = selectedSpiritBook();
	const editorDraft = captureEditorDraft();
	const nextEditorDraftKey = currentEditorDraftKey();
	if (editorDraft?.key && editorDraft.key !== nextEditorDraftKey) {
		clearEditorDraft(editorDraft.key);
	}
	const sidebarScrollTop =
		app.querySelector(".sidebar-list-scroll")?.scrollTop ?? 0;
	const settingsScrollTop =
		app.querySelector(".settings-tab-panel")?.scrollTop ?? 0;
	const thoughtToastFocus = captureThoughtToastFocus();
	hideThoughtTooltip();
	hideGuidedTip();
	app.innerHTML = `
    <div class="workspace${state.mobileMenuOpen ? " has-mobile-menu" : ""}" style="--sidebar-width: ${clampSidebarWidth(state.sidebarWidth)}px;">
      <button class="mobile-menu-toggle" data-action="toggle-mobile-menu" type="button" aria-expanded="${state.mobileMenuOpen ? "true" : "false"}">
        ${menuToggleLabel()}
      </button>
      ${sidebarHtml(compendium)}
      <section class="content-shell">
        ${pathBarHtml(compendium, section, spiritBook)}
        <div class="content-stage"${state.mobileMenuOpen ? ' inert aria-hidden="true"' : ""}>${contentHtml(compendium, section)}</div>
      </section>
    </div>
    ${donationModalHtml()}
    ${thoughtToastHtml()}
    ${iconPickerOverlayHtml()}
    ${cameraModalHtml()}
    ${timerModalHtml()}
  `;
	const sidebarScroll = app.querySelector(".sidebar-list-scroll");
	if (sidebarScroll) {
		sidebarScroll.scrollTop = sidebarScrollTop;
	}
	const settingsScroll = app.querySelector(".settings-tab-panel");
	if (settingsScroll) {
		settingsScroll.scrollTop = settingsScrollTop;
	}
	bindActions();
	fitNavButtonLabels();
	bindCameraControls();
	bindTimerControls();
	bindDashboardIdentityAutoSave();
	bindDashboardDisplayOptionSorting();
	bindTrackerEditorAutoSave();
	bindHeaderActionTooltips();
	applyCoreTooltips();
	bindThoughtTooltips();
	bindGuidedTips();
	bindThoughtToastControls();
	bindIconPickerControls();
	bindPyxdiaControls();
	bindTrackerOrbSorting();
	bindSidebarResize();
	bindSidebarHorizontalScroll();
	bindPathBarOverflow();
	applyHeaderSnapState();
	bindHeaderSnap();
	bindCompendiumSectionSorting();
	bindDashboardBalanceHover();
	bindDashboardPeriodSlider();
	bindDashboardChartTabSorting();
	bindDashboardOrbScroll();
	bindGalleryControls();
	bindEditorMedia();
	bindLocalAssetImages();
	bindPyxdiaImages();
	bindDonationFlow(document, { onOpen: closeMobileMenu });
	updateBodyTimerDom();
	renderLifeMonthCalendar();
	restoreEditorDraftFocus(editorDraft);
	focusThoughtEditor();
	restoreThoughtToastFocus(thoughtToastFocus);
	restoreContentScrollPosition(contentScrollRestoreKey);
	if (state.sidebarSubmenu === "settings" && state.settingsTab === "cloud") {
		scheduleCloudStorageUsageRefresh();
	}
}

function thoughtToastHtml() {
	const toast = state.thoughtToast;
	if (!toast) {
		return "";
	}
	const kind = trackerKind(toast.kind);
	const config = trackerKindConfig(kind);
	const quickNote = toast.quickNote || "";
	const hasQuickNote = quickNote.trim().length > 0;
	const toastDate = thoughtDateInputValue(toast.timestamp);
	const toastTime = thoughtTimeInputValue(toast.timestamp);
	const summaryAction =
		toast.summaryAction || (kind === "goal" ? "checked" : "saved");
	const summaryNoun = toast.noun || config.noun;
	const detailLabel =
		toast.detailLabel || (kind === "goal" ? "Progress note" : "Quick note");
	const detailPlaceholder =
		toast.detailPlaceholder ||
		(kind === "goal" ? "Add progress detail" : "Add a detail");
	return `
    <aside class="thought-toast" role="status" aria-live="polite">
      <div class="thought-toast-summary">
        <strong>${escapeHtml(toast.dashboard)} ${escapeHtml(summaryNoun)} ${escapeHtml(summaryAction)}</strong>
        <small><span>${escapeHtml(toast.label)}</span><span id="thought-toast-summary-time">${escapeHtml(thoughtTimestampLabel(toast.timestamp))}</span>${toast.metric ? `<span>${escapeHtml(toast.metric)}</span>` : ""}</small>
      </div>
      <label class="thought-toast-input-label">
        <span>${detailLabel}</span>
        <input class="thought-toast-input" id="thought-toast-note" type="text" value="${escapeHtml(quickNote)}" placeholder="${detailPlaceholder}">
      </label>
      <div class="thought-toast-time-fields">
        <label>
          <span>Date</span>
          <input class="thought-toast-input" id="thought-toast-date" type="date" value="${escapeHtml(toastDate)}">
        </label>
        <label>
          <span>Time</span>
          <input class="thought-toast-input" id="thought-toast-time" type="time" value="${escapeHtml(toastTime)}">
        </label>
      </div>
      <button class="icon-button thought-toast-action" data-action="${hasQuickNote ? "submit-thought-toast-note" : "open-thought-toast-note"}" data-id="${escapeHtml(toast.noteId)}" type="button" aria-label="${hasQuickNote ? (kind === "goal" ? "Submit progress note" : "Submit quick note") : "Open note"}" title="${hasQuickNote ? "Submit" : "Open Note"}">
        ${iconHtml(hasQuickNote ? "tabler:device-floppy" : "tabler:external-link")}
      </button>
      <button class="icon-button danger-button thought-toast-delete" data-action="delete-thought-toast-note" data-id="${escapeHtml(toast.noteId)}" type="button" aria-label="Delete ${escapeHtml(summaryNoun)} note" title="Delete ${escapeHtml(summaryNoun)} note">${iconHtml("tabler:trash")}</button>
      <button class="icon-button" data-action="dismiss-thought-toast" type="button" aria-label="Dismiss ${escapeHtml(summaryNoun)} popup" title="Dismiss">${iconHtml("tabler:x")}</button>
    </aside>
  `;
}

function bindThoughtToastControls() {
	const toast = app.querySelector(".thought-toast");
	const input = app.querySelector(".thought-toast-input");
	const noteInput = app.querySelector("#thought-toast-note");
	const dateInput = app.querySelector("#thought-toast-date");
	const timeInput = app.querySelector("#thought-toast-time");
	const summaryTime = app.querySelector("#thought-toast-summary-time");
	const actionButton = app.querySelector(".thought-toast-action");
	if (!toast || !input || !noteInput || !actionButton) {
		return;
	}

	const updateActionButton = () => {
		const value = noteInput.value.trim();
		const kind = trackerKind(state.thoughtToast?.kind);
		const submitLabel =
			kind === "goal" ? "Submit progress note" : "Submit quick note";
		if (state.thoughtToast) {
			state.thoughtToast.quickNote = noteInput.value;
		}
		actionButton.dataset.action = value
			? "submit-thought-toast-note"
			: "open-thought-toast-note";
		actionButton.innerHTML = iconHtml(
			value ? "tabler:device-floppy" : "tabler:external-link",
		);
		actionButton.setAttribute("aria-label", value ? submitLabel : "Open note");
		actionButton.setAttribute("title", value ? "Submit" : "Open Note");
		pauseThoughtToastFade();
	};
	const updateTimestamp = () => {
		const timestamp = thoughtTimestampFromToastControls();
		if (state.thoughtToast) {
			state.thoughtToast.timestamp = timestamp;
		}
		if (summaryTime) {
			summaryTime.textContent = thoughtTimestampLabel(timestamp);
		}
		pauseThoughtToastFade();
	};
	const keepNoteInputFocused = () => {
		if (document.activeElement !== noteInput) {
			return false;
		}
		noteInput.focus({ preventScroll: true });
		pauseThoughtToastFade();
		return true;
	};

	toast.addEventListener("pointerenter", pauseThoughtToastFade);
	toast.addEventListener("pointerleave", () => {
		if (keepNoteInputFocused()) {
			return;
		}
		resumeThoughtToastFade(0);
	});
	toast.addEventListener("focusin", pauseThoughtToastFade);
	toast.addEventListener("focusout", () => {
		window.setTimeout(() => {
			if (!toast.contains(document.activeElement) && !toast.matches(":hover")) {
				resumeThoughtToastFade(0);
			}
		}, 0);
	});
	noteInput.addEventListener("input", updateActionButton);
	dateInput?.addEventListener("input", updateTimestamp);
	timeInput?.addEventListener("input", updateTimestamp);
}

function openIconPicker(element) {
	const fieldId = element.dataset.iconField || "";
	const field = document.getElementById(fieldId);
	if (!field) {
		return;
	}
	const colorFieldId = element.dataset.iconColorField || "";
	const colorField = colorFieldId
		? document.getElementById(colorFieldId)
		: null;
	const currentColor = normalizeHexColor(
		colorField?.value,
		normalizeHexColor(element.dataset.iconColor, DASHBOARD_COLORS.Mind),
	);
	state.iconPicker = {
		fieldId,
		colorFieldId,
		previewId: element.dataset.iconPreview || "",
		title: element.dataset.iconTitle || "Choose icon",
		color: currentColor,
		selectedColor: currentColor,
		selected:
			normalizeIconSource(field.value || "tabler:circle") || "tabler:circle",
		query: "",
		limit: ICON_PICKER_PAGE_SIZE,
	};
	app.querySelector("[data-icon-picker-overlay]")?.remove();
	app.insertAdjacentHTML("beforeend", iconPickerOverlayHtml());
	bindIconPickerControls();
}

function closeIconPicker() {
	state.iconPicker = null;
	app.querySelector("[data-icon-picker-overlay]")?.remove();
}

function refreshIconPickerResults() {
	const results = app.querySelector("[data-icon-picker-results]");
	if (!results || !state.iconPicker) {
		return;
	}
	results.innerHTML = iconPickerGridHtml();
}

function updateIconPickerCurrent() {
	const symbol = app.querySelector("[data-icon-picker-current-symbol]");
	if (symbol && state.iconPicker) {
		symbol.innerHTML = trackerIconHtml(
			state.iconPicker.selected || "tabler:circle",
		);
	}
}

function updateIconPickerColorPreview() {
	if (!state.iconPicker) {
		return;
	}
	const color = normalizeHexColor(
		state.iconPicker.selectedColor,
		normalizeHexColor(state.iconPicker.color, DASHBOARD_COLORS.Mind),
	);
	const overlay = app.querySelector("[data-icon-picker-overlay]");
	overlay
		?.querySelector(".icon-picker-panel")
		?.style.setProperty("--icon-picker-color", color);
	overlay
		?.querySelector(".icon-picker-color-preview")
		?.style.setProperty("--picked-color", color);
	const input = overlay?.querySelector("[data-icon-picker-color-input]");
	if (input && input.value.toLowerCase() !== color) {
		input.value = color;
	}
	overlay?.querySelectorAll(".icon-picker-swatch").forEach((swatch) => {
		const isSelected = normalizeHexColor(swatch.dataset.color) === color;
		swatch.classList.toggle("is-selected", isSelected);
		swatch.setAttribute("aria-selected", isSelected ? "true" : "false");
	});
}

function selectIconPickerIcon(icon) {
	if (!state.iconPicker) {
		return;
	}
	state.iconPicker.selected =
		normalizeIconSource(icon || "tabler:circle") || "tabler:circle";
	updateIconPickerCurrent();
	refreshIconPickerResults();
}

function selectIconPickerColor(color) {
	if (!state.iconPicker?.colorFieldId) {
		return;
	}
	const normalized = normalizeHexColor(
		color,
		state.iconPicker.selectedColor || DASHBOARD_COLORS.Mind,
	);
	state.iconPicker.selectedColor = normalized;
	state.iconPicker.color = normalized;
	updateIconPickerColorPreview();
}

function requestIconPickerSearch(query, limit) {
	if (!state.iconPicker || String(query || "").trim().length < 3) {
		return;
	}
	const searchPromise = searchIconifyIcons(query, limit);
	refreshIconPickerResults();
	searchPromise.then(() => {
		if (
			!state.iconPicker ||
			state.iconPicker.query !== query ||
			state.iconPicker.limit !== limit
		) {
			return;
		}
		refreshIconPickerResults();
	});
}

function updateIconPickerField(fieldId, icon) {
	const normalized =
		normalizeIconSource(icon || "tabler:circle") || "tabler:circle";
	const field = document.getElementById(fieldId);
	if (field) {
		field.value = normalized;
		field.dispatchEvent(new Event("input", { bubbles: true }));
	}
	app
		.querySelectorAll(`[data-icon-field="${CSS.escape(fieldId)}"]`)
		.forEach((trigger) => {
			trigger.dataset.iconTitle = trigger.dataset.iconTitle || "Choose icon";
			trigger.setAttribute(
				"aria-label",
				`Choose icon: ${iconDisplayName(normalized)}`,
			);
			trigger.setAttribute(
				"title",
				`Choose icon: ${iconDisplayName(normalized)}`,
			);
			trigger.querySelector(".icon-picker-trigger-symbol")?.replaceChildren();
			const symbol = trigger.querySelector(".icon-picker-trigger-symbol");
			if (symbol) {
				symbol.innerHTML = trackerIconHtml(normalized);
			}
			const label = trigger.querySelector(".icon-picker-trigger-label");
			if (label) {
				label.textContent = iconDisplayName(normalized);
			}
			const previewId = trigger.dataset.iconPreview || "";
			const preview = previewId ? document.getElementById(previewId) : null;
			if (preview) {
				const previewIcon = preview.querySelector(".tracker-orb-icon");
				if (previewIcon) {
					previewIcon.innerHTML = trackerIconHtml(normalized);
				} else {
					preview.innerHTML = trackerIconHtml(normalized);
				}
			}
		});
}

function updateIconPickerColorField(fieldId, color) {
	const normalized = normalizeHexColor(color, DASHBOARD_COLORS.Mind);
	const field = document.getElementById(fieldId);
	if (field) {
		field.value = normalized;
		field.dispatchEvent(new Event("input", { bubbles: true }));
	}
	app
		.querySelectorAll(`[data-icon-color-field="${CSS.escape(fieldId)}"]`)
		.forEach((trigger) => {
			trigger.dataset.iconColor = normalized;
			trigger.style.setProperty("--icon-picker-color", normalized);
		});
}

function saveIconPickerSelection() {
	if (!state.iconPicker) {
		return;
	}
	updateIconPickerField(state.iconPicker.fieldId, state.iconPicker.selected);
	if (state.iconPicker.colorFieldId) {
		updateIconPickerColorField(
			state.iconPicker.colorFieldId,
			state.iconPicker.selectedColor,
		);
	}
	closeIconPicker();
}

function loadMoreIconPickerIcons() {
	if (!state.iconPicker) {
		return;
	}
	state.iconPicker.limit = Math.min(
		192,
		(Number(state.iconPicker.limit) || ICON_PICKER_PAGE_SIZE) +
			ICON_PICKER_PAGE_SIZE,
	);
	refreshIconPickerResults();
	requestIconPickerSearch(state.iconPicker.query, state.iconPicker.limit);
}

function bindIconPickerControls() {
	const overlay = app.querySelector("[data-icon-picker-overlay]");
	if (!overlay || !state.iconPicker) {
		return;
	}
	overlay.addEventListener("click", (event) => {
		const actionElement = event.target?.closest?.("[data-action]");
		if (!actionElement || !overlay.contains(actionElement)) {
			return;
		}
		handleAction(actionElement);
	});
	overlay.addEventListener("keydown", (event) => {
		if (!["Enter", " "].includes(event.key)) {
			return;
		}
		const actionElement = event.target?.closest?.("[data-action]");
		if (!actionElement || !overlay.contains(actionElement)) {
			return;
		}
		event.preventDefault();
		handleAction(actionElement);
	});
	const search = overlay.querySelector("[data-icon-picker-search]");
	if (search) {
		search.addEventListener("input", () => {
			state.iconPicker.query = search.value.trim();
			state.iconPicker.limit = ICON_PICKER_PAGE_SIZE;
			refreshIconPickerResults();
			requestIconPickerSearch(state.iconPicker.query, state.iconPicker.limit);
		});
	}
	const colorInput = overlay.querySelector("[data-icon-picker-color-input]");
	if (colorInput) {
		colorInput.addEventListener("input", () => {
			const normalized = normalizeHexColor(colorInput.value);
			if (!normalized) {
				return;
			}
			selectIconPickerColor(normalized);
		});
	}
}

function trackerDropIndex(row, activeWrap, pointerX, pointerY = pointerX) {
	const allWraps = Array.from(row.querySelectorAll("[data-tracker-orb-wrap]"));
	const wraps = allWraps.filter((wrap) => wrap !== activeWrap);
	if (!allWraps.length) {
		return 0;
	}
	if (!wraps.length) {
		return 0;
	}
	const sampleRect = allWraps[0].getBoundingClientRect();
	if (!sampleRect.width || !sampleRect.height) {
		return 0;
	}
	const rowStyle = window.getComputedStyle(row);
	const rowGap = parseFloat(rowStyle.rowGap || rowStyle.gap || "0") || 0;
	const columnGap = parseFloat(rowStyle.columnGap || rowStyle.gap || "0") || 0;
	const estimatedRowHeight = sampleRect.height + rowGap;
	const estimatedColumnWidth = sampleRect.width + columnGap;
	const firstRowWraps = allWraps.filter(
		(wrap) => Math.abs(wrap.getBoundingClientRect().top - sampleRect.top) < 3,
	);
	const columns = Math.max(1, firstRowWraps.length);
	const rowIndex =
		estimatedRowHeight > 0
			? Math.floor((pointerY - sampleRect.top) / estimatedRowHeight)
			: 0;
	const columnIndex =
		estimatedColumnWidth > 0
			? Math.floor((pointerX - sampleRect.left) / estimatedColumnWidth)
			: 0;
	const index = rowIndex * columns + columnIndex;
	return Math.min(Math.max(index, 0), wraps.length);
}

function clearTrackerDropMarkers(row) {
	row.querySelectorAll(".is-drop-before, .is-drop-after").forEach((wrap) => {
		wrap.classList.remove("is-drop-before", "is-drop-after");
	});
}

function setTrackerDropMarker(row, activeWrap, targetIndex) {
	clearTrackerDropMarkers(row);
	const wraps = Array.from(
		row.querySelectorAll("[data-tracker-orb-wrap]"),
	).filter((wrap) => wrap !== activeWrap);
	if (!wraps.length) {
		return;
	}
	const targetWrap = wraps[targetIndex];
	if (targetWrap) {
		targetWrap.classList.add("is-drop-before");
	} else {
		wraps[wraps.length - 1].classList.add("is-drop-after");
	}
}

function bindTrackerOrbSorting() {
	app.querySelectorAll("[data-tracker-reorder-row]").forEach((row) => {
		const shouldYieldVerticalScroll =
			row.closest(".dashboard-orb-nav") &&
			row.dataset.trackerCombined === "true";
		row.querySelectorAll("[data-tracker-orb-wrap]").forEach((wrap) => {
			const orb = wrap.querySelector(".tracker-orb");
			if (!orb) {
				return;
			}

			orb.addEventListener("pointerdown", (event) => {
				if (event.button !== undefined && event.button !== 0) {
					return;
				}
				const area = wrap.dataset.area || row.dataset.area || "";
				const kind = wrap.dataset.kind || row.dataset.kind || "thought";
				const trackerId = wrap.dataset.id || "";
				if (!area || !trackerId) {
					return;
				}

				const startX = event.clientX;
				const startY = event.clientY;
				let isDragging = false;
				let targetIndex = null;

				const suppressTrackerClickAfterScroll = () => {
					state.suppressNextTrackerClick = true;
					window.setTimeout(() => {
						state.suppressNextTrackerClick = false;
					}, 500);
				};
				const stopTracking = () => {
					window.removeEventListener("pointermove", onPointerMove);
					window.removeEventListener("pointerup", finishDrag);
					window.removeEventListener("pointercancel", finishDrag);
				};
				const startDrag = (moveEvent) => {
					isDragging = true;
					state.suppressNextTrackerEditClick = true;
					orb.setPointerCapture?.(event.pointerId);
					row.classList.add("is-reordering");
					wrap.classList.add("is-dragging");
					targetIndex = trackerDropIndex(
						row,
						wrap,
						moveEvent.clientX,
						moveEvent.clientY,
					);
					setTrackerDropMarker(row, wrap, targetIndex);
				};

				const onPointerMove = (moveEvent) => {
					const deltaX = moveEvent.clientX - startX;
					const deltaY = moveEvent.clientY - startY;
					const moved = Math.hypot(deltaX, deltaY);
					if (!isDragging && moved < 6) {
						return;
					}
					if (
						!isDragging &&
						shouldYieldVerticalScroll &&
						Math.abs(deltaY) > Math.abs(deltaX) + 2
					) {
						suppressTrackerClickAfterScroll();
						stopTracking();
						return;
					}
					moveEvent.preventDefault();
					if (!isDragging) {
						startDrag(moveEvent);
					}
					targetIndex = trackerDropIndex(
						row,
						wrap,
						moveEvent.clientX,
						moveEvent.clientY,
					);
					setTrackerDropMarker(row, wrap, targetIndex);
				};

				const finishDrag = (finishEvent) => {
					stopTracking();
					orb.releasePointerCapture?.(finishEvent.pointerId);
					row.classList.remove("is-reordering");
					wrap.classList.remove("is-dragging");
					clearTrackerDropMarkers(row);

					if (!isDragging) {
						return;
					}
					finishEvent.preventDefault();
					if (kind === "combined") {
						reorderCombinedTrackers(area, trackerId, targetIndex ?? 0);
					} else {
						reorderTracker(area, trackerId, targetIndex ?? 0, kind);
					}
					window.setTimeout(() => {
						state.suppressNextTrackerEditClick = false;
					}, 0);
				};

				window.addEventListener("pointermove", onPointerMove, {
					passive: false,
				});
				window.addEventListener("pointerup", finishDrag);
				window.addEventListener("pointercancel", finishDrag);
			});
		});
	});
}

function focusThoughtEditor() {
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (
		state.artifactMode !== "editor" ||
		!["thought", "goal-progress"].includes(note?.properties?.role)
	) {
		return;
	}
	window.requestAnimationFrame(() => {
		const editor = document.getElementById("editor-body");
		if (!editor) {
			return;
		}
		editor.focus();
		const end = editor.value.length;
		editor.setSelectionRange(end, end);
	});
}

function pyxdiaSidebarHtml() {
	const expanded = state.pyxdiaExpanded;
	const activeThreadIds = new Set(
		activePyxdiaLetters()
			.filter(pyxdiaLetterMatchesRecipient)
			.map((letter) => letter.threadId),
	);
	const latestByThread = new Map();
	pyxdiaLettersByNewest().forEach((letter) => {
		if (!latestByThread.has(letter.threadId)) {
			latestByThread.set(letter.threadId, letter);
		}
	});
	const threads = [...(state.pyxdiaThreads || [])]
		.sort((a, b) => {
			const bTime = Date.parse(b.updatedAt || b.createdAt || "") || 0;
			const aTime = Date.parse(a.updatedAt || a.createdAt || "") || 0;
			return bTime - aTime;
		})
		.filter((thread) => activeThreadIds.has(thread.id));
	const actionItems = [
		["pyxdia-open-input", "Write A Letter", "tabler:pencil", "Current draft"],
	];
	return `
    <section class="sidebar-group sidebar-group--pyxdia${expanded ? " is-expanded" : " is-collapsed"}">
      <button class="sidebar-group-toggle pyxdia-sidebar-toggle" data-action="toggle-pyxdia-menu" type="button" aria-expanded="${expanded ? "true" : "false"}">
        <span class="pyxdia-sidebar-title">${iconHtml("tabler:sparkles")}<span>Pen Pal</span></span>
        <span class="sidebar-group-chevron" aria-hidden="true">${expanded ? "-" : "+"}</span>
      </button>
      <div class="sidebar-group-items pyxdia-sidebar-items"${expanded ? "" : " hidden"}>
        ${actionItems
					.map(
						([action, label, icon, detail]) => `
          <button class="sidebar-item sidebar-item--pyxdia sidebar-item--no-number${state.active === "PYXIDA" && ((action === "pyxdia-open-input" && state.pyxdiaView === "input") || (action === "pyxdia-open-output" && state.pyxdiaView === "output")) ? " is-active" : ""}" data-action="${action}" type="button">
            <span class="sidebar-item-label"><strong>${buttonContent(icon, label)}</strong><small>${escapeHtml(detail)}</small></span>
          </button>
        `,
					)
					.join("")}
        <div class="pyxdia-sidebar-conversations" aria-label="Pen Pal conversations">
          <span>Letter Chain</span>
          ${
						threads.length
							? threads
									.slice(0, 5)
									.map(
										(thread, index) => `
              <button class="sidebar-item sidebar-item--pyxdia-thread${state.pyxdiaActiveThreadId === thread.id ? " is-active" : ""}" data-action="pyxdia-open-thread" data-id="${escapeHtml(thread.id)}" type="button">
                <span class="sidebar-item-number">${String(index + 1).padStart(2, "0")}</span>
                <span class="sidebar-item-label"><strong>${escapeHtml(thread.title)}</strong><small>${escapeHtml([pyxdiaLetterRoute(latestByThread.get(thread.id)), thread.latestState || "active", formatActivityTimestamp(thread.updatedAt || thread.createdAt)].filter(Boolean).join(" / "))}</small></span>
              </button>
            `,
									)
									.join("")
							: `<div class="pyxdia-sidebar-empty">No Pen Pal letters yet.</div>`
					}
        </div>
      </div>
    </section>
  `;
}

function sidebarHtml(_compendium) {
	const sectionLabels = DASHBOARD_LABELS;
	const expandedCount = sectionLabels.filter(
		(label) => state.sidebarExpanded[label],
	).length;
	const collapseMode = expandedCount >= 2;
	const toggleAllLabel = collapseMode ? "Collapse all" : "Expand all";
	const submenu = state.sidebarSubmenu === "settings";
	return `
    <aside class="sidebar">
      <div class="sidebar-fixed-top">
        <nav class="sidebar-menu-nav" aria-label="Menu controls">
          <button class="sidebar-menu-nav-button" data-action="toggle-all-sidebar-sections" type="button" aria-pressed="${collapseMode ? "true" : "false"}" aria-label="${toggleAllLabel}" title="${toggleAllLabel}">
            ${iconHtml(collapseMode ? "tabler:chevrons-up" : "tabler:chevrons-down")}
          </button>
          <button class="sidebar-menu-nav-button sidebar-menu-nav-timer${state.timerState?.running ? " is-active" : ""}" data-action="open-timer" data-menu-timer-button type="button" aria-label="Open Timer" title="Timer">
            ${iconHtml("tabler:clock")}
          </button>
          <button class="sidebar-menu-nav-button sidebar-menu-nav-trash" data-action="open-trash" data-thought-tooltip="Recycle Bin" type="button" aria-label="Open Recycle Bin" title="Recycle Bin">
            ${iconHtml("tabler:trash")}
          </button>
        </nav>
      </div>
      <div class="sidebar-list-scroll">
        ${
					submenu
						? sidebarSettingsSubmenuHtml()
						: `<div class="sidebar-groups">
          ${pyxdiaSidebarHtml()}
          ${sectionLabels
						.map((label) => {
							const expanded = state.sidebarExpanded[label];
							const items =
								label === "Mind"
									? (() => {
											const mindItems = mindSidebarItems();
											return mindItems
												.map((item, index) =>
													sidebarItemHtml(item, {
														action:
															item.type === "mind-section"
																? "open-mind-section"
																: "open-artifact-note",
														active:
															item.type === "mind-section"
																? state.selectedSectionId === item.id
																: item.type === "compendium"
																	? state.selectedCompendiumId === item.id &&
																		!state.selectedSectionId
																	: state.selectedArtifactId === item.id,
														number: index + 1,
														parentId: item.parentId || "",
													}),
												)
												.join("");
										})()
									: label === "Spirit"
										? newestActivityFirst(spiritNotes())
												.map((item, index) =>
													sidebarItemHtml(item, {
														action: "open-artifact-note",
														active: state.selectedArtifactId === item.id,
														number: index + 1,
													}),
												)
												.join("")
										: newestActivityFirst(
												rootNotesForDashboard(state.artifactStore, label),
											)
												.map((item, index) =>
													sidebarItemHtml(item, {
														action: "open-artifact-note",
														active: state.selectedArtifactId === item.id,
														number: index + 1,
													}),
												)
												.join("");

							return `
              <section class="sidebar-group${expanded ? " is-expanded" : " is-collapsed"}">
                <button class="sidebar-group-toggle" data-action="toggle-sidebar-section" data-section="${label}" type="button" aria-expanded="${expanded ? "true" : "false"}">
                  <span class="dashboard-inline-title">${dashboardInlineLabelHtml(label)}</span>
                  <span class="sidebar-group-chevron" aria-hidden="true">${expanded ? "-" : "+"}</span>
                </button>
                <div class="sidebar-group-items"${expanded ? "" : " hidden"}>
                  ${sidebarPagedItemsHtml(label, items)}
                </div>
              </section>
            `;
						})
						.join("")}
        </div>`
				}
      </div>
      <div class="sidebar-donate-row">
        <button class="primary-button full-width donate-sidebar" data-action="open-donation" type="button">${buttonContent("tabler:heart-handshake", "Thanks / Donate")}</button>
        <div class="sidebar-footer-links">
          <button class="sidebar-text-link${submenu ? " is-active" : ""}" data-action="open-settings" type="button">Settings</button>
          <span aria-hidden="true">/</span>
          <button class="sidebar-text-link" data-action="open-gallery" type="button">Gallery</button>
        </div>
      </div>
    </aside>
  `;
}

function sidebarSettingsSubmenuHtml() {
	const tab = activeSettingsTab();
	return `
    <section class="sidebar-submenu sidebar-settings-submenu" aria-labelledby="sidebar-settings-title">
      <header class="sidebar-submenu-header">
        <button class="sidebar-submenu-back" data-action="close-sidebar-submenu" type="button" aria-label="Back to menu">
          ${buttonContent("tabler:arrow-left", "Menu")}
        </button>
        <div>
          <h2 id="sidebar-settings-title">Settings</h2>
          <p>Setup, orbs, interface, Pen Pal, and data.</p>
        </div>
      </header>
      <div class="settings-page settings-page--menu">
        ${settingsTabsHtml(tab)}
        ${settingsPanelHtml(tab)}
      </div>
    </section>
  `;
}

function sidebarPagedItemsHtml(section, itemsHtml) {
	const itemButtons = itemsHtml
		.split("</button>")
		.map((item) => item.trim())
		.filter(Boolean)
		.map((item) => `${item}</button>`);
	if (!itemButtons.length) {
		return "";
	}
	const pageCount = Math.ceil(itemButtons.length / 5);
	const maxPage = pageCount - 1;
	const activePage = Math.min(
		Math.max(state.sidebarPages[section] || 0, 0),
		maxPage,
	);
	const pageControls =
		pageCount > 1
			? `
    <div class="sidebar-page-controls" aria-label="${escapeHtml(section)} pages">
      <button data-action="sidebar-page" data-section="${escapeHtml(section)}" data-direction="prev" data-max-page="${maxPage}" type="button"${activePage === 0 ? " disabled" : ""} aria-label="Previous page">&lt;</button>
      <button data-action="sidebar-page" data-section="${escapeHtml(section)}" data-direction="next" data-max-page="${maxPage}" type="button"${activePage === maxPage ? " disabled" : ""} aria-label="Next page">&gt;</button>
    </div>
  `
			: "";
	const visibleItems = itemButtons.slice(activePage * 5, activePage * 5 + 5);
	return `
    <div class="sidebar-group-page">
      ${visibleItems.join("")}
    </div>
    ${pageControls}
  `;
}

function pathCrumbButton(label, action, attrs = {}, className = "") {
	const attrHtml = Object.entries({ "data-action": action, ...attrs })
		.map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
		.join("");
	return `<button${className ? ` class="${escapeHtml(className)}"` : ""}${attrHtml}>${escapeHtml(label)}</button>`;
}

function pathCrumbText(label, className = "truncate muted") {
	return `<span class="${escapeHtml(className)}">${escapeHtml(label)}</span>`;
}

function bodyPathCrumbs() {
	if (state.active !== "Body") {
		return [];
	}
	const crumbs = [];
	const mode = ["timers", "nutrition", "workout", "notes"].includes(
		state.bodyMode,
	)
		? state.bodyMode
		: "timers";
	const modeLabels = {
		timers: "Timers",
		nutrition: "Nutrition",
		workout: "Workout",
		notes: "Notes",
	};
	crumbs.push(
		pathCrumbButton(modeLabels[mode], "set-body-mode", { "data-mode": mode }),
	);
	if (mode === "timers") {
		const timer = bodyTimerConfig(state.bodyTimerMode);
		crumbs.push(
			pathCrumbButton(timer.label, "set-body-timer-mode", {
				"data-mode": timer.key,
			}),
		);
	}
	if (mode === "nutrition") {
		const nutritionMode =
			state.bodyNutritionMode === "goals" ? "goals" : "daily";
		const nutritionLabel =
			nutritionMode === "goals" ? "Nutrition Goals" : "Daily Tracker";
		crumbs.push(
			pathCrumbButton(nutritionLabel, "set-body-nutrition-mode", {
				"data-mode": nutritionMode,
			}),
		);
	}
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (note?.dashboard === "Body") {
		crumbs.push(pathCrumbText(note.title));
	}
	return crumbs;
}

function lifePathCrumbs() {
	if (state.active !== "Life") {
		return [];
	}
	const crumbs = [];
	const tool = ["todo", "projects", "calendar"].includes(state.lifeTool)
		? state.lifeTool
		: "calendar";
	const toolLabels = {
		calendar: "Calendar",
		todo: "Todo List",
		projects: "Projects",
	};
	crumbs.push(
		pathCrumbButton(toolLabels[tool], "set-life-tool", { "data-tool": tool }),
	);
	if (tool === "calendar") {
		const mode = ["day", "week", "month", "list"].includes(state.lifeMode)
			? state.lifeMode
			: "month";
		const modeLabels = {
			month: "Month",
			week: "Week",
			day: "Day",
			list: "List",
		};
		crumbs.push(
			pathCrumbButton(modeLabels[mode], "set-life-mode", { "data-mode": mode }),
		);
	}
	if (tool === "projects") {
		const project = selectedLifeProject();
		const phase = selectedLifePhase(project);
		const task = selectedLifeTask(phase);
		if (project) {
			crumbs.push(
				pathCrumbButton(
					project.title,
					"select-life-project",
					{ "data-id": project.id },
					"truncate",
				),
			);
		}
		if (phase) {
			crumbs.push(
				pathCrumbButton(
					phase.title,
					"select-life-phase",
					{ "data-id": phase.id },
					"truncate",
				),
			);
		}
		if (task) {
			crumbs.push(
				pathCrumbButton(
					task.title,
					"select-life-task",
					{ "data-task-id": task.id },
					"truncate",
				),
			);
		}
	}
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (note?.dashboard === "Life") {
		crumbs.push(pathCrumbText(note.title));
	}
	return crumbs;
}

function spiritPathCrumbs(spiritBook) {
	if (state.active !== "Spirit") {
		return [];
	}
	const crumbs = [];
	const years = spiritYears();
	const activeYear =
		spiritBook?.year ||
		(years.includes(state.spiritYear) ? state.spiritYear : years[0]);
	if (activeYear) {
		crumbs.push(
			pathCrumbButton(`Year ${activeYear}`, "set-spirit-year", {
				"data-year": activeYear,
			}),
		);
	}
	if (spiritBook) {
		crumbs.push(pathCrumbText(spiritBook.title));
	}
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (note?.dashboard === "Spirit") {
		crumbs.push(pathCrumbText(note.title));
	}
	return crumbs;
}

function pathBarExtraCrumbs(spiritBook) {
	if (state.active === "Body") {
		return bodyPathCrumbs();
	}
	if (state.active === "Life") {
		return lifePathCrumbs();
	}
	if (state.active === "Spirit") {
		return spiritPathCrumbs(spiritBook);
	}
	if (state.active === "PYXIDA") {
		const labels = {
			input: "Write A Letter",
			output: "Latest Reply",
			thread: selectedPyxdiaThread()?.title || "Letter Chain",
		};
		return [pathCrumbText(labels[state.pyxdiaView] || "Write A Letter")];
	}
	return [];
}

function pathBarCrumbsHtml(crumbs) {
	return crumbs.map((crumb) => `<span>/</span>${crumb}`).join("");
}

function pathBarHtml(compendium, section, spiritBook) {
	const activeLabel = DASHBOARD_LABELS.includes(state.active)
		? dashboardDisplayLabel(state.active)
		: state.active === "PYXIDA"
			? "Pen Pal"
		: state.active;
	const extraCrumbs = pathBarExtraCrumbs(spiritBook);
	return `
    <nav class="path-bar" aria-label="Current location" tabindex="0"${extraCrumbs.length ? ' data-focus-current="true"' : ""}>
      <div class="path-bar-crumbs">
        <button class="dashboard-home-link" data-action="home">Dashboard</button>
        ${state.active !== "Dashboard" ? `<span>/</span><button data-action="dashboard-root">${escapeHtml(activeLabel)}</button>` : ""}
        ${compendium ? `<span>/</span><button class="truncate" data-action="compendium-root">${escapeHtml(compendium.title)}</button>` : ""}
        ${section ? `<span>/</span><span class="truncate muted">${escapeHtml(section.title)}</span>` : ""}
        ${state.active === "Mind" ? "" : pathBarCrumbsHtml(extraCrumbs)}
      </div>
      ${pathCameraButtonHtml()}
    </nav>
  `;
}

function contentHtml(compendium, section) {
	if (state.active === "Dashboard") {
		return dashboardGridHtml();
	}
	if (state.active === "Settings") {
		return dashboardGridHtml();
	}
	if (state.active === "Gallery") {
		return galleryHtml();
	}
	if (state.active === "Trash") {
		return trashHtml();
	}
	if (state.active === "PYXIDA") {
		return pyxdiaHtml();
	}
	if (state.active === "Mind") {
		return mindHtml(compendium, section);
	}
	if (state.active === "Body") {
		return bodyHtml();
	}
	if (state.active === "Spirit") {
		return spiritHtml();
	}
	if (state.active === "Life") {
		return lifeHtml();
	}
	return dashboardArtifactHtml(state.active);
}

function dashboardGridHtml() {
	return panelHtml(`
    ${headerHtml(
			"Ourstuff.space",
			`${activeSpaceLabel()} dashboard for ${dashboardDisplayNameList()}.`,
		)}
    ${dashboardSpaceSwitcherHtml()}
    <div class="dashboard-home">
      ${dashboardDailyReturnHtml()}
      ${dashboardAnalyticsHtml()}
    </div>
  `);
}

function dashboardDailyReturnHtml() {
	const paths = [
		["Mind", "See what is happening."],
		["Body", "Come back to the ground."],
		["Spirit", "Remember what matters."],
		["Life", "Make one real thing better."],
	];
	return `
    <section class="daily-return-panel" aria-label="Daily Return">
      <div class="daily-return-copy">
        <span>Daily Return</span>
        <h2>Notice your life.</h2>
        <p>Start with one honest check-in. Choose one path and make one thing clearer today.</p>
      </div>
      <div class="daily-return-actions">
        ${paths
					.map(([label, phrase]) => {
						const displayLabel = dashboardDisplayLabel(label);
						return `
          <button class="daily-return-path" data-action="open-dashboard-direct" data-section="${label}" type="button" style="--path-color: ${dashboardColor(label)};">
            <span class="daily-return-path-icon" aria-hidden="true">${iconHtml(dashboardDisplayIcon(label))}</span>
            <span>
              <strong>${escapeHtml(displayLabel)}</strong>
              <small>${escapeHtml(phrase)}</small>
            </span>
          </button>`;
					})
					.join("")}
      </div>
    </section>
  `;
}

function dashboardPeriodSliderHtml(extraClass = "") {
	const periodOption = dashboardPeriodOption(state.dashboardPeriod);
	const periodIndex = dashboardPeriodIndex(periodOption.id);
	const periodProgress =
		DASHBOARD_PERIOD_OPTIONS.length > 1
			? Math.round((periodIndex / (DASHBOARD_PERIOD_OPTIONS.length - 1)) * 100)
			: 0;
	const recentClass =
		state.dashboardPeriodGlowUntil > Date.now() ? " is-period-recent" : "";
	return `
    <label class="dashboard-period-slider${extraClass ? ` ${extraClass}` : ""}${recentClass}">
      <span class="dashboard-period-slider-top">
        <span class="dashboard-period-slider-value">${escapeHtml(periodOption.label)}</span>
      </span>
      <input class="dashboard-period-range" data-dashboard-period-slider type="range" min="0" max="${DASHBOARD_PERIOD_OPTIONS.length - 1}" step="1" value="${periodIndex}" aria-label="Balance range" aria-valuetext="${escapeHtml(periodOption.label)}" style="--period-progress: ${periodProgress}%;">
      <span class="dashboard-period-slider-scale" aria-hidden="true">
        <span>1d</span>
        <span>10y</span>
      </span>
    </label>
  `;
}

function dashboardAnalyticsHtml() {
	const labels = DASHBOARD_LABELS;
	const pieLabels = ["Body", "Spirit", "Life", "Mind"];
	const chartType = activeDashboardChartType();
	const chartTabs = dashboardChartTabs();
	const periodOption = dashboardPeriodOption(state.dashboardPeriod);
	const events = lifeEvents().filter((event) =>
		eventIsInPeriod(event, periodOption.id),
	);
	const counts = Object.fromEntries(labels.map((label) => [label, 0]));
	events.forEach((event) => {
		if (counts[event.dashboard] !== undefined) {
			counts[event.dashboard] += 1;
		}
	});
	const total = labels.reduce((sum, label) => sum + counts[label], 0);
	let cursor = 0;
	const segments = pieLabels.map((label) => {
		const value = total ? (counts[label] / total) * 100 : 25;
		const start = cursor;
		cursor += value;
		return { label, value, start };
	});
	const ideal = total ? total / labels.length : 0;
	const imbalance = total
		? labels
				.map((label) => Math.abs(counts[label] - ideal))
				.reduce((sum, value) => sum + value, 0) / total
		: 0;
	const balanceScore = Math.max(0, Math.round((1 - imbalance) * 100));
	const maxCount = Math.max(1, ...labels.map((label) => counts[label]));
	const chartHtml =
		chartType === "orbs"
			? dashboardQuickOrbsHtml()
			: chartType === "bar"
				? `
      <div class="dashboard-bar-chart" role="img" aria-label="Balance bar chart">
        ${labels
					.map((label) => {
						const count = counts[label];
						const displayLabel = dashboardDisplayLabel(label);
						const barSize = count
							? Math.max(10, Math.round((count / maxCount) * 100))
							: 5;
						return `
            <button class="dashboard-bar-button" data-action="open-dashboard-direct" data-section="${label}" data-balance-key="${label}" type="button" aria-label="Open ${escapeHtml(displayLabel)}, ${count} event${count === 1 ? "" : "s"}" style="--bar-color: ${dashboardColor(label)}; --bar-size: ${barSize}%;">
              <span class="dashboard-bar-value">${count}</span>
              <span class="dashboard-bar-track" aria-hidden="true"><span class="dashboard-bar-fill"></span></span>
            </button>
          `;
					})
					.join("")}
      </div>
    `
				: `
      <div class="dashboard-pie">
        <svg class="dashboard-pie-chart" viewBox="0 0 148 148" aria-label="Open balance section">
          ${segments
						.map(
							({ label, value, start }) => `
            <circle class="dashboard-pie-segment" data-action="open-dashboard-direct" data-section="${label}" data-balance-key="${label}" tabindex="0" role="button" aria-label="Open ${escapeHtml(dashboardDisplayLabel(label))}" cx="74" cy="74" r="57" pathLength="100" style="--segment-color: ${dashboardColor(label)}; --segment-start: ${start}; --segment-size: ${value};"></circle>
          `,
						)
						.join("")}
        </svg>
        <span>${total}</span>
        <small>events</small>
      </div>
    `;
	return `
    <section class="dashboard-analytics" aria-label="Dashboard analytics">
      <div class="dashboard-analytics-body">
        <div class="dashboard-pie-wrap dashboard-pie-wrap--${escapeHtml(chartType)}">
          <div class="dashboard-chart-controls">
            <div class="dashboard-chart-switcher" data-dashboard-chart-switcher role="tablist" aria-label="Dashboard chart type" style="--dashboard-chart-tab-count: ${chartTabs.length};">
              ${chartTabs
								.map((type) => DASHBOARD_CHART_TAB_DEFS[type])
								.filter(Boolean)
								.map(
									(tab) => `
                <button class="${chartType === tab.id ? "is-active" : ""}" data-action="set-dashboard-chart" data-dashboard-chart-tab data-chart="${tab.id}" type="button" role="tab" aria-selected="${chartType === tab.id ? "true" : "false"}" aria-pressed="${chartType === tab.id ? "true" : "false"}" title="${escapeHtml(tab.title)}">${buttonContent(tab.icon, tab.label)}</button>
              `,
								)
								.join("")}
            </div>
          </div>
          ${chartHtml}
          ${chartType === "orbs" ? "" : `<strong>${balanceScore}% balanced</strong>`}
        </div>
      </div>
    </section>
  `;
}

function pyxdiaHtml() {
	const mode = ["input", "output", "thread"].includes(state.pyxdiaView)
		? state.pyxdiaView
		: "input";
	const signedIn = isPyxdiaSignedIn();
	const settings = normalizePyxdiaSettings(state.pyxdiaSettings);
	const subtitle = signedIn
		? "Reflective letter exchange with private, user-scoped processing."
		: "Draft locally. Sign in before sending letters.";
	const body =
		mode === "output"
			? pyxdiaOutputHtml()
			: mode === "thread"
				? pyxdiaThreadHtml()
				: pyxdiaInputHtml();
	return panelHtml(`
    ${headerHtml(
			"Pen Pal",
			subtitle,
			`
        <div class="action-row">
          <button class="secondary-button" data-action="pyxdia-refresh" type="button"${state.pyxdiaBusy ? " disabled" : ""}>${buttonContent("tabler:refresh", "Refresh")}</button>
          <button class="secondary-button" data-action="pyxdia-open-settings" type="button">${buttonContent("tabler:settings", "Settings")}</button>
        </div>
      `,
		)}
    <div class="pyxdia-page">
      ${pyxdiaStatusHtml(settings)}
      ${body}
    </div>
  `);
}

function pyxdiaFamilyLetterPeerUid(letter = {}) {
	if (normalizePyxdiaRecipientType(letter.recipientType) !== "family") {
		return "";
	}
	const actor = pyxdiaActorUid();
	return String(letter.fromUid || "") === actor
		? String(letter.toUid || letter.recipientUid || "")
		: String(letter.fromUid || letter.createdBy || "");
}

function pyxdiaStatusHtml(settings) {
	const signedIn = isPyxdiaSignedIn();
	const latest = latestPyxdiaLetter();
	const pieces = [
		settings.enabled ? "Enabled" : "Off in Settings",
		settings.delayEnabled ? "Delay on" : "Delay off",
		signedIn ? "Signed in" : "Signed out",
		latest ? pyxdiaStatusText(latest) : "No letters yet",
	];
	return `
    <div class="pyxdia-status-strip${state.pyxdiaError ? " has-error" : ""}" role="status">
      <div>
        ${pieces.map((piece) => `<span>${escapeHtml(piece)}</span>`).join("")}
      </div>
      ${state.pyxdiaStatus ? `<p>${escapeHtml(state.pyxdiaStatus)}</p>` : ""}
      ${state.pyxdiaError ? `<p class="pyxdia-error">${escapeHtml(state.pyxdiaError)}</p>` : ""}
    </div>
  `;
}

function pyxdiaInputHtml() {
	const draft = normalizePyxdiaDraft(state.pyxdiaDraft);
	const settings = normalizePyxdiaSettings(state.pyxdiaSettings);
	const editorMode =
		state.pyxdiaEditorMode === "preview" ? "preview" : "markdown";
	const size = estimatePyxdiaLetterSize(draft.inputText);
	const overLimit =
		size.words > settings.letterMaxWords ||
		size.chars > settings.letterMaxChars;
	const metadataBudget = pyxdiaNoteMetadataBudget(draft);
	const metadataError = pyxdiaNoteMetadataBudgetError(metadataBudget);
	const readOnly = isShareableSpace(activeSpaceId()) && state.cloud?.spaceRole === "reader";
	const sendDisabled = state.pyxdiaBusy || Boolean(metadataError) || readOnly;
	return `
    <section class="pyxdia-letter-editor">
      <div class="pyxdia-letter-main">
        <div class="body-card-heading">
          <div>
            <h3>Write A Letter</h3>
            <p>Markdown writing with a simple read-only Live View.</p>
          </div>
          <div class="pyxdia-editor-toggle" role="tablist" aria-label="Letter editor mode">
            <button class="body-mode-button${editorMode === "markdown" ? " is-active" : ""}" data-action="set-pyxdia-editor-mode" data-mode="markdown" type="button" role="tab" aria-selected="${editorMode === "markdown" ? "true" : "false"}">${buttonContent("tabler:markdown", "Markdown", "body-mode-label")}</button>
            <button class="body-mode-button${editorMode === "preview" ? " is-active" : ""}" data-action="set-pyxdia-editor-mode" data-mode="preview" type="button" role="tab" aria-selected="${editorMode === "preview" ? "true" : "false"}">${buttonContent("tabler:eye", "Live View", "body-mode-label")}</button>
          </div>
        </div>
        ${pyxdiaRecipientSelectorHtml(draft)}
        ${
					editorMode === "preview"
						? `<div class="pyxdia-letter-preview markdown-body" aria-label="Write A Letter Live View">${renderPyxdiaLetterMarkdown(draft.inputText, draft.imageRefs)}</div>`
						: `<label class="body-field body-field--full pyxdia-letter-field">
          <span class="sr-only">Write A Letter</span>
          <textarea id="pyxdia-letter-input" aria-label="Write A Letter" placeholder="Write the letter you want Pen Pal to answer later. Paste images here to upload them into this letter.">${escapeHtml(draft.inputText)}</textarea>
        </label>`
				}
        <div class="pyxdia-letter-counter${overLimit ? " is-over-limit" : ""}" data-pyxdia-counter>
          <span>${escapeHtml(`${size.words} / ${settings.letterMaxWords} words`)}</span>
          <span>${escapeHtml(`${size.chars} / ${settings.letterMaxChars} chars`)}</span>
        </div>
      </div>
      <section class="pyxdia-letter-side">
        <div class="body-card-heading">
          <div>
            <h3>Note Metadata Selector</h3>
            <p>Metadata only. No note bodies are included automatically.</p>
          </div>
        </div>
        ${pyxdiaNoteSelectionHtml(draft)}
      </section>
      <section class="pyxdia-context-card">
        <div class="body-card-heading">
          <div>
            <h3>Optional Context</h3>
            <p>Choose anything you want Pen Pal to consider with this letter.</p>
          </div>
        </div>
        <label class="body-field body-field--full">
          <span class="sr-only">Optional Context</span>
          <textarea id="pyxdia-context-input" aria-label="Optional Context" placeholder="Paste only the note, chat, quicknote, memory card, project, or other text you want Pen Pal to use for this letter.">${escapeHtml(draft.userIncludedContext)}</textarea>
        </label>
      </section>
      <div class="editor-footer-actions pyxdia-letter-actions">
        <button class="secondary-button" data-action="pyxdia-save-draft" type="button"${state.pyxdiaBusy || readOnly ? " disabled" : ""}>${buttonContent("tabler:device-floppy", "Save Draft")}</button>
        <button class="primary-button" data-action="pyxdia-send-letter" type="button"${sendDisabled ? " disabled" : ""}>${buttonContent("tabler:send-2", "Send Letter")}</button>
      </div>
    </section>
    ${pyxdiaLastLetterHtml({ embedded: true })}
  `;
}

function pyxdiaRecipientSelectorHtml(draft) {
	const selected = pyxdiaSelectedRecipient();
	const family = familyPenPalCorrespondents();
	const hasFamilyRecipients = isFamilyPenPalAvailable() && family.length > 0;
	if (!hasFamilyRecipients) {
		return `
    <fieldset class="pyxdia-recipient-selector pyxdia-recipient-selector--single">
      <legend>Send to</legend>
      <span class="pyxdia-recipient-static">${escapeHtml(selected.recipientLabel || "PYXIDA")}</span>
    </fieldset>
  `;
	}
	return `
    <fieldset class="pyxdia-recipient-selector">
      <legend>Send to</legend>
      <label class="dashboard-identity-toggle">
        <input data-pyxdia-recipient-control name="pyxdia-recipient-type" value="pyxdia" type="radio"${selected.recipientType !== "family" ? " checked" : ""}>
        <span>PYXIDA</span>
      </label>
      <label class="dashboard-identity-toggle">
        <input data-pyxdia-recipient-control name="pyxdia-recipient-type" value="family" type="radio"${selected.recipientType === "family" ? " checked" : ""}>
        <span>Family</span>
      </label>
      <label class="body-field pyxdia-family-recipient">
        <span>Family member</span>
        <select id="pyxdia-family-recipient" data-pyxdia-recipient-control${selected.recipientType === "family" ? "" : " disabled"}>
          ${family
						.map(
							(member) =>
								`<option value="${escapeHtml(member.uid)}"${member.uid === selected.recipientUid || member.uid === draft.recipientUid ? " selected" : ""}>${escapeHtml(member.label)}</option>`,
						)
						.join("")}
        </select>
      </label>
    </fieldset>
  `;
}

function renderPyxdiaLetterMarkdown(text, _imageRefs = []) {
	const html = renderMarkdown(text || "");
	return html || `<p>${escapeHtml("Nothing written yet.")}</p>`;
}

function pyxdiaNoteSelectionHtml(draft) {
	const refs = pyxdiaAllNoteRefs();
	const selected = pyxdiaEffectiveSelectedNoteIds(draft, refs);
	const budget = pyxdiaNoteMetadataBudget(draft, refs);
	const budgetError = pyxdiaNoteMetadataBudgetError(budget);
	const filters = normalizePyxdiaNoteFilters(state.pyxdiaNoteFilters);
	const dashboards = Array.from(
		new Set(refs.map((ref) => ref.dashboard || "Note").filter(Boolean)),
	).sort((a, b) => a.localeCompare(b));
	const roles = Array.from(
		new Set(refs.map((ref) => ref.role || "note").filter(Boolean)),
	).sort((a, b) => a.localeCompare(b));
	if (!refs.length) {
		return emptyStateHtml("No note metadata", "Create notes first.");
	}
	const optionHtml = (value, label, current) =>
		`<option value="${escapeHtml(value)}"${current === value ? " selected" : ""}>${escapeHtml(label)}</option>`;
	return `
    <div class="pyxdia-note-selector">
      <div class="pyxdia-note-filter-grid">
        <label class="body-field">Search<input id="pyxdia-note-filter-search" data-pyxdia-note-filter="search" type="search" value="${escapeHtml(filters.search)}" placeholder="Title, area, role"></label>
        <label class="body-field">Area<select id="pyxdia-note-filter-dashboard" data-pyxdia-note-filter="dashboard">
          ${optionHtml("", "All areas", filters.dashboard)}
          ${dashboards.map((dashboard) => optionHtml(dashboard, dashboard, filters.dashboard)).join("")}
        </select></label>
        <label class="body-field">Role<select id="pyxdia-note-filter-role" data-pyxdia-note-filter="role">
          ${optionHtml("", "All roles", filters.role)}
          ${roles.map((role) => optionHtml(role, role, filters.role)).join("")}
        </select></label>
      </div>
      <div class="pyxdia-note-filter-toggles">
        <label class="dashboard-identity-toggle">
          <input id="pyxdia-note-filter-selected" data-pyxdia-note-filter="selectedOnly" type="checkbox"${filters.selectedOnly ? " checked" : ""}>
          <span>Selected</span>
        </label>
        <label class="dashboard-identity-toggle">
          <input id="pyxdia-note-filter-recent" data-pyxdia-note-filter="recentOnly" type="checkbox"${filters.recentOnly ? " checked" : ""}>
          <span>Recent ${PYXIDA_RECENT_NOTE_DAYS}d</span>
        </label>
      </div>
      <div class="action-row pyxdia-note-bulk-actions">
        <button class="secondary-button" data-action="pyxdia-note-select-visible" type="button">${buttonContent("tabler:checks", "Select Visible")}</button>
        <button class="secondary-button" data-action="pyxdia-note-clear-visible" type="button">${buttonContent("tabler:square", "Clear Visible")}</button>
        <button class="secondary-button" data-action="pyxdia-note-reset-all" type="button">${buttonContent("tabler:refresh", "Reset All")}</button>
      </div>
      <p class="pyxdia-note-summary${budgetError ? " is-over-limit" : ""}" data-pyxdia-note-summary>
        ${escapeHtml(`${budget.refs} of ${refs.length} metadata refs selected / ${budget.chars} chars. No note bodies are included.`)}
      </p>
      ${budgetError ? `<p class="pyxdia-context-warning">${escapeHtml(budgetError)}</p>` : ""}
      <div class="pyxdia-note-ref-list">
        ${refs
					.map((ref) => {
						const checked = selected.has(ref.id);
						const meta = `${ref.dashboard || "Note"} / ${ref.role} / ${ref.wordCount} words / ${ref.edited ? formatActivityTimestamp(ref.edited) : "No date"}`;
						const searchText = [
							ref.title,
							ref.dashboard || "Note",
							ref.role || "note",
						]
							.join(" ")
							.toLowerCase();
						return `
        <label class="pyxdia-note-ref" data-pyxdia-note-ref-row data-dashboard="${escapeHtml(ref.dashboard || "Note")}" data-role="${escapeHtml(ref.role || "note")}" data-search="${escapeHtml(searchText)}" data-recent="${isPyxdiaRecentNoteRef(ref) ? "true" : "false"}" data-selected="${checked ? "true" : "false"}">
          <input data-pyxdia-note-ref type="checkbox" value="${escapeHtml(ref.id)}"${checked ? " checked" : ""}>
          <span>
            <strong>${escapeHtml(ref.title)}</strong>
            <small>${escapeHtml(meta)}</small>
          </span>
        </label>
      `;
					})
					.join("")}
      </div>
      <div class="pyxdia-note-filter-empty" data-pyxdia-note-empty hidden>No matching note metadata.</div>
    </div>
  `;
}

function pyxdiaNoteFiltersFromDom() {
	return normalizePyxdiaNoteFilters({
		search:
			app.querySelector("[data-pyxdia-note-filter='search']")?.value || "",
		dashboard:
			app.querySelector("[data-pyxdia-note-filter='dashboard']")?.value || "",
		role: app.querySelector("[data-pyxdia-note-filter='role']")?.value || "",
		selectedOnly:
			app.querySelector("[data-pyxdia-note-filter='selectedOnly']")?.checked ===
			true,
		recentOnly:
			app.querySelector("[data-pyxdia-note-filter='recentOnly']")?.checked ===
			true,
	});
}

function pyxdiaVisibleNoteCheckboxes() {
	return Array.from(app.querySelectorAll("[data-pyxdia-note-ref-row]"))
		.filter((row) => row.hidden !== true)
		.map((row) => row.querySelector("[data-pyxdia-note-ref]"))
		.filter(Boolean);
}

function updatePyxdiaNoteSummaryDom() {
	const refs = pyxdiaAllNoteRefs();
	const draft = pyxdiaDraftFromDom({ noteSelectionMode: "custom" });
	const budget = pyxdiaNoteMetadataBudget(draft, refs);
	const budgetError = pyxdiaNoteMetadataBudgetError(budget);
	const summary = app.querySelector("[data-pyxdia-note-summary]");
	if (summary) {
		summary.classList.toggle("is-over-limit", Boolean(budgetError));
		summary.textContent = `${budget.refs} of ${refs.length} metadata refs selected / ${budget.chars} chars. No note bodies are included.`;
	}
	const sendButton = app.querySelector("[data-action='pyxdia-send-letter']");
	if (sendButton) {
		sendButton.disabled = state.pyxdiaBusy || Boolean(budgetError);
	}
}

function applyPyxdiaNoteFiltersDom() {
	const filters = normalizePyxdiaNoteFilters(state.pyxdiaNoteFilters);
	const rows = Array.from(app.querySelectorAll("[data-pyxdia-note-ref-row]"));
	const search = filters.search.toLowerCase();
	let visible = 0;
	rows.forEach((row) => {
		const checkbox = row.querySelector("[data-pyxdia-note-ref]");
		const checked = checkbox?.checked === true;
		row.dataset.selected = checked ? "true" : "false";
		const matchesSearch =
			!search || String(row.dataset.search || "").includes(search);
		const matchesDashboard =
			!filters.dashboard || row.dataset.dashboard === filters.dashboard;
		const matchesRole = !filters.role || row.dataset.role === filters.role;
		const matchesSelected = !filters.selectedOnly || checked;
		const matchesRecent = !filters.recentOnly || row.dataset.recent === "true";
		const matches =
			matchesSearch &&
			matchesDashboard &&
			matchesRole &&
			matchesSelected &&
			matchesRecent;
		row.hidden = !matches;
		if (matches) {
			visible += 1;
		}
	});
	const empty = app.querySelector("[data-pyxdia-note-empty]");
	if (empty) {
		empty.hidden = visible > 0;
	}
	updatePyxdiaNoteSummaryDom();
}

function savePyxdiaNoteSelectionFromDom(noteSelectionMode = "custom") {
	const draft = savePyxdiaDraftLocal(
		pyxdiaDraftFromDom({ noteSelectionMode }),
		{ render: false },
	);
	setState({ pyxdiaDraft: draft, pyxdiaError: "" });
}

function pyxdiaOutputHtml() {
	return pyxdiaLastLetterHtml();
}

function pyxdiaLastLetterHtml(options = {}) {
	const latest = latestCompletedPyxdiaLetter() || latestPyxdiaLetter();
	if (!latest) {
		return `
    <section class="pyxdia-output${options.embedded ? " pyxdia-output--embedded" : ""}">
      <div class="body-card-heading">
        <div>
          <h3>Letter Chain</h3>
          <p>No latest reply yet.</p>
        </div>
      </div>
      <div class="pyxdia-pending-card">
        <strong>No reply yet</strong>
        <span>Write a letter to start the first chain.</span>
      </div>
    </section>
  `;
	}
	const familyLetter = normalizePyxdiaRecipientType(latest.recipientType) === "family";
	const pending = !familyLetter && latest.state !== "completed";
	const templateReply = !pending && isTemplatePyxdiaReply(latest);
	const actions = `
    <div class="action-row">
      ${
				latest.state === "failed"
					? `<button class="secondary-button" data-action="pyxdia-retry-letter" data-id="${escapeHtml(latest.id)}" type="button">${buttonContent("tabler:refresh", "Retry")}</button>`
					: ""
			}
      ${
				templateReply
					? `<button class="secondary-button" data-action="pyxdia-retry-letter" data-id="${escapeHtml(latest.id)}" type="button">${buttonContent("tabler:refresh", "Regenerate Reply")}</button>`
					: ""
			}
      <button class="secondary-button danger-button" data-action="pyxdia-delete-letter" data-id="${escapeHtml(latest.id)}" type="button">${buttonContent("tabler:trash", "Move to Trash")}</button>
    </div>
  `;
	return `
    <section class="pyxdia-output${options.embedded ? " pyxdia-output--embedded" : ""}">
      <div class="body-card-heading">
        <div>
          <h3>${escapeHtml(familyLetter ? "Latest Letter" : pending ? "Reply Pending" : "Latest Reply")}</h3>
          <p>${escapeHtml([pyxdiaLetterRoute(latest), pyxdiaStatusText(latest)].filter(Boolean).join(" / "))}</p>
        </div>
        ${actions}
      </div>
      ${
				pending
					? `<div class="pyxdia-pending-card">
            <strong>${escapeHtml(latest.state)}</strong>
            <span>${escapeHtml(latest.availableAt ? `Available after ${new Date(latest.availableAt).toLocaleString()}` : "Waiting for processing.")}</span>
          </div>`
					: `<article class="pyxdia-output-text">${familyLetter ? renderPyxdiaLetterMarkdown(latest.inputText, latest.imageRefs) : escapeHtml(latest.outputText)}</article>`
			}
    </section>
  `;
}

function pyxdiaThreadHtml() {
	const thread = selectedPyxdiaThread();
	const letters = selectedPyxdiaThreadLetters();
	const readOnly = isShareableSpace(activeSpaceId()) && state.cloud?.spaceRole === "reader";
	if (!thread) {
		return emptyStateHtml(
			"No Pen Pal conversations yet",
			"Draft and send a letter to start one.",
		);
	}
	return `
    <section class="pyxdia-thread">
      <div class="body-card-heading">
        <div>
          <h3>${escapeHtml(thread.title)}</h3>
          <p>${escapeHtml(`${letters.length} letter${letters.length === 1 ? "" : "s"} / ${thread.latestState}`)}</p>
        </div>
						<div class="action-row">
          <button class="secondary-button" data-action="pyxdia-reply-thread" data-id="${escapeHtml(thread.id)}" type="button"${readOnly ? " disabled" : ""}>${buttonContent("tabler:message-reply", "Reply")}</button>
        </div>
      </div>
      <div class="pyxdia-thread-list">
        ${letters
					.map(
						(letter) => `
          <article class="pyxdia-thread-letter">
            <header>
              <strong>${escapeHtml(formatActivityTimestamp(letter.submittedAt || letter.createdAt))}</strong>
              <span>${escapeHtml(pyxdiaLetterRoute(letter))}</span>
              <span>${escapeHtml(pyxdiaStatusText(letter))}</span>
              ${
								normalizePyxdiaRecipientType(letter.recipientType) !== "family" &&
								isTemplatePyxdiaReply(letter)
									? `<button class="secondary-button" data-action="pyxdia-retry-letter" data-id="${escapeHtml(letter.id)}" type="button"${readOnly ? " disabled" : ""}>${buttonContent("tabler:refresh", "Regenerate Reply")}</button>`
									: ""
							}
              <button class="secondary-button danger-button" data-action="pyxdia-delete-letter" data-id="${escapeHtml(letter.id)}" type="button"${readOnly ? " disabled" : ""}>${buttonContent("tabler:trash", "Move to Trash")}</button>
            </header>
            <div class="pyxdia-thread-input markdown-body">${renderPyxdiaLetterMarkdown(letter.inputText, letter.imageRefs)}</div>
            ${
							letter.outputText
								? `<div class="pyxdia-thread-output">${escapeHtml(letter.outputText)}</div>`
								: ""
						}
          </article>
        `,
					)
					.join("")}
      </div>
    </section>
  `;
}

function trashHtml() {
	const settings = normalizeTrashSettings(state.trashSettings);
	const signedIn = isTrashSignedIn();
	return panelHtml(`
		${headerHtml(
			"Trash",
			"Cloud-only deleted items before restore or permanent removal.",
			`<button class="secondary-button" data-action="trash-refresh" type="button"${state.trashBusy || !signedIn ? " disabled" : ""}>${buttonContent("tabler:refresh", "Refresh")}</button>`,
		)}
    <div class="trash-page">
      <section class="interface-settings-section trash-settings-panel">
        <div class="body-card-heading">
          <div>
            <h3>Retention</h3>
            <p>${escapeHtml(settings.trashRetentionDays === 0 ? "Trash is disabled. Deletes are permanent immediately." : `Deleted items auto-delete after ${settings.trashRetentionDays} day${settings.trashRetentionDays === 1 ? "" : "s"}.`)}</p>
          </div>
        </div>
        <div class="body-form-grid trash-retention-grid">
          <label class="body-field">Trash retention days
            <input id="trash-retention-days" type="number" min="0" max="365" step="1" value="${escapeHtml(settings.trashRetentionDays)}"${signedIn ? "" : " disabled"}>
          </label>
          <button class="secondary-button" data-action="trash-save-settings" type="button"${state.trashBusy || !signedIn ? " disabled" : ""}>${buttonContent("tabler:device-floppy", "Save")}</button>
        </div>
      </section>
      ${trashStatusHtml(signedIn)}
      ${signedIn ? trashItemsHtml() : trashSignedOutHtml()}
    </div>
  `);
}

function trashStatusHtml(signedIn) {
	if (!signedIn) {
		return "";
	}
	if (!state.trashStatus && !state.trashError) {
		return "";
	}
	return `
    <div class="pyxdia-status-strip${state.trashError ? " has-error" : ""}" role="status">
      ${state.trashStatus ? `<p>${escapeHtml(state.trashStatus)}</p>` : ""}
      ${state.trashError ? `<p class="pyxdia-error">${escapeHtml(state.trashError)}</p>` : ""}
    </div>
  `;
}

function trashSignedOutHtml() {
	return emptyStateHtml(
		"Sign in to use Trash",
		"Trash is a user-scoped Cloud lifecycle feature.",
	);
}

function trashItemsHtml() {
	const items = Array.isArray(state.trashItems) ? state.trashItems : [];
	if (!items.length) {
		return emptyStateHtml(
			"Trash is empty",
			"Deleted items appear here from the current Cloud Trash index.",
		);
	}
	return `
    <section class="trash-list" aria-label="Trash items">
      ${items.map((item) => trashItemHtml(item)).join("")}
    </section>
  `;
}

function trashItemHtml(item) {
	const deleted = item.deletedAt
		? formatActivityTimestamp(item.deletedAt)
		: "Unknown";
	const deleteAfter = item.deleteAfter
		? formatActivityTimestamp(item.deleteAfter)
		: "Not scheduled";
	return `
    <article class="trash-item">
      <div>
        <span class="trash-item-type">${escapeHtml(item.itemType.replace(/_/g, " "))}</span>
        <h3>${escapeHtml(item.title || "Untitled item")}</h3>
        ${item.snippet ? `<p>${escapeHtml(item.snippet)}</p>` : ""}
        <small>Deleted ${escapeHtml(deleted)} / Auto-deletes ${escapeHtml(deleteAfter)}</small>
      </div>
      <div class="trash-item-actions">
        <button class="secondary-button" data-action="trash-restore-item" data-id="${escapeHtml(item.trashItemId)}" type="button"${state.trashBusy || !item.canRestore ? " disabled" : ""}>${buttonContent("tabler:restore", "Restore")}</button>
        <button class="secondary-button danger-button" data-action="trash-hard-delete-item" data-id="${escapeHtml(item.trashItemId)}" type="button"${state.trashBusy ? " disabled" : ""}>${buttonContent("tabler:trash-x", "Delete permanently")}</button>
      </div>
    </article>
  `;
}

function settingsHtml() {
	const tab = activeSettingsTab();
	return panelHtml(`
    ${headerHtml("Settings", "Getting started, Thoughts, Goals, Interface, Pen Pal, and data controls.")}
    <div class="settings-page">
      ${settingsTabsHtml(tab)}
      ${settingsPanelHtml(tab)}
    </div>
  `);
}

function activeSettingsTab() {
	const requestedTab =
		state.settingsTab === "dashboard" ? "interface" : state.settingsTab;
	return [
		"getting-started",
		"thoughts",
		"goals",
		"interface",
		"pyxdia",
		"cloud",
	].includes(requestedTab)
		? requestedTab
		: "getting-started";
}

function settingsPanelHtml(tab = activeSettingsTab()) {
	const panels = {
		"getting-started": settingsGettingStartedHtml,
		thoughts: settingsThoughtsHtml,
		goals: settingsGoalsHtml,
		interface: settingsInterfaceHtml,
		pyxdia: settingsPyxdiaHtml,
		cloud: settingsCloudHtml,
	};
	const renderPanel = panels[tab] || panels["getting-started"];
	return renderPanel();
}

function settingsTabsHtml(activeTab) {
	const tabs = [
		["getting-started", "Getting Started", "tabler:sparkles"],
		["thoughts", "Thoughts", "tabler:message-circle"],
		["goals", "Goals", "tabler:target-arrow"],
		["interface", "Interface", "tabler:layout-dashboard"],
		["pyxdia", "Pen Pal", "tabler:sparkles"],
		["cloud", "Data Controls", "tabler:database-cog"],
	];
	return `
    <nav class="settings-tabs page-tool-switcher" aria-label="Settings tabs">
      ${tabs
				.map(
					([tab, label, icon]) => `
        <button class="body-mode-button${activeTab === tab ? " is-active" : ""}" data-action="set-settings-tab" data-tab="${tab}" type="button" aria-pressed="${activeTab === tab ? "true" : "false"}"${activeTab === tab ? ' aria-current="page"' : ""}>
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `,
				)
				.join("")}
    </nav>
  `;
}

function gettingStartedGuide(spaceId = activeSpaceId()) {
	return (
		GETTING_STARTED_SPACE_GUIDES[spaceId] ||
		GETTING_STARTED_SPACE_GUIDES[PERSONAL_SPACE_ID]
	);
}

function gettingStartedDefaultActionHtml(spaceId = activeSpaceId()) {
	const guide = gettingStartedGuide(spaceId);
	if (spaceId === PERSONAL_SPACE_ID) {
		return `<button class="primary-button" data-action="factory-defaults" type="button">${buttonContent(guide.icon, guide.actionLabel)}</button>`;
	}
	const config = SPACE_DEFAULTS[spaceId] || {};
	return `
    <div class="action-row body-actions">
      <button class="primary-button" data-action="restore-space-defaults" data-space="${escapeHtml(spaceId)}" type="button">${buttonContent(guide.icon, guide.actionLabel)}</button>
      <button class="secondary-button" data-action="create-empty-space" data-space="${escapeHtml(spaceId)}" type="button">${buttonContent(config.icon || guide.icon, config.emptyLabel || `Create empty ${DATA_SPACES[spaceId]?.label || "space"} space`)}</button>
    </div>
  `;
}

function gettingStartedSpaceGuideHtml(spaceId = activeSpaceId()) {
	const guide = gettingStartedGuide(spaceId);
	return `
    <section class="getting-started-defaults getting-started-space-guide">
      <div class="getting-started-defaults-main">
        <span class="getting-started-defaults-icon" aria-hidden="true">${iconHtml(guide.icon)}</span>
        <div>
          <h3>${escapeHtml(guide.title)}</h3>
          <p>${escapeHtml(guide.defaults)}</p>
        </div>
      </div>
      ${gettingStartedDefaultActionHtml(spaceId)}
    </section>
  `;
}

function settingsGettingStartedHtml() {
	const guide = gettingStartedGuide();
	return `
    <div class="settings-tab-panel getting-started-page">
      <section class="getting-started-intro">
        <h3>${escapeHtml(activeSpaceLabel())} space</h3>
        <p>${escapeHtml(guide.description)}</p>
      </section>
      <section class="getting-started-defaults getting-started-navigation">
        <div class="getting-started-defaults-main">
          <span class="getting-started-defaults-icon" aria-hidden="true">${iconHtml("tabler:route")}</span>
          <div>
            <h3>User Interface (UI) Walkthrough</h3>
            <p>Start a guided walkthrough when you want it. Use Back, Next, and Skip to move through the guide.</p>
          </div>
        </div>
        <button class="primary-button" data-action="start-navigation-tour" type="button">${buttonContent("tabler:route", "UI Walkthrough")}</button>
      </section>
      <div class="getting-started-grid">
        <article>
          <span>${dashboardInlineLabelHtml("Mind")}</span>
          <h3>${escapeHtml(dashboardDisplayLabel("Mind"))}</h3>
          <p>${escapeHtml(guide.areas.Mind)}</p>
        </article>
        <article>
          <span>${dashboardInlineLabelHtml("Body")}</span>
          <h3>${escapeHtml(dashboardDisplayLabel("Body"))}</h3>
          <p>${escapeHtml(guide.areas.Body)}</p>
        </article>
        <article>
          <span>${dashboardInlineLabelHtml("Spirit")}</span>
          <h3>${escapeHtml(dashboardDisplayLabel("Spirit"))}</h3>
          <p>${escapeHtml(guide.areas.Spirit)}</p>
        </article>
        <article>
          <span>${dashboardInlineLabelHtml("Life")}</span>
          <h3>${escapeHtml(dashboardDisplayLabel("Life"))}</h3>
          <p>${escapeHtml(guide.areas.Life)}</p>
        </article>
      </div>
      <section class="getting-started-rhythm">
        <h3>A simple rhythm</h3>
        <div>
          ${guide.rhythm
						.map(
							([label, text]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(text)}</p>`,
						)
						.join("")}
        </div>
      </section>
      ${gettingStartedSpaceGuideHtml(activeSpaceId())}
    </div>
  `;
}

function settingsThoughtsHtml() {
	return `
    <div class="settings-tab-panel thoughts-settings">
      <section class="thoughts-settings-intro">
        <div>
          <h3>Thought Orbs</h3>
          <p>Click an orb in ${escapeHtml(dashboardDisplayNameList())} to open a new thought note for that exact thought type.</p>
        </div>
      </section>
      <div class="thoughts-settings-sections">
        ${DASHBOARD_LABELS.map(
					(dashboard) => `
          <section class="thoughts-settings-section" style="--thought-color: ${dashboardColor(dashboard)};">
            <div class="body-card-heading">
              <div>
                <h3>${escapeHtml(dashboardDisplayLabel(dashboard))}</h3>
                <p>${escapeHtml((state.trackerSettings?.[dashboard] || []).length)} thought orb${(state.trackerSettings?.[dashboard] || []).length === 1 ? "" : "s"}</p>
              </div>
            </div>
            ${trackerStripHtml(dashboard, { editable: true, compact: true })}
            ${trackerEditFormHtml(dashboard, "thought")}
            ${trackerAddFormHtml(dashboard, "thought")}
          </section>
        `,
				).join("")}
      </div>
    </div>
  `;
}

function settingsGoalsHtml() {
	return `
    <div class="settings-tab-panel thoughts-settings goals-settings">
      <section class="thoughts-settings-intro">
        <div>
          <h3>Goal Orbs</h3>
          <p>Enable or edit a goal orb in ${escapeHtml(dashboardDisplayNameList())} before it can log progress.</p>
        </div>
      </section>
      <div class="thoughts-settings-sections">
        ${DASHBOARD_LABELS.map((dashboard) => {
					const goals = state.goalSettings?.[dashboard] || [];
					const enabledGoals = goals.filter((goal) => goal?.enabled);
					const checks = goalProgressCount(dashboard);
					const orbLabel = goals.length === 1 ? "orb" : "orbs";
					return `
          <section class="thoughts-settings-section" style="--thought-color: ${dashboardColor(dashboard)};">
            <div class="body-card-heading">
              <div>
                <h3>${escapeHtml(dashboardDisplayLabel(dashboard))}</h3>
                <p>${escapeHtml(`${enabledGoals.length}`)} of ${escapeHtml(`${goals.length}`)} ${escapeHtml(`${orbLabel}`)} enabled / ${escapeHtml(checks)} check${checks === 1 ? "" : "s"}</p>
              </div>
            </div>
            ${trackerStripHtml(dashboard, { editable: true, compact: true, kind: "goal" })}
            ${trackerEditFormHtml(dashboard, "goal")}
            ${trackerAddFormHtml(dashboard, "goal")}
          </section>
        `;
				}).join("")}
      </div>
    </div>
  `;
}

function settingsInterfaceHtml() {
	const identity = normalizeDashboardIdentity(state.dashboardIdentity);
	const colorMode = normalizeColorMode(state.colorMode);
	return `
    <div class="settings-tab-panel interface-settings">
      ${spaceVisibilitySettingsHtml()}
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>Category Options</h3>
            <p>Customize each category title, number, icon, and card color.</p>
          </div>
        </div>
        <div class="dashboard-identity-toggles" data-dashboard-display-option-list>
          ${identity.displayOptionOrder
						.map((optionId) =>
							DASHBOARD_DISPLAY_OPTIONS.find((option) => option.id === optionId),
						)
						.filter(Boolean)
						.map((option) => dashboardDisplayOptionToggleHtml(option, identity))
						.join("")}
          <label class="dashboard-identity-toggle">
            <input id="dashboard-color-always-on" data-dashboard-display-option type="checkbox"${identity.colorAlwaysOn ? " checked" : ""}>
            <span>Color always on</span>
          </label>
        </div>
        <div class="dashboard-identity-grid">
          ${DASHBOARD_LABELS.map((dashboard) => {
						const item = identity.items[dashboard];
						const fieldId = `dashboard-identity-${dashboard}-icon`;
						const colorFieldId = `dashboard-identity-${dashboard}-color`;
						const color = dashboardColor(dashboard);
						return `
              <div class="dashboard-identity-card" style="--identity-color: ${color};">
                <div class="dashboard-identity-input-row">
                  ${iconPickerFieldHtml({
										fieldId,
										value: item.icon,
										title: `${item.label || dashboard} icon`,
										color,
										colorFieldId,
										colorValue: item.color,
										showLabel: false,
									})}
                  <input id="dashboard-identity-${dashboard}-label" type="text" value="${escapeHtml(item.label)}" placeholder="${escapeHtml(`Enter a title for the ${DEFAULT_DASHBOARD_IDENTITY.items[dashboard].label} category...`)}">
                  <button class="icon-button dashboard-identity-reset" data-action="reset-dashboard-identity-item" data-dashboard="${escapeHtml(dashboard)}" type="button" aria-label="Reset ${escapeHtml(item.label || dashboard)} to default" title="Reset">${iconHtml("tabler:restore")}</button>
                </div>
              </div>
            `;
					}).join("")}
        </div>
      </section>
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>Theme</h3>
            <p>Choose the surface, border, and type palette for the app.</p>
          </div>
        </div>
        <div class="theme-choice-grid" role="group" aria-label="Interface theme">
          ${APP_THEMES.map(
						(theme) => `
            <button class="theme-choice${state.theme === theme.id ? " is-active" : ""}" data-action="set-theme" data-theme="${escapeHtml(theme.id)}" type="button" aria-pressed="${state.theme === theme.id ? "true" : "false"}">
              <span class="theme-choice-preview theme-choice-preview--${escapeHtml(theme.id)}" style="${escapeHtml(themePreviewStyle(theme))}" aria-hidden="true">
                <i></i><i></i><i></i>
              </span>
              <strong>${escapeHtml(theme.label)}</strong>
              <small>${escapeHtml(theme.description)} Font: ${escapeHtml(themeFontLabel(theme))}.</small>
              ${themePaletteHtml(theme)}
            </button>
          `,
					).join("")}
        </div>
      </section>
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>Accessibility</h3>
            <p>Layer display modes over the selected theme without changing the theme catalog.</p>
          </div>
        </div>
        <div class="dashboard-identity-toggles color-mode-toggles" role="group" aria-label="Color mode">
          <button class="dashboard-identity-toggle${colorMode === "standard" ? " is-active" : ""}" data-action="set-color-mode" data-color-mode="standard" type="button" aria-pressed="${colorMode === "standard" ? "true" : "false"}">
            <span>Standard</span>
          </button>
          <button class="dashboard-identity-toggle${colorMode === "colorblind" ? " is-active" : ""}" data-action="set-color-mode" data-color-mode="colorblind" type="button" aria-pressed="${colorMode === "colorblind" ? "true" : "false"}">
            <span>Colorblind</span>
          </button>
        </div>
      </section>
    </div>
  `;
}

function settingsPyxdiaHtml() {
	const settings = normalizePyxdiaSettings(state.pyxdiaSettings);
	const memory = normalizePyxdiaMemory(state.pyxdiaMemory);
	const statsLevel = pyxdiaBalanceStatsLevel(settings);
	const aiBrain = state.pyxdiaAiBrain || {};
	const aiBrainStatus = aiBrain.configured
		? "AI Brain memory is configured on the server."
		: "AI Brain memory is not configured on the server yet.";
	const statsLabel =
		statsLevel === 0
			? "Off"
			: statsLevel === 25
				? "Light"
				: statsLevel === 50
					? "Standard"
					: "Full";
	const staticMemory = normalizePyxdiaStaticMemory(memory.staticMemory);
	const dynamicRetrievalMemory = normalizePyxdiaDynamicRetrievalMemory(
		memory.dynamicRetrievalMemory,
	);
	const memorySummary =
		staticMemory.summary ||
		memory.summary ||
		(staticMemory.entries?.length
			? staticMemory.entries.map((entry) => entry.text).join(" ")
			: "No Pen Pal memory has been saved yet.");
	return `
    <div class="settings-tab-panel pyxdia-settings">
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>Pen Pal</h3>
            <p>Letter exchange, delay, personality, and memory controls.</p>
          </div>
          <button class="secondary-button" data-action="pyxdia-refresh" type="button"${state.pyxdiaBusy ? " disabled" : ""}>${buttonContent("tabler:refresh", "Refresh")}</button>
        </div>
        <div class="pyxdia-settings-toggles">
          <label class="dashboard-identity-toggle">
            <input id="pyxdia-setting-enabled" type="checkbox"${settings.enabled ? " checked" : ""}>
            <span>Enable Pen Pal</span>
          </label>
          <label class="dashboard-identity-toggle">
            <input id="pyxdia-setting-delay" data-action="pyxdia-toggle-delay" type="checkbox"${settings.delayEnabled ? " checked" : ""}>
            <span>Delay replies</span>
          </label>
          <label class="dashboard-identity-toggle">
            <input id="pyxdia-setting-memory" type="checkbox"${settings.memoryEnabled ? " checked" : ""}>
            <span>Memory</span>
          </label>
          <label class="dashboard-identity-toggle">
            <input id="pyxdia-setting-ai-brain" type="checkbox"${settings.aiBrainMemoryEnabled ? " checked" : ""}>
            <span>AI Brain</span>
          </label>
        </div>
        <div class="body-form-grid pyxdia-delay-grid">
          <label class="body-field">Delay min hours<input id="pyxdia-delay-min" type="number" min="0" max="168" step="1" value="${escapeHtml(settings.delayMinHours)}"></label>
          <label class="body-field">Delay max hours<input id="pyxdia-delay-max" type="number" min="0" max="336" step="1" value="${escapeHtml(settings.delayMaxHours)}"></label>
          <label class="body-field body-field--full pyxdia-range-field">Balance statistics
            <input id="pyxdia-balance-stats-level" type="range" min="0" max="100" step="25" value="${escapeHtml(statsLevel)}">
            <small>${escapeHtml(statsLabel)} context. Sends counts and percentages only, never note bodies.</small>
          </label>
        </div>
        <label class="body-field body-field--full">Instructions / personality
          <textarea id="pyxdia-general-instructions" rows="4">${escapeHtml(settings.generalInstructions)}</textarea>
        </label>
        <label class="body-field body-field--full">What Pen Pal should know
          <textarea id="pyxdia-know" rows="4">${escapeHtml(settings.userWantsPyxdiaToKnow)}</textarea>
        </label>
        <div class="editor-footer-actions">
          <button class="secondary-button" data-action="pyxdia-save-settings" type="button"${state.pyxdiaBusy ? " disabled" : ""}>${buttonContent("tabler:device-floppy", "Save Settings")}</button>
          <button class="secondary-button danger-button" data-action="pyxdia-reset-memory" type="button"${state.pyxdiaBusy ? " disabled" : ""}>${buttonContent("tabler:restore", "Reset Memory")}</button>
        </div>
      </section>
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>AI Brain</h3>
            <p>Server-side read/write memory connection for approved Pen Pal context.</p>
          </div>
        </div>
        <article class="pyxdia-memory-card">
          <p>${escapeHtml(aiBrainStatus)}</p>
          <small>${escapeHtml(aiBrain.consumer ? `Consumer: ${aiBrain.consumer}` : "Writes stay draft-first when configured.")}</small>
        </article>
      </section>
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>Pen Pal Static Memory</h3>
            <p>Stable PII-safe profile. Full letters, notes, and chats are not copied here.</p>
          </div>
        </div>
        <article class="pyxdia-memory-card">
          <p>${escapeHtml(memorySummary)}</p>
          ${
						staticMemory.entries?.length
							? `<div class="pyxdia-memory-entry-list">
              ${staticMemory.entries
								.slice(-6)
								.reverse()
								.map(
									(entry) => `
                <div class="pyxdia-memory-entry">
                  <strong>${escapeHtml(entry.text || entry.summary)}</strong>
                  <small>${escapeHtml(entry.reasonRemembered || "Remembered from a completed letter.")}</small>
                </div>
              `,
								)
								.join("")}
            </div>`
							: ""
					}
        </article>
      </section>
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>Pen Pal Dynamic Retrieval</h3>
            <p>Recent automatic context used below user-selected context.</p>
          </div>
        </div>
        <article class="pyxdia-memory-card">
          ${
						dynamicRetrievalMemory.items.length
							? `<div class="pyxdia-memory-entry-list">
              ${dynamicRetrievalMemory.items
								.slice(0, 6)
								.map(
									(item) => `
                <div class="pyxdia-memory-entry">
                  <strong>${escapeHtml(item.summary)}</strong>
                  <small>${escapeHtml(item.reason)}</small>
                </div>
              `,
								)
								.join("")}
            </div>`
							: `<p>No dynamic retrieval has been used yet.</p>`
					}
        </article>
      </section>
    </div>
  `;
}

function settingsCloudHtml() {
	const account = state.cloud || getCloudAccountState();
	const entitlement = account.entitlement || {};
	const signedIn = account.mode === "signed-in" && account.user;
	const isCloud = Boolean(signedIn);
	const cloudActive = Boolean(
		signedIn &&
			!account.isLocalDemo &&
			(entitlement.cloud || entitlement.admin),
	);
	const username = signedIn
		? account.user.displayName || account.user.email || "Signed in"
		: "";
	const statusLabel = cloudStatusLabel(account);
	const canWriteSpace = cloudCanWriteActiveSpace(account);
	const canOwnSpace = cloudCanOwnActiveSpace(account);
	const writeDisabledAttr = !canWriteSpace || account.busy ? " disabled" : "";
	const clearSpaceDisabledAttr =
		account.busy || (signedIn && isCloud && !canOwnSpace) ? " disabled" : "";
	const localUpdatedAt = localAppUpdatedAt({ persistDerived: false });
	const localBytes = estimateJsonBytes({
		schemaVersion: SCHEMA_VERSION,
		rootId: state.artifactStore?.rootId || "ourstuff-root",
		artifacts: state.artifactStore?.artifacts || [],
		appState: {
			bodyTracker: state.bodyTracker,
			spiritProgress: state.spiritProgress,
			lifePlanner: state.lifePlanner,
			thoughtSettings: state.trackerSettings,
			goalSettings: state.goalSettings,
			dashboardIdentity: state.dashboardIdentity,
			dashboardChartTabs: state.dashboardChartTabs,
			theme: state.theme,
			colorMode: state.colorMode,
			timerState: state.timerState,
			timerSettings: state.timerSettings,
		},
	});
	const busyAttr = account.busy ? " disabled" : "";
	return `
    <div class="settings-tab-panel cloud-settings">
      <section class="interface-settings-section data-controls-section cloud-account-section">
        <div class="body-card-heading">
          <div>
            <h3>Data Controls</h3>
            <p>Manage local and Cloud data for the active ${escapeHtml(activeSpaceLabel())} space.</p>
          </div>
          ${activeSpacePillHtml()}
        </div>
        ${spacePinControlsHtml()}
        <div class="data-controls-group">
          <div class="body-card-heading">
            <div>
              <h4>Cloud</h4>
              <p>Local use is free. Sign in to sync the ${escapeHtml(activeSpaceLabel())} space across your devices.</p>
            </div>
            <div class="cloud-heading-controls">
              <span class="cloud-status-pill${isCloud ? " is-active" : ""}" data-cloud-status-pill>${escapeHtml(statusLabel)}</span>
            </div>
          </div>
          <nav class="cloud-action-nav" aria-label="Cloud sync actions">
            ${
							signedIn && isCloud
								? `
            <button class="primary-button" data-action="cloud-sync-now" type="button"${writeDisabledAttr}>${buttonContent("tabler:cloud-up", "Sync now")}</button>
            <button class="secondary-button" data-action="cloud-load" type="button"${busyAttr}>${buttonContent("tabler:cloud-down", "Load cloud")}</button>
            <button class="secondary-button" data-action="cloud-sign-out" type="button"${busyAttr}>${buttonContent("tabler:logout", "Sign out")}</button>
            `
								: ""
						}
            <button class="secondary-button" data-action="import-artifacts" type="button"${signedIn && !canWriteSpace ? " disabled" : ""}>${buttonContent("tabler:file-import", "Import")}</button>
            <button class="secondary-button" data-action="export-artifacts" type="button">${buttonContent("tabler:file-export", "Export")}</button>
          </nav>
          ${
						signedIn
							? `
            <div class="cloud-account-card">
              <span class="cloud-account-avatar">${iconHtml(account.isLocalDemo ? "tabler:cloud-check" : "tabler:user-circle")}</span>
              <div>
                <strong>Signed in as ${escapeHtml(username)}</strong>
                <small>${escapeHtml(account.isLocalDemo ? "Local subscribed demo" : account.user.email || "Cloud account")}</small>
              </div>
            </div>
            ${cloudStorageUsageHtml(state.cloudStorageUsage)}
            <div class="cloud-sync-grid">
              <span><strong>${escapeHtml(formatStorageGb(localBytes))}</strong><small>Current app JSON estimate</small></span>
              <span data-cloud-local-updated><strong>${escapeHtml(localUpdatedAt ? new Date(localUpdatedAt).toLocaleString() : "No local changes")}</strong><small>${escapeHtml(activeSpaceLabel())} local change</small></span>
              <span data-cloud-last-sync><strong>${escapeHtml(account.lastCloudSyncAt ? new Date(account.lastCloudSyncAt).toLocaleString() : "Not synced")}</strong><small>${escapeHtml(activeSpaceLabel())} sync from this device</small></span>
              <span data-cloud-auto-sync><strong>${escapeHtml(isCloud ? `Every ${cloudSyncIntervalLabel()}` : "Off")}</strong><small>Artifacts + encrypted media</small></span>
              ${
								isShareableSpace(activeSpaceId())
									? `<span><strong>${escapeHtml(account.spaceRole || "owner")}</strong><small>${escapeHtml(activeSpaceLabel())} role</small></span>`
									: ""
							}
            </div>
            ${
							account.billingCapable
								? `
            <div class="action-row cloud-actions">
              <button class="secondary-button" data-action="cloud-billing" type="button"${busyAttr}>${buttonContent("tabler:receipt", "Manage Billing")}</button>
            </div>
            `
								: ""
						}
          `
							: `
            <div class="action-row cloud-actions">
              <button class="primary-button" data-action="cloud-sign-in" type="button"${busyAttr}>${buttonContent("tabler:login-2", "Sign in")}</button>
              <button class="secondary-button" data-action="cloud-google-sign-in" type="button"${busyAttr}>${buttonContent("tabler:brand-google", "Google")}</button>
            </div>
            <div class="cloud-email-form" aria-label="Email sign in">
              <label class="body-field">Email<input id="cloud-email" type="email" autocomplete="email" placeholder="you@example.com"></label>
              <label class="body-field">Password<input id="cloud-password" type="password" autocomplete="current-password" placeholder="Password"></label>
              <div class="action-row cloud-actions">
                <button class="secondary-button" data-action="cloud-email-sign-in" type="button"${busyAttr}>${buttonContent("tabler:mail", "Email sign in")}</button>
                <button class="secondary-button" data-action="cloud-email-create" type="button"${busyAttr}>${buttonContent("tabler:user-plus", "Create account")}</button>
              </div>
            </div>
          `
					}
          ${
						signedIn && isCloud
							? `
            <div class="cloud-danger-links" aria-label="Destructive cloud actions">
              <button class="cloud-danger-link" data-action="cloud-delete-account" type="button"${busyAttr}>Delete cloud account</button>
            </div>
          `
							: ""
					}
          <div data-cloud-status-region>${cloudStatusRegionHtml(account)}</div>
        </div>
        ${obsidianSyncSettingsHtml(account, cloudActive, busyAttr)}
        ${familySharingSettingsHtml(account, busyAttr)}
        <div class="data-controls-group">
          <div class="body-card-heading">
            <div>
              <h4>Clear Space</h4>
              <p>Clear the ${escapeHtml(activeSpaceLabel())} space from this browser. If Cloud sync is active, this also deletes that space from Cloud first so it cannot sync back.</p>
            </div>
            <div class="action-row data-controls-actions">
              <button class="secondary-button danger-button" data-action="clear-app-data" type="button"${clearSpaceDisabledAttr}>${buttonContent("tabler:database-x", `Clear ${activeSpaceLabel()} Space`)}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function obsidianSyncSettingsHtml(account, cloudActive, busyAttr) {
	if (activeSpaceId() !== PERSONAL_SPACE_ID) {
		return "";
	}
	if (account.mode !== "signed-in" || !account.user) {
		return "";
	}
	const key = account.obsidianKey || null;
	const copyAvailable = Boolean(account.obsidianKeyCopyAvailable);
	const createdLabel = key?.createdAt
		? new Date(key.createdAt).toLocaleString()
		: "Not created";
	const lastUsedLabel = key?.lastUsedAt
		? new Date(key.lastUsedAt).toLocaleString()
		: "Never";
	return `
      <div class="data-controls-group obsidian-sync-section">
        <div class="body-card-heading">
          <div>
            <h4>Obsidian Sync</h4>
            <p>Sync Mind compendiums into your vault as folders and section markdown files.</p>
          </div>
          <div class="action-row data-controls-actions">
            <button class="${key ? "secondary-button" : "primary-button"}" data-action="${key ? "obsidian-refresh-key" : "obsidian-create-key"}" type="button"${cloudActive ? busyAttr : " disabled"}>
              ${buttonContent(key ? "tabler:refresh" : "tabler:key", key ? "Refresh API Key" : "Create API Key")}
            </button>
            ${
							copyAvailable
								? `<button class="secondary-button" data-action="obsidian-copy-key" type="button"${busyAttr}>${buttonContent("tabler:copy", "Copy Key")}</button>`
								: ""
						}
            ${
							key
								? `<button class="secondary-button danger-button" data-action="obsidian-delete-key" type="button" aria-label="Delete Obsidian sync key"${busyAttr}>${buttonContent("tabler:trash", "Delete")}</button>`
								: ""
						}
          </div>
        </div>
        ${
					key
						? `
          <div class="cloud-sync-grid">
            <span><strong>${escapeHtml(key.prefix || "Active")}</strong><small>Key prefix</small></span>
            <span><strong>${escapeHtml(createdLabel)}</strong><small>Created</small></span>
            <span><strong>${escapeHtml(lastUsedLabel)}</strong><small>Last used</small></span>
            <span><strong>${escapeHtml((key.scopes || []).join(", ") || "Compendiums")}</strong><small>Scope</small></span>
          </div>
        `
						: `<p class="cloud-status-message">${escapeHtml(cloudActive ? "No Obsidian sync key exists yet." : "A Cloud subscription is required before creating an Obsidian sync key.")}</p>`
				}
      </div>
  `;
}

function familySharingSettingsHtml(account, busyAttr) {
	const activeShareable = isShareableSpace(activeSpaceId());
	const receivedInvites = Array.isArray(account.familyInvites)
		? account.familyInvites
		: [];
	if (!activeShareable && !receivedInvites.length) {
		return "";
	}
	const signedIn = account.mode === "signed-in" && account.user;
	if (!signedIn) {
		return `
      <div class="data-controls-group">
        <div class="body-card-heading">
          <div>
            <h4>${escapeHtml(activeSpaceLabel())} Sharing</h4>
            <p>Sign in to invite existing Cloud accounts into this shared space.</p>
          </div>
        </div>
      </div>
    `;
	}
	const role = account.spaceRole || "owner";
	const owner = role === "owner";
	const members = Array.isArray(account.sharedSpace?.members)
		? account.sharedSpace.members
		: [];
	const sentInvites = Array.isArray(account.sharedSpace?.invites)
		? account.sharedSpace.invites
		: [];
	const activeReceivedInvites = activeShareable
		? receivedInvites.filter((invite) => {
				const inviteSpaceId = localSpaceIdFromInvite(invite);
				return !inviteSpaceId || inviteSpaceId === activeSpaceId();
			})
		: receivedInvites;
	const sharingTitle = activeShareable
		? `${activeSpaceLabel()} Sharing`
		: "Shared Space Invites";
	return `
      <div class="data-controls-group">
        <div class="body-card-heading">
          <div>
            <h4>${escapeHtml(sharingTitle)}</h4>
            <p>${escapeHtml(activeShareable ? (owner ? "Send email invites as editor or reader. Access starts only after acceptance." : `You are a ${role}. Readers can view and export; editors can edit and sync.`) : "Accept or decline pending invites for shared spaces.")}</p>
          </div>
          ${activeShareable ? `<span class="cloud-status-pill is-active">${escapeHtml(role)}</span>` : ""}
        </div>
        ${
					activeReceivedInvites.length
						? `
          <p class="cloud-status-message">Pending invites for your signed-in email</p>
          <div class="cloud-sync-grid">
            ${activeReceivedInvites.map((invite) => familyReceivedInviteRowHtml(invite, busyAttr)).join("")}
          </div>
        `
						: ""
				}
        ${
					activeShareable && owner
						? `
          <div class="cloud-email-form" aria-label="${escapeHtml(activeSpaceLabel())} member invite">
            <label class="body-field">Invite email<input id="family-member-email" type="email" autocomplete="off" placeholder="person@example.com"></label>
            <label class="body-field">Role
              <select id="family-member-role">
                <option value="editor">Editor</option>
                <option value="reader">Reader</option>
              </select>
            </label>
            <div class="action-row cloud-actions">
              <button class="primary-button" data-action="family-member-add" type="button"${busyAttr}>${buttonContent("tabler:send", "Send invite")}</button>
            </div>
          </div>
        `
						: activeShareable
							? `
          <div class="action-row cloud-actions">
            <button class="secondary-button danger-button" data-action="family-leave" type="button"${busyAttr}>${buttonContent("tabler:logout-2", `Leave ${activeSpaceLabel()}`)}</button>
          </div>
        `
							: ""
				}
        ${
					activeShareable && owner
						? `
          <p class="cloud-status-message">Pending invites</p>
          <div class="cloud-sync-grid">
            ${sentInvites.length ? sentInvites.map((invite) => familySentInviteRowHtml(invite)).join("") : `<span><strong>No pending invites</strong><small>Send an invite when someone should join this ${escapeHtml(activeSpaceLabel())} space.</small></span>`}
          </div>
        `
						: ""
				}
        ${
					activeShareable
						? `
        <p class="cloud-status-message">Accepted members</p>
        <div class="cloud-sync-grid">
          ${members.length ? members.map((member) => familyMemberRowHtml(member, owner, busyAttr)).join("") : `<span><strong>No accepted members</strong><small>${owner ? `Only you can access this ${escapeHtml(activeSpaceLabel())} space.` : "No other accepted members are listed."}</small></span>`}
        </div>
        `
						: ""
				}
      </div>
  `;
}

function familyReceivedInviteRowHtml(invite, busyAttr) {
	const inviteId = String(invite.inviteId || "");
	const label = invite.invitedByDisplay || "Space owner";
	const role = invite.role === "editor" ? "editor" : "reader";
	const spaceLabel =
		invite.spaceLabel ||
		DATA_SPACES[localSpaceIdFromInvite(invite)]?.label ||
		"Shared space";
	return `
    <span>
      <strong>${escapeHtml(spaceLabel)}</strong>
      <small>
        ${escapeHtml(label)} invited you as ${escapeHtml(role)}
        <button class="cloud-danger-link" data-action="family-invite-accept" data-invite-id="${escapeHtml(inviteId)}" type="button"${busyAttr}>Accept</button>
        <button class="cloud-danger-link" data-action="family-invite-decline" data-invite-id="${escapeHtml(inviteId)}" type="button"${busyAttr}>Decline</button>
      </small>
    </span>
  `;
}

function familySentInviteRowHtml(invite) {
	const role = invite.role === "editor" ? "editor" : "reader";
	const created = invite.createdAt ? new Date(invite.createdAt).toLocaleString() : "Pending";
	return `
    <span>
      <strong>${escapeHtml(invite.email || "Pending invite")}</strong>
      <small>${escapeHtml(role)} invite sent ${escapeHtml(created)}</small>
    </span>
  `;
}

function familyMemberRowHtml(member, owner, busyAttr) {
	const uid = String(member.uid || "");
	const label = member.displayName || member.email || uid || "Family member";
	const role = member.role === "editor" ? "editor" : "reader";
	return `
    <span>
      <strong>${escapeHtml(label)}</strong>
      <small>
        ${escapeHtml(role)}
        ${
					owner && uid
						? `
          <button class="cloud-danger-link" data-action="family-member-role" data-uid="${escapeHtml(uid)}" data-role="${role === "editor" ? "reader" : "editor"}" type="button"${busyAttr}>Make ${role === "editor" ? "reader" : "editor"}</button>
          <button class="cloud-danger-link" data-action="family-member-remove" data-uid="${escapeHtml(uid)}" type="button"${busyAttr}>Remove</button>
        `
						: ""
				}
      </small>
    </span>
  `;
}

function trackerAddFormHtml(area, kind = "thought") {
	const normalizedKind = trackerKind(kind);
	const config = trackerKindConfig(normalizedKind);
	if (!isTrackerAddOpen(area, normalizedKind)) {
		return "";
	}
	const fieldId = trackerFieldId(area, "icon");
	const labelFieldId = trackerFieldId(area, "label");
	return `
    <div class="tracker-add-form" data-tracker-add-form data-area="${escapeHtml(area)}" data-kind="${normalizedKind}">
      <div class="tracker-title-icon-row" style="--identity-color: ${dashboardColor(area)};">
        ${iconPickerFieldHtml({
					fieldId,
					value: "tabler:circle",
					title: `${dashboardDisplayLabel(area)} ${config.noun} icon`,
					color: dashboardColor(area),
					showLabel: false,
				})}
        <input class="tracker-title-input" id="${labelFieldId}" data-area="${escapeHtml(area)}" data-target="add" type="text" placeholder="${escapeHtml(`${config.proper} name`)}" aria-label="${escapeHtml(`${config.proper} name`)}">
      </div>
      <div class="action-row body-actions">
        <button class="secondary-button" data-action="cancel-add-tracker" type="button">${buttonContent("tabler:x", "Cancel")}</button>
        <button class="primary-button" data-action="save-tracker" data-kind="${normalizedKind}" data-area="${escapeHtml(area)}" type="button">${buttonContent("tabler:plus", config.addLabel)}</button>
      </div>
    </div>
  `;
}

function trackerEditFormHtml(area, kind = "thought") {
	const normalizedKind = trackerKind(kind);
	const parsedKey = parseTrackerEditKey(state.trackerEditKey);
	if (
		parsedKey.kind !== normalizedKind ||
		parsedKey.area !== area ||
		!parsedKey.id
	) {
		return "";
	}
	const id = parsedKey.id;
	const tracker = (trackerSettingsForKind(normalizedKind)?.[area] || []).find(
		(item) => item.id === id,
	);
	if (!tracker) {
		return "";
	}
	const target = `edit-${id}`;
	const confirmDelete =
		state.trackerDeleteKey === trackerEditKey(area, id, normalizedKind);
	const fieldId = trackerFieldId(`${area}-${id}`, "icon");
	const enableFieldId = trackerFieldId(`${area}-${id}`, "enabled");
	const isGoal = normalizedKind === "goal";
	const transferLabel = isGoal ? "Move to Thoughts" : "Move to Goals";
	const frequencyFieldId = trackerFieldId(`${area}-${id}`, "frequency");
	const customDaysFieldId = trackerFieldId(`${area}-${id}`, "custom-days");
	const goalFrequency = normalizeGoalFrequency(tracker);
	return `
    <div class="tracker-edit-form" data-tracker-edit-form data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" data-kind="${normalizedKind}">
      <div class="tracker-edit-heading">
        <strong>Edit ${escapeHtml(tracker.label)}</strong>
        <div class="tracker-edit-heading-actions">
          <button class="icon-button" data-action="transfer-tracker-kind" data-kind="${normalizedKind}" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button" aria-label="${escapeHtml(transferLabel)}" title="${escapeHtml(transferLabel)}">${iconHtml("tabler:transfer")}</button>
          ${
						confirmDelete
							? `<button class="icon-button" data-action="cancel-remove-tracker" type="button" aria-label="Keep ${escapeHtml(tracker.label)}" title="Keep">${iconHtml("tabler:arrow-back-up")}</button><button class="icon-button danger-button" data-action="remove-tracker" data-kind="${normalizedKind}" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button" aria-label="Confirm delete ${escapeHtml(tracker.label)}" title="Confirm Delete">${iconHtml("tabler:trash")}</button>`
							: `<button class="icon-button danger-button" data-action="request-remove-tracker" data-kind="${normalizedKind}" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button" aria-label="Delete ${escapeHtml(tracker.label)}" title="Delete">${iconHtml("tabler:trash")}</button>`
					}
          <button class="icon-button" data-action="cancel-edit-tracker" type="button" aria-label="Close ${escapeHtml(trackerKindConfig(normalizedKind).noun)} editor" title="Close">${iconHtml("tabler:x")}</button>
        </div>
      </div>
      <div class="tracker-add-form tracker-add-form--embedded">
        <div class="tracker-title-icon-row" style="--identity-color: ${dashboardColor(area)};">
          ${iconPickerFieldHtml({
						fieldId,
						value: tracker.icon,
						title: `${tracker.label} icon`,
						color: dashboardColor(area),
						showLabel: false,
					})}
          <input class="tracker-title-input" id="${trackerFieldId(`${area}-${id}`, "label")}" data-area="${escapeHtml(area)}" data-target="${escapeHtml(target)}" type="text" value="${escapeHtml(tracker.label)}" aria-label="Button text">
          ${
						isGoal
							? `
            <label class="body-field tracker-enabled-toggle tracker-enabled-toggle--inline">
              <input id="${escapeHtml(enableFieldId)}" type="checkbox"${tracker.enabled ? " checked" : ""}>
              <i aria-hidden="true"></i>
              <span>Enabled</span>
            </label>`
							: ""
					}
        </div>
        ${
					isGoal
						? `
          <div class="goal-frequency-editor">
            <label class="body-field">Frequency
              <select class="tracker-frequency-input" id="${escapeHtml(frequencyFieldId)}">
                ${goalFrequencyOptionsHtml(tracker)}
              </select>
            </label>
            <label class="body-field goal-frequency-custom">Custom span
              <span class="goal-frequency-slider-row">
                <input class="tracker-frequency-input goal-frequency-range" id="${escapeHtml(customDaysFieldId)}" type="range" min="1" max="365" step="1" value="${escapeHtml(goalFrequency.customDays)}"${goalFrequency.frequency === "custom" ? "" : " disabled"}>
                <output for="${escapeHtml(customDaysFieldId)}">${escapeHtml(`${goalFrequency.customDays} day${goalFrequency.customDays === 1 ? "" : "s"}`)}</output>
              </span>
            </label>
          </div>
        `
						: ""
				}
        <div class="action-row body-actions tracker-edit-actions">
          <button class="secondary-button" data-action="cancel-edit-tracker" type="button">${buttonContent("tabler:x", "Cancel")}</button>
          <button class="primary-button" data-action="save-edit-tracker" data-kind="${normalizedKind}" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button">${buttonContent("tabler:device-floppy", "Save")}</button>
        </div>
      </div>
    </div>
  `;
}

function _settingsComingSoonHtml(label) {
	return `
    <div class="settings-tab-panel">
      ${emptyStateHtml("Coming Soon", `${label} settings will live here.`)}
    </div>
  `;
}

function activeSpaceId() {
	return getActiveSpaceId();
}

function activeSpaceLabel() {
	return getActiveSpaceLabel();
}

function normalizeDataSpaceId(value) {
	refreshDataSpaces();
	const id = String(value || "");
	return DATA_SPACES[id] ? id : PERSONAL_SPACE_ID;
}

function normalizeEnabledSpaceIds(value) {
	const enabled = new Set(
		(Array.isArray(value) ? value : [])
			.map(normalizeDataSpaceId)
			.filter((id) => DATA_SPACES[id]),
	);
	enabled.add(PERSONAL_SPACE_ID);
	return Object.values(DATA_SPACES)
		.map((space) => space.id)
		.filter((id) => enabled.has(id));
}

function loadEnabledSpaceIds() {
	try {
		return normalizeEnabledSpaceIds(
			JSON.parse(window.localStorage.getItem(ENABLED_DATA_SPACES_KEY) || "[]"),
		);
	} catch {
		return normalizeEnabledSpaceIds([]);
	}
}

function saveEnabledSpaceIds(spaceIds) {
	const normalized = normalizeEnabledSpaceIds(spaceIds);
	try {
		window.localStorage.setItem(
			ENABLED_DATA_SPACES_KEY,
			JSON.stringify(normalized),
		);
	} catch {
		// Visibility preferences are local convenience only.
	}
	return normalized;
}

function enabledSpaceIds() {
	return normalizeEnabledSpaceIds(state.enabledSpaceIds);
}

function isSpaceEnabled(spaceId) {
	return enabledSpaceIds().includes(normalizeDataSpaceId(spaceId));
}

function visibleDataSpaces() {
	refreshDataSpaces();
	const enabled = new Set(enabledSpaceIds());
	enabled.add(activeSpaceId());
	return Object.values(DATA_SPACES).filter((space) => enabled.has(space.id));
}

function activeSpacePillHtml() {
	const space = activeSpace();
	return `<span class="cloud-status-pill is-active space-status-pill">${escapeHtml(space.label)} space</span>`;
}

function spaceToggleButtonsHtml() {
	refreshDataSpaces();
	const enabled = new Set(enabledSpaceIds());
	return Object.values(DATA_SPACES)
		.map((space) => {
			const checked = enabled.has(space.id);
			const personal = space.id === PERSONAL_SPACE_ID;
			return `
        <button class="dashboard-identity-toggle${checked ? " is-active" : ""}" data-action="toggle-space-enabled" data-space="${escapeHtml(space.id)}" type="button" aria-pressed="${checked ? "true" : "false"}"${personal ? " disabled" : ""}>
          <span>${escapeHtml(space.label)}</span>
        </button>
      `;
		})
		.join("");
}

function customSpaceQuestionnaireHtml() {
	const nextSpaceId = availableCustomSpaceId();
	const createdCount = CUSTOM_SPACE_IDS.filter((id) => DATA_SPACES[id]).length;
	if (!nextSpaceId) {
		return `
      <div class="custom-space-questionnaire is-complete" role="region" aria-label="Additional spaces">
        <div>
          <h4>Additional Spaces</h4>
          <p>You have created both additional spaces. Use Data Controls inside a custom space to invite people when you want shared access.</p>
        </div>
      </div>
    `;
	}
	return `
    <div class="custom-space-questionnaire" data-custom-space-questionnaire role="form" aria-labelledby="custom-space-questionnaire-title">
      <div class="body-card-heading">
        <div>
          <h4 id="custom-space-questionnaire-title">Create Additional Space</h4>
          <p>Answer these setup questions to create custom space ${escapeHtml(String(createdCount + 1))} of 2. Thoughts and goals are set after creation from their Settings tabs.</p>
        </div>
      </div>
      <div class="body-form-grid custom-space-form">
        <label class="body-field">Space name<input id="custom-space-name" type="text" maxlength="40" placeholder="Couples, Friends, Book Club"></label>
        <label class="body-field">Short description<input id="custom-space-description" type="text" maxlength="100" placeholder="What this space is for"></label>
        ${DASHBOARD_LABELS.map((dashboard) => `
          <label class="body-field">${escapeHtml(dashboard)} button label<input id="custom-space-label-${escapeHtml(dashboard)}" type="text" maxlength="36" value="${escapeHtml(dashboardDisplayLabel(dashboard))}"></label>
        `).join("")}
        <label class="dashboard-identity-toggle custom-space-share-toggle">
          <input id="custom-space-invite-after" type="checkbox">
          <span>Open sharing controls after creation</span>
        </label>
      </div>
      <div class="action-row data-controls-actions">
        <button class="primary-button" data-action="create-custom-space" type="button">${buttonContent("tabler:layout-grid-add", "Create Space")}</button>
      </div>
    </div>
  `;
}

function spaceVisibilitySettingsHtml() {
	refreshDataSpaces();
	const current = activeSpaceId();
	const description =
		DATA_SPACES[current]?.description || DATA_SPACES[PERSONAL_SPACE_ID].description;
	return `
    <section class="interface-settings-section space-visibility-section">
      <div class="body-card-heading">
        <div>
          <h3>Spaces</h3>
          <p>${escapeHtml(description)}</p>
        </div>
        ${activeSpacePillHtml()}
      </div>
      <div class="dashboard-identity-toggles" role="group" aria-label="Spaces">
        ${Object.values(DATA_SPACES)
				.map(
					(space) => {
						const unread = pyxdiaUnreadSpaceCount(space.id);
						return `
          <button class="dashboard-space-button${current === space.id ? " is-active" : ""}" data-action="switch-space" data-space="${escapeHtml(space.id)}" type="button" aria-pressed="${current === space.id ? "true" : "false"}">
            <span>${escapeHtml(space.label)}</span>
            ${unread ? `<i class="dashboard-space-unread" aria-label="${escapeHtml(`${unread} unread letter${unread === 1 ? "" : "s"}`)}">${escapeHtml(unread > 9 ? "9+" : String(unread))}</i>` : ""}
          </button>
        `;
					},
				)
					.join("")}
      </div>
      ${customSpaceQuestionnaireHtml()}
    </section>
  `;
}

function dashboardSpaceSwitcherHtml() {
	const current = activeSpaceId();
	const spaces = visibleDataSpaces();
	return `
    <nav class="dashboard-space-switcher" aria-label="Dataset space">
      ${spaces
				.map(
					(space) => {
						const unread = pyxdiaUnreadSpaceCount(space.id);
						return `
          <button class="dashboard-space-button${current === space.id ? " is-active" : ""}" data-action="switch-space" data-space="${escapeHtml(space.id)}" type="button" aria-pressed="${current === space.id ? "true" : "false"}">
            <span>${escapeHtml(space.label)}</span>
            ${unread ? `<i class="dashboard-space-unread" aria-label="${escapeHtml(`${unread} unread letter${unread === 1 ? "" : "s"}`)}">${escapeHtml(unread > 9 ? "9+" : String(unread))}</i>` : ""}
          </button>
        `;
					},
				)
					.join("")}
    </nav>
  `;
}

function spacePinControlsHtml() {
	const current = activeSpaceId();
	const locked = hasSpacePin(current);
	return `
    <div class="data-controls-group">
      <div class="body-card-heading">
        <div>
          <h4>Space PIN</h4>
          <p>Local-only convenience lock for the ${escapeHtml(activeSpaceLabel())} space on this browser. It is not account auth or encrypted-at-rest protection.</p>
        </div>
        ${activeSpacePillHtml()}
      </div>
      <div class="action-row data-controls-actions">
        <button class="secondary-button" data-action="space-pin-set" type="button">${buttonContent("tabler:key", locked ? "Change PIN" : "Set PIN")}</button>
        ${
					locked
						? `<button class="secondary-button" data-action="space-lock-now" type="button">${buttonContent("tabler:lock", "Lock now")}</button>
            <button class="secondary-button danger-button" data-action="space-pin-remove" type="button">${buttonContent("tabler:lock-open", "Remove PIN")}</button>`
						: ""
				}
      </div>
      <p class="cloud-status-message">The PIN hash stays on this device. Clearing browser data removes the lock for this browser.</p>
    </div>
  `;
}

function createSpaceDatasetReset(spaceId, { defaults = false } = {}) {
	return {
		artifactStore: createEmptyStore(),
		appState: {
			bodyTracker: createDefaultBodyTracker(),
			spiritProgress: {},
			lifePlanner: createDefaultLifePlanner(),
			thoughtSettings: cloneSpaceTrackers(spaceId, { empty: !defaults }),
			goalSettings: cloneSpaceGoals(spaceId, { empty: !defaults }),
			dashboardIdentity: cloneDefaultDashboardIdentityForSpace(spaceId),
			dashboardChartTabs: [...DEFAULT_DASHBOARD_CHART_TABS],
			theme: "default",
			colorMode: "standard",
			timerState: normalizeTimerState(),
			timerSettings: normalizeTimerSettings(),
			pyxdiaSettings: normalizePyxdiaSettings(DEFAULT_PYXIDA_SETTINGS),
			pyxdiaLocalState: createEmptyPyxdiaLocalState(),
			localFiles: [],
		},
	};
}

function resetSpaceDatasetStorage(spaceId, { defaults = false, reset = null } = {}) {
	const appliedReset = reset || createSpaceDatasetReset(spaceId, { defaults });
	DATASET_STORAGE_BASE_KEYS.forEach((key) => {
		try {
			window.localStorage.removeItem(scopedStorageKey(key, spaceId));
		} catch {
			// Continue clearing the rest of the dataset keys.
		}
	});
	try {
		window.indexedDB?.deleteDatabase?.(scopedStorageKey("ourstuff.localMedia.v1", spaceId));
	} catch {
		// IndexedDB cleanup is best effort.
	}
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.artifactStore.v1", spaceId),
		JSON.stringify(appliedReset.artifactStore),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.bodyTracker.v1", spaceId),
		JSON.stringify(appliedReset.appState.bodyTracker),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.spiritPlanProgress.v1", spaceId),
		JSON.stringify(appliedReset.appState.spiritProgress),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.lifePlanner.v1", spaceId),
		JSON.stringify(appliedReset.appState.lifePlanner),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.thoughts.v1", spaceId),
		JSON.stringify(appliedReset.appState.thoughtSettings),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.goals.v1", spaceId),
		JSON.stringify(appliedReset.appState.goalSettings),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.dashboardIdentity.v1", spaceId),
		JSON.stringify(appliedReset.appState.dashboardIdentity),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.dashboardChartTabs.v1", spaceId),
		JSON.stringify(appliedReset.appState.dashboardChartTabs),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.theme.v1", spaceId),
		appliedReset.appState.theme,
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.colorMode.v1", spaceId),
		appliedReset.appState.colorMode,
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.timerState.v1", spaceId),
		JSON.stringify(appliedReset.appState.timerState),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.timerSettings.v1", spaceId),
		JSON.stringify(appliedReset.appState.timerSettings),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.pyxdiaSettings.v1", spaceId),
		JSON.stringify(appliedReset.appState.pyxdiaSettings),
	);
	window.localStorage.setItem(
		scopedStorageKey("ourstuff.pyxdiaPenpal.v1", spaceId),
		JSON.stringify(appliedReset.appState.pyxdiaLocalState),
	);
	return appliedReset;
}

async function replaceActiveSpaceCloudWithReset(spaceId, reset) {
	if (!cloudHasSyncAccess()) {
		return null;
	}
	if (spaceId !== activeSpaceId()) {
		throw new Error("Switch to the space before replacing its Cloud records.");
	}
	if (!cloudCanOwnActiveSpace()) {
		throw new Error(`Only the ${activeSpaceLabel()} owner can replace Cloud records.`);
	}
	const updatedAt = nowIso();
	const json = {
		schemaVersion: SCHEMA_VERSION,
		rootId: reset.artifactStore.rootId || "ourstuff-root",
		artifacts: reset.artifactStore.artifacts || [],
		metadata: {
			localUpdatedAt: updatedAt,
			exportedAt: updatedAt,
			deviceId: state.cloud?.deviceId || "",
		},
		appState: {
			...reset.appState,
			appearanceUpdatedAt: updatedAt,
		},
	};
	const result = await saveAppStateJsonToCloud(json, { quiet: true });
	recordCloudSyncAt(
		result.updatedAt || updatedAt,
		`${DATA_SPACES[spaceId]?.label || "Space"} Cloud records replaced.`,
	);
	return result;
}

async function resetSpaceDatasetEverywhere(spaceId, { defaults = false } = {}) {
	const reset = createSpaceDatasetReset(spaceId, { defaults });
	if (cloudHasSyncAccess()) {
		if (spaceId !== activeSpaceId()) {
			throw new Error("Switch to the space before replacing its Cloud records.");
		}
		if (!cloudCanOwnActiveSpace()) {
			throw new Error(`Only the ${activeSpaceLabel()} owner can replace Cloud records.`);
		}
		await deleteCloudStateJson();
	}
	resetSpaceDatasetStorage(spaceId, { reset });
	return await replaceActiveSpaceCloudWithReset(spaceId, reset);
}

async function createEmptySpace(spaceId) {
	const normalized = DATA_SPACES[spaceId]?.id || WORK_SPACE_ID;
	const config = SPACE_DEFAULTS[normalized] || {};
	const confirmed = window.confirm(
		config.emptyConfirm ||
			`Create an empty ${DATA_SPACES[normalized].label} space on this browser? This replaces only that local dataset.`,
	);
	if (!confirmed) {
		return;
	}
	await resetSpaceDatasetEverywhere(normalized, { defaults: false });
	switchSpace(normalized);
}

async function restoreSpaceDefaults(spaceId) {
	const normalized = DATA_SPACES[spaceId]?.id || WORK_SPACE_ID;
	if (normalized === PERSONAL_SPACE_ID) {
		await restoreFactoryDefaults();
		return;
	}
	const config = SPACE_DEFAULTS[normalized] || {};
	const confirmed = window.confirm(
		config.defaultConfirm ||
			`Restore ${DATA_SPACES[normalized].label} defaults? This replaces only that local dataset.`,
	);
	if (!confirmed) {
		return;
	}
	await resetSpaceDatasetEverywhere(normalized, { defaults: true });
	switchSpace(normalized);
}

async function setSpacePinAction() {
	const label = activeSpaceLabel();
	const pin = window.prompt(`Enter a local PIN for the ${label} space. Use at least 4 digits.`);
	if (pin === null) {
		return;
	}
	const confirmPin = window.prompt("Re-enter the PIN.");
	if (confirmPin === null) {
		return;
	}
	if (pin !== confirmPin) {
		window.alert("The PINs did not match.");
		return;
	}
	try {
		await setSpacePin(activeSpaceId(), pin);
		window.alert(`${label} is locked. Unlock it with the PIN after reload or manual lock.`);
		setState({ spaceLockError: "" });
	} catch (error) {
		window.alert(error instanceof Error ? error.message : "Could not save PIN.");
	}
}

async function removeSpacePinAction() {
	const label = activeSpaceLabel();
	const confirmed = window.confirm(`Remove the local PIN for the ${label} space on this browser?`);
	if (!confirmed) {
		return;
	}
	removeSpacePin(activeSpaceId());
	setState({ spaceLockError: "" });
}

function lockActiveSpaceNow() {
	lockSpace(activeSpaceId());
	setState({ spaceLockError: "" });
}

function spaceLockHtml() {
	const label = activeSpaceLabel();
	return `
    <div class="space-lock-screen">
      <section class="panel space-lock-panel">
        <div class="empty-state">
          <span class="empty-state-icon" aria-hidden="true">${iconHtml("tabler:lock")}</span>
          <div>
            <h3>${escapeHtml(label)} is locked</h3>
            <p>Enter the local PIN for this browser. This lock is a local convenience, not account authentication.</p>
          </div>
        </div>
        <label class="body-field">PIN
          <input id="space-unlock-pin" type="password" inputmode="numeric" autocomplete="current-password" autofocus>
        </label>
        ${state.spaceLockError ? `<p class="cloud-status-message cloud-status-message--error">${escapeHtml(state.spaceLockError)}</p>` : ""}
        <div class="action-row body-actions">
          <button class="primary-button" data-action="space-unlock" type="button">${buttonContent("tabler:lock-open", "Unlock")}</button>
          ${visibleDataSpaces()
						.filter((space) => space.id !== activeSpaceId())
						.map((space) => `<button class="secondary-button" data-action="switch-space" data-space="${escapeHtml(space.id)}" type="button">${buttonContent("tabler:switch-horizontal", `Switch to ${space.label}`)}</button>`)
						.join("")}
        </div>
      </section>
    </div>
  `;
}

async function unlockActiveSpaceFromDom() {
	const pin = document.getElementById("space-unlock-pin")?.value || "";
	const ok = await unlockSpace(activeSpaceId(), pin);
	if (!ok) {
		setState({ spaceLockError: "That PIN did not unlock this space." });
		return;
	}
	setState({ spaceLockError: "" });
}

function formatStorageGb(size) {
	const bytes = Number(size) || 0;
	return `${(Math.max(0, bytes) / 1000000000).toFixed(1)}GB`;
}

function formatStorageLimitGb(size) {
	const gb = Math.max(0, Number(size) || 0) / 1000000000;
	return `${Number.isInteger(gb) ? gb.toFixed(0) : gb.toFixed(1)}GB`;
}

function cloudStorageUsageHtml(usage) {
	const loading = !usage;
	const limitBytes = Number(usage?.limitBytes) || CLOUD_STORAGE_LIMIT_BYTES;
	const totalBytes = Number(usage?.totalBytes) || 0;
	const storageBytes = Number(usage?.storageBytes) || 0;
	const firebaseBytes = Number(usage?.firebaseBytes) || 0;
	const remainingBytes = Math.max(0, limitBytes - totalBytes);
	const percent = loading ? 0 : storageUsagePercent(usage);
	const overLimit = totalBytes > limitBytes;
	const updatedAt = usage?.updatedAt
		? new Date(usage.updatedAt).toLocaleString()
		: "";
	return `
    <div class="cloud-usage-card${overLimit ? " is-over-limit" : ""}" style="--cloud-storage-progress: ${percent}%;">
      <div class="cloud-usage-heading">
        <div>
          <strong>${loading ? "Calculating usage" : `${formatStorageGb(totalBytes)} out of ${formatStorageLimitGb(limitBytes)}`}</strong>
          <small>${loading ? `Limit: ${formatStorageLimitGb(limitBytes)}` : `${formatStorageGb(storageBytes)} media / ${formatStorageGb(firebaseBytes)} Cloud records`}</small>
        </div>
        <span>${loading ? "--" : `${Math.round(percent * 10) / 10}%`}</span>
      </div>
      <div class="cloud-usage-meter" aria-hidden="true"><i></i></div>
      <div class="cloud-sync-grid cloud-usage-breakdown">
        <span><strong>${escapeHtml(formatStorageGb(storageBytes))}</strong><small>Media files</small></span>
        <span><strong>${escapeHtml(formatStorageGb(firebaseBytes))}</strong><small>Cloud records</small></span>
      </div>
      <p class="cloud-status-message${usage?.error || overLimit ? " cloud-status-message--error" : ""}">
        ${escapeHtml(usage?.error || (loading ? "Reading media and Cloud totals." : overLimit ? `Cloud storage is over the ${formatStorageLimitGb(limitBytes)} limit. Uploads and sync will stop until space is freed.` : `${formatStorageGb(remainingBytes)} remaining before uploads stop.`))}
      </p>
      ${updatedAt ? `<p class="cloud-usage-updated">Cloud usage from ${escapeHtml(updatedAt)}.</p>` : ""}
    </div>
  `;
}

function galleryHtml() {
	const images = state.galleryImages;
	const selected = new Set(state.gallerySelectedIds);
	const count = images?.length || 0;
	const selectedCount = selected.size;
	const thumbSize = Math.min(
		320,
		Math.max(110, Number(state.galleryThumbSize) || 180),
	);
	return panelHtml(`
    ${headerHtml(
			"Gallery",
			"Browse image uploads from this browser. Cloud media is encrypted before upload.",
			`
      <div class="action-row">
        <button class="secondary-button" data-action="gallery-select-all" type="button"${count ? "" : " disabled"}>${buttonContent("tabler:checks", "Select All")}</button>
        <button class="secondary-button" data-action="gallery-clear-selection" type="button"${selectedCount ? "" : " disabled"}>${buttonContent("tabler:square", "Clear")}</button>
        ${pageActionButton("gallery-delete-selected", "tabler:trash", selectedCount ? `Delete ${selectedCount}` : "Delete selected", { danger: true, disabled: !selectedCount })}
      </div>
    `,
		)}
    <div class="gallery-page">
      <div class="gallery-toolbar">
        <span>${images ? `${count} image${count === 1 ? "" : "s"}` : "Loading images"}</span>
        <label>
          <span>Image size</span>
          <input data-gallery-size-slider type="range" min="110" max="320" step="10" value="${thumbSize}" aria-label="Gallery image size">
        </label>
      </div>
      ${
				images === null
					? emptyStateHtml(
							"Loading gallery.",
							"Reading your local image library.",
						)
					: images.length
						? `
        <div class="gallery-grid${selectedCount ? " is-selecting" : ""}" style="--gallery-thumb-size: ${thumbSize}px;">
          ${images.map((image) => galleryImageCardHtml(image, selected.has(image.id))).join("")}
        </div>
      `
						: emptyStateHtml(
								"No images yet.",
								"Images you upload into notes will appear here.",
							)
			}
    </div>
  `);
}

function galleryImageCardHtml(image, selected) {
	const remoteUrl = galleryRemoteImageUrl(image);
	const downloadName = image.name || `${image.id || "image"}.jpg`;
	const imageLinkAttrs = remoteUrl
		? `href="${escapeHtml(remoteUrl)}" download="${escapeHtml(downloadName)}" target="_blank" rel="noopener noreferrer"`
		: `href="#" download="${escapeHtml(downloadName)}" data-local-asset-link="${escapeHtml(image.id)}" data-local-asset-name="${escapeHtml(downloadName)}"`;
	const imageAttrs = remoteUrl
		? `src="${escapeHtml(remoteUrl)}"`
		: `data-local-asset="${escapeHtml(image.id)}"`;
	return `
    <article class="gallery-card${selected ? " is-selected" : ""}">
      <label class="gallery-select">
        <input data-gallery-select type="checkbox" value="${escapeHtml(image.id)}"${selected ? " checked" : ""} aria-label="Select ${escapeHtml(image.name || "image")}">
      </label>
      <a class="gallery-image-link" ${imageLinkAttrs} aria-label="Download ${escapeHtml(image.name || "image")}">
        <img ${imageAttrs} alt="${escapeHtml(image.name || "Uploaded image")}" loading="lazy">
      </a>
    </article>
  `;
}

function galleryRemoteImageUrl(image) {
	const value =
		image?.url ||
		image?.downloadUrl ||
		image?.publicUrl ||
		image?.storageUrl ||
		"";
	return /^https?:\/\/[^"'<>]+$/i.test(value) ? value : "";
}

function selectAllGalleryImages() {
	setState({
		gallerySelectedIds: (state.galleryImages || []).map((image) => image.id),
	});
}

function clearGallerySelection() {
	setState({ gallerySelectedIds: [] });
}

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeDeletedImageReferences(ids) {
	if (!state.artifactStore || !ids.length) {
		return;
	}
	const patterns = ids.map(
		(id) =>
			new RegExp(
				`!\\[[^\\]]*\\]\\(ourstuff-asset:${escapeRegExp(id)}\\)\\s*`,
				"g",
			),
	);
	let changed = false;
	const now = nowIso();
	const artifacts = state.artifactStore.artifacts.map((artifact) => {
		if (typeof artifact.body !== "string") {
			return artifact;
		}
		const nextBody = patterns
			.reduce((body, pattern) => body.replace(pattern, ""), artifact.body)
			.trim();
		if (nextBody === artifact.body) {
			return artifact;
		}
		changed = true;
		return { ...artifact, body: nextBody, edited: now };
	});
	if (changed) {
		persistArtifactStore({ ...state.artifactStore, artifacts });
	}
}

async function deleteSelectedGalleryImages() {
	const ids = state.gallerySelectedIds.filter((id) =>
		(state.galleryImages || []).some((image) => image.id === id),
	);
	if (!ids.length) {
		return;
	}
	const label = `${ids.length} image${ids.length === 1 ? "" : "s"}`;
	if (
		!window.confirm(
			`Delete ${label} from the gallery and remove their note references?`,
		)
	) {
		return;
	}
	try {
		await deleteLocalImages(ids);
		removeDeletedImageReferences(ids);
		setState({
			galleryImages: (state.galleryImages || []).filter(
				(image) => !ids.includes(image.id),
			),
			gallerySelectedIds: [],
		});
		scheduleCloudStorageUsageRefresh({ force: true });
	} catch (error) {
		window.alert(
			error instanceof Error ? error.message : `Could not delete ${label}.`,
		);
	}
}

function spiritHtml() {
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (note?.dashboard === "Spirit" && state.artifactMode === "editor") {
		return dashboardNoteEditorHtml(note);
	}
	if (note?.dashboard === "Spirit" && state.artifactMode === "viewer") {
		return panelHtml(`
      ${headerHtml(note.title, "", artifactViewerActions(note))}
      <div class="reader-panel"><div class="markdown-body">${readerBodyHtml(note.title, note.body)}</div></div>
    `);
	}
	if (state.spiritPlanError) {
		return panelHtml(`
      ${headerHtml(dashboardDisplayLabel("Spirit"), "Personal reading plans.", "", { titleHtml: dashboardHeaderTitleHtml("Spirit") })}
      ${emptyStateHtml("Plan could not load.", state.spiritPlanError)}
    `);
	}
	if (!state.spiritPlan) {
		return panelHtml(`
      ${headerHtml(dashboardDisplayLabel("Spirit"), "Personal reading plans.", "", { titleHtml: dashboardHeaderTitleHtml("Spirit") })}
      ${emptyStateHtml("Loading plan.", "Preparing the selected reading plan.")}
    `);
	}

	const selected = selectedSpiritBook();
	if (selected) {
		return spiritBookHtml(selected);
	}

	const works = spiritWorks();
	const years = spiritYears();
	const activeYear = years.includes(state.spiritYear)
		? state.spiritYear
		: years[0];
	const visibleWorks = works.filter((work) => work.year === activeYear);
	const yearIndex = years.indexOf(activeYear);

	const spiritControls = `
    <div class="action-row spirit-actions spirit-selector-actions">
      <button class="secondary-button" data-action="new-artifact-note" data-dashboard="Spirit" type="button">${buttonContent("tabler:notes", "New Note")}</button>
      <label class="plan-select-label">
        <span>Plan</span>
        <select class="plan-select" data-action="select-spirit-plan" aria-label="Select reading plan">
          ${SPIRIT_PLANS.map(
						(plan) => `
            <option value="${escapeHtml(plan.id)}"${state.spiritPlanId === plan.id ? " selected" : ""}>${escapeHtml(plan.label)}</option>
          `,
					).join("")}
        </select>
      </label>
    </div>
  `;

	return panelHtml(`
    ${headerHtml(dashboardDisplayLabel("Spirit"), "Personal reading plans.", "", { titleHtml: dashboardHeaderTitleHtml("Spirit") })}
    <div class="spirit-dashboard">
      <div class="spirit-nav-stack">
        ${dashboardOrbNavHtml("Spirit")}
        ${spiritControls}
        <nav class="spirit-year-nav" aria-label="Plan years">
          <button class="secondary-button" data-action="spirit-prev-year" type="button"${yearIndex <= 0 ? " disabled" : ""}>Previous</button>
          <div class="spirit-year-buttons">
            ${years
							.map(
								(year) => `
              <button class="spirit-year-button${year === activeYear ? " is-active" : ""}" data-action="set-spirit-year" data-year="${year}" type="button" aria-pressed="${year === activeYear ? "true" : "false"}">
                ${escapeHtml(year)}
              </button>
            `,
							)
							.join("")}
          </div>
          <button class="secondary-button" data-action="spirit-next-year" type="button"${yearIndex >= years.length - 1 ? " disabled" : ""}>Next</button>
        </nav>
      </div>
      <div class="scroll-area spirit-scroll">
        <div class="spirit-reading-list">
          ${visibleWorks.map((work, index) => spiritReadingRowHtml(work, index)).join("")}
        </div>
      </div>
    </div>
  `);
}

function spiritReadingRowHtml(work, index) {
	const complete = isSpiritComplete(work.key);
	const sequenceNumber = index + 1;
	return `
    <article class="spirit-reading-row${complete ? " is-complete" : ""}">
      <button class="spirit-reading-button" data-action="open-spirit-book" data-key="${escapeHtml(work.key)}" type="button">
        <span class="spirit-reading-order">${String(sequenceNumber).padStart(2, "0")}</span>
        <span class="spirit-reading-main">
          <strong>${escapeHtml(work.title)}</strong>
          <small>${escapeHtml(work.author)}${work.selection ? ` / ${escapeHtml(work.selection)}` : ""}</small>
        </span>
      </button>
    </article>
  `;
}

function spiritBookHtml(work) {
	const complete = isSpiritComplete(work.key);
	const outputs = Array.isArray(work.blackBox?.outputs)
		? work.blackBox.outputs
		: [];
	const inputs = Array.isArray(work.blackBox?.inputs)
		? work.blackBox.inputs
		: work.greatIdeas;
	return panelHtml(`
    ${headerHtml(
			work.title,
			`${work.author}${work.selection ? ` / ${work.selection}` : ""}`,
			`
      <div class="action-row">
        <button class="secondary-button" data-action="add-spirit-book-note" data-key="${escapeHtml(work.key)}" type="button">${buttonContent("tabler:notes", "Add Note")}</button>
        <button class="secondary-button" data-action="toggle-spirit-complete" data-key="${escapeHtml(work.key)}" type="button">${buttonContent(complete ? "tabler:circle-off" : "tabler:circle-check", complete ? "Mark Incomplete" : "Mark Complete")}</button>
        <button class="icon-button close-viewer-button" data-action="exit-spirit-book" type="button" aria-label="Exit reading" title="Exit">${iconHtml("tabler:x")}</button>
      </div>
    `,
		)}
    <div class="spirit-book-dashboard">
      ${spiritLookupBarHtml(work)}
      <section class="spirit-detail-card">
        <span>Year</span>
        <strong>${escapeHtml(work.year)}</strong>
      </section>
      <section class="spirit-detail-card">
        <span>Status</span>
        <strong>${complete ? "Complete" : "Open"}</strong>
      </section>
      <section class="spirit-detail-card spirit-detail-card--wide">
        <span>Great Ideas</span>
        <div class="spirit-pill-row">
          ${work.greatIdeas.length ? work.greatIdeas.map((idea) => `<em>${escapeHtml(idea)}</em>`).join("") : "<small>No ideas listed.</small>"}
        </div>
      </section>
      <section class="spirit-detail-card spirit-detail-card--wide">
        <span>Reading Focus</span>
        <div class="spirit-focus-grid">
          ${(outputs.length ? outputs : inputs).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
      </section>
      <section class="spirit-detail-card spirit-detail-card--wide">
        <span>Tags</span>
        <div class="spirit-pill-row">
          ${work.tags.length ? work.tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("") : "<small>No tags listed.</small>"}
        </div>
      </section>
    </div>
  `);
}

function dashboardArtifactHtml(dashboard) {
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (state.artifactMode === "editor" && note) {
		return dashboardNoteEditorHtml(note);
	}
	if (state.artifactMode === "viewer" && note) {
		return artifactReaderHtml(note, `${dashboardDisplayLabel(dashboard)} note`);
	}

	const notes = rootNotesForDashboard(state.artifactStore, dashboard);
	return panelHtml(`
    ${headerHtml(`${dashboardDisplayLabel(dashboard)} Notes`, "Shared artifacts stored in the local browser first, ready for later analysis across the full root database.", `<button class="secondary-button" data-action="new-artifact-note" data-dashboard="${dashboard}">${buttonContent("tabler:notes", "New Note")}</button>`)}
    ${
			notes.length
				? `
      <div class="scroll-area">
        <div class="section-list">
          ${notes
						.map(
							(noteItem, index) => `
            <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(noteItem.title)}</strong>
              <small>${escapeHtml(shortSummary(noteItem.body, "No note text yet"))}</small>
              <em>${iconHtml("tabler:notes")} ${escapeHtml(dashboardDisplayLabel(noteItem.dashboard))}</em>
            </button>
          `,
						)
						.join("")}
        </div>
      </div>
    `
				: emptyStateHtml(
						"No notes yet.",
						`Add the first ${dashboard.toLowerCase()} note to create an artifact.`,
					)
		}
  `);
}

function artifactViewerActions(note) {
	return `
    <div class="action-row">
      ${pageActionButton("edit-artifact-note", "tabler:pencil", "Edit note")}
      ${pageActionButton("delete-artifact-note", "tabler:trash", "Delete note", { danger: true, data: { id: note.id } })}
      ${pageActionButton("close-artifact-viewer", "tabler:x", "Close note", { className: "close-viewer-button" })}
    </div>
  `;
}

function artifactReaderHtml(note, _subtitle) {
	return panelHtml(`
    <div class="reader-topbar reader-topbar--actions">${artifactViewerActions(note)}</div>
    <div class="reader-panel">${pageContentHtml(note.title, note.body, readerPageContext({ current: 1, total: 1 }, artifactGalleryKey(note.id)))}</div>
  `);
}

function lifeEvents() {
	if (!state.artifactStore) {
		return [];
	}
	const events = [];
	const addEvent = (event) => {
		const timestamp = event.timestamp || `${event.dateKey}T12:00:00`;
		const minuteKey = Number.isNaN(new Date(timestamp).getTime())
			? String(timestamp)
			: new Date(timestamp).toISOString().slice(0, 16);
		const title =
			event.role === "thought" && event.thoughtLabel
				? event.thoughtLabel
				: event.role === "goal-progress" && event.goalLabel
					? event.goalLabel
					: event.title;
		const eventKey = [
			event.artifactId,
			event.dashboard,
			event.type,
			minuteKey,
			title,
		].join("|");
		if (events.some((existing) => existing.eventKey === eventKey)) {
			return;
		}
		const artifact = findArtifact(state.artifactStore, event.artifactId);
		events.push({ ...event, eventKey, parentId: artifact?.parentId || "" });
	};
	state.artifactStore.artifacts.forEach((artifact) => {
		if (isDeletedArtifact(artifact)) {
			return;
		}
		if (artifact.properties?.role === "spirit-reading-plan-item") {
			return;
		}
		if (artifact.properties?.role === "thought") {
			const timestamp =
				artifact.properties?.thoughtLoggedAt ||
				artifact.created ||
				artifact.edited;
			addEvent({
				id: `${artifact.id}-thought`,
				artifactId: artifact.id,
				title: artifact.title,
				role: "thought",
				thoughtLabel: artifact.properties?.thoughtLabel || "",
				dashboard: artifact.dashboard,
				type: artifact.type,
				action: "created",
				changed: [],
				dateKey: dateKeyFromValue(artifact.properties?.dateKey || timestamp),
				timestamp,
			});
			return;
		}
		if (artifact.properties?.role === "goal-progress") {
			const timestamp =
				artifact.properties?.goalLoggedAt ||
				artifact.created ||
				artifact.edited;
			addEvent({
				id: `${artifact.id}-goal`,
				artifactId: artifact.id,
				title: artifact.title,
				role: "goal-progress",
				goalLabel: artifact.properties?.goalLabel || "",
				dashboard: artifact.dashboard,
				type: artifact.type,
				action: "created",
				changed: [],
				dateKey: dateKeyFromValue(artifact.properties?.dateKey || timestamp),
				timestamp,
			});
			return;
		}
		const auditEntries = Array.isArray(artifact.properties?.audit)
			? artifact.properties.audit
			: [];
		if (auditEntries.length) {
			auditEntries.forEach((entry) => {
				addEvent({
					id: `${artifact.id}-${entry.at || entry.action}`,
					artifactId: artifact.id,
					title: artifact.title,
					role: artifact.properties?.role || "",
					thoughtLabel: artifact.properties?.thoughtLabel || "",
					goalLabel: artifact.properties?.goalLabel || "",
					dashboard: artifact.dashboard,
					type: artifact.type,
					action: entry.action || "edited",
					changed: Array.isArray(entry.changed) ? entry.changed : [],
					dateKey: dateKeyFromValue(
						entry.dateKey || entry.at || artifact.edited || artifact.created,
					),
					timestamp: entry.at || artifact.edited || artifact.created,
				});
			});
			return;
		}
		if (artifact.created) {
			addEvent({
				id: `${artifact.id}-created`,
				artifactId: artifact.id,
				title: artifact.title,
				role: artifact.properties?.role || "",
				thoughtLabel: artifact.properties?.thoughtLabel || "",
				goalLabel: artifact.properties?.goalLabel || "",
				dashboard: artifact.dashboard,
				type: artifact.type,
				action: "created",
				changed: [],
				dateKey: dateKeyFromValue(
					artifact.properties?.dateKey || artifact.created,
				),
				timestamp: artifact.created,
			});
		}
		if (artifact.edited && artifact.edited !== artifact.created) {
			addEvent({
				id: `${artifact.id}-edited`,
				artifactId: artifact.id,
				title: artifact.title,
				role: artifact.properties?.role || "",
				thoughtLabel: artifact.properties?.thoughtLabel || "",
				goalLabel: artifact.properties?.goalLabel || "",
				dashboard: artifact.dashboard,
				type: artifact.type,
				action: "edited",
				changed: [],
				dateKey: dateKeyFromValue(artifact.edited),
				timestamp: artifact.edited,
			});
		}
	});
	return events.sort(
		(a, b) =>
			(Date.parse(b.timestamp) || Date.parse(b.dateKey)) -
			(Date.parse(a.timestamp) || Date.parse(a.dateKey)),
	);
}

function lifeCalendarEventTitle(event) {
	if (event.role === "thought" && event.thoughtLabel) {
		return event.thoughtLabel;
	}
	if (event.role === "goal-progress" && event.goalLabel) {
		return event.goalLabel;
	}
	return event.title;
}

function lifeCalendarEvents() {
	return lifeEvents().map((event) => ({
		id: event.id,
		title: lifeCalendarEventTitle(event),
		start:
			event.timestamp && !Number.isNaN(new Date(event.timestamp).getTime())
				? event.timestamp
				: `${event.dateKey}T12:00:00`,
		allDay: false,
		extendedProps: {
			artifactId: event.artifactId,
			parentId: event.parentId || "",
			dashboard: event.dashboard,
			action: event.action,
			fullTitle: event.title,
			meta: event.changed.length ? event.changed.join(", ") : event.type,
		},
		classNames: [`life-calendar-event--${event.dashboard.toLowerCase()}`],
	}));
}

function renderLifeMonthCalendar() {
	const calendarEl = document.getElementById("life-fullcalendar");
	if (!calendarEl || state.active !== "Life" || state.lifeMode !== "month") {
		return;
	}
	if (isMobileViewport()) {
		calendarEl.innerHTML = lifeMobileMonthAgendaHtml();
		return;
	}
	if (!window.FullCalendar?.Calendar) {
		calendarEl.innerHTML = lifeMonthFallbackHtml();
		return;
	}

	const calendar = new window.FullCalendar.Calendar(calendarEl, {
		initialView: "dayGridMonth",
		initialDate: todayDateKey(),
		height: "auto",
		fixedWeekCount: true,
		showNonCurrentDates: true,
		headerToolbar: false,
		dayMaxEvents: false,
		events: lifeCalendarEvents(),
		eventClick(info) {
			const artifactId = info.event.extendedProps.artifactId;
			if (artifactId) {
				openActivityArtifact(artifactId);
			}
		},
		eventContent(info) {
			const timeText = info.timeText || formatEventTime(info.event.start);
			const title = info.event.title;
			const dashboard = info.event.extendedProps.dashboard || "";
			const fullTitle = info.event.extendedProps.fullTitle || title;
			const wrapper = document.createElement("div");
			wrapper.className = "life-fc-event-inner";
			wrapper.title = [timeText, fullTitle].filter(Boolean).join(" ");
			wrapper.innerHTML = `
        <span>${escapeHtml(timeText)}</span>
        <strong>${escapeHtml(title)}</strong>
        <em>${escapeHtml(dashboard)}</em>
      `;
			return { domNodes: [wrapper] };
		},
	});
	calendar.render();
}

function lifeMobileMonthAgendaHtml() {
	const now = new Date();
	const month = now.getMonth();
	const year = now.getFullYear();
	const days = Array.from(
		{ length: new Date(year, month + 1, 0).getDate() },
		(_, index) => {
			const date = new Date(year, month, index + 1);
			const dateKey = dateKeyFromDate(date);
			return { dateKey, events: eventsForDate(dateKey) };
		},
	);
	return `
    <div class="life-mobile-month-agenda" aria-label="${escapeHtml(new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(now))} agenda">
      ${days
				.map(
					({ dateKey, events }) => `
        <section class="life-mobile-month-day${events.length ? " has-events" : ""}">
          <div class="life-mobile-month-date">
            <strong>${escapeHtml(new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(`${dateKey}T12:00:00`)))}</strong>
            <span>${escapeHtml(String(Number(dateKey.slice(-2))))}</span>
          </div>
          <div class="life-mobile-month-events">
            ${events.length ? events.map((event) => lifeEventRowHtml(event, "mobile-month")).join("") : "<p>No activity</p>"}
          </div>
        </section>
      `,
				)
				.join("")}
    </div>
  `;
}

function eventsForDate(dateKey) {
	return lifeEvents().filter((event) => event.dateKey === dateKey);
}

function lifeNotes() {
	return rootNotesForDashboard(state.artifactStore, "Life")
		.slice()
		.sort((a, b) => {
			const bKey = b.properties?.dateKey || b.edited || b.created || "";
			const aKey = a.properties?.dateKey || a.edited || a.created || "";
			return bKey.localeCompare(aKey);
		});
}

function lifeEventRowHtml(event, variant = "") {
	const label = `${dashboardDisplayLabel(event.dashboard)} ${event.action}`;
	const meta = event.changed.length ? event.changed.join(", ") : event.type;
	const time = formatEventTime(event.timestamp);
	const inner = `
    <span>${iconHtml(event.action === "created" ? "tabler:sparkles" : "tabler:history")}</span>
    <strong>${escapeHtml(event.title)}</strong>
    <small>${escapeHtml([time, meta].filter(Boolean).join(" / "))}</small>
    <em>${escapeHtml(label)}</em>
  `;
	const artifact = findArtifact(state.artifactStore, event.artifactId);
	const canOpen =
		artifact?.type === "compendium" ||
		(artifact?.type === "note" &&
			(!artifact.parentId || artifact.dashboard === "Mind"));
	const className = `life-event-row${variant ? ` life-event-row--${variant}` : ""}`;
	return canOpen
		? `<button class="${className}" data-action="open-life-activity" data-id="${event.artifactId}" type="button">${inner}</button>`
		: `<div class="${className}">${inner}</div>`;
}

function lifeJournalMetaHtml(note) {
	return `
    <div class="life-journal-meta">
      <span>${iconHtml("tabler:calendar")} ${escapeHtml(formatDateLabel(note.properties?.dateKey || note.edited || note.created, { weekday: true, year: true }))}</span>
    </div>
  `;
}

function lifeHtml() {
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (
		state.artifactMode === "editor" &&
		note?.dashboard === "Life" &&
		note.properties?.role === "life-journal"
	) {
		return lifeJournalEditorHtml(note);
	}
	if (state.artifactMode === "editor" && note) {
		return dashboardNoteEditorHtml(note);
	}
	if (state.artifactMode === "viewer" && note) {
		if (note.dashboard !== "Life") {
			return artifactReaderHtml(
				note,
				`${dashboardDisplayLabel(note.dashboard)} note`,
			);
		}
		if (note.properties?.role !== "life-journal") {
			return artifactReaderHtml(
				note,
				`${dashboardDisplayLabel("Life")} thought`,
			);
		}
		return panelHtml(`
      ${headerHtml(note.title, "", artifactViewerActions(note))}
      <div class="life-reader-grid">
        <section class="reader-panel life-reader-panel">
          ${lifeJournalMetaHtml(note)}
          <div class="markdown-body">${readerBodyHtml(note.title, note.body, "No journal text yet.")}</div>
        </section>
      </div>
    `);
	}

	return panelHtml(`
    ${headerHtml(dashboardDisplayLabel("Life"), "Calendar-first journal, orb trackers, and app activity.", "", { titleHtml: dashboardHeaderTitleHtml("Life") })}
    <div class="life-dashboard">
      ${dashboardOrbNavHtml("Life")}
      ${lifeToolSwitcherHtml()}
      <div class="life-mode-panel">
        ${lifePanelHtml()}
      </div>
    </div>
  `);
}

function lifeToolSwitcherHtml() {
	const activeTool = ["todo", "projects", "calendar"].includes(state.lifeTool)
		? state.lifeTool
		: "calendar";
	const modes = [
		["calendar", "Calendar", "tabler:calendar-month"],
		["todo", "Todo List", "tabler:checkbox"],
		["projects", "Projects", "tabler:folders"],
	];
	return `
    <nav class="life-mode-switcher life-tool-switcher page-tool-switcher" aria-label="${escapeHtml(dashboardDisplayLabel("Life"))} tools">
      ${modes
				.map(
					([mode, label, icon]) => `
        <button class="body-mode-button${activeTool === mode ? " is-active" : ""}" data-action="set-life-tool" data-tool="${mode}" type="button" aria-pressed="${activeTool === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `,
				)
				.join("")}
      <button class="body-mode-button life-new-note-button" data-action="new-artifact-note" data-dashboard="Life" type="button">
        ${buttonContent("tabler:notes", "New Note", "body-mode-label life-new-note-label")}
      </button>
    </nav>
  `;
}

function lifeCalendarModeSwitcherHtml() {
	const modes = [
		["month", "Month", "tabler:calendar-week"],
		["week", "Week", "tabler:calendar-month"],
		["day", "Day", "tabler:calendar-event"],
		["list", "List", "tabler:list-details"],
	];
	return `
    <nav class="life-calendar-switcher" aria-label="Calendar views">
      ${modes
				.map(
					([mode, label, icon]) => `
        <button class="body-mode-button${state.lifeMode === mode ? " is-active" : ""}" data-action="set-life-mode" data-mode="${mode}" type="button" aria-pressed="${state.lifeMode === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `,
				)
				.join("")}
    </nav>
  `;
}

function lifePanelHtml() {
	const tool = ["todo", "projects", "calendar"].includes(state.lifeTool)
		? state.lifeTool
		: "calendar";
	if (tool === "todo") {
		return lifeTodoHtml();
	}
	if (tool === "projects") {
		return lifeProjectsHtml();
	}
	return `
    <div class="life-calendar-viewer">
      ${lifeCalendarModeSwitcherHtml()}
      ${lifeCalendarPanelHtml()}
    </div>
  `;
}

function lifeCalendarPanelHtml() {
	if (state.lifeMode === "day") {
		return lifeDayHtml();
	}
	if (state.lifeMode === "week") {
		return lifeWeekHtml();
	}
	if (state.lifeMode === "list") {
		return lifeListHtml();
	}
	return lifeMonthHtml();
}

function lifeDayHtml() {
	const dateKey = todayDateKey();
	const events = eventsForDate(dateKey);
	return `
    <section class="body-card life-card">
      <div class="body-card-heading">
        <div>
          <h3>${escapeHtml(formatDateLabel(dateKey, { weekday: true, year: true }))}</h3>
          <p>${events.length} logged event${events.length === 1 ? "" : "s"} today.</p>
        </div>
      </div>
      <div class="life-event-list">${events.length ? events.map(lifeEventRowHtml).join("") : emptyStateHtml("Nothing logged today.", `Create a ${dashboardDisplayLabel("Life")} note or edit anything in the app to add activity here.`)}</div>
    </section>
  `;
}

function lifeWeekHtml() {
	const now = new Date();
	const start = addDays(now, -now.getDay());
	const days = Array.from({ length: 7 }, (_, index) => {
		const dateKey = dateKeyFromDate(addDays(start, index));
		return { dateKey, events: eventsForDate(dateKey) };
	});
	const total = days.reduce((sum, day) => sum + day.events.length, 0);
	return `
    <section class="body-card life-card">
      <div class="body-card-heading">
        <div>
          <h3>This Week</h3>
          <p>${total} logged event${total === 1 ? "" : "s"} this week.</p>
        </div>
      </div>
      <div class="life-date-list">
        ${days
					.map(
						({ dateKey, events }) => `
          <section class="life-date-group">
            <h3>${escapeHtml(formatDateLabel(dateKey, { weekday: true, year: true }))}</h3>
            <div class="life-event-list">${events.length ? events.map(lifeEventRowHtml).join("") : "<p>No activity.</p>"}</div>
          </section>
        `,
					)
					.join("")}
      </div>
    </section>
  `;
}

function lifeMonthHtml() {
	const now = new Date();
	return `
    <section class="body-card life-card life-card--month">
      <div class="body-card-heading">
        <div>
          <h3>${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(now)}</h3>
          <p>Calendar activity from notes, saves, and journal entries.</p>
        </div>
      </div>
      <div id="life-fullcalendar" class="life-fullcalendar" aria-label="${escapeHtml(dashboardDisplayLabel("Life"))} month calendar"></div>
    </section>
  `;
}

function lifeMonthFallbackHtml() {
	const now = new Date();
	const first = new Date(now.getFullYear(), now.getMonth(), 1);
	const start = addDays(first, -first.getDay());
	const month = now.getMonth();
	return `
      <div class="life-month-grid">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span class="life-month-heading">${day}</span>`).join("")}
        ${Array.from({ length: 42 }, (_, index) => {
					const date = addDays(start, index);
					const dateKey = dateKeyFromDate(date);
					const events = eventsForDate(dateKey);
					const inMonth = date.getMonth() === month;
					return `
            <article class="life-month-day${inMonth ? "" : " is-muted"}">
              <span class="life-month-day-date">${date.getDate()}</span>
              <div class="life-month-day-items">
                <strong>${events.length ? `${events.length} event${events.length === 1 ? "" : "s"}` : ""}</strong>
                ${events
									.slice(0, 3)
									.map(
										(event) =>
											`<small><em>${escapeHtml(formatEventTime(event.timestamp))}</em><span>${escapeHtml(dashboardDisplayLabel(event.dashboard))} ${escapeHtml(event.action)}</span></small>`,
									)
									.join("")}
              </div>
            </article>
          `;
				}).join("")}
      </div>
  `;
}

function lifeListHtml() {
	const grouped = new Map();
	lifeEvents().forEach((event) => {
		if (!grouped.has(event.dateKey)) {
			grouped.set(event.dateKey, []);
		}
		grouped.get(event.dateKey).push(event);
	});
	return `
    <section class="body-card life-card">
      <div class="life-date-list">
        ${
					grouped.size
						? Array.from(grouped.entries())
								.map(
									([dateKey, events]) => `
          <section class="life-date-group">
            <h3>${escapeHtml(formatDateLabel(dateKey, { weekday: true, year: true }))}</h3>
            <div class="life-event-list">${events.map(lifeEventRowHtml).join("")}</div>
          </section>
        `,
								)
								.join("")
						: emptyStateHtml(
								"No activity yet.",
								"Create or edit notes to build the app activity calendar.",
							)
				}
      </div>
    </section>
  `;
}

function lifeTodoCardHtml(task) {
	const isProjectTask = task.source === "project-task";
	const id = task.todoId || task.taskId;
	const taskAttrs = `data-source="${escapeHtml(task.source)}" data-id="${escapeHtml(id)}"${isProjectTask ? ` data-project-id="${escapeHtml(task.projectId)}" data-phase-id="${escapeHtml(task.phaseId)}"` : ""}`;
	const path = isProjectTask
		? [task.projectTitle, task.phaseTitle].filter(Boolean).join(" / ")
		: "Standalone";
	const dateLabel = task.assignedDate
		? formatDateLabel(task.assignedDate, { year: true })
		: "No date";
	const notePreview = shortSummary(task.notes, "No notes yet");
	return `
    <article class="life-todo-card${task.status === "complete" ? " is-complete" : ""}${isProjectTask ? " is-project-task" : ""}" data-action="open-life-task" ${taskAttrs} tabindex="0" role="button" aria-label="Open ${escapeHtml(task.title)}">
      <button class="life-todo-check" data-action="toggle-life-task" ${taskAttrs} type="button" aria-label="${task.status === "complete" ? "Reopen" : "Complete"} ${escapeHtml(task.title)}" title="${task.status === "complete" ? "Reopen" : "Complete"}">
        ${iconHtml(task.status === "complete" ? "tabler:circle-check" : "tabler:circle")}
      </button>
      <div class="life-todo-card-main">
        <div class="life-todo-card-title">
          <span class="life-todo-source">${escapeHtml(isProjectTask ? "Project" : "Todo")}</span>
          <h4>${escapeHtml(task.title)}</h4>
        </div>
        <div class="life-todo-card-meta">
          <span>${iconHtml(isProjectTask ? "tabler:folder" : "tabler:list-check")} ${escapeHtml(path)}</span>
          <span>${iconHtml("tabler:calendar")} ${escapeHtml(dateLabel)}</span>
        </div>
        <p class="life-todo-detail">${escapeHtml(notePreview)}</p>
        <div class="life-todo-card-actions">
          <button class="secondary-button" data-action="edit-life-task-notes" ${taskAttrs} type="button">${buttonContent("tabler:notes", "Notes")}</button>
          ${isProjectTask ? `<button class="secondary-button" data-action="open-life-project-task" data-project-id="${escapeHtml(task.projectId)}" data-phase-id="${escapeHtml(task.phaseId)}" data-task-id="${escapeHtml(task.taskId)}" type="button">${buttonContent("tabler:folder-share", "Project")}</button>` : `<button class="secondary-button danger-button" data-action="delete-life-todo" data-id="${escapeHtml(id)}" type="button">${buttonContent("tabler:trash", "Delete")}</button>`}
        </div>
      </div>
    </article>
  `;
}

function lifeTodoHtml() {
	const tasks = lifeTaskItems();
	const open = tasks.filter((task) => task.status !== "complete");
	const complete = tasks.filter((task) => task.status === "complete");
	const projectCount = tasks.filter(
		(task) => task.source === "project-task",
	).length;
	const standaloneCount = tasks.filter((task) => task.source === "todo").length;
	const scheduledCount = tasks.filter(
		(task) => task.assignedDate && task.status !== "complete",
	).length;
	return `
    <section class="body-card life-card life-todo-view">
      <div class="life-todo-overview">
        <div>
          <h3>Todo List</h3>
          <p>${tasks.length ? `${open.length} open / ${complete.length} complete / ${projectCount} from projects` : "Standalone todos and project tasks stay connected here and inside Projects."}</p>
        </div>
        <div class="life-todo-stats" aria-label="Todo summary">
          <span><strong>${open.length}</strong><small>Open</small></span>
          <span><strong>${scheduledCount}</strong><small>Scheduled</small></span>
          <span><strong>${standaloneCount}</strong><small>Solo</small></span>
        </div>
      </div>
      <div class="life-quick-add">
        <input id="life-todo-title" type="text" placeholder="Add a task">
        <button class="primary-button" data-action="add-life-todo" type="button">${buttonContent("tabler:plus", "Add")}</button>
      </div>
      <div class="life-todo-board">
        <section class="life-todo-column life-todo-column--open">
          <div class="life-todo-column-heading">
            <h4>Open Tasks</h4>
            <span>${open.length}</span>
          </div>
          <div class="life-todo-stack">${open.length ? open.map(lifeTodoCardHtml).join("") : "<p>No open todos.</p>"}</div>
        </section>
        <section class="life-todo-column life-todo-column--done">
          <div class="life-todo-column-heading">
            <h4>Done</h4>
            <span>${complete.length}</span>
          </div>
          <div class="life-todo-stack">${complete.length ? complete.map(lifeTodoCardHtml).join("") : "<p>No completed todos.</p>"}</div>
        </section>
      </div>
    </section>
  `;
}

function lifeProjectNavButtonHtml(entity, action, active, attrs = "") {
	const phaseCount = Array.isArray(entity.phases) ? entity.phases.length : null;
	const taskCount = Array.isArray(entity.tasks)
		? entity.tasks.length
		: Array.isArray(entity.phases)
			? entity.phases.reduce(
					(sum, phase) => sum + (phase.tasks?.length || 0),
					0,
				)
			: null;
	const detail = [
		entity.status || "planned",
		phaseCount !== null
			? `${phaseCount} phase${phaseCount === 1 ? "" : "s"}`
			: "",
		taskCount !== null ? `${taskCount} task${taskCount === 1 ? "" : "s"}` : "",
		entity.assignedDate ? formatDateLabel(entity.assignedDate) : "",
	]
		.filter(Boolean)
		.join(" / ");
	return `
    <button class="life-project-nav-button${active ? " is-active" : ""}" data-action="${action}" ${attrs} type="button">
      <strong>${escapeHtml(entity.title)}</strong>
      <small>${escapeHtml(detail)}</small>
    </button>
  `;
}

function lifeAttachmentsHtml(level, attachments = []) {
	return `
    <section class="life-attachments">
      <div class="body-card-heading">
        <div>
          <h3>Attachments</h3>
          <p>Files stay local offline and sync as encrypted Cloud media when Cloud is active.</p>
        </div>
        <button class="secondary-button" data-action="upload-life-attachment" data-level="${level}" type="button">${buttonContent("tabler:paperclip", "Upload")}</button>
      </div>
      <div class="life-attachment-list">
        ${
					attachments.length
						? attachments
								.map(
									(attachment) => `
          <div class="life-attachment-item">
            <a href="#" data-local-file-link="${escapeHtml(attachment.id)}" target="_blank" rel="noopener noreferrer">${iconHtml("tabler:file")} ${escapeHtml(attachment.name || attachment.id)}</a>
            <small>${escapeHtml(formatFileSize(attachment.size))}</small>
            <button class="icon-button danger-button" data-action="delete-life-attachment" data-level="${level}" data-id="${escapeHtml(attachment.id)}" type="button" aria-label="Remove attachment" title="Remove">${iconHtml("tabler:x")}</button>
          </div>
        `,
								)
								.join("")
						: "<p>No attachments yet.</p>"
				}
      </div>
    </section>
  `;
}

function formatFileSize(size) {
	const bytes = Number(size) || 0;
	if (bytes >= 1048576) {
		return `${Math.round(bytes / 104857.6) / 10} MB`;
	}
	if (bytes >= 1024) {
		return `${Math.round(bytes / 102.4) / 10} KB`;
	}
	return `${bytes} B`;
}

function lifeEntityStatusOptions(level, value) {
	const options =
		level === "task"
			? ["todo", "active", "waiting", "complete"]
			: ["planned", "active", "waiting", "complete"];
	return options
		.map(
			(option) =>
				`<option value="${option}"${value === option ? " selected" : ""}>${escapeHtml(option)}</option>`,
		)
		.join("");
}

function lifeProjectDetailHtml(level, entity) {
	const label =
		level === "task" ? "Task" : level === "phase" ? "Phase" : "Project";
	return `
    <div class="life-project-detail">
      <div class="body-card-heading">
        <div>
          <h3>${escapeHtml(label)} Info</h3>
          <p>${escapeHtml(entity.title)}</p>
        </div>
        <div class="action-row">
          <button class="secondary-button" data-action="save-life-project-entity" data-level="${level}" type="button">${buttonContent("tabler:device-floppy", "Save")}</button>
        </div>
      </div>
      <div class="life-project-form">
        <label class="body-field body-field--full">Title<input id="life-entity-title" type="text" value="${escapeHtml(entity.title)}"></label>
        <label class="body-field">Status<select id="life-entity-status">${lifeEntityStatusOptions(level, entity.status)}</select></label>
        <label class="body-field">Assigned To<input id="life-entity-assigned-to" type="text" value="${escapeHtml(entity.assignedTo || "")}" placeholder="Name or role"></label>
        <label class="body-field">Calendar Date<input id="life-entity-assigned-date" type="date" value="${escapeHtml(entity.assignedDate || "")}"></label>
        <label class="body-field body-field--full">Notes<textarea id="life-entity-notes" rows="8" placeholder="Notes, links, decisions, next steps">${escapeHtml(entity.notes || "")}</textarea></label>
      </div>
      ${lifeAttachmentsHtml(level, entity.attachments || [])}
    </div>
  `;
}

function lifeProjectsHtml() {
	const projects = lifeProjects();
	const project = selectedLifeProject();
	const phase = selectedLifePhase(project);
	const task = selectedLifeTask(phase);
	const phaseCount = projects.reduce(
		(sum, item) => sum + (item.phases?.length || 0),
		0,
	);
	const taskCount = projects.reduce(
		(sum, item) =>
			sum +
			(item.phases || []).reduce(
				(phaseSum, phaseItem) => phaseSum + (phaseItem.tasks?.length || 0),
				0,
			),
		0,
	);
	const openTaskCount = projects.reduce(
		(sum, item) =>
			sum +
			(item.phases || []).reduce(
				(phaseSum, phaseItem) =>
					phaseSum +
					(phaseItem.tasks || []).filter(
						(taskItem) => taskItem.status !== "complete",
					).length,
				0,
			),
		0,
	);
	const detail = task
		? lifeProjectDetailHtml("task", task)
		: phase
			? lifeProjectDetailHtml("phase", phase)
			: project
				? lifeProjectDetailHtml("project", project)
				: emptyStateHtml(
						"Select or add a project.",
						"Projects organize phases, tasks, notes, status, assignments, and attachments.",
					);
	return `
    <section class="body-card life-card life-projects-view">
      <div class="life-project-overview">
        <div>
          <h3>Projects</h3>
          <p>${projects.length ? `${projects.length} project${projects.length === 1 ? "" : "s"} / ${phaseCount} phase${phaseCount === 1 ? "" : "s"} / ${taskCount} task${taskCount === 1 ? "" : "s"}` : "Build projects from phases, tasks, notes, and files."}</p>
        </div>
        <div class="life-project-stats" aria-label="Project summary">
          <span><strong>${projects.length}</strong><small>Projects</small></span>
          <span><strong>${openTaskCount}</strong><small>Open</small></span>
          <span><strong>${taskCount - openTaskCount}</strong><small>Done</small></span>
        </div>
      </div>
      <div class="life-project-shell">
        <aside class="life-project-sidebar">
          <div class="life-quick-add">
            <input id="life-project-title" type="text" placeholder="New project">
            <button class="primary-button" data-action="add-life-project" type="button">${buttonContent("tabler:plus", "Add")}</button>
          </div>
          <div class="life-project-nav-section">
            <h4>Projects</h4>
            ${projects.length ? projects.map((item) => lifeProjectNavButtonHtml(item, "select-life-project", item.id === project?.id, `data-id="${escapeHtml(item.id)}"`)).join("") : "<p>No projects yet.</p>"}
          </div>
        </aside>
        <section class="life-project-workflow">
          ${
						project
							? `
            <div class="life-quick-add">
              <input id="life-phase-title" type="text" placeholder="New phase">
              <button class="secondary-button" data-action="add-life-phase" data-project-id="${escapeHtml(project.id)}" type="button">${buttonContent("tabler:plus", "Phase")}</button>
            </div>
            <div class="life-project-nav-section">
              <h4>Phases</h4>
              ${project.phases.length ? project.phases.map((item) => lifeProjectNavButtonHtml(item, "select-life-phase", item.id === phase?.id, `data-id="${escapeHtml(item.id)}"`)).join("") : "<p>No phases yet.</p>"}
            </div>
          `
							: emptyStateHtml(
									"Pick a project.",
									"Choose a project to add phases and tasks.",
								)
					}
          ${
						project && phase
							? `
            <div class="life-quick-add">
              <input id="life-task-title" type="text" placeholder="New task">
              <button class="secondary-button" data-action="add-life-project-task" data-project-id="${escapeHtml(project.id)}" data-phase-id="${escapeHtml(phase.id)}" type="button">${buttonContent("tabler:plus", "Task")}</button>
            </div>
            <div class="life-project-nav-section">
              <h4>Tasks</h4>
              ${phase.tasks.length ? phase.tasks.map((item) => lifeProjectNavButtonHtml(item, "select-life-task", item.id === task?.id, `data-task-id="${escapeHtml(item.id)}"`)).join("") : "<p>No tasks yet.</p>"}
            </div>
          `
							: ""
					}
        </section>
        <section class="life-project-body">
          ${detail}
        </section>
      </div>
    </section>
  `;
}

function _lifeNotesHtml() {
	const notes = lifeNotes();
	return `
    <section class="body-card life-card body-card--notes">
      <div class="body-card-heading">
        <div>
          <h3>Journal Notes</h3>
          <p>Private dated journal entries.</p>
        </div>
        <button class="secondary-button" data-action="new-artifact-note" data-dashboard="Life">${buttonContent("tabler:notes", "New Note")}</button>
      </div>
      ${
				notes.length
					? `
        <div class="section-list body-notes-list">
          ${notes
						.map(
							(noteItem, index) => `
            <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(noteItem.title)}</strong>
              <small>${escapeHtml(shortSummary(noteItem.body, "No journal text yet"))}</small>
              <em>${iconHtml("tabler:calendar")} ${escapeHtml(noteItem.properties?.dateKey || noteDateLabel(noteItem))}</em>
            </button>
          `,
						)
						.join("")}
        </div>
        `
					: emptyStateHtml(
							`No ${dashboardDisplayLabel("Life")} notes yet.`,
							"Add a journal note to track a day, habit, goal, or reflection.",
						)
			}
    </section>
  `;
}

function bodyTimerSwitcherHtml() {
	return `
    <nav class="body-mode-switcher body-timer-switcher" aria-label="${escapeHtml(dashboardDisplayLabel("Body"))} timers">
      ${BODY_TIMER_MODES.map(
				({ key, label, icon }) => `
        <button class="body-mode-button${state.bodyTimerMode === key ? " is-active" : ""}" data-action="set-body-timer-mode" data-mode="${key}" type="button" aria-pressed="${state.bodyTimerMode === key ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `,
			).join("")}
    </nav>
  `;
}

function bodyTimerPanelHtml(key = state.bodyTimerMode) {
	const config = bodyTimerConfig(key);
	const timer = bodyTimerState(key);
	const progress = getBodyTimerProgress(key);
	const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
	return `
    <section class="body-card body-card--timer is-active">
      <div class="body-ring-wrap">
        <svg class="body-ring" viewBox="0 0 220 220" aria-hidden="true">
          <circle class="body-ring-track" cx="110" cy="110" r="80"></circle>
          <circle class="body-ring-value" id="body-timer-${key}-ring" cx="110" cy="110" r="80" style="stroke-dashoffset: ${dashOffset};"></circle>
        </svg>
        <div class="body-ring-center">
          <div class="body-ring-label">${escapeHtml(timer.label)}</div>
          <div class="body-ring-value-text" id="body-timer-${key}-time">${formatDuration(getBodyTimerElapsedMs(key))}</div>
          <div class="body-ring-sub">${timer.active ? config.activeText : config.idleText}</div>
        </div>
      </div>
      <div class="body-form-grid">
        <label class="body-field">${escapeHtml(config.label)} label<input id="body-timer-${key}-label" type="text" value="${escapeHtml(timer.label)}"></label>
        <label class="body-field">${escapeHtml(config.targetLabel)}<input id="body-timer-${key}-target" type="number" min="1" step="1" value="${escapeHtml(bodyTimerTargetInputValue(key, timer))}"></label>
      </div>
      <div class="action-row body-actions">
        <button class="secondary-button" data-action="save-body-timer-settings" data-mode="${key}">${buttonContent("tabler:device-floppy", "Save")}</button>
        ${
					timer.active
						? `<button class="secondary-button danger-button" data-action="stop-body-timer" data-mode="${key}">${buttonContent("tabler:player-stop", config.stopText)}</button>`
						: `<button class="primary-button" data-action="start-body-timer" data-mode="${key}">${buttonContent("tabler:player-play", config.startText)}</button>`
				}
      </div>
      <p class="body-card-note">${timer.lastCompletedHours ? `Last completed: ${timer.lastCompletedHours.toFixed(1)} hours` : config.emptyText}</p>
    </section>
  `;
}

function bodyTimersHtml() {
	return `
    <div class="body-timer-viewer">
      ${bodyTimerSwitcherHtml()}
      ${bodyTimerPanelHtml(state.bodyTimerMode)}
    </div>
  `;
}

function bodyNutritionSwitcherHtml() {
	const modes = [
		["daily", "Daily Tracker", "tabler:clipboard-list"],
		["goals", "Nutrition Goals", "tabler:target-arrow"],
	];
	return `
    <nav class="body-mode-switcher body-nutrition-switcher" aria-label="Nutrition views">
      ${modes
				.map(
					([mode, label, icon]) => `
        <button class="body-mode-button${state.bodyNutritionMode === mode ? " is-active" : ""}" data-action="set-body-nutrition-mode" data-mode="${mode}" type="button" aria-pressed="${state.bodyNutritionMode === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `,
				)
				.join("")}
    </nav>
  `;
}

function nutritionGoalSummaryHtml(nutrition) {
	return `
    <div class="body-macro-row">
      <span>${Math.round(Number(nutrition.protein) || 0)} / ${Math.round(Number(nutrition.targetProtein) || 0)}g protein</span>
      <span>${Math.round(Number(nutrition.carbs) || 0)} / ${Math.round(Number(nutrition.targetCarbs) || 0)}g carbs</span>
      <span>${Math.round(Number(nutrition.fat) || 0)} / ${Math.round(Number(nutrition.targetFat) || 0)}g fat</span>
    </div>
  `;
}

function bodyNutritionDailyHtml(nutrition, nutritionDashOffset) {
	return `
    <section class="body-card body-card--nutrition">
      <div class="body-ring-wrap body-ring-wrap--small">
        <svg class="body-ring" viewBox="0 0 220 220" aria-hidden="true">
          <circle class="body-ring-track" cx="110" cy="110" r="80"></circle>
          <circle class="body-ring-value body-ring-value--nutrition" cx="110" cy="110" r="80" style="stroke-dashoffset: ${nutritionDashOffset};"></circle>
        </svg>
        <div class="body-ring-center">
          <div class="body-ring-label">Daily Tracker</div>
          <div class="body-ring-value-text">${Math.round(Number(nutrition.calories) || 0)}</div>
          <div class="body-ring-sub">of ${Math.round(Number(nutrition.targetCalories) || 0)} cal</div>
        </div>
      </div>
      <div class="body-form-grid body-form-grid--nutrition">
        <label class="body-field">Calories<input id="body-calories" type="number" min="0" step="1" value="${escapeHtml(nutrition.calories)}"></label>
        <label class="body-field">Protein g<input id="body-protein" type="number" min="0" step="1" value="${escapeHtml(nutrition.protein)}"></label>
        <label class="body-field">Carbs g<input id="body-carbs" type="number" min="0" step="1" value="${escapeHtml(nutrition.carbs)}"></label>
        <label class="body-field">Fat g<input id="body-fat" type="number" min="0" step="1" value="${escapeHtml(nutrition.fat)}"></label>
      </div>
      ${nutritionGoalSummaryHtml(nutrition)}
      <label class="body-field body-field--full">Daily note<textarea id="body-nutrition-note" rows="3" placeholder="Meals, cravings, energy, digestion, anything worth remembering">${escapeHtml(nutrition.note || "")}</textarea></label>
      <div class="action-row body-actions">
        <button class="secondary-button" data-action="save-body-nutrition">${buttonContent("tabler:device-floppy", "Save Daily")}</button>
        <button class="secondary-button danger-button" data-action="reset-body-nutrition">${buttonContent("tabler:restore", "Reset Today")}</button>
      </div>
    </section>
  `;
}

function bodyNutritionGoalsHtml(nutrition) {
	return `
    <section class="body-card body-card--nutrition">
      <div class="body-card-heading">
        <div>
          <h3>Nutrition Goals</h3>
          <p>Daily targets used by the tracker.</p>
        </div>
      </div>
      <div class="body-form-grid body-form-grid--nutrition">
        <label class="body-field">Daily calories<input id="body-target-calories" type="number" min="1" step="1" value="${escapeHtml(nutrition.targetCalories)}"></label>
        <label class="body-field">Protein goal g<input id="body-target-protein" type="number" min="0" step="1" value="${escapeHtml(nutrition.targetProtein)}"></label>
        <label class="body-field">Carbs goal g<input id="body-target-carbs" type="number" min="0" step="1" value="${escapeHtml(nutrition.targetCarbs)}"></label>
        <label class="body-field">Fat goal g<input id="body-target-fat" type="number" min="0" step="1" value="${escapeHtml(nutrition.targetFat)}"></label>
      </div>
      <div class="action-row body-actions">
        <button class="secondary-button" data-action="save-body-nutrition-goals">${buttonContent("tabler:device-floppy", "Save Goals")}</button>
      </div>
    </section>
  `;
}

function bodyNutritionHtml(nutrition, nutritionDashOffset) {
	return `
    <div class="body-nutrition-viewer">
      ${bodyNutritionSwitcherHtml()}
      ${
				state.bodyNutritionMode === "goals"
					? bodyNutritionGoalsHtml(nutrition)
					: bodyNutritionDailyHtml(nutrition, nutritionDashOffset)
			}
    </div>
  `;
}

function bodyHtml() {
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (state.artifactMode === "editor" && note) {
		return dashboardNoteEditorHtml(note);
	}
	if (state.artifactMode === "viewer" && note) {
		return artifactReaderHtml(note, `${dashboardDisplayLabel("Body")} note`);
	}

	const notes = rootNotesForDashboard(state.artifactStore, "Body");
	const nutrition = state.bodyTracker.nutrition;
	const nutritionProgress = getNutritionProgress();
	const nutritionDashOffset = RING_CIRCUMFERENCE * (1 - nutritionProgress);

	const panels = {
		timers: bodyTimersHtml(),
		nutrition: bodyNutritionHtml(nutrition, nutritionDashOffset),

		notes: `
      <section class="body-card body-card--notes">
        <div class="body-card-heading">
          <div>
            <h3>Notes</h3>
            <p>These are ${escapeHtml(dashboardDisplayLabel("Body"))} artifacts and appear under ${escapeHtml(dashboardDisplayLabel("Body"))} in the left menu.</p>
          </div>
          <button class="secondary-button" data-action="new-artifact-note" data-dashboard="Body">${buttonContent("tabler:notes", "New Note")}</button>
        </div>
        ${
					notes.length
						? `
          <div class="section-list body-notes-list">
            ${notes
							.map(
								(noteItem, index) => `
              <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <strong>${escapeHtml(noteItem.title)}</strong>
                <small>${escapeHtml(shortSummary(noteItem.body, "No note text yet"))}</small>
                <em>${iconHtml("tabler:notes")} Note</em>
              </button>
            `,
							)
							.join("")}
          </div>
        `
						: emptyStateHtml(
								`No ${dashboardDisplayLabel("Body")} notes yet.`,
								"Add a note to track fasting, meals, symptoms, workouts, or measurements.",
							)
				}
      </section>`,

		workout: `
      <section class="body-card body-card--workout">
        <div class="body-card-heading">
          <div>
            <h3>Workout</h3>
            <p>Simple manual logs for movement, lifting, cardio, or recovery.</p>
          </div>
        </div>
        <div class="body-form-grid body-form-grid--workout">
          <label class="body-field">Name<input id="body-workout-title" type="text" placeholder="Walk, lift, stretch"></label>
          <label class="body-field">Type<input id="body-workout-type" type="text" placeholder="Cardio, strength, mobility"></label>
          <label class="body-field">Minutes<input id="body-workout-minutes" type="number" min="0" step="1" value="30"></label>
          <label class="body-field">Effort 1-10<input id="body-workout-effort" type="number" min="1" max="10" step="1" value="5"></label>
        </div>
        <label class="body-field body-field--full">Notes<textarea id="body-workout-notes" rows="4" placeholder="What did you do? How did it feel?"></textarea></label>
        <div class="action-row body-actions">
          <button class="primary-button" data-action="add-body-workout">${buttonContent("tabler:notes", "Save Workout Note")}</button>
        </div>
        <p class="body-card-note">Saved workouts become ${escapeHtml(dashboardDisplayLabel("Body"))} notes with the workout details written into the note.</p>
      </section>`,
	};

	return panelHtml(`
    ${headerHtml(dashboardDisplayLabel("Body"), "Timers, nutrition, movement, and notes.", "", { titleHtml: dashboardHeaderTitleHtml("Body") })}
    <div class="body-dashboard">
      ${dashboardOrbNavHtml("Body")}
      ${bodyModeSwitcherHtml()}
      <div class="body-mode-panel">
        ${panels[state.bodyMode] || panels.timers}
      </div>
    </div>
  `);
}

function bodyModeSwitcherHtml() {
	const modes = [
		["timers", "Timers", "tabler:clock-hour-4"],
		["nutrition", "Nutrition", "tabler:apple"],
		["workout", "Workout", "tabler:barbell"],
		["notes", "Notes", "tabler:notes"],
	];
	return `
    <nav class="body-mode-switcher body-tool-switcher page-tool-switcher" aria-label="${escapeHtml(dashboardDisplayLabel("Body"))} tools">
      ${modes
				.map(
					([mode, label, icon]) => `
        <button class="body-mode-button${state.bodyMode === mode ? " is-active" : ""}" data-action="set-body-mode" data-mode="${mode}" type="button" aria-pressed="${state.bodyMode === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `,
				)
				.join("")}
    </nav>
  `;
}

function mindHtml(compendium, section) {
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (state.artifactMode === "editor" && note?.dashboard === "Mind") {
		return dashboardNoteEditorHtml(note);
	}
	if (state.artifactMode === "viewer" && note?.dashboard === "Mind") {
		return artifactReaderHtml(note, `${dashboardDisplayLabel("Mind")} note`);
	}
	if (state.mindMode === "compendium-editor" && compendium) {
		return compendiumEditorHtml(compendium);
	}
	if (state.mindMode === "section-editor" && section) {
		return sectionEditorHtml(section);
	}
	if (state.mindMode === "section-viewer" && section) {
		const pageInfo = sectionPageInfo(section.id);
		return panelHtml(`
      <div class="reader-topbar reader-topbar--actions">
        <div class="action-row">
          ${pageActionButton("copy-reader-page", "tabler:copy", "Copy page")}
          ${pageActionButton("edit-section", "tabler:pencil", "Edit section")}
          ${pageActionButton("delete-section", "tabler:trash", "Delete section", { danger: true, data: { id: section.id } })}
          ${pageActionButton("manager", "tabler:x", "Close section viewer", { className: "close-viewer-button" })}
        </div>
      </div>
      <div class="reader-panel">${pageContentHtml(section.title, section.body, readerPageContext(pageInfo, sectionGalleryKey(section.id)))}</div>
    `);
	}
	if (state.mindMode === "reader" && compendium) {
		return compendiumReaderHtml(compendium);
	}
	if (state.mindMode === "manager" && compendium) {
		return compendiumManagerHtml(compendium);
	}
	return mindGridHtml();
}

function truncatedWordsText(value, maxWords = 15) {
	const text = String(value || "")
		.trim()
		.replace(/\s+/g, " ");
	if (!text) {
		return { text: "", truncated: false, wordCount: 0 };
	}
	const words = text.split(" ");
	if (words.length <= maxWords) {
		return { text, truncated: false, wordCount: words.length };
	}
	return {
		text: `${words.slice(0, maxWords).join(" ")}...`,
		truncated: true,
		wordCount: words.length,
	};
}

function compendiumTitleSizeClass(title) {
	const normalized = String(title || "")
		.trim()
		.replace(/\s+/g, " ");
	const words = normalized ? normalized.split(" ").length : 0;
	if (words > 11 || normalized.length > 68) {
		return " is-very-long";
	}
	if (words > 7 || normalized.length > 44) {
		return " is-long";
	}
	return "";
}

function compendiumTitleHtml(compendium, className = "compendium-tile-title") {
	const title = String(compendium?.title || "Untitled compendium");
	const displayTitle = truncatedWordsText(title, 15);
	return `<span class="${className}${compendiumTitleSizeClass(displayTitle.text)}" title="${escapeHtml(title)}">${escapeHtml(displayTitle.text)}</span>`;
}

function compendiumPickerPopoverHtml(perPage) {
	return `
    <div class="compendium-picker-popover" role="dialog" aria-label="All compendiums">
      <div class="compendium-picker-header">
        <div>
          <strong>Compendiums</strong>
          <p>Organize your knowledge with a compendium.</p>
        </div>
      </div>
      ${
				state.compendiums.length
					? `
        <div class="compendium-picker-grid">
          ${state.compendiums
						.map(
							(compendium, index) => `
            <button class="compendium-picker-tile" data-action="select-mind-compendium" data-id="${compendium.id}" data-index="${index}" data-per-page="${perPage}" type="button">
              <b>${String(index + 1).padStart(2, "0")}</b>
              ${compendiumTitleHtml(compendium, "compendium-picker-title")}
            </button>
          `,
						)
						.join("")}
        </div>
      `
					: `<div class="compendium-picker-empty"><strong>No compendiums yet.</strong><span>Add one to start building the grid.</span></div>`
			}
      <button class="compendium-new-button" data-action="new-compendium" type="button">
        ${buttonContent("tabler:plus", "New Compendium")}
      </button>
    </div>
  `;
}

function compendiumListViewHtml() {
	return `
    <section class="compendium-list-view" aria-label="Compendiums">
      <div class="compendium-list-scroll">
        ${state.compendiums
					.map(
						(compendium) => `
          <button class="compendium-list-item" data-action="open-compendium" data-id="${compendium.id}" type="button">
            ${compendiumTitleHtml(compendium, "compendium-list-title")}
          </button>
        `,
					)
					.join("")}
      </div>
    </section>
  `;
}

function mindGridHtml() {
	const columns = mindCompendiumColumns();
	const shouldUseListView = columns === 1;
	const perPage = shouldUseListView
		? Math.max(1, state.compendiums.length)
		: mindCompendiumsPerPage();
	const shouldPage = !shouldUseListView && state.compendiums.length > perPage;
	const pages = shouldUseListView
		? [state.compendiums]
		: chunkItems(state.compendiums, perPage);
	const maxPage = Math.max(0, pages.length - 1);
	const page = mindCompendiumPage(maxPage);
	const hasPrev = shouldPage && page > 0;
	const hasNext = shouldPage && page < maxPage;
	const currentStart = state.compendiums.length ? page * perPage + 1 : 0;
	const currentEnd = state.compendiums.length
		? Math.min(state.compendiums.length, currentStart + perPage - 1)
		: 0;
	return panelHtml(`
    <div class="scroll-area mind-grid-scroll">
      ${headerHtml(dashboardDisplayLabel("Mind"), "Organize your knowledge with a compendium.", "", { titleHtml: dashboardHeaderTitleHtml("Mind") })}
      ${dashboardOrbNavHtml("Mind")}
      ${
				state.compendiums.length
					? `
        ${
					shouldUseListView
						? compendiumListViewHtml()
						: `<section class="compendium-rotator${state.mindCompendiumPickerOpen ? " is-picker-open" : ""}" aria-label="Compendiums" style="--compendium-columns: ${columns};">
          <div class="compendium-rotator-stage${shouldPage ? "" : " compendium-rotator-stage--single-page"}">
            ${
							shouldPage
								? `<button class="compendium-rotator-edge compendium-rotator-edge--prev${hasPrev ? " is-available" : ""}" data-action="mind-compendium-page" data-direction="prev" data-max-page="${maxPage}" type="button" aria-label="Previous compendiums"${hasPrev ? "" : " disabled"}>
              ${iconHtml("tabler:chevron-left")}
            </button>`
								: ""
						}
            <div class="compendium-rotator-window">
              <div class="compendium-rotator-track" style="--compendium-page: ${page};">
                ${pages
									.map(
										(compendiums, pageIndex) => `
                  <article class="compendium-rotator-slide${pageIndex === page ? " is-active" : ""}">
                    <div class="compendium-rotator-row">
                      ${compendiums
												.map((compendium, itemIndex) => {
													const compendiumNumber = itemIndex + 1;
													return `
                        <button class="compendium-tile" data-action="open-compendium" data-id="${compendium.id}">
                          <b>${String(compendiumNumber).padStart(2, "0")}</b>
                          ${compendiumTitleHtml(compendium)}
                          <small>${compendium.sections.length} section${compendium.sections.length === 1 ? "" : "s"}</small>
                          <em>edited ${escapeHtml(compendium.edited)}</em>
                        </button>
                      `;
												})
												.join("")}
                    </div>
                  </article>
                `,
									)
									.join("")}
              </div>
            </div>
            ${
							shouldPage
								? `<button class="compendium-rotator-edge compendium-rotator-edge--next${hasNext ? " is-available" : ""}" data-action="mind-compendium-page" data-direction="next" data-max-page="${maxPage}" type="button" aria-label="Next compendiums"${hasNext ? "" : " disabled"}>
              ${iconHtml("tabler:chevron-right")}
            </button>`
								: ""
						}
            ${state.mindCompendiumPickerOpen ? compendiumPickerPopoverHtml(perPage) : ""}
          </div>
        </section>`
				}
      `
					: `<div class="compendium-empty-wrap">${emptyStateHtml("No compendiums yet.", `Add the first compendium to begin organizing ${dashboardDisplayLabel("Mind")}.`)}${state.mindCompendiumPickerOpen ? compendiumPickerPopoverHtml(perPage) : ""}</div>`
			}
      <div class="compendium-grid-controls">
        ${
					shouldUseListView
						? `<button class="compendium-new-button" data-action="new-compendium" type="button">
          ${buttonContent("tabler:plus", "New Compendium")}
        </button>`
						: `<button class="reader-page-indicator compendium-page-indicator" data-action="toggle-mind-compendium-picker" type="button" aria-label="${state.mindCompendiumPickerOpen ? "Close compendium overview" : "Open compendium overview"}" aria-expanded="${state.mindCompendiumPickerOpen ? "true" : "false"}">
          <span class="reader-page-dot reader-page-dot--side${hasPrev ? " is-available" : ""}" aria-hidden="true"></span>
          <span class="reader-page-dot reader-page-dot--current" aria-label="Compendiums ${currentStart} through ${currentEnd} of ${state.compendiums.length}"></span>
          <span class="reader-page-dot reader-page-dot--side${hasNext ? " is-available" : ""}" aria-hidden="true"></span>
        </button>`
				}
      </div>
    </div>
  `);
}

function compendiumManagerHtml(compendium) {
	const actions = `
    <div class="action-row">
      <button class="secondary-button" data-action="reader">${buttonContent("tabler:book-2", "Read")}</button>
      ${pageActionButton("edit-compendium", "tabler:pencil", "Edit compendium")}
      <button class="secondary-button" data-action="add-section">${buttonContent("tabler:plus", "Add")}</button>
      ${pageActionButton("delete-compendium", "tabler:trash", "Delete compendium", { danger: true, data: { id: compendium.id } })}
    </div>
  `;
	return panelHtml(`
    ${headerHtml(compendium.title, "Sections are ordered bottom to top. Start at 01 and work upward.", actions)}
    ${compendium.sections.length ? sectionListHtml(compendium) : emptyStateHtml("No sections yet.", "Add the first section to begin building the compendium.")}
  `);
}

function sectionListHtml(compendium) {
	return `
    <div class="scroll-area">
      <div class="section-list" data-section-sort-list data-compendium-id="${escapeHtml(compendium.id)}">
        ${compendium.sections
					.map(
						(section, index) => `
          <button class="section-row" data-action="open-section" data-id="${escapeHtml(section.id)}" data-section-row>
            <span class="section-number-handle" data-section-drag-handle data-id="${escapeHtml(section.id)}" title="Drag to reorder" aria-label="Drag section ${String(compendium.sections.length - index).padStart(2, "0")} to reorder">${String(compendium.sections.length - index).padStart(2, "0")}</span>
            <strong>${escapeHtml(section.title)}</strong>
            <small>${escapeHtml(section.body.replace(/[#>*`-]/g, ""))}</small>
          </button>
        `,
					)
					.join("")}
      </div>
    </div>
  `;
}

function compendiumReaderHtml(compendium) {
	const totalPages = compendium.sections.length + 1;
	const pages = [
		{
			key: "cover",
			body: `
        <section class="reader-section reader-section--cover">
          ${pageContentHtml(compendium.title, compendium.body, readerPageContext({ current: 1, total: totalPages, skipPageNumber: true }, compendiumCoverGalleryKey(compendium.id)))}
        </section>
      `,
		},
		...compendium.sections.map((section, index) => ({
			key: section.id,
			body: `
        <section class="reader-section">
          ${pageContentHtml(section.title, section.body, readerPageContext({ current: index + 2, total: totalPages, skipPageNumber: true }, compendiumSectionGalleryKey(compendium.id, section.id)))}
        </section>
      `,
		})),
	];
	const page = compendiumReaderPage(compendium);
	const maxPage = Math.max(0, pages.length - 1);
	const hasPrev = page > 0;
	const hasNext = page < maxPage;
	return panelHtml(`
    <div class="reader-topbar reader-topbar--actions">
      <div class="action-row">
        ${pageActionButton("copy-reader-page", "tabler:copy", "Copy page")}
        ${pageActionButton("edit-compendium", "tabler:pencil", "Edit compendium")}
        ${pageActionButton("delete-compendium", "tabler:trash", "Delete compendium", { danger: true, data: { id: compendium.id } })}
        ${pageActionButton("manager", "tabler:x", "Close reader", { className: "close-viewer-button" })}
      </div>
    </div>
    <section class="reader-book reader-book--compendium" aria-label="${escapeHtml(compendium.title)} reader">
      <div class="reader-slider">
        <button class="reader-slider-edge reader-slider-edge--prev${hasPrev ? " is-available" : ""}" data-action="compendium-reader-page" data-id="${escapeHtml(compendium.id)}" data-direction="prev" data-max-page="${maxPage}" type="button" aria-label="Previous page"${hasPrev ? "" : " disabled"}>
          ${iconHtml("tabler:chevron-left")}
        </button>
        <div class="reader-book-window">
          <div class="reader-book-inner" style="--reader-page: ${page};">
            ${pages
							.map(
								(item, index) => `
              <article class="reader-slide${index === page ? " is-active" : ""}" data-reader-page="${index}">
                ${item.body}
              </article>
            `,
							)
							.join("")}
          </div>
        </div>
        <button class="reader-slider-edge reader-slider-edge--next${hasNext ? " is-available" : ""}" data-action="compendium-reader-page" data-id="${escapeHtml(compendium.id)}" data-direction="next" data-max-page="${maxPage}" type="button" aria-label="Next page"${hasNext ? "" : " disabled"}>
          ${iconHtml("tabler:chevron-right")}
        </button>
      </div>
      <div class="reader-page-indicator" aria-label="Reader page position">
        <span class="reader-page-label">${escapeHtml(`Page ${page + 1} of ${pages.length}`)}</span>
        <span class="reader-page-dots" aria-hidden="true">
          <span class="reader-page-dot reader-page-dot--side${hasPrev ? " is-available" : ""}"></span>
          <span class="reader-page-dot reader-page-dot--current"></span>
          <span class="reader-page-dot reader-page-dot--side${hasNext ? " is-available" : ""}"></span>
        </span>
      </div>
    </section>
  `);
}

function sectionPageInfo(sectionId) {
	const compendium = state.compendiums.find((item) =>
		item.sections.some((section) => section.id === sectionId),
	);
	if (!compendium) {
		return { current: 1, total: 1 };
	}
	const index = compendium.sections.findIndex(
		(section) => section.id === sectionId,
	);
	return {
		current: index >= 0 ? index + 1 : 1,
		total: Math.max(1, compendium.sections.length),
	};
}

function editorPageInfo(saveAction, id) {
	if (saveAction === "save-section") {
		const info = sectionPageInfo(id);
		return { ...info, label: "Editing page" };
	}
	return { current: 1, total: 1, label: "Editing page" };
}

function compendiumEditorHtml(compendium) {
	return editorHtml({
		title: "Edit Compendium",
		subtitle: "Title and body. Sections are managed inside the compendium.",
		saveAction: "save-compendium",
		cancelAction: "manager",
		id: compendium.id,
		valueTitle: compendium.title,
		valueBody: compendium.body,
	});
}

function sectionEditorHtml(section) {
	return editorHtml({
		title: "",
		subtitle: "",
		saveAction: "save-section",
		cancelAction: "section-viewer",
		id: section.id,
		valueTitle: section.title,
		valueBody: section.body,
		sectionChrome: true,
	});
}

function dashboardNoteEditorHtml(note) {
	if (note.dashboard === "Life" && note.properties?.role === "life-journal") {
		return lifeJournalEditorHtml(note);
	}
	const isThought = note.properties?.role === "thought";
	const isGoalProgress = note.properties?.role === "goal-progress";
	const dashboardName = dashboardDisplayLabel(note.dashboard);
	return editorHtml({
		title: isGoalProgress
			? "Edit Goal Progress"
			: isThought
				? "Edit Thought"
				: "Edit Note",
		subtitle: isGoalProgress
			? `${dashboardName} goal / ${note.properties?.goalLabel || "Goal progress"}`
			: isThought
				? `${dashboardName} thought / ${note.properties?.thoughtLabel || "Quick thought"}`
				: `${dashboardName} artifact note. It uses the same root schema as every dashboard.`,
		saveAction: "save-artifact-note",
		cancelAction: "artifact-viewer",
		id: note.id,
		statusLabel: note.properties?.isNewDraft ? "Unsaved" : "Saved",
		valueTitle: note.title,
		valueBody: note.body,
	});
}

function editorSaveStatusHtml(label) {
	return label
		? `<span class="editor-save-status">(${escapeHtml(label)})</span>`
		: "";
}

function lifeTrackerSelectorHtml(kind, label, selectedIds) {
	const normalizedKind = trackerKind(kind);
	const trackers = lifeTrackerSettings(normalizedKind);
	const selected = new Set(selectedIds);
	return `
      <fieldset class="life-tracker-fieldset life-tracker-fieldset--${escapeHtml(normalizedKind)}">
        <legend>${escapeHtml(label)}</legend>
        <div class="life-tracker-grid">
          ${
						trackers.length
							? trackers
									.map(
										(tracker) => `
            <label class="life-tracker-pill">
              <input data-life-tracker="${escapeHtml(normalizedKind)}" type="checkbox" value="${escapeHtml(tracker.id)}"${selected.has(tracker.id) ? " checked" : ""}>
              <span class="life-tracker-icon">${trackerIconHtml(tracker.icon)}</span>
              <span class="life-tracker-label">${escapeHtml(tracker.label)}</span>
            </label>
          `,
									)
									.join("")
							: `<p class="life-tracker-empty">No ${escapeHtml(label.toLowerCase())} yet.</p>`
					}
        </div>
      </fieldset>
    `;
}

function lifeJournalEditorHtml(note) {
	const draftKey = editorDraftKeyFor("save-artifact-note", note.id);
	const dateKey = editorDraftFieldValue(
		draftKey,
		"life-entry-date",
		note.properties?.dateKey || todayDateKey(),
	);
	const title = editorDraftFieldValue(draftKey, "editor-title", note.title);
	const body = editorDraftFieldValue(draftKey, "editor-body", note.body);
	return panelHtml(`
      ${headerHtml(
				"Edit Life Note",
				"Private journal entry.",
				`
      <div class="action-row">
        ${pageActionButton("delete-artifact-note", "tabler:trash", "Delete note", { danger: true, data: { id: note.id } })}
        ${pageActionButton("artifact-viewer", "tabler:x", "Close editor", { className: "close-viewer-button" })}
      </div>
    `,
			)}
    <form class="editor-form life-editor-form" data-editor-draft-key="${escapeHtml(draftKey)}">
      ${pageNumberOverlayHtml({ current: 1, total: 1, label: "Editing page" })}
      ${editorSaveStatusHtml(note.properties?.isNewDraft ? "Unsaved" : "Saved")}
      <input id="editor-title" value="${escapeHtml(title)}" aria-label="Title">
      <div class="life-editor-grid">
        <label class="body-field">Date<input id="life-entry-date" type="date" value="${escapeHtml(dateKey)}"></label>
      </div>
      <label class="body-field editor-body-field">Journal
        <span class="editor-body-wrap has-image-button">
          <textarea id="editor-body" aria-label="Body" placeholder="What happened today? What needs attention?">${escapeHtml(body)}</textarea>
          ${cameraOrUploadInputHtml()}
        </span>
      </label>
      <div class="editor-footer-actions">
        <button class="secondary-button" data-action="artifact-viewer" type="button">${buttonContent("tabler:x", "Cancel")}</button>
        <button class="secondary-button" data-action="save-artifact-note" data-id="${note.id}" type="button">${buttonContent("tabler:device-floppy", "Save")}</button>
      </div>
    </form>
  `);
}

function editorHtml({
	title,
	subtitle,
	saveAction,
	cancelAction,
	id,
	statusLabel = "",
	valueTitle,
	valueBody,
	sectionChrome = false,
}) {
	const draftKey = editorDraftKeyFor(saveAction, id);
	const displayTitle = editorDraftFieldValue(
		draftKey,
		"editor-title",
		valueTitle,
	);
	const displayBody = editorDraftFieldValue(draftKey, "editor-body", valueBody);
	const pageInfo = editorPageInfo(saveAction, id);
	const bodyHasCamera = !sectionChrome;
	return panelHtml(`
    ${
			sectionChrome
				? ""
				: headerHtml(
						title,
						subtitle,
						`
      <div class="action-row">
        ${saveAction === "save-artifact-note" ? pageActionButton("delete-artifact-note", "tabler:trash", "Delete note", { danger: true, data: { id } }) : ""}
        ${saveAction === "save-compendium" ? pageActionButton("delete-compendium", "tabler:trash", "Delete compendium", { danger: true, data: { id } }) : ""}
        ${saveAction === "save-section" ? pageActionButton("delete-section", "tabler:trash", "Delete section", { danger: true, data: { id } }) : ""}
        ${pageActionButton(cancelAction, "tabler:x", "Close editor", { className: "close-viewer-button" })}
      </div>
    `,
					)
		}
    <form class="editor-form${sectionChrome ? " editor-form--section" : ""}" data-editor-draft-key="${escapeHtml(draftKey)}">
      ${
				sectionChrome
					? `
        <nav class="section-editor-floating-nav" aria-label="Section editor actions">
          ${cameraOrUploadInputHtml({ className: "page-action-button section-editor-nav-button", label: "Add photo" })}
          ${pageActionButton(saveAction, "tabler:device-floppy", "Save section", { data: { id } })}
          ${pageActionButton("delete-section", "tabler:trash", "Delete section", { data: { id } })}
          ${pageActionButton(cancelAction, "tabler:x", "Exit section editor", { className: "close-viewer-button" })}
        </nav>
      `
					: ""
			}
      ${pageNumberOverlayHtml(pageInfo)}
      ${editorSaveStatusHtml(statusLabel)}
      <input id="editor-title" value="${escapeHtml(displayTitle)}" aria-label="Title">
      <div class="editor-body-wrap${bodyHasCamera ? " has-image-button" : ""}">
        <textarea id="editor-body" aria-label="Body">${escapeHtml(displayBody)}</textarea>
        ${bodyHasCamera ? cameraOrUploadInputHtml() : ""}
      </div>
      ${
				sectionChrome
					? ""
					: `<div class="editor-footer-actions">
        <button class="secondary-button" data-action="${cancelAction}" type="button">${buttonContent("tabler:x", "Cancel")}</button>
        <button class="secondary-button" data-action="${saveAction}" data-id="${id}" type="button">${buttonContent("tabler:device-floppy", "Save")}</button>
      </div>`
			}
    </form>
  `);
}

function cameraOrUploadInputHtml(options = {}) {
	const className =
		options.className || "editor-image-button editor-camera-button";
	const label = options.label || "Add photo";
	return `
    <button class="icon-button ${escapeHtml(className)}" data-editor-camera-button type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      ${iconHtml("tabler:camera")}
    </button>
  `;
}

function panelHtml(inner) {
	return `<div class="panel">${inner}</div>`;
}

function headerHtml(title, subtitle, actions = "", options = {}) {
	const renderedTitle = options.titleHtml || escapeHtml(title);
	return `
    <header class="panel-header">
      ${actions ? `<div class="panel-header-actions">${actions}</div>` : ""}
      <div class="panel-header-copy">
        <h2>${renderedTitle}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>
    </header>
  `;
}

function cameraModalHtml() {
	if (!state.cameraOpen) {
		return "";
	}
	const message =
		state.cameraError || state.cameraStatus || "Opening camera...";
	return `
    <div class="camera-modal" data-camera-modal role="dialog" aria-modal="true" aria-labelledby="camera-modal-title" tabindex="-1">
      <section class="camera-panel">
        <header class="camera-panel-header">
          <div>
            <h2 id="camera-modal-title">Camera</h2>
            <p>${escapeHtml(cameraTargetLabel())}</p>
          </div>
          <button class="icon-button" data-action="close-camera" type="button" aria-label="Close camera" title="Close camera">${iconHtml("tabler:x")}</button>
        </header>
        <div class="camera-preview">
          <video data-camera-video autoplay playsinline muted></video>
          <div class="camera-placeholder" data-camera-placeholder>${iconHtml("tabler:camera")}</div>
        </div>
        <p class="camera-status${state.cameraError ? " has-error" : ""}" data-camera-status role="status">${escapeHtml(message)}</p>
        <div class="camera-actions">
          <button class="secondary-button" data-action="upload-camera-target" type="button">${buttonContent("tabler:photo", "Upload")}</button>
          <button class="secondary-button" data-action="close-camera" type="button">${buttonContent("tabler:x", "Cancel")}</button>
          <button class="primary-button" data-action="capture-camera" data-camera-capture type="button" disabled>${buttonContent("tabler:camera", "Capture")}</button>
        </div>
      </section>
    </div>
  `;
}

function timerModalHtml() {
	if (!state.timerOpen) {
		return "";
	}
	const timerState = state.timerState || normalizeTimerState();
	const settings = normalizeTimerSettings(state.timerSettings);
	const customMins = Math.floor((timerState.original || MENU_TIMER_DEFAULT_SECONDS) / 60);
	const customSecs = (timerState.original || MENU_TIMER_DEFAULT_SECONDS) % 60;
	return `
    <div class="timer-modal" data-timer-modal role="dialog" aria-modal="true" aria-labelledby="timer-modal-title" tabindex="-1">
      <section class="timer-panel${timerState.running ? " is-running" : ""}">
        <header class="timer-panel-header">
          <div>
            <h2 id="timer-modal-title">Timer</h2>
            <p>Set a focused countdown from the side menu.</p>
          </div>
          <button class="icon-button" data-action="close-timer" type="button" aria-label="Close timer" title="Close timer">${iconHtml("tabler:x")}</button>
        </header>
        <div class="timer-display${timerState.running ? " is-running" : ""}" data-timer-display aria-live="polite">${escapeHtml(formatTimerDisplay(timerState.remaining))}</div>
        <div class="timer-presets" aria-label="Timer presets">
          ${MENU_TIMER_PRESETS.map(
						(preset) => `
          <button class="secondary-button timer-preset-button${timerState.original === preset.seconds ? " is-active" : ""}" data-action="timer-set-preset" data-seconds="${preset.seconds}" type="button">${escapeHtml(preset.label)}</button>
        `,
					).join("")}
        </div>
        <div class="timer-custom-row">
          <label class="timer-field-label" for="timer-custom-mins">Custom</label>
          <input id="timer-custom-mins" data-timer-custom-mins type="number" min="0" max="99" inputmode="numeric" value="${customMins}" aria-label="Timer minutes">
          <span>min</span>
          <input data-timer-custom-secs type="number" min="0" max="59" inputmode="numeric" value="${customSecs}" aria-label="Timer seconds">
          <span>sec</span>
          <button class="secondary-button" data-action="timer-set-custom" type="button">${buttonContent("tabler:check", "Set")}</button>
        </div>
        <div class="timer-settings-grid">
          <label class="timer-field">
            <span>Alarm</span>
            <select data-timer-alarm-select aria-label="Alarm sound">
              ${MENU_TIMER_ALARMS.map(
								(alarm) =>
									`<option value="${escapeHtml(alarm.id)}"${settings.alarm === alarm.id ? " selected" : ""}>${escapeHtml(alarm.label)}</option>`,
							).join("")}
            </select>
          </label>
          <button class="secondary-button timer-test-button" data-action="timer-test-sound" type="button">${buttonContent("tabler:volume", "Test sound")}</button>
          <label class="timer-field timer-volume-field">
            <span>Volume</span>
            <input data-timer-volume-slider type="range" min="0" max="100" value="${settings.volume}" aria-label="Alarm volume">
            <strong data-timer-volume-label>${settings.volume}%</strong>
          </label>
        </div>
        <div class="timer-actions">
          <button class="primary-button" data-action="timer-start-pause" data-timer-start-pause type="button" aria-label="${escapeHtml(timerButtonLabel(timerState))} timer">${buttonContent(timerState.running ? "tabler:player-pause" : "tabler:player-play", timerButtonLabel(timerState))}</button>
          <button class="secondary-button" data-action="timer-reset" type="button">${buttonContent("tabler:rotate-clockwise", "Reset")}</button>
        </div>
      </section>
    </div>
  `;
}

function emptyStateHtml(title, body) {
	return `
    <div class="empty-state">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
      </div>
    </div>
  `;
}

function hideThoughtTooltip() {
	window.clearTimeout(thoughtTooltipLongPressTimer);
	thoughtTooltipLongPressTimer = null;
	if (thoughtTooltipCleanup) {
		thoughtTooltipCleanup();
		thoughtTooltipCleanup = null;
	}
	document.querySelector(".thought-tooltip")?.remove();
}

function showThoughtTooltip(target) {
	if (document.querySelector(".guided-tip-bubble")) {
		return;
	}
	const label = simpleTooltipText(target?.dataset?.thoughtTooltip);
	if (!label) {
		return;
	}
	hideThoughtTooltip();
	const tooltip = document.createElement("div");
	tooltip.className = "thought-tooltip";
	tooltip.setAttribute("role", "tooltip");
	const thoughtColor = window
		.getComputedStyle(target)
		.getPropertyValue("--thought-color")
		.trim();
	if (thoughtColor) {
		tooltip.style.setProperty("--thought-color", thoughtColor);
	}
	tooltip.innerHTML = `<span>${escapeHtml(label)}</span><i aria-hidden="true"></i>`;
	document.body.append(tooltip);

	const update = () => {
		computePosition(target, tooltip, {
			placement: "top",
			strategy: "fixed",
			middleware: [offset(10), flip(), shift({ padding: 8 })],
		}).then(({ x, y }) => {
			Object.assign(tooltip.style, {
				left: `${x}px`,
				top: `${y}px`,
			});
			tooltip.dataset.ready = "true";
		});
	};
	thoughtTooltipCleanup = autoUpdate(target, tooltip, update);
	update();
}

function hideGuidedTip() {
	if (guidedTipCleanup) {
		guidedTipCleanup();
		guidedTipCleanup = null;
	}
	if (guidedTipDocumentClickHandler) {
		document.removeEventListener("click", guidedTipDocumentClickHandler, true);
		guidedTipDocumentClickHandler = null;
	}
	if (guidedTipTarget && guidedTipTargetClickHandler) {
		guidedTipTarget.removeEventListener(
			"click",
			guidedTipTargetClickHandler,
			true,
		);
		guidedTipTarget = null;
		guidedTipTargetClickHandler = null;
	}
	if (guidedTipDocumentKeyHandler) {
		document.removeEventListener("keydown", guidedTipDocumentKeyHandler, true);
		guidedTipDocumentKeyHandler = null;
	}
	document.querySelector(".guided-tip-bubble")?.remove();
	app.querySelectorAll(".is-guided-tip-target").forEach((element) => {
		element.classList.remove("is-guided-tip-target");
	});
}

function navigationTourRouteState(route) {
	const next = {
		mobileMenuOpen: false,
		sidebarSubmenu: "",
		flipped: null,
		artifactMode: "grid",
		selectedArtifactId: null,
		selectedSpiritBookKey: null,
	};
	if (route === "dashboard-menu") {
		return {
			...next,
			active: "Dashboard",
			mobileMenuOpen: true,
			mindMode: "grid",
			selectedCompendiumId: null,
			selectedSectionId: null,
		};
	}
	if (DASHBOARD_LABELS.includes(route)) {
		return {
			...next,
			active: route,
			mindMode: route === "Mind" ? "grid" : state.mindMode,
			selectedCompendiumId: route === "Mind" ? null : state.selectedCompendiumId,
			selectedSectionId: route === "Mind" ? null : state.selectedSectionId,
		};
	}
	return {
		...next,
		active: "Dashboard",
		mindMode: "grid",
		selectedCompendiumId: null,
		selectedSectionId: null,
	};
}

function setNavigationTourStep(index) {
	const maxIndex = NAVIGATION_TOUR_STEPS.length - 1;
	const nextIndex = Math.max(0, Math.min(Number(index) || 0, maxIndex));
	const step = NAVIGATION_TOUR_STEPS[nextIndex];
	setState({
		...navigationTourRouteState(step.route),
		navigationTour: {
			active: true,
			index: nextIndex,
		},
	});
}

function startNavigationTour(launcherElement = null) {
	navigationTourReturnFocusElement =
		launcherElement ||
		(document.activeElement instanceof HTMLElement ? document.activeElement : null);
	setNavigationTourStep(0);
}

function focusNavigationTourLauncher() {
	window.requestAnimationFrame(() => {
		const target =
			(navigationTourReturnFocusElement?.isConnected &&
				navigationTourReturnFocusElement) ||
			app.querySelector("[data-action='start-navigation-tour']") ||
			app.querySelector("[data-tab='getting-started']") ||
			app.querySelector(".content-stage");
		navigationTourReturnFocusElement = null;
		if (target && typeof target.focus === "function") {
			target.focus({ preventScroll: true });
		}
	});
}

function stopNavigationTour({ restoreFocus = true } = {}) {
	hideGuidedTip();
	const canRestoreDirectly =
		restoreFocus && navigationTourReturnFocusElement?.isConnected;
	const nextState = canRestoreDirectly
		? { navigationTour: null }
		: {
				navigationTour: null,
				active: "Dashboard",
				settingsTab: "getting-started",
				mobileMenuOpen: true,
				sidebarSubmenu: "settings",
				flipped: null,
				artifactMode: "grid",
				selectedArtifactId: null,
				selectedCompendiumId: null,
				selectedSectionId: null,
				selectedSpiritBookKey: null,
			};
	setState(nextState);
	if (restoreFocus) {
		focusNavigationTourLauncher();
	}
}

function advanceNavigationTour() {
	const currentIndex = Number(state.navigationTour?.index) || 0;
	if (currentIndex >= NAVIGATION_TOUR_STEPS.length - 1) {
		stopNavigationTour();
		return;
	}
	setNavigationTourStep(currentIndex + 1);
}

function retreatNavigationTour() {
	const currentIndex = Number(state.navigationTour?.index) || 0;
	setNavigationTourStep(currentIndex - 1);
}

function isElementVisible(element) {
	if (!element || element.closest("[hidden], [inert]")) {
		return false;
	}
	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) {
		return false;
	}
	const style = window.getComputedStyle(element);
	return (
		style.display !== "none" &&
		style.visibility !== "hidden" &&
		style.opacity !== "0"
	);
}

function activeGuidedTip() {
	if (!state.navigationTour?.active) {
		return null;
	}
	const index = Math.max(
		0,
		Math.min(
			Number(state.navigationTour.index) || 0,
			NAVIGATION_TOUR_STEPS.length - 1,
		),
	);
	const step = NAVIGATION_TOUR_STEPS[index];
	const target = app.querySelector(step.selector);
	return {
		...step,
		index,
		total: NAVIGATION_TOUR_STEPS.length,
		target: isElementVisible(target) ? target : app.querySelector(".content-stage"),
	};
}

function cssPixelVar(name, fallback = 0) {
	const raw = window
		.getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	const value = Number.parseFloat(raw);
	return Number.isFinite(value) ? value : fallback;
}

function navigationTourSafePadding() {
	const contentPad = cssPixelVar("--content-pad", 16);
	const safeTop = cssPixelVar("--safe-top", 0);
	const safeRight = cssPixelVar("--safe-right", 0);
	const safeBottom = cssPixelVar("--safe-bottom", 0);
	const safeLeft = cssPixelVar("--safe-left", 0);
	const mobile = window.matchMedia(MOBILE_MENU_QUERY).matches;
	const mobileMenuHeight =
		app.querySelector(".mobile-menu-toggle")?.getBoundingClientRect().height || 0;
	const side = Math.max(16, Math.min(contentPad, 28));
	return {
		top: Math.max(18, safeTop + side),
		right: Math.max(16, safeRight + side),
		bottom: Math.max(
			18,
			safeBottom + side + (mobile ? mobileMenuHeight + contentPad : 0),
		),
		left: Math.max(16, safeLeft + side),
	};
}

function navigationTourPlacement(tip) {
	const mobile = window.matchMedia(MOBILE_MENU_QUERY).matches;
	if (tip.id === "menu-button") {
		return "top";
	}
	if (mobile && ["menu-open", "menu-groups"].includes(tip.id)) {
		return "left-start";
	}
	if (["mind", "body", "spirit", "life", "dashboard-orbs"].includes(tip.id)) {
		return "bottom-start";
	}
	return tip.placement || "top";
}

function focusGuidedTip(bubble, tip) {
	window.requestAnimationFrame(() => {
		const primary = bubble.querySelector(
			tip.index >= tip.total - 1
				? "[data-navigation-tour-action='done']"
				: "[data-navigation-tour-action='next']",
		);
		(primary || bubble).focus({ preventScroll: true });
	});
}

function handleNavigationTourControl(action) {
	if (action === "back") {
		retreatNavigationTour();
		return;
	}
	if (action === "skip" || action === "done") {
		stopNavigationTour();
		return;
	}
	advanceNavigationTour();
}

function isNavigationTourTargetClick(event, target) {
	return Boolean(target && event.target?.closest?.(".is-guided-tip-target"));
}

function showGuidedTip(tip) {
	if (!tip?.target) {
		return;
	}
	hideThoughtTooltip();
	hideGuidedTip();
	const bubble = document.createElement("div");
	bubble.className = "guided-tip-bubble";
	bubble.setAttribute("role", "dialog");
	bubble.setAttribute("tabindex", "-1");
	bubble.setAttribute("aria-labelledby", "guided-tip-copy");
	bubble.innerHTML = `
    <div class="guided-tip-copy" id="guided-tip-copy">${escapeHtml(simpleTooltipText(tip.label, 18))}</div>
    <div class="guided-tip-footer">
      <span class="guided-tip-count">${escapeHtml(`Step ${tip.index + 1} of ${tip.total}`)}</span>
      <div class="guided-tip-controls" aria-label="Walkthrough controls">
        <button class="guided-tip-action" data-navigation-tour-action="back" type="button"${tip.index <= 0 ? " disabled" : ""}>Back</button>
        <button class="guided-tip-action guided-tip-action--primary" data-navigation-tour-action="${tip.index >= tip.total - 1 ? "done" : "next"}" type="button">${tip.index >= tip.total - 1 ? "Done" : "Next"}</button>
        <button class="guided-tip-action" data-navigation-tour-action="skip" type="button">Skip</button>
      </div>
    </div>
  `;
	bubble.setAttribute(
		"aria-label",
		`${simpleTooltipText(tip.label, 18)}. Step ${tip.index + 1} of ${tip.total}.`,
	);
	document.body.append(bubble);
	tip.target.classList.add("is-guided-tip-target");
	guidedTipTarget = tip.target;
	guidedTipDocumentClickHandler = (event) => {
		if (!state.navigationTour?.active) {
			return;
		}
		const control = event.target?.closest?.("[data-navigation-tour-action]");
		if (control) {
			event.preventDefault();
			event.stopImmediatePropagation();
			handleNavigationTourControl(control.dataset.navigationTourAction);
			return;
		}
		if (event.target?.closest?.(".guided-tip-bubble")) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		if (isNavigationTourTargetClick(event, tip.target)) {
			advanceNavigationTour();
		}
	};
	document.addEventListener("click", guidedTipDocumentClickHandler, true);
	guidedTipDocumentKeyHandler = (event) => {
		if (!state.navigationTour?.active || event.key !== "Escape") {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		stopNavigationTour();
	};
	document.addEventListener("keydown", guidedTipDocumentKeyHandler, true);

	const update = () => {
		const safePadding = navigationTourSafePadding();
		computePosition(tip.target, bubble, {
			placement: navigationTourPlacement(tip),
			strategy: "fixed",
			middleware: [
				offset(14),
				flip({ padding: safePadding }),
				shift({ padding: safePadding, crossAxis: true }),
			],
		}).then(({ x, y, placement }) => {
			Object.assign(bubble.style, {
				left: `${x}px`,
				top: `${y}px`,
			});
			bubble.dataset.placement = placement;
			bubble.dataset.ready = "true";
		});
	};
	guidedTipCleanup = autoUpdate(tip.target, bubble, update);
	update();
	focusGuidedTip(bubble, tip);
}

function bindGuidedTips() {
	window.requestAnimationFrame(() => {
		const tip = activeGuidedTip();
		if (tip) {
			showGuidedTip(tip);
		}
	});
}

function bindThoughtTooltips() {
	app.querySelectorAll("[data-thought-tooltip]").forEach((element) => {
		element.addEventListener("pointerenter", (event) => {
			if (event.pointerType === "touch") {
				return;
			}
			showThoughtTooltip(element);
		});
		element.addEventListener("pointerleave", hideThoughtTooltip);
		element.addEventListener("focus", () => showThoughtTooltip(element));
		element.addEventListener("blur", hideThoughtTooltip);
		element.addEventListener("pointerdown", (event) => {
			if (event.pointerType !== "touch") {
				return;
			}
			window.clearTimeout(thoughtTooltipLongPressTimer);
			thoughtTooltipSuppressClickTarget = null;
			thoughtTooltipLongPressTimer = window.setTimeout(() => {
				thoughtTooltipSuppressClickTarget = element;
				showThoughtTooltip(element);
			}, THOUGHT_TOOLTIP_LONG_PRESS_MS);
		});
		element.addEventListener("pointerup", () =>
			window.clearTimeout(thoughtTooltipLongPressTimer),
		);
		element.addEventListener("pointercancel", hideThoughtTooltip);
		element.addEventListener(
			"click",
			(event) => {
				if (thoughtTooltipSuppressClickTarget !== element) {
					return;
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				thoughtTooltipSuppressClickTarget = null;
				hideThoughtTooltip();
			},
			{ capture: true },
		);
	});
}

function headerActionLabel(button) {
	return (
		button.dataset.thoughtTooltip ||
		button.getAttribute("aria-label") ||
		button.getAttribute("title") ||
		button
			.querySelector(".button-label, .body-mode-label")
			?.textContent?.trim() ||
		button.textContent?.trim() ||
		""
	).trim();
}

function bindHeaderActionTooltips() {
	app.querySelectorAll(".panel-header-actions button").forEach((button) => {
		const label = simpleTooltipText(headerActionLabel(button));
		if (!label) {
			return;
		}
		button.dataset.thoughtTooltip = label;
		if (!button.getAttribute("aria-label")) {
			button.setAttribute("aria-label", label);
		}
		if (!button.getAttribute("title")) {
			button.setAttribute("title", label);
		}
	});
}

function openCamera(target = {}) {
	stopCameraStream();
	setState({
		cameraOpen: true,
		cameraTarget: normalizeCameraTarget(target),
		cameraStatus: "Opening camera...",
		cameraError: "",
		cameraBusy: false,
		cameraSaveToDevice: false,
	});
}

function closeCamera(options = {}) {
	stopCameraStream();
	const next = cameraClosedState();
	if (options.render === false) {
		Object.assign(state, next);
		return;
	}
	setState(next);
}

function stopCameraStream() {
	cameraRequestToken += 1;
	if (cameraStream) {
		cameraStream.getTracks().forEach((track) => track.stop());
		cameraStream = null;
	}
	const video = app.querySelector("[data-camera-video]");
	if (video) {
		video.srcObject = null;
	}
}

function cameraErrorMessage(error) {
	const name = error?.name || "";
	if (name === "NotAllowedError" || name === "SecurityError") {
		return "Camera permission was blocked.";
	}
	if (name === "NotFoundError" || name === "OverconstrainedError") {
		return "No webcam camera was found.";
	}
	if (!window.isSecureContext) {
		return "Camera access needs HTTPS or localhost.";
	}
	return error instanceof Error ? error.message : "Camera could not open.";
}

function updateCameraStatus(status = "", error = "") {
	state.cameraStatus = status;
	state.cameraError = error;
	const statusEl = app.querySelector("[data-camera-status]");
	if (statusEl) {
		statusEl.textContent = error || status || "";
		statusEl.classList.toggle("has-error", Boolean(error));
	}
	const captureButton = app.querySelector("[data-camera-capture]");
	if (captureButton) {
		captureButton.disabled =
			state.cameraBusy || !cameraStream || Boolean(error);
	}
	const placeholder = app.querySelector("[data-camera-placeholder]");
	if (placeholder) {
		placeholder.hidden = Boolean(cameraStream && !error);
	}
}

async function startCameraStream(video) {
	if (!video || !state.cameraOpen) {
		return;
	}
	stopCameraStream();
	const token = ++cameraRequestToken;
	updateCameraStatus("Opening camera...", "");
	if (!window.isSecureContext) {
		updateCameraStatus("", "Camera access needs HTTPS or localhost.");
		return;
	}
	if (!navigator.mediaDevices?.getUserMedia) {
		updateCameraStatus("", "This browser does not expose a webcam camera.");
		return;
	}

	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: {
				facingMode: { ideal: "environment" },
				width: { ideal: 1280 },
				height: { ideal: 720 },
			},
		});
		if (token !== cameraRequestToken || !state.cameraOpen) {
			stream.getTracks().forEach((track) => track.stop());
			return;
		}
		cameraStream = stream;
		video.srcObject = stream;
		await video.play().catch(() => {});
		updateCameraStatus("Camera ready.", "");
	} catch (error) {
		if (token === cameraRequestToken) {
			updateCameraStatus("", cameraErrorMessage(error));
		}
	}
}

function bindCameraControls() {
	const modal = app.querySelector("[data-camera-modal]");
	if (!modal || !state.cameraOpen) {
		return;
	}
	modal.addEventListener("click", (event) => {
		if (event.target === modal) {
			closeCamera();
		}
	});
	modal.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			event.preventDefault();
			closeCamera();
		}
	});
	const saveInput = modal.querySelector("[data-camera-save-to-device]");
	saveInput?.addEventListener("change", () => {
		state.cameraSaveToDevice = Boolean(saveInput.checked);
	});
	modal.focus();
	void startCameraStream(modal.querySelector("[data-camera-video]"));
}

function cameraBlobFromVideo(video, quality = 0.95) {
	return new Promise((resolve, reject) => {
		const width = video?.videoWidth || 0;
		const height = video?.videoHeight || 0;
		if (!width || !height) {
			reject(new Error("Camera is not ready yet."));
			return;
		}
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d", { alpha: false });
		context.drawImage(video, 0, 0, width, height);
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Could not capture camera photo."));
				}
			},
			"image/jpeg",
			quality,
		);
	});
}

async function highQualityCameraBlob(video) {
	const track = cameraStream?.getVideoTracks?.()[0] || null;
	if (track && typeof window.ImageCapture === "function") {
		try {
			const capture = new window.ImageCapture(track);
			const blob = await capture.takePhoto();
			if (blob?.size) {
				return blob;
			}
		} catch {
			// Some browsers expose ImageCapture but reject still capture for webcams.
		}
	}
	return await cameraBlobFromVideo(video);
}

function cameraImageExtension(type) {
	const normalized = String(type || "").toLowerCase();
	if (normalized.includes("png")) {
		return "png";
	}
	if (normalized.includes("webp")) {
		return "webp";
	}
	if (normalized.includes("heic")) {
		return "heic";
	}
	if (normalized.includes("heif")) {
		return "heif";
	}
	return "jpg";
}

async function cameraFileFromVideo(video) {
	const blob = await highQualityCameraBlob(video);
	const type = blob.type || "image/jpeg";
	const name = `camera-${todayDateKey()}-${Date.now()}.${cameraImageExtension(type)}`;
	if (typeof File === "function") {
		return new File([blob], name, { type });
	}
	return Object.assign(blob, { name, type });
}

function downloadCameraFile(file) {
	const url = URL.createObjectURL(file);
	const link = document.createElement("a");
	link.href = url;
	link.download = file.name || `camera-${Date.now()}.jpg`;
	document.body.append(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function canShareCameraFile(file) {
	try {
		return Boolean(navigator.canShare?.({ files: [file] }) && navigator.share);
	} catch {
		return false;
	}
}

async function saveCameraFileToDevice(file) {
	if (canShareCameraFile(file)) {
		try {
			await navigator.share({
				files: [file],
				title: "Camera Photo",
			});
			return "Device save sheet opened.";
		} catch (error) {
			if (error?.name === "AbortError") {
				return "Device save canceled.";
			}
		}
	}
	downloadCameraFile(file);
	return "Download started.";
}

async function createCameraDashboardNote(files, dashboard) {
	const imageFiles = Array.isArray(files) ? files : [files];
	const normalizedDashboard = DASHBOARD_LABELS.includes(dashboard)
		? dashboard
		: "Mind";
	const markdownItems = [];
	for (const file of imageFiles.filter(Boolean)) {
		const stored = await storeLocalImage(file, localMediaStoreOptions());
		markdownItems.push(stored.markdown);
	}
	if (!markdownItems.length) {
		throw new Error("No image files were selected.");
	}
	scheduleCloudStorageUsageRefresh({ force: true });
	const now = nowIso();
	const title = imageFiles.length > 1 ? "Uploaded Images" : "Camera Photo";
	const body = `## ${title}\n\nCaptured: ${currentTimestampLabel()}\n\n${markdownItems.join("\n\n")}`;
	const isLife = normalizedDashboard === "Life";
	const note = {
		id: makeId("artifact"),
		type: "note",
		dashboard: normalizedDashboard,
		parentId: null,
		title,
		body,
		created: now,
		edited: now,
		childIds: [],
		properties: {
			role: isLife ? "life-journal" : "dashboard-note",
			status: "active",
			source: "camera",
			isNewDraft: false,
			dateKey: todayDateKey(),
			...(isLife
				? {
						mood: "steady",
						energy: "medium",
						thoughtTrackerIds: [],
						goalTrackerIds: [],
					}
				: {}),
			audit: [
				{
					at: now,
					action: "created",
					title,
					dateKey: todayDateKey(),
					changed: ["photo"],
				},
			],
		},
		analysis: {},
	};
	persistArtifactStore(upsertArtifact(state.artifactStore, note));
	return {
		active: normalizedDashboard,
		selectedArtifactId: note.id,
		artifactMode: "editor",
		artifactReturnActive: "",
		selectedCompendiumId: null,
		selectedSectionId: null,
		selectedSpiritBookKey: null,
	};
}

async function applyCameraCapture(file) {
	const target = normalizeCameraTarget(state.cameraTarget || {});
	if (target.kind === "editor") {
		const inserted = await insertEditorImages([file], {
			start: target.start,
			end: target.end,
		});
		if (!inserted) {
			throw new Error("Could not add camera photo.");
		}
		return {};
	}
	if (target.kind === "pyxdia") {
		const draft = await uploadPyxdiaImagesAndInsert([file], { render: false });
		if (!draft) {
			throw new Error(state.pyxdiaError || "Could not add camera photo.");
		}
		return {
			active: "PYXIDA",
			pyxdiaView: "input",
			pyxdiaDraft: draft,
			pyxdiaStatus: "Photo added.",
			pyxdiaError: "",
		};
	}
	return await createCameraDashboardNote([file], target.dashboard);
}

async function applyCameraUpload(files) {
	const target = normalizeCameraTarget(state.cameraTarget || {});
	const images = Array.from(files || []).filter((file) =>
		file?.type?.startsWith("image/"),
	);
	if (!images.length) {
		throw new Error("Choose at least one image file.");
	}
	if (target.kind === "editor") {
		const inserted = await insertEditorImages(images, {
			start: target.start,
			end: target.end,
		});
		if (!inserted) {
			throw new Error("Could not add image.");
		}
		return {};
	}
	if (target.kind === "pyxdia") {
		const draft = await uploadPyxdiaImagesAndInsert(images, { render: false });
		if (!draft) {
			throw new Error(state.pyxdiaError || "Could not add image.");
		}
		return {
			active: "PYXIDA",
			pyxdiaView: "input",
			pyxdiaDraft: draft,
			pyxdiaStatus: "Image added.",
			pyxdiaError: "",
		};
	}
	return await createCameraDashboardNote(images, target.dashboard);
}

function uploadCameraTargetImages() {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "image/*";
	input.multiple = true;
	input.addEventListener(
		"change",
		async () => {
			const files = Array.from(input.files || []);
			if (!files.length) {
				return;
			}
			updateCameraStatus("Adding image to app...", "");
			try {
				const patch = await applyCameraUpload(files);
				stopCameraStream();
				setState({
					...cameraClosedState(),
					...patch,
				});
			} catch (error) {
				updateCameraStatus(
					"",
					error instanceof Error ? error.message : "Could not add image.",
				);
			}
		},
		{ once: true },
	);
	input.click();
}

async function captureCameraPhoto() {
	if (state.cameraBusy) {
		return;
	}
	const video = app.querySelector("[data-camera-video]");
	if (!video || !cameraStream) {
		updateCameraStatus("", "Camera is not ready yet.");
		return;
	}
	state.cameraBusy = true;
	const saveToDevice = state.cameraSaveToDevice;
	updateCameraStatus("Capturing high-quality photo...", "");
	try {
		const file = await cameraFileFromVideo(video);
		if (saveToDevice) {
			updateCameraStatus("Preparing device copy...", "");
			const saveStatus = await saveCameraFileToDevice(file);
			updateCameraStatus(`${saveStatus} Adding photo to app...`, "");
		} else {
			updateCameraStatus("Adding photo to app...", "");
		}
		const patch = await applyCameraCapture(file);
		stopCameraStream();
		setState({
			...cameraClosedState(),
			...patch,
		});
	} catch (error) {
		state.cameraBusy = false;
		updateCameraStatus(
			"",
			error instanceof Error ? error.message : "Could not capture photo.",
		);
	}
}

function bindActions() {
	app.querySelectorAll("[data-action]").forEach((element) => {
		if (element.closest("[data-icon-picker-overlay]")) {
			return;
		}
		const action = element.dataset.action;
		if (action === "open-donation") {
			return;
		}
		if (action === "select-spirit-plan") {
			element.addEventListener("change", () => selectSpiritPlan(element.value));
		} else {
			element.addEventListener("click", (event) => {
				const actionElement = eventActionElement(event);
				if (actionElement && actionElement !== element) {
					return;
				}
				handleAction(element);
			});
			element.addEventListener("keydown", (event) => {
				if (event.target !== element || !["Enter", " "].includes(event.key)) {
					return;
				}
				event.preventDefault();
				handleAction(element);
			});
		}
	});
}

function bindPyxdiaControls() {
	const input = app.querySelector("#pyxdia-letter-input");
	if (input) {
		const update = () => {
			const draft = savePyxdiaDraftLocal(pyxdiaDraftFromDom(), {
				render: false,
			});
			const settings = normalizePyxdiaSettings(state.pyxdiaSettings);
			const size = estimatePyxdiaLetterSize(draft.inputText);
			const counter = app.querySelector("[data-pyxdia-counter]");
			if (counter) {
				counter.classList.toggle(
					"is-over-limit",
					size.words > settings.letterMaxWords ||
						size.chars > settings.letterMaxChars,
				);
				counter.innerHTML = `
          <span>${escapeHtml(`${size.words} / ${settings.letterMaxWords} words`)}</span>
          <span>${escapeHtml(`${size.chars} / ${settings.letterMaxChars} chars`)}</span>
        `;
			}
		};
		input.addEventListener("input", update);
		input.addEventListener("change", update);
		input.addEventListener("paste", async (event) => {
			const files = Array.from(event.clipboardData?.items || [])
				.filter(
					(item) => item.kind === "file" && item.type.startsWith("image/"),
				)
				.map((item) => item.getAsFile())
				.filter(Boolean);
			if (!files.length) {
				return;
			}
			event.preventDefault();
			await insertPyxdiaLetterImages(files);
		});
	}
	const context = app.querySelector("#pyxdia-context-input");
	if (context) {
		const update = () =>
			savePyxdiaDraftLocal(pyxdiaDraftFromDom(), { render: false });
		context.addEventListener("input", update);
		context.addEventListener("change", update);
	}
	app.querySelectorAll("[data-pyxdia-recipient-control]").forEach((control) => {
		control.addEventListener("change", () => {
			const type =
				app.querySelector("input[name='pyxdia-recipient-type']:checked")?.value ||
				"pyxdia";
			const uid = app.querySelector("#pyxdia-family-recipient")?.value || "";
			selectPyxdiaCorrespondent(type, uid);
		});
	});
	app.querySelectorAll("[data-pyxdia-note-ref]").forEach((checkbox) => {
		checkbox.addEventListener("change", () => {
			savePyxdiaDraftLocal(
				pyxdiaDraftFromDom({ noteSelectionMode: "custom" }),
				{
					render: false,
				},
			);
			applyPyxdiaNoteFiltersDom();
		});
	});
	app.querySelectorAll("[data-pyxdia-note-filter]").forEach((control) => {
		const updateFilters = () => {
			state.pyxdiaNoteFilters = pyxdiaNoteFiltersFromDom();
			applyPyxdiaNoteFiltersDom();
		};
		control.addEventListener("input", updateFilters);
		control.addEventListener("change", updateFilters);
	});
	if (app.querySelector("[data-pyxdia-note-ref-row]")) {
		applyPyxdiaNoteFiltersDom();
	}
	const settingsPanel = app.querySelector(".pyxdia-settings");
	if (settingsPanel) {
		const updateSettings = (event) => {
			state.pyxdiaSettings = pyxdiaSettingsFromForm();
			savePyxdiaSettingsLocal(state.pyxdiaSettings);
			if (event?.target?.id?.startsWith("pyxdia-")) {
				schedulePyxdiaSettingsPersist({ immediate: event.type === "change" });
			}
		};
		settingsPanel.addEventListener("input", updateSettings, true);
		settingsPanel.addEventListener("change", updateSettings, true);
		settingsPanel.addEventListener(
			"click",
			(event) => {
				if (event.target?.matches?.("input[type='checkbox']")) {
					window.setTimeout(
						() => updateSettings({ target: event.target, type: "change" }),
						0,
					);
				}
			},
			true,
		);
		settingsPanel.querySelectorAll("input, textarea").forEach((field) => {
			field.addEventListener("input", updateSettings);
			field.addEventListener("change", updateSettings);
			if (field.type === "checkbox") {
				field.addEventListener("click", () => {
					window.setTimeout(
						() => updateSettings({ target: field, type: "change" }),
						0,
					);
				});
			}
		});
	}
}

function textWithMarkdownInsert(value, text, start, end) {
	const source = String(value || "");
	const from = Math.min(Math.max(Number(start) || 0, 0), source.length);
	const to = Math.min(Math.max(Number(end) || from, from), source.length);
	const before = source.slice(0, from);
	const after = source.slice(to);
	const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
	const suffix = after && !after.startsWith("\n") ? "\n\n" : "\n";
	const insert = `${prefix}${text}${suffix}`;
	return {
		value: `${before}${insert}${after}`,
		cursor: before.length + insert.length,
	};
}

async function uploadPyxdiaImagesAndInsert(files, options = {}) {
	const images = files.filter((file) => file?.type?.startsWith("image/"));
	if (!images.length) {
		return null;
	}
	const fail = (message) => {
		state.pyxdiaError = message;
		if (options.renderOnError) {
			setState({ pyxdiaError: message });
		}
		return null;
	};
	if (!isPyxdiaSignedIn() || state.cloud?.isLocalDemo) {
		return fail("Sign in with Cloud before adding images to Pen Pal letters.");
	}
	const input = document.getElementById("pyxdia-letter-input");
	const uid = state.cloud?.cloudOwnerUid || state.cloud?.user?.uid || "";
	const letterId = pyxdiaCurrentClientLetterId();
	const currentDraft = normalizePyxdiaDraft(state.pyxdiaDraft);
	const currentText = input ? input.value : currentDraft.inputText;
	const start = options.start ?? input?.selectionStart ?? currentText.length;
	const end = options.end ?? input?.selectionEnd ?? start;
	const uploadedRefs = [];
	try {
		for (const image of images) {
			uploadedRefs.push(
				await uploadPyxdiaLetterImage(image, {
					uid,
					letterId,
				}),
			);
		}
	} catch (error) {
		return fail(
			error instanceof Error ? error.message : "Could not upload Pen Pal image.",
		);
	}
	const inserted = textWithMarkdownInsert(
		currentText,
		uploadedRefs.map((ref) => pyxdiaImageMarkdown(ref)).join("\n\n"),
		start,
		end,
	);
	if (input) {
		input.value = inserted.value;
		input.focus();
		input.setSelectionRange(inserted.cursor, inserted.cursor);
	}
	const draft = normalizePyxdiaDraft({
		...pyxdiaDraftFromDom(),
		clientLetterId: letterId,
		inputText: inserted.value,
		imageRefs: [...(state.pyxdiaDraft?.imageRefs || []), ...uploadedRefs],
		updatedAt: nowIso(),
	});
	state.pyxdiaDraft = draft;
	savePyxdiaLocalState();
	const settings = normalizePyxdiaSettings(state.pyxdiaSettings);
	const size = estimatePyxdiaLetterSize(draft.inputText);
	const counter = app.querySelector("[data-pyxdia-counter]");
	if (counter) {
		counter.classList.toggle(
			"is-over-limit",
			size.words > settings.letterMaxWords ||
				size.chars > settings.letterMaxChars,
		);
		counter.innerHTML = `
          <span>${escapeHtml(`${size.words} / ${settings.letterMaxWords} words`)}</span>
          <span>${escapeHtml(`${size.chars} / ${settings.letterMaxChars} chars`)}</span>
        `;
	}
	return draft;
}

async function insertPyxdiaLetterImages(files) {
	await uploadPyxdiaImagesAndInsert(files, { renderOnError: true });
}

function _insertTextAtPyxdiaCursor(text, start, end) {
	const input = document.getElementById("pyxdia-letter-input");
	if (!input) {
		return;
	}
	const inserted = textWithMarkdownInsert(input.value, text, start, end);
	input.value = inserted.value;
	input.focus();
	input.setSelectionRange(inserted.cursor, inserted.cursor);
}

function schedulePyxdiaSettingsPersist(options = {}) {
	window.clearTimeout(pyxdiaSettingsPersistTimer);
	const delay = options.immediate ? 0 : 550;
	pyxdiaSettingsPersistTimer = window.setTimeout(() => {
		pyxdiaSettingsPersistTimer = null;
		void persistPyxdiaSettingsNow();
	}, delay);
}

async function persistPyxdiaSettingsNow() {
	const settings = normalizePyxdiaSettings(state.pyxdiaSettings);
	state.pyxdiaSettings = settings;
	savePyxdiaSettingsLocal(settings);
	if (!settings.delayEnabled) {
		processDueLocalPyxdiaJobs({ force: true });
	}
	if (!isPyxdiaSignedIn() || state.cloud?.isLocalDemo) {
		return;
	}
	try {
		const payload = await savePyxdiaSettings(settings, {
			getIdToken: getCloudIdToken,
		});
		applyPyxdiaStatePayload(payload);
		setState({
			pyxdiaStatus: "Pen Pal settings saved.",
			pyxdiaError: "",
		});
	} catch (error) {
		setState({
			pyxdiaError:
				error instanceof Error
					? error.message
					: "Could not save Pen Pal settings.",
		});
	}
}

function bindPyxdiaImages() {
	const refs = new Map();
	[
		...(state.pyxdiaDraft?.imageRefs || []),
		...(state.pyxdiaLetters || []).flatMap((letter) => letter.imageRefs || []),
	].forEach((ref) => {
		if (ref?.id) {
			refs.set(ref.id, ref);
		}
	});
	app.querySelectorAll("img[data-pyxdia-image]").forEach(async (image) => {
		const ref = refs.get(image.dataset.pyxdiaImage || "");
		if (!ref) {
			image.classList.add("is-missing");
			return;
		}
		try {
			const url = await resolvePyxdiaImageUrl(ref);
			if (url) {
				image.src = url;
			} else {
				image.classList.add("is-missing");
			}
		} catch {
			image.classList.add("is-missing");
		}
	});
}

function bindDashboardIdentityAutoSave() {
	const panel = app.querySelector(".interface-settings");
	if (!panel) {
		return;
	}
	let saveTimer = null;
	const scheduleSave = () => {
		window.clearTimeout(saveTimer);
		saveTimer = window.setTimeout(saveDashboardIdentitySettings, 200);
	};
	panel
		.querySelectorAll(
			"[data-dashboard-display-option], .dashboard-identity-input-row input",
		)
		.forEach((input) => {
			input.addEventListener("input", scheduleSave);
			input.addEventListener("change", saveDashboardIdentitySettings);
		});
}

function bindTrackerEditorAutoSave() {
	app.querySelectorAll("[data-tracker-edit-form]").forEach((form) => {
		const frequencySelect = form.querySelector(
			".tracker-frequency-input[id$='-frequency']",
		);
		const customRange = form.querySelector(".goal-frequency-range");
		const customOutput = form.querySelector(
			".goal-frequency-slider-row output",
		);
		const syncFrequencyControls = () => {
			if (!customRange) {
				return;
			}
			const isCustom = frequencySelect?.value === "custom";
			customRange.disabled = !isCustom;
			if (customOutput) {
				const days = Math.max(1, Math.round(Number(customRange.value) || 1));
				customOutput.textContent = `${days} day${days === 1 ? "" : "s"}`;
			}
		};
		frequencySelect?.addEventListener("change", () => {
			syncFrequencyControls();
		});
		customRange?.addEventListener("input", () => {
			syncFrequencyControls();
		});
		syncFrequencyControls();
	});
}

function eventActionElement(event) {
	const direct = event.target?.closest?.("[data-action]");
	if (direct) {
		return direct;
	}
	return event.composedPath?.().find((node) => node?.dataset?.action) || null;
}

function bindSidebarResize() {
	return;
}

function bindSidebarHorizontalScroll() {
	app.querySelectorAll(".sidebar-group-items").forEach((element) => {
		element.addEventListener(
			"wheel",
			(event) => {
				if (element.scrollWidth <= element.clientWidth) {
					return;
				}
				event.preventDefault();
				const delta =
					Math.abs(event.deltaX) > Math.abs(event.deltaY)
						? event.deltaX
						: event.deltaY;
				element.scrollBy({
					left: delta,
					behavior: "smooth",
				});
			},
			{ passive: false },
		);
	});
}

function updatePathBarOverflow(pathBar) {
	if (!pathBar) {
		return;
	}
	const scroller = pathBar.querySelector(".path-bar-crumbs") || pathBar;
	const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
	pathBar.classList.toggle("is-overflow-left", scroller.scrollLeft > 1);
	pathBar.classList.toggle(
		"is-overflow-right",
		scroller.scrollLeft < maxScroll - 1,
	);
}

function bindPathBarOverflow() {
	const pathBar = app.querySelector(".path-bar");
	if (!pathBar) {
		return;
	}
	const scroller = pathBar.querySelector(".path-bar-crumbs") || pathBar;
	const refresh = () => updatePathBarOverflow(pathBar);
	const focusCurrent = () => {
		if (
			pathBar.dataset.focusCurrent !== "true" ||
			pathBar.dataset.currentFocused === "true"
		) {
			return;
		}
		const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
		if (maxScroll > 0) {
			scroller.scrollLeft = maxScroll;
		}
		pathBar.dataset.currentFocused = "true";
		refresh();
	};
	refresh();
	requestAnimationFrame(() => {
		focusCurrent();
		refresh();
	});
	scroller.addEventListener("scroll", refresh, { passive: true });
	pathBar.addEventListener(
		"wheel",
		(event) => {
			if (scroller.scrollWidth <= scroller.clientWidth) {
				return;
			}
			event.preventDefault();
			const delta =
				Math.abs(event.deltaX) > Math.abs(event.deltaY)
					? event.deltaX
					: event.deltaY;
			scroller.scrollBy({ left: delta, behavior: "smooth" });
			requestAnimationFrame(refresh);
		},
		{ passive: false },
	);
	window.addEventListener("resize", refresh, { passive: true });
	if (typeof ResizeObserver !== "undefined") {
		const observer = new ResizeObserver(refresh);
		observer.observe(pathBar);
	}
}

function nearestVerticalScroller(target, root) {
	const element = target?.closest?.("*");
	let current = element;
	while (current && current !== root && root.contains(current)) {
		const style = window.getComputedStyle(current);
		const canScroll =
			current.scrollHeight > current.clientHeight + 2 &&
			/(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`);
		if (canScroll) {
			return current;
		}
		current = current.parentElement;
	}
	return root;
}

function canScrollVertically(element, direction) {
	if (!element) {
		return false;
	}
	const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
	if (maxScroll <= 2) {
		return false;
	}
	if (direction > 0) {
		return element.scrollTop < maxScroll - 2;
	}
	if (direction < 0) {
		return element.scrollTop > 2;
	}
	return false;
}

function isChildScroller(scroller, root) {
	return Boolean(scroller && scroller !== root);
}

const HEADER_SNAP_LOCK_SELECTOR = [
	".panel-header",
	".dashboard-orb-nav",
	".reader-topbar",
	".path-bar",
	".sidebar",
	".mobile-menu-toggle",
	".settings-tabs",
	".body-mode-switcher",
	".body-nutrition-switcher",
	".life-mode-switcher",
	".dashboard-chart-switcher",
	".dashboard-period-slider",
	".tracker-page-controls",
	".compendium-rotator-edge",
	".reader-slider-edge",
	"[data-header-snap-lock]",
].join(", ");

function setHeaderSnapped(snapped) {
	state.headerSnapped = Boolean(snapped);
	applyHeaderSnapState();
}

function supportsHeaderSnap(contentStage) {
	return Boolean(contentStage && !contentStage.querySelector(".pyxdia-page"));
}

function panelSnapChrome(panel) {
	return panel?.querySelector(".panel-header, .reader-topbar") || null;
}

function headerSnapChromeElements(panel) {
	return Array.from(
		panel?.querySelectorAll(
			":scope > .panel-header, :scope .dashboard-orb-nav, :scope > .reader-topbar",
		) || [],
	);
}

function clearHeaderSnapChromeDisableTimer() {
	if (headerSnapChromeDisableTimer) {
		window.clearTimeout(headerSnapChromeDisableTimer);
		headerSnapChromeDisableTimer = null;
	}
	if (headerSnapChromeTransitionCleanup) {
		headerSnapChromeTransitionCleanup();
		headerSnapChromeTransitionCleanup = null;
	}
}

function setHeaderSnapChromeDisabled(panel, disabled) {
	headerSnapChromeDisabled = Boolean(disabled);
	headerSnapChromeElements(panel).forEach((element) => {
		element.hidden = headerSnapChromeDisabled;
		element.toggleAttribute("inert", headerSnapChromeDisabled);
		if (headerSnapChromeDisabled) {
			element.setAttribute("aria-hidden", "true");
		} else {
			element.removeAttribute("aria-hidden");
		}
	});
}

function scheduleHeaderSnapChromeDisable(panel) {
	clearHeaderSnapChromeDisableTimer();
	const token = ++headerSnapChromeTransitionToken;
	const elements = headerSnapChromeElements(panel);
	if (!elements.length) {
		return;
	}
	const disableCurrentChrome = () => {
		if (token !== headerSnapChromeTransitionToken) {
			return;
		}
		const contentStage = app.querySelector(".content-stage");
		const currentPanel = contentStage?.querySelector(".panel");
		if (contentStage?.classList.contains("is-header-snapped") && currentPanel) {
			setHeaderSnapChromeDisabled(currentPanel, true);
		}
	};
	const transitionProperties = new Set(["max-height", "height", "transform"]);
	const onTransitionEnd = (event) => {
		if (
			!elements.includes(event.target) ||
			!transitionProperties.has(event.propertyName)
		) {
			return;
		}
		clearHeaderSnapChromeDisableTimer();
		disableCurrentChrome();
	};
	elements.forEach((element) => {
		element.addEventListener("transitionend", onTransitionEnd);
	});
	headerSnapChromeTransitionCleanup = () => {
		elements.forEach((element) => {
			element.removeEventListener("transitionend", onTransitionEnd);
		});
	};
	headerSnapChromeDisableTimer = window.setTimeout(() => {
		clearHeaderSnapChromeDisableTimer();
		headerSnapChromeDisableTimer = null;
		disableCurrentChrome();
	}, HEADER_SNAP_DISABLE_DELAY_MS);
}

function applyHeaderSnapState() {
	const contentStage = app.querySelector(".content-stage");
	const panel = contentStage?.querySelector(".panel");
	if (!contentStage || !panelSnapChrome(panel)) {
		clearHeaderSnapChromeDisableTimer();
		return;
	}
	const snapped = Boolean(state.headerSnapped && supportsHeaderSnap(contentStage));
	if (snapped && contentStage.scrollTop > 0) {
		contentStage.scrollTop = 0;
	}
	if (!snapped || !headerSnapChromeDisabled) {
		setHeaderSnapChromeDisabled(panel, false);
	}
	contentStage.classList.toggle("is-header-snapped", snapped);
	panel.classList.toggle("is-header-snapped", snapped);
	if (snapped) {
		if (headerSnapChromeDisabled) {
			setHeaderSnapChromeDisabled(panel, true);
		} else {
			scheduleHeaderSnapChromeDisable(panel);
		}
	} else {
		clearHeaderSnapChromeDisableTimer();
		headerSnapChromeTransitionToken++;
		setHeaderSnapChromeDisabled(panel, false);
	}
}

function bindHeaderSnap() {
	const contentStage = app.querySelector(".content-stage");
	const panel = contentStage?.querySelector(".panel");
	const snapChrome = panelSnapChrome(panel);
	if (!contentStage || !panel || !snapChrome) {
		return;
	}
	if (!supportsHeaderSnap(contentStage)) {
		setHeaderSnapped(false);
		return;
	}
	const snapSurface = contentStage.closest(".content-shell") || contentStage;
	let touchStartY = 0;
	let childSnapHandoff = null;
	const isSnapped = () => contentStage.classList.contains("is-header-snapped");
	const clearChildSnapHandoff = () => {
		childSnapHandoff = null;
	};
	const panelBodyRootForSnapTarget = (target) => {
		const element = target?.closest?.("*");
		if (!element) {
			return null;
		}
		if (element.closest(HEADER_SNAP_LOCK_SELECTOR)) {
			return null;
		}
		if (
			element === panel ||
			element === contentStage ||
			element === snapSurface
		) {
			return panel;
		}
		return null;
	};
	const shouldHoldChildSnapHandoff = (scroller, direction, mode) => {
		if (!isChildScroller(scroller, contentStage) || !direction) {
			clearChildSnapHandoff();
			return false;
		}
		if (canScrollVertically(scroller, direction)) {
			childSnapHandoff = { scroller, direction, mode };
			return false;
		}
		if (
			childSnapHandoff?.scroller === scroller &&
			childSnapHandoff.direction === direction
		) {
			if (mode === "wheel") {
				clearChildSnapHandoff();
			}
			return true;
		}
		clearChildSnapHandoff();
		return false;
	};
	const handleSnapIntent = (target, deltaY, mode = "wheel") => {
		if (Math.abs(deltaY) < 8) {
			return false;
		}
		if (!panelBodyRootForSnapTarget(target)) {
			clearChildSnapHandoff();
			return false;
		}
		const scroller = nearestVerticalScroller(target, contentStage);
		const direction = Math.sign(deltaY);
		if (shouldHoldChildSnapHandoff(scroller, direction, mode)) {
			return true;
		}
		const childScroller = isChildScroller(scroller, contentStage);
		if (deltaY > 0) {
			if (childScroller && canScrollVertically(scroller, 1)) {
				return false;
			}
			if (!isSnapped()) {
				setHeaderSnapped(true);
				return true;
			}
			return false;
		}
		if (!isSnapped()) {
			return false;
		}
		if (childScroller && canScrollVertically(scroller, -1)) {
			return false;
		}
		setHeaderSnapped(false);
		return true;
	};
	snapSurface.addEventListener(
		"wheel",
		(event) => {
			if (handleSnapIntent(event.target, event.deltaY, "wheel")) {
				event.preventDefault();
			}
		},
		{ passive: false },
	);
	snapSurface.addEventListener(
		"touchstart",
		(event) => {
			touchStartY = event.touches?.[0]?.clientY || 0;
			clearChildSnapHandoff();
		},
		{ passive: true },
	);
	snapSurface.addEventListener(
		"touchmove",
		(event) => {
			const currentY = event.touches?.[0]?.clientY || touchStartY;
			const deltaY = touchStartY - currentY;
			if (handleSnapIntent(event.target, deltaY, "touch")) {
				event.preventDefault();
				touchStartY = currentY;
				return;
			}
			touchStartY = currentY;
		},
		{ passive: false },
	);
	snapSurface.addEventListener("touchend", clearChildSnapHandoff, {
		passive: true,
	});
	snapSurface.addEventListener("touchcancel", clearChildSnapHandoff, {
		passive: true,
	});
	contentStage.addEventListener(
		"scroll",
		() => {
			if (snapChrome.classList.contains("reader-topbar")) {
				return;
			}
			if (isSnapped() && contentStage.scrollTop <= 2) {
				setHeaderSnapped(false);
			}
		},
		{ passive: true },
	);
}

function sectionDropIndex(list, activeRow, pointerY) {
	const rows = Array.from(list.querySelectorAll("[data-section-row]")).filter(
		(row) => row !== activeRow,
	);
	const index = rows.findIndex((row) => {
		const rect = row.getBoundingClientRect();
		return pointerY < rect.top + rect.height / 2;
	});
	return index === -1 ? rows.length : index;
}

function moveSectionRow(list, activeRow, targetIndex) {
	const rows = Array.from(list.querySelectorAll("[data-section-row]")).filter(
		(row) => row !== activeRow,
	);
	list.insertBefore(activeRow, rows[targetIndex] || null);
}

function renumberSectionRows(list) {
	const rows = Array.from(list.querySelectorAll("[data-section-row]"));
	rows.forEach((row, index) => {
		const number = String(rows.length - index).padStart(2, "0");
		const handle = row.querySelector("[data-section-drag-handle]");
		if (handle) {
			handle.textContent = number;
			handle.setAttribute("aria-label", `Drag section ${number} to reorder`);
		}
	});
}

function scrollSectionListWhileDragging(scrollArea, pointerY) {
	if (!scrollArea) {
		return;
	}
	const rect = scrollArea.getBoundingClientRect();
	const edge = 56;
	if (pointerY < rect.top + edge) {
		scrollArea.scrollTop -= Math.ceil((rect.top + edge - pointerY) / 3);
	} else if (pointerY > rect.bottom - edge) {
		scrollArea.scrollTop += Math.ceil((pointerY - (rect.bottom - edge)) / 3);
	}
}

function bindCompendiumSectionSorting() {
	const list = app.querySelector("[data-section-sort-list]");
	if (!list) {
		return;
	}

	list.querySelectorAll("[data-section-drag-handle]").forEach((handle) => {
		handle.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
		});

		handle.addEventListener("pointerdown", (event) => {
			if (event.button !== undefined && event.button !== 0) {
				return;
			}
			const activeRow = handle.closest("[data-section-row]");
			const compendiumId = list.dataset.compendiumId;
			const sectionId = activeRow?.dataset.id;
			if (!activeRow || !compendiumId || !sectionId) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			handle.setPointerCapture?.(event.pointerId);
			list.classList.add("is-sorting");
			activeRow.classList.add("is-dragging");
			handle.classList.add("is-active");

			const scrollArea = list.closest(".scroll-area");
			let moved = false;

			const onPointerMove = (moveEvent) => {
				moveEvent.preventDefault();
				scrollSectionListWhileDragging(scrollArea, moveEvent.clientY);
				const targetIndex = sectionDropIndex(
					list,
					activeRow,
					moveEvent.clientY,
				);
				if (!reorderCompendiumSection(compendiumId, sectionId, targetIndex)) {
					return;
				}
				moveSectionRow(list, activeRow, targetIndex);
				renumberSectionRows(list);
				moved = true;
			};

			const finishDrag = (finishEvent) => {
				handle.releasePointerCapture?.(finishEvent.pointerId);
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", finishDrag);
				window.removeEventListener("pointercancel", finishDrag);
				list.classList.remove("is-sorting");
				activeRow.classList.remove("is-dragging");
				handle.classList.remove("is-active");
				if (!moved) {
					return;
				}
				touchCompendium(compendiumId);
				persistCompendiums();
			};

			window.addEventListener("pointermove", onPointerMove, { passive: false });
			window.addEventListener("pointerup", finishDrag);
			window.addEventListener("pointercancel", finishDrag);
		});
	});
}

function bindDashboardBalanceHover() {
	const linkedElements = app.querySelectorAll("[data-balance-key]");
	const setLinkedHover = (key, enabled) => {
		linkedElements.forEach((element) => {
			if (element.dataset.balanceKey === key) {
				element.classList.toggle("is-linked-hover", enabled);
			}
		});
	};
	linkedElements.forEach((element) => {
		const key = element.dataset.balanceKey;
		element.addEventListener("pointerenter", () => setLinkedHover(key, true));
		element.addEventListener("pointerleave", () => setLinkedHover(key, false));
		element.addEventListener("focusin", () => setLinkedHover(key, true));
		element.addEventListener("focusout", () => setLinkedHover(key, false));
	});
}

function bindDashboardPeriodSlider() {
	app.querySelectorAll("[data-dashboard-period-slider]").forEach((input) => {
		input.addEventListener("input", () => {
			const option = dashboardPeriodOptionForIndex(input.value);
			state.dashboardPeriod = option.id;
			previewDashboardPeriodByIndex(input.value);
		});
		input.addEventListener("change", () =>
			setDashboardPeriodByIndex(input.value),
		);
	});
}

function orderableBoxDropIndex(container, activeItem, pointerX, pointerY) {
	const items = Array.from(
		container.querySelectorAll("[data-orderable-box-item]"),
	).filter((item) => item !== activeItem);
	const index = items.findIndex((item) => {
		const rect = item.getBoundingClientRect();
		const midpointY = rect.top + rect.height / 2;
		const midpointX = rect.left + rect.width / 2;
		return pointerY < midpointY || (pointerY < rect.bottom && pointerX < midpointX);
	});
	return index === -1 ? items.length : index;
}

function clearOrderableBoxMarkers(container) {
	container.querySelectorAll(".is-drop-before, .is-drop-after").forEach((item) => {
		item.classList.remove("is-drop-before", "is-drop-after");
	});
}

function setOrderableBoxMarker(container, activeItem, targetIndex) {
	clearOrderableBoxMarkers(container);
	const items = Array.from(
		container.querySelectorAll("[data-orderable-box-item]"),
	).filter((item) => item !== activeItem);
	if (!items.length) {
		return;
	}
	const targetItem = items[targetIndex];
	if (targetItem) {
		targetItem.classList.add("is-drop-before");
	} else {
		items[items.length - 1].classList.add("is-drop-after");
	}
}

function moveOrderableBoxItem(container, activeItem, targetIndex) {
	const items = Array.from(
		container.querySelectorAll("[data-orderable-box-item]"),
	).filter((item) => item !== activeItem);
	container.insertBefore(activeItem, items[targetIndex] || null);
}

function bindOrderableBoxSorting({
	containerSelector,
	itemSelector,
	handleSelector,
	onCommit,
}) {
	const container = app.querySelector(containerSelector);
	if (!container) {
		return;
	}
	container.querySelectorAll(itemSelector).forEach((item) => {
		item.dataset.orderableBoxItem = "true";
	});
	container.querySelectorAll(handleSelector).forEach((handle) => {
		handle.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
		});
		handle.addEventListener("pointerdown", (event) => {
			if (event.button !== undefined && event.button !== 0) {
				return;
			}
			const activeItem = handle.closest(itemSelector);
			if (!activeItem) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			const startX = event.clientX;
			const startY = event.clientY;
			let isDragging = false;
			let targetIndex = null;

			const startDrag = (moveEvent) => {
				isDragging = true;
				container.classList.add("is-reordering");
				activeItem.classList.add("is-dragging");
				handle.classList.add("is-active");
				handle.setPointerCapture?.(event.pointerId);
				targetIndex = orderableBoxDropIndex(
					container,
					activeItem,
					moveEvent.clientX,
					moveEvent.clientY,
				);
				setOrderableBoxMarker(container, activeItem, targetIndex);
			};

			const onPointerMove = (moveEvent) => {
				const moved = Math.hypot(
					moveEvent.clientX - startX,
					moveEvent.clientY - startY,
				);
				if (!isDragging && moved < 6) {
					return;
				}
				moveEvent.preventDefault();
				if (!isDragging) {
					startDrag(moveEvent);
				}
				targetIndex = orderableBoxDropIndex(
					container,
					activeItem,
					moveEvent.clientX,
					moveEvent.clientY,
				);
				setOrderableBoxMarker(container, activeItem, targetIndex);
			};

			const finishDrag = (finishEvent) => {
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", finishDrag);
				window.removeEventListener("pointercancel", finishDrag);
				if (isDragging) {
					handle.releasePointerCapture?.(finishEvent.pointerId);
				}
				container.classList.remove("is-reordering");
				activeItem.classList.remove("is-dragging");
				handle.classList.remove("is-active");
				clearOrderableBoxMarkers(container);
				if (!isDragging) {
					return;
				}
				finishEvent.preventDefault();
				moveOrderableBoxItem(container, activeItem, targetIndex ?? 0);
				onCommit?.(
					Array.from(container.querySelectorAll(itemSelector)).map((nextItem) =>
						nextItem.dataset.optionId,
					),
				);
			};

			window.addEventListener("pointermove", onPointerMove, { passive: false });
			window.addEventListener("pointerup", finishDrag);
			window.addEventListener("pointercancel", finishDrag);
		});
	});
}

function bindDashboardDisplayOptionSorting() {
	bindOrderableBoxSorting({
		containerSelector: "[data-dashboard-display-option-list]",
		itemSelector: "[data-dashboard-display-option-box]",
		handleSelector: "[data-orderable-drag-handle]",
		onCommit: saveDashboardIdentitySettings,
	});
}

function dashboardChartTabDropIndex(row, activeButton, pointerX) {
	const buttons = Array.from(
		row.querySelectorAll("[data-dashboard-chart-tab]"),
	).filter((button) => button !== activeButton);
	const index = buttons.findIndex((button) => {
		const rect = button.getBoundingClientRect();
		return pointerX < rect.left + rect.width / 2;
	});
	return index === -1 ? buttons.length : index;
}

function clearDashboardChartTabMarkers(row) {
	row.querySelectorAll(".is-drop-before, .is-drop-after").forEach((button) => {
		button.classList.remove("is-drop-before", "is-drop-after");
	});
}

function setDashboardChartTabMarker(row, activeButton, targetIndex) {
	clearDashboardChartTabMarkers(row);
	const buttons = Array.from(
		row.querySelectorAll("[data-dashboard-chart-tab]"),
	).filter((button) => button !== activeButton);
	if (!buttons.length) {
		return;
	}
	const targetButton = buttons[targetIndex];
	if (targetButton) {
		targetButton.classList.add("is-drop-before");
	} else {
		buttons[buttons.length - 1].classList.add("is-drop-after");
	}
}

function bindDashboardChartTabSorting() {
	const row = app.querySelector("[data-dashboard-chart-switcher]");
	if (!row) {
		return;
	}
	row.querySelectorAll("[data-dashboard-chart-tab]").forEach((button) => {
		button.addEventListener("pointerdown", (event) => {
			if (event.button !== undefined && event.button !== 0) {
				return;
			}
			const tabId = button.dataset.chart || "";
			if (!tabId) {
				return;
			}
			const startX = event.clientX;
			const startY = event.clientY;
			let isDragging = false;
			let targetIndex = null;

			const startDrag = (moveEvent) => {
				isDragging = true;
				row.classList.add("is-reordering");
				button.classList.add("is-dragging");
				button.setPointerCapture?.(event.pointerId);
				targetIndex = dashboardChartTabDropIndex(
					row,
					button,
					moveEvent.clientX,
				);
				setDashboardChartTabMarker(row, button, targetIndex);
			};

			const onPointerMove = (moveEvent) => {
				const moved = Math.hypot(
					moveEvent.clientX - startX,
					moveEvent.clientY - startY,
				);
				if (!isDragging && moved < 6) {
					return;
				}
				moveEvent.preventDefault();
				if (!isDragging) {
					startDrag(moveEvent);
				}
				targetIndex = dashboardChartTabDropIndex(
					row,
					button,
					moveEvent.clientX,
				);
				setDashboardChartTabMarker(row, button, targetIndex);
			};

			const finishDrag = (finishEvent) => {
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", finishDrag);
				window.removeEventListener("pointercancel", finishDrag);
				button.releasePointerCapture?.(finishEvent.pointerId);
				row.classList.remove("is-reordering");
				button.classList.remove("is-dragging");
				clearDashboardChartTabMarkers(row);
				if (!isDragging) {
					return;
				}
				finishEvent.preventDefault();
				state.suppressNextDashboardChartClick = true;
				reorderDashboardChartTabs(tabId, targetIndex ?? 0);
				window.setTimeout(() => {
					state.suppressNextDashboardChartClick = false;
				}, 0);
			};

			window.addEventListener("pointermove", onPointerMove, { passive: false });
			window.addEventListener("pointerup", finishDrag);
			window.addEventListener("pointercancel", finishDrag);
		});
	});
}

function updateDashboardOrbScrollOverflow(element) {
	if (!element) {
		return;
	}
	const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
	element.classList.toggle("is-overflow-left", element.scrollLeft > 1);
	element.classList.toggle(
		"is-overflow-right",
		element.scrollLeft < maxScroll - 1,
	);
}

function bindDashboardOrbScroll() {
	app.querySelectorAll("[data-dashboard-orb-scroll]").forEach((element) => {
		const refresh = () => updateDashboardOrbScrollOverflow(element);
		refresh();
		requestAnimationFrame(refresh);
		element.addEventListener("scroll", refresh, { passive: true });
		element.addEventListener(
			"wheel",
			(event) => {
				if (element.scrollWidth <= element.clientWidth) {
					return;
				}
				event.preventDefault();
				const delta =
					Math.abs(event.deltaX) > Math.abs(event.deltaY)
						? event.deltaX
						: event.deltaY;
				element.scrollBy({ left: delta, behavior: "smooth" });
				requestAnimationFrame(refresh);
			},
			{ passive: false },
		);
		const dragPoint = (event) => {
			const touch = event.touches?.[0] || event.changedTouches?.[0];
			if (touch) {
				return { x: touch.clientX, y: touch.clientY };
			}
			if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
				return { x: event.clientX, y: event.clientY };
			}
			return null;
		};
		const suppressTrackerClick = () => {
			state.suppressNextTrackerClick = true;
			window.setTimeout(() => {
				state.suppressNextTrackerClick = false;
			}, 500);
		};
		const beginDragScroll = (startEvent, options) => {
			if (element.scrollWidth <= element.clientWidth) {
				return;
			}
			const startPoint = dragPoint(startEvent);
			if (!startPoint) {
				return;
			}

			const startScrollLeft = element.scrollLeft;
			let isDragging = false;

			const onMove = (moveEvent) => {
				const point = dragPoint(moveEvent);
				if (!point) {
					return;
				}
				const deltaX = point.x - startPoint.x;
				const deltaY = point.y - startPoint.y;
				if (!isDragging && Math.hypot(deltaX, deltaY) < 6) {
					return;
				}
				if (!isDragging && Math.abs(deltaY) > Math.abs(deltaX)) {
					return;
				}
				moveEvent.preventDefault();
				if (!isDragging) {
					isDragging = true;
					element.classList.add("is-dragging");
					if (
						options.pointerId !== undefined &&
						element.setPointerCapture &&
						!element.hasPointerCapture?.(options.pointerId)
					) {
						try {
							element.setPointerCapture(options.pointerId);
						} catch {
							// The window listeners still carry the drag if capture is unavailable.
						}
					}
				}
				element.scrollLeft = startScrollLeft - deltaX;
				refresh();
			};

			const finishDrag = (finishEvent) => {
				options.remove(onMove, finishDrag);
				element.classList.remove("is-dragging");
				if (
					options.pointerId !== undefined &&
					element.releasePointerCapture &&
					element.hasPointerCapture?.(options.pointerId)
				) {
					try {
						element.releasePointerCapture(options.pointerId);
					} catch {
						// Capture may have already been released by the browser.
					}
				}
				if (!isDragging) {
					return;
				}
				finishEvent.preventDefault();
				suppressTrackerClick();
			};

			options.add(onMove, finishDrag);
		};
		if (typeof window.PointerEvent === "function") {
			element.addEventListener("pointerdown", (event) => {
				if (event.button !== undefined && event.button !== 0) {
					return;
				}
				beginDragScroll(event, {
					pointerId: event.pointerId,
					add: (onMove, finishDrag) => {
						window.addEventListener("pointermove", onMove, { passive: false });
						window.addEventListener("pointerup", finishDrag);
						window.addEventListener("pointercancel", finishDrag);
					},
					remove: (onMove, finishDrag) => {
						window.removeEventListener("pointermove", onMove);
						window.removeEventListener("pointerup", finishDrag);
						window.removeEventListener("pointercancel", finishDrag);
					},
				});
			});
		} else {
			element.addEventListener("mousedown", (event) => {
				if (event.button !== 0) {
					return;
				}
				beginDragScroll(event, {
					add: (onMove, finishDrag) => {
						window.addEventListener("mousemove", onMove, { passive: false });
						window.addEventListener("mouseup", finishDrag);
					},
					remove: (onMove, finishDrag) => {
						window.removeEventListener("mousemove", onMove);
						window.removeEventListener("mouseup", finishDrag);
					},
				});
			});
			element.addEventListener("touchstart", (event) => {
				beginDragScroll(event, {
					add: (onMove, finishDrag) => {
						window.addEventListener("touchmove", onMove, { passive: false });
						window.addEventListener("touchend", finishDrag);
						window.addEventListener("touchcancel", finishDrag);
					},
					remove: (onMove, finishDrag) => {
						window.removeEventListener("touchmove", onMove);
						window.removeEventListener("touchend", finishDrag);
						window.removeEventListener("touchcancel", finishDrag);
					},
				});
			});
		}
		if (typeof ResizeObserver !== "undefined") {
			const observer = new ResizeObserver(refresh);
			observer.observe(element);
		}
	});
}

function bindGalleryControls() {
	app.querySelectorAll("[data-gallery-size-slider]").forEach((input) => {
		input.addEventListener("input", () => {
			state.galleryThumbSize = Math.min(
				320,
				Math.max(110, Number(input.value) || 180),
			);
			app.querySelectorAll(".gallery-grid").forEach((grid) => {
				grid.style.setProperty(
					"--gallery-thumb-size",
					`${state.galleryThumbSize}px`,
				);
			});
		});
	});
	app.querySelectorAll("[data-gallery-select]").forEach((input) => {
		input.addEventListener("change", () => {
			const id = input.value;
			const selected = new Set(state.gallerySelectedIds);
			if (input.checked) {
				selected.add(id);
			} else {
				selected.delete(id);
			}
			setState({ gallerySelectedIds: Array.from(selected) });
		});
	});
}

function bindEditorMedia() {
	const editor = document.getElementById("editor-body");
	if (!editor) {
		return;
	}
	const cameraButton = app.querySelector("[data-editor-camera-button]");
	if (cameraButton) {
		cameraButton.addEventListener("pointerdown", (event) => {
			event.preventDefault();
			editor.focus();
		});
		cameraButton.addEventListener("click", () => {
			openCamera({
				kind: "editor",
				dashboard: state.active,
				start: editor.selectionStart ?? editor.value.length,
				end:
					editor.selectionEnd ?? editor.selectionStart ?? editor.value.length,
			});
		});
	}
	editor.addEventListener("paste", async (event) => {
		const files = Array.from(event.clipboardData?.items || [])
			.filter((item) => item.kind === "file" && item.type.startsWith("image/"))
			.map((item) => item.getAsFile())
			.filter(Boolean);
		if (!files.length) {
			return;
		}
		event.preventDefault();
		await insertEditorImages(files);
	});
	editor.addEventListener("dragover", (event) => {
		if (
			Array.from(event.dataTransfer?.items || []).some(
				(item) => item.kind === "file" && item.type.startsWith("image/"),
			)
		) {
			event.preventDefault();
		}
	});
	editor.addEventListener("drop", async (event) => {
		const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
			file.type.startsWith("image/"),
		);
		if (!files.length) {
			return;
		}
		event.preventDefault();
		setEditorCursorFromPoint(event);
		await insertEditorImages(files);
	});
}

function setEditorCursorFromPoint(event) {
	const editor = document.getElementById("editor-body");
	if (!editor) {
		return;
	}
	if (document.caretPositionFromPoint) {
		const position = document.caretPositionFromPoint(
			event.clientX,
			event.clientY,
		);
		if (
			position?.offsetNode === editor.firstChild ||
			position?.offsetNode === editor
		) {
			editor.setSelectionRange(position.offset, position.offset);
		}
		return;
	}
	if (document.caretRangeFromPoint) {
		const range = document.caretRangeFromPoint(event.clientX, event.clientY);
		if (range) {
			editor.setSelectionRange(range.startOffset, range.startOffset);
		}
	}
}

async function insertEditorImages(files, range = null) {
	const editor = document.getElementById("editor-body");
	if (!editor) {
		return false;
	}
	const images = files.filter((file) => file?.type?.startsWith("image/"));
	if (!images.length) {
		return false;
	}
	const previousCursor =
		range?.start ?? editor.selectionStart ?? editor.value.length;
	const previousEnd = range?.end ?? editor.selectionEnd ?? previousCursor;
	const markdownItems = [];
	try {
		for (const image of images) {
			const stored = await storeLocalImage(image, localMediaStoreOptions());
			markdownItems.push(stored.markdown);
		}
		scheduleCloudStorageUsageRefresh({ force: true });
	} catch (error) {
		window.alert(
			error instanceof Error ? error.message : "Could not add image.",
		);
		return false;
	}
	insertTextAtEditorCursor(
		markdownItems.join("\n\n"),
		previousCursor,
		previousEnd,
	);
	return true;
}

function insertTextAtEditorCursor(text, start, end) {
	const editor = document.getElementById("editor-body");
	if (!editor) {
		return;
	}
	const before = editor.value.slice(0, start);
	const after = editor.value.slice(end);
	const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
	const suffix = after && !after.startsWith("\n") ? "\n\n" : "\n";
	const insert = `${prefix}${text}${suffix}`;
	editor.value = `${before}${insert}${after}`;
	const nextCursor = before.length + insert.length;
	editor.focus();
	editor.setSelectionRange(nextCursor, nextCursor);
}

function localAssetErrorMessage(error) {
	const code = String(error?.code || "");
	const message =
		error instanceof Error ? error.message : String(error || "").trim();
	if (code.includes("storage/unauthorized")) {
		return "Cloud media denied access to this file.";
	}
	if (code.includes("storage/object-not-found")) {
		return "The synced media file was not found in Cloud media.";
	}
	if (/private media key/i.test(message)) {
		return "This browser does not have the private media key for this file.";
	}
	return message || "Could not load this synced media file.";
}

function markLocalAssetMissing(element, error) {
	const message = localAssetErrorMessage(error);
	element.classList.add("is-missing");
	element.title = message;
	element.dataset.mediaError = message;
	console.warn("ourstuff_media_load_failed", {
		id: element.dataset.localAsset || element.dataset.localAssetLink || "",
		message,
		code: error?.code || "",
	});
}

function markLocalAssetReady(element) {
	element.classList.remove("is-missing");
	element.classList.remove("is-loading");
	element.removeAttribute("title");
	delete element.dataset.mediaError;
}

function blobToDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

function readerCopyRootForNode(node) {
	const element =
		node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
	return (
		element?.closest?.(".reader-panel, .reader-book--compendium") || null
	);
}

function readerCopyRootFromSelection(selection = window.getSelection()) {
	if (!selection || selection.isCollapsed || !selection.rangeCount) {
		return null;
	}
	const anchorRoot = readerCopyRootForNode(selection.anchorNode);
	const focusRoot = readerCopyRootForNode(selection.focusNode);
	return anchorRoot && anchorRoot === focusRoot ? anchorRoot : null;
}

function activeReaderCopyRoot() {
	return (
		app.querySelector(".reader-book--compendium .reader-slide.is-active") ||
		app.querySelector(".reader-panel") ||
		null
	);
}

function cloneReaderSelection(selection) {
	const root = document.createElement("div");
	for (let index = 0; index < selection.rangeCount; index += 1) {
		root.append(selection.getRangeAt(index).cloneContents());
	}
	return root;
}

function sanitizeReaderCopyRoot(root) {
	root
		.querySelectorAll(
			[
				"button",
				"script",
				"style",
				".page-number-overlay",
				".reader-gallery-controls",
				".reader-page-indicator",
				".reader-slider-edge",
			].join(", "),
		)
		.forEach((element) => element.remove());
	root.querySelectorAll("[class]").forEach((element) => {
		const className = String(element.className || "");
		if (
			/^(page-content|markdown-body|reader-section|themed-child-viewer)/.test(
				className,
			)
		) {
			return;
		}
		element.removeAttribute("class");
	});
	return root;
}

function readerCopyPlainText(root) {
	const clone = root.cloneNode(true);
	clone.querySelectorAll("img").forEach((image) => {
		const label = image.alt ? `[Image: ${image.alt}]` : "[Image]";
		image.replaceWith(document.createTextNode(`\n${label}\n`));
	});
	return clone.textContent
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function readerCopyHtml(root) {
	return `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
      ${root.innerHTML}
    </div>
  `;
}

function applyResolvedImageDimensions(image, resolved = {}) {
	const width = Number(resolved.width) || Number(image.naturalWidth) || 0;
	const height = Number(resolved.height) || Number(image.naturalHeight) || 0;
	if (!width || !height) {
		return;
	}
	image.width = width;
	image.height = height;
	image.style.setProperty("--media-width", `${width}px`);
	image.style.setProperty("--media-height", `${height}px`);
	image.style.setProperty("--media-ratio", `${width} / ${height}`);
}

async function localOrBlobImageDataUrl(image) {
	const localId = image.dataset.localAsset || "";
	let source = image.currentSrc || image.src || "";
	let resolved = null;
	if (localId) {
		resolved = await resolveLocalFile(localId);
		applyResolvedImageDimensions(image, resolved);
		source = resolved.url || source;
	}
	if (!source || source.startsWith("data:image/")) {
		return source;
	}
	if (!localId && !source.startsWith("blob:")) {
		return "";
	}
	const response = await fetch(source);
	if (!response.ok) {
		return "";
	}
	return await blobToDataUrl(await response.blob());
}

async function inlineReaderCopyImages(root) {
	const images = [...root.querySelectorAll("img")];
	for (const image of images) {
		try {
			const dataUrl = await localOrBlobImageDataUrl(image);
			if (dataUrl) {
				image.src = dataUrl;
			}
			image.removeAttribute("data-local-asset");
			image.classList.remove("is-loading", "is-missing");
			image.style.maxWidth = "100%";
			image.style.height = "auto";
		} catch {
			image.removeAttribute("src");
		}
	}
}

async function writeReaderClipboard(root) {
	const cleanRoot = sanitizeReaderCopyRoot(root);
	await inlineReaderCopyImages(cleanRoot);
	const html = readerCopyHtml(cleanRoot);
	const text = readerCopyPlainText(cleanRoot);
	if (navigator.clipboard?.write && window.ClipboardItem) {
		await navigator.clipboard.write([
			new ClipboardItem({
				"text/html": new Blob([html], { type: "text/html" }),
				"text/plain": new Blob([text], { type: "text/plain" }),
			}),
		]);
		return true;
	}
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return true;
	}
	return false;
}

async function copyActiveReaderPage() {
	const root = activeReaderCopyRoot();
	if (!root) {
		return;
	}
	const copyRoot = document.createElement("div");
	copyRoot.append(root.cloneNode(true));
	try {
		await writeReaderClipboard(copyRoot);
	} catch (error) {
		console.warn("ourstuff_reader_copy_failed", error);
		window.alert("Could not copy this reader page.");
	}
}

function handleReaderCopy(event) {
	const selection = window.getSelection();
	if (!readerCopyRootFromSelection(selection)) {
		return;
	}
	const copyRoot = sanitizeReaderCopyRoot(cloneReaderSelection(selection));
	const html = readerCopyHtml(copyRoot);
	const text = readerCopyPlainText(copyRoot);
	event.preventDefault();
	event.clipboardData?.setData("text/html", html);
	event.clipboardData?.setData("text/plain", text);
	void writeReaderClipboard(copyRoot.cloneNode(true)).catch((error) => {
		console.warn("ourstuff_reader_copy_upgrade_failed", error);
	});
}

function toggleSpaceEnabled(spaceId) {
	const normalized = normalizeDataSpaceId(spaceId);
	if (normalized === PERSONAL_SPACE_ID) {
		return;
	}
	const enabled = new Set(enabledSpaceIds());
	if (enabled.has(normalized)) {
		enabled.delete(normalized);
	} else {
		enabled.add(normalized);
	}
	const nextEnabled = saveEnabledSpaceIds([...enabled]);
	state.enabledSpaceIds = nextEnabled;
	if (!nextEnabled.includes(activeSpaceId())) {
		switchSpace(PERSONAL_SPACE_ID);
		return;
	}
	render();
}

function bindLocalAssetImages() {
	app.querySelectorAll("img[data-local-asset]").forEach(async (image) => {
		image.classList.add("is-loading");
		try {
			const resolved = await resolveLocalFile(image.dataset.localAsset);
			applyResolvedImageDimensions(image, resolved);
			if (resolved.url) {
				image.addEventListener("load", () => markLocalAssetReady(image), {
					once: true,
				});
				image.src = resolved.url;
				if (image.complete) {
					markLocalAssetReady(image);
				}
			} else {
				markLocalAssetMissing(image, "No local or cloud media file was found.");
			}
		} catch (error) {
			markLocalAssetMissing(image, error);
		}
	});
	app.querySelectorAll("a[data-local-asset-link]").forEach(async (link) => {
		link.addEventListener("click", (event) => {
			if (!link.href || link.getAttribute("href") === "#") {
				event.preventDefault();
			}
		});
		try {
			const resolved = await resolveLocalFile(link.dataset.localAssetLink);
			if (resolved.url) {
				link.href = resolved.url;
				link.download = link.dataset.localAssetName || resolved.name || "image";
				markLocalAssetReady(link);
			} else {
				markLocalAssetMissing(link, "No local or cloud media file was found.");
			}
		} catch (error) {
			markLocalAssetMissing(link, error);
		}
	});
	app.querySelectorAll("a[data-local-file-link]").forEach(async (link) => {
		link.addEventListener("click", (event) => {
			if (!link.href || link.getAttribute("href") === "#") {
				event.preventDefault();
			}
		});
		try {
			const resolved = await resolveLocalFile(link.dataset.localFileLink);
			if (resolved.url) {
				link.href = resolved.url;
				link.download = resolved.name || link.download || "download";
				markLocalAssetReady(link);
			} else {
				markLocalAssetMissing(link, "No local or cloud media file was found.");
			}
		} catch (error) {
			markLocalAssetMissing(link, error);
		}
	});
}

function handleAction(element) {
	const action = element.dataset.action;
	if (action === "toggle-space-enabled") {
		toggleSpaceEnabled(element.dataset.space || PERSONAL_SPACE_ID);
		return;
	}
	if (action === "create-custom-space") {
		void createCustomSpaceFromDom().catch((error) => {
			window.alert(
				error instanceof Error ? error.message : "Could not create this space.",
			);
		});
		return;
	}
	if (action === "switch-space") {
		const target = element.dataset.space || PERSONAL_SPACE_ID;
		if (target !== activeSpaceId() && DATA_SPACES[target]) {
			switchSpace(target);
		}
		return;
	}
	if (action === "space-unlock") {
		void unlockActiveSpaceFromDom();
		return;
	}
	if (action === "space-pin-set") {
		void setSpacePinAction();
		return;
	}
	if (action === "space-pin-remove") {
		void removeSpacePinAction();
		return;
	}
	if (action === "space-lock-now") {
		lockActiveSpaceNow();
		return;
	}
	if (action === "create-empty-space") {
		void createEmptySpace(element.dataset.space || WORK_SPACE_ID);
		return;
	}
	if (action === "restore-space-defaults") {
		void restoreSpaceDefaults(element.dataset.space || WORK_SPACE_ID);
		return;
	}
	if (action === "start-navigation-tour") {
		startNavigationTour(element);
		return;
	}
	if (action === "stop-navigation-tour") {
		stopNavigationTour();
		return;
	}
	if (action === "open-camera") {
		openCamera(cameraTargetFromElement(element));
	}
	if (action === "close-camera") {
		closeCamera();
	}
	if (action === "upload-camera-target") {
		uploadCameraTargetImages();
	}
	if (action === "capture-camera") {
		void captureCameraPhoto();
	}
	if (action === "open-timer") {
		openTimer();
	}
	if (action === "close-timer") {
		closeTimer();
	}
	if (action === "timer-start-pause") {
		toggleTimerRunning();
	}
	if (action === "timer-reset") {
		resetTimer();
	}
	if (action === "timer-set-preset") {
		setTimerDuration(Number(element.dataset.seconds));
	}
	if (action === "timer-set-custom") {
		setCustomTimerFromDom();
	}
	if (action === "timer-test-sound") {
		updateTimerSettingsFromDom({ persist: true });
		playTimerAlarm();
	}
	if (action === "home") {
		goHome();
	}
	if (action === "dashboard-root") {
		if (state.active === "Mind") {
			setState({
				active: "Mind",
				mindMode: "grid",
				selectedCompendiumId: null,
				selectedSectionId: null,
			});
		} else if (state.active === "Spirit") {
			setState({
				selectedSpiritBookKey: null,
				artifactMode: "grid",
				selectedArtifactId: null,
			});
		} else if (state.active === "PYXIDA") {
			openPyxdia("input");
		} else {
			setState({ artifactMode: "grid", selectedArtifactId: null });
		}
	}
	if (action === "compendium-root") {
		setState({ mindMode: "manager", selectedSectionId: null });
	}
	if (action === "toggle-mobile-menu") {
		if (state.suppressNextMenuToggle) {
			state.suppressNextMenuToggle = false;
		} else {
			toggleMobileMenu();
		}
	}
	if (action === "toggle-sidebar-section") {
		toggleSidebarSection(element.dataset.section);
	}
	if (action === "toggle-pyxdia-menu") {
		setState({ pyxdiaExpanded: !state.pyxdiaExpanded });
	}
	if (action === "toggle-all-sidebar-sections") {
		toggleAllSidebarSections();
	}
	if (action === "sidebar-page") {
		setSidebarPage(
			element.dataset.section,
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
		);
	}
	if (action === "tracker-page") {
		setTrackerPage(
			element.dataset.area,
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
			element.dataset.editable === "true",
			element.dataset.kind || "thought",
		);
	}
	if (action === "open-dashboard-card") {
		openDashboardCard(element.dataset.section);
	}
	if (action === "open-dashboard-direct") {
		setState({
			active: element.dataset.section,
			sidebarSubmenu: "",
			flipped: null,
			artifactMode: "grid",
			selectedArtifactId: null,
			selectedSpiritBookKey: null,
		});
	}
	if (action === "set-dashboard-period") {
		setDashboardPeriod(element.dataset.period);
	}
	if (action === "set-dashboard-chart") {
		if (state.suppressNextDashboardChartClick) {
			state.suppressNextDashboardChartClick = false;
			return;
		}
		setDashboardChartType(element.dataset.chart);
	}
	if (action === "set-theme") {
		setTheme(element.dataset.theme);
	}
	if (action === "set-color-mode") {
		setColorMode(element.dataset.colorMode);
	}
	if (action === "save-dashboard-identity") {
		saveDashboardIdentitySettings();
	}
	if (action === "reset-dashboard-identity-item") {
		resetDashboardIdentityItem(element.dataset.dashboard);
	}
	if (action === "open-icon-picker") {
		openIconPicker(element);
	}
	if (action === "close-icon-picker") {
		closeIconPicker();
	}
	if (action === "select-icon-picker-icon") {
		selectIconPickerIcon(element.dataset.icon);
	}
	if (action === "select-icon-picker-color") {
		selectIconPickerColor(element.dataset.color);
	}
	if (action === "save-icon-picker") {
		saveIconPickerSelection();
	}
	if (action === "load-more-icon-picker") {
		loadMoreIconPickerIcons();
	}
	if (action === "open-compendium") {
		openCompendium(element.dataset.id);
	}
	if (action === "mind-compendium-page") {
		setMindCompendiumPage(
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
		);
	}
	if (action === "toggle-mind-compendium-picker") {
		toggleMindCompendiumPicker();
	}
	if (action === "select-mind-compendium") {
		selectMindCompendiumFromPicker(
			element.dataset.id,
			Number(element.dataset.index || 0),
			Number(element.dataset.perPage || 1),
		);
	}
	if (action === "open-mind-section") {
		openMindSection(element.dataset.parentId, element.dataset.id);
	}
	if (action === "open-artifact-note") {
		openArtifactNote(element.dataset.id, element.dataset.returnActive || "");
	}
	if (action === "open-life-activity") {
		openActivityArtifact(element.dataset.id);
	}
	if (action === "export-artifacts") {
		exportArtifacts();
	}
	if (action === "import-artifacts") {
		importArtifacts();
	}
	if (action === "factory-defaults") {
		restoreFactoryDefaults();
	}
	if (action === "clear-app-data") {
		if (cloudHasSyncAccess()) {
			void runCloudAction("Clearing space...", () => clearActiveSpaceData());
		} else {
			void clearActiveSpaceData().catch((error) => {
				window.alert(
					error instanceof Error ? error.message : "Could not clear this space.",
				);
			});
		}
		return;
	}
	if (action === "dismiss-tip") {
		dismissTip(element.dataset.tip, element);
	}
	if (action === "open-gallery") {
		openGallery();
	}
	if (action === "close-gallery") {
		goHome();
	}
	if (action === "open-trash") {
		openTrash();
	}
	if (action === "trash-refresh") {
		void runTrashAction("Refreshing Trash...", refreshTrashState);
	}
	if (action === "trash-save-settings") {
		void runTrashAction("Saving Trash settings...", saveTrashSettingsAction);
	}
	if (action === "trash-restore-item") {
		void runTrashAction("Restoring item...", () =>
			restoreTrashItemAction(element.dataset.id),
		);
	}
	if (action === "trash-hard-delete-item") {
		void runTrashAction("Deleting item...", () =>
			hardDeleteTrashItemAction(element.dataset.id),
		);
	}
	if (action === "gallery-select-all") {
		selectAllGalleryImages();
	}
	if (action === "gallery-clear-selection") {
		clearGallerySelection();
	}
	if (action === "gallery-delete-selected") {
		deleteSelectedGalleryImages();
	}
	if (action === "open-settings") {
		const closingSettings =
			state.mobileMenuOpen && state.sidebarSubmenu === "settings";
		setState({
			active: state.active === "Settings" ? "Dashboard" : state.active,
			mobileMenuOpen: !closingSettings,
			sidebarSubmenu: closingSettings ? "" : "settings",
			flipped: null,
			artifactMode: "grid",
			selectedArtifactId: null,
			selectedCompendiumId: null,
			selectedSectionId: null,
			selectedSpiritBookKey: null,
			trackerAddArea: "",
			trackerEditKey: "",
			trackerDeleteKey: "",
		});
	}
	if (action === "pyxdia-open-settings") {
		setState({
			active: state.active === "Settings" ? "Dashboard" : state.active,
			settingsTab: "pyxdia",
			mobileMenuOpen: true,
			sidebarSubmenu: "settings",
			flipped: null,
			artifactMode: "grid",
			selectedArtifactId: null,
			selectedCompendiumId: null,
			selectedSectionId: null,
			selectedSpiritBookKey: null,
			trackerAddArea: "",
			trackerEditKey: "",
			trackerDeleteKey: "",
		});
	}
	if (action === "close-settings") {
		setState({ sidebarSubmenu: "", mobileMenuOpen: false });
	}
	if (action === "close-sidebar-submenu") {
		setState({ sidebarSubmenu: "", mobileMenuOpen: true });
	}
	if (action === "set-settings-tab") {
		setState({
			mobileMenuOpen: true,
			sidebarSubmenu: "settings",
			settingsTab:
				element.dataset.tab === "dashboard"
					? "interface"
					: element.dataset.tab || "getting-started",
			trackerAddArea: "",
			trackerEditKey: "",
			trackerDeleteKey: "",
		});
	}
	if (action === "pyxdia-open-input") {
		openPyxdia("input");
	}
	if (action === "pyxdia-open-output") {
		openPyxdia("output");
	}
	if (action === "pyxdia-open-thread") {
		const threadId = element.dataset.id || "";
		selectPyxdiaRecipientForThread(threadId);
		openPyxdia("thread", { pyxdiaActiveThreadId: threadId });
		void markSelectedPyxdiaThreadRead().catch(() => {});
	}
	if (action === "pyxdia-reply-thread") {
		openPyxdiaReplyToThread(
			element.dataset.id || state.pyxdiaActiveThreadId || "",
		);
	}
	if (action === "pyxdia-select-correspondent") {
		selectPyxdiaCorrespondent(
			element.dataset.recipientType || "pyxdia",
			element.dataset.recipientUid || "",
		);
		void markSelectedPyxdiaThreadRead().catch(() => {});
	}
	if (action === "open-family-invites") {
		setState({
			active: state.active === "Settings" ? "Dashboard" : state.active,
			mobileMenuOpen: true,
			sidebarSubmenu: "settings",
			settingsTab: "cloud",
		});
	}
	if (action === "set-pyxdia-view") {
		openPyxdia(element.dataset.view || "input");
	}
	if (action === "set-pyxdia-editor-mode") {
		if (document.getElementById("pyxdia-letter-input")) {
			savePyxdiaDraftLocal(pyxdiaDraftFromDom(), { render: false });
		}
		setState({
			pyxdiaEditorMode:
				element.dataset.mode === "preview" ? "preview" : "markdown",
		});
	}
	if (action === "pyxdia-note-select-visible") {
		pyxdiaVisibleNoteCheckboxes().forEach((checkbox) => {
			checkbox.checked = true;
		});
		savePyxdiaNoteSelectionFromDom("custom");
	}
	if (action === "pyxdia-note-clear-visible") {
		pyxdiaVisibleNoteCheckboxes().forEach((checkbox) => {
			checkbox.checked = false;
		});
		savePyxdiaNoteSelectionFromDom("custom");
	}
	if (action === "pyxdia-note-reset-all") {
		app.querySelectorAll("[data-pyxdia-note-ref]").forEach((checkbox) => {
			checkbox.checked = true;
		});
		savePyxdiaNoteSelectionFromDom("all");
	}
	if (action === "pyxdia-save-draft") {
		void runPyxdiaAction("Saving draft...", savePyxdiaDraftAction);
	}
	if (action === "pyxdia-send-letter") {
		void runPyxdiaAction("Sending letter...", sendPyxdiaLetterAction);
	}
	if (action === "pyxdia-refresh") {
		void runPyxdiaAction("Refreshing Pen Pal...", refreshPyxdiaState);
	}
	if (action === "pyxdia-retry-letter") {
		const letter = state.pyxdiaLetters.find(
			(item) => item.id === element.dataset.id,
		);
		void runPyxdiaAction(
			isTemplatePyxdiaReply(letter)
				? "Regenerating reply..."
				: "Retrying letter...",
			() => retryPyxdiaLetterAction(element.dataset.id),
		);
	}
	if (action === "pyxdia-delete-letter") {
		void deletePyxdiaLetterAction(element.dataset.id);
	}
	if (action === "pyxdia-toggle-delay") {
		window.setTimeout(() => {
			const settings = pyxdiaSettingsFromForm();
			state.pyxdiaSettings = settings;
			savePyxdiaSettingsLocal(settings);
			schedulePyxdiaSettingsPersist({ immediate: true });
		}, 0);
	}
	if (action === "pyxdia-save-settings") {
		const settings = pyxdiaSettingsFromForm();
		void runPyxdiaAction("Saving Pen Pal settings...", () =>
			savePyxdiaSettingsAction(settings),
		);
	}
	if (action === "pyxdia-reset-memory") {
		void runPyxdiaAction("Resetting Pen Pal memory...", resetPyxdiaMemoryAction);
	}
	if (action === "cloud-sign-in") {
		rememberCloudAuthView();
		void runCloudAction("Signing in...", () => signInToCloud());
	}
	if (action === "cloud-google-sign-in") {
		rememberCloudAuthView();
		void runCloudAction("Opening Google sign-in...", () => signInWithGoogle());
	}
	if (action === "cloud-email-sign-in") {
		const credentials = cloudEmailCredentialsFromDom();
		rememberCloudAuthView();
		void runCloudAction("Signing in...", () => signInWithEmailForm(credentials));
	}
	if (action === "cloud-email-create") {
		const credentials = cloudEmailCredentialsFromDom();
		rememberCloudAuthView();
		void runCloudAction("Creating account...", () =>
			signInWithEmailForm(credentials, { create: true }),
		);
	}
	if (action === "cloud-sign-out") {
		void runCloudAction("Signing out...", () => signOutCloud());
	}
	if (action === "cloud-subscribe") {
		void runCloudAction("Opening subscription checkout...", () =>
			startCloudSubscription(cloudReturnUrl()),
		);
	}
	if (action === "cloud-billing") {
		void runCloudAction("Opening billing portal...", () =>
			openBillingPortal(cloudReturnUrl()),
		);
	}
	if (action === "cloud-sync-now") {
		void runCloudAction("Syncing to Cloud...", () => syncCloudNow());
	}
	if (action === "cloud-load") {
		void runCloudAction("Loading Cloud records...", () =>
			loadCloudIntoLocalApp(),
		);
	}
	if (action === "cloud-delete-account") {
		void runCloudAction("Deleting Cloud account...", () =>
			deleteCloudAccountData(),
		);
	}
	if (action === "family-member-add") {
		void runCloudAction("Sending Family invite...", () => sendFamilyInviteFromDom(element));
	}
	if (action === "family-invite-accept") {
		void runCloudAction("Accepting Family invite...", () =>
			acceptFamilyInviteAction(element.dataset.inviteId || ""),
		);
	}
	if (action === "family-invite-decline") {
		void runCloudAction("Declining Family invite...", () =>
			declineFamilyInvite(element.dataset.inviteId || ""),
		);
	}
	if (action === "family-member-role") {
		void runCloudAction("Updating Family member...", () =>
			updateFamilyMember(element.dataset.uid || "", element.dataset.role || "reader"),
		);
	}
	if (action === "family-member-remove") {
		void runCloudAction("Removing Family member...", () =>
			removeFamilyMemberAction(element.dataset.uid || ""),
		);
	}
	if (action === "family-leave") {
		void runCloudAction("Leaving Family space...", () => leaveFamilySpaceAction());
	}
	if (action === "obsidian-create-key" || action === "obsidian-refresh-key") {
		void runCloudAction("Preparing Obsidian sync key...", () =>
			createOrRotateObsidianSyncKey(),
		);
	}
	if (action === "obsidian-copy-key") {
		void runCloudAction("Copying Obsidian sync key...", () =>
			copyLatestObsidianApiKey(),
		);
	}
	if (action === "obsidian-delete-key") {
		void runCloudAction("Deleting Obsidian sync key...", () =>
			deleteObsidianKeyAction(),
		);
	}
	if (action === "obsidian-refresh-key-status") {
		void runCloudAction("Refreshing Obsidian sync key status...", () =>
			refreshObsidianSyncKey(),
		);
	}
	if (action === "start-add-tracker") {
		const area = element.dataset.area || "";
		const kind = trackerKind(element.dataset.kind || "thought");
		setState({
			trackerAddArea: trackerAddKey(area, kind),
			trackerEditKey: "",
			trackerDeleteKey: "",
		});
		scrollTrackerEditorIntoView(
			`[data-tracker-add-form][data-area="${selectorValue(area)}"][data-kind="${selectorValue(kind)}"]`,
		);
	}
	if (action === "cancel-add-tracker") {
		setState({ trackerAddArea: "" });
	}
	if (action === "start-edit-tracker") {
		if (state.suppressNextTrackerClick || state.suppressNextTrackerEditClick) {
			state.suppressNextTrackerClick = false;
			state.suppressNextTrackerEditClick = false;
			return;
		}
		const area = element.dataset.area || "";
		const id = element.dataset.id || "";
		const kind = trackerKind(element.dataset.kind || "thought");
		setState({
			trackerEditKey: trackerEditKey(area, id, kind),
			trackerDeleteKey: "",
			trackerAddArea: "",
		});
		scrollTrackerEditorIntoView(
			`[data-tracker-edit-form][data-area="${selectorValue(area)}"][data-id="${selectorValue(id)}"][data-kind="${selectorValue(kind)}"]`,
		);
	}
	if (action === "cancel-edit-tracker") {
		setState({ trackerEditKey: "", trackerDeleteKey: "" });
	}
	if (action === "save-edit-tracker") {
		updateTracker(
			element.dataset.area,
			element.dataset.id,
			element.dataset.kind || "thought",
		);
	}
	if (action === "transfer-tracker-kind") {
		transferTrackerKind(
			element.dataset.area,
			element.dataset.id,
			element.dataset.kind || "thought",
		);
	}
	if (action === "request-remove-tracker") {
		setState({
			trackerDeleteKey: trackerEditKey(
				element.dataset.area,
				element.dataset.id,
				element.dataset.kind || "thought",
			),
		});
	}
	if (action === "cancel-remove-tracker") {
		setState({ trackerDeleteKey: "" });
	}
	if (action === "save-tracker") {
		addTracker(element.dataset.area, element.dataset.kind || "thought");
	}
	if (action === "remove-tracker") {
		removeTracker(
			element.dataset.area,
			element.dataset.id,
			element.dataset.kind || "thought",
		);
	}
	if (action === "quick-thought") {
		if (state.suppressNextTrackerClick) {
			state.suppressNextTrackerClick = false;
			return;
		}
		quickThought(element.dataset.area, element.dataset.id);
	}
	if (action === "quick-goal") {
		if (state.suppressNextTrackerClick) {
			state.suppressNextTrackerClick = false;
			return;
		}
		quickGoal(element.dataset.area, element.dataset.id, element);
	}
	if (action === "open-thought-toast-note") {
		const noteId = element.dataset.id || state.thoughtToast?.noteId;
		const dashboard =
			state.thoughtToast?.dashboard ||
			findArtifact(state.artifactStore, noteId)?.dashboard ||
			"";
		applyThoughtToastTimestamp(noteId);
		clearThoughtToast();
		openArtifactNote(noteId, dashboard);
	}
	if (action === "submit-thought-toast-note") {
		submitThoughtToastNote(
			element.dataset.id || state.thoughtToast?.noteId,
			document.getElementById("thought-toast-note")?.value ||
				state.thoughtToast?.quickNote ||
				"",
		);
	}
	if (action === "delete-thought-toast-note") {
		void deleteThoughtToastNote(
			element.dataset.id || state.thoughtToast?.noteId,
		);
	}
	if (action === "dismiss-thought-toast") {
		clearThoughtToast();
	}
	if (action === "new-compendium") {
		addCompendium();
	}
	if (action === "new-artifact-note") {
		addDashboardNote(element.dataset.dashboard);
	}
	if (action === "delete-compendium") {
		void deleteCompendium(element.dataset.id);
	}
	if (action === "delete-section") {
		void deleteSection(element.dataset.id);
	}
	if (action === "delete-artifact-note") {
		void deleteDashboardNote(element.dataset.id);
	}
	if (action === "save-body-fast-settings") {
		saveBodyFastSettings();
	}
	if (action === "start-body-fast") {
		startBodyFast();
	}
	if (action === "stop-body-fast") {
		stopBodyFast();
	}
	if (action === "save-body-timer-settings") {
		saveBodyTimerSettings(element.dataset.mode);
	}
	if (action === "start-body-timer") {
		startBodyTimer(element.dataset.mode);
	}
	if (action === "stop-body-timer") {
		stopBodyTimer(element.dataset.mode);
	}
	if (action === "save-body-nutrition") {
		saveBodyNutrition();
	}
	if (action === "save-body-nutrition-goals") {
		saveBodyNutritionGoals();
	}
	if (action === "reset-body-nutrition") {
		resetBodyNutrition();
	}
	if (action === "add-body-workout") {
		addBodyWorkout();
	}
	if (action === "delete-body-workout") {
		deleteBodyWorkout(element.dataset.id);
	}
	if (action === "set-body-mode") {
		setBodyMode(element.dataset.mode);
	}
	if (action === "set-body-timer-mode") {
		setBodyTimerMode(element.dataset.mode);
	}
	if (action === "set-body-nutrition-mode") {
		setBodyNutritionMode(element.dataset.mode);
	}
	if (action === "set-life-tool") {
		setLifeTool(element.dataset.tool);
	}
	if (action === "set-life-mode") {
		setLifeMode(element.dataset.mode);
	}
	if (action === "add-life-todo") {
		addLifeTodo();
	}
	if (action === "toggle-life-todo") {
		toggleLifeTodo(element.dataset.id);
	}
	if (action === "toggle-life-task") {
		toggleLifeTaskItem(
			element.dataset.source,
			element.dataset.id,
			element.dataset.projectId,
			element.dataset.phaseId,
		);
	}
	if (action === "edit-life-task-notes") {
		editLifeTaskNotes(
			element.dataset.source,
			element.dataset.id,
			element.dataset.projectId,
			element.dataset.phaseId,
		);
	}
	if (action === "open-life-task") {
		openLifeTaskItem(
			element.dataset.source,
			element.dataset.id,
			element.dataset.projectId,
			element.dataset.phaseId,
		);
	}
	if (action === "open-life-project-task") {
		openLifeProjectTask(
			element.dataset.projectId,
			element.dataset.phaseId,
			element.dataset.taskId,
		);
	}
	if (action === "delete-life-todo") {
		deleteLifeTodo(element.dataset.id);
	}
	if (action === "add-life-project") {
		addLifeProject();
	}
	if (action === "select-life-project") {
		selectLifeProject(element.dataset.id);
	}
	if (action === "select-life-phase") {
		selectLifePhase(element.dataset.id);
	}
	if (action === "select-life-task") {
		if (element.dataset.projectId && element.dataset.phaseId) {
			setState({
				lifeTool: "projects",
				selectedLifeProjectId: element.dataset.projectId,
				selectedLifePhaseId: element.dataset.phaseId,
				selectedLifeTaskId: element.dataset.taskId,
			});
		} else {
			selectLifeTask(element.dataset.taskId);
		}
	}
	if (action === "add-life-phase") {
		addLifePhase(element.dataset.projectId);
	}
	if (action === "add-life-project-task") {
		addLifeProjectTask(element.dataset.projectId, element.dataset.phaseId);
	}
	if (action === "save-life-project-entity") {
		saveLifeProjectEntity(element.dataset.level);
	}
	if (action === "upload-life-attachment") {
		uploadLifeAttachment(element.dataset.level);
	}
	if (action === "delete-life-attachment") {
		deleteLifeAttachment(element.dataset.level, element.dataset.id);
	}
	if (action === "set-spirit-year") {
		setSpiritYear(Number(element.dataset.year));
	}
	if (action === "spirit-prev-year") {
		const years = spiritYears();
		const index = years.indexOf(state.spiritYear);
		if (index > 0) {
			setSpiritYear(years[index - 1]);
		}
	}
	if (action === "spirit-next-year") {
		const years = spiritYears();
		const index = years.indexOf(state.spiritYear);
		if (index >= 0 && index < years.length - 1) {
			setSpiritYear(years[index + 1]);
		}
	}
	if (action === "open-spirit-book") {
		openSpiritBook(element.dataset.key);
	}
	if (action === "exit-spirit-book") {
		exitSpiritBook();
	}
	if (action === "exit-spirit-note") {
		setState({ selectedArtifactId: null, artifactMode: "grid" });
	}
	if (action === "add-spirit-book-note") {
		addSpiritBookNote(element.dataset.key);
	}
	if (action === "toggle-spirit-complete") {
		toggleSpiritComplete(element.dataset.key);
	}
	if (action === "reader") {
		setState({ mindMode: "reader" });
	}
	if (action === "manager") {
		setState({ mindMode: "manager" });
	}
	if (action === "compendium-reader-page") {
		setCompendiumReaderPage(
			element.dataset.id,
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
		);
	}
	if (action === "reader-gallery-page") {
		setReaderGalleryPage(
			element.dataset.galleryKey,
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
		);
	}
	if (action === "copy-reader-page") {
		void copyActiveReaderPage();
	}
	if (action === "edit-compendium") {
		setState({ mindMode: "compendium-editor" });
	}
	if (action === "add-section") {
		addSection();
	}
	if (action === "open-section") {
		setState({
			selectedSectionId: element.dataset.id,
			mindMode: "section-viewer",
		});
	}
	if (action === "edit-section") {
		setState({ mindMode: "section-editor" });
	}
	if (action === "section-viewer") {
		setState({ mindMode: "section-viewer" });
	}
	if (action === "edit-artifact-note") {
		setState({ artifactMode: "editor" });
	}
	if (action === "artifact-viewer") {
		closeArtifactEditor();
	}
	if (action === "close-artifact-viewer") {
		closeArtifactViewer();
	}
	if (action === "save-compendium") {
		saveCompendium(element.dataset.id, editorTitle(), editorBody());
	}
	if (action === "save-section") {
		saveSection(element.dataset.id, editorTitle(), editorBody());
	}
	if (action === "save-artifact-note") {
		saveDashboardNote(element.dataset.id, editorTitle(), editorBody());
	}
}

function editorTitle() {
	return document.getElementById("editor-title")?.value.trim() || "";
}

function editorBody() {
	return document.getElementById("editor-body")?.value || "";
}

function updateBodyTimerDom() {
	BODY_TIMER_MODES.forEach(({ key }) => {
		const timer = bodyTimerState(key);
		if (!timer.active) {
			return;
		}

		const timeEl = document.getElementById(`body-timer-${key}-time`);
		const ringEl = document.getElementById(`body-timer-${key}-ring`);
		if (!timeEl || !ringEl) {
			return;
		}

		timeEl.textContent = formatDuration(getBodyTimerElapsedMs(key));
		ringEl.style.strokeDashoffset = String(
			RING_CIRCUMFERENCE * (1 - getBodyTimerProgress(key)),
		);
	});
}

window.addEventListener("pagehide", () => {
	saveTimerState(state.timerState, { markChanged: false });
	stopCameraStream();
});
window.addEventListener("storage", (event) => {
	if (event.key !== ACTIVE_SPACE_KEY || event.newValue === event.oldValue) {
		return;
	}
	window.location.reload();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden && state.cameraOpen) {
		closeCamera();
	}
	if (document.hidden) {
		saveTimerState(state.timerState, { markChanged: false });
	}
});
document.addEventListener("copy", handleReaderCopy);
["pointerdown", "keydown", "wheel", "touchstart", "input"].forEach(
	(eventName) => {
		document.addEventListener(eventName, markUserInterfaceActivity, {
			capture: true,
			passive: true,
		});
	},
);

applyEnvironmentClasses();
if (state.timerState?.running) {
	startTimerInterval();
}
render();
void initCloudAccount((cloud) => {
	const previousSignature = cloudUiSignature(state.cloud);
	state.cloud = cloud;
	configureMediaCloudContext(cloud);
	const showAuthView =
		cloud?.mode === "signed-in" && cloud?.user && consumeCloudAuthView();
	if (showAuthView) {
		state.active = state.active === "Settings" ? "Dashboard" : state.active;
		state.mobileMenuOpen = true;
		state.sidebarSubmenu = "settings";
		state.settingsTab = "cloud";
	}
	const nextSignature = cloudUiSignature(cloud);
	if (showAuthView || (previousSignature !== nextSignature && !isUserEditingInterface())) {
		render();
	} else {
		patchVisibleCloudStatus();
	}
	configureCloudAutoSync();
	if (state.artifactStore) {
		void maybePromptCloudImport(cloud);
	}
	if (cloud?.mode === "signed-in") {
		void refreshPyxdiaState({ silent: true });
	}
});

const installedAppMedia = window.matchMedia?.(INSTALLED_APP_QUERY);
const mobileViewportMedia = window.matchMedia?.(MOBILE_MENU_QUERY);
const compendiumTwoMedia = window.matchMedia?.(COMPENDIUM_TWO_QUERY);
const compendiumOneMedia = window.matchMedia?.(COMPENDIUM_ONE_QUERY);
bindEnvironmentMedia(installedAppMedia);
bindEnvironmentMedia(mobileViewportMedia);
bindEnvironmentMedia(compendiumTwoMedia);
bindEnvironmentMedia(compendiumOneMedia);

loadArtifactStore().then(async (artifactStore) => {
	if (artifactStore.appState && !hasStoredAppState()) {
		await restoreImportedAppState(artifactStore.appState);
	}
	artifactStore = migrateBodyWorkoutsToNotes(artifactStore);
	if (
		artifactStore.artifacts?.some(
			(artifact) => artifact.properties?.sourceType === "workout",
		)
	) {
		saveArtifactStore(artifactStore);
	}
	setState({
		artifactStore,
		compendiums: normalizeCompendiums(
			artifactStoreToCompendiums(artifactStore),
		),
	});
	configureMediaCloudContext(state.cloud);
	configureCloudAutoSync();
	void maybePromptCloudImport(state.cloud);
});

loadSpiritPlan();

window.setInterval(updateBodyTimerDom, 1000);
