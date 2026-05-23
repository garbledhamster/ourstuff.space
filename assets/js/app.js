import { dashboardCards, today } from "./data.js";
import { donationModalHtml, bindDonationFlow } from "./donations.js";
import { clearLocalFiles, deleteLocalImages, exportLocalFiles, importLocalFiles, listLocalImages, resolveLocalFileUrl, resolveLocalImageUrl, storeLocalFile, storeLocalImage } from "./localMedia.js";
import { escapeHtml, renderMarkdown } from "./markdown.js";
import {
  applyThemeVariables as applyThemeSystemVariables,
  loadTheme as loadThemeSelection,
  normalizeTheme as normalizeThemeSelection,
  saveTheme as saveThemeSelection,
  THEME_COLOR_FIELDS,
  themeColors,
  themeFontLabel as themeSystemFontLabel,
  themePreviewStyle
} from "./themeSystem.js";
import { autoUpdate, computePosition, flip, offset, shift } from "https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.5/+esm";
import {
  artifactStoreToCompendiums,
  compendiumsToArtifactStore,
  createEmptyStore,
  findArtifact,
  loadArtifactStore,
  loadSeedStore,
  removeArtifact,
  rootNotesForDashboard,
  SCHEMA_VERSION,
  saveArtifactStore,
  STORAGE_KEY,
  upsertArtifact
} from "./storage.js?v=compendium-section-20260523a";

const app = document.getElementById("app");
const BODY_TRACKER_KEY = "ourstuff.bodyTracker.v1";
const SPIRIT_PROGRESS_KEY = "ourstuff.spiritPlanProgress.v1";
const LIFE_PLANNER_KEY = "ourstuff.lifePlanner.v1";
const TRACKER_SETTINGS_KEY = "ourstuff.thoughts.v1";
const GOAL_SETTINGS_KEY = "ourstuff.goals.v1";
const DASHBOARD_IDENTITY_KEY = "ourstuff.dashboardIdentity.v1";
const SIDEBAR_WIDTH_KEY = "ourstuff.sidebarWidth.v1";
const THEME_KEY = "ourstuff.theme.v1";
const DISMISSED_TIPS_KEY = "ourstuff.dismissedTips.v1";
const ICONIFY_SEARCH_CACHE_KEY = "ourstuff.iconifySearchCache.v1";
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
  "mdi:book-open-page-variant"
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
const DEFAULT_DASHBOARD_IDENTITY = {
  displayMode: "numbers",
  showNumbers: true,
  showIcons: false,
  items: {
    Mind: { number: "01", label: "Mind", icon: "tabler:brain" },
    Body: { number: "02", label: "Body", icon: "tabler:activity" },
    Spirit: { number: "03", label: "Spirit", icon: "tabler:sun" },
    Life: { number: "04", label: "Life", icon: "tabler:calendar-heart" }
  }
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
  { id: "10-years", label: "10 years", days: 365 * 10 }
];
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
    emptyText: "Start a fast to track elapsed time against your target."
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
    emptyText: "Start a sleep timer to track your rest window."
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
    emptyText: "Start an exercise timer for strength, mobility, or focused movement."
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
    emptyText: "Start a cardio timer for walks, runs, bike rides, or conditioning."
  }
];
let thoughtToastFadeTimer = null;
let thoughtToastHideTimer = null;
let thoughtTooltipCleanup = null;
let thoughtTooltipLongPressTimer = null;
let thoughtTooltipSuppressClickTarget = null;
let dashboardPeriodGlowTimer = null;
const SPIRIT_PLANS = [
  {
    id: "ten-year",
    label: "Western Paganism",
    url: "/assets/data/bookclub.json"
  }
];
const DASHBOARD_COLORS = {
  Mind: "#38bdf8",
  Body: "#22c55e",
  Spirit: "#f59e0b",
  Life: "#f472b6"
};
const APP_THEMES = [
  {
    id: "default",
    label: "Default",
    description: "Original Ourstuff dark interface.",
    fontSet: "classic"
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
      dangerColor: "#dc2626"
    }
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
      dangerColor: "#f97316"
    }
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
      dangerColor: "#f87171"
    }
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
      dangerColor: "#dc2626"
    }
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
      dangerColor: "#f92672"
    }
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
      dangerColor: "#dc322f"
    }
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
      dangerColor: "#b42318"
    }
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
      dangerColor: "#ef4444"
    }
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
      dangerColor: "#ef4444"
    }
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
      dangerColor: "#f43f5e"
    }
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
      dangerColor: "#fb7185"
    }
  },
  {
    id: "consolas",
    label: "Consolas",
    description: "Slate black console surface with off-white Consolas-style text and borders.",
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
      dangerColor: "#f0b7b7"
    }
  }
];
const THEME_FONT_SETS = {
  classic: {
    label: "Classic",
    body: '"Aptos", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
    display: 'Georgia, "Times New Roman", serif',
    labelFont: '"Bahnschrift", "Aptos", "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  midnight: {
    label: "Midnight UI",
    body: '"Segoe UI Variable Text", "Aptos", "Segoe UI", system-ui, sans-serif',
    display: '"Aptos Display", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
    labelFont: '"Bahnschrift", "Segoe UI Variable Text", "Aptos", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  ocean: {
    label: "Rounded",
    body: 'Corbel, "Candara", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
    display: '"Trebuchet MS", Corbel, "Segoe UI Variable Display", system-ui, sans-serif',
    labelFont: '"Trebuchet MS", "Bahnschrift", Corbel, system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  sunrise: {
    label: "Editorial Warm",
    body: 'Candara, "Segoe UI Variable Text", "Aptos", system-ui, sans-serif',
    display: 'Constantia, Georgia, "Palatino Linotype", serif',
    labelFont: '"Franklin Gothic Medium", "Bahnschrift", "Aptos", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  minimal: {
    label: "Minimal",
    body: '"Segoe UI Variable Text", "Aptos", "Segoe UI", system-ui, sans-serif',
    display: '"Segoe UI Variable Display", "Aptos Display", "Segoe UI", system-ui, sans-serif',
    labelFont: '"Segoe UI Variable Small", "Bahnschrift", "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  editorial: {
    label: "Editorial",
    body: '"Aptos", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
    display: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
    labelFont: '"Bahnschrift", "Aptos", "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  warm: {
    label: "Parchment",
    body: 'Constantia, Cambria, Georgia, "Times New Roman", serif',
    display: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
    labelFont: '"Trebuchet MS", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  humanist: {
    label: "Humanist",
    body: '"Candara", "Segoe UI Variable Text", "Aptos", system-ui, sans-serif',
    display: '"Cambria", Georgia, "Times New Roman", serif',
    labelFont: '"Bahnschrift", "Candara", "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  utility: {
    label: "Utility",
    body: 'Verdana, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
    display: '"Arial Black", Impact, "Aptos Display", system-ui, sans-serif',
    labelFont: 'Tahoma, Verdana, "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  technical: {
    label: "Technical",
    body: '"Segoe UI Variable Text", "Aptos", "Segoe UI", system-ui, sans-serif',
    display: '"Century Gothic", "Aptos Display", "Segoe UI Variable Display", system-ui, sans-serif',
    labelFont: '"Bahnschrift", "Century Gothic", "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  code: {
    label: "Code",
    body: '"Cascadia Code", "Cascadia Mono", Consolas, "Liberation Mono", monospace',
    display: '"Cascadia Code", "Cascadia Mono", Consolas, "Liberation Mono", monospace',
    labelFont: '"Cascadia Mono", Consolas, "Liberation Mono", monospace',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  softCode: {
    label: "Soft Code",
    body: '"Cascadia Mono", "Lucida Console", Consolas, monospace',
    display: '"Segoe UI Variable Display", "Aptos Display", "Cascadia Mono", system-ui, sans-serif',
    labelFont: '"Cascadia Mono", "Lucida Console", Consolas, monospace',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  },
  mono: {
    label: "Mono",
    body: 'Consolas, "Cascadia Mono", "SFMono-Regular", "Liberation Mono", monospace',
    display: 'Consolas, "Cascadia Mono", "SFMono-Regular", "Liberation Mono", monospace',
    labelFont: 'Consolas, "Cascadia Mono", "SFMono-Regular", "Liberation Mono", monospace',
    mono: 'Consolas, "Cascadia Mono", "SFMono-Regular", "Liberation Mono", monospace'
  }
};
const ICON_ALIASES = {
  "tabler:lotus": "tabler:yoga",
  "tabler:hands-pray": "tabler:pray"
};
const DEFAULT_TRACKERS = {
  Mind: [
    { id: "mind-note-taking", label: "Note Making", icon: "tabler:notes" },
    { id: "mind-compendium-learning", label: "Compendium", icon: "tabler:school" },
    { id: "mind-idea", label: "Idea", icon: "tabler:bulb" },
    { id: "mind-question", label: "Question", icon: "tabler:question-mark" }
  ],
  Body: [
    { id: "body-exercised", label: "Workout", icon: "tabler:barbell" },
    { id: "body-ate-healthy", label: "Ate Healthy", icon: "tabler:salad" },
    { id: "body-drank-water", label: "Drank Water", icon: "tabler:droplet" },
    { id: "body-slept-well", label: "Sleep", icon: "tabler:moon" }
  ],
  Spirit: [
    { id: "spirit-studied", label: "Studied", icon: "tabler:book" },
    { id: "spirit-meditated", label: "Meditated", icon: "tabler:yoga" },
    { id: "spirit-reflection", label: "Reflection", icon: "tabler:message-circle" },
    { id: "spirit-prayer", label: "Prayer", icon: "tabler:pray" }
  ],
  Life: [
    { id: "life-family", label: "Family", icon: "tabler:users" },
    { id: "life-friends", label: "Friends", icon: "tabler:friends" },
    { id: "life-work", label: "Work", icon: "tabler:briefcase" },
    { id: "life-home", label: "Clean", icon: "tabler:sparkles" }
  ]
};
const DEFAULT_GOALS = {
  Mind: [
    { id: "mind-read", label: "Read", icon: "tabler:book-2" },
    { id: "mind-write", label: "Write", icon: "tabler:pencil" },
    { id: "mind-learn", label: "Learn", icon: "tabler:school" },
    { id: "mind-plan", label: "Plan", icon: "tabler:list-check" }
  ],
  Body: [
    { id: "body-move", label: "Move", icon: "tabler:run" },
    { id: "body-hydrate", label: "Hydrate", icon: "tabler:droplet" },
    { id: "body-sleep", label: "Sleep", icon: "tabler:moon" },
    { id: "body-nutrition", label: "Nutrition", icon: "tabler:apple" }
  ],
  Spirit: [
    { id: "spirit-read", label: "Read", icon: "tabler:book" },
    { id: "spirit-pray", label: "Pray", icon: "tabler:pray" },
    { id: "spirit-reflect", label: "Reflect", icon: "tabler:message-circle" },
    { id: "spirit-gratitude", label: "Gratitude", icon: "tabler:heart" }
  ],
  Life: [
    { id: "life-family-goal", label: "Family", icon: "tabler:users" },
    { id: "life-work-goal", label: "Work", icon: "tabler:briefcase" },
    { id: "life-home-goal", label: "Home", icon: "tabler:home" },
    { id: "life-budget", label: "Budget", icon: "tabler:coins" }
  ]
};
const TRACKER_ID_MIGRATIONS = {
  "mind-lesson-learning": "mind-compendium-learning"
};
const TRACKER_LABEL_MIGRATIONS = {
  "mind-note-taking": {
    from: ["Note Taking"],
    to: "Note Making"
  },
  "mind-compendium-learning": {
    from: ["Lesson/Learning", "Lesson"],
    to: "Compendium"
  },
  "body-exercised": {
    from: ["Exercised"],
    to: "Workout"
  },
  "body-slept-well": {
    from: ["Slept Well"],
    to: "Sleep"
  },
  "life-home": {
    from: ["Home"],
    to: "Clean"
  }
};

function cloneTrackerDefaults(defaults) {
  return Object.fromEntries(DASHBOARD_LABELS.map((label) => [
    label,
    defaults[label].map((tracker) => ({ ...tracker }))
  ]));
}

function cloneDefaultTrackers() {
  return cloneTrackerDefaults(DEFAULT_TRACKERS);
}

function cloneDefaultGoals() {
  return Object.fromEntries(DASHBOARD_LABELS.map((dashboard) => [
    dashboard,
    (DEFAULT_GOALS[dashboard] || []).map((goal) => ({ ...goal, enabled: true }))
  ]));
}

function createEmptyTrackerSettings() {
  return Object.fromEntries(DASHBOARD_LABELS.map((dashboard) => [dashboard, []]));
}

function cloneDefaultDashboardIdentity() {
  return {
    displayMode: DEFAULT_DASHBOARD_IDENTITY.displayMode,
    showNumbers: DEFAULT_DASHBOARD_IDENTITY.showNumbers,
    showIcons: DEFAULT_DASHBOARD_IDENTITY.showIcons,
    items: Object.fromEntries(DASHBOARD_LABELS.map((dashboard) => [
      dashboard,
      { ...DEFAULT_DASHBOARD_IDENTITY.items[dashboard] }
    ]))
  };
}

function normalizeIconSource(value) {
  const source = String(value || "").trim();
  return ICON_ALIASES[source] || source;
}

function normalizeDashboardIdentity(value) {
  const defaults = cloneDefaultDashboardIdentity();
  const displayMode = value?.displayMode === "icons" || value?.showIcons === true
    ? "icons"
    : "numbers";
  return {
    displayMode,
    showNumbers: displayMode === "numbers",
    showIcons: displayMode === "icons",
    items: Object.fromEntries(DASHBOARD_LABELS.map((dashboard) => {
      const current = value?.items?.[dashboard] || value?.[dashboard] || {};
      const fallback = defaults.items[dashboard];
      const label = String(current.label || fallback.label).trim() || fallback.label;
      const icon = normalizeIconSource(current.icon || fallback.icon) || fallback.icon;
      return [dashboard, { ...fallback, label, icon }];
    }))
  };
}

function loadDashboardIdentity() {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_IDENTITY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const normalized = normalizeDashboardIdentity(parsed);
    if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      window.localStorage.setItem(DASHBOARD_IDENTITY_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return cloneDefaultDashboardIdentity();
  }
}

function saveDashboardIdentity(identity = state.dashboardIdentity) {
  window.localStorage.setItem(DASHBOARD_IDENTITY_KEY, JSON.stringify(normalizeDashboardIdentity(identity)));
}

function normalizeTracker(tracker, dashboard, index, fallbackType = "Thought") {
  const rawId = String(tracker?.id || `${dashboard.toLowerCase()}-tracker-${index}-${makeId("tracker")}`);
  const id = TRACKER_ID_MIGRATIONS[rawId] || rawId;
  const rawLabel = String(tracker?.label || "").trim() || `${fallbackType} ${index + 1}`;
  const migration = TRACKER_LABEL_MIGRATIONS[id];
  const label = migration?.from.includes(rawLabel) ? migration.to : rawLabel;
  const icon = normalizeIconSource(tracker?.icon || tracker?.source || tracker?.url || "tabler:circle") || "tabler:circle";
  return {
    id,
    label,
    icon
  };
}

function normalizeGoalTracker(goal, dashboard, index) {
  const normalized = normalizeTracker(goal, dashboard, index, "Goal");
  return {
    ...normalized,
    enabled: typeof goal?.enabled === "boolean" ? goal.enabled : true
  };
}

function normalizeTrackerSettings(value) {
  const defaults = cloneDefaultTrackers();
  return Object.fromEntries(DASHBOARD_LABELS.map((dashboard) => {
    const trackers = Array.isArray(value?.[dashboard])
      ? value[dashboard].map((tracker, index) => normalizeTracker(tracker, dashboard, index))
      : defaults[dashboard];
    return [dashboard, trackers];
  }));
}

function normalizeGoalSettings(value) {
  const defaults = cloneDefaultGoals();
  return Object.fromEntries(DASHBOARD_LABELS.map((dashboard) => {
    const normalizedGoals = Array.isArray(value?.[dashboard])
      ? value[dashboard].map((goal, index) => normalizeGoalTracker(goal, dashboard, index))
      : defaults[dashboard];
    const defaultIds = new Set((DEFAULT_GOALS[dashboard] || []).map((goal) => goal.id));
    const allDefaultGoals = normalizedGoals.length > 0 && normalizedGoals.every((goal) => defaultIds.has(goal.id));
    const goals = allDefaultGoals && !normalizedGoals.some((goal) => goal.enabled)
      ? normalizedGoals.map((goal) => ({ ...goal, enabled: true }))
      : normalizedGoals;
    return [dashboard, goals];
  }));
}

function loadTrackerSettings() {
  try {
    const raw = window.localStorage.getItem(TRACKER_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const normalized = parsed ? normalizeTrackerSettings(parsed) : cloneDefaultTrackers();
    if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      window.localStorage.setItem(TRACKER_SETTINGS_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return cloneDefaultTrackers();
  }
}

function saveTrackerSettings() {
  window.localStorage.setItem(TRACKER_SETTINGS_KEY, JSON.stringify(state.trackerSettings));
}

function loadGoalSettings() {
  try {
    const raw = window.localStorage.getItem(GOAL_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const normalized = parsed ? normalizeGoalSettings(parsed) : cloneDefaultGoals();
    if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      window.localStorage.setItem(GOAL_SETTINGS_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return cloneDefaultGoals();
  }
}

function saveGoalSettings() {
  window.localStorage.setItem(GOAL_SETTINGS_KEY, JSON.stringify(state.goalSettings));
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
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampSidebarWidth(width)));
  } catch {
    // Width persistence is a convenience; resizing should keep working if storage is blocked.
  }
}

function normalizeTheme(value) {
  return normalizeThemeSelection(value, {
    themes: APP_THEMES,
    fallbackId: "default"
  });
}

function loadTheme() {
  return loadThemeSelection({
    storageKey: THEME_KEY,
    themes: APP_THEMES,
    fallbackId: "default"
  });
}

function saveTheme(theme) {
  return saveThemeSelection(theme, {
    storageKey: THEME_KEY,
    themes: APP_THEMES,
    fallbackId: "default"
  });
}

function loadDismissedTips() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DISMISSED_TIPS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveDismissedTips(tips = state.dismissedTips) {
  window.localStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify(Array.from(new Set(tips || []))));
}

function clearDismissedTips() {
  try {
    window.localStorage.removeItem(DISMISSED_TIPS_KEY);
  } catch {
    // Tip dismissal state is optional; reset should continue if storage is blocked.
  }
  state.dismissedTips = [];
}

function applyThemeVariables(themeId) {
  return applyThemeSystemVariables(themeId, {
    themes: APP_THEMES,
    fontSets: THEME_FONT_SETS,
    fallbackId: "default",
    target: app
  });
}

function themeFontLabel(theme) {
  return themeSystemFontLabel(theme, {
    fontSets: THEME_FONT_SETS,
    fallbackFontSet: "classic"
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
    const parsed = JSON.parse(window.localStorage.getItem(ICONIFY_SEARCH_CACHE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveIconifySearchCache(cache) {
  try {
    window.localStorage.setItem(ICONIFY_SEARCH_CACHE_KEY, JSON.stringify(cache));
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
    lastCompletedHours: 0
  };
}

function createDefaultBodyTracker() {
  const timers = Object.fromEntries(
    BODY_TIMER_MODES
      .filter((config) => config.stateKey !== "fast")
      .map((config) => [config.stateKey, createDefaultBodyTimer(config)])
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
      note: ""
    },
    workouts: []
  };
}

function normalizeBodyTimer(value, config) {
  const defaults = createDefaultBodyTimer(config);
  return {
    ...defaults,
    ...(value || {}),
    label: String(value?.label || defaults.label),
    targetHours: Math.max(1 / 60, Number(value?.targetHours ?? defaults.targetHours) || defaults.targetHours),
    active: Boolean(value?.active),
    startTimestamp: value?.startTimestamp || null,
    lastCompletedHours: Math.max(0, Number(value?.lastCompletedHours) || 0)
  };
}

function normalizeBodyTracker(value) {
  const defaults = createDefaultBodyTracker();
  const timers = { ...defaults.timers };
  BODY_TIMER_MODES
    .filter((config) => config.stateKey !== "fast")
    .forEach((config) => {
      timers[config.stateKey] = normalizeBodyTimer(value?.timers?.[config.stateKey], config);
    });
  return {
    ...defaults,
    ...(value || {}),
    fast: normalizeBodyTimer(value?.fast, BODY_TIMER_MODES[0]),
    timers,
    nutrition: { ...defaults.nutrition, ...(value?.nutrition || {}) },
    workouts: Array.isArray(value?.workouts) ? value.workouts : []
  };
}

function loadBodyTracker() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BODY_TRACKER_KEY));
    if (!parsed?.fast || !parsed?.nutrition) return createDefaultBodyTracker();
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
  window.localStorage.setItem(BODY_TRACKER_KEY, JSON.stringify(state.bodyTracker));
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
  window.localStorage.setItem(SPIRIT_PROGRESS_KEY, JSON.stringify(state.spiritProgress));
}

function currentTimestampLabel() {
  return new Date().toLocaleString();
}

function nowIso() {
  return new Date().toISOString();
}

function initialMenuOpen() {
  return false;
}

function isInstalledWebApp() {
  return Boolean(window.matchMedia?.(INSTALLED_APP_QUERY).matches || window.navigator?.standalone === true);
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
  if (!media) return;
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
    projects: []
  };
}

function normalizeLifeAttachments(attachments) {
  return Array.isArray(attachments)
    ? attachments.filter((item) => item?.id).map((item) => ({
        id: item.id,
        name: item.name || item.id,
        type: item.type || "application/octet-stream",
        size: Number(item.size) || 0,
        created: item.created || nowIso(),
        storage: item.storage || "indexeddb",
        futureStoragePath: item.futureStoragePath || `life-attachments/${item.id}`
      }))
    : [];
}

function normalizeLifeAssignment(dateKey, status) {
  const value = dateKey ? dateKeyFromValue(dateKey) : "";
  if (!value || status === "complete") return value;
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
    edited: todo?.edited || created
  };
}

function normalizeLifeTask(task) {
  const status = ["todo", "active", "waiting", "complete"].includes(task?.status) ? task.status : "todo";
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
    edited: task?.edited || created
  };
}

function normalizeLifePhase(phase) {
  const status = ["planned", "active", "waiting", "complete"].includes(phase?.status) ? phase.status : "planned";
  const created = phase?.created || nowIso();
  return {
    id: phase?.id || makeId("phase"),
    title: phase?.title || "Untitled phase",
    status,
    assignedTo: phase?.assignedTo || "",
    assignedDate: normalizeLifeAssignment(phase?.assignedDate, status),
    notes: phase?.notes || "",
    attachments: normalizeLifeAttachments(phase?.attachments),
    tasks: Array.isArray(phase?.tasks) ? phase.tasks.map(normalizeLifeTask) : [],
    created,
    edited: phase?.edited || created
  };
}

function normalizeLifeProject(project) {
  const status = ["planned", "active", "waiting", "complete"].includes(project?.status) ? project.status : "planned";
  const created = project?.created || nowIso();
  return {
    id: project?.id || makeId("project"),
    title: project?.title || "Untitled project",
    status,
    assignedTo: project?.assignedTo || "",
    assignedDate: normalizeLifeAssignment(project?.assignedDate, status),
    notes: project?.notes || "",
    attachments: normalizeLifeAttachments(project?.attachments),
    phases: Array.isArray(project?.phases) ? project.phases.map(normalizeLifePhase) : [],
    created,
    edited: project?.edited || created
  };
}

function normalizeLifePlanner(planner) {
  return {
    schemaVersion: 1,
    todos: Array.isArray(planner?.todos) ? planner.todos.map(normalizeLifeTodo) : [],
    projects: Array.isArray(planner?.projects) ? planner.projects.map(normalizeLifeProject) : []
  };
}

function saveLifePlannerStore(planner) {
  window.localStorage.setItem(LIFE_PLANNER_KEY, JSON.stringify(planner));
}

function loadLifePlanner() {
  try {
    const raw = window.localStorage.getItem(LIFE_PLANNER_KEY);
    const parsed = raw ? JSON.parse(raw) : createDefaultLifePlanner();
    const normalized = normalizeLifePlanner(parsed);
    if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) saveLifePlannerStore(normalized);
    return normalized;
  } catch {
    return createDefaultLifePlanner();
  }
}

async function exportAppState() {
  return {
    bodyTracker: state.bodyTracker || createDefaultBodyTracker(),
    spiritProgress: state.spiritProgress || {},
    lifePlanner: normalizeLifePlanner(state.lifePlanner || createDefaultLifePlanner()),
    thoughtSettings: normalizeTrackerSettings(state.trackerSettings || cloneDefaultTrackers()),
    goalSettings: normalizeGoalSettings(state.goalSettings || cloneDefaultGoals()),
    dashboardIdentity: normalizeDashboardIdentity(state.dashboardIdentity || cloneDefaultDashboardIdentity()),
    theme: normalizeTheme(state.theme),
    localFiles: await exportLocalFiles().catch(() => [])
  };
}

async function restoreImportedAppState(appState) {
  if (!appState) return;
  const bodyTracker = appState?.bodyTracker
    ? normalizeBodyTracker(appState.bodyTracker)
    : createDefaultBodyTracker();
  const spiritProgress = appState?.spiritProgress && typeof appState.spiritProgress === "object"
    ? appState.spiritProgress
    : {};
  const lifePlanner = normalizeLifePlanner(appState?.lifePlanner || createDefaultLifePlanner());
  const trackerSettings = normalizeTrackerSettings(appState?.thoughtSettings || appState?.trackerSettings || cloneDefaultTrackers());
  const goalSettings = normalizeGoalSettings(appState?.goalSettings || appState?.goals || cloneDefaultGoals());
  const dashboardIdentity = normalizeDashboardIdentity(appState?.dashboardIdentity || cloneDefaultDashboardIdentity());
  const theme = normalizeTheme(appState?.theme || state.theme);

  state.bodyTracker = bodyTracker;
  state.spiritProgress = spiritProgress;
  state.lifePlanner = lifePlanner;
  state.trackerSettings = trackerSettings;
  state.goalSettings = goalSettings;
  state.dashboardIdentity = dashboardIdentity;
  state.theme = theme;
  saveBodyTracker();
  saveSpiritProgress();
  saveLifePlannerStore(lifePlanner);
  saveTrackerSettings();
  saveGoalSettings();
  saveDashboardIdentity(dashboardIdentity);
  saveTheme(theme);
  if (Array.isArray(appState.localFiles)) {
    await importLocalFiles(appState.localFiles);
  }
}

