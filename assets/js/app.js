import {
	autoUpdate,
	computePosition,
	flip,
	offset,
	shift,
} from "https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.5/+esm";
import {
	deleteCloudAccount,
	deleteCloudStateJson,
	estimateCloudStateStorageUsage,
	estimateJsonBytes,
	getCloudAccountState,
	getCloudIdToken,
	getCloudStateInfo,
	initCloudAccount,
	loadCloudStateJson,
	openBillingPortal,
	recordCloudSyncAt,
	saveCloudStateJson,
	signInToCloud,
	signInWithEmailPassword,
	signInWithGoogle,
	signOutCloud,
	startCloudSubscription,
} from "./cloud.js?v=auth-sync-20260525a";
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
	resolveLocalImageUrl,
	storeLocalFile,
	storeLocalImage,
	storeLocalImageFromDataUrl,
} from "./localMedia.js?v=media-key-repair-20260525a";
import { escapeHtml, renderMarkdown } from "./markdown.js";
import {
	DEFAULT_PYXIDA_SETTINGS,
	estimatePyxdiaLetterSize,
	fetchPyxdiaState,
	normalizePyxdiaDynamicRetrievalMemory,
	normalizePyxdiaSettings,
	normalizePyxdiaStaticMemory,
	normalizePyxdiaUserSelectedContext,
	pyxdiaNoteRefsFromArtifacts,
	resetPyxdiaMemory,
	retryPyxdiaLetter,
	savePyxdiaDraft,
	savePyxdiaSettings,
	sendPyxdiaLetter,
} from "./pyxdia.js?v=trash-r3-20260525a";
import {
	pyxdiaImageMarkdown,
	resolvePyxdiaImageUrl,
	uploadPyxdiaLetterImage,
} from "./pyxdiaMedia.js?v=pyxdia-20260525a";
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
	STORAGE_KEY,
	upsertArtifact,
	saveArtifactStore as writeArtifactStore,
} from "./storage.js?v=trash-r3-20260525a";
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
} from "./trash.js?v=trash-20260525a";