function hasStoredAppState() {
  return Boolean(
    window.localStorage.getItem(BODY_TRACKER_KEY)
    || window.localStorage.getItem(SPIRIT_PROGRESS_KEY)
    || window.localStorage.getItem(LIFE_PLANNER_KEY)
    || window.localStorage.getItem(TRACKER_SETTINGS_KEY)
    || window.localStorage.getItem(GOAL_SETTINGS_KEY)
    || window.localStorage.getItem(DASHBOARD_IDENTITY_KEY)
    || window.localStorage.getItem(THEME_KEY)
  );
}

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
  dismissedTips: loadDismissedTips(),
  dashboardIdentity: loadDashboardIdentity(),
  trackerAddArea: "",
  trackerEditKey: "",
  trackerDeleteKey: "",
  suppressNextTrackerEditClick: false,
  iconPicker: null,
  iconSearchCache: loadIconifySearchCache(),
  iconSearchInFlight: {},
  thoughtToast: null,
  thoughtCooldowns: {},
  thoughtCreateLocks: {},
  dashboardPeriod: "day",
  dashboardPeriodGlowUntil: 0,
  dashboardChartType: "pie",
  bodyTracker: loadBodyTracker(),
  trackerSettings: loadTrackerSettings(),
  goalSettings: loadGoalSettings(),
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
    Life: false
  },
  sidebarPages: {},
  trackerPages: {}
};

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeyFromValue(value) {
  if (!value) return todayDateKey();
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return todayDateKey();
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
  return new Intl.DateTimeFormat(undefined, options.weekday ? {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: options.year ? "numeric" : undefined
  } : {
    month: "short",
    day: "numeric",
    year: options.year ? "numeric" : undefined
  }).format(date);
}

function formatEventTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function daysBetween(dateKey, compareKey = todayDateKey()) {
  const date = new Date(`${dateKey}T12:00:00`);
  const compare = new Date(`${compareKey}T12:00:00`);
  return Math.floor((compare - date) / 86400000);
}

function dashboardPeriodOption(period) {
  return DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period) || DASHBOARD_PERIOD_OPTIONS[0];
}

function dashboardPeriodIndex(period) {
  const index = DASHBOARD_PERIOD_OPTIONS.findIndex((option) => option.id === period);
  return index >= 0 ? index : 0;
}

function dashboardPeriodOptionForIndex(index) {
  const nextIndex = Number.isFinite(Number(index))
    ? Math.min(Math.max(Math.round(Number(index)), 0), DASHBOARD_PERIOD_OPTIONS.length - 1)
    : 0;
  return DASHBOARD_PERIOD_OPTIONS[nextIndex];
}

function eventIsInPeriod(event, period) {
  const age = daysBetween(event.dateKey);
  const option = dashboardPeriodOption(period);
  return age >= 0 && age < option.days;
}

function itemDateKey(item) {
  const value = item?.properties?.dateKey ||
    item?.dateKey ||
    item?.properties?.goalLoggedAt ||
    item?.properties?.thoughtLoggedAt ||
    activityTimestamp(item);
  return value ? dateKeyFromValue(value) : "";
}

function itemIsInPeriod(item, period) {
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
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => ` data-${key}="${escapeHtml(value)}"`)
      .join("")
    : "";
  return `<button class="icon-button page-action-button${options.danger ? " danger-button" : ""}${options.className ? ` ${escapeHtml(options.className)}` : ""}" data-action="${escapeHtml(action)}"${dataAttrs} type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"${options.disabled ? " disabled" : ""}>${iconHtml(icon)}</button>`;
}

function dashboardIdentityItem(dashboard) {
  return normalizeDashboardIdentity(state.dashboardIdentity).items[dashboard] || DEFAULT_DASHBOARD_IDENTITY.items[dashboard];
}

function dashboardDisplayLabel(dashboard) {
  return dashboardIdentityItem(dashboard)?.label || dashboard;
}

function dashboardDisplayIcon(dashboard) {
  return dashboardIdentityItem(dashboard)?.icon || DEFAULT_DASHBOARD_IDENTITY.items[dashboard]?.icon || "tabler:circle";
}

function dashboardDisplayNumber(dashboard) {
  return dashboardIdentityItem(dashboard)?.number || DEFAULT_DASHBOARD_IDENTITY.items[dashboard]?.number || "";
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
    parts.push(`<span class="dashboard-card-number">${escapeHtml(dashboardDisplayNumber(dashboard))}</span>`);
  }
  const labelParts = [];
  if (state.dashboardIdentity?.showIcons) {
    labelParts.push(`<span class="dashboard-card-icon">${iconHtml(dashboardDisplayIcon(dashboard))}</span>`);
  }
  const displayLabel = dashboardDisplayLabel(dashboard).toUpperCase();
  const overflowCount = Math.max(0, displayLabel.length - 10);
  const fontSize = Math.max(0.62, 1.12 - (overflowCount * 0.055));
  labelParts.push(`<span class="dashboard-card-name" style="font-size: ${fontSize.toFixed(3)}rem;">${escapeHtml(displayLabel)}</span>`);
  parts.push(`<span class="dashboard-card-label">${labelParts.join("")}</span>`);
  return parts.join("");
}

function dashboardInlineLabelHtml(dashboard) {
  const parts = [];
  if (state.dashboardIdentity?.showNumbers) parts.push(`<span>${escapeHtml(dashboardDisplayNumber(dashboard))}</span>`);
  if (state.dashboardIdentity?.showIcons) parts.push(iconHtml(dashboardDisplayIcon(dashboard)));
  parts.push(`<span>${escapeHtml(dashboardDisplayLabel(dashboard))}</span>`);
  return parts.join("");
}

function dashboardHeaderTitleHtml(dashboard) {
  return `<span class="dashboard-header-title">${dashboardInlineLabelHtml(dashboard)}</span>`;
}

function isImageIconSource(value) {
  return /^(https?:\/\/|data:image\/|blob:|\/|\.\.?\/)[^"'<>]+$/i.test(String(value || "").trim());
}

function sanitizeSvgText(value) {
  const source = String(value || "").trim();
  if (!/^<svg[\s>]/i.test(source) || source.length > 16000) return "";
  try {
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    if (doc.querySelector("parsererror") || doc.documentElement?.tagName?.toLowerCase() !== "svg") return "";
    doc.querySelectorAll("script, foreignObject, iframe, object, embed").forEach((element) => element.remove());
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
  return sanitized ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(sanitized)}` : "";
}

function trackerIconHtml(source) {
  const value = String(source || "").trim();
  if (/^<svg[\s>]/i.test(value)) {
    const dataUrl = svgIconDataUrl(value);
    if (dataUrl) return `<img class="tracker-orb-image" src="${escapeHtml(dataUrl)}" alt="">`;
  }
  if (isImageIconSource(value)) {
    return `<img class="tracker-orb-image" src="${escapeHtml(value)}" alt="">`;
  }
  return iconHtml(value || "tabler:circle");
}

function iconDisplayName(icon) {
  const value = normalizeIconSource(icon);
  if (!value) return "Pick icon";
  if (/^<svg[\s>]/i.test(value) || isImageIconSource(value)) return "Custom";
  return iconifyIconLabel(value) || value;
}

function iconPickerFieldHtml({
  fieldId,
  value,
  title,
  color = "var(--accent)",
  previewId = "",
  showLabel = true
}) {
  const icon = normalizeIconSource(value) || "tabler:circle";
  const label = iconDisplayName(icon);
  const triggerText = showLabel ? `<span class="icon-picker-trigger-label">${escapeHtml(label)}</span>` : "";
  return `
    <input class="icon-picker-input" id="${escapeHtml(fieldId)}" type="hidden" value="${escapeHtml(icon)}">
    <button class="icon-picker-trigger" data-action="open-icon-picker" data-icon-field="${escapeHtml(fieldId)}" data-icon-title="${escapeHtml(title || "Choose icon")}" data-icon-color="${escapeHtml(color)}"${previewId ? ` data-icon-preview="${escapeHtml(previewId)}"` : ""} type="button" aria-label="${escapeHtml(`Choose icon: ${label}`)}" title="${escapeHtml(`Choose icon: ${label}`)}" style="--icon-picker-color: ${escapeHtml(color)};">
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
      id: parts.slice(2).join(":")
    };
  }
  return {
    kind: "thought",
    area: parts[0] || "",
    id: parts[1] || ""
  };
}

function iconifySearchKey(query, limit = 7) {
  return `${String(query || "").trim().toLowerCase()}|${limit}|${ICONIFY_PREFIXES}`;
}

function normalizeIconifyIcon(value) {
  return normalizeIconSource(String(value || "").trim());
}

function iconifyIconLabel(icon) {
  return normalizeIconifyIcon(icon).replace(/^[^:]+:/, "");
}

function iconSuggestionsForLabel(label, limit = 7) {
  const query = String(label || "").trim();
  if (query.length < 3) return [];
  return (state.iconSearchCache?.[iconifySearchKey(query, limit)] || [])
    .slice(0, limit)
    .map((icon) => ({ icon: normalizeIconifyIcon(icon) }));
}

function firstIconSuggestion(label, fallback = "tabler:circle") {
  return iconSuggestionsForLabel(label, 1)[0]?.icon || fallback;
}

async function searchIconifyIcons(label, limit = 7) {
  const query = String(label || "").trim();
  if (query.length < 3) return [];
  const cacheKey = iconifySearchKey(query, limit);
  if (Array.isArray(state.iconSearchCache?.[cacheKey])) return state.iconSearchCache[cacheKey];
  if (state.iconSearchInFlight[cacheKey]) return state.iconSearchInFlight[cacheKey];

  const params = new URLSearchParams({
    query,
    limit: String(Math.max(32, limit)),
    prefixes: ICONIFY_PREFIXES
  });
  state.iconSearchInFlight[cacheKey] = fetch(`${ICONIFY_SEARCH_URL}?${params.toString()}`)
    .then((response) => {
      if (!response.ok) throw new Error(`Iconify search failed (${response.status}).`);
      return response.json();
    })
    .then((payload) => {
      const icons = Array.isArray(payload.icons)
        ? payload.icons.map(normalizeIconifyIcon).filter(Boolean).slice(0, Math.max(32, limit))
        : [];
      state.iconSearchCache = {
        ...(state.iconSearchCache || {}),
        [cacheKey]: icons
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
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const selected = normalizeIconSource(state.iconPicker?.selected || "");
  const withSelected = (icons) => {
    const unique = [...new Set(icons.map(normalizeIconifyIcon).filter(Boolean))];
    if (selected && !unique.includes(selected) && (!normalizedQuery || selected.toLowerCase().includes(normalizedQuery))) {
      unique.unshift(selected);
    }
    return unique.slice(0, limit);
  };
  if (!normalizedQuery) return withSelected(ICON_PICKER_DEFAULT_ICONS);
  if (normalizedQuery.length < 3) {
    return withSelected(ICON_PICKER_DEFAULT_ICONS
      .filter((icon) => icon.toLowerCase().includes(normalizedQuery))
    );
  }
  return withSelected(state.iconSearchCache?.[iconifySearchKey(normalizedQuery, limit)] || []);
}

function iconPickerGridHtml() {
  const picker = state.iconPicker;
  if (!picker) return "";
  const selected = normalizeIconSource(picker.selected || "tabler:circle");
  const query = String(picker.query || "").trim();
  const limit = Math.max(ICON_PICKER_PAGE_SIZE, Number(picker.limit) || ICON_PICKER_PAGE_SIZE);
  const icons = iconPickerSearchResults(query, limit);
  const isSearchable = query.length >= 3;
  const isSearching = isSearchable && Boolean(state.iconSearchInFlight?.[iconifySearchKey(query, limit)]);
  const emptyText = query.length && query.length < 3
    ? "Type at least 3 letters to search more icons."
    : isSearching
      ? "Loading icons..."
      : "No icons found yet.";
  return `
    <div class="icon-picker-grid" role="listbox" aria-label="Icon choices">
      ${icons.length ? icons.map((icon) => `
        <button class="icon-picker-option${selected === icon ? " is-selected" : ""}" data-action="select-icon-picker-icon" data-icon="${escapeHtml(icon)}" type="button" role="option" aria-selected="${selected === icon ? "true" : "false"}" title="${escapeHtml(icon)}">
          <span class="icon-picker-option-symbol" aria-hidden="true">${trackerIconHtml(icon)}</span>
          <span>${escapeHtml(iconDisplayName(icon))}</span>
        </button>
      `).join("") : `<div class="icon-picker-empty">${escapeHtml(emptyText)}</div>`}
    </div>
    <button class="secondary-button icon-picker-load-more" data-action="load-more-icon-picker" type="button"${query.length && query.length < 3 ? " disabled" : ""}>
      ${buttonContent("tabler:plus", "Load More")}
    </button>
  `;
}

function iconPickerOverlayHtml() {
  const picker = state.iconPicker;
  if (!picker) return "";
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
          <button class="icon-button icon-picker-close" data-action="close-icon-picker" type="button" aria-label="Exit icon picker" title="Exit">${iconHtml("tabler:x")}</button>
        </header>
        <label class="icon-picker-search">
          <span>Search</span>
          <input data-icon-picker-search type="search" value="${escapeHtml(picker.query || "")}" placeholder="brain, calendar, prayer, run">
        </label>
        <div class="icon-picker-results" data-icon-picker-results>
          ${iconPickerGridHtml()}
        </div>
        <footer class="icon-picker-actions">
          <button class="secondary-button" data-action="close-icon-picker" type="button">${buttonContent("tabler:x", "Cancel")}</button>
          <button class="primary-button" data-action="save-icon-picker" type="button">${buttonContent("tabler:device-floppy", "Save")}</button>
        </footer>
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
      loggedProp: "goalLoggedAt"
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
      loggedProp: "thoughtLoggedAt"
    };
}

function trackerSettingsForKind(kind) {
  return trackerKind(kind) === "goal" ? state.goalSettings : state.trackerSettings;
}

function saveTrackerSettingsForKind(kind) {
  if (trackerKind(kind) === "goal") saveGoalSettings();
  else saveTrackerSettings();
}

function normalizeTrackerSettingsForKind(kind, settings) {
  return trackerKind(kind) === "goal"
    ? normalizeGoalSettings(settings)
    : normalizeTrackerSettings(settings);
}

function trackerAddKey(area, kind = "thought") {
  return `${trackerKind(kind)}:${area}`;
}

function isTrackerAddOpen(area, kind = "thought") {
  const key = state.trackerAddArea || "";
  return key === trackerAddKey(area, kind) || (trackerKind(kind) === "thought" && key === area);
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
      loggedProp: "thoughtLoggedAt"
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
    const thoughtTrackers = trackerSettingsForKind("thought")?.[dashboard] || [];
    const goalTrackers = trackerSettingsForKind("goal")?.[dashboard] || [];
    const enabledGoals = goalTrackers.filter((goal) => goal?.enabled);
    entries = [
      ...thoughtTrackers.map((tracker) => ({ ...tracker, trackerKind: "thought" })),
      ...enabledGoals.map((goal) => ({ ...goal, trackerKind: "goal" }))
    ];
    reorderEnabled = entries.length >= maxVisibleOrbs;
  } else {
    const allTrackers = trackerSettingsForKind(normalizedKind)?.[dashboard] || [];
    entries = normalizedKind === "goal"
      ? (allTrackers.filter((tracker) => tracker?.enabled))
      : allTrackers;
    if (editable) {
      entries = [...allTrackers, { id: "__add__", label: config.addTooltip, icon: "tabler:plus", isAdd: true }];
    }
    maxPage = Math.max(0, Math.ceil(entries.length / TRACKER_ORBS_PER_PAGE) - 1);
    page = trackerPage(dashboard, editable, maxPage, kind);
  }
  const visibleEntries = isCombined
    ? (reorderEnabled ? entries : entries.slice(0, maxVisibleOrbs))
    : entries.slice(page * TRACKER_ORBS_PER_PAGE, (page + 1) * TRACKER_ORBS_PER_PAGE);
  if (!editable && !visibleEntries.length) return "";
  return `
    <section class="tracker-strip${compact ? " tracker-strip--compact" : ""}${editable ? " is-editable" : ""}" aria-label="${escapeHtml(dashboard)} ${escapeHtml(config.plural)}" style="--thought-color: ${DASHBOARD_COLORS[dashboard] || DASHBOARD_COLORS.Mind};">
      ${stripLabel ? `<div class="tracker-strip-heading">${stripIcon ? `${iconHtml(stripIcon)} ` : ""}<span>${escapeHtml(stripLabel)}</span></div>` : ""}
      <div class="tracker-orb-row${isCombined ? " tracker-orb-row--combined" : ""}${reorderEnabled ? " is-reorder-enabled" : ""}" data-kind="${isCombined ? "combined" : kind}" data-area="${escapeHtml(dashboard)}" data-tracker-combined="${isCombined ? "true" : "false"}" data-tracker-draggable="${reorderEnabled ? "true" : "false"}"${editable || reorderEnabled ? ` data-tracker-reorder-row data-kind="${isCombined ? "combined" : kind}" data-area="${escapeHtml(dashboard)}"` : ""}>
        ${visibleEntries.map((tracker) => tracker.isAdd ? `
          <span class="tracker-orb-wrap">
            <button class="tracker-orb tracker-orb--add" data-action="start-add-tracker" data-kind="${kind}" data-area="${escapeHtml(dashboard)}" data-thought-tooltip="${escapeHtml(config.addTooltip)}" type="button" aria-label="Add ${escapeHtml(dashboard)} ${escapeHtml(config.noun)}">
              ${iconHtml("tabler:plus")}
            </button>
          </span>
        ` : trackerOrbHtml(dashboard, tracker, editable, tracker.trackerKind || kind, reorderEnabled)).join("")}
      </div>
      ${maxPage > 0 ? `
        <div class="tracker-page-controls" aria-label="${escapeHtml(dashboard)} ${escapeHtml(config.noun)} pages">
          <button data-action="tracker-page" data-kind="${kind}" data-area="${escapeHtml(dashboard)}" data-direction="prev" data-max-page="${maxPage}" data-editable="${editable ? "true" : "false"}" type="button" aria-label="Previous ${escapeHtml(dashboard)} ${escapeHtml(config.plural)}"${page <= 0 ? " disabled" : ""}>${iconHtml("tabler:chevron-left")}</button>
          <span>${page + 1} / ${maxPage + 1}</span>
          <button data-action="tracker-page" data-kind="${kind}" data-area="${escapeHtml(dashboard)}" data-direction="next" data-max-page="${maxPage}" data-editable="${editable ? "true" : "false"}" type="button" aria-label="Next ${escapeHtml(dashboard)} ${escapeHtml(config.plural)}"${page >= maxPage ? " disabled" : ""}>${iconHtml("tabler:chevron-right")}</button>
        </div>
      ` : ""}
    </section>
  `;
}

function trackerTooltipLabel(dashboard, tracker, kind = "thought") {
  if (trackerKind(kind) !== "goal") return tracker.label;
  const count = goalProgressCount(dashboard, tracker.id);
  return count ? `${tracker.label} / ${count} check${count === 1 ? "" : "s"}` : tracker.label;
}

function trackerOrbHtml(dashboard, tracker, editable = false, kind = "thought", allowReorder = false) {
  const resolvedKind = tracker?.trackerKind || kind;
  const normalizedKind = trackerKind(resolvedKind);
  const config = trackerKindConfig(normalizedKind);
  const cooldownRemaining = editable ? 0 : thoughtCooldownRemaining(dashboard, tracker.id, normalizedKind);
  const isCooling = cooldownRemaining > 0;
  const isEnabled = normalizedKind !== "goal" || tracker?.enabled;
  const isEditing = state.trackerEditKey === trackerEditKey(dashboard, tracker.id, normalizedKind);
  const actionAttrs = editable
    ? ` data-action="start-edit-tracker" data-kind="${normalizedKind}" data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"`
    : isEnabled
      ? ` data-action="${normalizedKind === "goal" ? "quick-goal" : "quick-thought"}" data-kind="${normalizedKind}" data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"`
      : "";
  const tooltip = normalizedKind === "goal" && !tracker?.enabled
    ? "Enable this orb in settings to log progress"
    : trackerTooltipLabel(dashboard, tracker, normalizedKind);
  const isDraggable = editable || allowReorder;
  return `
    <span class="tracker-orb-wrap"${isDraggable ? ` data-tracker-orb-wrap data-kind="${normalizedKind}" data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"` : ""}>
      <button class="tracker-orb${isCooling ? " is-cooling" : ""}${isEditing ? " is-editing" : ""}${isEnabled ? "" : " is-disabled"}" type="button"${actionAttrs} data-thought-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`${dashboardDisplayLabel(dashboard)} ${config.noun}: ${tracker.label}`)}"${isCooling || (!isEnabled && !editable) ? " disabled" : ""}>
        ${isCooling ? `<span class="tracker-cooldown-pie" aria-hidden="true"${thoughtCooldownPieStyle(cooldownRemaining)}></span>` : ""}
        <span class="tracker-orb-icon">${trackerIconHtml(tracker.icon)}</span>
      </button>
    </span>
  `;
}

function hasDashboardOrbs(dashboard) {
  const thoughtTrackers = trackerSettingsForKind("thought")?.[dashboard] || [];
  const enabledGoals = (trackerSettingsForKind("goal")?.[dashboard] || []).filter((goal) => goal?.enabled);
  return thoughtTrackers.length > 0 || enabledGoals.length > 0;
}

function dashboardOrbNavHtml(dashboard) {
  if (!hasDashboardOrbs(dashboard)) return "";
  return `
    <div class="dashboard-orb-nav" aria-label="${escapeHtml(dashboardDisplayLabel(dashboard))} orbs">
      ${trackerStripHtml(dashboard, { combined: true, label: "", icon: "tabler:planet" })}
    </div>
  `;
}

function trackerFieldId(area, field) {
  return `tracker-${String(area).toLowerCase()}-${field}`;
}

function addTracker(area, kind = "thought") {
  if (!DASHBOARD_LABELS.includes(area)) return;
  const normalizedKind = trackerKind(kind);
  const config = trackerKindConfig(normalizedKind);
  const label = document.getElementById(trackerFieldId(area, "label"))?.value.trim();
  const iconInput = document.getElementById(trackerFieldId(area, "icon"))?.value.trim();
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
        ...(normalizedKind === "goal" ? { enabled: true } : {})
      }
    ]
  };
  if (normalizedKind === "goal") state.goalSettings = normalizeGoalSettings(next);
  else state.trackerSettings = normalizeTrackerSettings(next);
  saveTrackerSettingsForKind(normalizedKind);
  setState({ trackerAddArea: "", trackerEditKey: "", trackerDeleteKey: "" });
}

function updateTracker(area, id, kind = "thought", options = {}) {
  if (!DASHBOARD_LABELS.includes(area) || !id) return;
  const closeEditor = options.close !== false;
  const silent = Boolean(options.silent);
  const normalizedKind = trackerKind(kind);
  const config = trackerKindConfig(normalizedKind);
  const label = document.getElementById(trackerFieldId(`${area}-${id}`, "label"))?.value.trim();
  const iconInput = document.getElementById(trackerFieldId(`${area}-${id}`, "icon"))?.value.trim();
  const isGoal = normalizedKind === "goal";
  const enabledInput = isGoal ? document.getElementById(trackerFieldId(`${area}-${id}`, "enabled")) : null;
  const currentSettings = trackerSettingsForKind(normalizedKind);
  const current = (currentSettings?.[area] || []).find((tracker) => tracker.id === id);
  if (!current || !label) {
    if (!silent) window.alert(config.emptyNameAlert);
    return;
  }
  const icon = iconInput || firstIconSuggestion(label, current.icon || "tabler:circle");
  const next = {
    ...currentSettings,
    [area]: (currentSettings?.[area] || []).map((tracker) => (
      tracker.id === id
        ? {
          ...tracker,
          label,
          icon,
          ...(isGoal ? { enabled: Boolean(enabledInput?.checked) } : {})
        }
        : tracker
    ))
  };
  if (normalizedKind === "goal") state.goalSettings = normalizeGoalSettings(next);
  else state.trackerSettings = normalizeTrackerSettings(next);
  saveTrackerSettingsForKind(normalizedKind);
  if (closeEditor) setState({ trackerEditKey: "", trackerDeleteKey: "" });
}

function reorderTracker(area, trackerId, targetIndex, kind = "thought") {
  if (!DASHBOARD_LABELS.includes(area)) return false;
  const normalizedKind = trackerKind(kind);
  const currentSettings = trackerSettingsForKind(normalizedKind);
  const trackers = currentSettings?.[area] || [];
  const fromIndex = trackers.findIndex((tracker) => tracker.id === trackerId);
  if (fromIndex < 0) return false;

  const nextTrackers = [...trackers];
  const [movedTracker] = nextTrackers.splice(fromIndex, 1);
  const nextIndex = Math.min(Math.max(targetIndex, 0), nextTrackers.length);
  nextTrackers.splice(nextIndex, 0, movedTracker);
  if (nextTrackers.map((tracker) => tracker.id).join("|") === trackers.map((tracker) => tracker.id).join("|")) return false;

  const next = {
    ...currentSettings,
    [area]: nextTrackers
  };
  if (normalizedKind === "goal") state.goalSettings = normalizeGoalSettings(next);
  else state.trackerSettings = normalizeTrackerSettings(next);
  saveTrackerSettingsForKind(normalizedKind);
  setState({ trackerEditKey: "", trackerDeleteKey: "", trackerAddArea: "" });
  return true;
}

function removeTracker(area, id, kind = "thought") {
  if (!DASHBOARD_LABELS.includes(area) || !id) return;
  const normalizedKind = trackerKind(kind);
  const currentSettings = trackerSettingsForKind(normalizedKind);
  const next = {
    ...currentSettings,
    [area]: (currentSettings?.[area] || []).filter((tracker) => tracker.id !== id)
  };
  if (normalizedKind === "goal") state.goalSettings = normalizeGoalSettings(next);
  else state.trackerSettings = normalizeTrackerSettings(next);
  saveTrackerSettingsForKind(normalizedKind);
  setState({
    trackerAddArea: state.trackerAddArea === trackerAddKey(area, normalizedKind) ? "" : state.trackerAddArea,
    trackerEditKey: state.trackerEditKey === trackerEditKey(area, id, normalizedKind) ? "" : state.trackerEditKey,
    trackerDeleteKey: state.trackerDeleteKey === trackerEditKey(area, id, normalizedKind) ? "" : state.trackerDeleteKey
  });
}

function thoughtCooldownKey(area, id, kind = "thought") {
  return `${trackerKind(kind)}:${area}:${id}`;
}

function thoughtCooldownRemaining(area, id, kind = "thought") {
  const endTime = state.thoughtCooldowns?.[thoughtCooldownKey(area, id, kind)] || 0;
  return Math.max(0, endTime - Date.now());
}

function thoughtCooldownPieStyle(remaining) {
  const remainingMs = Math.max(0, Math.ceil(Number(remaining) || 0));
  const angle = Math.max(0, Math.min(360, (remainingMs / THOUGHT_COOLDOWN_MS) * 360));
  return ` style="--cooldown-start-angle: ${angle.toFixed(3)}deg; --cooldown-duration: ${remainingMs}ms;"`;
}

function thoughtTimestampLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return currentTimestampLabel();
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function thoughtDateInputValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayDateKey();
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
  const dateValue = document.getElementById("thought-toast-date")?.value || thoughtDateInputValue(state.thoughtToast?.timestamp);
  const timeValue = document.getElementById("thought-toast-time")?.value || thoughtTimeInputValue(state.thoughtToast?.timestamp);
  const date = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(date.getTime()) ? state.thoughtToast?.timestamp || nowIso() : date.toISOString();
}

function trackerKindForNote(note) {
  return note?.properties?.role === "goal-progress" ? "goal" : "thought";
}

function thoughtNoteWithTimestamp(note, timestamp) {
  const date = new Date(timestamp);
  if (!note || Number.isNaN(date.getTime())) return note;
  const kind = trackerKindForNote(note);
  const config = trackerKindConfig(kind);
  const label = note.properties?.[config.labelProp] || state.thoughtToast?.label || note.title;
  const dateKey = dateKeyFromDate(date);
  const title = kind === "goal"
    ? `${label} Progress ${formatEventTime(timestamp) || thoughtTimestampLabel(timestamp)}`
    : `${label} ${formatEventTime(timestamp) || thoughtTimestampLabel(timestamp)}`;
  const timestampLine = `${config.timestampVerb}: ${thoughtTimestampLabel(timestamp)}`;
  const markerPattern = new RegExp(`${config.timestampVerb}: .*`);
  const body = markerPattern.test(String(note.body || ""))
    ? String(note.body || "").replace(markerPattern, timestampLine)
    : `${String(note.body || "").trimEnd()}\n${timestampLine}`;
  const audit = Array.isArray(note.properties?.audit) ? note.properties.audit : [];
  return {
    ...note,
    title,
    body,
    created: timestamp,
    properties: {
      ...(note.properties || {}),
      dateKey,
      [config.loggedProp]: timestamp,
      audit: audit.map((entry) => entry.action === "created"
        ? { ...entry, at: timestamp, title, dateKey }
        : entry)
    }
  };
}

function scheduleThoughtToastFade(toast = state.thoughtToast, delay = 3500) {
  window.clearTimeout(thoughtToastFadeTimer);
  window.clearTimeout(thoughtToastHideTimer);
  if (!toast) return;
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
  return Boolean(toast && (toast.contains(document.activeElement) || toast.matches(":hover")));
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
  if (!(active instanceof HTMLInputElement) || !active.id.startsWith("thought-toast-")) return null;
  return {
    id: active.id,
    start: active.type === "text" ? active.selectionStart : null,
    end: active.type === "text" ? active.selectionEnd : null
  };
}

function restoreThoughtToastFocus(focusState) {
  if (!focusState) return;
  const input = document.getElementById(focusState.id);
  if (!(input instanceof HTMLInputElement)) return;
  input.focus({ preventScroll: true });
  if (input.type === "text" && typeof focusState.start === "number" && typeof focusState.end === "number") {
    input.setSelectionRange(focusState.start, focusState.end);
  }
  pauseThoughtToastFade();
}

function clearThoughtToast() {
  window.clearTimeout(thoughtToastFadeTimer);
  window.clearTimeout(thoughtToastHideTimer);
  state.thoughtToast = null;
  render();
}

function submitThoughtToastNote(noteId, text) {
  const body = String(text || "").trim();
  if (!body || !noteId || !state.artifactStore) return;
  const current = findArtifact(state.artifactStore, noteId);
  if (!current) return;
  const now = nowIso();
  const timestamp = thoughtTimestampFromToastControls();
  const adjusted = thoughtNoteWithTimestamp(current, timestamp);
  const kind = trackerKindForNote(adjusted);
  const config = trackerKindConfig(kind);
  const entry = `- ${thoughtTimestampLabel(timestamp)}: ${body}`;
  persistArtifactStore(upsertArtifact(state.artifactStore, {
    ...adjusted,
    body: `${String(adjusted.body || "").trimEnd()}\n\n${entry}`.trim(),
    edited: now,
    properties: {
      ...(adjusted.properties || {}),
      quickNotes: [
        ...((adjusted.properties?.quickNotes || []).slice(-20)),
        { at: timestamp, body }
      ],
      audit: [
        ...((adjusted.properties?.audit || []).slice(-20)),
        {
          at: timestamp,
          action: "quick-note",
          title: adjusted.title,
          dateKey: dateKeyFromValue(timestamp),
          [config.labelProp]: adjusted.properties?.[config.labelProp] || ""
        }
      ]
    }
  }));
  clearThoughtToast();
}

function applyThoughtToastTimestamp(noteId) {
  if (!noteId || !state.artifactStore) return;
  const current = findArtifact(state.artifactStore, noteId);
  if (!current) return;
  persistArtifactStore(upsertArtifact(state.artifactStore, {
    ...thoughtNoteWithTimestamp(current, thoughtTimestampFromToastControls()),
    edited: nowIso()
  }));
}

function deleteThoughtToastNote(noteId) {
  if (!noteId || !state.artifactStore) return;
  const note = findArtifact(state.artifactStore, noteId);
  if (!note) {
    clearThoughtToast();
    return;
  }
  persistArtifactStore(removeArtifact(state.artifactStore, noteId));
  window.clearTimeout(thoughtToastFadeTimer);
  window.clearTimeout(thoughtToastHideTimer);
  setState({
    thoughtToast: null,
    selectedArtifactId: state.selectedArtifactId === noteId ? null : state.selectedArtifactId,
    artifactMode: state.selectedArtifactId === noteId ? "grid" : state.artifactMode,
    artifactReturnActive: state.selectedArtifactId === noteId ? "" : state.artifactReturnActive
  });
}

function launchGoalBurst(triggerElement, color = DASHBOARD_COLORS.Mind) {
  if (!(triggerElement instanceof HTMLElement)) return;
  const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  const rect = triggerElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const burst = document.createElement("span");
  burst.className = "goal-confetti-burst";
  if (reducedMotion) burst.classList.add("is-reduced-motion");
  burst.style.left = `${rect.left + rect.width / 2}px`;
  burst.style.top = `${rect.top + rect.height / 2}px`;
  burst.style.setProperty("--goal-color", color || DASHBOARD_COLORS.Mind);
  const particles = 12;
  for (let index = 0; index < particles; index += 1) {
    const particle = document.createElement("i");
    const angle = (Math.PI * 2 * index) / particles;
    const distance = (reducedMotion ? 14 : 22) + (index % 4) * (reducedMotion ? 3 : 7);
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
  if (!state.artifactStore) return [];
  return rootNotesForDashboard(state.artifactStore, area)
    .filter((note) => note.properties?.role === "goal-progress")
    .filter((note) => !goalId || note.properties?.goalId === goalId);
}

function goalProgressCount(area, goalId = "") {
  return goalProgressArtifacts(area, goalId).length;
}

function quickTrackerEntry(area, id, kind = "thought", triggerElement = null) {
  if (!state.artifactStore || !DASHBOARD_LABELS.includes(area)) return;
  const normalizedKind = trackerKind(kind);
  const config = trackerKindConfig(normalizedKind);
  const cooldownKey = thoughtCooldownKey(area, id, normalizedKind);
  const tracker = (trackerSettingsForKind(normalizedKind)?.[area] || []).find((item) => item.id === id);
  if (!tracker || (normalizedKind === "goal" && !tracker.enabled)) return;
  if (thoughtCooldownRemaining(area, id, normalizedKind) > 0 || state.thoughtCreateLocks[cooldownKey]) return;
  if (normalizedKind === "goal") launchGoalBurst(triggerElement, DASHBOARD_COLORS[area]);
  state.thoughtCreateLocks = {
    ...state.thoughtCreateLocks,
    [cooldownKey]: true
  };
  const now = nowIso();
  const title = normalizedKind === "goal"
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
      ""
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
          [config.labelProp]: tracker.label
        }
      ]
    },
    analysis: {}
  };
  state.thoughtCooldowns = {
    ...state.thoughtCooldowns,
    [cooldownKey]: Date.now() + THOUGHT_COOLDOWN_MS
  };
  persistArtifactStore(upsertArtifact(state.artifactStore, note));
  const { [cooldownKey]: _created, ...nextCreateLocks } = state.thoughtCreateLocks;
  state.thoughtCreateLocks = nextCreateLocks;
  const progressCount = normalizedKind === "goal" ? goalProgressCount(area, tracker.id) : 0;
  showThoughtToast({
    kind: normalizedKind,
    noteId: note.id,
    dashboard: area,
    label: tracker.label,
    timestamp: now,
    metric: normalizedKind === "goal"
      ? `${progressCount} check${progressCount === 1 ? "" : "s"}`
      : ""
  });
  window.setTimeout(() => {
    if (state.thoughtCooldowns[cooldownKey] <= Date.now()) {
      const { [cooldownKey]: _expired, ...nextCooldowns } = state.thoughtCooldowns;
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
  const freeSites = "site:gutenberg.org OR site:gutenberg.net.au OR site:gutenberg.ca OR site:archive.org OR site:wikisource.org OR site:fadedpage.com OR site:standardebooks.org OR site:freeread.de";
  const buySites = "site:amazon.com OR site:ebay.com OR site:abebooks.com OR site:barnesandnoble.com OR site:thriftbooks.com OR site:bookshop.org";
  const outlineSites = "site:sparknotes.com OR site:litcharts.com OR site:gradesaver.com OR site:cliffsnotes.com OR site:shmoop.com OR site:wikipedia.org OR site:britannica.com OR site:plato.stanford.edu";
  const links = [
    ["Wikipedia", "tabler:brand-wikipedia", `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(spiritLookupQuery(work))}`],
    ["WikiSearch", "tabler:world-search", `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(spiritLookupQuery(work, "summary analysis themes"))}`],
    ["Search", "tabler:search", duckDuckGoUrl(spiritLookupQuery(work))],
    ["Videos", "tabler:player-play", duckDuckGoUrl(spiritLookupQuery(work, "lecture documentary analysis"), "&iax=videos&ia=videos")],
    ["Audiobooks", "tabler:headphones", duckDuckGoUrl(`"${title}" ${author} public domain audiobook site:librivox.org OR site:archive.org OR site:gutenberg.org`)],
    ["Free Online", "tabler:external-link", duckDuckGoUrl(`"${title}" ${author} (${freeSites})`)],
    ["Buy Book", "tabler:shopping-bag", duckDuckGoUrl(`"${title}" ${author} (${buySites})`)],
    ["Goodreads", "tabler:book-2", `https://www.goodreads.com/search?q=${encodeURIComponent(spiritLookupQuery(work))}`],
    ["Outlines", "tabler:list-details", duckDuckGoUrl(`"${title}" ${author} (${outlineSites})`)],
    ["Biography", "tabler:user", duckDuckGoUrl(`"${author}" biography life history documentary lecture video`)],
    ["Context", "tabler:world", duckDuckGoUrl(`"${author}" historical context era time period contemporaries influences philosophy culture`)]
  ];

  return `
    <section class="spirit-lookup-bar" aria-label="Book lookup links">
      ${links.map(([label, icon, href]) => `
        <a class="spirit-lookup-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
          ${buttonContent(icon, label)}
        </a>
      `).join("")}
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
  if (!text) return fallback;
  return text.length > 46 ? `${text.slice(0, 43)}...` : text;
}

function lastAuditEntry(item) {
  const audit = item?.properties?.audit;
  return Array.isArray(audit) && audit.length ? audit[audit.length - 1] : null;
}

function activityTimestamp(item) {
  return lastAuditEntry(item)?.at ||
    item?.properties?.goalLoggedAt ||
    item?.properties?.completedAt ||
    item?.properties?.startedAt ||
    item?.properties?.stoppedAt ||
    item?.edited ||
    item?.created ||
    "";
}

function activityTime(item) {
  const timestamp = activityTimestamp(item);
  if (!timestamp) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(timestamp))) {
    return new Date(`${timestamp}T12:00:00`).getTime() || 0;
  }
  return Date.parse(timestamp) || 0;
}

function createdTime(item) {
  const timestamp = item?.created || item?.properties?.createdAt || "";
  if (!timestamp) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(timestamp))) {
    return new Date(`${timestamp}T12:00:00`).getTime() || 0;
  }
  return Date.parse(timestamp) || 0;
}

function newestCreatedFirst(items) {
  return [...items].sort((a, b) => {
    const timeDiff = createdTime(b) - createdTime(a);
    if (timeDiff) return timeDiff;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}

function newestActivityFirst(items) {
  return [...items].sort((a, b) => {
    const timeDiff = activityTime(b) - activityTime(a);
    if (timeDiff) return timeDiff;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}

function latestByActivity(items) {
  return [...items].sort((a, b) => {
    return activityTime(b) - activityTime(a);
  })[0] || null;
}

function formatActivityTimestamp(value) {
  if (!value) return "Not started";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDateLabel(text, { year: true });
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function latestDashboardArtifact(dashboard) {
  return latestByActivity((state.artifactStore?.artifacts || []).filter((artifact) =>
    artifact.dashboard === dashboard &&
    ["note", "compendium", "reading-plan-item"].includes(artifact.type)
  ));
}

function dashboardFlipRows(label) {
  if (label === "Mind") {
    const latestCompendium = latestByActivity(state.compendiums);
    const latestSection = latestByActivity(state.compendiums.flatMap((compendium) =>
      (Array.isArray(compendium.sections) ? compendium.sections : [])
        .map((section) => ({ ...section, compendiumTitle: compendium.title }))
    ));
    const latest = latestSection || latestCompendium;
    return [
      ["What", latest ? shortSummary(latest.title) : "No compendium yet"],
      ["Where", latest?.compendiumTitle ? shortSummary(latest.compendiumTitle) : dashboardDisplayLabel("Mind")],
      ["When", formatActivityTimestamp(activityTimestamp(latest))]
    ];
  }

  if (label === "Body") {
    const latestNote = latestDashboardArtifact("Body");
    const latestWorkout = latestByActivity(state.bodyTracker.workouts);
    const latest = latestByActivity([latestNote, latestWorkout].filter(Boolean));
    return [
      ["What", latest ? shortSummary(latest.title) : `No ${dashboardDisplayLabel("Body").toLowerCase()} log yet`],
      ["Detail", latest?.minutes ? `${latest.type || "Workout"} / ${latest.minutes} min` : shortSummary(latest?.body, state.bodyTracker.fast.active ? `Fasting ${formatDuration(getFastElapsedMs())}` : `${Math.round(Number(state.bodyTracker.nutrition.calories) || 0)} cal today`)],
      ["When", formatActivityTimestamp(activityTimestamp(latest))]
    ];
  }

  if (label === "Spirit") {
    const latest = latestDashboardArtifact("Spirit");
    const fallbackWork = spiritWorks().find((work) => work.year === state.spiritYear) || spiritWorks()[0];
    const work = latest || fallbackWork;
    return [
      ["What", work ? shortSummary(work.title) : "No reading yet"],
      ["Who", work?.author || "No author"],
      ["When", latest ? formatActivityTimestamp(activityTimestamp(latest)) : work ? `Year ${work.year}` : "Not started"]
    ];
  }

  const latestNote = latestDashboardArtifact("Life");
  return [
    ["What", latestNote ? shortSummary(latestNote.title) : `No ${dashboardDisplayLabel("Life").toLowerCase()} note yet`],
    ["Detail", latestNote ? shortSummary(latestNote.body) : "Add a note"],
    ["When", formatActivityTimestamp(activityTimestamp(latestNote))]
  ];
}

function dashboardCardBackHtml(label) {
  return `
    <span class="dashboard-card-back">
      ${dashboardFlipRows(label).map(([key, value]) => `
        <span class="dashboard-card-row"><em>${escapeHtml(key)}</em><strong>${escapeHtml(value)}</strong></span>
      `).join("")}
      <span class="dashboard-card-open">press again to open</span>
    </span>
  `;
}

function noteWordCount(body) {
  return (cleanSummaryText(body).match(/\b[\w']+\b/g) || []).length;
}

function noteSentences(body) {
  return String(body || "").split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
}

function repeatedSentenceStarterCount(body) {
  const starts = noteSentences(body)
    .map((sentence) => sentence.match(/\b[\w']+\b/)?.[0]?.toLowerCase())
    .filter(Boolean);
  const counts = new Map();
  starts.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return Array.from(counts.values()).filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
}

function noteCommaCount(body) {
  return (String(body || "").match(/,/g) || []).length;
}

function noteDateLabel(note) {
  const value = note.properties?.dateKey || activityTimestamp(note);
  return value ? formatDateLabel(dateKeyFromValue(value), { year: true }) : "No date";
}

function noteSizeLabel(note) {
  const words = noteWordCount(note.body);
  return words >= 1000 ? `${Math.round(words / 100) / 10}k` : String(words);
}

function bodyMetaItems(note) {
  const body = String(note.body || "");
  const readValue = (label) => body.match(new RegExp(`- ${label}:\\s*([^\\n]+)`, "i"))?.[1]?.trim() || "";
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
      ["Words", noteSizeLabel(note)]
    ];
  }
  return [
    ["Cal", calories || "-"],
    ["Protein", protein || "-"],
    ["Words", noteSizeLabel(note)],
    ["Commas", String(noteCommaCount(note.body))]
  ];
}

function spiritMetaItems(note) {
  const planItemKey = note.properties?.planItemKey;
  const work = planItemKey ? spiritWorks().find((item) => item.key === planItemKey) : null;
  const year = note.properties?.year || work?.year || "-";
  const sameYear = work ? spiritWorks().filter((item) => item.year === work.year) : [];
  const sequence = note.properties?.order || (work ? sameYear.findIndex((item) => item.key === work.key) + 1 : "");
  const complete = planItemKey ? isSpiritComplete(planItemKey) : note.properties?.status === "complete";
  return [
    ["Year", String(year)],
    ["Seq", sequence ? String(sequence) : "-"],
    ["Status", complete ? "\u2713" : "\u25cb"],
    ["Words", noteSizeLabel(note)]
  ];
}

function lifeMetaItems(note) {
  const habits = Array.isArray(note.properties?.habits) ? note.properties.habits : [];
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
    Sleep: "\u263e"
  };
  const moodEmoji = {
    great: "\ud83d\ude00",
    good: "\ud83d\ude42",
    steady: "\ud83d\ude10",
    low: "\ud83d\ude41",
    hard: "!"
  };
  return [
    ["Habit", habitEmoji[habits[0]] || "\u2022"],
    ["Mood", moodEmoji[mood] || "\u2022"],
    ["Energy", energy ? energy.slice(0, 1).toUpperCase() : "-"],
    ["Words", noteSizeLabel(note)]
  ];
}

function noteMetaItems(note) {
  if (note.dashboard === "Mind") {
    return [
      ["Words", String(noteWordCount(note.body))],
      ["Sent", String(noteSentences(note.body).length)],
      ["Starts", String(repeatedSentenceStarterCount(note.body))],
      ["Commas", String(noteCommaCount(note.body))]
    ];
  }
  if (note.dashboard === "Body") return bodyMetaItems(note);
  if (note.dashboard === "Spirit") return spiritMetaItems(note);
  if (note.dashboard === "Life") return lifeMetaItems(note);
  return [
    ["Words", noteSizeLabel(note)],
    ["Sent", String(noteSentences(note.body).length)],
    ["Commas", String(noteCommaCount(note.body))],
    ["Type", note.type || "-"]
  ];
}

function compendiumSidebarArtifact(compendium) {
  const sectionBodies = Array.isArray(compendium.sections)
    ? compendium.sections.map((section) => section?.body || section?.content || "").filter(Boolean)
    : [];
  return {
    ...compendium,
    dashboard: "Mind",
    type: "compendium",
    body: [compendium.body, ...sectionBodies].filter(Boolean).join("\n\n"),
    properties: compendium.properties || {}
  };
}

function mindSidebarItems() {
  const quickNotes = rootNotesForDashboard(state.artifactStore, "Mind")
    .filter((note) => ["thought", "goal-progress"].includes(note.properties?.role));
  const sections = state.compendiums.flatMap((compendium) =>
    (compendium.sections || []).map((section) => ({
      ...section,
      dashboard: "Mind",
      type: "mind-section",
      parentId: compendium.id,
      compendiumTitle: compendium.title,
      properties: {
        ...(section.properties || {}),
        role: "compendium-section"
      }
    }))
  );
  return newestActivityFirst([...quickNotes, ...sections]);
}

function sidebarOrganizerHtml(item) {
  const metaItems = noteMetaItems(item).slice(0, 4);
  return `
    <span class="sidebar-item-organizer" aria-hidden="true">
      <span class="sidebar-item-date">${escapeHtml(noteDateLabel(item))}</span>
      <span class="sidebar-item-meta-grid">
        ${metaItems.map(([label, value]) => `
            <span class="sidebar-item-meta-cell">
              <em>${escapeHtml(label)}</em>
              <b>${escapeHtml(value)}</b>
            </span>
          `).join("")}
      </span>
    </span>
  `;
}

function sidebarItemHtml(item, options) {
  const number = Number(options.number) || 1;
  const typeClass = item.type === "compendium"
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

function getFastProgress() {
  return getBodyTimerProgress("fasting");
}

function getNutritionProgress() {
  const target = Math.max(1, Number(state.bodyTracker.nutrition.targetCalories) || 1);
  return Math.min(1, (Number(state.bodyTracker.nutrition.calories) || 0) / target);
}

function bodyTimerConfig(key = state.bodyTimerMode) {
  return BODY_TIMER_MODES.find((config) => config.key === key) || BODY_TIMER_MODES[0];
}

function bodyTimerState(key = state.bodyTimerMode) {
  const config = bodyTimerConfig(key);
  return config.stateKey === "fast"
    ? state.bodyTracker.fast
    : state.bodyTracker.timers?.[config.stateKey] || createDefaultBodyTimer(config);
}

function setBodyTimerState(key, timer) {
  const config = bodyTimerConfig(key);
  if (config.stateKey === "fast") {
    state.bodyTracker.fast = timer;
    return;
  }
  state.bodyTracker.timers = {
    ...(state.bodyTracker.timers || {}),
    [config.stateKey]: timer
  };
}

function getBodyTimerElapsedMs(key = state.bodyTimerMode) {
  const timer = bodyTimerState(key);
  const start = timer.startTimestamp;
  if (!timer.active || !start) return 0;
  return Math.max(0, Date.now() - start);
}

function getBodyTimerProgress(key = state.bodyTimerMode) {
  const timer = bodyTimerState(key);
  const targetMs = Math.max(1 / 60, Number(timer.targetHours) || 1) * 60 * 60 * 1000;
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
  const inputValue = numberFromInput(`body-timer-${key}-target`, bodyTimerTargetInputValue(key, fallback));
  return config.targetUnit === "minutes"
    ? Math.max(1, inputValue) / 60
    : Math.max(1, inputValue);
}

function selectedCompendium() {
  return state.compendiums.find((item) => item.id === state.selectedCompendiumId) || null;
}

function normalizeCompendiumSections(compendium) {
  if (!compendium) return compendium;
  const sections = Array.isArray(compendium.sections)
    ? compendium.sections
    : (Array.isArray(compendium.blocks) ? compendium.blocks : []);
  return { ...compendium, sections };
}

function normalizeCompendiums(compendiums) {
  return Array.isArray(compendiums) ? compendiums.map(normalizeCompendiumSections) : [];
}

function selectedSection() {
  const compendium = selectedCompendium();
  return compendium?.sections.find((section) => section.id === state.selectedSectionId) || null;
}

function spiritWorks() {
  const years = state.spiritPlan?.years || [];
  return years.flatMap((yearEntry) => {
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
          workIndex
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
          blackBox: work.black_box || null
        };
      })
    );
  }).sort((a, b) => a.year - b.year || a.order - b.order || a.title.localeCompare(b.title));
}

function spiritYears() {
  return (state.spiritPlan?.years || [])
    .map((entry) => Number(entry.year))
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);
}

function selectedSpiritBook() {
  return spiritWorks().find((work) => work.key === state.selectedSpiritBookKey) || null;
}

function spiritArtifactForKey(key) {
  return state.artifactStore?.artifacts.find((artifact) =>
    artifact.dashboard === "Spirit" &&
    artifact.properties?.role === "spirit-reading-plan-item" &&
    artifact.properties?.planItemKey === key
  ) || null;
}

function isSpiritComplete(key) {
  if (Object.prototype.hasOwnProperty.call(state.spiritProgress, key)) return Boolean(state.spiritProgress[key]);
  const artifact = spiritArtifactForKey(key);
  if (artifact) return Boolean(artifact.properties?.completed);
  return Boolean(state.spiritProgress[key]);
}

function spiritPlanLabel() {
  return SPIRIT_PLANS.find((entry) => entry.id === state.spiritPlanId)?.label || "Reading Plan";
}

function spiritNotes() {
  return state.artifactStore?.artifacts.filter((artifact) =>
    artifact.type === "note" &&
    artifact.dashboard === "Spirit"
  ) || [];
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
      "This record stores reading-plan metadata for dashboard analytics."
    ].filter(Boolean).join("\n"),
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
      sourcePlanUrl: SPIRIT_PLANS.find((entry) => entry.id === state.spiritPlanId)?.url || "",
      year: work.year,
      order: work.order,
      tier: work.tier,
      author: work.author,
      title: work.title,
      selection: work.selection,
      date: work.date ?? null,
      greatIdeas: work.greatIdeas,
      tags: work.tags
    },
    analysis: {
      ...(current?.analysis || {}),
      greatIdeas: work.greatIdeas,
      tags: work.tags,
      focus: Array.isArray(work.blackBox?.outputs) ? work.blackBox.outputs : []
    }
  };
}

function ensureSpiritReadingArtifact(work) {
  const current = spiritArtifactForKey(work.key);
  const payload = spiritReadingArtifactPayload(work, isSpiritComplete(work.key), current);
  persistArtifactStore(upsertArtifact(state.artifactStore, payload));
  return payload;
}

function setState(next) {
  Object.assign(state, next);
  render();
}

function isReady() {
  return Boolean(state.artifactStore);
}

function toggleSidebarSection(section) {
  setState({
    sidebarExpanded: {
      ...state.sidebarExpanded,
      [section]: !state.sidebarExpanded[section]
    }
  });
}

function toggleAllSidebarSections() {
  const labels = DASHBOARD_LABELS;
  const shouldExpand = !labels.every((label) => state.sidebarExpanded[label]);
  setState({
    sidebarExpanded: Object.fromEntries(labels.map((label) => [label, shouldExpand]))
  });
}

function setSidebarPage(section, direction, maxPage) {
  const current = state.sidebarPages[section] || 0;
  const nextPage = direction === "prev" ? current - 1 : current + 1;
  setState({
    sidebarPages: {
      ...state.sidebarPages,
      [section]: Math.min(Math.max(nextPage, 0), maxPage)
    }
  });
}

function trackerPageKey(dashboard, editable = false, kind = "thought") {
  return `${trackerKind(kind)}:${dashboard}:${editable ? "settings" : "quick"}`;
}

function trackerPage(dashboard, editable = false, maxPage = 0, kind = "thought") {
  const page = state.trackerPages?.[trackerPageKey(dashboard, editable, kind)] || 0;
  return Math.min(Math.max(page, 0), Math.max(0, maxPage));
}

function setTrackerPage(dashboard, direction, maxPage, editable = false, kind = "thought") {
  const current = trackerPage(dashboard, editable, maxPage, kind);
  const nextPage = direction === "prev" ? current - 1 : current + 1;
  setState({
    trackerPages: {
      ...(state.trackerPages || {}),
      [trackerPageKey(dashboard, editable, kind)]: Math.min(Math.max(nextPage, 0), Math.max(0, maxPage))
    }
  });
}

function reorderCombinedTrackers(area, trackerId, targetIndex) {
  if (!DASHBOARD_LABELS.includes(area) || !trackerId) return;
  const thoughtTrackers = [...((state.trackerSettings?.[area]) || [])];
  const goalTrackers = [...((state.goalSettings?.[area]) || [])];
  const enabledGoals = goalTrackers.filter((goal) => goal?.enabled);
  const disabledGoals = goalTrackers.filter((goal) => !goal?.enabled);
  const combinedTrackers = [
    ...thoughtTrackers.map((tracker) => ({ ...tracker, trackerKind: "thought" })),
    ...enabledGoals.map((goal) => ({ ...goal, trackerKind: "goal" }))
  ];
  const sourceIndex = combinedTrackers.findIndex((tracker) => tracker.id === trackerId);
  if (sourceIndex < 0) return;
  const resolvedTarget = Number.isFinite(Number(targetIndex)) ? Number(targetIndex) : 0;
  const clampedTarget = Math.min(Math.max(resolvedTarget, 0), combinedTrackers.length);
  if (sourceIndex === clampedTarget) return;
  const reordered = [...combinedTrackers];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(clampedTarget, 0, moved);

  const orderedThoughts = reordered
    .filter((tracker) => tracker.trackerKind === "thought")
    .map((tracker) => thoughtTrackers.find((entry) => entry.id === tracker.id))
    .filter(Boolean);
  const orderedThoughtIds = new Set(orderedThoughts.map((tracker) => tracker.id));
  const nextThoughts = [...orderedThoughts, ...thoughtTrackers.filter((tracker) => !orderedThoughtIds.has(tracker.id))];

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
      [area]: nextThoughts
    },
    goalSettings: {
      ...(state.goalSettings || {}),
      [area]: nextGoals
    }
  });
  saveTrackerSettings();
  saveGoalSettings();
}

function clampSidebarWidth(value) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(Number(value) || SIDEBAR_DEFAULT_WIDTH)));
}

function setSidebarWidth(width, options = {}) {
  const nextWidth = clampSidebarWidth(width);
  state.sidebarWidth = nextWidth;
  saveSidebarWidth(nextWidth);
  const workspace = app.querySelector(".workspace");
  if (workspace) workspace.style.setProperty("--sidebar-width", `${nextWidth}px`);
  const toggle = app.querySelector(".mobile-menu-toggle");
  if (toggle) toggle.style.transform = "";
  if (options.open) {
    state.mobileMenuOpen = true;
    if (workspace) workspace.classList.add("has-mobile-menu");
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
  if (!state.mobileMenuOpen) return false;
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
  if (!state.artifactStore) return;
  state.compendiums = normalizeCompendiums(state.compendiums);
  state.artifactStore = compendiumsToArtifactStore(state.compendiums, state.artifactStore);
  saveArtifactStore(state.artifactStore);
}

function persistArtifactStore(nextStore) {
  state.artifactStore = nextStore;
  state.compendiums = normalizeCompendiums(artifactStoreToCompendiums(nextStore));
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
  return lifeProjects().find((project) => project.id === state.selectedLifeProjectId) || null;
}

function selectedLifePhase(project = selectedLifeProject()) {
  return project?.phases?.find((phase) => phase.id === state.selectedLifePhaseId) || null;
}

function selectedLifeTask(phase = selectedLifePhase()) {
  return phase?.tasks?.find((task) => task.id === state.selectedLifeTaskId) || null;
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
        phaseTitle: phase.title
      }))
    )
  );
}

function lifeTodoTaskItems() {
  return lifeTodos().map((todo) => ({
    ...todo,
    source: "todo",
    todoId: todo.id,
    projectTitle: "",
    phaseTitle: ""
  }));
}

function lifeTaskItems() {
  return [...lifeTodoTaskItems(), ...lifeProjectTaskItems()];
}

function setLifeTool(tool) {
  const nextTool = ["todo", "projects", "calendar"].includes(tool) ? tool : "calendar";
  setState({
    lifeTool: nextTool,
    artifactMode: "grid",
    selectedArtifactId: null
  });
}

async function exportArtifacts() {
  if (!state.artifactStore) return;
  const dateKey = todayDateKey();
  const payload = JSON.stringify({
    ...state.artifactStore,
    appState: await exportAppState()
  }, null, 2);
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
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.artifacts)) {
        throw new Error("Import file must be an Ourstuff artifact export.");
      }
      const importedStore = {
        schemaVersion: parsed.schemaVersion,
        rootId: parsed.rootId || "ourstuff-root",
        artifacts: parsed.artifacts
      };
      persistArtifactStore(importedStore);
      await restoreImportedAppState(parsed.appState);
      setState({
        active: "Dashboard",
        flipped: null,
        mindMode: "grid",
        artifactMode: "grid",
        selectedCompendiumId: null,
        selectedSectionId: null,
        selectedArtifactId: null,
        selectedSpiritBookKey: null
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import data.");
    }
  });
  input.click();
}

async function clearAppData() {
  const confirmed = window.confirm("Clear everything from this browser, including the mock app data and dismissed tips? This cannot be undone unless you have an export.");
  if (!confirmed) return;
  const emptyStore = createEmptyStore();
  window.localStorage.removeItem(BODY_TRACKER_KEY);
  window.localStorage.removeItem(SPIRIT_PROGRESS_KEY);
  window.localStorage.removeItem(LIFE_PLANNER_KEY);
  window.localStorage.removeItem(TRACKER_SETTINGS_KEY);
  window.localStorage.removeItem(GOAL_SETTINGS_KEY);
  window.localStorage.removeItem(DASHBOARD_IDENTITY_KEY);
  window.localStorage.removeItem(SIDEBAR_WIDTH_KEY);
  window.localStorage.removeItem(THEME_KEY);
  window.localStorage.removeItem(ICONIFY_SEARCH_CACHE_KEY);
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
  state.theme = "default";
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
  saveTrackerSettings();
  saveGoalSettings();
  goHome();
}

async function restoreFactoryDefaults() {
  const confirmed = window.confirm("Restore factory defaults with the original mock data and show tips again? This replaces local app data unless you have an export.");
  if (!confirmed) return;
  const seedStore = await loadSeedStore();
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(BODY_TRACKER_KEY);
  window.localStorage.removeItem(SPIRIT_PROGRESS_KEY);
  window.localStorage.removeItem(LIFE_PLANNER_KEY);
  window.localStorage.removeItem(TRACKER_SETTINGS_KEY);
  window.localStorage.removeItem(GOAL_SETTINGS_KEY);
  window.localStorage.removeItem(DASHBOARD_IDENTITY_KEY);
  window.localStorage.removeItem(SIDEBAR_WIDTH_KEY);
  window.localStorage.removeItem(THEME_KEY);
  window.localStorage.removeItem(ICONIFY_SEARCH_CACHE_KEY);
  clearDismissedTips();
  await clearLocalFiles().catch(() => {});
  state.artifactStore = seedStore;
  state.compendiums = normalizeCompendiums(artifactStoreToCompendiums(seedStore));
  state.bodyTracker = createDefaultBodyTracker();
  state.spiritProgress = {};
  state.lifePlanner = createDefaultLifePlanner();
  state.trackerSettings = cloneDefaultTrackers();
  state.goalSettings = cloneDefaultGoals();
  state.dashboardIdentity = cloneDefaultDashboardIdentity();
  state.theme = "default";
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
  if (seedStore.appState) await restoreImportedAppState(seedStore.appState);
  saveArtifactStore(seedStore);
  saveDashboardIdentity(state.dashboardIdentity);
  saveTheme(state.theme);
  setState({
    active: "Dashboard",
    flipped: null,
    artifactStore: seedStore,
    compendiums: normalizeCompendiums(artifactStoreToCompendiums(seedStore)),
    dismissedTips: []
  });
}

async function refreshGalleryImages() {
  try {
    const images = await listLocalImages();
    setState({
      galleryImages: images,
      gallerySelectedIds: state.gallerySelectedIds.filter((id) => images.some((image) => image.id === id))
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
    gallerySelectedIds: []
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
    gallerySelectedIds: []
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
    selectedCompendiumId: section === "Mind" ? null : state.selectedCompendiumId,
    selectedSectionId: section === "Mind" ? null : state.selectedSectionId,
    selectedArtifactId: null,
    selectedSpiritBookKey: null
  });
}

function setSpiritYear(year) {
  setState({
    active: "Spirit",
    spiritYear: year,
    selectedSpiritBookKey: null,
    artifactMode: "grid",
    selectedArtifactId: null
  });
}

function openSpiritBook(key) {
  setState({
    active: "Spirit",
    selectedSpiritBookKey: key,
    selectedArtifactId: null,
    artifactMode: "grid"
  });
}

function exitSpiritBook() {
  setState({ selectedSpiritBookKey: null });
}

function toggleSpiritComplete(key) {
  const work = spiritWorks().find((entry) => entry.key === key);
  if (!work) return;
  const completed = !isSpiritComplete(key);

  state.spiritProgress = { ...state.spiritProgress, [key]: completed };
  saveSpiritProgress();
  render();
}

function addSpiritBookNote(key) {
  const work = spiritWorks().find((entry) => entry.key === key);
  if (!work || !state.artifactStore) return;
  const noteId = makeId("spirit-note");
  const focus = Array.isArray(work.blackBox?.outputs) ? work.blackBox.outputs : [];
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
      focus.length ? focus.map((item) => `- ${item}`).join("\n") : ""
    ].filter((line) => line !== null).join("\n"),
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
      tags: work.tags
    },
    analysis: {
      greatIdeas: work.greatIdeas,
      tags: work.tags,
      focus
    }
  };
  persistArtifactStore(upsertArtifact(state.artifactStore, note));
  setState({ selectedArtifactId: noteId, artifactMode: "editor" });
}

async function loadSpiritPlan(planId = state.spiritPlanId) {
  const plan = SPIRIT_PLANS.find((entry) => entry.id === planId) || SPIRIT_PLANS[0];
  state.spiritPlanId = plan.id;
  state.spiritPlan = null;
  state.spiritPlanError = "";
  try {
    const response = await fetch(plan.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load selected plan (${response.status}).`);
    const parsed = await response.json();
    if (!parsed || !Array.isArray(parsed.years)) throw new Error("Selected plan must include a years array.");
    state.spiritPlan = parsed;
    const years = spiritYears();
    state.spiritYear = years.includes(state.spiritYear) ? state.spiritYear : (years[0] || 1);
  } catch (error) {
    state.spiritPlanError = error instanceof Error ? error.message : "Unknown loading error.";
  }
  render();
}