const app = document.getElementById("app");
const BODY_TRACKER_KEY = "ourstuff.bodyTracker.v1";
const SPIRIT_PROGRESS_KEY = "ourstuff.spiritPlanProgress.v1";
const LIFE_PLANNER_KEY = "ourstuff.lifePlanner.v1";
const TRACKER_SETTINGS_KEY = "ourstuff.thoughts.v1";
const GOAL_SETTINGS_KEY = "ourstuff.goals.v1";
const DASHBOARD_IDENTITY_KEY = "ourstuff.dashboardIdentity.v1";
const DASHBOARD_CHART_TABS_KEY = "ourstuff.dashboardChartTabs.v1";
const SIDEBAR_WIDTH_KEY = "ourstuff.sidebarWidth.v1";
const THEME_KEY = "ourstuff.theme.v1";
const PYXIDA_SETTINGS_KEY = "ourstuff.pyxdiaSettings.v1";
const PYXIDA_LOCAL_STATE_KEY = "ourstuff.pyxdiaPenpal.v1";
const DISMISSED_TIPS_KEY = "ourstuff.dismissedTips.v1";
const ICONIFY_SEARCH_CACHE_KEY = "ourstuff.iconifySearchCache.v1";
const LOCAL_APP_UPDATED_AT_KEY = "ourstuff.localAppUpdatedAt.v1";
const LOCAL_APP_OWNER_KEY = "ourstuff.localAppOwner.v1";
const CLOUD_SYNC_INTERVAL_MS = 2 * 60 * 1000;
const CLOUD_SYNC_MIN_INTERVAL_MS = 20 * 1000;
const CLOUD_SYNC_CLOCK_SKEW_MS = 1000;
const CLOUD_SYNC_DEBOUNCE_MS = 2500;
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
const DASHBOARD_RETURN_TIP = "dashboard-return";
const COMPENDIUM_GRID_TIP = "compendium-grid";
const SIMPLE_TOOLTIP_WORD_LIMIT = 7;
const GUIDED_TIP_SEQUENCE = [
	{
		id: DASHBOARD_RETURN_TIP,
		selector: ".dashboard-home-link",
		label: "Return to dashboard",
		placement: "bottom",
		when: () => state.active !== "Dashboard",
	},
	{
		id: "dashboard-balance-tip",
		selector: ".dashboard-analytics",
		label: "Check your balance",
		placement: "bottom",
	},
	{
		id: "dashboard-range-tip",
		selector: ".dashboard-period-slider:not(.sidebar-period-slider)",
		label: "Change time range",
		placement: "top",
	},
	{
		id: "dashboard-chart-tip",
		selector: ".dashboard-chart-switcher",
		label: "Switch dashboard tab",
		placement: "top",
	},
	{
		id: "dashboard-card-tip",
		selector: ".dashboard-card",
		label: "Open a core area",
		placement: "top",
	},
	{
		id: "sidebar-menu-tip",
		selector: ".mobile-menu-toggle",
		label: "Open side menu",
		placement: "bottom",
	},
	{
		id: "sidebar-sections-tip",
		selector: ".sidebar-group-toggle",
		label: "Open side sections",
		placement: "top",
	},
	{
		id: "sidebar-settings-tip",
		selector: ".sidebar-text-link[data-action='open-settings']",
		label: "Customize the interface",
		placement: "top",
	},
	{
		id: "dashboard-orbs-tip",
		selector: ".dashboard-orb-nav .tracker-orb:not(.tracker-orb--add)",
		label: "Tap orbs to log",
		placement: "top",
	},
	{
		id: "dashboard-tools-tip",
		selector:
			".body-tool-switcher .body-mode-button, .life-tool-switcher .body-mode-button, .spirit-year-button",
		label: "Switch tools here",
		placement: "top",
	},
	{
		id: COMPENDIUM_GRID_TIP,
		selector: ".compendium-page-indicator",
		label: "Open overview",
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
const DEFAULT_DASHBOARD_IDENTITY = {
	displayMode: "numbers",
	showNumbers: true,
	showIcons: false,
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
let dashboardPeriodGlowTimer = null;
let localChangeTrackingSuppressed = 0;
let cloudSyncInFlight = null;
let cloudAutoSyncTimer = null;
let cloudAutoSyncDebounceTimer = null;
let lastCloudAutoSyncAttemptAt = 0;
let cloudAutoSyncPrimedFor = "";
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

function createEmptyTrackerSettings() {
	return Object.fromEntries(
		DASHBOARD_LABELS.map((dashboard) => [dashboard, []]),
	);
}

function cloneDefaultDashboardIdentity() {
	return {
		displayMode: DEFAULT_DASHBOARD_IDENTITY.displayMode,
		showNumbers: DEFAULT_DASHBOARD_IDENTITY.showNumbers,
		showIcons: DEFAULT_DASHBOARD_IDENTITY.showIcons,
		items: Object.fromEntries(
			DASHBOARD_LABELS.map((dashboard) => [
				dashboard,
				{ ...DEFAULT_DASHBOARD_IDENTITY.items[dashboard] },
			]),
		),
	};
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
	if (/^#[0-9a-f]{6}$/i.test(expanded)) {return expanded.toLowerCase();}
	return fallback;
}

function normalizeDashboardIdentity(value) {
	const defaults = cloneDefaultDashboardIdentity();
	const displayMode =
		value?.displayMode === "icons" || value?.showIcons === true
			? "icons"
			: "numbers";
	return {
		displayMode,
		showNumbers: displayMode === "numbers",
		showIcons: displayMode === "icons",
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
		if (!tabs.includes(tab)) {tabs.push(tab);}
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
	if (typeof tracker?.enabled === "boolean")
		{normalized.enabled = tracker.enabled;}
	if (typeof tracker?.isGoal === "boolean") {normalized.isGoal = tracker.isGoal;}
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

function normalizeTrackerSettings(value) {
	const defaults = cloneDefaultTrackers();
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

function normalizeGoalSettings(value) {
	const defaults = cloneDefaultGoals();
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
			: cloneDefaultTrackers();
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(
				TRACKER_SETTINGS_KEY,
				JSON.stringify(normalized),
			);
		}
		return normalized;
	} catch {
		return cloneDefaultTrackers();
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
			: cloneDefaultGoals();
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
			window.localStorage.setItem(
				GOAL_SETTINGS_KEY,
				JSON.stringify(normalized),
			);
		}
		return normalized;
	} catch {
		return cloneDefaultGoals();
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
		title: "PYXIDA memories",
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
		inputText: "",
		imageRefs: [],
		includedNoteRefs: [],
		userIncludedContext: "",
		userSelectedContext,
		contextSelections: [],
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

function normalizePyxdiaDraft(value = {}) {
	const fallback = createEmptyPyxdiaDraft();
	const draft = value && typeof value === "object" ? value : {};
	const userSelectedContext = normalizePyxdiaUserSelectedContext({
		...(draft.userSelectedContext || {}),
		manualText:
			draft.userSelectedContext?.manualText ?? draft.userIncludedContext ?? "",
		selectedNoteRefs:
			draft.userSelectedContext?.selectedNoteRefs ??
			draft.includedNoteRefs ??
			[],
		contextSelections:
			draft.userSelectedContext?.contextSelections ??
			draft.contextSelections ??
			[],
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
		inputText: String(draft.inputText || ""),
		imageRefs: normalizePyxdiaImageRefs(draft.imageRefs),
		includedNoteRefs: userSelectedContext.selectedNoteRefs,
		userIncludedContext: userSelectedContext.manualText,
		userSelectedContext,
		contextSelections: userSelectedContext.contextSelections,
		updatedAt: normalizeIsoTimestamp(draft.updatedAt) || "",
		schemaVersion: 1,
	};
}

function normalizePyxdiaThread(value = {}) {
	return {
		id: String(value.id || ""),
		owner: String(value.owner || ""),
		title: String(value.title || "PYXIDA letter thread"),
		status: String(value.status || "active"),
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
	if (!text) {return "";}
	const words = text.split(" ");
	return words.slice(0, maxWords).join(" ");
}

function rememberDismissedTip(tip) {
	if (!tip) {return;}
	const dismissedTips = Array.from(
		new Set([...(state.dismissedTips || []), tip]),
	);
	state.dismissedTips = dismissedTips;
	saveDismissedTips(dismissedTips);
}

function setCoreTooltip(element, label, options = {}) {
	if (!element) {return;}
	if (!options.override && element.dataset.thoughtTooltip) {return;}
	const text = simpleTooltipText(label);
	if (!text) {return;}
	element.dataset.thoughtTooltip = text;
	if (!element.getAttribute("aria-label") && !element.textContent.trim()) {
		element.setAttribute("aria-label", text);
	}
	if (!element.getAttribute("title")) {element.setAttribute("title", text);}
}

function applyCoreTooltips() {
	const coreRules = [
		[".mobile-menu-toggle", "Open menu"],
		[".dashboard-home-link", "Return home"],
		[".dashboard-period-range", "Change time range"],
		[".dashboard-chart-switcher [data-chart='orbs']", "Orbs"],
		[".dashboard-chart-switcher [data-chart='pie']", "Pie chart"],
		[".dashboard-chart-switcher [data-chart='bar']", "Bar chart"],
		[".sidebar-menu-nav-button", "Toggle side sections"],
		[".sidebar-text-link[data-action='open-settings']", "Open settings"],
		[".sidebar-text-link[data-action='open-gallery']", "Open gallery"],
		[".sidebar-text-link[data-action='import-artifacts']", "Import data"],
		[".sidebar-text-link[data-action='export-artifacts']", "Export data"],
		[".sidebar-text-link[data-action='reset-tips']", "Replay tips"],
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
		if (!parsed?.fast || !parsed?.nutrition) {return createDefaultBodyTracker();}
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
	if (!hasLeft && !hasRight) {return 0;}
	if (hasLeft && !hasRight) {return 1;}
	if (!hasLeft && hasRight) {return -1;}
	const diff = leftTime - rightTime;
	if (Math.abs(diff) <= CLOUD_SYNC_CLOCK_SKEW_MS) {return 0;}
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
	if (normalized) {bucket.push(normalized);}
}

function collectLifeEntityTimestamps(entity, bucket) {
	if (!entity) {return;}
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

function markLocalAppChanged(value = nowIso()) {
	if (localChangeTrackingSuppressed > 0) {return "";}
	const updatedAt = saveLocalAppUpdatedAt(value);
	queueCloudSyncAfterLocalChange();
	return updatedAt;
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
	if (stored) {return stored;}
	const derived = deriveLocalAppUpdatedAt();
	if (derived && options.persistDerived !== false)
		{saveLocalAppUpdatedAt(derived);}
	return derived;
}

function localCloudOwnerId(cloud = state.cloud) {
	if (cloud?.mode !== "signed-in" || !cloud.user?.uid) {return "";}
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
		if (normalized)
			{window.localStorage.setItem(LOCAL_APP_OWNER_KEY, normalized);}
		else {window.localStorage.removeItem(LOCAL_APP_OWNER_KEY);}
	} catch {
		// Owner tracking prevents cross-account writes, but sync can still fall back to timestamps.
	}
	return normalized;
}

function removeLocalAppStorageKeys() {
	[
		STORAGE_KEY,
		BODY_TRACKER_KEY,
		SPIRIT_PROGRESS_KEY,
		LIFE_PLANNER_KEY,
		TRACKER_SETTINGS_KEY,
		GOAL_SETTINGS_KEY,
		DASHBOARD_IDENTITY_KEY,
		THEME_KEY,
		ICONIFY_SEARCH_CACHE_KEY,
		LOCAL_APP_UPDATED_AT_KEY,
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
	state.localAppUpdatedAt = "";
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
	saveLocalAppOwner(ownerId);
	render();
}

async function ensureLocalAccountBoundary(cloud = state.cloud) {
	const ownerId = localCloudOwnerId(cloud);
	if (!ownerId) {return false;}
	const previousOwner = loadLocalAppOwner();
	if (previousOwner && previousOwner !== ownerId && hasStoredLocalData()) {
		await resetLocalAppForAccountSwitch(ownerId);
		return true;
	}
	if (!previousOwner && !hasStoredLocalData()) {saveLocalAppOwner(ownerId);}
	return false;
}

function saveArtifactStore(store) {
	writeArtifactStore(store);
	markLocalAppChanged();
}

function queueCloudSyncAfterLocalChange() {
	try {
		if (!cloudHasSyncAccess()) {return;}
		if (cloudAutoSyncDebounceTimer)
			{window.clearTimeout(cloudAutoSyncDebounceTimer);}
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
	app.classList.toggle("is-installed-app", installed);
	app.classList.toggle("is-browser-mode", !installed);
	app.classList.toggle("is-mobile-viewport", mobile);
	app.classList.toggle("is-desktop-viewport", !mobile);
	app.dataset.displayMode = installed ? "standalone" : "browser";
	app.dataset.viewportMode = mobile ? "mobile" : "desktop";
	applyThemeVariables(theme);
	app.dataset.theme = theme;
}

function bindEnvironmentMedia(media) {
	if (!media) {return;}
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
	if (!value || status === "complete") {return value;}
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
		if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized))
			{saveLifePlannerStore(normalized);}
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
		cloudMediaKey: await exportCloudMediaKey(),
		localFiles: await exportLocalFiles({
			includeData: options.includeLocalFileData !== false,
		}).catch(() => []),
	};
}

async function exportAppStateJson(options = {}) {
	return {
		schemaVersion: SCHEMA_VERSION,
		rootId: state.artifactStore?.rootId || "ourstuff-root",
		artifacts: Array.isArray(state.artifactStore?.artifacts)
			? state.artifactStore.artifacts
			: [],
		metadata: {
			localUpdatedAt: localAppUpdatedAt(),
			exportedAt: nowIso(),
			deviceId: state.cloud?.deviceId || "",
		},
		appState: await exportAppState(options),
	};
}

async function restoreImportedAppState(appState) {
	if (!appState) {return;}
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
			cloneDefaultTrackers(),
	);
	const goalSettings = normalizeGoalSettings(
		appState?.goalSettings || appState?.goals || cloneDefaultGoals(),
	);
	const dashboardIdentity = normalizeDashboardIdentity(
		appState?.dashboardIdentity || cloneDefaultDashboardIdentity(),
	);
	const dashboardChartTabs = normalizeDashboardChartTabs(
		appState?.dashboardChartTabs || DEFAULT_DASHBOARD_CHART_TABS,
	);
	const theme = normalizeTheme(appState?.theme || state.theme);

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
	saveBodyTracker();
	saveSpiritProgress();
	saveLifePlannerStore(lifePlanner);
	saveTrackerSettings();
	saveGoalSettings();
	saveDashboardIdentity(dashboardIdentity);
	saveDashboardChartTabs(dashboardChartTabs);
	saveTheme(theme);
	if (appState.cloudMediaKey) {importCloudMediaKey(appState.cloudMediaKey);}
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
	const importedStore = {
		schemaVersion: json.schemaVersion,
		rootId: json.rootId || "ourstuff-root",
		artifacts: json.artifacts,
	};
	const sourceUpdatedAt = normalizeIsoTimestamp(options.sourceUpdatedAt);
	const appliedAt = sourceUpdatedAt || nowIso();
	const restore = async () => {
		persistArtifactStore(importedStore);
		await restoreImportedAppState(json.appState);
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
			"Imported JSON rebuilt Firebase artifacts.",
		);
	} else if (!sourceUpdatedAt && options.queueCloudSync !== false) {
		queueCloudSyncAfterLocalChange();
	}
}

function cloudReturnUrl() {
	return `${window.location.origin}${window.location.pathname}`;
}

function cloudHasSyncAccess(cloud = state.cloud) {
	return Boolean(
		state.artifactStore && cloud?.mode === "signed-in" && cloud.user,
	);
}

function cloudMediaSyncAccess(cloud = state.cloud) {
	return Boolean(
		cloud?.mode === "signed-in" && cloud.user?.uid && !cloud.isLocalDemo,
	);
}

function configureMediaCloudContext(cloud = state.cloud) {
	configureCloudMedia({
		uid: cloud?.user?.uid || "",
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
	if (!state.artifactStore?.artifacts?.length || !cloudMediaSyncAccess())
		{return { migrated: 0 };}

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
		if (state.active === "Gallery") {await refreshGalleryImages();}
	}

	return { migrated };
}

function assertNoCloudBase64Images(json) {
	const serialized = JSON.stringify(json ?? {});
	if (/data:image\/[a-z0-9.+-]+;base64,/i.test(serialized)) {
		throw new Error(
			"Base64 images must be migrated to encrypted Firebase Storage before Firebase artifact sync.",
		);
	}
}

async function migrateLocalImagesToCloudBeforeSync() {
	configureMediaCloudContext();
	if (!cloudMediaSyncAccess()) {return { migrated: 0 };}
	const inline = await migrateInlineBase64ImagesInArtifacts();
	const local = await migrateLocalMediaToCloud({
		uid: state.cloud.user.uid,
		repairMissingRemote: true,
		...localMediaStoreOptions(),
	});
	const migrated = (inline.migrated || 0) + (local.migrated || 0);
	if (migrated > 0 && state.active === "Gallery") {await refreshGalleryImages();}
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
			if (options.requireCloudInfo) {throw error;}
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
			source: info?.exists ? "firebase-artifacts" : "current-device",
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
	if ((Number(usage?.totalBytes) || 0) <= CLOUD_STORAGE_LIMIT_BYTES) {return;}
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
	if (!isReady()) {return;}
	if (cloudStorageUsageRefreshTimer)
		{window.clearTimeout(cloudStorageUsageRefreshTimer);}
	cloudStorageUsageRefreshTimer = window.setTimeout(() => {
		cloudStorageUsageRefreshTimer = null;
		void refreshCloudStorageUsage(options);
	}, options.delayMs ?? 0);
}

async function refreshCloudStorageUsage(options = {}) {
	if (cloudStorageUsageRefreshInFlight) {return;}
	cloudStorageUsageRefreshInFlight = true;
	try {
		const usage = await calculateCloudStorageUsage();
		const fingerprint = cloudStorageUsageFingerprint(usage);
		if (options.force || fingerprint !== cloudStorageUsageSignature) {
			cloudStorageUsageSignature = fingerprint;
			setState({ cloudStorageUsage: usage });
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
			setState({ cloudStorageUsage: fallback });
		}
	} finally {
		cloudStorageUsageRefreshInFlight = false;
	}
}

async function uploadLocalStateToCloud() {
	await migrateLocalImagesToCloudBeforeSync();
	const json = await exportAppStateJson({ includeLocalFileData: false });
	assertNoCloudBase64Images(json);
	const storageBytes = await localMediaStorageBytes();
	const usage = await calculateCloudStorageUsage({ json, storageBytes });
	assertCloudStorageUsageAllowed(usage);
	const result = await saveCloudStateJson(json, { storageBytes });
	const updatedAt = normalizeIsoTimestamp(result?.updatedAt) || nowIso();
	saveLocalAppUpdatedAt(updatedAt);
	saveLocalAppOwner();
	scheduleCloudStorageUsageRefresh({ force: true });
	return { updatedAt };
}

async function importCloudInfoIntoLocal(info) {
	const cloudUpdatedAt = cloudInfoUpdatedAt(info);
	const json = info?.json || (await loadCloudStateJson());
	await importAppStateJson(json, {
		sourceUpdatedAt:
			cloudUpdatedAt ||
			normalizeIsoTimestamp(json?.metadata?.localUpdatedAt) ||
			nowIso(),
	});
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
	if (action === "uploaded")
		{return `${prefix} saved this device to Firebase artifacts and encrypted media.`;}
	if (action === "downloaded")
		{return `${prefix} loaded Firebase artifacts into this device.`;}
	if (action === "cleared") {return `${prefix} applied the Firebase deletion.`;}
	return `${prefix} checked. Already current.`;
}

function finishCloudSyncResult(result, source = "manual") {
	if (!result || result.action === "skipped") {return result;}
	const message = cloudSyncMessage(result.action, source);
	recordCloudSyncAt(nowIso(), message);
	return { ...result, message };
}

async function syncCloudWithNewestWins(options = {}) {
	const source = options.source || "manual";
	if (!cloudHasSyncAccess())
		{return { action: "skipped", message: "Cloud sync is not active." };}
	if (source !== "manual" && isUserEditingInterface()) {
		return { action: "skipped", message: "Auto sync paused while editing." };
	}
	if (cloudSyncInFlight) {return cloudSyncInFlight;}

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
			return finishCloudSyncResult({ action: "downloaded", ...result }, source);
		}

		if (source === "interval" && info?.exists && !localHasStoredData) {
			const result = await importCloudInfoIntoLocal(info);
			return finishCloudSyncResult({ action: "downloaded", ...result }, source);
		}

		if (info?.exists && localHasStoredData && syncComparison > 0) {
			const result = await importCloudInfoIntoLocal(info);
			return finishCloudSyncResult({ action: "downloaded", ...result }, source);
		}

		if (info?.exists && localHasStoredData && syncComparison === 0) {
			saveLocalAppOwner();
			return finishCloudSyncResult(
				{ action: "checked", updatedAt: cloudUpdatedAt || localUpdatedAt },
				source,
			);
		}

		if (info?.deleted && (!localHasStoredData || syncComparison >= 0)) {
			const result = await clearLocalFromCloudDelete(info);
			return finishCloudSyncResult({ action: "cleared", ...result }, source);
		}

		if (!info?.exists && !localHasStoredData) {
			saveLocalAppOwner();
			return finishCloudSyncResult(
				{ action: "checked", updatedAt: cloudUpdatedAt || localUpdatedAt },
				source,
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
			);
		}

		const result = await uploadLocalStateToCloud();
		return finishCloudSyncResult(
			{
				action: "uploaded",
				updatedAt: cloudUpdatedAt || localUpdatedAt,
				...result,
			},
			source,
		);
	})();

	try {
		return await cloudSyncInFlight;
	} finally {
		cloudSyncInFlight = null;
	}
}

async function triggerCloudAutoSync(source = "interval", options = {}) {
	if (!cloudHasSyncAccess()) {return { action: "skipped" };}
	if (source !== "manual" && isUserEditingInterface()) {
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
		return await syncCloudWithNewestWins({ source });
	} catch (error) {
		setCloudStatus({
			...getCloudAccountState(),
			busy: false,
			message: "Auto sync failed.",
			error: error instanceof Error ? error.message : "Cloud sync failed.",
		});
		return { action: "error" };
	}
}

function configureCloudAutoSync() {
	if (!cloudHasSyncAccess()) {
		if (cloudAutoSyncTimer) {window.clearInterval(cloudAutoSyncTimer);}
		if (cloudAutoSyncDebounceTimer)
			{window.clearTimeout(cloudAutoSyncDebounceTimer);}
		cloudAutoSyncTimer = null;
		cloudAutoSyncDebounceTimer = null;
		lastCloudAutoSyncAttemptAt = 0;
		cloudAutoSyncPrimedFor = "";
		return;
	}
	if (cloudAutoSyncTimer) {return;}
	cloudAutoSyncTimer = window.setInterval(() => {
		void triggerCloudAutoSync("interval");
	}, CLOUD_SYNC_INTERVAL_MS);
}

async function syncCloudNow() {
	return await syncCloudWithNewestWins({ source: "manual" });
}

async function loadCloudIntoLocalApp() {
	const confirmed = window.confirm(
		"Load the saved Firebase artifacts into this browser? This replaces the current local app state. Export first if you need a backup.",
	);
	if (!confirmed) {return;}
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
	recordCloudSyncAt(nowIso(), "Firebase artifacts loaded.");
	return { message: "Firebase artifacts loaded." };
}

async function deleteCloudData() {
	const confirmed = window.confirm(
		"Delete the Firebase artifact collection for this app and reset this browser too? Export first if you need a backup.",
	);
	if (!confirmed) {return;}
	const result = await deleteCloudStateJson();
	await withLocalChangeTrackingSuppressed(() => clearAppData({ silent: true }));
	saveLocalAppUpdatedAt(cloudInfoUpdatedAt(result) || nowIso());
	return { message: "Firebase artifacts deleted." };
}

async function deleteCloudAccountData() {
	const confirmed = window.confirm(
		"Fully delete your cloud account and reset this browser? This removes Firebase app artifacts, requests cloud account deletion, and clears local app data. Export first if you need a backup.",
	);
	if (!confirmed) {return;}
	await deleteCloudAccount();
	await withLocalChangeTrackingSuppressed(() => clearAppData({ silent: true }));
	saveLocalAppUpdatedAt(nowIso());
	return { message: "Cloud account deletion requested." };
}

async function maybePromptCloudImport(cloud) {
	if (!cloudHasSyncAccess(cloud)) {return;}
	const userKey = `${cloud.user?.uid || cloud.user?.email || "cloud-user"}:${cloud.deviceId || ""}`;
	if (cloudAutoSyncPrimedFor === userKey) {return;}
	if (isUserEditingInterface()) {return;}
	cloudAutoSyncPrimedFor = userKey;
	await triggerCloudAutoSync("sign-in", { force: true });
}

async function signInWithEmailForm(options = {}) {
	const email = document.getElementById("cloud-email")?.value || "";
	const password = document.getElementById("cloud-password")?.value || "";
	await signInWithEmailPassword(email, password, options);
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
			window.localStorage.getItem(THEME_KEY),
	);
}

function hasStoredLocalData() {
	return Boolean(
		window.localStorage.getItem(STORAGE_KEY) || hasStoredAppState(),
	);
}

const initialPyxdiaLocalState = loadPyxdiaLocalState();
const initialDashboardChartTabs = loadDashboardChartTabs();

const state = {
	active: "Dashboard",
	flipped: null,
	artifactStore: null,
	compendiums: [],
	selectedCompendiumId: null,
	selectedSectionId: null,
	mindCompendiumPage: 0,
	mindCompendiumPickerOpen: false,
	compendiumReaderPages: {},
	selectedArtifactId: null,
	artifactReturnActive: "",
	mindMode: "grid",
	artifactMode: "grid",
	bodyMode: "timers",
	bodyTimerMode: "fasting",
	bodyNutritionMode: "daily",
	lifeTool: "",
	lifeMode: "month",
	settingsTab: "getting-started",
	theme: loadTheme(),
	pyxdiaSettings: loadPyxdiaSettings(),
	pyxdiaThreads: initialPyxdiaLocalState.threads,
	pyxdiaLetters: initialPyxdiaLocalState.letters,
	pyxdiaDraft: initialPyxdiaLocalState.draft,
	pyxdiaMemory: initialPyxdiaLocalState.memory,
	pyxdiaExpanded: false,
	pyxdiaView: "input",
	pyxdiaActiveThreadId: "",
	pyxdiaStatus: "",
	pyxdiaError: "",
	pyxdiaBusy: false,
	pyxdiaLastRefreshAt: "",
	dismissedTips: loadDismissedTips(),
	dashboardIdentity: loadDashboardIdentity(),
	trackerAddArea: "",
	trackerEditKey: "",
	trackerDeleteKey: "",
	suppressNextTrackerEditClick: false,
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
	bodyTracker: loadBodyTracker(),
	trackerSettings: loadTrackerSettings(),
	goalSettings: loadGoalSettings(),
	localAppUpdatedAt: loadLocalAppUpdatedAt(),
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

function makeId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayDateKey() {
	const date = new Date();
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeyFromValue(value) {
	if (!value) {return todayDateKey();}
	const text = String(value);
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {return text;}
	const date = new Date(text);
	if (Number.isNaN(date.getTime())) {return todayDateKey();}
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
	if (!value) {return "";}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {return "";}
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
	return `${iconHtml(icon)}<span class="${labelClass}">${label}</span>`;
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
	if (state.active === "PYXIDA") {return { kind: "pyxdia" };}
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
	if (explicitKind === "pyxdia") {return { kind: "pyxdia" };}
	if (explicitKind === "editor") {return { kind: "editor" };}
	const dashboard = element?.dataset?.dashboard || state.active;
	return normalizeCameraTarget({ kind: "dashboard", dashboard });
}

function cameraTargetLabel(target = state.cameraTarget) {
	const normalized = normalizeCameraTarget(
		target || activeCameraTarget() || {},
	);
	if (normalized.kind === "pyxdia") {return "PYXIDA letter";}
	if (normalized.kind === "editor") {return "Current note";}
	return `${dashboardDisplayLabel(normalized.dashboard)} note`;
}

function pathCameraButtonHtml() {
	const target = activeCameraTarget();
	if (!target) {return "";}
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
	if (state.dashboardIdentity?.showNumbers) {
		parts.push(
			`<span class="dashboard-card-number">${escapeHtml(dashboardDisplayNumber(dashboard))}</span>`,
		);
	}
	const labelParts = [];
	if (state.dashboardIdentity?.showIcons) {
		labelParts.push(
			`<span class="dashboard-card-icon">${iconHtml(dashboardDisplayIcon(dashboard))}</span>`,
		);
	}
	const displayLabel = dashboardDisplayLabel(dashboard).toUpperCase();
	const overflowCount = Math.max(0, displayLabel.length - 10);
	const fontSize = Math.max(0.62, 1.12 - overflowCount * 0.055);
	labelParts.push(
		`<span class="dashboard-card-name" style="font-size: ${fontSize.toFixed(3)}rem;">${escapeHtml(displayLabel)}</span>`,
	);
	parts.push(
		`<span class="dashboard-card-label">${labelParts.join("")}</span>`,
	);
	return parts.join("");
}

function dashboardInlineLabelHtml(dashboard) {
	const parts = [];
	if (state.dashboardIdentity?.showNumbers)
		{parts.push(`<span>${escapeHtml(dashboardDisplayNumber(dashboard))}</span>`);}
	if (state.dashboardIdentity?.showIcons)
		{parts.push(iconHtml(dashboardDisplayIcon(dashboard)));}
	parts.push(`<span>${escapeHtml(dashboardDisplayLabel(dashboard))}</span>`);
	return parts.join("");
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
	if (!/^<svg[\s>]/i.test(source) || source.length > 16000) {return "";}
	try {
		const doc = new DOMParser().parseFromString(source, "image/svg+xml");
		if (
			doc.querySelector("parsererror") ||
			doc.documentElement?.tagName?.toLowerCase() !== "svg"
		)
			{return "";}
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
		if (dataUrl)
			{return `<img class="tracker-orb-image" src="${escapeHtml(dataUrl)}" alt="">`;}
	}
	if (isImageIconSource(value)) {
		return `<img class="tracker-orb-image" src="${escapeHtml(value)}" alt="">`;
	}
	return iconHtml(value || "tabler:circle");
}

function iconDisplayName(icon) {
	const value = normalizeIconSource(icon);
	if (!value) {return "Pick icon";}
	if (/^<svg[\s>]/i.test(value) || isImageIconSource(value)) {return "Custom";}
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
	if (query.length < 3) {return [];}
	return (state.iconSearchCache?.[iconifySearchKey(query, limit)] || [])
		.slice(0, limit)
		.map((icon) => ({ icon: normalizeIconifyIcon(icon) }));
}

function firstIconSuggestion(label, fallback = "tabler:circle") {
	return iconSuggestionsForLabel(label, 1)[0]?.icon || fallback;
}

async function searchIconifyIcons(label, limit = 7) {
	const query = String(label || "").trim();
	if (query.length < 3) {return [];}
	const cacheKey = iconifySearchKey(query, limit);
	if (Array.isArray(state.iconSearchCache?.[cacheKey]))
		{return state.iconSearchCache[cacheKey];}
	if (state.iconSearchInFlight[cacheKey])
		{return state.iconSearchInFlight[cacheKey];}

	const params = new URLSearchParams({
		query,
		limit: String(Math.max(32, limit)),
		prefixes: ICONIFY_PREFIXES,
	});
	state.iconSearchInFlight[cacheKey] = fetch(
		`${ICONIFY_SEARCH_URL}?${params.toString()}`,
	)
		.then((response) => {
			if (!response.ok)
				{throw new Error(`Iconify search failed (${response.status}).`);}
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
	if (!normalizedQuery) {return withSelected(ICON_PICKER_DEFAULT_ICONS);}
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
	if (!picker) {return "";}
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
	if (!picker?.colorFieldId) {return "";}
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
	if (!picker) {return "";}
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
	if (trackerKind(kind) === "goal") {saveGoalSettings();}
	else {saveTrackerSettings();}
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
	if (!editable && !visibleEntries.length) {return "";}
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
	if (trackerKind(kind) !== "goal") {return tracker.label;}
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
	if (!hasDashboardOrbs(dashboard)) {return "";}
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
	const config = trackerKindConfig(kind);
	const emptyText = kind === "goal" ? "No active goals" : "No active thoughts";
	return `
    <fieldset class="dashboard-orb-fieldset dashboard-orb-fieldset--${escapeHtml(kind)}">
      <legend>${escapeHtml(label)}</legend>
      <div class="dashboard-orb-scroll" data-dashboard-orb-scroll tabindex="0" aria-label="${escapeHtml(label)} quick ${escapeHtml(config.plural)}">
        <div class="dashboard-orb-scroll-track">
          ${
						entries.length
							? entries
									.map(({ dashboard, tracker }) =>
										trackerOrbHtml(dashboard, tracker, false, kind, false, {
											inlineColor: true,
											wrapClass: "dashboard-orb-quick-item",
										}),
									)
									.join("")
							: `<span class="dashboard-orb-empty">${escapeHtml(emptyText)}</span>`
					}
        </div>
      </div>
    </fieldset>
  `;
}

function dashboardQuickOrbsHtml() {
	return `
    <div class="dashboard-orbs-panel" aria-label="Quick tracker orbs">
      ${dashboardQuickOrbGroupHtml("thought", "Thoughts")}
      ${dashboardQuickOrbGroupHtml("goal", "Goals")}
    </div>
  `;
}

function trackerFieldId(area, field) {
	return `tracker-${String(area).toLowerCase()}-${field}`;
}

function addTracker(area, kind = "thought") {
	if (!DASHBOARD_LABELS.includes(area)) {return;}
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
	if (normalizedKind === "goal")
		{state.goalSettings = normalizeGoalSettings(next);}
	else {state.trackerSettings = normalizeTrackerSettings(next);}
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
	if (!DASHBOARD_LABELS.includes(area) || !id) {return;}
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
		if (!silent) {window.alert(config.emptyNameAlert);}
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
	if (normalizedKind === "goal")
		{state.goalSettings = normalizeGoalSettings(next);}
	else {state.trackerSettings = normalizeTrackerSettings(next);}
	saveTrackerSettingsForKind(normalizedKind);
	if (closeEditor) {setState({ trackerEditKey: "", trackerDeleteKey: "" });}
}

function transferTrackerKind(area, id, kind = "thought") {
	if (!DASHBOARD_LABELS.includes(area) || !id) {return;}
	const sourceKind = trackerKind(kind);
	const targetKind = sourceKind === "goal" ? "thought" : "goal";
	const sourceSettings = trackerSettingsForKind(sourceKind);
	const targetSettings = trackerSettingsForKind(targetKind);
	const sourceTrackers = sourceSettings?.[area] || [];
	const current = sourceTrackers.find((tracker) => tracker.id === id);
	if (!current) {return;}
	const sourceConfig = trackerKindConfig(sourceKind);
	const targetConfig = trackerKindConfig(targetKind);
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
			state.active === "Settings"
				? targetKind === "goal"
					? "goals"
					: "thoughts"
				: state.settingsTab,
	});
}

function reorderTracker(area, trackerId, targetIndex, kind = "thought") {
	if (!DASHBOARD_LABELS.includes(area)) {return false;}
	const normalizedKind = trackerKind(kind);
	const currentSettings = trackerSettingsForKind(normalizedKind);
	const trackers = currentSettings?.[area] || [];
	const fromIndex = trackers.findIndex((tracker) => tracker.id === trackerId);
	if (fromIndex < 0) {return false;}

	const nextTrackers = [...trackers];
	const [movedTracker] = nextTrackers.splice(fromIndex, 1);
	const nextIndex = Math.min(Math.max(targetIndex, 0), nextTrackers.length);
	nextTrackers.splice(nextIndex, 0, movedTracker);
	if (
		nextTrackers.map((tracker) => tracker.id).join("|") ===
		trackers.map((tracker) => tracker.id).join("|")
	)
		{return false;}

	const next = {
		...currentSettings,
		[area]: nextTrackers,
	};
	if (normalizedKind === "goal")
		{state.goalSettings = normalizeGoalSettings(next);}
	else {state.trackerSettings = normalizeTrackerSettings(next);}
	saveTrackerSettingsForKind(normalizedKind);
	setState({ trackerEditKey: "", trackerDeleteKey: "", trackerAddArea: "" });
	return true;
}

function removeTracker(area, id, kind = "thought") {
	if (!DASHBOARD_LABELS.includes(area) || !id) {return;}
	const normalizedKind = trackerKind(kind);
	const currentSettings = trackerSettingsForKind(normalizedKind);
	const next = {
		...currentSettings,
		[area]: (currentSettings?.[area] || []).filter(
			(tracker) => tracker.id !== id,
		),
	};
	if (normalizedKind === "goal")
		{state.goalSettings = normalizeGoalSettings(next);}
	else {state.trackerSettings = normalizeTrackerSettings(next);}
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
	if (Number.isNaN(date.getTime())) {return currentTimestampLabel();}
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function thoughtDateInputValue(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {return todayDateKey();}
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
	if (!note || Number.isNaN(date.getTime())) {return note;}
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
	if (!toast) {return;}
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
	)
		{return null;}
	return {
		id: active.id,
		start: active.type === "text" ? active.selectionStart : null,
		end: active.type === "text" ? active.selectionEnd : null,
	};
}

function restoreThoughtToastFocus(focusState) {
	if (!focusState) {return;}
	const input = document.getElementById(focusState.id);
	if (!(input instanceof HTMLInputElement)) {return;}
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
	if (!id) {return "";}
	if (saveAction === "save-compendium") {return `compendium:${id}`;}
	if (saveAction === "save-section") {return `section:${id}`;}
	if (saveAction === "save-artifact-note") {return `artifact:${id}`;}
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
	if (!key || !state.editorDrafts?.[key]) {return;}
	const nextDrafts = { ...state.editorDrafts };
	delete nextDrafts[key];
	state.editorDrafts = nextDrafts;
}

function clearCurrentEditorDraft() {
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
	if (!key) {return null;}

	const fields = {};
	form.querySelectorAll("input, textarea, select").forEach((field) => {
		if (!field.id) {return;}
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
	if (!draft?.focus?.id) {return;}
	const form = app.querySelector("[data-editor-draft-key]");
	if (form?.dataset.editorDraftKey !== draft.key) {return;}
	const field = document.getElementById(draft.focus.id);
	if (
		!(
			field instanceof HTMLInputElement ||
			field instanceof HTMLTextAreaElement ||
			field instanceof HTMLSelectElement
		)
	)
		{return;}
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
	if (isEditableAppElement(document.activeElement)) {return true;}
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
	if (!body || !noteId || !state.artifactStore) {return;}
	const current = findArtifact(state.artifactStore, noteId);
	if (!current) {return;}
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
	if (!noteId || !state.artifactStore) {return;}
	const current = findArtifact(state.artifactStore, noteId);
	if (!current) {return;}
	persistArtifactStore(
		upsertArtifact(state.artifactStore, {
			...thoughtNoteWithTimestamp(current, thoughtTimestampFromToastControls()),
			edited: nowIso(),
		}),
	);
}

async function deleteThoughtToastNote(noteId) {
	if (!noteId || !state.artifactStore) {return;}
	const note = findArtifact(state.artifactStore, noteId);
	if (!note) {
		clearThoughtToast();
		return;
	}
	const moved = await moveArtifactToTrash(note, {
		confirmText: `Move "${note.title}" to Trash?`,
	});
	if (!moved) {return;}
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
	if (!(triggerElement instanceof HTMLElement)) {return;}
	const reducedMotion = Boolean(
		window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
	);
	const rect = triggerElement.getBoundingClientRect();
	if (!rect.width || !rect.height) {return;}
	const burst = document.createElement("span");
	burst.className = "goal-confetti-burst";
	if (reducedMotion) {burst.classList.add("is-reduced-motion");}
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
	if (!state.artifactStore) {return [];}
	return rootNotesForDashboard(state.artifactStore, area)
		.filter((note) => note.properties?.role === "goal-progress")
		.filter((note) => !goalId || note.properties?.goalId === goalId);
}

function goalProgressCount(area, goalId = "") {
	return goalProgressArtifacts(area, goalId).length;
}

function quickTrackerEntry(area, id, kind = "thought", triggerElement = null) {
	if (!state.artifactStore || !DASHBOARD_LABELS.includes(area)) {return;}
	const normalizedKind = trackerKind(kind);
	const config = trackerKindConfig(normalizedKind);
	const cooldownKey = thoughtCooldownKey(area, id, normalizedKind);
	const tracker = (trackerSettingsForKind(normalizedKind)?.[area] || []).find(
		(item) => item.id === id,
	);
	if (!tracker || (normalizedKind === "goal" && !tracker.enabled)) {return;}
	if (
		thoughtCooldownRemaining(area, id, normalizedKind) > 0 ||
		state.thoughtCreateLocks[cooldownKey]
	)
		{return;}
	if (normalizedKind === "goal")
		{launchGoalBurst(triggerElement, dashboardColor(area));}
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
	if (!text) {return fallback;}
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
	if (!timestamp) {return 0;}
	if (/^\d{4}-\d{2}-\d{2}$/.test(String(timestamp))) {
		return new Date(`${timestamp}T12:00:00`).getTime() || 0;
	}
	return Date.parse(timestamp) || 0;
}

function createdTime(item) {
	const timestamp = item?.created || item?.properties?.createdAt || "";
	if (!timestamp) {return 0;}
	if (/^\d{4}-\d{2}-\d{2}$/.test(String(timestamp))) {
		return new Date(`${timestamp}T12:00:00`).getTime() || 0;
	}
	return Date.parse(timestamp) || 0;
}

function _newestCreatedFirst(items) {
	return [...items].sort((a, b) => {
		const timeDiff = createdTime(b) - createdTime(a);
		if (timeDiff) {return timeDiff;}
		return String(b.id || "").localeCompare(String(a.id || ""));
	});
}

function newestActivityFirst(items) {
	return [...items].sort((a, b) => {
		const timeDiff = activityTime(b) - activityTime(a);
		if (timeDiff) {return timeDiff;}
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
	if (!value) {return "Not started";}
	const text = String(value);
	if (/^\d{4}-\d{2}-\d{2}$/.test(text))
		{return formatDateLabel(text, { year: true });}
	const date = new Date(text);
	if (Number.isNaN(date.getTime())) {return text;}
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
	const trackers = lifeNoteTrackerSelections(note);
	const habits = legacyLifeHabits(note);
	const mood = note.properties?.mood || "";
	const energy = note.properties?.energy || "";
	const habitEmoji = {
		Move: "\ud83d\udeb6",
		Read: "\ud83d\udcd6",
		Create: "\ud83c\udfa8",
		Clean: "\u2728",
		Budget: "$",
		Connect: "\u2661",
		Pray: "\ud83d\ude4f",
		Sleep: "\u263e",
	};
	const moodEmoji = {
		great: "\ud83d\ude00",
		good: "\ud83d\ude42",
		steady: "\ud83d\ude10",
		low: "\ud83d\ude41",
		hard: "!",
	};
	return [
		["Track", trackers[0]?.label || habitEmoji[habits[0]] || "\u2022"],
		["Mood", moodEmoji[mood] || "\u2022"],
		["Energy", energy ? energy.slice(0, 1).toUpperCase() : "-"],
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
	if (note.dashboard === "Body") {return bodyMetaItems(note);}
	if (note.dashboard === "Spirit") {return spiritMetaItems(note);}
	if (note.dashboard === "Life") {return lifeMetaItems(note);}
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
	if (!timer.active || !start) {return 0;}
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
	if (!compendium) {return compendium;}
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
	if (Object.hasOwn(state.spiritProgress, key))
		{return Boolean(state.spiritProgress[key]);}
	const artifact = spiritArtifactForKey(key);
	if (artifact) {return Boolean(artifact.properties?.completed);}
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
	Object.assign(state, next);
	render();
}

function scrollPanelIntoView(panel) {
	if (!panel) {return;}
	const rect = panel.getBoundingClientRect();
	const viewportHeight =
		window.innerHeight || document.documentElement.clientHeight;
	const isMostlyVisible = rect.top >= 80 && rect.bottom <= viewportHeight - 40;
	if (isMostlyVisible) {return;}
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

async function runCloudAction(message, action) {
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
	const shouldExpand = !labels.every((label) => state.sidebarExpanded[label]);
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

function pyxdiaStatusText(letter) {
	const stateLabel = String(letter?.state || "").toLowerCase();
	if (stateLabel === "completed") {return "Reply ready.";}
	if (stateLabel === "processing") {return "PYXIDA is writing back.";}
	if (stateLabel === "queued" || stateLabel === "submitted")
		{return "Reply pending.";}
	if (stateLabel === "failed")
		{return letter?.errorMessageSafe || "PYXIDA could not finish. Try again.";}
	return "Draft saved.";
}

function pyxdiaThreadTitleFromText(text = "") {
	const clean = String(text || "")
		.replace(/\s+/g, " ")
		.trim();
	if (!clean) {return "PYXIDA letter thread";}
	return clean.length > 44 ? `${clean.slice(0, 41)}...` : clean;
}

function pyxdiaLettersByNewest() {
	return activePyxdiaLetters().sort((a, b) => {
		const bTime = Date.parse(b.updatedAt || b.createdAt || "") || 0;
		const aTime = Date.parse(a.updatedAt || a.createdAt || "") || 0;
		if (bTime !== aTime) {return bTime - aTime;}
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
		activePyxdiaLetters().map((letter) => letter.threadId),
	);
	return (
		state.pyxdiaThreads.find(
			(thread) => thread.id === threadId && activeThreadIds.has(thread.id),
		) || null
	);
}

function selectedPyxdiaThreadLetters() {
	const thread = selectedPyxdiaThread();
	if (!thread) {return [];}
	const ids = new Set(thread.letterIds || []);
	return pyxdiaLettersByNewest()
		.filter((letter) => letter.threadId === thread.id || ids.has(letter.id))
		.reverse();
}

function pyxdiaSelectedNoteRefs() {
	const selectedIds = new Set(state.pyxdiaDraft?.contextSelections || []);
	return pyxdiaNoteRefsFromArtifacts(state.artifactStore)
		.filter((ref) => selectedIds.has(ref.id))
		.map((ref) => ({ ...ref, userApprovedContentIncluded: false }));
}

function pyxdiaDraftFromDom() {
	const input = document.getElementById("pyxdia-letter-input");
	const context = document.getElementById("pyxdia-context-input");
	const selections = Array.from(
		document.querySelectorAll("[data-pyxdia-note-ref]:checked"),
	).map((item) => item.value);
	const selectedNoteRefs = pyxdiaNoteRefsFromArtifacts(
		state.artifactStore,
	).filter((ref) => selections.includes(ref.id));
	const userSelectedContext = normalizePyxdiaUserSelectedContext({
		manualText: context
			? context.value
			: state.pyxdiaDraft?.userIncludedContext || "",
		selectedNoteRefs,
		contextSelections: selections,
	});
	const now = nowIso();
	return normalizePyxdiaDraft({
		...(state.pyxdiaDraft || createEmptyPyxdiaDraft()),
		inputText: input ? input.value : state.pyxdiaDraft?.inputText || "",
		imageRefs: state.pyxdiaDraft?.imageRefs || [],
		userIncludedContext: userSelectedContext.manualText,
		userSelectedContext,
		contextSelections: selections,
		includedNoteRefs: selectedNoteRefs,
		updatedAt: now,
	});
}

function pyxdiaCurrentClientLetterId() {
	const current = normalizePyxdiaDraft(state.pyxdiaDraft);
	if (current.clientLetterId) {return current.clientLetterId;}
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
	if (!text) {return "Write a letter before sending.";}
	if (size.words > settings.letterMaxWords)
		{return `Letter is ${size.words} words. Limit is ${settings.letterMaxWords}.`;}
	if (size.chars > settings.letterMaxChars)
		{return `Letter is ${size.chars} characters. Limit is ${settings.letterMaxChars}.`;}
	return "";
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

function pyxdiaSettingsFromForm() {
	const current = state.pyxdiaSettings || DEFAULT_PYXIDA_SETTINGS;
	const delayEnabled = document.getElementById("pyxdia-setting-delay")?.checked;
	return normalizePyxdiaSettings({
		...current,
		enabled: document.getElementById("pyxdia-setting-enabled")?.checked,
		delayEnabled,
		pyxdiaDelayEnabled: delayEnabled,
		memoryEnabled: document.getElementById("pyxdia-setting-memory")?.checked,
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
				error instanceof Error ? error.message : "PYXIDA action failed.",
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
			pyxdiaStatus: options.silent ? state.pyxdiaStatus : "PYXIDA refreshed.",
			pyxdiaLastRefreshAt: nowIso(),
		});
		return;
	}
	processDueLocalPyxdiaJobs();
	savePyxdiaLocalState();
	setState({
		pyxdiaBusy: false,
		pyxdiaError: "",
		pyxdiaStatus: options.silent ? state.pyxdiaStatus : "PYXIDA refreshed.",
		pyxdiaLastRefreshAt: nowIso(),
	});
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
			pyxdiaError: "PYXIDA is turned off in Settings.",
		});
		return;
	}
	if (!isPyxdiaSignedIn()) {
		setState({
			pyxdiaBusy: false,
			pyxdiaStatus: "",
			pyxdiaError: "Sign in to send PYXIDA letters.",
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
	if (!letterId) {return;}
	if (isPyxdiaSignedIn() && !state.cloud?.isLocalDemo) {
		const payload = await retryPyxdiaLetter(letterId, {
			getIdToken: getCloudIdToken,
		});
		applyPyxdiaStatePayload(payload);
		setState({
			pyxdiaBusy: false,
			pyxdiaStatus: "Retry queued.",
			pyxdiaError: "",
		});
		return;
	}
	const letter = state.pyxdiaLetters.find((item) => item.id === letterId);
	if (!letter) {return;}
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
	if (!settings.delayEnabled) {processDueLocalPyxdiaJobs({ force: true });}
	savePyxdiaLocalState();
	setState({
		pyxdiaSettings: settings,
		pyxdiaBusy: false,
		pyxdiaStatus: "PYXIDA settings saved.",
		pyxdiaError: "",
	});
}

async function resetPyxdiaMemoryAction() {
	const confirmed = window.confirm("Reset PYXIDA memory for this app?");
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
		pyxdiaStatus: "PYXIDA memory reset.",
		pyxdiaError: "",
	});
}

function isTrashSignedIn() {
	return state.cloud?.mode === "signed-in" && !state.cloud?.isLocalDemo;
}

function trashAuthRequiredMessage() {
	return "Sign in with Cloud to move items to Trash.";
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
	if (isTrashSignedIn())
		{void runTrashAction("Loading Trash...", refreshTrashState);}
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
	if (!trashItemId) {return;}
	const item = state.trashItems.find(
		(entry) => entry.trashItemId === trashItemId,
	);
	const confirmed = window.confirm(`Restore "${item?.title || "this item"}"?`);
	if (!confirmed) {
		setState({ trashBusy: false, trashStatus: "", trashError: "" });
		return;
	}
	const result = await restoreTrashItem(trashItemId, {
		getIdToken: getCloudIdToken,
	});
	restoreLocalTrashItem(item || result);
	await refreshTrashState();
	setState({ trashStatus: "Item restored." });
}

async function hardDeleteTrashItemAction(trashItemId) {
	if (!trashItemId) {return;}
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
	const result = await hardDeleteTrashItem(trashItemId, {
		getIdToken: getCloudIdToken,
	});
	removeLocalTrashItem(item || result);
	await refreshTrashState();
	setState({ trashStatus: "Item permanently deleted." });
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
	if (!itemId || !state.artifactStore) {return false;}
	let changed = false;
	const now = nowIso();
	const artifacts = state.artifactStore.artifacts.map((artifact) => {
		if (artifact.id !== itemId) {return artifact;}
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
	if (changed) {persistArtifactStore({ ...state.artifactStore, artifacts });}
	return changed;
}

function removeLocalArtifact(itemId) {
	if (!itemId || !state.artifactStore) {return false;}
	const current = findAnyArtifact(state.artifactStore, itemId);
	if (!current) {return false;}
	persistArtifactStore({
		...state.artifactStore,
		artifacts: (state.artifactStore.artifacts || []).filter(
			(artifact) => artifact.id !== itemId,
		),
	});
	return true;
}

function upsertLocalPyxdiaLetterLifecycle(itemId, patch) {
	if (!itemId) {return false;}
	let changed = false;
	state.pyxdiaLetters = (state.pyxdiaLetters || []).map((letter) => {
		if (letter.id !== itemId) {return letter;}
		changed = true;
		return {
			...letter,
			...patch,
			updatedAt: nowIso(),
		};
	});
	if (changed) {savePyxdiaLocalState();}
	return changed;
}

function removeLocalPyxdiaLetter(itemId) {
	if (!itemId) {return false;}
	const before = state.pyxdiaLetters?.length || 0;
	state.pyxdiaLetters = (state.pyxdiaLetters || []).filter(
		(letter) => letter.id !== itemId,
	);
	const changed = state.pyxdiaLetters.length !== before;
	if (changed) {savePyxdiaLocalState();}
	return changed;
}

function restoreLocalTrashItem(item = {}) {
	const itemType = String(item.itemType || "");
	const itemId = item.itemId || item.id;
	if (itemType === "pyxdia_letter") {
		upsertLocalPyxdiaLetterLifecycle(itemId, localRestoreLifecyclePatch());
		return;
	}
	if (itemType === "artifact" || itemType === "note") {
		upsertLocalArtifactLifecycle(itemId, localRestoreLifecyclePatch());
	}
}

function removeLocalTrashItem(item = {}) {
	const itemType = String(item.itemType || "");
	const itemId = item.itemId || item.id;
	if (itemType === "pyxdia_letter") {
		removeLocalPyxdiaLetter(itemId);
		return;
	}
	if (itemType === "artifact" || itemType === "note") {
		removeLocalArtifact(itemId);
	}
}

function artifactIdsForTrash(artifact) {
	if (!artifact) {return [];}
	if (artifact.type !== "compendium") {return [artifact.id];}
	const childIds = (state.artifactStore?.artifacts || [])
		.filter((item) => item.parentId === artifact.id && !isDeletedArtifact(item))
		.map((item) => item.id);
	return [artifact.id, ...childIds];
}

async function moveArtifactIdsToTrash(ids, options = {}) {
	const cleanIds = Array.from(new Set((ids || []).filter(Boolean)));
	if (!cleanIds.length || !state.artifactStore) {return false;}
	if (!isTrashSignedIn()) {
		window.alert(trashAuthRequiredMessage());
		return false;
	}
	if (!window.confirm(options.confirmText || "Move this item to Trash?"))
		{return false;}
	try {
		if (cloudHasSyncAccess()) {await uploadLocalStateToCloud();}
		const results = [];
		for (const itemId of cleanIds) {
			const artifact = findAnyArtifact(state.artifactStore, itemId);
			const itemType = artifactTrashItemType(artifact);
			results.push(
				await deleteUserItem(
					{ itemType, itemId },
					{ getIdToken: getCloudIdToken },
				),
			);
		}
		results.forEach((result) => {
			const itemId = result.itemId || result.trashItem?.itemId;
			if (!itemId) {return;}
			if (result.mode === "hard") {removeLocalArtifact(itemId);}
			else
				{upsertLocalArtifactLifecycle(
					itemId,
					localLifecycleFromTrashResult(result),
				);}
		});
		if (state.active === "Trash") {await refreshTrashState().catch(() => {});}
		return true;
	} catch (error) {
		window.alert(
			error instanceof Error ? error.message : "Could not move item to Trash.",
		);
		return false;
	}
}

async function moveArtifactToTrash(artifact, options = {}) {
	const ids = artifactIdsForTrash(artifact);
	return moveArtifactIdsToTrash(ids, options);
}

async function deletePyxdiaLetterAction(letterId) {
	const letter = (state.pyxdiaLetters || []).find(
		(item) => item.id === letterId,
	);
	if (!letter || isDeletedPyxdiaLetter(letter)) {return;}
	if (!isTrashSignedIn()) {
		window.alert(trashAuthRequiredMessage());
		return;
	}
	if (!window.confirm("Move this PYXIDA letter to Trash?")) {return;}
	try {
		const result = await deleteUserItem(
			{ itemType: "pyxdia_letter", itemId: letterId },
			{ getIdToken: getCloudIdToken },
		);
		if (result.mode === "hard") {removeLocalPyxdiaLetter(letterId);}
		else
			{upsertLocalPyxdiaLetterLifecycle(
				letterId,
				localLifecycleFromTrashResult(result),
			);}
		if (state.active === "Trash") {await refreshTrashState().catch(() => {});}
		setState({
			pyxdiaLetters: state.pyxdiaLetters,
			pyxdiaActiveThreadId: selectedPyxdiaThreadLetters().length
				? state.pyxdiaActiveThreadId
				: "",
		});
	} catch (error) {
		window.alert(
			error instanceof Error
				? error.message
				: "Could not move letter to Trash.",
		);
	}
}

async function submitLocalPyxdiaLetter(draft, settings) {
	const now = nowIso();
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
			: "PYXIDA is preparing a reply.",
		pyxdiaBusy: false,
		pyxdiaError: "",
	});
	if (!settings.delayEnabled) {
		await completeLocalPyxdiaLetter(letterId);
	}
}

function processDueLocalPyxdiaJobs(options = {}) {
	if (!state.pyxdiaLetters?.length) {return;}
	const now = Date.now();
	const due = state.pyxdiaLetters.find((letter) => {
		if (!["queued", "submitted"].includes(letter.state)) {return false;}
		if (options.force === true) {return true;}
		const availableAt = Date.parse(letter.availableAt || "");
		return Number.isFinite(availableAt) && availableAt <= now;
	});
	if (due && !state.pyxdiaSettings?.delayEnabled) {
		void completeLocalPyxdiaLetter(due.id);
	}
}

async function completeLocalPyxdiaLetter(letterId) {
	const letter = state.pyxdiaLetters.find((item) => item.id === letterId);
	if (!letter) {return;}
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
		pyxdiaStatus: "PYXIDA is writing back.",
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

function buildLocalPyxdiaReply(letter, settings) {
	const firstLine =
		String(letter.inputText || "")
			.split(/\n+/)
			.map((line) => line.trim())
			.find(Boolean) || "your letter";
	const directness = settings.generalInstructions.includes("direct")
		? "I will stay direct and practical here."
		: "I will keep this grounded and practical.";
	return [
		"Dear friend,",
		"",
		`I read the shape of what you sent: ${firstLine.slice(0, 180)}${firstLine.length > 180 ? "..." : ""}`,
		"",
		`${directness} The pattern worth noticing is where responsibility, desire, and hesitation are meeting. In Adlerian language, that points toward the kind of belonging and usefulness you are trying to build. In DBT terms, start with what is observable, name the feeling without arguing with it, and choose one small next action. If an archetype helps, treat this as the part of you that wants a clearer role in the story, not as a fixed identity.`,
		"",
		"One useful next step is to write the smallest honest promise you can keep in the next day. Make it concrete enough that future you can see whether it happened.",
		"",
		"PYXIDA",
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
				letter.inputText || letter.outputText || "Prior PYXIDA letter",
			)
				.replace(/\s+/g, " ")
				.slice(0, 220),
			reason: "Same local PYXIDA conversation as the current letter.",
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
			.find(Boolean) || "User continued a PYXIDA letter thread.";
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
		: "User continued a PYXIDA letter; keep future replies grounded in practical reflection and small next steps.";
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
	if (!DASHBOARD_LABELS.includes(area) || !trackerId) {return;}
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
	if (sourceIndex < 0) {return;}
	const resolvedTarget = Number.isFinite(Number(targetIndex))
		? Number(targetIndex)
		: 0;
	const clampedTarget = Math.min(
		Math.max(resolvedTarget, 0),
		combinedTrackers.length,
	);
	if (sourceIndex === clampedTarget) {return;}
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
	if (workspace)
		{workspace.style.setProperty("--sidebar-width", `${nextWidth}px`);}
	const toggle = app.querySelector(".mobile-menu-toggle");
	if (toggle) {toggle.style.transform = "";}
	if (options.open) {
		state.mobileMenuOpen = true;
		if (workspace) {workspace.classList.add("has-mobile-menu");}
		if (toggle) {
			toggle.setAttribute("aria-expanded", "true");
			toggle.textContent = menuToggleLabel(true);
		}
	}
}

function toggleMobileMenu() {
	setState({ mobileMenuOpen: !state.mobileMenuOpen });
}

function closeMobileMenu() {
	if (!state.mobileMenuOpen) {return false;}
	state.mobileMenuOpen = false;
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
	return isOpen ? "vvv HIDE NOTES vvv" : "^^^ SHOW NOTES ^^^";
}

function persistCompendiums() {
	if (!state.artifactStore) {return;}
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
	if (!state.artifactStore) {return;}
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
	link.download = `ourstuff-artifacts-${dateKey}.json`;
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
		if (!file) {return;}
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
					? "Import this JSON and rebuild your Firebase artifact collection from it? This wipes the current cloud artifacts for this app first."
					: "Import this JSON and replace the current local app data?",
			);
			if (!confirmed) {return;}
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
			"Clear everything from this browser, including the mock app data and dismissed tips? This cannot be undone unless you have an export.",
		);
		if (!confirmed) {return;}
	}
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
	window.localStorage.removeItem(ICONIFY_SEARCH_CACHE_KEY);
	window.localStorage.removeItem(LOCAL_APP_UPDATED_AT_KEY);
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
}

async function restoreFactoryDefaults() {
	const confirmed = window.confirm(
		"Restore the Self Help Defaults with the original starter data, tips, orbs, goals, and app structure? This replaces local app data unless you have an export.",
	);
	if (!confirmed) {return;}
	const seedStore = await loadSeedStore();
	window.localStorage.removeItem(STORAGE_KEY);
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
	if (seedStore.appState) {await restoreImportedAppState(seedStore.appState);}
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
	if (!work) {return;}
	const completed = !isSpiritComplete(key);

	state.spiritProgress = { ...state.spiritProgress, [key]: completed };
	saveSpiritProgress();
	render();
}

function addSpiritBookNote(key) {
	const work = spiritWorks().find((entry) => entry.key === key);
	if (!work || !state.artifactStore) {return;}
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
		if (!response.ok)
			{throw new Error(`Could not load selected plan (${response.status}).`);}
		const parsed = await response.json();
		if (!parsed || !Array.isArray(parsed.years))
			{throw new Error("Selected plan must include a years array.");}
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
	if (!plan || plan.id === state.spiritPlanId) {return;}
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

function mindCompendiumColumns() {
	if (window.matchMedia?.(COMPENDIUM_ONE_QUERY).matches) {return 1;}
	if (window.matchMedia?.(COMPENDIUM_TWO_QUERY).matches) {return 2;}
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
	if (!state.mindCompendiumPickerOpen) {return;}
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
	if (!parentId || !sectionId) {return;}
	const compendium = state.compendiums.find((item) => item.id === parentId);
	if (!compendium?.sections?.some((section) => section.id === sectionId))
		{return;}
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
	if (!artifact) {return;}
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
	if (!artifact) {return;}
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
	if (!compendium) {return;}
	const artifact = findArtifact(state.artifactStore, id);
	const moved = await moveArtifactToTrash(artifact, {
		confirmText: `Move "${compendium.title}" and all of its sections to Trash?`,
	});
	if (!moved) {return;}
	setState({
		selectedCompendiumId: null,
		selectedSectionId: null,
		mindMode: "grid",
	});
}

function addSection() {
	const compendium = selectedCompendium();
	if (!compendium) {return;}
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
	if (!compendium) {return;}
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
	if (!compendium || !section) {return;}
	const artifact = findArtifact(state.artifactStore, id);
	const moved = await moveArtifactToTrash(artifact, {
		confirmText: `Move "${section.title}" to Trash?`,
	});
	if (!moved) {return;}
	setState({
		selectedSectionId: null,
		mindMode: "manager",
	});
}

function reorderCompendiumSection(compendiumId, sectionId, targetIndex) {
	let changed = false;
	state.compendiums = state.compendiums.map((compendium) => {
		if (compendium.id !== compendiumId) {return compendium;}
		const fromIndex = compendium.sections.findIndex(
			(section) => section.id === sectionId,
		);
		if (fromIndex < 0) {return compendium;}

		const sections = [...compendium.sections];
		const [movedSection] = sections.splice(fromIndex, 1);
		const nextIndex = Math.min(Math.max(targetIndex, 0), sections.length);
		if (nextIndex === fromIndex) {return compendium;}

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
	if (current.title !== title) {changed.push("title");}
	if (current.body !== body) {changed.push("body");}
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
	if (!current) {return;}
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
	if (!current) {return;}
	const title = editorTitle();
	const body = editorBody();
	const dateKey = dateKeyFromValue(
		document.getElementById("life-entry-date")?.value,
	);
	const mood = document.getElementById("life-entry-mood")?.value || "steady";
	const energy =
		document.getElementById("life-entry-energy")?.value || "medium";
	const thoughtTrackerIds = Array.from(
		document.querySelectorAll('[data-life-tracker="thought"]:checked'),
	).map((input) => input.value);
	const goalTrackerIds = Array.from(
		document.querySelectorAll('[data-life-tracker="goal"]:checked'),
	).map((input) => input.value);
	const properties = {
		...(current.properties || {}),
		role: "life-journal",
		status: "active",
		isNewDraft: false,
		dateKey,
		mood,
		energy,
		thoughtTrackerIds,
		goalTrackerIds,
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
	if (!note) {return;}
	const moved = await moveArtifactToTrash(note, {
		confirmText: `Move "${note.title}" to Trash?`,
	});
	if (!moved) {return;}
	setState({
		selectedArtifactId: null,
		artifactMode: "grid",
		artifactReturnActive: "",
	});
}

function appendBodyLogNote(title, body, properties = {}) {
	if (!state.artifactStore) {return;}
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
	if (!workouts.length) {return store;}
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
	if (!title) {return;}
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
	if (!task) {return;}
	updateLifeTaskItem(task, (item) => ({
		...item,
		status: item.status === "complete" ? "todo" : "complete",
	}));
}

function deleteLifeTodo(id) {
	const todo = lifeTodos().find((item) => item.id === id);
	if (!todo) {return;}
	if (!window.confirm(`Delete todo "${todo.title}"?`)) {return;}
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
	if (!task) {return;}
	const notes = window.prompt(`Notes for "${task.title}"`, task.notes || "");
	if (notes === null) {return;}
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
	if (!title) {return;}
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
	if (!title) {return;}
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
	if (!title) {return;}
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
				if (project.id !== projectId) {return project;}
				if (level === "project") {return { ...updater(project), edited: now };}
				return {
					...project,
					edited: now,
					phases: (project.phases || []).map((phase) => {
						if (phase.id !== phaseId) {return phase;}
						if (level === "phase") {return { ...updater(phase), edited: now };}
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
		if (!files.length) {return;}
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
		if (state.dashboardPeriodGlowUntil <= Date.now())
			{setState({ dashboardPeriodGlowUntil: 0 });}
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
	if (sourceIndex < 0) {return;}
	const resolvedTarget = Number.isFinite(Number(targetIndex))
		? Number(targetIndex)
		: 0;
	const clampedTarget = Math.min(Math.max(resolvedTarget, 0), tabs.length);
	if (sourceIndex === clampedTarget) {return;}
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
	saveTheme(nextTheme);
	setState({ theme: nextTheme });
}

function saveDashboardIdentitySettings() {
	const current = normalizeDashboardIdentity(state.dashboardIdentity);
	const displayMode =
		document.querySelector("input[name='dashboard-display-mode']:checked")
			?.value === "icons"
			? "icons"
			: "numbers";
	const nextIdentity = {
		displayMode,
		showNumbers: displayMode === "numbers",
		showIcons: displayMode === "icons",
		items: Object.fromEntries(
			DASHBOARD_LABELS.map((dashboard) => {
				const label =
					document
						.getElementById(`dashboard-identity-${dashboard}-label`)
						?.value.trim() || DEFAULT_DASHBOARD_IDENTITY.items[dashboard].label;
				const icon =
					document
						.getElementById(`dashboard-identity-${dashboard}-icon`)
						?.value.trim() ||
					current.items[dashboard]?.icon ||
					DEFAULT_DASHBOARD_IDENTITY.items[dashboard].icon;
				const color = normalizeHexColor(
					document.getElementById(`dashboard-identity-${dashboard}-color`)
						?.value,
					current.items[dashboard]?.color ||
						DEFAULT_DASHBOARD_IDENTITY.items[dashboard].color,
				);
				return [
					dashboard,
					{
						...DEFAULT_DASHBOARD_IDENTITY.items[dashboard],
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
	if (!DASHBOARD_LABELS.includes(dashboard)) {return;}
	const fallback = DEFAULT_DASHBOARD_IDENTITY.items[dashboard];
	const labelInput = document.getElementById(
		`dashboard-identity-${dashboard}-label`,
	);
	if (labelInput) {labelInput.value = fallback.label;}
	updateIconPickerField(`dashboard-identity-${dashboard}-icon`, fallback.icon);
	updateIconPickerColorField(
		`dashboard-identity-${dashboard}-color`,
		fallback.color,
	);
	saveDashboardIdentitySettings();
}

function dismissTip(tip, element) {
	if (!tip) {return;}
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
	if (cameraStream) {stopCameraStream();}

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
  `;
	const sidebarScroll = app.querySelector(".sidebar-list-scroll");
	if (sidebarScroll) {sidebarScroll.scrollTop = sidebarScrollTop;}
	const settingsScroll = app.querySelector(".settings-tab-panel");
	if (settingsScroll) {settingsScroll.scrollTop = settingsScrollTop;}
	bindActions();
	bindCameraControls();
	bindDashboardIdentityAutoSave();
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
	if (state.active === "Settings" && state.settingsTab === "cloud") {
		scheduleCloudStorageUsageRefresh();
	}
}

function thoughtToastHtml() {
	const toast = state.thoughtToast;
	if (!toast) {return "";}
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
	if (!toast || !input || !noteInput || !actionButton) {return;}

	const updateActionButton = () => {
		const value = noteInput.value.trim();
		const kind = trackerKind(state.thoughtToast?.kind);
		const submitLabel =
			kind === "goal" ? "Submit progress note" : "Submit quick note";
		if (state.thoughtToast) {state.thoughtToast.quickNote = noteInput.value;}
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
		if (state.thoughtToast) {state.thoughtToast.timestamp = timestamp;}
		if (summaryTime) {summaryTime.textContent = thoughtTimestampLabel(timestamp);}
		pauseThoughtToastFade();
	};
	const keepNoteInputFocused = () => {
		if (document.activeElement !== noteInput) {return false;}
		noteInput.focus({ preventScroll: true });
		pauseThoughtToastFade();
		return true;
	};

	toast.addEventListener("pointerenter", pauseThoughtToastFade);
	toast.addEventListener("pointerleave", () => {
		if (keepNoteInputFocused()) {return;}
		resumeThoughtToastFade(0);
	});
	toast.addEventListener("focusin", pauseThoughtToastFade);
	toast.addEventListener("focusout", () => {
		window.setTimeout(() => {
			if (!toast.contains(document.activeElement) && !toast.matches(":hover"))
				{resumeThoughtToastFade(0);}
		}, 0);
	});
	noteInput.addEventListener("input", updateActionButton);
	dateInput?.addEventListener("input", updateTimestamp);
	timeInput?.addEventListener("input", updateTimestamp);
}

function openIconPicker(element) {
	const fieldId = element.dataset.iconField || "";
	const field = document.getElementById(fieldId);
	if (!field) {return;}
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
	if (!results || !state.iconPicker) {return;}
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
	if (!state.iconPicker) {return;}
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
	if (input && input.value.toLowerCase() !== color) {input.value = color;}
	overlay?.querySelectorAll(".icon-picker-swatch").forEach((swatch) => {
		const isSelected = normalizeHexColor(swatch.dataset.color) === color;
		swatch.classList.toggle("is-selected", isSelected);
		swatch.setAttribute("aria-selected", isSelected ? "true" : "false");
	});
}

function selectIconPickerIcon(icon) {
	if (!state.iconPicker) {return;}
	state.iconPicker.selected =
		normalizeIconSource(icon || "tabler:circle") || "tabler:circle";
	updateIconPickerCurrent();
	refreshIconPickerResults();
}

function selectIconPickerColor(color) {
	if (!state.iconPicker?.colorFieldId) {return;}
	const normalized = normalizeHexColor(
		color,
		state.iconPicker.selectedColor || DASHBOARD_COLORS.Mind,
	);
	state.iconPicker.selectedColor = normalized;
	state.iconPicker.color = normalized;
	updateIconPickerColorPreview();
}

function requestIconPickerSearch(query, limit) {
	if (!state.iconPicker || String(query || "").trim().length < 3) {return;}
	const searchPromise = searchIconifyIcons(query, limit);
	refreshIconPickerResults();
	searchPromise.then(() => {
		if (
			!state.iconPicker ||
			state.iconPicker.query !== query ||
			state.iconPicker.limit !== limit
		)
			{return;}
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
			if (symbol) {symbol.innerHTML = trackerIconHtml(normalized);}
			const label = trigger.querySelector(".icon-picker-trigger-label");
			if (label) {label.textContent = iconDisplayName(normalized);}
			const previewId = trigger.dataset.iconPreview || "";
			const preview = previewId ? document.getElementById(previewId) : null;
			if (preview) {
				const previewIcon = preview.querySelector(".tracker-orb-icon");
				if (previewIcon) {previewIcon.innerHTML = trackerIconHtml(normalized);}
				else {preview.innerHTML = trackerIconHtml(normalized);}
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
	if (!state.iconPicker) {return;}
	updateIconPickerField(state.iconPicker.fieldId, state.iconPicker.selected);
	if (state.iconPicker.colorFieldId)
		{updateIconPickerColorField(
			state.iconPicker.colorFieldId,
			state.iconPicker.selectedColor,
		);}
	closeIconPicker();
}

function loadMoreIconPickerIcons() {
	if (!state.iconPicker) {return;}
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
	if (!overlay || !state.iconPicker) {return;}
	overlay.addEventListener("click", (event) => {
		const actionElement = event.target?.closest?.("[data-action]");
		if (!actionElement || !overlay.contains(actionElement)) {return;}
		handleAction(actionElement);
	});
	overlay.addEventListener("keydown", (event) => {
		if (!["Enter", " "].includes(event.key)) {return;}
		const actionElement = event.target?.closest?.("[data-action]");
		if (!actionElement || !overlay.contains(actionElement)) {return;}
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
			if (!normalized) {return;}
			selectIconPickerColor(normalized);
		});
	}
}

function trackerDropIndex(row, activeWrap, pointerX, pointerY = pointerX) {
	const allWraps = Array.from(row.querySelectorAll("[data-tracker-orb-wrap]"));
	const wraps = allWraps.filter((wrap) => wrap !== activeWrap);
	if (!allWraps.length) {return 0;}
	if (!wraps.length) {return 0;}
	const sampleRect = allWraps[0].getBoundingClientRect();
	if (!sampleRect.width || !sampleRect.height) {return 0;}
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
	if (!wraps.length) {return;}
	const targetWrap = wraps[targetIndex];
	if (targetWrap) {
		targetWrap.classList.add("is-drop-before");
	} else {
		wraps[wraps.length - 1].classList.add("is-drop-after");
	}
}

function bindTrackerOrbSorting() {
	app.querySelectorAll("[data-tracker-reorder-row]").forEach((row) => {
		row.querySelectorAll("[data-tracker-orb-wrap]").forEach((wrap) => {
			const orb = wrap.querySelector(".tracker-orb");
			if (!orb) {return;}

			orb.addEventListener("pointerdown", (event) => {
				if (event.button !== undefined && event.button !== 0) {return;}
				const area = wrap.dataset.area || row.dataset.area || "";
				const kind = wrap.dataset.kind || row.dataset.kind || "thought";
				const trackerId = wrap.dataset.id || "";
				if (!area || !trackerId) {return;}

				const startX = event.clientX;
				const startY = event.clientY;
				let isDragging = false;
				let targetIndex = null;

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
					const moved = Math.hypot(
						moveEvent.clientX - startX,
						moveEvent.clientY - startY,
					);
					if (!isDragging && moved < 6) {return;}
					moveEvent.preventDefault();
					if (!isDragging) {startDrag(moveEvent);}
					targetIndex = trackerDropIndex(
						row,
						wrap,
						moveEvent.clientX,
						moveEvent.clientY,
					);
					setTrackerDropMarker(row, wrap, targetIndex);
				};

				const finishDrag = (finishEvent) => {
					window.removeEventListener("pointermove", onPointerMove);
					window.removeEventListener("pointerup", finishDrag);
					window.removeEventListener("pointercancel", finishDrag);
					orb.releasePointerCapture?.(finishEvent.pointerId);
					row.classList.remove("is-reordering");
					wrap.classList.remove("is-dragging");
					clearTrackerDropMarkers(row);

					if (!isDragging) {return;}
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
	)
		{return;}
	window.requestAnimationFrame(() => {
		const editor = document.getElementById("editor-body");
		if (!editor) {return;}
		editor.focus();
		const end = editor.value.length;
		editor.setSelectionRange(end, end);
	});
}

function pyxdiaSidebarHtml() {
	const expanded = state.pyxdiaExpanded;
	const latest = latestPyxdiaLetter();
	const latestOutput = latestCompletedPyxdiaLetter();
	const activeThreadIds = new Set(
		activePyxdiaLetters().map((letter) => letter.threadId),
	);
	const threads = [...(state.pyxdiaThreads || [])]
		.sort((a, b) => {
			const bTime = Date.parse(b.updatedAt || b.createdAt || "") || 0;
			const aTime = Date.parse(a.updatedAt || a.createdAt || "") || 0;
			return bTime - aTime;
		})
		.filter((thread) => activeThreadIds.has(thread.id));
	const actionItems = [
		["pyxdia-new-letter", "Send Letter", "tabler:send-2", "Draft and send"],
		["pyxdia-open-input", "Write A Letter", "tabler:pencil", "Current draft"],
		[
			"pyxdia-open-output",
			"Last Letter",
			"tabler:mail-opened",
			latestOutput
				? "Reply ready"
				: latest
					? pyxdiaStatusText(latest)
					: "No replies",
		],
	];
	return `
    <section class="sidebar-group sidebar-group--pyxdia${expanded ? " is-expanded" : " is-collapsed"}">
      <button class="sidebar-group-toggle pyxdia-sidebar-toggle" data-action="toggle-pyxdia-menu" type="button" aria-expanded="${expanded ? "true" : "false"}">
        <span class="pyxdia-sidebar-title">${iconHtml("tabler:sparkles")}<span>PYXIDA PENPAL</span></span>
        <span class="sidebar-group-chevron" aria-hidden="true">${expanded ? "-" : "+"}</span>
      </button>
      <div class="sidebar-group-items pyxdia-sidebar-items"${expanded ? "" : " hidden"}>
        ${actionItems
					.map(
						([action, label, icon, detail], index) => `
          <button class="sidebar-item sidebar-item--pyxdia${state.active === "PYXIDA" && ((action === "pyxdia-open-input" && state.pyxdiaView === "input") || (action === "pyxdia-open-output" && state.pyxdiaView === "output")) ? " is-active" : ""}" data-action="${action}" type="button">
            <span class="sidebar-item-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="sidebar-item-label"><strong>${buttonContent(icon, label)}</strong><small>${escapeHtml(detail)}</small></span>
          </button>
        `,
					)
					.join("")}
        <div class="pyxdia-sidebar-conversations" aria-label="PYXIDA conversations">
          <span>Conversations</span>
          ${
						threads.length
							? threads
									.slice(0, 5)
									.map(
										(thread, index) => `
              <button class="sidebar-item sidebar-item--pyxdia-thread${state.pyxdiaActiveThreadId === thread.id ? " is-active" : ""}" data-action="pyxdia-open-thread" data-id="${escapeHtml(thread.id)}" type="button">
                <span class="sidebar-item-number">${String(index + 1).padStart(2, "0")}</span>
                <span class="sidebar-item-label"><strong>${escapeHtml(thread.title)}</strong><small>${escapeHtml(thread.latestState || "active")} / ${escapeHtml(formatActivityTimestamp(thread.updatedAt || thread.createdAt))}</small></span>
              </button>
            `,
									)
									.join("")
							: `<div class="pyxdia-sidebar-empty">No PYXIDA letters yet.</div>`
					}
        </div>
      </div>
    </section>
  `;
}

function sidebarHtml(_compendium) {
	const sectionLabels = DASHBOARD_LABELS;
	const allExpanded = sectionLabels.every(
		(label) => state.sidebarExpanded[label],
	);
	return `
    <aside class="sidebar">
      <div class="sidebar-fixed-top">
        <nav class="sidebar-menu-nav" aria-label="Menu controls">
          <button class="sidebar-menu-nav-button" data-action="toggle-all-sidebar-sections" type="button" aria-pressed="${allExpanded ? "true" : "false"}" aria-label="${allExpanded ? "Collapse all" : "Expand all"}" title="${allExpanded ? "Collapse all" : "Expand all"}">
            ${iconHtml(allExpanded ? "tabler:chevrons-up" : "tabler:chevrons-down")}
          </button>
          ${dashboardPeriodSliderHtml("sidebar-period-slider")}
          <button class="sidebar-menu-nav-button sidebar-menu-nav-trash" data-action="open-trash" type="button" aria-label="Open Trash" title="Trash">
            ${iconHtml("tabler:trash")}
          </button>
        </nav>
      </div>
      <div class="sidebar-list-scroll">
        <div class="sidebar-groups">
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
        </div>
      </div>
      <div class="sidebar-donate-row">
        <button class="primary-button full-width donate-sidebar" data-action="open-donation" type="button">${buttonContent("tabler:heart-handshake", "Thanks / Donate")}</button>
        <div class="sidebar-footer-links">
          <button class="sidebar-text-link" data-action="open-settings" type="button">Settings</button>
          <span aria-hidden="true">/</span>
          <button class="sidebar-text-link" data-action="open-gallery" type="button">Gallery</button>
        </div>
      </div>
    </aside>
  `;
}

function sidebarPagedItemsHtml(section, itemsHtml) {
	const itemButtons = itemsHtml
		.split("</button>")
		.map((item) => item.trim())
		.filter(Boolean)
		.map((item) => `${item}</button>`);
	if (!itemButtons.length) {return "";}
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
	if (state.active !== "Body") {return [];}
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
	if (note?.dashboard === "Body") {crumbs.push(pathCrumbText(note.title));}
	return crumbs;
}

function lifePathCrumbs() {
	if (state.active !== "Life") {return [];}
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
		if (project)
			{crumbs.push(
				pathCrumbButton(
					project.title,
					"select-life-project",
					{ "data-id": project.id },
					"truncate",
				),
			);}
		if (phase)
			{crumbs.push(
				pathCrumbButton(
					phase.title,
					"select-life-phase",
					{ "data-id": phase.id },
					"truncate",
				),
			);}
		if (task)
			{crumbs.push(
				pathCrumbButton(
					task.title,
					"select-life-task",
					{ "data-task-id": task.id },
					"truncate",
				),
			);}
	}
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (note?.dashboard === "Life") {crumbs.push(pathCrumbText(note.title));}
	return crumbs;
}

function spiritPathCrumbs(spiritBook) {
	if (state.active !== "Spirit") {return [];}
	const crumbs = [];
	const years = spiritYears();
	const activeYear =
		spiritBook?.year ||
		(years.includes(state.spiritYear) ? state.spiritYear : years[0]);
	if (activeYear)
		{crumbs.push(
			pathCrumbButton(`Year ${activeYear}`, "set-spirit-year", {
				"data-year": activeYear,
			}),
		);}
	if (spiritBook) {crumbs.push(pathCrumbText(spiritBook.title));}
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (note?.dashboard === "Spirit") {crumbs.push(pathCrumbText(note.title));}
	return crumbs;
}

function pathBarExtraCrumbs(spiritBook) {
	if (state.active === "Body") {return bodyPathCrumbs();}
	if (state.active === "Life") {return lifePathCrumbs();}
	if (state.active === "Spirit") {return spiritPathCrumbs(spiritBook);}
	if (state.active === "PYXIDA") {
		const labels = {
			input: "Write A Letter",
			output: "Last Letter",
			thread: selectedPyxdiaThread()?.title || "Conversation",
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
		: state.active;
	const extraCrumbs = pathBarExtraCrumbs(spiritBook);
	return `
    <nav class="path-bar" aria-label="Current location" tabindex="0"${extraCrumbs.length ? ' data-focus-current="true"' : ""}>
      <button class="dashboard-home-link" data-action="home">Dashboard</button>
      ${state.active !== "Dashboard" ? `<span>/</span><button data-action="dashboard-root">${escapeHtml(activeLabel)}</button>` : ""}
      ${compendium ? `<span>/</span><button class="truncate" data-action="compendium-root">${escapeHtml(compendium.title)}</button>` : ""}
      ${section ? `<span>/</span><span class="truncate muted">${escapeHtml(section.title)}</span>` : ""}
      ${state.active === "Mind" ? "" : pathBarCrumbsHtml(extraCrumbs)}
      ${pathCameraButtonHtml()}
    </nav>
  `;
}

function contentHtml(compendium, section) {
	if (state.active === "Dashboard") {return dashboardGridHtml();}
	if (state.active === "Settings") {return settingsHtml();}
	if (state.active === "Gallery") {return galleryHtml();}
	if (state.active === "Trash") {return trashHtml();}
	if (state.active === "PYXIDA") {return pyxdiaHtml();}
	if (state.active === "Mind") {return mindHtml(compendium, section);}
	if (state.active === "Body") {return bodyHtml();}
	if (state.active === "Spirit") {return spiritHtml();}
	if (state.active === "Life") {return lifeHtml();}
	return dashboardArtifactHtml(state.active);
}

function dashboardGridHtml() {
	return `
    <div class="dashboard-home">
      ${dashboardAnalyticsHtml()}
      <div class="dashboard-divider" aria-hidden="true"></div>
      <div class="dashboard-grid">
        ${DASHBOARD_LABELS.map(
					(label) => `
          <button class="dashboard-card${state.flipped === label ? " is-flipped" : ""}" data-action="open-dashboard-card" data-section="${label}" data-balance-key="${label}" style="--card-color: ${dashboardColor(label)};">
            <span class="dashboard-card-inner">
              <span class="dashboard-card-face dashboard-card-front">
                <span class="dashboard-card-title">${dashboardTitleHtml(label)}</span>
              </span>
              <span class="dashboard-card-face dashboard-card-back-face">
                ${dashboardCardBackHtml(label)}
              </span>
            </span>
          </button>
        `,
				).join("")}
      </div>
    </div>
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
		if (counts[event.dashboard] !== undefined) {counts[event.dashboard] += 1;}
	});
	const total = labels.reduce((sum, label) => sum + counts[label], 0);
	let cursor = 0;
	const segments = pieLabels.map((label) => {
		const value = total ? (counts[label] / total) * 100 : 25;
		const start = cursor;
		cursor += value;
		return { label, value, start };
	});
	const periodLabel =
		periodOption.id === "day"
			? "today"
			: `the last ${periodOption.label.toLowerCase()}`;
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
      <div class="dashboard-analytics-header">
        <div>
          <h2>Balance</h2>
          <p>${escapeHtml(dashboardDisplayNameList())} activity for ${periodLabel}.</p>
        </div>
      </div>
      <div class="dashboard-analytics-body">
        <div class="dashboard-pie-wrap dashboard-pie-wrap--${escapeHtml(chartType)}">
          ${chartHtml}
          ${chartType === "orbs" ? "" : `<strong>${balanceScore}% balanced</strong>`}
          <div class="dashboard-chart-controls">
            ${dashboardPeriodSliderHtml()}
            <div class="dashboard-chart-switcher" data-dashboard-chart-switcher role="tablist" aria-label="Balance chart type" style="--dashboard-chart-tab-count: ${chartTabs.length};">
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
			"PYXIDA PENPAL",
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
        ${
					editorMode === "preview"
						? `<div class="pyxdia-letter-preview markdown-body" aria-label="Write A Letter Live View">${renderPyxdiaLetterMarkdown(draft.inputText, draft.imageRefs)}</div>`
						: `<label class="body-field body-field--full pyxdia-letter-field">
          <span class="sr-only">Write A Letter</span>
          <textarea id="pyxdia-letter-input" aria-label="Write A Letter" placeholder="Write the letter you want PYXIDA to answer later. Paste images here to upload them into this letter.">${escapeHtml(draft.inputText)}</textarea>
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
            <p>Metadata only. Bodies stay local unless pasted into Optional Context.</p>
          </div>
        </div>
        ${pyxdiaNoteSelectionHtml(draft)}
      </section>
      <section class="pyxdia-context-card">
        <div class="body-card-heading">
          <div>
            <h3>Optional Context</h3>
            <p>Choose anything you want PYXIDA to consider with this letter.</p>
          </div>
        </div>
        <label class="body-field body-field--full">
          <span class="sr-only">Optional Context</span>
          <textarea id="pyxdia-context-input" aria-label="Optional Context" placeholder="Paste only the note, chat, quicknote, memory card, project, or other text you want PYXIDA to use for this letter.">${escapeHtml(draft.userIncludedContext)}</textarea>
        </label>
      </section>
      <div class="editor-footer-actions pyxdia-letter-actions">
        <button class="secondary-button" data-action="pyxdia-save-draft" type="button"${state.pyxdiaBusy ? " disabled" : ""}>${buttonContent("tabler:device-floppy", "Save Draft")}</button>
        <button class="primary-button" data-action="pyxdia-send-letter" type="button"${state.pyxdiaBusy ? " disabled" : ""}>${buttonContent("tabler:send-2", "Send Letter")}</button>
      </div>
    </section>
    ${pyxdiaLastLetterHtml({ embedded: true })}
  `;
}

function renderPyxdiaLetterMarkdown(text, imageRefs = []) {
	const html = renderMarkdown(text || "");
	return html || `<p>${escapeHtml("Nothing written yet.")}</p>`;
}

function pyxdiaNoteSelectionHtml(draft) {
	const refs = pyxdiaNoteRefsFromArtifacts(state.artifactStore);
	const selected = new Set(draft.contextSelections || []);
	if (!refs.length)
		{return emptyStateHtml("No note metadata", "Create notes first.");}
	return `
    <div class="pyxdia-note-ref-list">
      ${refs
				.slice(0, 24)
				.map(
					(ref) => `
        <label class="pyxdia-note-ref">
          <input data-pyxdia-note-ref type="checkbox" value="${escapeHtml(ref.id)}"${selected.has(ref.id) ? " checked" : ""}>
          <span>
            <strong>${escapeHtml(ref.title)}</strong>
            <small>${escapeHtml(ref.dashboard || "Note")} / ${escapeHtml(ref.role)} / ${escapeHtml(`${ref.wordCount} words`)}</small>
          </span>
        </label>
      `,
				)
				.join("")}
    </div>
  `;
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
          <h3>Last Letter</h3>
          <p>No last letter yet.</p>
        </div>
      </div>
      <div class="pyxdia-pending-card">
        <strong>No reply yet</strong>
        <span>Send a letter to create the first pending reply.</span>
      </div>
    </section>
  `;
	}
	const pending = latest.state !== "completed";
	const actions = `
    <div class="action-row">
      ${
				latest.state === "failed"
					? `<button class="secondary-button" data-action="pyxdia-retry-letter" data-id="${escapeHtml(latest.id)}" type="button">${buttonContent("tabler:refresh", "Retry")}</button>`
					: ""
			}
      <button class="secondary-button danger-button" data-action="pyxdia-delete-letter" data-id="${escapeHtml(latest.id)}" type="button">${buttonContent("tabler:trash", "Move to Trash")}</button>
    </div>
  `;
	return `
    <section class="pyxdia-output${options.embedded ? " pyxdia-output--embedded" : ""}">
      <div class="body-card-heading">
        <div>
          <h3>${escapeHtml(pending ? "Reply Pending" : "Last Letter")}</h3>
          <p>${escapeHtml(pyxdiaStatusText(latest))}</p>
        </div>
        ${actions}
      </div>
      ${
				pending
					? `<div class="pyxdia-pending-card">
            <strong>${escapeHtml(latest.state)}</strong>
            <span>${escapeHtml(latest.availableAt ? `Available after ${new Date(latest.availableAt).toLocaleString()}` : "Waiting for processing.")}</span>
          </div>`
					: `<article class="pyxdia-output-text">${escapeHtml(latest.outputText)}</article>`
			}
    </section>
  `;
}

function pyxdiaThreadHtml() {
	const thread = selectedPyxdiaThread();
	const letters = selectedPyxdiaThreadLetters();
	if (!thread) {
		return emptyStateHtml(
			"No PYXIDA conversations yet",
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
      </div>
      <div class="pyxdia-thread-list">
        ${letters
					.map(
						(letter) => `
          <article class="pyxdia-thread-letter">
            <header>
              <strong>${escapeHtml(formatActivityTimestamp(letter.submittedAt || letter.createdAt))}</strong>
              <span>${escapeHtml(pyxdiaStatusText(letter))}</span>
              <button class="secondary-button danger-button" data-action="pyxdia-delete-letter" data-id="${escapeHtml(letter.id)}" type="button">${buttonContent("tabler:trash", "Move to Trash")}</button>
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
			"Soft-deleted user-owned items before permanent removal.",
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
	if (!signedIn) {return "";}
	if (!state.trashStatus && !state.trashError) {return "";}
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
			"Deleted items will appear here while they are still restorable.",
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
	const requestedTab =
		state.settingsTab === "dashboard" ? "interface" : state.settingsTab;
	const tab = [
		"getting-started",
		"thoughts",
		"goals",
		"interface",
		"pyxdia",
		"cloud",
	].includes(requestedTab)
		? requestedTab
		: "getting-started";
	const panels = {
		"getting-started": settingsGettingStartedHtml(),
		thoughts: settingsThoughtsHtml(),
		goals: settingsGoalsHtml(),
		interface: settingsInterfaceHtml(),
		pyxdia: settingsPyxdiaHtml(),
		cloud: settingsCloudHtml(),
	};
	return panelHtml(`
    ${headerHtml("Settings", "Getting started, Thoughts, Goals, Interface, PYXIDA, and data controls.")}
    <div class="settings-page">
      ${settingsTabsHtml(tab)}
      ${panels[tab]}
    </div>
  `);
}

function settingsTabsHtml(activeTab) {
	const tabs = [
		["getting-started", "Getting Started", "tabler:sparkles"],
		["thoughts", "Thoughts", "tabler:message-circle"],
		["goals", "Goals", "tabler:target-arrow"],
		["interface", "Interface", "tabler:layout-dashboard"],
		["pyxdia", "PYXIDA", "tabler:sparkles"],
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

function settingsGettingStartedHtml() {
	return `
    <div class="settings-tab-panel getting-started-page">
      <section class="getting-started-intro">
        <h3>Build a clear picture of your life</h3>
        <p>This space works best when it becomes a steady record of what you are learning, how you are taking care of yourself, what gives you direction, and what is actually happening day to day. Small entries are enough. The value comes from returning to them and seeing the pattern.</p>
      </section>
      <section class="getting-started-defaults">
        <div class="getting-started-defaults-main">
          <span class="getting-started-defaults-icon" aria-hidden="true">${iconHtml("fluent:person-heart-24-regular")}</span>
          <div>
            <h3>Self Help Defaults</h3>
            <p>Start from the supportive default setup with the original sample notes, orbs, goals, tips, and app structure restored. This is the guided starter state for someone using the app to get steady when life feels scattered.</p>
          </div>
        </div>
        <button class="primary-button" data-action="factory-defaults" type="button">${buttonContent("fluent:person-heart-24-regular", "Use Self Help Defaults")}</button>
      </section>
      <div class="getting-started-grid">
        <article>
          <span>${dashboardInlineLabelHtml("Mind")}</span>
          <h3>${escapeHtml(dashboardDisplayLabel("Mind"))}</h3>
          <p>Use ${escapeHtml(dashboardDisplayLabel("Mind"))} for ideas, notes, books, concepts, plans, and anything you want to understand more clearly. Start rough, then shape notes into sections when an idea becomes reusable.</p>
        </article>
        <article>
          <span>${dashboardInlineLabelHtml("Body")}</span>
          <h3>${escapeHtml(dashboardDisplayLabel("Body"))}</h3>
          <p>Use ${escapeHtml(dashboardDisplayLabel("Body"))} for fasting, food, workouts, sleep signals, symptoms, and physical routines. The goal is not perfect tracking; it is enough detail to notice what helps and what tends to throw you off.</p>
        </article>
        <article>
          <span>${dashboardInlineLabelHtml("Spirit")}</span>
          <h3>${escapeHtml(dashboardDisplayLabel("Spirit"))}</h3>
          <p>Use ${escapeHtml(dashboardDisplayLabel("Spirit"))} for reading, meaning, values, gratitude, prayer, reflection, and the longer questions you want to live with. Mark progress and keep notes close to the works or practices that prompted them.</p>
        </article>
        <article>
          <span>${dashboardInlineLabelHtml("Life")}</span>
          <h3>${escapeHtml(dashboardDisplayLabel("Life"))}</h3>
          <p>Use ${escapeHtml(dashboardDisplayLabel("Life"))} as the calendar and journal layer. Log the day, attach thought and goal orbs, and record what changed. The calendar helps you see when you worked on something and how steady the rhythm has been.</p>
        </article>
      </div>
      <section class="getting-started-rhythm">
        <h3>A simple rhythm</h3>
        <div>
          <p><strong>Capture:</strong> Put the thing where it belongs. A thought goes to ${escapeHtml(dashboardDisplayLabel("Mind"))}. A workout goes to ${escapeHtml(dashboardDisplayLabel("Body"))}. A reading note goes to ${escapeHtml(dashboardDisplayLabel("Spirit"))}. A day summary goes to ${escapeHtml(dashboardDisplayLabel("Life"))}.</p>
          <p><strong>Check:</strong> Use the dashboard balance chart to see what has been getting attention lately. It is a signal, not a score.</p>
          <p><strong>Connect:</strong> Use the ${escapeHtml(dashboardDisplayLabel("Life"))} calendar to see how scattered edits become a visible thread across days.</p>
          <p><strong>Return:</strong> Edit notes as your understanding changes. The audit trail keeps the history visible so the record shows growth instead of only the final version.</p>
        </div>
      </section>
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
	return `
    <div class="settings-tab-panel interface-settings">
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>Category Icons</h3>
            <p>Customize each category title and icon, then choose whether category labels show numbers or icons.</p>
          </div>
        </div>
        <div class="dashboard-identity-toggles">
          <label class="dashboard-identity-toggle">
            <input name="dashboard-display-mode" value="numbers" type="radio"${identity.displayMode !== "icons" ? " checked" : ""}>
            <span>Numbers</span>
          </label>
          <label class="dashboard-identity-toggle">
            <input name="dashboard-display-mode" value="icons" type="radio"${identity.displayMode === "icons" ? " checked" : ""}>
            <span>Icons</span>
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
    </div>
  `;
}

function settingsPyxdiaHtml() {
	const settings = normalizePyxdiaSettings(state.pyxdiaSettings);
	const memory = normalizePyxdiaMemory(state.pyxdiaMemory);
	const staticMemory = normalizePyxdiaStaticMemory(memory.staticMemory);
	const dynamicRetrievalMemory = normalizePyxdiaDynamicRetrievalMemory(
		memory.dynamicRetrievalMemory,
	);
	const memorySummary =
		staticMemory.summary ||
		memory.summary ||
		(staticMemory.entries?.length
			? staticMemory.entries.map((entry) => entry.text).join(" ")
			: "No PYXIDA memory has been saved yet.");
	return `
    <div class="settings-tab-panel pyxdia-settings">
      <section class="interface-settings-section">
        <div class="body-card-heading">
          <div>
            <h3>PYXIDA</h3>
            <p>Letter exchange, delay, personality, and memory controls.</p>
          </div>
          <button class="secondary-button" data-action="pyxdia-refresh" type="button"${state.pyxdiaBusy ? " disabled" : ""}>${buttonContent("tabler:refresh", "Refresh")}</button>
        </div>
        <div class="pyxdia-settings-toggles">
          <label class="dashboard-identity-toggle">
            <input id="pyxdia-setting-enabled" type="checkbox"${settings.enabled ? " checked" : ""}>
            <span>Enable PYXIDA</span>
          </label>
          <label class="dashboard-identity-toggle">
            <input id="pyxdia-setting-delay" data-action="pyxdia-toggle-delay" type="checkbox"${settings.delayEnabled ? " checked" : ""}>
            <span>Delay replies</span>
          </label>
          <label class="dashboard-identity-toggle">
            <input id="pyxdia-setting-memory" type="checkbox"${settings.memoryEnabled ? " checked" : ""}>
            <span>Memory</span>
          </label>
        </div>
        <div class="body-form-grid pyxdia-delay-grid">
          <label class="body-field">Delay min hours<input id="pyxdia-delay-min" type="number" min="0" max="168" step="1" value="${escapeHtml(settings.delayMinHours)}"></label>
          <label class="body-field">Delay max hours<input id="pyxdia-delay-max" type="number" min="0" max="336" step="1" value="${escapeHtml(settings.delayMaxHours)}"></label>
        </div>
        <label class="body-field body-field--full">Instructions / personality
          <textarea id="pyxdia-general-instructions" rows="4">${escapeHtml(settings.generalInstructions)}</textarea>
        </label>
        <label class="body-field body-field--full">What PYXIDA should know
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
            <h3>PYXIDA Static Memory</h3>
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
            <h3>PYXIDA Dynamic Retrieval</h3>
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
	const username = signedIn
		? account.user.displayName || account.user.email || "Signed in"
		: "";
	const statusLabel = signedIn
		? entitlement.admin
			? "Admin / Cloud enabled"
			: isCloud
				? "Cloud sync active"
				: "Cloud sync inactive"
		: "Signed out";
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
			theme: state.theme,
		},
	});
	const busyAttr = account.busy ? " disabled" : "";
	return `
    <div class="settings-tab-panel cloud-settings">
      <section class="interface-settings-section cloud-account-section">
        <div class="body-card-heading">
          <div>
            <h3>Cloud</h3>
            <p>Local use is free. Sign in to sync this app across your devices.</p>
          </div>
          <div class="cloud-heading-controls">
            <span class="cloud-status-pill${isCloud ? " is-active" : ""}">${escapeHtml(statusLabel)}</span>
              <div class="cloud-heading-actions" aria-label="Cloud sync actions">
                ${
									signedIn && isCloud
										? `
                <div class="cloud-heading-action-row">
                  <button class="primary-button" data-action="cloud-sync-now" type="button"${busyAttr}>${buttonContent("tabler:cloud-up", "Sync now")}</button>
                  <button class="secondary-button" data-action="cloud-load" type="button"${busyAttr}>${buttonContent("tabler:cloud-down", "Load cloud")}</button>
                  <button class="secondary-button" data-action="cloud-sign-out" type="button"${busyAttr}>${buttonContent("tabler:logout", "Sign out")}</button>
                </div>
                `
										: ""
								}
                <div class="cloud-heading-action-row">
                  <button class="secondary-button" data-action="import-artifacts" type="button">${buttonContent("tabler:file-import", "Import")}</button>
                  <button class="secondary-button" data-action="export-artifacts" type="button">${buttonContent("tabler:file-export", "Export")}</button>
                  <button class="secondary-button" data-action="reset-tips" type="button">${buttonContent("tabler:bulb", "Reset tips")}</button>
                </div>
              </div>
          </div>
        </div>
        ${
					signedIn
						? `
          <div class="cloud-account-card">
            <span class="cloud-account-avatar">${iconHtml(account.isLocalDemo ? "tabler:cloud-check" : "tabler:user-circle")}</span>
            <div>
              <strong>Signed in as ${escapeHtml(username)}</strong>
              <small>${escapeHtml(account.isLocalDemo ? "Local subscribed demo" : account.user.email || "Firebase account")}</small>
            </div>
          </div>
          ${cloudStorageUsageHtml(state.cloudStorageUsage)}
          <div class="cloud-sync-grid">
            <span><strong>${escapeHtml(formatStorageGb(localBytes))}</strong><small>Current app JSON estimate</small></span>
            <span><strong>${escapeHtml(localUpdatedAt ? new Date(localUpdatedAt).toLocaleString() : "No local changes")}</strong><small>Last local change</small></span>
            <span><strong>${escapeHtml(account.lastCloudSyncAt ? new Date(account.lastCloudSyncAt).toLocaleString() : "Not synced")}</strong><small>Last sync from this device</small></span>
            <span><strong>${escapeHtml(isCloud ? `Every ${cloudSyncIntervalLabel()}` : "Off")}</strong><small>Artifacts + encrypted media</small></span>
          </div>
          ${
						account.billingCapable
							? `
          <div class="action-row cloud-actions">
            ${account.billingCapable ? `<button class="secondary-button" data-action="cloud-billing" type="button"${busyAttr}>${buttonContent("tabler:receipt", "Manage Billing")}</button>` : ""}
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
            <button class="cloud-danger-link" data-action="cloud-delete-data" type="button"${busyAttr}>Delete cloud data</button>
            <span class="cloud-danger-separator" aria-hidden="true">|</span>
            <button class="cloud-danger-link" data-action="cloud-delete-account" type="button"${busyAttr}>Delete cloud account</button>
          </div>
        `
						: ""
				}
        ${account.message ? `<p class="cloud-status-message">${escapeHtml(account.message)}</p>` : ""}
        ${account.error ? `<p class="cloud-status-message cloud-status-message--error">${escapeHtml(account.error)}</p>` : ""}
      </section>
      <section class="interface-settings-section data-controls-section">
        <div class="body-card-heading">
          <div>
            <h3>Local Data</h3>
            <p>Clear this browser's saved Ourstuff data from this device.</p>
          </div>
          <div class="action-row data-controls-actions">
            <button class="secondary-button danger-button" data-action="clear-app-data" type="button">${buttonContent("tabler:database-x", "Clear Data")}</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function trackerAddFormHtml(area, kind = "thought") {
	const normalizedKind = trackerKind(kind);
	const config = trackerKindConfig(normalizedKind);
	if (!isTrackerAddOpen(area, normalizedKind)) {return "";}
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
	)
		{return "";}
	const id = parsedKey.id;
	const tracker = (trackerSettingsForKind(normalizedKind)?.[area] || []).find(
		(item) => item.id === id,
	);
	if (!tracker) {return "";}
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
          <small>${loading ? `Limit: ${formatStorageLimitGb(limitBytes)}` : `${formatStorageGb(storageBytes)} Storage / ${formatStorageGb(firebaseBytes)} Firebase`}</small>
        </div>
        <span>${loading ? "--" : `${Math.round(percent * 10) / 10}%`}</span>
      </div>
      <div class="cloud-usage-meter" aria-hidden="true"><i></i></div>
      <div class="cloud-sync-grid cloud-usage-breakdown">
        <span><strong>${escapeHtml(formatStorageGb(storageBytes))}</strong><small>Storage files</small></span>
        <span><strong>${escapeHtml(formatStorageGb(firebaseBytes))}</strong><small>Firebase artifacts</small></span>
      </div>
      <p class="cloud-status-message${usage?.error || overLimit ? " cloud-status-message--error" : ""}">
        ${escapeHtml(usage?.error || (loading ? "Reading Storage and Firebase totals." : overLimit ? `Storage is over the ${formatStorageLimitGb(limitBytes)} limit. Uploads and sync will stop until space is freed.` : `${formatStorageGb(remainingBytes)} remaining before uploads stop.`))}
      </p>
      ${updatedAt ? `<p class="cloud-usage-updated">Firebase usage from ${escapeHtml(updatedAt)}.</p>` : ""}
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
			"Browse image uploads from this browser. Cloud media is encrypted before Firebase Storage upload.",
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
	if (!state.artifactStore || !ids.length) {return;}
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
		if (typeof artifact.body !== "string") {return artifact;}
		const nextBody = patterns
			.reduce((body, pattern) => body.replace(pattern, ""), artifact.body)
			.trim();
		if (nextBody === artifact.body) {return artifact;}
		changed = true;
		return { ...artifact, body: nextBody, edited: now };
	});
	if (changed) {persistArtifactStore({ ...state.artifactStore, artifacts });}
}

async function deleteSelectedGalleryImages() {
	const ids = state.gallerySelectedIds.filter((id) =>
		(state.galleryImages || []).some((image) => image.id === id),
	);
	if (!ids.length) {return;}
	const label = `${ids.length} image${ids.length === 1 ? "" : "s"}`;
	if (
		!window.confirm(
			`Delete ${label} from the gallery and remove their note references?`,
		)
	)
		{return;}
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
	if (note?.dashboard === "Spirit" && state.artifactMode === "editor")
		{return dashboardNoteEditorHtml(note);}
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
	if (selected) {return spiritBookHtml(selected);}

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
	if (state.artifactMode === "editor" && note)
		{return dashboardNoteEditorHtml(note);}
	if (state.artifactMode === "viewer" && note)
		{return artifactReaderHtml(note, `${dashboardDisplayLabel(dashboard)} note`);}

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

function readerBodyHtml(title, body, emptyText = "No note text yet.") {
	const text = stripDuplicateTitleLine(title, body || "");
	return text
		? renderMarkdown(text)
		: emptyText
			? `<p>${escapeHtml(emptyText)}</p>`
			: "";
}

function stripDuplicateTitleLine(title, body) {
	const lines = String(body || "").split(/\r?\n/);
	const firstContentIndex = lines.findIndex((line) => line.trim());
	if (firstContentIndex === -1) {return "";}
	const normalizedTitle = normalizeReaderTitle(title);
	const normalizedFirstLine = normalizeReaderTitle(lines[firstContentIndex]);
	if (normalizedTitle && normalizedFirstLine === normalizedTitle) {
		lines.splice(firstContentIndex, 1);
	}
	return lines.join("\n").trim();
}

function normalizeReaderTitle(value) {
	return String(value || "")
		.replace(/^[#>\s*-]+/, "")
		.replace(/[`*_~]/g, "")
		.trim()
		.toLowerCase();
}

function artifactReaderHtml(note, _subtitle) {
	return panelHtml(`
    ${headerHtml(note.title, "", artifactViewerActions(note))}
    <div class="reader-panel"><div class="markdown-body">${readerBodyHtml(note.title, note.body)}</div></div>
  `);
}

function lifeEvents() {
	if (!state.artifactStore) {return [];}
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
		if (events.some((existing) => existing.eventKey === eventKey)) {return;}
		const artifact = findArtifact(state.artifactStore, event.artifactId);
		events.push({ ...event, eventKey, parentId: artifact?.parentId || "" });
	};
	state.artifactStore.artifacts.forEach((artifact) => {
		if (isDeletedArtifact(artifact)) {return;}
		if (artifact.properties?.role === "spirit-reading-plan-item") {return;}
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
	if (event.role === "thought" && event.thoughtLabel) {return event.thoughtLabel;}
	if (event.role === "goal-progress" && event.goalLabel) {return event.goalLabel;}
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
	if (!calendarEl || state.active !== "Life" || state.lifeMode !== "month")
		{return;}
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
			if (artifactId) {openActivityArtifact(artifactId);}
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
	const trackers = lifeNoteTrackerSelections(note);
	const habits = trackers.length ? [] : legacyLifeHabits(note);
	return `
    <div class="life-journal-meta">
      <span>${iconHtml("tabler:calendar")} ${escapeHtml(formatDateLabel(note.properties?.dateKey || note.edited || note.created, { weekday: true, year: true }))}</span>
      <span>${iconHtml("tabler:mood-smile")} ${escapeHtml(note.properties?.mood || "steady")}</span>
      <span>${iconHtml("tabler:bolt")} ${escapeHtml(note.properties?.energy || "medium")}</span>
      ${trackers.map((tracker) => `<span>${trackerIconHtml(tracker.icon)} ${escapeHtml(tracker.label)}</span>`).join("")}
      ${habits.map((habit) => `<span>${iconHtml("tabler:circle-check")} ${escapeHtml(habit)}</span>`).join("")}
    </div>
  `;
}

function lifeHtml() {
	const note = findArtifact(state.artifactStore, state.selectedArtifactId);
	if (
		state.artifactMode === "editor" &&
		note?.dashboard === "Life" &&
		note.properties?.role === "life-journal"
	)
		{return lifeJournalEditorHtml(note);}
	if (state.artifactMode === "editor" && note)
		{return dashboardNoteEditorHtml(note);}
	if (state.artifactMode === "viewer" && note) {
		if (note.dashboard !== "Life")
			{return artifactReaderHtml(
				note,
				`${dashboardDisplayLabel(note.dashboard)} note`,
			);}
		if (note.properties?.role !== "life-journal")
			{return artifactReaderHtml(
				note,
				`${dashboardDisplayLabel("Life")} thought`,
			);}
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
        ${buttonContent("tabler:notes", "New Note", "body-mode-label")}
      </button>
    </nav>
  `;
}

function lifeCalendarModeSwitcherHtml() {
	const modes = [
		["month", "Month", "tabler:calendar-month"],
		["week", "Week", "tabler:calendar-week"],
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
	if (tool === "todo") {return lifeTodoHtml();}
	if (tool === "projects") {return lifeProjectsHtml();}
	return `
    <div class="life-calendar-viewer">
      ${lifeCalendarModeSwitcherHtml()}
      ${lifeCalendarPanelHtml()}
    </div>
  `;
}

function lifeCalendarPanelHtml() {
	if (state.lifeMode === "day") {return lifeDayHtml();}
	if (state.lifeMode === "week") {return lifeWeekHtml();}
	if (state.lifeMode === "list") {return lifeListHtml();}
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
		if (!grouped.has(event.dateKey)) {grouped.set(event.dateKey, []);}
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
          <p>Files stay local offline and sync as encrypted Firebase Storage media when Cloud is active.</p>
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
	if (bytes >= 1048576) {return `${Math.round(bytes / 104857.6) / 10} MB`;}
	if (bytes >= 1024) {return `${Math.round(bytes / 102.4) / 10} KB`;}
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
          <p>Journal entries with mood, energy, orb trackers, and text.</p>
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
              <small>${escapeHtml([noteItem.properties?.mood, ...lifeTrackerSummaryLabels(noteItem)].filter(Boolean).join(" / ") || shortSummary(noteItem.body, "No journal text yet"))}</small>
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
	if (state.artifactMode === "editor" && note)
		{return dashboardNoteEditorHtml(note);}
	if (state.artifactMode === "viewer" && note)
		{return artifactReaderHtml(note, `${dashboardDisplayLabel("Body")} note`);}

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
	if (state.artifactMode === "editor" && note?.dashboard === "Mind")
		{return dashboardNoteEditorHtml(note);}
	if (state.artifactMode === "viewer" && note?.dashboard === "Mind")
		{return artifactReaderHtml(note, `${dashboardDisplayLabel("Mind")} note`);}
	if (state.mindMode === "compendium-editor" && compendium)
		{return compendiumEditorHtml(compendium);}
	if (state.mindMode === "section-editor" && section)
		{return sectionEditorHtml(section);}
	if (state.mindMode === "section-viewer" && section) {
		return panelHtml(`
      ${headerHtml(
				section.title,
				"",
				`
        <div class="action-row">
          ${pageActionButton("edit-section", "tabler:pencil", "Edit section")}
          ${pageActionButton("delete-section", "tabler:trash", "Delete section", { danger: true, data: { id: section.id } })}
          ${pageActionButton("manager", "tabler:x", "Close section viewer", { className: "close-viewer-button" })}
        </div>
      `,
			)}
      <div class="reader-panel"><div class="markdown-body">${readerBodyHtml(section.title, section.body)}</div></div>
    `);
	}
	if (state.mindMode === "reader" && compendium)
		{return compendiumReaderHtml(compendium);}
	if (state.mindMode === "manager" && compendium)
		{return compendiumManagerHtml(compendium);}
	return mindGridHtml();
}

function truncatedWordsText(value, maxWords = 15) {
	const text = String(value || "")
		.trim()
		.replace(/\s+/g, " ");
	if (!text) {return { text: "", truncated: false, wordCount: 0 };}
	const words = text.split(" ");
	if (words.length <= maxWords)
		{return { text, truncated: false, wordCount: words.length };}
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
	if (words > 11 || normalized.length > 68) {return " is-very-long";}
	if (words > 7 || normalized.length > 44) {return " is-long";}
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
        <button class="icon-button compendium-picker-add" data-action="new-compendium" type="button" aria-label="Add Compendium" title="Add Compendium">${iconHtml("tabler:plus")}</button>
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
    </div>
  `;
}

function mindGridHtml() {
	const columns = mindCompendiumColumns();
	const perPage = mindCompendiumsPerPage();
	const shouldPage = state.compendiums.length > perPage;
	const pages = chunkItems(state.compendiums, perPage);
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
        <section class="compendium-rotator${state.mindCompendiumPickerOpen ? " is-picker-open" : ""}" aria-label="Compendiums" style="--compendium-columns: ${columns};">
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
        </section>
      `
					: `<div class="compendium-empty-wrap">${emptyStateHtml("No compendiums yet.", `Add the first compendium to begin organizing ${dashboardDisplayLabel("Mind")}.`)}${state.mindCompendiumPickerOpen ? compendiumPickerPopoverHtml(perPage) : ""}</div>`
			}
      <div class="compendium-grid-controls">
        <button class="reader-page-indicator compendium-page-indicator" data-action="toggle-mind-compendium-picker" type="button" aria-label="${state.mindCompendiumPickerOpen ? "Close compendium overview" : "Open compendium overview"}" aria-expanded="${state.mindCompendiumPickerOpen ? "true" : "false"}">
          <span class="reader-page-dot reader-page-dot--side${hasPrev ? " is-available" : ""}" aria-hidden="true"></span>
          <span class="reader-page-dot reader-page-dot--current" aria-label="Compendiums ${currentStart} through ${currentEnd} of ${state.compendiums.length}"></span>
          <span class="reader-page-dot reader-page-dot--side${hasNext ? " is-available" : ""}" aria-hidden="true"></span>
        </button>
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
	const pages = [
		{
			key: "cover",
			body: `
        <section class="reader-section reader-section--cover">
          <h2 class="reader-compendium-title">${escapeHtml(compendium.title)}</h2>
          <div class="markdown-body">${readerBodyHtml(compendium.title, compendium.body, "")}</div>
        </section>
      `,
		},
		...compendium.sections.map((section) => ({
			key: section.id,
			body: `
        <section class="reader-section">
          <button class="reader-section-title" data-action="open-section" data-id="${section.id}">${escapeHtml(section.title)}</button>
          <div class="markdown-body">${renderMarkdown(section.body)}</div>
        </section>
      `,
		})),
	];
	const page = compendiumReaderPage(compendium);
	const maxPage = Math.max(0, pages.length - 1);
	const hasPrev = page > 0;
	const hasNext = page < maxPage;
	return panelHtml(`
    <div class="reader-topbar">
      <button class="icon-button" data-action="manager" type="button" aria-label="Close reader" title="Close">${iconHtml("tabler:x")}</button>
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
        <span class="reader-page-dot reader-page-dot--side${hasPrev ? " is-available" : ""}" aria-hidden="true"></span>
        <span class="reader-page-dot reader-page-dot--current" aria-label="Page ${page + 1} of ${pages.length}"></span>
        <span class="reader-page-dot reader-page-dot--side${hasNext ? " is-available" : ""}" aria-hidden="true"></span>
      </div>
    </section>
  `);
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
		title: "Edit Section",
		subtitle:
			"This can be a chapter, part, terms list, index, or any future compendium unit.",
		saveAction: "save-section",
		cancelAction: "section-viewer",
		id: section.id,
		valueTitle: section.title,
		valueBody: section.body,
	});
}

function dashboardNoteEditorHtml(note) {
	if (note.dashboard === "Life" && note.properties?.role === "life-journal")
		{return lifeJournalEditorHtml(note);}
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
	const thoughtTrackerIds = editorDraftArrayValues(
		draftKey,
		"life-thought-trackers",
		lifeTrackerIds(note, "thought"),
	);
	const goalTrackerIds = editorDraftArrayValues(
		draftKey,
		"life-goal-trackers",
		lifeTrackerIds(note, "goal"),
	);
	const dateKey = editorDraftFieldValue(
		draftKey,
		"life-entry-date",
		note.properties?.dateKey || todayDateKey(),
	);
	const mood = editorDraftFieldValue(
		draftKey,
		"life-entry-mood",
		note.properties?.mood || "steady",
	);
	const energy = editorDraftFieldValue(
		draftKey,
		"life-entry-energy",
		note.properties?.energy || "medium",
	);
	const title = editorDraftFieldValue(draftKey, "editor-title", note.title);
	const body = editorDraftFieldValue(draftKey, "editor-body", note.body);
	return panelHtml(`
      ${headerHtml(
				"Edit Life Note",
				"Journal entry with mood, energy, and orb trackers.",
				`
      <div class="action-row">
        ${pageActionButton("delete-artifact-note", "tabler:trash", "Delete note", { danger: true, data: { id: note.id } })}
        ${pageActionButton("artifact-viewer", "tabler:x", "Close editor", { className: "close-viewer-button" })}
      </div>
    `,
			)}
    <form class="editor-form life-editor-form" data-editor-draft-key="${escapeHtml(draftKey)}">
      ${editorSaveStatusHtml(note.properties?.isNewDraft ? "Unsaved" : "Saved")}
      <input id="editor-title" value="${escapeHtml(title)}" aria-label="Title">
      <div class="life-editor-grid">
        <label class="body-field">Date<input id="life-entry-date" type="date" value="${escapeHtml(dateKey)}"></label>
        <label class="body-field">Mood
          <select id="life-entry-mood">
            ${["great", "good", "steady", "low", "hard"].map((option) => `<option value="${option}"${mood === option ? " selected" : ""}>${option}</option>`).join("")}
          </select>
        </label>
        <label class="body-field">Energy
          <select id="life-entry-energy">
            ${["high", "medium", "low"].map((option) => `<option value="${option}"${energy === option ? " selected" : ""}>${option}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="life-tracker-fieldsets">
        ${lifeTrackerSelectorHtml("thought", "Thoughts", thoughtTrackerIds)}
        ${lifeTrackerSelectorHtml("goal", "Goals", goalTrackerIds)}
      </div>
      <label class="body-field editor-body-field">Journal
        <span class="editor-body-wrap has-image-button">
          <textarea id="editor-body" aria-label="Body" placeholder="What happened today? What needs attention?">${escapeHtml(body)}</textarea>
          ${editorImageButtonHtml()}
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
}) {
	const draftKey = editorDraftKeyFor(saveAction, id);
	const displayTitle = editorDraftFieldValue(
		draftKey,
		"editor-title",
		valueTitle,
	);
	const displayBody = editorDraftFieldValue(draftKey, "editor-body", valueBody);
	return panelHtml(`
    ${headerHtml(
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
		)}
    <form class="editor-form" data-editor-draft-key="${escapeHtml(draftKey)}">
      ${editorSaveStatusHtml(statusLabel)}
      <input id="editor-title" value="${escapeHtml(displayTitle)}" aria-label="Title">
      <div class="editor-body-wrap has-image-button">
        <textarea id="editor-body" aria-label="Body">${escapeHtml(displayBody)}</textarea>
        ${editorImageButtonHtml()}
      </div>
      <div class="editor-footer-actions">
        <button class="secondary-button" data-action="${cancelAction}" type="button">${buttonContent("tabler:x", "Cancel")}</button>
        <button class="secondary-button" data-action="${saveAction}" data-id="${id}" type="button">${buttonContent("tabler:device-floppy", "Save")}</button>
      </div>
    </form>
  `);
}

function editorImageButtonHtml() {
	return `
    <button class="icon-button editor-image-button editor-camera-button" data-editor-camera-button type="button" aria-label="Open camera" title="Open camera">
      ${iconHtml("tabler:camera")}
    </button>
    <button class="icon-button editor-image-button editor-upload-button" data-editor-image-button type="button" aria-label="Upload image" title="Upload image">
      ${iconHtml("tabler:photo")}
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
	if (!state.cameraOpen) {return "";}
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
        <label class="camera-save-option">
          <input data-camera-save-to-device type="checkbox"${state.cameraSaveToDevice ? " checked" : ""}>
          <span>${iconHtml("tabler:download")} Save a high-quality copy to this device</span>
        </label>
        <p class="camera-status${state.cameraError ? " has-error" : ""}" data-camera-status role="status">${escapeHtml(message)}</p>
        <div class="camera-actions">
          <button class="secondary-button" data-action="close-camera" type="button">${buttonContent("tabler:x", "Cancel")}</button>
          <button class="primary-button" data-action="capture-camera" data-camera-capture type="button" disabled>${buttonContent("tabler:camera", "Capture")}</button>
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
	if (document.querySelector(".guided-tip-bubble")) {return;}
	const label = simpleTooltipText(target?.dataset?.thoughtTooltip);
	if (!label) {return;}
	hideThoughtTooltip();
	const tooltip = document.createElement("div");
	tooltip.className = "thought-tooltip";
	tooltip.setAttribute("role", "tooltip");
	const thoughtColor = window
		.getComputedStyle(target)
		.getPropertyValue("--thought-color")
		.trim();
	if (thoughtColor) {tooltip.style.setProperty("--thought-color", thoughtColor);}
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
	if (guidedTipTarget && guidedTipTargetClickHandler) {
		guidedTipTarget.removeEventListener(
			"click",
			guidedTipTargetClickHandler,
			true,
		);
		guidedTipTarget = null;
		guidedTipTargetClickHandler = null;
	}
	document.querySelector(".guided-tip-bubble")?.remove();
	app.querySelectorAll(".is-guided-tip-target").forEach((element) => {
		element.classList.remove("is-guided-tip-target");
	});
}

function isElementVisible(element) {
	if (!element || element.closest("[hidden], [inert]")) {return false;}
	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) {return false;}
	const style = window.getComputedStyle(element);
	return (
		style.display !== "none" &&
		style.visibility !== "hidden" &&
		style.opacity !== "0"
	);
}

function activeGuidedTip() {
	const dismissed = new Set(state.dismissedTips || []);
	for (const tip of GUIDED_TIP_SEQUENCE) {
		if (dismissed.has(tip.id) || (tip.when && !tip.when())) {continue;}
		const target = app.querySelector(tip.selector);
		if (isElementVisible(target)) {return { ...tip, target };}
	}
	return null;
}

function advanceGuidedTip(tipId) {
	rememberDismissedTip(tipId);
	hideGuidedTip();
	render();
}

function showGuidedTip(tip) {
	if (!tip?.target) {return;}
	hideThoughtTooltip();
	hideGuidedTip();
	const bubble = document.createElement("button");
	bubble.className = "guided-tip-bubble";
	bubble.type = "button";
	bubble.innerHTML = `<span>${escapeHtml(simpleTooltipText(tip.label))}</span><i aria-hidden="true"></i>`;
	bubble.setAttribute(
		"aria-label",
		`${simpleTooltipText(tip.label)}. Next tip.`,
	);
	bubble.addEventListener("click", () => advanceGuidedTip(tip.id));
	document.body.append(bubble);
	tip.target.classList.add("is-guided-tip-target");
	guidedTipTarget = tip.target;
	guidedTipTargetClickHandler = () => {
		rememberDismissedTip(tip.id);
		hideGuidedTip();
	};
	tip.target.addEventListener("click", guidedTipTargetClickHandler, {
		capture: true,
		once: true,
	});

	const update = () => {
		computePosition(tip.target, bubble, {
			placement: tip.placement || "top",
			strategy: "fixed",
			middleware: [offset(12), flip(), shift({ padding: 10 })],
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
}

function bindGuidedTips() {
	window.requestAnimationFrame(() => {
		const tip = activeGuidedTip();
		if (tip) {showGuidedTip(tip);}
	});
}

function bindThoughtTooltips() {
	app.querySelectorAll("[data-thought-tooltip]").forEach((element) => {
		element.addEventListener("pointerenter", (event) => {
			if (event.pointerType === "touch") {return;}
			showThoughtTooltip(element);
		});
		element.addEventListener("pointerleave", hideThoughtTooltip);
		element.addEventListener("focus", () => showThoughtTooltip(element));
		element.addEventListener("blur", hideThoughtTooltip);
		element.addEventListener("pointerdown", (event) => {
			if (event.pointerType !== "touch") {return;}
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
				if (thoughtTooltipSuppressClickTarget !== element) {return;}
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
		if (!label) {return;}
		button.dataset.thoughtTooltip = label;
		if (!button.getAttribute("aria-label"))
			{button.setAttribute("aria-label", label);}
		if (!button.getAttribute("title")) {button.setAttribute("title", label);}
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
	if (video) {video.srcObject = null;}
}

function cameraErrorMessage(error) {
	const name = error?.name || "";
	if (name === "NotAllowedError" || name === "SecurityError")
		{return "Camera permission was blocked.";}
	if (name === "NotFoundError" || name === "OverconstrainedError")
		{return "No webcam camera was found.";}
	if (!window.isSecureContext) {return "Camera access needs HTTPS or localhost.";}
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
	if (placeholder) {placeholder.hidden = Boolean(cameraStream && !error);}
}

async function startCameraStream(video) {
	if (!video || !state.cameraOpen) {return;}
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
	if (!modal || !state.cameraOpen) {return;}
	modal.addEventListener("click", (event) => {
		if (event.target === modal) {closeCamera();}
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
				if (blob) {resolve(blob);}
				else {reject(new Error("Could not capture camera photo."));}
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
			if (blob?.size) {return blob;}
		} catch {
			// Some browsers expose ImageCapture but reject still capture for webcams.
		}
	}
	return await cameraBlobFromVideo(video);
}

function cameraImageExtension(type) {
	const normalized = String(type || "").toLowerCase();
	if (normalized.includes("png")) {return "png";}
	if (normalized.includes("webp")) {return "webp";}
	if (normalized.includes("heic")) {return "heic";}
	if (normalized.includes("heif")) {return "heif";}
	return "jpg";
}

async function cameraFileFromVideo(video) {
	const blob = await highQualityCameraBlob(video);
	const type = blob.type || "image/jpeg";
	const name = `camera-${todayDateKey()}-${Date.now()}.${cameraImageExtension(type)}`;
	if (typeof File === "function") {return new File([blob], name, { type });}
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
			if (error?.name === "AbortError") {return "Device save canceled.";}
		}
	}
	downloadCameraFile(file);
	return "Download started.";
}

async function createCameraDashboardNote(file, dashboard) {
	const normalizedDashboard = DASHBOARD_LABELS.includes(dashboard)
		? dashboard
		: "Mind";
	const stored = await storeLocalImage(file, localMediaStoreOptions());
	scheduleCloudStorageUsageRefresh({ force: true });
	const now = nowIso();
	const title = `Camera Photo`;
	const body = `## ${title}\n\nCaptured: ${currentTimestampLabel()}\n\n${stored.markdown}`;
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
		if (!inserted) {throw new Error("Could not add camera photo.");}
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
	return await createCameraDashboardNote(file, target.dashboard);
}

async function captureCameraPhoto() {
	if (state.cameraBusy) {return;}
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
		if (element.closest("[data-icon-picker-overlay]")) {return;}
		const action = element.dataset.action;
		if (action === "open-donation") {return;}
		if (action === "select-spirit-plan") {
			element.addEventListener("change", () => selectSpiritPlan(element.value));
		} else {
			element.addEventListener("click", (event) => {
				const actionElement = eventActionElement(event);
				if (actionElement && actionElement !== element) {return;}
				handleAction(element);
			});
			element.addEventListener("keydown", (event) => {
				if (event.target !== element || !["Enter", " "].includes(event.key))
					{return;}
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
			if (!files.length) {return;}
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
	app.querySelectorAll("[data-pyxdia-note-ref]").forEach((checkbox) => {
		checkbox.addEventListener("change", () =>
			savePyxdiaDraftLocal(pyxdiaDraftFromDom(), { render: false }),
		);
	});
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
	if (!images.length) {return null;}
	const fail = (message) => {
		state.pyxdiaError = message;
		if (options.renderOnError) {setState({ pyxdiaError: message });}
		return null;
	};
	if (!isPyxdiaSignedIn() || state.cloud?.isLocalDemo) {
		return fail("Sign in with Cloud before adding images to PYXIDA letters.");
	}
	const input = document.getElementById("pyxdia-letter-input");
	const uid = state.cloud?.user?.uid || "";
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
			error instanceof Error ? error.message : "Could not upload PYXIDA image.",
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

function insertTextAtPyxdiaCursor(text, start, end) {
	const input = document.getElementById("pyxdia-letter-input");
	if (!input) {return;}
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
	if (!settings.delayEnabled) {processDueLocalPyxdiaJobs({ force: true });}
	if (!isPyxdiaSignedIn() || state.cloud?.isLocalDemo) {return;}
	try {
		const payload = await savePyxdiaSettings(settings, {
			getIdToken: getCloudIdToken,
		});
		applyPyxdiaStatePayload(payload);
		setState({
			pyxdiaStatus: "PYXIDA settings saved.",
			pyxdiaError: "",
		});
	} catch (error) {
		setState({
			pyxdiaError:
				error instanceof Error
					? error.message
					: "Could not save PYXIDA settings.",
		});
	}
}

function bindPyxdiaImages() {
	const refs = new Map();
	[
		...(state.pyxdiaDraft?.imageRefs || []),
		...(state.pyxdiaLetters || []).flatMap((letter) => letter.imageRefs || []),
	].forEach((ref) => {
		if (ref?.id) {refs.set(ref.id, ref);}
	});
	app.querySelectorAll("img[data-pyxdia-image]").forEach(async (image) => {
		const ref = refs.get(image.dataset.pyxdiaImage || "");
		if (!ref) {
			image.classList.add("is-missing");
			return;
		}
		try {
			const url = await resolvePyxdiaImageUrl(ref);
			if (url) {image.src = url;}
			else {image.classList.add("is-missing");}
		} catch {
			image.classList.add("is-missing");
		}
	});
}

function bindDashboardIdentityAutoSave() {
	const panel = app.querySelector(".interface-settings");
	if (!panel) {return;}
	let saveTimer = null;
	const scheduleSave = () => {
		window.clearTimeout(saveTimer);
		saveTimer = window.setTimeout(saveDashboardIdentitySettings, 200);
	};
	panel
		.querySelectorAll(
			"input[name='dashboard-display-mode'], .dashboard-identity-input-row input",
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
			if (!customRange) {return;}
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
	if (direct) {return direct;}
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
				if (element.scrollWidth <= element.clientWidth) {return;}
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
	if (!pathBar) {return;}
	const maxScroll = Math.max(0, pathBar.scrollWidth - pathBar.clientWidth);
	pathBar.classList.toggle("is-overflow-left", pathBar.scrollLeft > 1);
	pathBar.classList.toggle(
		"is-overflow-right",
		pathBar.scrollLeft < maxScroll - 1,
	);
}

function bindPathBarOverflow() {
	const pathBar = app.querySelector(".path-bar");
	if (!pathBar) {return;}
	const refresh = () => updatePathBarOverflow(pathBar);
	const focusCurrent = () => {
		if (
			pathBar.dataset.focusCurrent !== "true" ||
			pathBar.dataset.currentFocused === "true"
		)
			{return;}
		const maxScroll = Math.max(0, pathBar.scrollWidth - pathBar.clientWidth);
		if (maxScroll > 0) {pathBar.scrollLeft = maxScroll;}
		pathBar.dataset.currentFocused = "true";
		refresh();
	};
	refresh();
	requestAnimationFrame(() => {
		focusCurrent();
		refresh();
	});
	pathBar.addEventListener("scroll", refresh, { passive: true });
	pathBar.addEventListener(
		"wheel",
		(event) => {
			if (pathBar.scrollWidth <= pathBar.clientWidth) {return;}
			event.preventDefault();
			const delta =
				Math.abs(event.deltaX) > Math.abs(event.deltaY)
					? event.deltaX
					: event.deltaY;
			pathBar.scrollBy({ left: delta, behavior: "smooth" });
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
	if (!scrollArea) {return;}
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
	if (!list) {return;}

	list.querySelectorAll("[data-section-drag-handle]").forEach((handle) => {
		handle.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
		});

		handle.addEventListener("pointerdown", (event) => {
			if (event.button !== undefined && event.button !== 0) {return;}
			const activeRow = handle.closest("[data-section-row]");
			const compendiumId = list.dataset.compendiumId;
			const sectionId = activeRow?.dataset.id;
			if (!activeRow || !compendiumId || !sectionId) {return;}

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
				if (!reorderCompendiumSection(compendiumId, sectionId, targetIndex))
					{return;}
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
				if (!moved) {return;}
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
			if (element.dataset.balanceKey === key)
				{element.classList.toggle("is-linked-hover", enabled);}
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
	if (!buttons.length) {return;}
	const targetButton = buttons[targetIndex];
	if (targetButton) {targetButton.classList.add("is-drop-before");}
	else {buttons[buttons.length - 1].classList.add("is-drop-after");}
}

function bindDashboardChartTabSorting() {
	const row = app.querySelector("[data-dashboard-chart-switcher]");
	if (!row) {return;}
	row.querySelectorAll("[data-dashboard-chart-tab]").forEach((button) => {
		button.addEventListener("pointerdown", (event) => {
			if (event.button !== undefined && event.button !== 0) {return;}
			const tabId = button.dataset.chart || "";
			if (!tabId) {return;}
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
				if (!isDragging && moved < 6) {return;}
				moveEvent.preventDefault();
				if (!isDragging) {startDrag(moveEvent);}
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
				if (!isDragging) {return;}
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
	if (!element) {return;}
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
				if (element.scrollWidth <= element.clientWidth) {return;}
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
			if (input.checked) {selected.add(id);}
			else {selected.delete(id);}
			setState({ gallerySelectedIds: Array.from(selected) });
		});
	});
}

function bindEditorMedia() {
	const editor = document.getElementById("editor-body");
	if (!editor) {return;}
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
	const imageButton = app.querySelector("[data-editor-image-button]");
	if (imageButton) {
		imageButton.addEventListener("pointerdown", (event) => {
			event.preventDefault();
			editor.focus();
		});
		imageButton.addEventListener("click", async () => {
			const start = editor.selectionStart ?? editor.value.length;
			const end = editor.selectionEnd ?? start;
			const input = document.createElement("input");
			input.type = "file";
			input.accept = "image/*";
			input.multiple = true;
			input.addEventListener(
				"change",
				async () => {
					await insertEditorImages(Array.from(input.files || []), {
						start,
						end,
					});
				},
				{ once: true },
			);
			input.click();
		});
	}
	editor.addEventListener("paste", async (event) => {
		const files = Array.from(event.clipboardData?.items || [])
			.filter((item) => item.kind === "file" && item.type.startsWith("image/"))
			.map((item) => item.getAsFile())
			.filter(Boolean);
		if (!files.length) {return;}
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
		if (!files.length) {return;}
		event.preventDefault();
		setEditorCursorFromPoint(event);
		await insertEditorImages(files);
	});
}

function setEditorCursorFromPoint(event) {
	const editor = document.getElementById("editor-body");
	if (!editor) {return;}
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
		if (range) {editor.setSelectionRange(range.startOffset, range.startOffset);}
	}
}

async function insertEditorImages(files, range = null) {
	const editor = document.getElementById("editor-body");
	if (!editor) {return false;}
	const images = files.filter((file) => file?.type?.startsWith("image/"));
	if (!images.length) {return false;}
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
	if (!editor) {return;}
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
		return "Firebase Storage denied access to this media file.";
	}
	if (code.includes("storage/object-not-found")) {
		return "The synced media file was not found in Firebase Storage.";
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
	element.removeAttribute("title");
	delete element.dataset.mediaError;
}

function bindLocalAssetImages() {
	app.querySelectorAll("img[data-local-asset]").forEach(async (image) => {
		try {
			const url = await resolveLocalImageUrl(image.dataset.localAsset);
			if (url) {
				image.src = url;
				markLocalAssetReady(image);
			}
			else
				{markLocalAssetMissing(image, "No local or cloud media file was found.");}
		} catch (error) {
			markLocalAssetMissing(image, error);
		}
	});
	app.querySelectorAll("a[data-local-asset-link]").forEach(async (link) => {
		link.addEventListener("click", (event) => {
			if (!link.href || link.getAttribute("href") === "#")
				{event.preventDefault();}
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
			if (!link.href || link.getAttribute("href") === "#")
				{event.preventDefault();}
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
	const keepMenuOpenActions = new Set([
		"toggle-mobile-menu",
		"toggle-sidebar-section",
		"toggle-pyxdia-menu",
		"toggle-all-sidebar-sections",
		"sidebar-page",
	]);
	if (!keepMenuOpenActions.has(action)) {closeMobileMenu();}
	if (action === "open-camera") {openCamera(cameraTargetFromElement(element));}
	if (action === "close-camera") {closeCamera();}
	if (action === "capture-camera") {void captureCameraPhoto();}
	if (action === "home") {goHome();}
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
	if (action === "compendium-root")
		{setState({ mindMode: "manager", selectedSectionId: null });}
	if (action === "toggle-mobile-menu") {
		if (state.suppressNextMenuToggle) {
			state.suppressNextMenuToggle = false;
		} else {
			toggleMobileMenu();
		}
	}
	if (action === "toggle-sidebar-section")
		{toggleSidebarSection(element.dataset.section);}
	if (action === "toggle-pyxdia-menu")
		{setState({ pyxdiaExpanded: !state.pyxdiaExpanded });}
	if (action === "toggle-all-sidebar-sections") {toggleAllSidebarSections();}
	if (action === "sidebar-page")
		{setSidebarPage(
			element.dataset.section,
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
		);}
	if (action === "tracker-page")
		{setTrackerPage(
			element.dataset.area,
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
			element.dataset.editable === "true",
			element.dataset.kind || "thought",
		);}
	if (action === "open-dashboard-card")
		{openDashboardCard(element.dataset.section);}
	if (action === "open-dashboard-direct") {
		setState({
			active: element.dataset.section,
			flipped: null,
			artifactMode: "grid",
			selectedArtifactId: null,
			selectedSpiritBookKey: null,
		});
	}
	if (action === "set-dashboard-period")
		{setDashboardPeriod(element.dataset.period);}
	if (action === "set-dashboard-chart") {
		if (state.suppressNextDashboardChartClick) {
			state.suppressNextDashboardChartClick = false;
			return;
		}
		setDashboardChartType(element.dataset.chart);
	}
	if (action === "set-theme") {setTheme(element.dataset.theme);}
	if (action === "save-dashboard-identity") {saveDashboardIdentitySettings();}
	if (action === "reset-dashboard-identity-item")
		{resetDashboardIdentityItem(element.dataset.dashboard);}
	if (action === "open-icon-picker") {openIconPicker(element);}
	if (action === "close-icon-picker") {closeIconPicker();}
	if (action === "select-icon-picker-icon")
		{selectIconPickerIcon(element.dataset.icon);}
	if (action === "select-icon-picker-color")
		{selectIconPickerColor(element.dataset.color);}
	if (action === "save-icon-picker") {saveIconPickerSelection();}
	if (action === "load-more-icon-picker") {loadMoreIconPickerIcons();}
	if (action === "open-compendium") {openCompendium(element.dataset.id);}
	if (action === "mind-compendium-page")
		{setMindCompendiumPage(
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
		);}
	if (action === "toggle-mind-compendium-picker") {toggleMindCompendiumPicker();}
	if (action === "select-mind-compendium")
		{selectMindCompendiumFromPicker(
			element.dataset.id,
			Number(element.dataset.index || 0),
			Number(element.dataset.perPage || 1),
		);}
	if (action === "open-mind-section")
		{openMindSection(element.dataset.parentId, element.dataset.id);}
	if (action === "open-artifact-note")
		{openArtifactNote(element.dataset.id, element.dataset.returnActive || "");}
	if (action === "open-life-activity") {openActivityArtifact(element.dataset.id);}
	if (action === "export-artifacts") {exportArtifacts();}
	if (action === "import-artifacts") {importArtifacts();}
	if (action === "factory-defaults") {restoreFactoryDefaults();}
	if (action === "clear-app-data") {clearAppData();}
	if (action === "reset-tips") {resetTips();}
	if (action === "dismiss-tip") {dismissTip(element.dataset.tip, element);}
	if (action === "open-gallery") {openGallery();}
	if (action === "close-gallery") {goHome();}
	if (action === "open-trash") {openTrash();}
	if (action === "trash-refresh")
		{void runTrashAction("Refreshing Trash...", refreshTrashState);}
	if (action === "trash-save-settings")
		{void runTrashAction("Saving Trash settings...", saveTrashSettingsAction);}
	if (action === "trash-restore-item")
		{void runTrashAction("Restoring item...", () =>
			restoreTrashItemAction(element.dataset.id),
		);}
	if (action === "trash-hard-delete-item")
		{void runTrashAction("Deleting item...", () =>
			hardDeleteTrashItemAction(element.dataset.id),
		);}
	if (action === "gallery-select-all") {selectAllGalleryImages();}
	if (action === "gallery-clear-selection") {clearGallerySelection();}
	if (action === "gallery-delete-selected") {deleteSelectedGalleryImages();}
	if (action === "open-settings") {
		setState({
			active: "Settings",
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
			active: "Settings",
			settingsTab: "pyxdia",
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
	if (action === "close-settings") {goHome();}
	if (action === "set-settings-tab")
		{setState({
			settingsTab:
				element.dataset.tab === "dashboard"
					? "interface"
					: element.dataset.tab || "getting-started",
			trackerAddArea: "",
			trackerEditKey: "",
			trackerDeleteKey: "",
		});}
	if (action === "pyxdia-new-letter" || action === "pyxdia-open-input")
		{openPyxdia("input");}
	if (action === "pyxdia-open-output") {openPyxdia("output");}
	if (action === "pyxdia-open-thread")
		{openPyxdia("thread", { pyxdiaActiveThreadId: element.dataset.id || "" });}
	if (action === "set-pyxdia-view") {openPyxdia(element.dataset.view || "input");}
	if (action === "set-pyxdia-editor-mode") {
		if (document.getElementById("pyxdia-letter-input")) {
			savePyxdiaDraftLocal(pyxdiaDraftFromDom(), { render: false });
		}
		setState({
			pyxdiaEditorMode:
				element.dataset.mode === "preview" ? "preview" : "markdown",
		});
	}
	if (action === "pyxdia-save-draft")
		{void runPyxdiaAction("Saving draft...", savePyxdiaDraftAction);}
	if (action === "pyxdia-send-letter")
		{void runPyxdiaAction("Sending letter...", sendPyxdiaLetterAction);}
	if (action === "pyxdia-refresh")
		{void runPyxdiaAction("Refreshing PYXIDA...", refreshPyxdiaState);}
	if (action === "pyxdia-retry-letter")
		{void runPyxdiaAction("Retrying letter...", () =>
			retryPyxdiaLetterAction(element.dataset.id),
		);}
	if (action === "pyxdia-delete-letter")
		{void deletePyxdiaLetterAction(element.dataset.id);}
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
		void runPyxdiaAction("Saving PYXIDA settings...", () =>
			savePyxdiaSettingsAction(settings),
		);
	}
	if (action === "pyxdia-reset-memory")
		{void runPyxdiaAction("Resetting PYXIDA memory...", resetPyxdiaMemoryAction);}
	if (action === "cloud-sign-in")
		{void runCloudAction("Signing in...", () => signInToCloud());}
	if (action === "cloud-google-sign-in")
		{void runCloudAction("Opening Google sign-in...", () => signInWithGoogle());}
	if (action === "cloud-email-sign-in")
		{void runCloudAction("Signing in...", () => signInWithEmailForm());}
	if (action === "cloud-email-create")
		{void runCloudAction("Creating account...", () =>
			signInWithEmailForm({ create: true }),
		);}
	if (action === "cloud-sign-out")
		{void runCloudAction("Signing out...", () => signOutCloud());}
	if (action === "cloud-subscribe")
		{void runCloudAction("Opening subscription checkout...", () =>
			startCloudSubscription(cloudReturnUrl()),
		);}
	if (action === "cloud-billing")
		{void runCloudAction("Opening billing portal...", () =>
			openBillingPortal(cloudReturnUrl()),
		);}
	if (action === "cloud-sync-now")
		{void runCloudAction("Syncing to Cloud...", () => syncCloudNow());}
	if (action === "cloud-load")
		{void runCloudAction("Loading Firebase artifacts...", () =>
			loadCloudIntoLocalApp(),
		);}
	if (action === "cloud-delete-data")
		{void runCloudAction("Deleting Cloud data...", () => deleteCloudData());}
	if (action === "cloud-delete-account")
		{void runCloudAction("Deleting Cloud account...", () =>
			deleteCloudAccountData(),
		);}
	if (action === "start-add-tracker") {
		const area = element.dataset.area || "";
		const kind = trackerKind(element.dataset.kind || "thought");
		setState({
			trackerAddArea: trackerAddKey(
				area,
				kind,
			),
			trackerEditKey: "",
			trackerDeleteKey: "",
		});
		scrollTrackerEditorIntoView(
			`[data-tracker-add-form][data-area="${selectorValue(area)}"][data-kind="${selectorValue(kind)}"]`,
		);
	}
	if (action === "cancel-add-tracker") {setState({ trackerAddArea: "" });}
	if (action === "start-edit-tracker") {
		if (state.suppressNextTrackerEditClick) {
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
	if (action === "cancel-edit-tracker")
		{setState({ trackerEditKey: "", trackerDeleteKey: "" });}
	if (action === "save-edit-tracker")
		{updateTracker(
			element.dataset.area,
			element.dataset.id,
			element.dataset.kind || "thought",
		);}
	if (action === "transfer-tracker-kind")
		{transferTrackerKind(
			element.dataset.area,
			element.dataset.id,
			element.dataset.kind || "thought",
		);}
	if (action === "request-remove-tracker")
		{setState({
			trackerDeleteKey: trackerEditKey(
				element.dataset.area,
				element.dataset.id,
				element.dataset.kind || "thought",
			),
		});}
	if (action === "cancel-remove-tracker") {setState({ trackerDeleteKey: "" });}
	if (action === "save-tracker")
		{addTracker(element.dataset.area, element.dataset.kind || "thought");}
	if (action === "remove-tracker")
		{removeTracker(
			element.dataset.area,
			element.dataset.id,
			element.dataset.kind || "thought",
		);}
	if (action === "quick-thought")
		{quickThought(element.dataset.area, element.dataset.id);}
	if (action === "quick-goal")
		{quickGoal(element.dataset.area, element.dataset.id, element);}
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
	if (action === "delete-thought-toast-note")
		{void deleteThoughtToastNote(
			element.dataset.id || state.thoughtToast?.noteId,
		);}
	if (action === "dismiss-thought-toast") {clearThoughtToast();}
	if (action === "new-compendium") {addCompendium();}
	if (action === "new-artifact-note")
		{addDashboardNote(element.dataset.dashboard);}
	if (action === "delete-compendium") {void deleteCompendium(element.dataset.id);}
	if (action === "delete-section") {void deleteSection(element.dataset.id);}
	if (action === "delete-artifact-note")
		{void deleteDashboardNote(element.dataset.id);}
	if (action === "save-body-fast-settings") {saveBodyFastSettings();}
	if (action === "start-body-fast") {startBodyFast();}
	if (action === "stop-body-fast") {stopBodyFast();}
	if (action === "save-body-timer-settings")
		{saveBodyTimerSettings(element.dataset.mode);}
	if (action === "start-body-timer") {startBodyTimer(element.dataset.mode);}
	if (action === "stop-body-timer") {stopBodyTimer(element.dataset.mode);}
	if (action === "save-body-nutrition") {saveBodyNutrition();}
	if (action === "save-body-nutrition-goals") {saveBodyNutritionGoals();}
	if (action === "reset-body-nutrition") {resetBodyNutrition();}
	if (action === "add-body-workout") {addBodyWorkout();}
	if (action === "delete-body-workout") {deleteBodyWorkout(element.dataset.id);}
	if (action === "set-body-mode") {setBodyMode(element.dataset.mode);}
	if (action === "set-body-timer-mode") {setBodyTimerMode(element.dataset.mode);}
	if (action === "set-body-nutrition-mode")
		{setBodyNutritionMode(element.dataset.mode);}
	if (action === "set-life-tool") {setLifeTool(element.dataset.tool);}
	if (action === "set-life-mode") {setLifeMode(element.dataset.mode);}
	if (action === "add-life-todo") {addLifeTodo();}
	if (action === "toggle-life-todo") {toggleLifeTodo(element.dataset.id);}
	if (action === "toggle-life-task")
		{toggleLifeTaskItem(
			element.dataset.source,
			element.dataset.id,
			element.dataset.projectId,
			element.dataset.phaseId,
		);}
	if (action === "edit-life-task-notes")
		{editLifeTaskNotes(
			element.dataset.source,
			element.dataset.id,
			element.dataset.projectId,
			element.dataset.phaseId,
		);}
	if (action === "open-life-task")
		{openLifeTaskItem(
			element.dataset.source,
			element.dataset.id,
			element.dataset.projectId,
			element.dataset.phaseId,
		);}
	if (action === "open-life-project-task")
		{openLifeProjectTask(
			element.dataset.projectId,
			element.dataset.phaseId,
			element.dataset.taskId,
		);}
	if (action === "delete-life-todo") {deleteLifeTodo(element.dataset.id);}
	if (action === "add-life-project") {addLifeProject();}
	if (action === "select-life-project") {selectLifeProject(element.dataset.id);}
	if (action === "select-life-phase") {selectLifePhase(element.dataset.id);}
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
	if (action === "add-life-phase") {addLifePhase(element.dataset.projectId);}
	if (action === "add-life-project-task")
		{addLifeProjectTask(element.dataset.projectId, element.dataset.phaseId);}
	if (action === "save-life-project-entity")
		{saveLifeProjectEntity(element.dataset.level);}
	if (action === "upload-life-attachment")
		{uploadLifeAttachment(element.dataset.level);}
	if (action === "delete-life-attachment")
		{deleteLifeAttachment(element.dataset.level, element.dataset.id);}
	if (action === "set-spirit-year") {setSpiritYear(Number(element.dataset.year));}
	if (action === "spirit-prev-year") {
		const years = spiritYears();
		const index = years.indexOf(state.spiritYear);
		if (index > 0) {setSpiritYear(years[index - 1]);}
	}
	if (action === "spirit-next-year") {
		const years = spiritYears();
		const index = years.indexOf(state.spiritYear);
		if (index >= 0 && index < years.length - 1) {setSpiritYear(years[index + 1]);}
	}
	if (action === "open-spirit-book") {openSpiritBook(element.dataset.key);}
	if (action === "exit-spirit-book") {exitSpiritBook();}
	if (action === "exit-spirit-note")
		{setState({ selectedArtifactId: null, artifactMode: "grid" });}
	if (action === "add-spirit-book-note") {addSpiritBookNote(element.dataset.key);}
	if (action === "toggle-spirit-complete")
		{toggleSpiritComplete(element.dataset.key);}
	if (action === "reader") {setState({ mindMode: "reader" });}
	if (action === "manager") {setState({ mindMode: "manager" });}
	if (action === "compendium-reader-page")
		{setCompendiumReaderPage(
			element.dataset.id,
			element.dataset.direction,
			Number(element.dataset.maxPage || 0),
		);}
	if (action === "edit-compendium") {setState({ mindMode: "compendium-editor" });}
	if (action === "add-section") {addSection();}
	if (action === "open-section")
		{setState({
			selectedSectionId: element.dataset.id,
			mindMode: "section-viewer",
		});}
	if (action === "edit-section") {setState({ mindMode: "section-editor" });}
	if (action === "section-viewer") {setState({ mindMode: "section-viewer" });}
	if (action === "edit-artifact-note") {setState({ artifactMode: "editor" });}
	if (action === "artifact-viewer") {closeArtifactEditor();}
	if (action === "close-artifact-viewer") {closeArtifactViewer();}
	if (action === "save-compendium")
		{saveCompendium(element.dataset.id, editorTitle(), editorBody());}
	if (action === "save-section")
		{saveSection(element.dataset.id, editorTitle(), editorBody());}
	if (action === "save-artifact-note")
		{saveDashboardNote(element.dataset.id, editorTitle(), editorBody());}
}

function editorTitle() {
	return document.getElementById("editor-title")?.value.trim() || "Untitled";
}

function editorBody() {
	return document.getElementById("editor-body")?.value || "";
}

function updateBodyTimerDom() {
	BODY_TIMER_MODES.forEach(({ key }) => {
		const timer = bodyTimerState(key);
		if (!timer.active) {return;}

		const timeEl = document.getElementById(`body-timer-${key}-time`);
		const ringEl = document.getElementById(`body-timer-${key}-ring`);
		if (!timeEl || !ringEl) {return;}

		timeEl.textContent = formatDuration(getBodyTimerElapsedMs(key));
		ringEl.style.strokeDashoffset = String(
			RING_CIRCUMFERENCE * (1 - getBodyTimerProgress(key)),
		);
	});
}

window.addEventListener("pagehide", () => stopCameraStream());
document.addEventListener("visibilitychange", () => {
	if (document.hidden && state.cameraOpen) {closeCamera();}
});

applyEnvironmentClasses();
render();
void initCloudAccount((cloud) => {
	state.cloud = cloud;
	configureMediaCloudContext(cloud);
	if (!isUserEditingInterface()) {render();}
	configureCloudAutoSync();
	if (state.artifactStore) {void maybePromptCloudImport(cloud);}
	if (cloud?.mode === "signed-in") {void refreshPyxdiaState({ silent: true });}
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