function selectSpiritPlan(planId) {
  const plan = SPIRIT_PLANS.find((entry) => entry.id === planId);
  if (!plan || plan.id === state.spiritPlanId) return;
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
    mindMode: "manager"
  });
}

function compendiumReaderPage(compendium) {
  const maxPage = Math.max(0, (compendium?.sections?.length || 0));
  const page = state.compendiumReaderPages?.[compendium?.id] || 0;
  return Math.min(Math.max(page, 0), maxPage);
}

function setCompendiumReaderPage(compendiumId, direction, maxPage) {
  const current = state.compendiumReaderPages?.[compendiumId] || 0;
  const nextPage = direction === "prev" ? current - 1 : current + 1;
  setState({
    compendiumReaderPages: {
      ...state.compendiumReaderPages,
      [compendiumId]: Math.min(Math.max(nextPage, 0), Math.max(0, maxPage))
    }
  });
}

function mindCompendiumColumns() {
  if (window.matchMedia?.(COMPENDIUM_ONE_QUERY).matches) return 1;
  if (window.matchMedia?.(COMPENDIUM_TWO_QUERY).matches) return 2;
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

function mindCompendiumPage(maxPage = Math.max(0, Math.ceil(state.compendiums.length / mindCompendiumsPerPage()) - 1)) {
  return Math.min(Math.max(state.mindCompendiumPage || 0, 0), Math.max(0, maxPage));
}

function setMindCompendiumPage(direction, maxPage) {
  const current = mindCompendiumPage(maxPage);
  const nextPage = direction === "prev" ? current - 1 : current + 1;
  setState({
    mindCompendiumPage: Math.min(Math.max(nextPage, 0), Math.max(0, maxPage)),
    mindCompendiumPickerOpen: false
  });
}

function toggleMindCompendiumPicker() {
  setState({ mindCompendiumPickerOpen: !state.mindCompendiumPickerOpen });
}

function closeMindCompendiumPicker() {
  if (!state.mindCompendiumPickerOpen) return;
  setState({ mindCompendiumPickerOpen: false });
}

function selectMindCompendiumFromPicker(compendiumId, index, perPage) {
  setState({
    mindCompendiumPage: Math.floor(Math.max(0, index) / Math.max(1, perPage)),
    mindCompendiumPickerOpen: false
  });
  openCompendium(compendiumId);
}

function openMindSection(parentId, sectionId) {
  if (!parentId || !sectionId) return;
  const compendium = state.compendiums.find((item) => item.id === parentId);
  if (!compendium?.sections?.some((section) => section.id === sectionId)) return;
  setState({
    active: "Mind",
    selectedCompendiumId: parentId,
    selectedSectionId: sectionId,
    selectedArtifactId: null,
    mindMode: "section-viewer"
  });
}

function openActivityArtifact(id) {
  const artifact = findArtifact(state.artifactStore, id);
  if (!artifact) return;
  if (artifact.dashboard === "Mind" && artifact.type === "compendium") {
    openCompendium(id);
    return;
  }
  if (artifact.dashboard === "Mind" && artifact.type === "note" && artifact.parentId) {
    openMindSection(artifact.parentId, id);
    return;
  }
  if (artifact.type === "note" && !artifact.parentId) {
    openArtifactNote(id, "Life");
  }
}

function openArtifactNote(id, returnActive = "") {
  const artifact = findArtifact(state.artifactStore, id);
  if (!artifact) return;
  setState({
    active: returnActive || artifact.dashboard,
    selectedArtifactId: id,
    artifactMode: "viewer",
    artifactReturnActive: returnActive,
    selectedCompendiumId: null,
    selectedSectionId: null,
    selectedSpiritBookKey: null
  });
}

function closeArtifactViewer() {
  setState({
    active: state.artifactReturnActive || state.active,
    selectedArtifactId: null,
    artifactMode: "grid",
    artifactReturnActive: ""
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
    sections: []
  };
  state.compendiums = [...state.compendiums, next];
  persistCompendiums();
  setState({
    active: "Mind",
    selectedCompendiumId: next.id,
    selectedSectionId: null,
    mindMode: "compendium-editor"
  });
}

function saveCompendium(id, title, body) {
  const now = nowIso();
  state.compendiums = state.compendiums.map((item) =>
    item.id === id ? { ...item, title, body, edited: now } : item
  );
  persistCompendiums();
  setState({ mindMode: "manager" });
}

function deleteCompendium(id) {
  const compendium = state.compendiums.find((item) => item.id === id);
  if (!compendium) return;
  if (!window.confirm(`Delete compendium "${compendium.title}" and all of its sections?`)) return;

  state.compendiums = state.compendiums.filter((item) => item.id !== id);
  persistCompendiums();
  setState({
    selectedCompendiumId: null,
    selectedSectionId: null,
    mindMode: "grid"
  });
}

function addSection() {
  const compendium = selectedCompendium();
  if (!compendium) return;
  const now = nowIso();
  const nextSection = {
    id: makeId("section"),
    title: `Section ${compendium.sections.length + 1}`,
    body: "## New Section\n\nWrite the section body here.",
    created: now,
    edited: now
  };
  state.compendiums = state.compendiums.map((item) =>
    item.id === compendium.id
      ? { ...item, edited: now, sections: [...item.sections, nextSection] }
      : item
  );
  persistCompendiums();
  setState({ selectedSectionId: nextSection.id, mindMode: "section-editor" });
}

function saveSection(id, title, body) {
  const compendium = selectedCompendium();
  if (!compendium) return;
  const now = nowIso();
  state.compendiums = state.compendiums.map((item) =>
    item.id === compendium.id
      ? {
          ...item,
          edited: now,
          sections: item.sections.map((section) =>
            section.id === id ? { ...section, title, body, edited: now } : section
          )
        }
      : item
  );
  persistCompendiums();
  setState({ mindMode: "section-viewer" });
}

function deleteSection(id) {
  const compendium = selectedCompendium();
  const section = selectedSection();
  if (!compendium || !section) return;
  if (!window.confirm(`Delete section "${section.title}"?`)) return;

  const now = nowIso();
  state.compendiums = state.compendiums.map((item) =>
    item.id === compendium.id
      ? {
          ...item,
          edited: now,
          sections: item.sections.filter((entry) => entry.id !== id)
        }
      : item
  );
  persistCompendiums();
  setState({
    selectedSectionId: null,
    mindMode: "manager"
  });
}

function reorderCompendiumSection(compendiumId, sectionId, targetIndex) {
  let changed = false;
  state.compendiums = state.compendiums.map((compendium) => {
    if (compendium.id !== compendiumId) return compendium;
    const fromIndex = compendium.sections.findIndex((section) => section.id === sectionId);
    if (fromIndex < 0) return compendium;

    const sections = [...compendium.sections];
    const [movedSection] = sections.splice(fromIndex, 1);
    const nextIndex = Math.min(Math.max(targetIndex, 0), sections.length);
    if (nextIndex === fromIndex) return compendium;

    sections.splice(nextIndex, 0, movedSection);
    changed = true;
    return { ...compendium, sections };
  });
  return changed;
}

function touchCompendium(compendiumId) {
  const edited = nowIso();
  state.compendiums = state.compendiums.map((compendium) =>
    compendium.id === compendiumId ? { ...compendium, edited } : compendium
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
    body: isLife ? "" : `## New ${dashboardDisplayLabel(dashboard)} Note\n\nWrite the note here.`,
    created: now,
    edited: now,
    childIds: [],
    properties: isLife ? {
      role: "life-journal",
      status: "active",
      dateKey: todayDateKey(),
      mood: "steady",
      energy: "medium",
      habits: [],
      audit: [
        {
          at: now,
          action: "created",
          title: `New ${dashboardDisplayLabel(dashboard)} Note`,
          dateKey: todayDateKey()
        }
      ]
    } : {
      role: "dashboard-note",
      status: "active"
    },
    analysis: {}
  };
  persistArtifactStore(upsertArtifact(state.artifactStore, note));
  setState({ active: dashboard, selectedArtifactId: note.id, artifactMode: "editor", artifactReturnActive: "" });
}

function auditEntryForSave(current, title, body, properties = {}) {
  const changed = [];
  if (current.title !== title) changed.push("title");
  if (current.body !== body) changed.push("body");
  if (JSON.stringify(current.properties || {}) !== JSON.stringify({ ...(current.properties || {}), ...properties })) {
    changed.push("metadata");
  }
  return {
    at: nowIso(),
    action: current.properties?.audit?.length ? "edited" : "created",
    title,
    dateKey: properties.dateKey || current.properties?.dateKey || today,
    changed: changed.length ? changed : ["saved"]
  };
}

function saveDashboardNote(id, title, body) {
  const current = findArtifact(state.artifactStore, id);
  if (!current) return;
  if (current.dashboard === "Life") {
    saveLifeJournalNote(id);
    return;
  }
  const now = nowIso();
  persistArtifactStore(upsertArtifact(state.artifactStore, {
    ...current,
    title,
    body,
    edited: now,
    properties: {
      ...(current.properties || {}),
      audit: [
        ...((current.properties?.audit || []).slice(-20)),
        auditEntryForSave(current, title, body)
      ]
    }
  }));
  setState({ selectedArtifactId: id, artifactMode: "viewer" });
}

function saveLifeJournalNote(id) {
  const current = findArtifact(state.artifactStore, id);
  if (!current) return;
  const title = editorTitle();
  const body = editorBody();
  const dateKey = dateKeyFromValue(document.getElementById("life-entry-date")?.value);
  const mood = document.getElementById("life-entry-mood")?.value || "steady";
  const energy = document.getElementById("life-entry-energy")?.value || "medium";
  const habits = Array.from(document.querySelectorAll("[data-life-habit]:checked")).map((input) => input.value);
  const properties = {
    ...(current.properties || {}),
    role: "life-journal",
    status: "active",
    dateKey,
    mood,
    energy,
    habits
  };
  properties.audit = [
    ...((current.properties?.audit || []).slice(-20)),
    auditEntryForSave(current, title, body, properties)
  ];
  persistArtifactStore(upsertArtifact(state.artifactStore, {
    ...current,
    title,
    body,
    edited: nowIso(),
    properties
  }));
  setState({ selectedArtifactId: id, artifactMode: "viewer" });
}

function deleteDashboardNote(id) {
  const note = findArtifact(state.artifactStore, id);
  if (!note) return;
  if (!window.confirm(`Delete note "${note.title}"?`)) return;

  persistArtifactStore(removeArtifact(state.artifactStore, id));
  setState({
    selectedArtifactId: null,
    artifactMode: "grid",
    artifactReturnActive: ""
  });
}

function appendBodyLogNote(title, body, properties = {}) {
  if (!state.artifactStore) return;
  const now = nowIso();

  persistArtifactStore(upsertArtifact(state.artifactStore, {
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
      ...properties
    },
    analysis: {}
  }));
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
      dateKey: workout.dateKey || dateKeyFromValue(created)
    },
    analysis: {}
  };
}

function migrateBodyWorkoutsToNotes(store) {
  const workouts = Array.isArray(state.bodyTracker?.workouts) ? state.bodyTracker.workouts : [];
  if (!workouts.length) return store;
  const existingWorkoutIds = new Set(
    (store.artifacts || [])
      .map((artifact) => artifact.properties?.sourceWorkoutId)
      .filter(Boolean)
  );
  const migratedNotes = workouts
    .filter((workout) => workout?.id && !existingWorkoutIds.has(workout.id))
    .map(workoutLogNoteArtifact);
  state.bodyTracker = {
    ...state.bodyTracker,
    workouts: []
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
    label: document.getElementById(`body-timer-${key}-label`)?.value.trim() || timer.label || config.defaultLabel,
    targetHours: bodyTimerTargetHoursFromInput(key, timer)
  };
  setBodyTimerState(key, nextTimer);
  saveBodyTracker();
  appendBodyLogNote(
    `${config.label} settings saved`,
    `## ${config.label} settings\n\nSaved: ${currentTimestampLabel()}\n\n- Label: ${nextTimer.label}\n- Target: ${bodyTimerTargetInputValue(key, nextTimer)} ${config.targetUnit}`
  );
  render();
}

function startBodyTimer(key = state.bodyTimerMode) {
  const config = bodyTimerConfig(key);
  const timer = bodyTimerState(key);
  const nextTimer = {
    ...timer,
    label: document.getElementById(`body-timer-${key}-label`)?.value.trim() || timer.label || config.defaultLabel,
    targetHours: bodyTimerTargetHoursFromInput(key, timer),
    active: true,
    startTimestamp: Date.now()
  };
  setBodyTimerState(key, nextTimer);
  saveBodyTracker();
  appendBodyLogNote(
    `${config.shortLabel} started`,
    `## ${config.label} started\n\nStarted: ${currentTimestampLabel()}\n\n- Label: ${nextTimer.label}\n- Target: ${bodyTimerTargetInputValue(key, nextTimer)} ${config.targetUnit}`
  );
  render();
}

function stopBodyTimer(key = state.bodyTimerMode) {
  const config = bodyTimerConfig(key);
  const timer = bodyTimerState(key);
  const completedHours = getBodyTimerElapsedMs(key) / 3600000;
  const nextTimer = {
    ...timer,
    active: false,
    startTimestamp: null,
    lastCompletedHours: completedHours
  };
  setBodyTimerState(key, nextTimer);
  saveBodyTracker();
  appendBodyLogNote(
    `${config.shortLabel} stopped`,
    `## ${config.label} stopped\n\nStopped: ${currentTimestampLabel()}\n\n- Label: ${nextTimer.label}\n- Completed hours: ${completedHours.toFixed(1)}\n- Target: ${bodyTimerTargetInputValue(key, nextTimer)} ${config.targetUnit}`
  );
  render();
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
  const note = document.getElementById("body-nutrition-note")?.value.trim() || "";
  state.bodyTracker.nutrition = {
    ...state.bodyTracker.nutrition,
    dateKey: todayDateKey(),
    calories: Math.max(0, numberFromInput("body-calories", 0)),
    protein: Math.max(0, numberFromInput("body-protein", 0)),
    carbs: Math.max(0, numberFromInput("body-carbs", 0)),
    fat: Math.max(0, numberFromInput("body-fat", 0)),
    note
  };
  saveBodyTracker();
  appendBodyLogNote(
    "Nutrition logged",
    `## Nutrition log\n\nSaved: ${currentTimestampLabel()}\n\n- Calories: ${state.bodyTracker.nutrition.calories} / ${state.bodyTracker.nutrition.targetCalories}\n- Protein: ${state.bodyTracker.nutrition.protein}g / ${state.bodyTracker.nutrition.targetProtein}g\n- Carbs: ${state.bodyTracker.nutrition.carbs}g / ${state.bodyTracker.nutrition.targetCarbs}g\n- Fat: ${state.bodyTracker.nutrition.fat}g / ${state.bodyTracker.nutrition.targetFat}g${note ? `\n- Note: ${note}` : ""}`
  );
  render();
}

function resetBodyNutrition() {
  state.bodyTracker.nutrition = {
    ...createDefaultBodyTracker().nutrition,
    targetCalories: state.bodyTracker.nutrition.targetCalories,
    targetProtein: state.bodyTracker.nutrition.targetProtein,
    targetCarbs: state.bodyTracker.nutrition.targetCarbs,
    targetFat: state.bodyTracker.nutrition.targetFat
  };
  saveBodyTracker();
  appendBodyLogNote(
    "Nutrition reset",
    `## Nutrition reset\n\nSaved: ${currentTimestampLabel()}\n\n- Target calories: ${state.bodyTracker.nutrition.targetCalories}\n- Calories: ${state.bodyTracker.nutrition.calories}\n- Protein: ${state.bodyTracker.nutrition.protein}g\n- Carbs: ${state.bodyTracker.nutrition.carbs}g\n- Fat: ${state.bodyTracker.nutrition.fat}g`
  );
  render();
}

function saveBodyNutritionGoals() {
  state.bodyTracker.nutrition = {
    ...state.bodyTracker.nutrition,
    targetCalories: Math.max(1, numberFromInput("body-target-calories", state.bodyTracker.nutrition.targetCalories || 2000)),
    targetProtein: Math.max(0, numberFromInput("body-target-protein", state.bodyTracker.nutrition.targetProtein || 120)),
    targetCarbs: Math.max(0, numberFromInput("body-target-carbs", state.bodyTracker.nutrition.targetCarbs || 200)),
    targetFat: Math.max(0, numberFromInput("body-target-fat", state.bodyTracker.nutrition.targetFat || 70))
  };
  saveBodyTracker();
  appendBodyLogNote(
    "Nutrition goals saved",
    `## Nutrition goals\n\nSaved: ${currentTimestampLabel()}\n\n- Calories: ${state.bodyTracker.nutrition.targetCalories}\n- Protein: ${state.bodyTracker.nutrition.targetProtein}g\n- Carbs: ${state.bodyTracker.nutrition.targetCarbs}g\n- Fat: ${state.bodyTracker.nutrition.targetFat}g`
  );
  render();
}

function addBodyWorkout() {
  const title = document.getElementById("body-workout-title")?.value.trim() || "Workout";
  const type = document.getElementById("body-workout-type")?.value.trim() || "General";
  const minutes = Math.max(0, numberFromInput("body-workout-minutes", 0));
  const effort = Math.max(1, Math.min(10, numberFromInput("body-workout-effort", 5)));
  const notes = document.getElementById("body-workout-notes")?.value.trim() || "";

  const now = nowIso();
  appendBodyLogNote(
    `Workout: ${title}`,
    `## Workout log\n\nSaved: ${currentTimestampLabel()}\n\n- Name: ${title}\n- Type: ${type}\n- Minutes: ${minutes}\n- Effort: ${effort}/10${notes ? `\n- Notes: ${notes}` : ""}`,
    {
      sourceType: "workout",
      workoutType: type,
      workoutMinutes: minutes,
      workoutEffort: effort,
      dateKey: todayDateKey()
    }
  );
  render();
}

function deleteBodyWorkout(id) {
  const workout = state.bodyTracker.workouts.find((entry) => entry.id === id);
  state.bodyTracker.workouts = state.bodyTracker.workouts.filter((entry) => entry.id !== id);
  saveBodyTracker();
  if (workout) {
    appendBodyLogNote(
      "Workout deleted",
      `## Workout deleted\n\nSaved: ${currentTimestampLabel()}\n\n- Name: ${workout.title}\n- Type: ${workout.type}\n- Minutes: ${workout.minutes}\n- Effort: ${workout.effort}/10${workout.notes ? `\n- Notes: ${workout.notes}` : ""}`
    );
  }
  render();
}

function setBodyMode(mode) {
  const nextMode = mode === "fasting" ? "timers" : mode;
  setState({
    bodyMode: ["timers", "nutrition", "workout", "notes"].includes(nextMode) ? nextMode : "timers",
    artifactMode: "grid",
    selectedArtifactId: null
  });
}

function setBodyTimerMode(mode) {
  setState({
    bodyMode: "timers",
    bodyTimerMode: BODY_TIMER_MODES.some((config) => config.key === mode) ? mode : "fasting",
    artifactMode: "grid",
    selectedArtifactId: null
  });
}

function setBodyNutritionMode(mode) {
  setState({
    bodyMode: "nutrition",
    bodyNutritionMode: mode === "goals" ? "goals" : "daily",
    artifactMode: "grid",
    selectedArtifactId: null
  });
}

function setLifeMode(mode) {
  const nextMode = ["day", "week", "month", "list"].includes(mode) ? mode : "month";
  setState({
    lifeTool: "calendar",
    lifeMode: nextMode,
    artifactMode: "grid",
    selectedArtifactId: null
  });
}

function addLifeTodo() {
  const title = document.getElementById("life-todo-title")?.value.trim();
  if (!title) return;
  const now = nowIso();
  const todo = {
    id: makeId("todo"),
    title,
    notes: "",
    status: "todo",
    assignedDate: "",
    created: now,
    edited: now
  };
  persistLifePlanner({
    ...state.lifePlanner,
    todos: [todo, ...lifeTodos()]
  }, { lifeTool: "todo" });
}

function updateLifeTodo(id, updater) {
  const now = nowIso();
  persistLifePlanner({
    ...state.lifePlanner,
    todos: lifeTodos().map((todo) => todo.id === id ? { ...updater(todo), edited: now } : todo)
  }, { lifeTool: "todo" });
}

function updateLifeTaskById(projectId, phaseId, taskId, updater, nextState = {}) {
  const now = nowIso();
  persistLifePlanner({
    ...state.lifePlanner,
    projects: lifeProjects().map((project) => project.id === projectId
      ? {
          ...project,
          edited: now,
          phases: (project.phases || []).map((phase) => phase.id === phaseId
            ? {
                ...phase,
                edited: now,
                tasks: (phase.tasks || []).map((task) => task.id === taskId ? { ...updater(task), edited: now } : task)
              }
            : phase)
        }
      : project)
  }, { lifeTool: "todo", ...nextState });
}

function updateLifeTaskItem(task, updater, nextState = {}) {
  if (task.source === "todo") {
    updateLifeTodo(task.todoId, updater);
    return;
  }
  updateLifeTaskById(task.projectId, task.phaseId, task.taskId, updater, nextState);
}

function toggleLifeTodo(id) {
  updateLifeTodo(id, (todo) => ({
    ...todo,
    status: todo.status === "complete" ? "todo" : "complete"
  }));
}

function toggleLifeTaskItem(source, id, projectId = "", phaseId = "") {
  const task = source === "todo"
    ? lifeTodoTaskItems().find((item) => item.todoId === id)
    : lifeProjectTaskItems().find((item) => item.projectId === projectId && item.phaseId === phaseId && item.taskId === id);
  if (!task) return;
  updateLifeTaskItem(task, (item) => ({
    ...item,
    status: item.status === "complete" ? "todo" : "complete"
  }));
}

function deleteLifeTodo(id) {
  const todo = lifeTodos().find((item) => item.id === id);
  if (!todo) return;
  if (!window.confirm(`Delete todo "${todo.title}"?`)) return;
  persistLifePlanner({
    ...state.lifePlanner,
    todos: lifeTodos().filter((item) => item.id !== id)
  }, { lifeTool: "todo" });
}

function editLifeTaskNotes(source, id, projectId = "", phaseId = "") {
  const task = source === "todo"
    ? lifeTodoTaskItems().find((item) => item.todoId === id)
    : lifeProjectTaskItems().find((item) => item.projectId === projectId && item.phaseId === phaseId && item.taskId === id);
  if (!task) return;
  const notes = window.prompt(`Notes for "${task.title}"`, task.notes || "");
  if (notes === null) return;
  updateLifeTaskItem(task, (item) => ({ ...item, notes }));
}

function openLifeProjectTask(projectId, phaseId, taskId) {
  setState({
    lifeTool: "projects",
    selectedLifeProjectId: projectId,
    selectedLifePhaseId: phaseId,
    selectedLifeTaskId: taskId
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
  if (!title) return;
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
    edited: now
  };
  persistLifePlanner({
    ...state.lifePlanner,
    projects: [project, ...lifeProjects()]
  }, {
    lifeTool: "projects",
    selectedLifeProjectId: project.id,
    selectedLifePhaseId: null,
    selectedLifeTaskId: null
  });
}

function selectLifeProject(id) {
  setState({
    lifeTool: "projects",
    selectedLifeProjectId: id,
    selectedLifePhaseId: null,
    selectedLifeTaskId: null
  });
}

function selectLifePhase(id) {
  setState({
    lifeTool: "projects",
    selectedLifePhaseId: id,
    selectedLifeTaskId: null
  });
}

function selectLifeTask(id) {
  setState({
    lifeTool: "projects",
    selectedLifeTaskId: id
  });
}

function addLifePhase(projectId) {
  const title = document.getElementById("life-phase-title")?.value.trim();
  if (!title) return;
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
    edited: now
  };
  persistLifePlanner({
    ...state.lifePlanner,
    projects: lifeProjects().map((project) => project.id === projectId
      ? { ...project, phases: [phase, ...(project.phases || [])], edited: now }
      : project)
  }, {
    lifeTool: "projects",
    selectedLifeProjectId: projectId,
    selectedLifePhaseId: phase.id,
    selectedLifeTaskId: null
  });
}

function addLifeProjectTask(projectId, phaseId) {
  const title = document.getElementById("life-task-title")?.value.trim();
  if (!title) return;
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
    edited: now
  };
  persistLifePlanner({
    ...state.lifePlanner,
    projects: lifeProjects().map((project) => project.id === projectId
      ? {
          ...project,
          edited: now,
          phases: (project.phases || []).map((phase) => phase.id === phaseId
            ? { ...phase, tasks: [task, ...(phase.tasks || [])], edited: now }
            : phase)
        }
      : project)
  }, {
    lifeTool: "projects",
    selectedLifeProjectId: projectId,
    selectedLifePhaseId: phaseId,
    selectedLifeTaskId: task.id
  });
}

function updateLifeProjectEntity(level, updater, nextState = {}) {
  const now = nowIso();
  const projectId = state.selectedLifeProjectId;
  const phaseId = state.selectedLifePhaseId;
  const taskId = state.selectedLifeTaskId;
  persistLifePlanner({
    ...state.lifePlanner,
    projects: lifeProjects().map((project) => {
      if (project.id !== projectId) return project;
      if (level === "project") return { ...updater(project), edited: now };
      return {
        ...project,
        edited: now,
        phases: (project.phases || []).map((phase) => {
          if (phase.id !== phaseId) return phase;
          if (level === "phase") return { ...updater(phase), edited: now };
          return {
            ...phase,
            edited: now,
            tasks: (phase.tasks || []).map((task) => task.id === taskId ? { ...updater(task), edited: now } : task)
          };
        })
      };
    })
  }, { lifeTool: "projects", ...nextState });
}

function saveLifeProjectEntity(level) {
  const title = document.getElementById("life-entity-title")?.value.trim() || "Untitled";
  const status = document.getElementById("life-entity-status")?.value || "planned";
  const assignedTo = document.getElementById("life-entity-assigned-to")?.value.trim() || "";
  const assignedDate = document.getElementById("life-entity-assigned-date")?.value || "";
  const notes = document.getElementById("life-entity-notes")?.value || "";
  updateLifeProjectEntity(level, (entity) => ({
    ...entity,
    title,
    status,
    assignedTo,
    assignedDate,
    notes
  }));
}

async function uploadLifeAttachment(level) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    try {
      const attachments = [];
      for (const file of files) {
        attachments.push(await storeLocalFile(file));
      }
      updateLifeProjectEntity(level, (entity) => ({
        ...entity,
        attachments: [...(entity.attachments || []), ...attachments]
      }));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not upload attachment.");
    }
  });
  input.click();
}

function deleteLifeAttachment(level, attachmentId) {
  updateLifeProjectEntity(level, (entity) => ({
    ...entity,
    attachments: (entity.attachments || []).filter((attachment) => attachment.id !== attachmentId)
  }));
  deleteLocalImages([attachmentId]).catch(() => {});
}

function setDashboardPeriod(period) {
  const nextPeriod = dashboardPeriodOption(period).id;
  const glowUntil = Date.now() + 7000;
  window.clearTimeout(dashboardPeriodGlowTimer);
  dashboardPeriodGlowTimer = window.setTimeout(() => {
    if (state.dashboardPeriodGlowUntil <= Date.now()) setState({ dashboardPeriodGlowUntil: 0 });
  }, 7200);
  setState({
    dashboardPeriod: nextPeriod,
    dashboardPeriodGlowUntil: glowUntil
  });
}

function setDashboardPeriodByIndex(index) {
  setDashboardPeriod(dashboardPeriodOptionForIndex(index).id);
}

function previewDashboardPeriodByIndex(index) {
  const option = dashboardPeriodOptionForIndex(index);
  const optionIndex = dashboardPeriodIndex(option.id);
  const progress = DASHBOARD_PERIOD_OPTIONS.length > 1
    ? Math.round((optionIndex / (DASHBOARD_PERIOD_OPTIONS.length - 1)) * 100)
    : 0;
  app.querySelectorAll("[data-dashboard-period-slider]").forEach((input) => {
    input.value = String(optionIndex);
    input.style.setProperty("--period-progress", `${progress}%`);
    input.setAttribute("aria-valuetext", option.label);
    input.closest(".dashboard-period-slider")?.querySelector(".dashboard-period-slider-value")?.replaceChildren(option.label);
  });
}

function setDashboardChartType(chartType) {
  setState({ dashboardChartType: ["pie", "bar"].includes(chartType) ? chartType : "pie" });
}

function setTheme(theme) {
  const nextTheme = normalizeTheme(theme);
  saveTheme(nextTheme);
  setState({ theme: nextTheme });
}

function saveDashboardIdentitySettings() {
  const current = normalizeDashboardIdentity(state.dashboardIdentity);
  const displayMode = document.querySelector("input[name='dashboard-display-mode']:checked")?.value === "icons" ? "icons" : "numbers";
  const nextIdentity = {
    displayMode,
    showNumbers: displayMode === "numbers",
    showIcons: displayMode === "icons",
    items: Object.fromEntries(DASHBOARD_LABELS.map((dashboard) => {
      const label = document.getElementById(`dashboard-identity-${dashboard}-label`)?.value.trim() || DEFAULT_DASHBOARD_IDENTITY.items[dashboard].label;
      const icon = document.getElementById(`dashboard-identity-${dashboard}-icon`)?.value.trim() || current.items[dashboard]?.icon || DEFAULT_DASHBOARD_IDENTITY.items[dashboard].icon;
      return [dashboard, {
        ...DEFAULT_DASHBOARD_IDENTITY.items[dashboard],
        label,
        icon: normalizeIconSource(icon)
      }];
    }))
  };
  const normalized = normalizeDashboardIdentity(nextIdentity);
  saveDashboardIdentity(normalized);
  setState({ dashboardIdentity: normalized });
}

function resetDashboardIdentityItem(dashboard) {
  if (!DASHBOARD_LABELS.includes(dashboard)) return;
  const fallback = DEFAULT_DASHBOARD_IDENTITY.items[dashboard];
  const labelInput = document.getElementById(`dashboard-identity-${dashboard}-label`);
  if (labelInput) labelInput.value = fallback.label;
  updateIconPickerField(`dashboard-identity-${dashboard}-icon`, fallback.icon);
  saveDashboardIdentitySettings();
}

function dismissTip(tip, element) {
  if (!tip) return;
  element?.classList.add("is-dismissed");
  const dismissedTips = Array.from(new Set([...(state.dismissedTips || []), tip]));
  state.dismissedTips = dismissedTips;
  saveDismissedTips(dismissedTips);
  window.setTimeout(() => render(), 280);
}

function resetTips() {
  clearDismissedTips();
  render();
}

function render() {
  applyEnvironmentClasses();

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
  const sidebarScrollTop = app.querySelector(".sidebar-list-scroll")?.scrollTop ?? 0;
  const settingsScrollTop = app.querySelector(".settings-tab-panel")?.scrollTop ?? 0;
  const thoughtToastFocus = captureThoughtToastFocus();
  hideThoughtTooltip();
  app.innerHTML = `
    <div class="workspace${state.mobileMenuOpen ? " has-mobile-menu" : ""}" style="--sidebar-width: ${clampSidebarWidth(state.sidebarWidth)}px;">
      <button class="mobile-menu-toggle" data-action="toggle-mobile-menu" type="button" aria-expanded="${state.mobileMenuOpen ? "true" : "false"}">
        ${menuToggleLabel()}
      </button>
      ${sidebarHtml(compendium)}
      <section class="content-shell">
        ${pathBarHtml(compendium, section, spiritBook)}
        <div class="content-stage"${state.mobileMenuOpen ? " inert aria-hidden=\"true\"" : ""}>${contentHtml(compendium, section)}</div>
      </section>
    </div>
    ${donationModalHtml()}
    ${thoughtToastHtml()}
    ${iconPickerOverlayHtml()}
  `;
  const sidebarScroll = app.querySelector(".sidebar-list-scroll");
  if (sidebarScroll) sidebarScroll.scrollTop = sidebarScrollTop;
  const settingsScroll = app.querySelector(".settings-tab-panel");
  if (settingsScroll) settingsScroll.scrollTop = settingsScrollTop;
  bindActions();
  bindDashboardIdentityAutoSave();
  bindTrackerEditorAutoSave();
  bindHeaderActionTooltips();
  bindThoughtTooltips();
  bindThoughtToastControls();
  bindIconPickerControls();
  bindTrackerOrbSorting();
  bindSidebarResize();
  bindSidebarHorizontalScroll();
  bindPathBarOverflow();
  bindCompendiumSectionSorting();
  bindDashboardBalanceHover();
  bindDashboardPeriodSlider();
  bindGalleryControls();
  bindEditorMedia();
  bindLocalAssetImages();
  bindDonationFlow(document, { onOpen: closeMobileMenu });
  updateBodyTimerDom();
  renderLifeMonthCalendar();
  focusThoughtEditor();
  restoreThoughtToastFocus(thoughtToastFocus);
}

function thoughtToastHtml() {
  const toast = state.thoughtToast;
  if (!toast) return "";
  const kind = trackerKind(toast.kind);
  const config = trackerKindConfig(kind);
  const quickNote = toast.quickNote || "";
  const hasQuickNote = quickNote.trim().length > 0;
  const toastDate = thoughtDateInputValue(toast.timestamp);
  const toastTime = thoughtTimeInputValue(toast.timestamp);
  const summaryAction = kind === "goal" ? "checked" : "saved";
  const detailLabel = kind === "goal" ? "Progress note" : "Quick note";
  const detailPlaceholder = kind === "goal" ? "Add progress detail" : "Add a detail";
  return `
    <aside class="thought-toast" role="status" aria-live="polite">
      <div class="thought-toast-summary">
        <strong>${escapeHtml(toast.dashboard)} ${escapeHtml(config.noun)} ${summaryAction}</strong>
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
      <button class="icon-button danger-button thought-toast-delete" data-action="delete-thought-toast-note" data-id="${escapeHtml(toast.noteId)}" type="button" aria-label="Delete ${escapeHtml(config.noun)} note" title="Delete ${escapeHtml(config.noun)} note">${iconHtml("tabler:trash")}</button>
      <button class="icon-button" data-action="dismiss-thought-toast" type="button" aria-label="Dismiss ${escapeHtml(config.noun)} popup" title="Dismiss">${iconHtml("tabler:x")}</button>
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
  if (!toast || !input || !noteInput || !actionButton) return;

  const updateActionButton = () => {
    const value = noteInput.value.trim();
    const kind = trackerKind(state.thoughtToast?.kind);
    const submitLabel = kind === "goal" ? "Submit progress note" : "Submit quick note";
    if (state.thoughtToast) state.thoughtToast.quickNote = noteInput.value;
    actionButton.dataset.action = value ? "submit-thought-toast-note" : "open-thought-toast-note";
    actionButton.innerHTML = iconHtml(value ? "tabler:device-floppy" : "tabler:external-link");
    actionButton.setAttribute("aria-label", value ? submitLabel : "Open note");
    actionButton.setAttribute("title", value ? "Submit" : "Open Note");
    pauseThoughtToastFade();
  };
  const updateTimestamp = () => {
    const timestamp = thoughtTimestampFromToastControls();
    if (state.thoughtToast) state.thoughtToast.timestamp = timestamp;
    if (summaryTime) summaryTime.textContent = thoughtTimestampLabel(timestamp);
    pauseThoughtToastFade();
  };
  const keepNoteInputFocused = () => {
    if (document.activeElement !== noteInput) return false;
    noteInput.focus({ preventScroll: true });
    pauseThoughtToastFade();
    return true;
  };

  toast.addEventListener("pointerenter", pauseThoughtToastFade);
  toast.addEventListener("pointerleave", () => {
    if (keepNoteInputFocused()) return;
    resumeThoughtToastFade(0);
  });
  toast.addEventListener("focusin", pauseThoughtToastFade);
  toast.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!toast.contains(document.activeElement) && !toast.matches(":hover")) resumeThoughtToastFade(0);
    }, 0);
  });
  noteInput.addEventListener("input", updateActionButton);
  dateInput?.addEventListener("input", updateTimestamp);
  timeInput?.addEventListener("input", updateTimestamp);
}

function openIconPicker(element) {
  const fieldId = element.dataset.iconField || "";
  const field = document.getElementById(fieldId);
  if (!field) return;
  state.iconPicker = {
    fieldId,
    previewId: element.dataset.iconPreview || "",
    title: element.dataset.iconTitle || "Choose icon",
    color: element.dataset.iconColor || "var(--accent)",
    selected: normalizeIconSource(field.value || "tabler:circle") || "tabler:circle",
    query: "",
    limit: ICON_PICKER_PAGE_SIZE
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
  if (!results || !state.iconPicker) return;
  results.innerHTML = iconPickerGridHtml();
}

function updateIconPickerCurrent() {
  const symbol = app.querySelector("[data-icon-picker-current-symbol]");
  if (symbol && state.iconPicker) {
    symbol.innerHTML = trackerIconHtml(state.iconPicker.selected || "tabler:circle");
  }
}

function selectIconPickerIcon(icon) {
  if (!state.iconPicker) return;
  state.iconPicker.selected = normalizeIconSource(icon || "tabler:circle") || "tabler:circle";
  updateIconPickerCurrent();
  refreshIconPickerResults();
}

function requestIconPickerSearch(query, limit) {
  if (!state.iconPicker || String(query || "").trim().length < 3) return;
  const searchPromise = searchIconifyIcons(query, limit);
  refreshIconPickerResults();
  searchPromise.then(() => {
    if (!state.iconPicker || state.iconPicker.query !== query || state.iconPicker.limit !== limit) return;
    refreshIconPickerResults();
  });
}

function updateIconPickerField(fieldId, icon) {
  const normalized = normalizeIconSource(icon || "tabler:circle") || "tabler:circle";
  const field = document.getElementById(fieldId);
  if (field) {
    field.value = normalized;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
  app.querySelectorAll(`[data-icon-field="${CSS.escape(fieldId)}"]`).forEach((trigger) => {
    trigger.dataset.iconTitle = trigger.dataset.iconTitle || "Choose icon";
    trigger.setAttribute("aria-label", `Choose icon: ${iconDisplayName(normalized)}`);
    trigger.setAttribute("title", `Choose icon: ${iconDisplayName(normalized)}`);
    trigger.querySelector(".icon-picker-trigger-symbol")?.replaceChildren();
    const symbol = trigger.querySelector(".icon-picker-trigger-symbol");
    if (symbol) symbol.innerHTML = trackerIconHtml(normalized);
    const label = trigger.querySelector(".icon-picker-trigger-label");
    if (label) label.textContent = iconDisplayName(normalized);
    const previewId = trigger.dataset.iconPreview || "";
    const preview = previewId ? document.getElementById(previewId) : null;
    if (preview) {
      const previewIcon = preview.querySelector(".tracker-orb-icon");
      if (previewIcon) previewIcon.innerHTML = trackerIconHtml(normalized);
      else preview.innerHTML = trackerIconHtml(normalized);
    }
  });
}

function saveIconPickerSelection() {
  if (!state.iconPicker) return;
  updateIconPickerField(state.iconPicker.fieldId, state.iconPicker.selected);
  closeIconPicker();
}

function loadMoreIconPickerIcons() {
  if (!state.iconPicker) return;
  state.iconPicker.limit = Math.min(192, (Number(state.iconPicker.limit) || ICON_PICKER_PAGE_SIZE) + ICON_PICKER_PAGE_SIZE);
  refreshIconPickerResults();
  requestIconPickerSearch(state.iconPicker.query, state.iconPicker.limit);
}

function bindIconPickerControls() {
  const overlay = app.querySelector("[data-icon-picker-overlay]");
  if (!overlay || !state.iconPicker) return;
  overlay.addEventListener("click", (event) => {
    const actionElement = event.target?.closest?.("[data-action]");
    if (!actionElement || !overlay.contains(actionElement)) return;
    handleAction(actionElement);
  });
  overlay.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const actionElement = event.target?.closest?.("[data-action]");
    if (!actionElement || !overlay.contains(actionElement)) return;
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
}

function trackerDropIndex(row, activeWrap, pointerX, pointerY = pointerX) {
  const allWraps = Array.from(row.querySelectorAll("[data-tracker-orb-wrap]"));
  const wraps = allWraps.filter((wrap) => wrap !== activeWrap);
  if (!allWraps.length) return 0;
  if (!wraps.length) return 0;
  const sampleRect = allWraps[0].getBoundingClientRect();
  if (!sampleRect.width || !sampleRect.height) return 0;
  const rowStyle = window.getComputedStyle(row);
  const rowGap = parseFloat(rowStyle.rowGap || rowStyle.gap || "0") || 0;
  const columnGap = parseFloat(rowStyle.columnGap || rowStyle.gap || "0") || 0;
  const estimatedRowHeight = sampleRect.height + rowGap;
  const estimatedColumnWidth = sampleRect.width + columnGap;
  const firstRowWraps = allWraps.filter((wrap) => Math.abs(wrap.getBoundingClientRect().top - sampleRect.top) < 3);
  const columns = Math.max(1, firstRowWraps.length);
  const rowIndex = estimatedRowHeight > 0 ? Math.floor((pointerY - sampleRect.top) / estimatedRowHeight) : 0;
  const columnIndex = estimatedColumnWidth > 0 ? Math.floor((pointerX - sampleRect.left) / estimatedColumnWidth) : 0;
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
  const wraps = Array.from(row.querySelectorAll("[data-tracker-orb-wrap]"))
    .filter((wrap) => wrap !== activeWrap);
  if (!wraps.length) return;
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
      if (!orb) return;

      orb.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const area = wrap.dataset.area || row.dataset.area || "";
        const kind = wrap.dataset.kind || row.dataset.kind || "thought";
        const trackerId = wrap.dataset.id || "";
        if (!area || !trackerId) return;

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
          targetIndex = trackerDropIndex(row, wrap, moveEvent.clientX, moveEvent.clientY);
          setTrackerDropMarker(row, wrap, targetIndex);
        };

        const onPointerMove = (moveEvent) => {
          const moved = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
          if (!isDragging && moved < 6) return;
          moveEvent.preventDefault();
          if (!isDragging) startDrag(moveEvent);
          targetIndex = trackerDropIndex(row, wrap, moveEvent.clientX, moveEvent.clientY);
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

          if (!isDragging) return;
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

        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", finishDrag);
        window.addEventListener("pointercancel", finishDrag);
      });
    });
  });
}

function focusThoughtEditor() {
  const note = findArtifact(state.artifactStore, state.selectedArtifactId);
  if (state.artifactMode !== "editor" || !["thought", "goal-progress"].includes(note?.properties?.role)) return;
  window.requestAnimationFrame(() => {
    const editor = document.getElementById("editor-body");
    if (!editor) return;
    editor.focus();
    const end = editor.value.length;
    editor.setSelectionRange(end, end);
  });
}

function sidebarHtml(compendium) {
  const sectionLabels = DASHBOARD_LABELS;
  const allExpanded = sectionLabels.every((label) => state.sidebarExpanded[label]);
  return `
    <aside class="sidebar">
      <div class="sidebar-fixed-top">
        <nav class="sidebar-menu-nav" aria-label="Menu controls">
          <button class="sidebar-menu-nav-button" data-action="toggle-all-sidebar-sections" type="button" aria-pressed="${allExpanded ? "true" : "false"}" aria-label="${allExpanded ? "Collapse all" : "Expand all"}" title="${allExpanded ? "Collapse all" : "Expand all"}">
            ${iconHtml(allExpanded ? "tabler:chevrons-up" : "tabler:chevrons-down")}
          </button>
          ${dashboardPeriodSliderHtml("sidebar-period-slider")}
        </nav>
      </div>
      <div class="sidebar-list-scroll">
        <div class="sidebar-groups">
          ${sectionLabels
            .map((label) => {
              const expanded = state.sidebarExpanded[label];
              const items = label === "Mind"
                ? (() => {
                  const mindItems = mindSidebarItems();
                  return mindItems.map((item, index) => sidebarItemHtml(item, {
                    action: item.type === "mind-section" ? "open-mind-section" : "open-artifact-note",
                    active: item.type === "mind-section"
                      ? state.selectedSectionId === item.id
                      : item.type === "compendium"
                        ? state.selectedCompendiumId === item.id && !state.selectedSectionId
                        : state.selectedArtifactId === item.id,
                    number: index + 1,
                    parentId: item.parentId || ""
                  })).join("");
                })()
                : label === "Spirit"
                  ? newestActivityFirst(spiritNotes()).map((item, index) => sidebarItemHtml(item, {
                    action: "open-artifact-note",
                    active: state.selectedArtifactId === item.id,
                    number: index + 1
                  })).join("")
                  : newestActivityFirst(rootNotesForDashboard(state.artifactStore, label)).map((item, index) => sidebarItemHtml(item, {
                    action: "open-artifact-note",
                    active: state.selectedArtifactId === item.id,
                    number: index + 1
                  })).join("");

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
          <span aria-hidden="true">/</span>
          <button class="sidebar-text-link" data-action="import-artifacts" type="button">Import</button>
          <span aria-hidden="true">/</span>
          <button class="sidebar-text-link" data-action="export-artifacts" type="button">Export</button>
          <span aria-hidden="true">/</span>
          <button class="sidebar-text-link" data-action="reset-tips" type="button">Reset tips</button>
          <span aria-hidden="true">/</span>
          <button class="sidebar-text-link" data-action="factory-defaults" type="button">Factory Defaults</button>
          <span aria-hidden="true">/</span>
          <button class="sidebar-text-link" data-action="clear-app-data" type="button">Clear Data</button>
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
  if (!itemButtons.length) return "";
  const pageCount = Math.ceil(itemButtons.length / 5);
  const maxPage = pageCount - 1;
  const activePage = Math.min(Math.max(state.sidebarPages[section] || 0, 0), maxPage);
  const pageControls = pageCount > 1 ? `
    <div class="sidebar-page-controls" aria-label="${escapeHtml(section)} pages">
      <button data-action="sidebar-page" data-section="${escapeHtml(section)}" data-direction="prev" data-max-page="${maxPage}" type="button"${activePage === 0 ? " disabled" : ""} aria-label="Previous page">&lt;</button>
      <button data-action="sidebar-page" data-section="${escapeHtml(section)}" data-direction="next" data-max-page="${maxPage}" type="button"${activePage === maxPage ? " disabled" : ""} aria-label="Next page">&gt;</button>
    </div>
  ` : "";
  const visibleItems = itemButtons.slice(activePage * 5, activePage * 5 + 5);
  return `
    <div class="sidebar-group-page">
      ${visibleItems.join("")}
    </div>
    ${pageControls}
  `;
}

function pathBarHtml(compendium, section, spiritBook) {
  const activeLabel = DASHBOARD_LABELS.includes(state.active) ? dashboardDisplayLabel(state.active) : state.active;
  return `
    <nav class="path-bar" aria-label="Current location" tabindex="0">
      <button class="dashboard-home-link" data-action="home">Dashboard</button>
      ${state.dismissedTips?.includes(DASHBOARD_RETURN_TIP) ? "" : `<button class="info-tip path-dashboard-tip" data-action="dismiss-tip" data-tip="${DASHBOARD_RETURN_TIP}" type="button"><span>click the dashboard link here anytime to return to the dashboard</span><i aria-hidden="true"></i></button>`}
      ${state.active !== "Dashboard" ? `<span>/</span><button data-action="dashboard-root">${escapeHtml(activeLabel)}</button>` : ""}
      ${compendium ? `<span>/</span><button class="truncate" data-action="compendium-root">${escapeHtml(compendium.title)}</button>` : ""}
      ${section ? `<span>/</span><span class="truncate muted">${escapeHtml(section.title)}</span>` : ""}
      ${spiritBook ? `<span>/</span><span class="truncate muted">${escapeHtml(spiritBook.title)}</span>` : ""}
    </nav>
  `;
}

function contentHtml(compendium, section) {
  if (state.active === "Dashboard") return dashboardGridHtml();
  if (state.active === "Settings") return settingsHtml();
  if (state.active === "Gallery") return galleryHtml();
  if (state.active === "Mind") return mindHtml(compendium, section);
  if (state.active === "Body") return bodyHtml();
  if (state.active === "Spirit") return spiritHtml();
  if (state.active === "Life") return lifeHtml();
  return dashboardArtifactHtml(state.active);
}

function dashboardGridHtml() {
  return `
    <div class="dashboard-home">
      ${dashboardAnalyticsHtml()}
      <div class="dashboard-divider" aria-hidden="true"></div>
      <div class="dashboard-grid">
        ${DASHBOARD_LABELS.map((label) => `
          <button class="dashboard-card${state.flipped === label ? " is-flipped" : ""}" data-action="open-dashboard-card" data-section="${label}" data-balance-key="${label}" style="--card-color: ${DASHBOARD_COLORS[label]};">
            <span class="dashboard-card-inner">
              <span class="dashboard-card-face dashboard-card-front">
                <span class="dashboard-card-title">${dashboardTitleHtml(label)}</span>
              </span>
              <span class="dashboard-card-face dashboard-card-back-face">
                ${dashboardCardBackHtml(label)}
              </span>
            </span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function dashboardPeriodSliderHtml(extraClass = "") {
  const periodOption = dashboardPeriodOption(state.dashboardPeriod);
  const periodIndex = dashboardPeriodIndex(periodOption.id);
  const periodProgress = DASHBOARD_PERIOD_OPTIONS.length > 1
    ? Math.round((periodIndex / (DASHBOARD_PERIOD_OPTIONS.length - 1)) * 100)
    : 0;
  const recentClass = state.dashboardPeriodGlowUntil > Date.now() ? " is-period-recent" : "";
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
  const chartType = state.dashboardChartType === "bar" ? "bar" : "pie";
  const periodOption = dashboardPeriodOption(state.dashboardPeriod);
  const events = lifeEvents().filter((event) => eventIsInPeriod(event, periodOption.id));
  const counts = Object.fromEntries(labels.map((label) => [label, 0]));
  events.forEach((event) => {
    if (counts[event.dashboard] !== undefined) counts[event.dashboard] += 1;
  });
  const total = labels.reduce((sum, label) => sum + counts[label], 0);
  let cursor = 0;
  const segments = pieLabels.map((label) => {
    const value = total ? (counts[label] / total) * 100 : 25;
    const start = cursor;
    cursor += value;
    return { label, value, start };
  });
  const periodLabel = periodOption.id === "day" ? "today" : `the last ${periodOption.label.toLowerCase()}`;
  const ideal = total ? total / labels.length : 0;
  const imbalance = total ? labels.map((label) => Math.abs(counts[label] - ideal)).reduce((sum, value) => sum + value, 0) / total : 0;
  const balanceScore = Math.max(0, Math.round((1 - imbalance) * 100));
  const maxCount = Math.max(1, ...labels.map((label) => counts[label]));
  const chartHtml = chartType === "bar"
    ? `
      <div class="dashboard-bar-chart" role="img" aria-label="Balance bar chart">
        ${labels.map((label) => {
          const count = counts[label];
          const displayLabel = dashboardDisplayLabel(label);
          const barSize = count ? Math.max(10, Math.round((count / maxCount) * 100)) : 5;
          return `
            <button class="dashboard-bar-button" data-action="open-dashboard-direct" data-section="${label}" data-balance-key="${label}" type="button" aria-label="Open ${escapeHtml(displayLabel)}, ${count} event${count === 1 ? "" : "s"}" style="--bar-color: ${DASHBOARD_COLORS[label]}; --bar-size: ${barSize}%;">
              <span class="dashboard-bar-value">${count}</span>
              <span class="dashboard-bar-track" aria-hidden="true"><span class="dashboard-bar-fill"></span></span>
            </button>
          `;
        }).join("")}
      </div>
    `
    : `
      <div class="dashboard-pie">
        <svg class="dashboard-pie-chart" viewBox="0 0 148 148" aria-label="Open balance section">
          ${segments.map(({ label, value, start }) => `
            <circle class="dashboard-pie-segment" data-action="open-dashboard-direct" data-section="${label}" data-balance-key="${label}" tabindex="0" role="button" aria-label="Open ${escapeHtml(dashboardDisplayLabel(label))}" cx="74" cy="74" r="57" pathLength="100" style="--segment-color: ${DASHBOARD_COLORS[label]}; --segment-start: ${start}; --segment-size: ${value};"></circle>
          `).join("")}
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
        <div class="dashboard-pie-wrap">
          ${chartHtml}
          <strong>${balanceScore}% balanced</strong>
          <div class="dashboard-chart-controls">
            ${dashboardPeriodSliderHtml()}
            <div class="dashboard-chart-switcher" role="group" aria-label="Balance chart type">
              ${[
                ["pie", "tabler:chart-pie", "Pie"],
                ["bar", "tabler:chart-bar", "Bar"]
              ].map(([type, icon, label]) => `
                <button class="${chartType === type ? "is-active" : ""}" data-action="set-dashboard-chart" data-chart="${type}" type="button" aria-pressed="${chartType === type ? "true" : "false"}" title="${label} chart">${buttonContent(icon, label)}</button>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function settingsHtml() {
  const requestedTab = state.settingsTab === "dashboard" ? "interface" : state.settingsTab;
  const tab = ["getting-started", "thoughts", "goals", "interface"].includes(requestedTab)
    ? requestedTab
    : "getting-started";
  const panels = {
    "getting-started": settingsGettingStartedHtml(),
    thoughts: settingsThoughtsHtml(),
    goals: settingsGoalsHtml(),
    interface: settingsInterfaceHtml()
  };
  return panelHtml(`
    ${headerHtml("Settings", "Getting started, Thoughts, Goals, and Interface setup.")}
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
      ["interface", "Interface", "tabler:layout-dashboard"]
    ];
  return `
    <nav class="settings-tabs" aria-label="Settings tabs">
      ${tabs.map(([tab, label, icon]) => `
        <button class="body-mode-button${activeTab === tab ? " is-active" : ""}" data-action="set-settings-tab" data-tab="${tab}" type="button" aria-pressed="${activeTab === tab ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
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
          <p>Use ${escapeHtml(dashboardDisplayLabel("Life"))} as the calendar and journal layer. Log the day, mark habits, and record what changed. The calendar helps you see when you worked on something and how steady the rhythm has been.</p>
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
        ${DASHBOARD_LABELS.map((dashboard) => `
          <section class="thoughts-settings-section" style="--thought-color: ${DASHBOARD_COLORS[dashboard]};">
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
        `).join("")}
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
          <section class="thoughts-settings-section" style="--thought-color: ${DASHBOARD_COLORS[dashboard]};">
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
        `; }).join("")}
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
            return `
              <div class="dashboard-identity-card" style="--identity-color: ${DASHBOARD_COLORS[dashboard]};">
                <div class="dashboard-identity-input-row">
                  ${iconPickerFieldHtml({
                    fieldId,
                    value: item.icon,
                    title: `${item.label || dashboard} icon`,
                    color: DASHBOARD_COLORS[dashboard],
                    showLabel: false
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
          ${APP_THEMES.map((theme) => `
            <button class="theme-choice${state.theme === theme.id ? " is-active" : ""}" data-action="set-theme" data-theme="${escapeHtml(theme.id)}" type="button" aria-pressed="${state.theme === theme.id ? "true" : "false"}">
              <span class="theme-choice-preview theme-choice-preview--${escapeHtml(theme.id)}" style="${escapeHtml(themePreviewStyle(theme))}" aria-hidden="true">
                <i></i><i></i><i></i>
              </span>
              <strong>${escapeHtml(theme.label)}</strong>
              <small>${escapeHtml(theme.description)} Font: ${escapeHtml(themeFontLabel(theme))}.</small>
              ${themePaletteHtml(theme)}
            </button>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function trackerAddFormHtml(area, kind = "thought") {
  const normalizedKind = trackerKind(kind);
  const config = trackerKindConfig(normalizedKind);
  if (!isTrackerAddOpen(area, normalizedKind)) return "";
  const fieldId = trackerFieldId(area, "icon");
  const labelFieldId = trackerFieldId(area, "label");
  return `
    <div class="tracker-add-form">
      <div class="tracker-title-icon-row" style="--identity-color: ${DASHBOARD_COLORS[area]};">
        ${iconPickerFieldHtml({
          fieldId,
          value: "tabler:circle",
          title: `${dashboardDisplayLabel(area)} ${config.noun} icon`,
          color: DASHBOARD_COLORS[area],
          showLabel: false
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
  if (parsedKey.kind !== normalizedKind || parsedKey.area !== area || !parsedKey.id) return "";
  const id = parsedKey.id;
  const tracker = (trackerSettingsForKind(normalizedKind)?.[area] || []).find((item) => item.id === id);
  if (!tracker) return "";
  const target = `edit-${id}`;
  const confirmDelete = state.trackerDeleteKey === trackerEditKey(area, id, normalizedKind);
  const fieldId = trackerFieldId(`${area}-${id}`, "icon");
  const enableFieldId = trackerFieldId(`${area}-${id}`, "enabled");
  const isGoal = normalizedKind === "goal";
  return `
    <div class="tracker-edit-form" data-tracker-edit-form data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" data-kind="${normalizedKind}">
      <div class="tracker-edit-heading">
        <strong>Edit ${escapeHtml(tracker.label)}</strong>
        <div class="tracker-edit-heading-actions">
          ${confirmDelete
            ? `<button class="icon-button" data-action="cancel-remove-tracker" type="button" aria-label="Keep ${escapeHtml(tracker.label)}" title="Keep">${iconHtml("tabler:arrow-back-up")}</button><button class="icon-button danger-button" data-action="remove-tracker" data-kind="${normalizedKind}" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button" aria-label="Confirm delete ${escapeHtml(tracker.label)}" title="Confirm Delete">${iconHtml("tabler:trash")}</button>`
            : `<button class="icon-button danger-button" data-action="request-remove-tracker" data-kind="${normalizedKind}" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button" aria-label="Delete ${escapeHtml(tracker.label)}" title="Delete">${iconHtml("tabler:trash")}</button>`}
          <button class="icon-button" data-action="cancel-edit-tracker" type="button" aria-label="Close ${escapeHtml(trackerKindConfig(normalizedKind).noun)} editor" title="Close">${iconHtml("tabler:x")}</button>
        </div>
      </div>
      <div class="tracker-add-form tracker-add-form--embedded">
        <div class="tracker-title-icon-row" style="--identity-color: ${DASHBOARD_COLORS[area]};">
          ${iconPickerFieldHtml({
            fieldId,
            value: tracker.icon,
            title: `${tracker.label} icon`,
            color: DASHBOARD_COLORS[area],
            showLabel: false
          })}
          <input class="tracker-title-input" id="${trackerFieldId(`${area}-${id}`, "label")}" data-area="${escapeHtml(area)}" data-target="${escapeHtml(target)}" type="text" value="${escapeHtml(tracker.label)}" aria-label="Button text">
          ${isGoal
            ? `
            <label class="body-field tracker-enabled-toggle tracker-enabled-toggle--inline">
              <input id="${escapeHtml(enableFieldId)}" type="checkbox"${tracker.enabled ? " checked" : ""}>
              <i aria-hidden="true"></i>
              <span>Enabled</span>
            </label>`
            : ""}
        </div>
      </div>
    </div>
  `;
}

function settingsComingSoonHtml(label) {
  return `
    <div class="settings-tab-panel">
      ${emptyStateHtml("Coming Soon", `${label} settings will live here.`)}
    </div>
  `;
}

function galleryHtml() {
  const images = state.galleryImages;
  const selected = new Set(state.gallerySelectedIds);
  const count = images?.length || 0;
  const selectedCount = selected.size;
  const thumbSize = Math.min(320, Math.max(110, Number(state.galleryThumbSize) || 180));
  return panelHtml(`
    ${headerHtml("Gallery", "Browse image uploads from this browser. The image records keep storage metadata so the same gallery can resolve remote image URLs later.", `
      <div class="action-row">
        <button class="secondary-button" data-action="gallery-select-all" type="button"${count ? "" : " disabled"}>${buttonContent("tabler:checks", "Select All")}</button>
        <button class="secondary-button" data-action="gallery-clear-selection" type="button"${selectedCount ? "" : " disabled"}>${buttonContent("tabler:square", "Clear")}</button>
        ${pageActionButton("gallery-delete-selected", "tabler:trash", selectedCount ? `Delete ${selectedCount}` : "Delete selected", { danger: true, disabled: !selectedCount })}
      </div>
    `)}
    <div class="gallery-page">
      <div class="gallery-toolbar">
        <span>${images ? `${count} image${count === 1 ? "" : "s"}` : "Loading images"}</span>
        <label>
          <span>Image size</span>
          <input data-gallery-size-slider type="range" min="110" max="320" step="10" value="${thumbSize}" aria-label="Gallery image size">
        </label>
      </div>
      ${images === null ? emptyStateHtml("Loading gallery.", "Reading your local image library.") : images.length ? `
        <div class="gallery-grid${selectedCount ? " is-selecting" : ""}" style="--gallery-thumb-size: ${thumbSize}px;">
          ${images.map((image) => galleryImageCardHtml(image, selected.has(image.id))).join("")}
        </div>
      ` : emptyStateHtml("No images yet.", "Images you upload into notes will appear here.")}
    </div>
  `);
}

function galleryImageCardHtml(image, selected) {
  const remoteUrl = galleryRemoteImageUrl(image);
  const imageLinkAttrs = remoteUrl
    ? `href="${escapeHtml(remoteUrl)}"`
    : `href="#" data-local-asset-link="${escapeHtml(image.id)}"`;
  const imageAttrs = remoteUrl
    ? `src="${escapeHtml(remoteUrl)}"`
    : `data-local-asset="${escapeHtml(image.id)}"`;
  return `
    <article class="gallery-card${selected ? " is-selected" : ""}">
      <label class="gallery-select">
        <input data-gallery-select type="checkbox" value="${escapeHtml(image.id)}"${selected ? " checked" : ""} aria-label="Select ${escapeHtml(image.name || "image")}">
      </label>
      <a class="gallery-image-link" ${imageLinkAttrs} target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(image.name || "image")} in a new tab">
        <img ${imageAttrs} alt="${escapeHtml(image.name || "Uploaded image")}" loading="lazy">
      </a>
    </article>
  `;
}

function galleryRemoteImageUrl(image) {
  const value = image?.url || image?.downloadUrl || image?.publicUrl || image?.storageUrl || "";
  return /^https?:\/\/[^"'<>]+$/i.test(value) ? value : "";
}

function selectAllGalleryImages() {
  setState({ gallerySelectedIds: (state.galleryImages || []).map((image) => image.id) });
}

function clearGallerySelection() {
  setState({ gallerySelectedIds: [] });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeDeletedImageReferences(ids) {
  if (!state.artifactStore || !ids.length) return;
  const patterns = ids.map((id) => new RegExp(`!\\[[^\\]]*\\]\\(ourstuff-asset:${escapeRegExp(id)}\\)\\s*`, "g"));
  let changed = false;
  const now = nowIso();
  const artifacts = state.artifactStore.artifacts.map((artifact) => {
    if (typeof artifact.body !== "string") return artifact;
    const nextBody = patterns.reduce((body, pattern) => body.replace(pattern, ""), artifact.body).trim();
    if (nextBody === artifact.body) return artifact;
    changed = true;
    return { ...artifact, body: nextBody, edited: now };
  });
  if (changed) persistArtifactStore({ ...state.artifactStore, artifacts });
}

async function deleteSelectedGalleryImages() {
  const ids = state.gallerySelectedIds.filter((id) => (state.galleryImages || []).some((image) => image.id === id));
  if (!ids.length) return;
  const label = `${ids.length} image${ids.length === 1 ? "" : "s"}`;
  if (!window.confirm(`Delete ${label} from the gallery and remove their note references?`)) return;
  try {
    await deleteLocalImages(ids);
    removeDeletedImageReferences(ids);
    setState({
      galleryImages: (state.galleryImages || []).filter((image) => !ids.includes(image.id)),
      gallerySelectedIds: []
    });
  } catch (error) {
    window.alert(error instanceof Error ? error.message : `Could not delete ${label}.`);
  }
}

function spiritHtml() {
  const note = findArtifact(state.artifactStore, state.selectedArtifactId);
  if (note?.dashboard === "Spirit" && state.artifactMode === "editor") return dashboardNoteEditorHtml(note);
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
  if (selected) return spiritBookHtml(selected);

  const works = spiritWorks();
  const years = spiritYears();
  const activeYear = years.includes(state.spiritYear) ? state.spiritYear : years[0];
  const visibleWorks = works.filter((work) => work.year === activeYear);
  const yearIndex = years.indexOf(activeYear);

  const spiritControls = `
    <div class="action-row spirit-actions spirit-selector-actions">
      <button class="secondary-button" data-action="new-artifact-note" data-dashboard="Spirit" type="button">${buttonContent("tabler:notes", "New Note")}</button>
      <label class="plan-select-label">
        <span>Plan</span>
        <select class="plan-select" data-action="select-spirit-plan" aria-label="Select reading plan">
          ${SPIRIT_PLANS.map((plan) => `
            <option value="${escapeHtml(plan.id)}"${state.spiritPlanId === plan.id ? " selected" : ""}>${escapeHtml(plan.label)}</option>
          `).join("")}
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
            ${years.map((year) => `
              <button class="spirit-year-button${year === activeYear ? " is-active" : ""}" data-action="set-spirit-year" data-year="${year}" type="button" aria-pressed="${year === activeYear ? "true" : "false"}">
                ${escapeHtml(year)}
              </button>
            `).join("")}
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
  const outputs = Array.isArray(work.blackBox?.outputs) ? work.blackBox.outputs : [];
  const inputs = Array.isArray(work.blackBox?.inputs) ? work.blackBox.inputs : work.greatIdeas;
  return panelHtml(`
    ${headerHtml(work.title, `${work.author}${work.selection ? ` / ${work.selection}` : ""}`, `
      <div class="action-row">
        <button class="secondary-button" data-action="add-spirit-book-note" data-key="${escapeHtml(work.key)}" type="button">${buttonContent("tabler:notes", "Add Note")}</button>
        <button class="secondary-button" data-action="toggle-spirit-complete" data-key="${escapeHtml(work.key)}" type="button">${buttonContent(complete ? "tabler:circle-off" : "tabler:circle-check", complete ? "Mark Incomplete" : "Mark Complete")}</button>
        <button class="icon-button close-viewer-button" data-action="exit-spirit-book" type="button" aria-label="Exit reading" title="Exit">${iconHtml("tabler:x")}</button>
      </div>
    `)}
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
  if (state.artifactMode === "editor" && note) return dashboardNoteEditorHtml(note);
  if (state.artifactMode === "viewer" && note) return artifactReaderHtml(note, `${dashboardDisplayLabel(dashboard)} note`);

  const notes = rootNotesForDashboard(state.artifactStore, dashboard);
  return panelHtml(`
    ${headerHtml(`${dashboardDisplayLabel(dashboard)} Notes`, "Shared artifacts stored in the local browser first, ready for later analysis across the full root database.", `<button class="secondary-button" data-action="new-artifact-note" data-dashboard="${dashboard}">${buttonContent("tabler:notes", "New Note")}</button>`)}
    ${notes.length ? `
      <div class="scroll-area">
        <div class="section-list">
          ${notes.map((noteItem, index) => `
            <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(noteItem.title)}</strong>
              <small>${escapeHtml(shortSummary(noteItem.body, "No note text yet"))}</small>
              <em>${iconHtml("tabler:notes")} ${escapeHtml(dashboardDisplayLabel(noteItem.dashboard))}</em>
            </button>
          `).join("")}
        </div>
      </div>
    ` : emptyStateHtml("No notes yet.", `Add the first ${dashboard.toLowerCase()} note to create an artifact.`)}
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
  return text ? renderMarkdown(text) : (emptyText ? `<p>${escapeHtml(emptyText)}</p>` : "");
}

function stripDuplicateTitleLine(title, body) {
  const lines = String(body || "").split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim());
  if (firstContentIndex === -1) return "";
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

function artifactReaderHtml(note, subtitle) {
  return panelHtml(`
    ${headerHtml(note.title, "", artifactViewerActions(note))}
    <div class="reader-panel"><div class="markdown-body">${readerBodyHtml(note.title, note.body)}</div></div>
  `);
}

function lifeEvents() {
  if (!state.artifactStore) return [];
  const events = [];
  const addEvent = (event) => {
    const timestamp = event.timestamp || `${event.dateKey}T12:00:00`;
    const minuteKey = Number.isNaN(new Date(timestamp).getTime())
      ? String(timestamp)
      : new Date(timestamp).toISOString().slice(0, 16);
    const title = event.role === "thought" && event.thoughtLabel
      ? event.thoughtLabel
      : event.role === "goal-progress" && event.goalLabel
        ? event.goalLabel
        : event.title;
    const eventKey = [
      event.artifactId,
      event.dashboard,
      event.type,
      minuteKey,
      title
    ].join("|");
    if (events.some((existing) => existing.eventKey === eventKey)) return;
    const artifact = findArtifact(state.artifactStore, event.artifactId);
    events.push({ ...event, eventKey, parentId: artifact?.parentId || "" });
  };
  state.artifactStore.artifacts.forEach((artifact) => {
    if (artifact.properties?.role === "spirit-reading-plan-item") return;
    if (artifact.properties?.role === "thought") {
      const timestamp = artifact.properties?.thoughtLoggedAt || artifact.created || artifact.edited;
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
        timestamp
      });
      return;
    }
    if (artifact.properties?.role === "goal-progress") {
      const timestamp = artifact.properties?.goalLoggedAt || artifact.created || artifact.edited;
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
        timestamp
      });
      return;
    }
    const auditEntries = Array.isArray(artifact.properties?.audit) ? artifact.properties.audit : [];
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
          dateKey: dateKeyFromValue(entry.dateKey || entry.at || artifact.edited || artifact.created),
          timestamp: entry.at || artifact.edited || artifact.created
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
        dateKey: dateKeyFromValue(artifact.properties?.dateKey || artifact.created),
        timestamp: artifact.created
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
        timestamp: artifact.edited
      });
    }
  });
  return events.sort((a, b) => (Date.parse(b.timestamp) || Date.parse(b.dateKey)) - (Date.parse(a.timestamp) || Date.parse(a.dateKey)));
}

function lifeCalendarEventTitle(event) {
  if (event.role === "thought" && event.thoughtLabel) return event.thoughtLabel;
  if (event.role === "goal-progress" && event.goalLabel) return event.goalLabel;
  return event.title;
}

function lifeCalendarEvents() {
  return lifeEvents().map((event) => ({
    id: event.id,
    title: lifeCalendarEventTitle(event),
    start: event.timestamp && !Number.isNaN(new Date(event.timestamp).getTime())
      ? event.timestamp
      : `${event.dateKey}T12:00:00`,
    allDay: false,
    extendedProps: {
      artifactId: event.artifactId,
      parentId: event.parentId || "",
      dashboard: event.dashboard,
      action: event.action,
      fullTitle: event.title,
      meta: event.changed.length ? event.changed.join(", ") : event.type
    },
    classNames: [`life-calendar-event--${event.dashboard.toLowerCase()}`]
  }));
}

function renderLifeMonthCalendar() {
  const calendarEl = document.getElementById("life-fullcalendar");
  if (!calendarEl || state.active !== "Life" || state.lifeMode !== "month") return;
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
      if (artifactId) openActivityArtifact(artifactId);
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
    }
  });
  calendar.render();
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
  const canOpen = artifact?.type === "compendium" || (artifact?.type === "note" && (!artifact.parentId || artifact.dashboard === "Mind"));
  const className = `life-event-row${variant ? ` life-event-row--${variant}` : ""}`;
  return canOpen
    ? `<button class="${className}" data-action="open-life-activity" data-id="${event.artifactId}" type="button">${inner}</button>`
    : `<div class="${className}">${inner}</div>`;
}

function lifeJournalMetaHtml(note) {
  const habits = Array.isArray(note.properties?.habits) ? note.properties.habits : [];
  return `
    <div class="life-journal-meta">
      <span>${iconHtml("tabler:calendar")} ${escapeHtml(formatDateLabel(note.properties?.dateKey || note.edited || note.created, { weekday: true, year: true }))}</span>
      <span>${iconHtml("tabler:mood-smile")} ${escapeHtml(note.properties?.mood || "steady")}</span>
      <span>${iconHtml("tabler:bolt")} ${escapeHtml(note.properties?.energy || "medium")}</span>
      ${habits.map((habit) => `<span>${iconHtml("tabler:circle-check")} ${escapeHtml(habit)}</span>`).join("")}
    </div>
  `;
}

function lifeHtml() {
  const note = findArtifact(state.artifactStore, state.selectedArtifactId);
  if (state.artifactMode === "editor" && note?.dashboard === "Life" && note.properties?.role === "life-journal") return lifeJournalEditorHtml(note);
  if (state.artifactMode === "editor" && note) return dashboardNoteEditorHtml(note);
  if (state.artifactMode === "viewer" && note) {
    if (note.dashboard !== "Life") return artifactReaderHtml(note, `${dashboardDisplayLabel(note.dashboard)} note`);
    if (note.properties?.role !== "life-journal") return artifactReaderHtml(note, `${dashboardDisplayLabel("Life")} thought`);
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
    ${headerHtml(dashboardDisplayLabel("Life"), "Calendar-first journal, habits, and app activity.", "", { titleHtml: dashboardHeaderTitleHtml("Life") })}
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
  const activeTool = ["todo", "projects", "calendar"].includes(state.lifeTool) ? state.lifeTool : "calendar";
  const modes = [
    ["calendar", "Calendar", "tabler:calendar-month"],
    ["todo", "Todo List", "tabler:checkbox"],
    ["projects", "Projects", "tabler:folders"]
  ];
  return `
    <nav class="life-mode-switcher life-tool-switcher" aria-label="${escapeHtml(dashboardDisplayLabel("Life"))} tools">
      ${modes.map(([mode, label, icon]) => `
        <button class="body-mode-button${activeTool === mode ? " is-active" : ""}" data-action="set-life-tool" data-tool="${mode}" type="button" aria-pressed="${activeTool === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
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
    ["list", "List", "tabler:list-details"]
  ];
  return `
    <nav class="life-calendar-switcher" aria-label="Calendar views">
      ${modes.map(([mode, label, icon]) => `
        <button class="body-mode-button${state.lifeMode === mode ? " is-active" : ""}" data-action="set-life-mode" data-mode="${mode}" type="button" aria-pressed="${state.lifeMode === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
    </nav>
  `;
}

function lifePanelHtml() {
  const tool = ["todo", "projects", "calendar"].includes(state.lifeTool) ? state.lifeTool : "calendar";
  if (tool === "todo") return lifeTodoHtml();
  if (tool === "projects") return lifeProjectsHtml();
  return `
    <div class="life-calendar-viewer">
      ${lifeCalendarModeSwitcherHtml()}
      ${lifeCalendarPanelHtml()}
    </div>
  `;
}

function lifeCalendarPanelHtml() {
  if (state.lifeMode === "day") return lifeDayHtml();
  if (state.lifeMode === "week") return lifeWeekHtml();
  if (state.lifeMode === "list") return lifeListHtml();
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
        ${days.map(({ dateKey, events }) => `
          <section class="life-date-group">
            <h3>${escapeHtml(formatDateLabel(dateKey, { weekday: true, year: true }))}</h3>
            <div class="life-event-list">${events.length ? events.map(lifeEventRowHtml).join("") : "<p>No activity.</p>"}</div>
          </section>
        `).join("")}
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
                ${events.slice(0, 3).map((event) => `<small><em>${escapeHtml(formatEventTime(event.timestamp))}</em><span>${escapeHtml(dashboardDisplayLabel(event.dashboard))} ${escapeHtml(event.action)}</span></small>`).join("")}
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
    if (!grouped.has(event.dateKey)) grouped.set(event.dateKey, []);
    grouped.get(event.dateKey).push(event);
  });
  return `
    <section class="body-card life-card">
      <div class="life-date-list">
        ${grouped.size ? Array.from(grouped.entries()).map(([dateKey, events]) => `
          <section class="life-date-group">
            <h3>${escapeHtml(formatDateLabel(dateKey, { weekday: true, year: true }))}</h3>
            <div class="life-event-list">${events.map(lifeEventRowHtml).join("")}</div>
          </section>
        `).join("") : emptyStateHtml("No activity yet.", "Create or edit notes to build the app activity calendar.")}
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
  const dateLabel = task.assignedDate ? formatDateLabel(task.assignedDate, { year: true }) : "No date";
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
  const projectCount = tasks.filter((task) => task.source === "project-task").length;
  const standaloneCount = tasks.filter((task) => task.source === "todo").length;
  const scheduledCount = tasks.filter((task) => task.assignedDate && task.status !== "complete").length;
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
      ? entity.phases.reduce((sum, phase) => sum + (phase.tasks?.length || 0), 0)
      : null;
  const detail = [
    entity.status || "planned",
    phaseCount !== null ? `${phaseCount} phase${phaseCount === 1 ? "" : "s"}` : "",
    taskCount !== null ? `${taskCount} task${taskCount === 1 ? "" : "s"}` : "",
    entity.assignedDate ? formatDateLabel(entity.assignedDate) : ""
  ].filter(Boolean).join(" / ");
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
          <p>Files stay local now and keep storage metadata for later cloud storage.</p>
        </div>
        <button class="secondary-button" data-action="upload-life-attachment" data-level="${level}" type="button">${buttonContent("tabler:paperclip", "Upload")}</button>
      </div>
      <div class="life-attachment-list">
        ${attachments.length ? attachments.map((attachment) => `
          <div class="life-attachment-item">
            <a href="#" data-local-file-link="${escapeHtml(attachment.id)}" target="_blank" rel="noopener noreferrer">${iconHtml("tabler:file")} ${escapeHtml(attachment.name || attachment.id)}</a>
            <small>${escapeHtml(formatFileSize(attachment.size))}</small>
            <button class="icon-button danger-button" data-action="delete-life-attachment" data-level="${level}" data-id="${escapeHtml(attachment.id)}" type="button" aria-label="Remove attachment" title="Remove">${iconHtml("tabler:x")}</button>
          </div>
        `).join("") : "<p>No attachments yet.</p>"}
      </div>
    </section>
  `;
}

function formatFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes >= 1048576) return `${Math.round(bytes / 104857.6) / 10} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${bytes} B`;
}

function lifeEntityStatusOptions(level, value) {
  const options = level === "task"
    ? ["todo", "active", "waiting", "complete"]
    : ["planned", "active", "waiting", "complete"];
  return options.map((option) => `<option value="${option}"${value === option ? " selected" : ""}>${escapeHtml(option)}</option>`).join("");
}

function lifeProjectDetailHtml(level, entity) {
  const label = level === "task" ? "Task" : level === "phase" ? "Phase" : "Project";
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
  const phaseCount = projects.reduce((sum, item) => sum + (item.phases?.length || 0), 0);
  const taskCount = projects.reduce((sum, item) =>
    sum + (item.phases || []).reduce((phaseSum, phaseItem) => phaseSum + (phaseItem.tasks?.length || 0), 0), 0);
  const openTaskCount = projects.reduce((sum, item) =>
    sum + (item.phases || []).reduce((phaseSum, phaseItem) =>
      phaseSum + (phaseItem.tasks || []).filter((taskItem) => taskItem.status !== "complete").length, 0), 0);
  const detail = task
    ? lifeProjectDetailHtml("task", task)
    : phase
      ? lifeProjectDetailHtml("phase", phase)
      : project
        ? lifeProjectDetailHtml("project", project)
        : emptyStateHtml("Select or add a project.", "Projects organize phases, tasks, notes, status, assignments, and attachments.");
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
          ${project ? `
            <div class="life-quick-add">
              <input id="life-phase-title" type="text" placeholder="New phase">
              <button class="secondary-button" data-action="add-life-phase" data-project-id="${escapeHtml(project.id)}" type="button">${buttonContent("tabler:plus", "Phase")}</button>
            </div>
            <div class="life-project-nav-section">
              <h4>Phases</h4>
              ${project.phases.length ? project.phases.map((item) => lifeProjectNavButtonHtml(item, "select-life-phase", item.id === phase?.id, `data-id="${escapeHtml(item.id)}"`)).join("") : "<p>No phases yet.</p>"}
            </div>
          ` : emptyStateHtml("Pick a project.", "Choose a project to add phases and tasks.")}
          ${project && phase ? `
            <div class="life-quick-add">
              <input id="life-task-title" type="text" placeholder="New task">
              <button class="secondary-button" data-action="add-life-project-task" data-project-id="${escapeHtml(project.id)}" data-phase-id="${escapeHtml(phase.id)}" type="button">${buttonContent("tabler:plus", "Task")}</button>
            </div>
            <div class="life-project-nav-section">
              <h4>Tasks</h4>
              ${phase.tasks.length ? phase.tasks.map((item) => lifeProjectNavButtonHtml(item, "select-life-task", item.id === task?.id, `data-task-id="${escapeHtml(item.id)}"`)).join("") : "<p>No tasks yet.</p>"}
            </div>
          ` : ""}
        </section>
        <section class="life-project-body">
          ${detail}
        </section>
      </div>
    </section>
  `;
}

function lifeNotesHtml() {
  const notes = lifeNotes();
  return `
    <section class="body-card life-card body-card--notes">
      <div class="body-card-heading">
        <div>
          <h3>Journal Notes</h3>
          <p>Daylio-inspired entries with quick habits, mood, and journal text.</p>
        </div>
        <button class="secondary-button" data-action="new-artifact-note" data-dashboard="Life">${buttonContent("tabler:notes", "New Note")}</button>
      </div>
      ${notes.length ? `
        <div class="section-list body-notes-list">
          ${notes.map((noteItem, index) => `
            <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(noteItem.title)}</strong>
              <small>${escapeHtml([noteItem.properties?.mood, ...(noteItem.properties?.habits || [])].filter(Boolean).join(" / ") || shortSummary(noteItem.body, "No journal text yet"))}</small>
              <em>${iconHtml("tabler:calendar")} ${escapeHtml(noteItem.properties?.dateKey || noteDateLabel(noteItem))}</em>
            </button>
          `).join("")}
        </div>
        ` : emptyStateHtml(`No ${dashboardDisplayLabel("Life")} notes yet.`, "Add a journal note to track a day, habit, goal, or reflection.")}
    </section>
  `;
}

function bodyTimerSwitcherHtml() {
  return `
    <nav class="body-mode-switcher body-timer-switcher" aria-label="${escapeHtml(dashboardDisplayLabel("Body"))} timers">
      ${BODY_TIMER_MODES.map(({ key, label, icon }) => `
        <button class="body-mode-button${state.bodyTimerMode === key ? " is-active" : ""}" data-action="set-body-timer-mode" data-mode="${key}" type="button" aria-pressed="${state.bodyTimerMode === key ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
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
        ${timer.active
          ? `<button class="secondary-button danger-button" data-action="stop-body-timer" data-mode="${key}">${buttonContent("tabler:player-stop", config.stopText)}</button>`
          : `<button class="primary-button" data-action="start-body-timer" data-mode="${key}">${buttonContent("tabler:player-play", config.startText)}</button>`}
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
    ["goals", "Nutrition Goals", "tabler:target-arrow"]
  ];
  return `
    <nav class="body-mode-switcher body-nutrition-switcher" aria-label="Nutrition views">
      ${modes.map(([mode, label, icon]) => `
        <button class="body-mode-button${state.bodyNutritionMode === mode ? " is-active" : ""}" data-action="set-body-nutrition-mode" data-mode="${mode}" type="button" aria-pressed="${state.bodyNutritionMode === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
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
      ${state.bodyNutritionMode === "goals"
        ? bodyNutritionGoalsHtml(nutrition)
        : bodyNutritionDailyHtml(nutrition, nutritionDashOffset)}
    </div>
  `;
}

function bodyHtml() {
  const note = findArtifact(state.artifactStore, state.selectedArtifactId);
  if (state.artifactMode === "editor" && note) return dashboardNoteEditorHtml(note);
  if (state.artifactMode === "viewer" && note) return artifactReaderHtml(note, `${dashboardDisplayLabel("Body")} note`);

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
        ${notes.length ? `
          <div class="section-list body-notes-list">
            ${notes.map((noteItem, index) => `
              <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <strong>${escapeHtml(noteItem.title)}</strong>
                <small>${escapeHtml(shortSummary(noteItem.body, "No note text yet"))}</small>
                <em>${iconHtml("tabler:notes")} Note</em>
              </button>
            `).join("")}
          </div>
        ` : emptyStateHtml(`No ${dashboardDisplayLabel("Body")} notes yet.`, "Add a note to track fasting, meals, symptoms, workouts, or measurements.")}
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
      </section>`
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
    ["notes", "Notes", "tabler:notes"]
  ];
  return `
    <nav class="body-mode-switcher body-tool-switcher" aria-label="${escapeHtml(dashboardDisplayLabel("Body"))} tools">
      ${modes.map(([mode, label, icon]) => `
        <button class="body-mode-button${state.bodyMode === mode ? " is-active" : ""}" data-action="set-body-mode" data-mode="${mode}" type="button" aria-pressed="${state.bodyMode === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
    </nav>
  `;
}

function mindHtml(compendium, section) {
  const note = findArtifact(state.artifactStore, state.selectedArtifactId);
  if (state.artifactMode === "editor" && note?.dashboard === "Mind") return dashboardNoteEditorHtml(note);
  if (state.artifactMode === "viewer" && note?.dashboard === "Mind") return artifactReaderHtml(note, `${dashboardDisplayLabel("Mind")} note`);
  if (state.mindMode === "compendium-editor" && compendium) return compendiumEditorHtml(compendium);
  if (state.mindMode === "section-editor" && section) return sectionEditorHtml(section);
  if (state.mindMode === "section-viewer" && section) {
    return panelHtml(`
      ${headerHtml(section.title, "", `
        <div class="action-row">
          ${pageActionButton("edit-section", "tabler:pencil", "Edit section")}
          ${pageActionButton("delete-section", "tabler:trash", "Delete section", { danger: true, data: { id: section.id } })}
          ${pageActionButton("manager", "tabler:x", "Close section viewer", { className: "close-viewer-button" })}
        </div>
      `)}
      <div class="reader-panel"><div class="markdown-body">${readerBodyHtml(section.title, section.body)}</div></div>
    `);
  }
  if (state.mindMode === "reader" && compendium) return compendiumReaderHtml(compendium);
  if (state.mindMode === "manager" && compendium) return compendiumManagerHtml(compendium);
  return mindGridHtml();
}

function truncatedWordsText(value, maxWords = 15) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return { text: "", truncated: false, wordCount: 0 };
  const words = text.split(" ");
  if (words.length <= maxWords) return { text, truncated: false, wordCount: words.length };
  return {
    text: `${words.slice(0, maxWords).join(" ")}...`,
    truncated: true,
    wordCount: words.length
  };
}

function compendiumTitleSizeClass(title) {
  const normalized = String(title || "").trim().replace(/\s+/g, " ");
  const words = normalized ? normalized.split(" ").length : 0;
  if (words > 11 || normalized.length > 68) return " is-very-long";
  if (words > 7 || normalized.length > 44) return " is-long";
  return "";
}

function compendiumTitleHtml(compendium, className = "compendium-tile-title") {
  const title = String(compendium?.title || "Untitled compendium");
  const displayTitle = truncatedWordsText(title, 15);
  return `<span class="${className}${compendiumTitleSizeClass(displayTitle.text)}" title="${escapeHtml(title)}">${escapeHtml(displayTitle.text)}</span>`;
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
  const currentStart = page * perPage + 1;
  const currentEnd = Math.min(state.compendiums.length, currentStart + perPage - 1);
  return panelHtml(`
    <div class="scroll-area mind-grid-scroll">
      ${headerHtml(dashboardDisplayLabel("Mind"), "Organize your knowledge with a compendium.", "", { titleHtml: dashboardHeaderTitleHtml("Mind") })}
      ${dashboardOrbNavHtml("Mind")}
      ${state.compendiums.length ? `
        <section class="compendium-rotator${state.mindCompendiumPickerOpen ? " is-picker-open" : ""}" aria-label="Compendiums" style="--compendium-columns: ${columns};">
          <div class="compendium-rotator-stage${shouldPage ? "" : " compendium-rotator-stage--single-page"}">
            ${shouldPage ? `<button class="compendium-rotator-edge compendium-rotator-edge--prev${hasPrev ? " is-available" : ""}" data-action="mind-compendium-page" data-direction="prev" data-max-page="${maxPage}" type="button" aria-label="Previous compendiums"${hasPrev ? "" : " disabled"}>
              ${iconHtml("tabler:chevron-left")}
            </button>` : ""}
            <div class="compendium-rotator-window">
              <div class="compendium-rotator-track" style="--compendium-page: ${page};">
                ${pages.map((compendiums, pageIndex) => `
                  <article class="compendium-rotator-slide${pageIndex === page ? " is-active" : ""}">
                    <div class="compendium-rotator-row">
                      ${compendiums.map((compendium, itemIndex) => {
                        const compendiumNumber = itemIndex + 1;
                        return `
                        <button class="compendium-tile" data-action="open-compendium" data-id="${compendium.id}">
                          <b>${String(compendiumNumber).padStart(2, "0")}</b>
                          ${compendiumTitleHtml(compendium)}
                          <small>${compendium.sections.length} section${compendium.sections.length === 1 ? "" : "s"}</small>
                          <em>edited ${escapeHtml(compendium.edited)}</em>
                        </button>
                      `; }).join("")}
                    </div>
                  </article>
                `).join("")}
              </div>
            </div>
            ${shouldPage ? `<button class="compendium-rotator-edge compendium-rotator-edge--next${hasNext ? " is-available" : ""}" data-action="mind-compendium-page" data-direction="next" data-max-page="${maxPage}" type="button" aria-label="Next compendiums"${hasNext ? "" : " disabled"}>
              ${iconHtml("tabler:chevron-right")}
            </button>` : ""}
            ${state.mindCompendiumPickerOpen ? `
              <div class="compendium-picker-popover" role="dialog" aria-label="All compendiums">
                <div class="compendium-picker-header">
                  <strong>Compendiums</strong>
                  <p>Organize your knowledge with a compendium.</p>
                </div>
                <div class="compendium-picker-grid">
                  ${state.compendiums.map((compendium, index) => `
                    <button class="compendium-picker-tile" data-action="select-mind-compendium" data-id="${compendium.id}" data-index="${index}" data-per-page="${perPage}" type="button">
                      <b>${String(index + 1).padStart(2, "0")}</b>
                      ${compendiumTitleHtml(compendium, "compendium-picker-title")}
                    </button>
                  `).join("")}
                </div>
                <div class="compendium-picker-actions">
                  <button class="secondary-button" data-action="new-compendium" type="button">${buttonContent("tabler:plus", "Add Compendium")}</button>
                </div>
              </div>
            ` : ""}
          </div>
        </section>
      ` : `<div class="compendium-empty-wrap">${emptyStateHtml("No compendiums yet.", `Add the first compendium to begin organizing ${dashboardDisplayLabel("Mind")}.`)}</div>`}
      <div class="compendium-grid-controls">
        <button class="reader-page-indicator compendium-page-indicator" data-action="toggle-mind-compendium-picker" type="button" aria-label="${state.mindCompendiumPickerOpen ? "Close compendium overview" : "Open compendium overview"}" aria-expanded="${state.mindCompendiumPickerOpen ? "true" : "false"}">
          <span class="reader-page-dot reader-page-dot--side${hasPrev ? " is-available" : ""}" aria-hidden="true"></span>
          <span class="reader-page-dot reader-page-dot--current" aria-label="Compendiums ${currentStart} through ${currentEnd} of ${state.compendiums.length}"></span>
          <span class="reader-page-dot reader-page-dot--side${hasNext ? " is-available" : ""}" aria-hidden="true"></span>
        </button>
        <p>click here for a grid view</p>
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
        ${compendium.sections.map((section, index) => `
          <button class="section-row" data-action="open-section" data-id="${escapeHtml(section.id)}" data-section-row>
            <span class="section-number-handle" data-section-drag-handle data-id="${escapeHtml(section.id)}" title="Drag to reorder" aria-label="Drag section ${String(compendium.sections.length - index).padStart(2, "0")} to reorder">${String(compendium.sections.length - index).padStart(2, "0")}</span>
            <strong>${escapeHtml(section.title)}</strong>
            <small>${escapeHtml(section.body.replace(/[#>*`-]/g, ""))}</small>
          </button>
        `).join("")}
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
      `
    },
    ...compendium.sections.map((section) => ({
      key: section.id,
      body: `
        <section class="reader-section">
          <button class="reader-section-title" data-action="open-section" data-id="${section.id}">${escapeHtml(section.title)}</button>
          <div class="markdown-body">${renderMarkdown(section.body)}</div>
        </section>
      `
    }))
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
            ${pages.map((item, index) => `
              <article class="reader-slide${index === page ? " is-active" : ""}" data-reader-page="${index}">
                ${item.body}
              </article>
            `).join("")}
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
    valueBody: compendium.body
  });
}

function sectionEditorHtml(section) {
  return editorHtml({
    title: "Edit Section",
    subtitle: "This can be a chapter, part, terms list, index, or any future compendium unit.",
    saveAction: "save-section",
    cancelAction: "section-viewer",
    id: section.id,
    valueTitle: section.title,
    valueBody: section.body
  });
}

function dashboardNoteEditorHtml(note) {
  if (note.dashboard === "Life" && note.properties?.role === "life-journal") return lifeJournalEditorHtml(note);
  const isThought = note.properties?.role === "thought";
  const isGoalProgress = note.properties?.role === "goal-progress";
  const dashboardName = dashboardDisplayLabel(note.dashboard);
  return editorHtml({
    title: isGoalProgress ? "Edit Goal Progress" : isThought ? "Edit Thought" : "Edit Note",
    subtitle: isGoalProgress
      ? `${dashboardName} goal / ${note.properties?.goalLabel || "Goal progress"}`
      : isThought
        ? `${dashboardName} thought / ${note.properties?.thoughtLabel || "Quick thought"}`
        : `${dashboardName} artifact note. It uses the same root schema as every dashboard.`,
    saveAction: "save-artifact-note",
    cancelAction: "artifact-viewer",
    id: note.id,
    valueTitle: note.title,
    valueBody: note.body
  });
}

function lifeJournalEditorHtml(note) {
  const habits = Array.isArray(note.properties?.habits) ? note.properties.habits : [];
  const habitOptions = [
    ["Move", "tabler:walk"],
    ["Read", "tabler:book-2"],
    ["Create", "tabler:palette"],
    ["Clean", "tabler:sparkles"],
    ["Budget", "tabler:coins"],
    ["Connect", "tabler:message-circle-heart"],
    ["Pray", "tabler:hands-pray"],
    ["Sleep", "tabler:moon"]
  ];
  return panelHtml(`
      ${headerHtml("Edit Life Note", "Journal entry with quick habit markers.", `
      <div class="action-row">
        ${pageActionButton("delete-artifact-note", "tabler:trash", "Delete note", { danger: true, data: { id: note.id } })}
        ${pageActionButton("artifact-viewer", "tabler:x", "Close editor", { className: "close-viewer-button" })}
      </div>
    `)}
    <form class="editor-form life-editor-form">
      <input id="editor-title" value="${escapeHtml(note.title)}" aria-label="Title">
      <div class="life-editor-grid">
        <label class="body-field">Date<input id="life-entry-date" type="date" value="${escapeHtml(note.properties?.dateKey || todayDateKey())}"></label>
        <label class="body-field">Mood
          <select id="life-entry-mood">
            ${["great", "good", "steady", "low", "hard"].map((mood) => `<option value="${mood}"${(note.properties?.mood || "steady") === mood ? " selected" : ""}>${mood}</option>`).join("")}
          </select>
        </label>
        <label class="body-field">Energy
          <select id="life-entry-energy">
            ${["high", "medium", "low"].map((energy) => `<option value="${energy}"${(note.properties?.energy || "medium") === energy ? " selected" : ""}>${energy}</option>`).join("")}
          </select>
        </label>
      </div>
      <fieldset class="life-habit-fieldset">
        <legend>Habits</legend>
        <div class="life-habit-grid">
          ${habitOptions.map(([habit, icon]) => `
            <label class="life-habit-pill">
              <input data-life-habit type="checkbox" value="${escapeHtml(habit)}"${habits.includes(habit) ? " checked" : ""}>
              <span class="life-habit-icon">${iconHtml(icon)}</span>
              <span class="life-habit-label">${escapeHtml(habit)}</span>
            </label>
          `).join("")}
        </div>
      </fieldset>
      <label class="body-field editor-body-field">Journal
        <span class="editor-body-wrap has-image-button">
          <textarea id="editor-body" aria-label="Body" placeholder="What happened today? What needs attention?">${escapeHtml(note.body)}</textarea>
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

function editorHtml({ title, subtitle, saveAction, cancelAction, id, valueTitle, valueBody }) {
  return panelHtml(`
    ${headerHtml(title, subtitle, `
      <div class="action-row">
        ${saveAction === "save-artifact-note" ? pageActionButton("delete-artifact-note", "tabler:trash", "Delete note", { danger: true, data: { id } }) : ""}
        ${saveAction === "save-compendium" ? pageActionButton("delete-compendium", "tabler:trash", "Delete compendium", { danger: true, data: { id } }) : ""}
        ${saveAction === "save-section" ? pageActionButton("delete-section", "tabler:trash", "Delete section", { danger: true, data: { id } }) : ""}
        ${pageActionButton(cancelAction, "tabler:x", "Close editor", { className: "close-viewer-button" })}
      </div>
    `)}
    <form class="editor-form">
      <input id="editor-title" value="${escapeHtml(valueTitle)}" aria-label="Title">
      <div class="editor-body-wrap has-image-button">
        <textarea id="editor-body" aria-label="Body">${escapeHtml(valueBody)}</textarea>
        ${editorImageButtonHtml()}
      </div>
      <div class="editor-footer-actions">
        <button class="secondary-button" data-action="${cancelAction}" type="button">${buttonContent("tabler:x", "Cancel")}</button>
        <button class="secondary-button" data-action="${saveAction}" data-id="${id}" type="button">${buttonContent("tabler:device-floppy", "Save")}</button>
      </div>
    </form>
  `);
}

function prefersCameraCapture() {
  return Boolean(window.matchMedia?.("(pointer: coarse)").matches || window.matchMedia?.("(max-width: 860px)").matches);
}

function editorImageButtonHtml() {
  const camera = prefersCameraCapture();
  return `
    <button class="icon-button editor-image-button" data-editor-image-button type="button" aria-label="${camera ? "Take photo" : "Upload image"}" title="${camera ? "Take Photo" : "Upload Image"}">
      ${iconHtml(camera ? "tabler:camera" : "tabler:photo")}
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
  const label = target?.dataset?.thoughtTooltip;
  if (!label) return;
  hideThoughtTooltip();
  const tooltip = document.createElement("div");
  tooltip.className = "thought-tooltip";
  tooltip.setAttribute("role", "tooltip");
  const thoughtColor = window.getComputedStyle(target).getPropertyValue("--thought-color").trim();
  if (thoughtColor) tooltip.style.setProperty("--thought-color", thoughtColor);
  tooltip.innerHTML = `<span>${escapeHtml(label)}</span><i aria-hidden="true"></i>`;
  document.body.append(tooltip);

  const update = () => {
    computePosition(target, tooltip, {
      placement: "top",
      strategy: "fixed",
      middleware: [offset(10), flip(), shift({ padding: 8 })]
    }).then(({ x, y }) => {
      Object.assign(tooltip.style, {
        left: `${x}px`,
        top: `${y}px`
      });
      tooltip.dataset.ready = "true";
    });
  };
  thoughtTooltipCleanup = autoUpdate(target, tooltip, update);
  update();
}

function bindThoughtTooltips() {
  app.querySelectorAll("[data-thought-tooltip]").forEach((element) => {
    element.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      showThoughtTooltip(element);
    });
    element.addEventListener("pointerleave", hideThoughtTooltip);
    element.addEventListener("focus", () => showThoughtTooltip(element));
    element.addEventListener("blur", hideThoughtTooltip);
    element.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") return;
      window.clearTimeout(thoughtTooltipLongPressTimer);
      thoughtTooltipSuppressClickTarget = null;
      thoughtTooltipLongPressTimer = window.setTimeout(() => {
        thoughtTooltipSuppressClickTarget = element;
        showThoughtTooltip(element);
      }, THOUGHT_TOOLTIP_LONG_PRESS_MS);
    });
    element.addEventListener("pointerup", () => window.clearTimeout(thoughtTooltipLongPressTimer));
    element.addEventListener("pointercancel", hideThoughtTooltip);
    element.addEventListener("click", (event) => {
      if (thoughtTooltipSuppressClickTarget !== element) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      thoughtTooltipSuppressClickTarget = null;
      hideThoughtTooltip();
    }, { capture: true });
  });
}

function headerActionLabel(button) {
  return (
    button.dataset.thoughtTooltip ||
    button.getAttribute("aria-label") ||
    button.getAttribute("title") ||
    button.querySelector(".button-label, .body-mode-label")?.textContent?.trim() ||
    button.textContent?.trim() ||
    ""
  ).trim();
}

function bindHeaderActionTooltips() {
  app.querySelectorAll(".panel-header-actions button").forEach((button) => {
    const label = headerActionLabel(button);
    if (!label) return;
    button.dataset.thoughtTooltip = label;
    if (!button.getAttribute("aria-label")) button.setAttribute("aria-label", label);
    if (!button.getAttribute("title")) button.setAttribute("title", label);
  });
}

function bindActions() {
  app.querySelectorAll("[data-action]").forEach((element) => {
    if (element.closest("[data-icon-picker-overlay]")) return;
    const action = element.dataset.action;
    if (action === "open-donation") return;
    if (action === "select-spirit-plan") {
      element.addEventListener("change", () => selectSpiritPlan(element.value));
    } else {
      element.addEventListener("click", (event) => {
        const actionElement = eventActionElement(event);
        if (actionElement && actionElement !== element) return;
        handleAction(element);
      });
      element.addEventListener("keydown", (event) => {
        if (event.target !== element || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        handleAction(element);
      });
    }
  });
}

function bindDashboardIdentityAutoSave() {
  const panel = app.querySelector(".interface-settings");
  if (!panel) return;
  let saveTimer = null;
  const scheduleSave = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDashboardIdentitySettings, 200);
  };
  panel.querySelectorAll("input[name='dashboard-display-mode'], .dashboard-identity-input-row input").forEach((input) => {
    input.addEventListener("input", scheduleSave);
    input.addEventListener("change", saveDashboardIdentitySettings);
  });
}

function bindTrackerEditorAutoSave() {
  app.querySelectorAll("[data-tracker-edit-form]").forEach((form) => {
    const area = form.dataset.area || "";
    const id = form.dataset.id || "";
    const kind = form.dataset.kind || "thought";
    let saveTimer = null;
    const saveOpenEditor = () => updateTracker(area, id, kind, { close: false, silent: true });
    const scheduleSave = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(saveOpenEditor, 250);
    };
    form.querySelectorAll(".tracker-title-input, .icon-picker-input").forEach((input) => {
      input.addEventListener("input", scheduleSave);
      input.addEventListener("change", saveOpenEditor);
    });
    form.querySelector(".tracker-enabled-toggle input")?.addEventListener("change", saveOpenEditor);
  });
}

function eventActionElement(event) {
  const direct = event.target?.closest?.("[data-action]");
  if (direct) return direct;
  return event.composedPath?.().find((node) => node?.dataset?.action) || null;
}

function bindSidebarResize() {
  return;
}

function bindSidebarHorizontalScroll() {
  app.querySelectorAll(".sidebar-group-items").forEach((element) => {
    element.addEventListener("wheel", (event) => {
      if (element.scrollWidth <= element.clientWidth) return;
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      element.scrollBy({
        left: delta,
        behavior: "smooth"
      });
    }, { passive: false });
  });
}

function updatePathBarOverflow(pathBar) {
  if (!pathBar) return;
  const maxScroll = Math.max(0, pathBar.scrollWidth - pathBar.clientWidth);
  pathBar.classList.toggle("is-overflow-left", pathBar.scrollLeft > 1);
  pathBar.classList.toggle("is-overflow-right", pathBar.scrollLeft < maxScroll - 1);
}

function bindPathBarOverflow() {
  const pathBar = app.querySelector(".path-bar");
  if (!pathBar) return;
  const refresh = () => updatePathBarOverflow(pathBar);
  refresh();
  requestAnimationFrame(refresh);
  pathBar.addEventListener("scroll", refresh, { passive: true });
  pathBar.addEventListener("wheel", (event) => {
    if (pathBar.scrollWidth <= pathBar.clientWidth) return;
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    pathBar.scrollBy({ left: delta, behavior: "smooth" });
    requestAnimationFrame(refresh);
  }, { passive: false });
  window.addEventListener("resize", refresh, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(refresh);
    observer.observe(pathBar);
  }
}

function sectionDropIndex(list, activeRow, pointerY) {
  const rows = Array.from(list.querySelectorAll("[data-section-row]"))
    .filter((row) => row !== activeRow);
  const index = rows.findIndex((row) => {
    const rect = row.getBoundingClientRect();
    return pointerY < rect.top + rect.height / 2;
  });
  return index === -1 ? rows.length : index;
}

function moveSectionRow(list, activeRow, targetIndex) {
  const rows = Array.from(list.querySelectorAll("[data-section-row]"))
    .filter((row) => row !== activeRow);
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
  if (!scrollArea) return;
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
  if (!list) return;

  list.querySelectorAll("[data-section-drag-handle]").forEach((handle) => {
    handle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const activeRow = handle.closest("[data-section-row]");
      const compendiumId = list.dataset.compendiumId;
      const sectionId = activeRow?.dataset.id;
      if (!activeRow || !compendiumId || !sectionId) return;

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
        const targetIndex = sectionDropIndex(list, activeRow, moveEvent.clientY);
        if (!reorderCompendiumSection(compendiumId, sectionId, targetIndex)) return;
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
        if (!moved) return;
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
      if (element.dataset.balanceKey === key) element.classList.toggle("is-linked-hover", enabled);
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
    input.addEventListener("change", () => setDashboardPeriodByIndex(input.value));
  });
}

function bindGalleryControls() {
  app.querySelectorAll("[data-gallery-size-slider]").forEach((input) => {
    input.addEventListener("input", () => {
      state.galleryThumbSize = Math.min(320, Math.max(110, Number(input.value) || 180));
      app.querySelectorAll(".gallery-grid").forEach((grid) => {
        grid.style.setProperty("--gallery-thumb-size", `${state.galleryThumbSize}px`);
      });
    });
  });
  app.querySelectorAll("[data-gallery-select]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.value;
      const selected = new Set(state.gallerySelectedIds);
      if (input.checked) selected.add(id);
      else selected.delete(id);
      setState({ gallerySelectedIds: Array.from(selected) });
    });
  });
}

function bindEditorMedia() {
  const editor = document.getElementById("editor-body");
  if (!editor) return;
  const imageButton = app.querySelector("[data-editor-image-button]");
  if (imageButton) {
    imageButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      editor.focus();
    });
    imageButton.addEventListener("click", async () => {
      const start = editor.selectionStart ?? editor.value.length;
      const end = editor.selectionEnd ?? start;
      const useCamera = prefersCameraCapture();
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = !useCamera;
      if (useCamera) input.setAttribute("capture", "environment");
      input.addEventListener("change", async () => {
        await insertEditorImages(Array.from(input.files || []), { start, end });
      }, { once: true });
      input.click();
    });
  }
  editor.addEventListener("paste", async (event) => {
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    await insertEditorImages(files);
  });
  editor.addEventListener("dragover", (event) => {
    if (Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file" && item.type.startsWith("image/"))) {
      event.preventDefault();
    }
  });
  editor.addEventListener("drop", async (event) => {
    const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    event.preventDefault();
    setEditorCursorFromPoint(event);
    await insertEditorImages(files);
  });
}

function setEditorCursorFromPoint(event) {
  const editor = document.getElementById("editor-body");
  if (!editor) return;
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(event.clientX, event.clientY);
    if (position?.offsetNode === editor.firstChild || position?.offsetNode === editor) {
      editor.setSelectionRange(position.offset, position.offset);
    }
    return;
  }
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(event.clientX, event.clientY);
    if (range) editor.setSelectionRange(range.startOffset, range.startOffset);
  }
}

async function insertEditorImages(files, range = null) {
  const editor = document.getElementById("editor-body");
  if (!editor) return;
  const images = files.filter((file) => file?.type?.startsWith("image/"));
  if (!images.length) return;
  const previousCursor = range?.start ?? editor.selectionStart ?? editor.value.length;
  const previousEnd = range?.end ?? editor.selectionEnd ?? previousCursor;
  const markdownItems = [];
  try {
    for (const image of images) {
      const stored = await storeLocalImage(image);
      markdownItems.push(stored.markdown);
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Could not add image.");
    return;
  }
  insertTextAtEditorCursor(markdownItems.join("\n\n"), previousCursor, previousEnd);
}

function insertTextAtEditorCursor(text, start, end) {
  const editor = document.getElementById("editor-body");
  if (!editor) return;
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

function bindLocalAssetImages() {
  app.querySelectorAll("img[data-local-asset]").forEach(async (image) => {
    try {
      const url = await resolveLocalImageUrl(image.dataset.localAsset);
      if (url) image.src = url;
      else image.classList.add("is-missing");
    } catch {
      image.classList.add("is-missing");
    }
  });
  app.querySelectorAll("a[data-local-asset-link]").forEach(async (link) => {
    link.addEventListener("click", (event) => {
      if (!link.href || link.getAttribute("href") === "#") event.preventDefault();
    });
    try {
      const url = await resolveLocalImageUrl(link.dataset.localAssetLink);
      if (url) link.href = url;
      else link.classList.add("is-missing");
    } catch {
      link.classList.add("is-missing");
    }
  });
  app.querySelectorAll("a[data-local-file-link]").forEach(async (link) => {
    link.addEventListener("click", (event) => {
      if (!link.href || link.getAttribute("href") === "#") event.preventDefault();
    });
    try {
      const url = await resolveLocalFileUrl(link.dataset.localFileLink);
      if (url) link.href = url;
      else link.classList.add("is-missing");
    } catch {
      link.classList.add("is-missing");
    }
  });
}

function handleAction(element) {
  const action = element.dataset.action;
  const keepMenuOpenActions = new Set(["toggle-mobile-menu", "toggle-sidebar-section", "toggle-all-sidebar-sections", "sidebar-page"]);
  if (!keepMenuOpenActions.has(action)) closeMobileMenu();
  if (action === "home") goHome();
  if (action === "dashboard-root") {
    if (state.active === "Mind") {
      setState({ active: "Mind", mindMode: "grid", selectedCompendiumId: null, selectedSectionId: null });
    } else if (state.active === "Spirit") {
      setState({ selectedSpiritBookKey: null, artifactMode: "grid", selectedArtifactId: null });
    } else {
      setState({ artifactMode: "grid", selectedArtifactId: null });
    }
  }
  if (action === "compendium-root") setState({ mindMode: "manager", selectedSectionId: null });
  if (action === "toggle-mobile-menu") {
    if (state.suppressNextMenuToggle) {
      state.suppressNextMenuToggle = false;
    } else {
      toggleMobileMenu();
    }
  }
  if (action === "toggle-sidebar-section") toggleSidebarSection(element.dataset.section);
  if (action === "toggle-all-sidebar-sections") toggleAllSidebarSections();
  if (action === "sidebar-page") setSidebarPage(element.dataset.section, element.dataset.direction, Number(element.dataset.maxPage || 0));
  if (action === "tracker-page") setTrackerPage(element.dataset.area, element.dataset.direction, Number(element.dataset.maxPage || 0), element.dataset.editable === "true", element.dataset.kind || "thought");
  if (action === "open-dashboard-card") openDashboardCard(element.dataset.section);
  if (action === "open-dashboard-direct") {
    setState({
      active: element.dataset.section,
      flipped: null,
      artifactMode: "grid",
      selectedArtifactId: null,
      selectedSpiritBookKey: null
    });
  }
  if (action === "set-dashboard-period") setDashboardPeriod(element.dataset.period);
  if (action === "set-dashboard-chart") setDashboardChartType(element.dataset.chart);
  if (action === "set-theme") setTheme(element.dataset.theme);
  if (action === "save-dashboard-identity") saveDashboardIdentitySettings();
  if (action === "reset-dashboard-identity-item") resetDashboardIdentityItem(element.dataset.dashboard);
  if (action === "open-icon-picker") openIconPicker(element);
  if (action === "close-icon-picker") closeIconPicker();
  if (action === "select-icon-picker-icon") selectIconPickerIcon(element.dataset.icon);
  if (action === "save-icon-picker") saveIconPickerSelection();
  if (action === "load-more-icon-picker") loadMoreIconPickerIcons();
  if (action === "open-compendium") openCompendium(element.dataset.id);
  if (action === "mind-compendium-page") setMindCompendiumPage(element.dataset.direction, Number(element.dataset.maxPage || 0));
  if (action === "toggle-mind-compendium-picker") toggleMindCompendiumPicker();
  if (action === "select-mind-compendium") selectMindCompendiumFromPicker(element.dataset.id, Number(element.dataset.index || 0), Number(element.dataset.perPage || 1));
  if (action === "open-mind-section") openMindSection(element.dataset.parentId, element.dataset.id);
  if (action === "open-artifact-note") openArtifactNote(element.dataset.id, element.dataset.returnActive || "");
  if (action === "open-life-activity") openActivityArtifact(element.dataset.id);
  if (action === "export-artifacts") exportArtifacts();
  if (action === "import-artifacts") importArtifacts();
  if (action === "factory-defaults") restoreFactoryDefaults();
  if (action === "clear-app-data") clearAppData();
  if (action === "reset-tips") resetTips();
  if (action === "dismiss-tip") dismissTip(element.dataset.tip, element);
  if (action === "open-gallery") openGallery();
  if (action === "close-gallery") goHome();
  if (action === "gallery-select-all") selectAllGalleryImages();
  if (action === "gallery-clear-selection") clearGallerySelection();
  if (action === "gallery-delete-selected") deleteSelectedGalleryImages();
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
      trackerDeleteKey: ""
    });
  }
  if (action === "close-settings") goHome();
  if (action === "set-settings-tab") setState({ settingsTab: element.dataset.tab === "dashboard" ? "interface" : element.dataset.tab || "getting-started", trackerAddArea: "", trackerEditKey: "", trackerDeleteKey: "" });
  if (action === "start-add-tracker") setState({ trackerAddArea: trackerAddKey(element.dataset.area || "", element.dataset.kind || "thought"), trackerEditKey: "", trackerDeleteKey: "" });
  if (action === "cancel-add-tracker") setState({ trackerAddArea: "" });
  if (action === "start-edit-tracker") {
    if (state.suppressNextTrackerEditClick) {
      state.suppressNextTrackerEditClick = false;
      return;
    }
    setState({ trackerEditKey: trackerEditKey(element.dataset.area, element.dataset.id, element.dataset.kind || "thought"), trackerDeleteKey: "", trackerAddArea: "" });
  }
  if (action === "cancel-edit-tracker") setState({ trackerEditKey: "", trackerDeleteKey: "" });
  if (action === "save-edit-tracker") updateTracker(element.dataset.area, element.dataset.id, element.dataset.kind || "thought");
  if (action === "request-remove-tracker") setState({ trackerDeleteKey: trackerEditKey(element.dataset.area, element.dataset.id, element.dataset.kind || "thought") });
  if (action === "cancel-remove-tracker") setState({ trackerDeleteKey: "" });
  if (action === "save-tracker") addTracker(element.dataset.area, element.dataset.kind || "thought");
  if (action === "remove-tracker") removeTracker(element.dataset.area, element.dataset.id, element.dataset.kind || "thought");
  if (action === "quick-thought") quickThought(element.dataset.area, element.dataset.id);
  if (action === "quick-goal") quickGoal(element.dataset.area, element.dataset.id, element);
  if (action === "open-thought-toast-note") {
    const noteId = element.dataset.id || state.thoughtToast?.noteId;
    const dashboard = state.thoughtToast?.dashboard || findArtifact(state.artifactStore, noteId)?.dashboard || "";
    applyThoughtToastTimestamp(noteId);
    clearThoughtToast();
    openArtifactNote(noteId, dashboard);
  }
  if (action === "submit-thought-toast-note") {
    submitThoughtToastNote(element.dataset.id || state.thoughtToast?.noteId, document.getElementById("thought-toast-note")?.value || state.thoughtToast?.quickNote || "");
  }
  if (action === "delete-thought-toast-note") deleteThoughtToastNote(element.dataset.id || state.thoughtToast?.noteId);
  if (action === "dismiss-thought-toast") clearThoughtToast();
  if (action === "new-compendium") addCompendium();
  if (action === "new-artifact-note") addDashboardNote(element.dataset.dashboard);
  if (action === "delete-compendium") deleteCompendium(element.dataset.id);
  if (action === "delete-section") deleteSection(element.dataset.id);
  if (action === "delete-artifact-note") deleteDashboardNote(element.dataset.id);
  if (action === "save-body-fast-settings") saveBodyFastSettings();
  if (action === "start-body-fast") startBodyFast();
  if (action === "stop-body-fast") stopBodyFast();
  if (action === "save-body-timer-settings") saveBodyTimerSettings(element.dataset.mode);
  if (action === "start-body-timer") startBodyTimer(element.dataset.mode);
  if (action === "stop-body-timer") stopBodyTimer(element.dataset.mode);
  if (action === "save-body-nutrition") saveBodyNutrition();
  if (action === "save-body-nutrition-goals") saveBodyNutritionGoals();
  if (action === "reset-body-nutrition") resetBodyNutrition();
  if (action === "add-body-workout") addBodyWorkout();
  if (action === "delete-body-workout") deleteBodyWorkout(element.dataset.id);
  if (action === "set-body-mode") setBodyMode(element.dataset.mode);
  if (action === "set-body-timer-mode") setBodyTimerMode(element.dataset.mode);
  if (action === "set-body-nutrition-mode") setBodyNutritionMode(element.dataset.mode);
  if (action === "set-life-tool") setLifeTool(element.dataset.tool);
  if (action === "set-life-mode") setLifeMode(element.dataset.mode);
  if (action === "add-life-todo") addLifeTodo();
  if (action === "toggle-life-todo") toggleLifeTodo(element.dataset.id);
  if (action === "toggle-life-task") toggleLifeTaskItem(element.dataset.source, element.dataset.id, element.dataset.projectId, element.dataset.phaseId);
  if (action === "edit-life-task-notes") editLifeTaskNotes(element.dataset.source, element.dataset.id, element.dataset.projectId, element.dataset.phaseId);
  if (action === "open-life-task") openLifeTaskItem(element.dataset.source, element.dataset.id, element.dataset.projectId, element.dataset.phaseId);
  if (action === "open-life-project-task") openLifeProjectTask(element.dataset.projectId, element.dataset.phaseId, element.dataset.taskId);
  if (action === "delete-life-todo") deleteLifeTodo(element.dataset.id);
  if (action === "add-life-project") addLifeProject();
  if (action === "select-life-project") selectLifeProject(element.dataset.id);
  if (action === "select-life-phase") selectLifePhase(element.dataset.id);
  if (action === "select-life-task") {
    if (element.dataset.projectId && element.dataset.phaseId) {
      setState({
        lifeTool: "projects",
        selectedLifeProjectId: element.dataset.projectId,
        selectedLifePhaseId: element.dataset.phaseId,
        selectedLifeTaskId: element.dataset.taskId
      });
    } else {
      selectLifeTask(element.dataset.taskId);
    }
  }
  if (action === "add-life-phase") addLifePhase(element.dataset.projectId);
  if (action === "add-life-project-task") addLifeProjectTask(element.dataset.projectId, element.dataset.phaseId);
  if (action === "save-life-project-entity") saveLifeProjectEntity(element.dataset.level);
  if (action === "upload-life-attachment") uploadLifeAttachment(element.dataset.level);
  if (action === "delete-life-attachment") deleteLifeAttachment(element.dataset.level, element.dataset.id);
  if (action === "set-spirit-year") setSpiritYear(Number(element.dataset.year));
  if (action === "spirit-prev-year") {
    const years = spiritYears();
    const index = years.indexOf(state.spiritYear);
    if (index > 0) setSpiritYear(years[index - 1]);
  }
  if (action === "spirit-next-year") {
    const years = spiritYears();
    const index = years.indexOf(state.spiritYear);
    if (index >= 0 && index < years.length - 1) setSpiritYear(years[index + 1]);
  }
  if (action === "open-spirit-book") openSpiritBook(element.dataset.key);
  if (action === "exit-spirit-book") exitSpiritBook();
  if (action === "exit-spirit-note") setState({ selectedArtifactId: null, artifactMode: "grid" });
  if (action === "add-spirit-book-note") addSpiritBookNote(element.dataset.key);
  if (action === "toggle-spirit-complete") toggleSpiritComplete(element.dataset.key);
  if (action === "reader") setState({ mindMode: "reader" });
  if (action === "manager") setState({ mindMode: "manager" });
  if (action === "compendium-reader-page") setCompendiumReaderPage(element.dataset.id, element.dataset.direction, Number(element.dataset.maxPage || 0));
  if (action === "edit-compendium") setState({ mindMode: "compendium-editor" });
  if (action === "add-section") addSection();
  if (action === "open-section") setState({ selectedSectionId: element.dataset.id, mindMode: "section-viewer" });
  if (action === "edit-section") setState({ mindMode: "section-editor" });
  if (action === "section-viewer") setState({ mindMode: "section-viewer" });
  if (action === "edit-artifact-note") setState({ artifactMode: "editor" });
  if (action === "artifact-viewer") setState({ artifactMode: "viewer" });
  if (action === "close-artifact-viewer") closeArtifactViewer();
  if (action === "save-compendium") saveCompendium(element.dataset.id, editorTitle(), editorBody());
  if (action === "save-section") saveSection(element.dataset.id, editorTitle(), editorBody());
  if (action === "save-artifact-note") saveDashboardNote(element.dataset.id, editorTitle(), editorBody());
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
    if (!timer.active) return;

    const timeEl = document.getElementById(`body-timer-${key}-time`);
    const ringEl = document.getElementById(`body-timer-${key}-ring`);
    if (!timeEl || !ringEl) return;

    timeEl.textContent = formatDuration(getBodyTimerElapsedMs(key));
    ringEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - getBodyTimerProgress(key)));
  });
}

applyEnvironmentClasses();
render();

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
  if (artifactStore.artifacts?.some((artifact) => artifact.properties?.sourceType === "workout")) {
    saveArtifactStore(artifactStore);
  }
  setState({
    artifactStore,
    compendiums: normalizeCompendiums(artifactStoreToCompendiums(artifactStore))
  });
});

loadSpiritPlan();

window.setInterval(updateBodyTimerDom, 1000);
