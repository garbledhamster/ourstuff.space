import { dashboardCards, today } from "./data.js";
import { donationModalHtml, bindDonationFlow } from "./donations.js";
import { clearLocalFiles, deleteLocalImages, exportLocalFiles, importLocalFiles, listLocalImages, resolveLocalFileUrl, resolveLocalImageUrl, storeLocalFile, storeLocalImage } from "./localMedia.js";
import { escapeHtml, renderMarkdown } from "./markdown.js";
import { autoUpdate, computePosition, flip, offset, shift } from "https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.5/+esm";
import {
  artifactStoreToCompendiums,
  compendiumsToArtifactStore,
  findArtifact,
  loadArtifactStore,
  removeArtifact,
  rootNotesForDashboard,
  SCHEMA_VERSION,
  saveArtifactStore,
  STORAGE_KEY,
  upsertArtifact
} from "./storage.js";

const app = document.getElementById("app");
const BODY_TRACKER_KEY = "ourstuff.bodyTracker.v1";
const SPIRIT_PROGRESS_KEY = "ourstuff.spiritPlanProgress.v1";
const LIFE_PLANNER_KEY = "ourstuff.lifePlanner.v1";
const TRACKER_SETTINGS_KEY = "ourstuff.thoughts.v1";
const SIDEBAR_WIDTH_KEY = "ourstuff.sidebarWidth.v1";
const ICONIFY_SEARCH_CACHE_KEY = "ourstuff.iconifySearchCache.v1";
const ICONIFY_SEARCH_URL = "https://api.iconify.design/search";
const ICONIFY_PREFIXES = "tabler,lucide,ph,mdi,material-symbols";
const ICONIFY_DOCS_URL = "https://iconify.design/";
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
const DASHBOARD_LABELS = ["Mind", "Body", "Spirit", "Life"];
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
const ICON_ALIASES = {
  "tabler:lotus": "tabler:yoga",
  "tabler:hands-pray": "tabler:pray"
};
const DEFAULT_TRACKERS = {
  Mind: [
    { id: "mind-note-taking", label: "Note Making", icon: "tabler:notes" },
    { id: "mind-lesson-learning", label: "Lesson", icon: "tabler:school" },
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
const TRACKER_LABEL_MIGRATIONS = {
  "mind-note-taking": {
    from: ["Note Taking"],
    to: "Note Making"
  },
  "mind-lesson-learning": {
    from: ["Lesson/Learning"],
    to: "Lesson"
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

function cloneDefaultTrackers() {
  return Object.fromEntries(DASHBOARD_LABELS.map((label) => [
    label,
    DEFAULT_TRACKERS[label].map((tracker) => ({ ...tracker }))
  ]));
}

function normalizeIconSource(value) {
  const source = String(value || "").trim();
  return ICON_ALIASES[source] || source;
}

function normalizeTracker(tracker, dashboard, index) {
  const id = String(tracker?.id || `${dashboard.toLowerCase()}-tracker-${index}-${makeId("tracker")}`);
  const rawLabel = String(tracker?.label || "").trim() || `Thought ${index + 1}`;
  const migration = TRACKER_LABEL_MIGRATIONS[id];
  const label = migration?.from.includes(rawLabel) ? migration.to : rawLabel;
  const icon = normalizeIconSource(tracker?.icon || tracker?.source || tracker?.url || "tabler:circle") || "tabler:circle";
  return {
    id,
    label,
    icon
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
  app.classList.toggle("is-installed-app", installed);
  app.classList.toggle("is-browser-mode", !installed);
  app.classList.toggle("is-mobile-viewport", mobile);
  app.classList.toggle("is-desktop-viewport", !mobile);
  app.dataset.displayMode = installed ? "standalone" : "browser";
  app.dataset.viewportMode = mobile ? "mobile" : "desktop";
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

  state.bodyTracker = bodyTracker;
  state.spiritProgress = spiritProgress;
  state.lifePlanner = lifePlanner;
  state.trackerSettings = trackerSettings;
  saveBodyTracker();
  saveSpiritProgress();
  saveLifePlannerStore(lifePlanner);
  saveTrackerSettings();
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
  );
}

const state = {
  active: "Dashboard",
  flipped: null,
  artifactStore: null,
  compendiums: [],
  selectedCompendiumId: null,
  selectedBlockId: null,
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
  trackerAddArea: "",
  trackerEditKey: "",
  trackerDeleteKey: "",
  suppressNextTrackerEditClick: false,
  iconSearchCache: loadIconifySearchCache(),
  iconSearchInFlight: {},
  thoughtToast: null,
  thoughtCooldowns: {},
  thoughtCreateLocks: {},
  dashboardPeriod: "week",
  bodyTracker: loadBodyTracker(),
  trackerSettings: loadTrackerSettings(),
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

function eventIsInPeriod(event, period) {
  const age = daysBetween(event.dateKey);
  if (period === "day") return age === 0;
  if (period === "year") return age >= 0 && age < 365;
  return age >= 0 && age < 7;
}

function iconHtml(name) {
  const icon = normalizeIconSource(name) || "tabler:circle";
  return `<iconify-icon class="button-icon" icon="${escapeHtml(icon)}" aria-hidden="true"></iconify-icon>`;
}

function buttonContent(icon, label, labelClass = "button-label") {
  return `${iconHtml(icon)}<span class="${labelClass}">${label}</span>`;
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

function trackerEditKey(area, id) {
  return `${area}:${id}`;
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

function trackerIconSuggestionsHtml(label, area, target, selectedIcon = "") {
  const suggestions = iconSuggestionsForLabel(label);
  if (!suggestions.length) {
    return `<div class="tracker-icon-suggestions is-empty">${String(label || "").trim().length >= 3 ? "Searching Iconify..." : "Type 3+ letters to search Iconify."}</div>`;
  }
  return `
    <div class="tracker-icon-suggestions" aria-label="Suggested icons">
      ${suggestions.map((suggestion) => `
        <button class="tracker-icon-suggestion${normalizeIconSource(selectedIcon) === suggestion.icon ? " is-selected" : ""}" data-icon="${escapeHtml(suggestion.icon)}" data-area="${escapeHtml(area)}" data-target="${escapeHtml(target)}" type="button" title="${escapeHtml(suggestion.icon)}">
          ${iconHtml(suggestion.icon)}
          <span>${escapeHtml(iconifyIconLabel(suggestion.icon))}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function trackerStripHtml(dashboard, options = {}) {
  const trackers = state.trackerSettings?.[dashboard] || [];
  const editable = Boolean(options.editable);
  const compact = Boolean(options.compact);
  const entries = editable
    ? [...trackers, { id: "__add__", label: "Add thought", icon: "tabler:plus", isAdd: true }]
    : trackers;
  const maxPage = Math.max(0, Math.ceil(entries.length / TRACKER_ORBS_PER_PAGE) - 1);
  const page = trackerPage(dashboard, editable, maxPage);
  const visibleEntries = entries.slice(page * TRACKER_ORBS_PER_PAGE, (page + 1) * TRACKER_ORBS_PER_PAGE);
  return `
    <section class="tracker-strip${compact ? " tracker-strip--compact" : ""}${editable ? " is-editable" : ""}" aria-label="${escapeHtml(dashboard)} thoughts" style="--thought-color: ${DASHBOARD_COLORS[dashboard] || DASHBOARD_COLORS.Mind};">
      <div class="tracker-orb-row"${editable ? ` data-tracker-reorder-row data-area="${escapeHtml(dashboard)}"` : ""}>
        ${visibleEntries.map((tracker) => tracker.isAdd ? `
          <span class="tracker-orb-wrap">
            <button class="tracker-orb tracker-orb--add" data-action="start-add-tracker" data-area="${escapeHtml(dashboard)}" data-thought-tooltip="Add thought" type="button" aria-label="Add ${escapeHtml(dashboard)} thought">
              ${iconHtml("tabler:plus")}
            </button>
          </span>
        ` : trackerOrbHtml(dashboard, tracker, editable)).join("")}
      </div>
      ${maxPage > 0 ? `
        <div class="tracker-page-controls" aria-label="${escapeHtml(dashboard)} thought pages">
          <button data-action="tracker-page" data-area="${escapeHtml(dashboard)}" data-direction="prev" data-max-page="${maxPage}" data-editable="${editable ? "true" : "false"}" type="button" aria-label="Previous ${escapeHtml(dashboard)} thoughts"${page <= 0 ? " disabled" : ""}>${iconHtml("tabler:chevron-left")}</button>
          <span>${page + 1} / ${maxPage + 1}</span>
          <button data-action="tracker-page" data-area="${escapeHtml(dashboard)}" data-direction="next" data-max-page="${maxPage}" data-editable="${editable ? "true" : "false"}" type="button" aria-label="Next ${escapeHtml(dashboard)} thoughts"${page >= maxPage ? " disabled" : ""}>${iconHtml("tabler:chevron-right")}</button>
        </div>
      ` : ""}
    </section>
  `;
}

function trackerOrbHtml(dashboard, tracker, editable = false) {
  const cooldownRemaining = editable ? 0 : thoughtCooldownRemaining(dashboard, tracker.id);
  const isCooling = cooldownRemaining > 0;
  const isEditing = state.trackerEditKey === trackerEditKey(dashboard, tracker.id);
  const actionAttrs = editable
    ? ` data-action="start-edit-tracker" data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"`
    : ` data-action="quick-thought" data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"`;
  return `
    <span class="tracker-orb-wrap"${editable ? ` data-tracker-orb-wrap data-area="${escapeHtml(dashboard)}" data-id="${escapeHtml(tracker.id)}"` : ""}>
      <button class="tracker-orb${isCooling ? " is-cooling" : ""}${isEditing ? " is-editing" : ""}" type="button"${actionAttrs} data-thought-tooltip="${escapeHtml(tracker.label)}" aria-label="${escapeHtml(`${dashboard} thought: ${tracker.label}`)}"${isCooling ? " disabled" : ""}>
        ${isCooling ? `<span class="tracker-cooldown-pie" aria-hidden="true"${thoughtCooldownPieStyle(cooldownRemaining)}></span>` : ""}
        <span class="tracker-orb-icon">${trackerIconHtml(tracker.icon)}</span>
      </button>
    </span>
  `;
}

function trackerFieldId(area, field) {
  return `tracker-${String(area).toLowerCase()}-${field}`;
}

function addTracker(area) {
  if (!DASHBOARD_LABELS.includes(area)) return;
  const label = document.getElementById(trackerFieldId(area, "label"))?.value.trim();
  const iconInput = document.getElementById(trackerFieldId(area, "icon"))?.value.trim();
  const icon = iconInput || firstIconSuggestion(label);
  if (!label) {
    window.alert("Add a thought name.");
    return;
  }
  const next = {
    ...state.trackerSettings,
    [area]: [
      ...(state.trackerSettings?.[area] || []),
      { id: makeId(`${area.toLowerCase()}-tracker`), label, icon }
    ]
  };
  state.trackerSettings = normalizeTrackerSettings(next);
  saveTrackerSettings();
  setState({ trackerAddArea: "", trackerEditKey: "", trackerDeleteKey: "" });
}

function updateTracker(area, id) {
  if (!DASHBOARD_LABELS.includes(area) || !id) return;
  const label = document.getElementById(trackerFieldId(`${area}-${id}`, "label"))?.value.trim();
  const iconInput = document.getElementById(trackerFieldId(`${area}-${id}`, "icon"))?.value.trim();
  const current = (state.trackerSettings?.[area] || []).find((tracker) => tracker.id === id);
  if (!current || !label) {
    window.alert("Add a thought name.");
    return;
  }
  const icon = iconInput || firstIconSuggestion(label, current.icon || "tabler:circle");
  const next = {
    ...state.trackerSettings,
    [area]: (state.trackerSettings?.[area] || []).map((tracker) => (
      tracker.id === id ? { ...tracker, label, icon } : tracker
    ))
  };
  state.trackerSettings = normalizeTrackerSettings(next);
  saveTrackerSettings();
  setState({ trackerEditKey: "", trackerDeleteKey: "" });
}

function reorderTracker(area, trackerId, targetIndex) {
  if (!DASHBOARD_LABELS.includes(area)) return false;
  const trackers = state.trackerSettings?.[area] || [];
  const fromIndex = trackers.findIndex((tracker) => tracker.id === trackerId);
  if (fromIndex < 0) return false;

  const nextTrackers = [...trackers];
  const [movedTracker] = nextTrackers.splice(fromIndex, 1);
  const nextIndex = Math.min(Math.max(targetIndex, 0), nextTrackers.length);
  nextTrackers.splice(nextIndex, 0, movedTracker);
  if (nextTrackers.map((tracker) => tracker.id).join("|") === trackers.map((tracker) => tracker.id).join("|")) return false;

  state.trackerSettings = normalizeTrackerSettings({
    ...state.trackerSettings,
    [area]: nextTrackers
  });
  saveTrackerSettings();
  setState({ trackerEditKey: "", trackerDeleteKey: "", trackerAddArea: "" });
  return true;
}

function removeTracker(area, id) {
  if (!DASHBOARD_LABELS.includes(area) || !id) return;
  const next = {
    ...state.trackerSettings,
    [area]: (state.trackerSettings?.[area] || []).filter((tracker) => tracker.id !== id)
  };
  state.trackerSettings = normalizeTrackerSettings(next);
  saveTrackerSettings();
  setState({
    trackerAddArea: state.trackerAddArea === area ? "" : state.trackerAddArea,
    trackerEditKey: state.trackerEditKey === trackerEditKey(area, id) ? "" : state.trackerEditKey,
    trackerDeleteKey: state.trackerDeleteKey === trackerEditKey(area, id) ? "" : state.trackerDeleteKey
  });
}

function thoughtCooldownKey(area, id) {
  return `${area}:${id}`;
}

function thoughtCooldownRemaining(area, id) {
  const endTime = state.thoughtCooldowns?.[thoughtCooldownKey(area, id)] || 0;
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

function thoughtNoteWithTimestamp(note, timestamp) {
  const date = new Date(timestamp);
  if (!note || Number.isNaN(date.getTime())) return note;
  const label = note.properties?.thoughtLabel || state.thoughtToast?.label || note.title;
  const dateKey = dateKeyFromDate(date);
  const title = `${label} ${formatEventTime(timestamp) || thoughtTimestampLabel(timestamp)}`;
  const body = String(note.body || "").replace(/Logged: .*/, `Logged: ${thoughtTimestampLabel(timestamp)}`);
  const audit = Array.isArray(note.properties?.audit) ? note.properties.audit : [];
  return {
    ...note,
    title,
    body,
    created: timestamp,
    properties: {
      ...(note.properties || {}),
      dateKey,
      thoughtLoggedAt: timestamp,
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
    const element = app.querySelector(".thought-toast");
    element?.classList.remove("is-held");
    element?.classList.add("is-fading");
  }, delay);
  thoughtToastHideTimer = window.setTimeout(() => {
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
          thoughtLabel: adjusted.properties?.thoughtLabel || ""
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

function quickThought(area, id) {
  if (!state.artifactStore || !DASHBOARD_LABELS.includes(area)) return;
  const cooldownKey = thoughtCooldownKey(area, id);
  if (thoughtCooldownRemaining(area, id) > 0 || state.thoughtCreateLocks[cooldownKey]) return;
  const tracker = (state.trackerSettings?.[area] || []).find((item) => item.id === id);
  if (!tracker) return;
  state.thoughtCreateLocks = {
    ...state.thoughtCreateLocks,
    [cooldownKey]: true
  };
  const now = nowIso();
  const title = `${tracker.label} ${formatEventTime(now) || thoughtTimestampLabel(now)}`;
  const note = {
    id: makeId("thought"),
    type: "note",
    dashboard: area,
    parentId: null,
    title,
    body: [
      `## ${tracker.label}`,
      "",
      `Logged: ${thoughtTimestampLabel(now)}`,
      ""
    ].join("\n"),
    created: now,
    edited: now,
    childIds: [],
    properties: {
      role: "thought",
      status: "active",
      dateKey: todayDateKey(),
      thoughtLabel: tracker.label,
      thoughtIcon: tracker.icon,
      thoughtLoggedAt: now,
      audit: [
        {
          at: now,
          action: "created",
          title,
          dateKey: todayDateKey(),
          thoughtLabel: tracker.label
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
  showThoughtToast({
    noteId: note.id,
    dashboard: area,
    label: tracker.label,
    timestamp: now
  });
  window.setTimeout(() => {
    if (state.thoughtCooldowns[cooldownKey] <= Date.now()) {
      const { [cooldownKey]: _expired, ...nextCooldowns } = state.thoughtCooldowns;
      state.thoughtCooldowns = nextCooldowns;
      render();
    }
  }, THOUGHT_COOLDOWN_MS + 50);
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
    const latestBlock = latestByActivity(state.compendiums.flatMap((compendium) =>
      compendium.blocks.map((block) => ({ ...block, compendiumTitle: compendium.title }))
    ));
    const latest = latestBlock || latestCompendium;
    return [
      ["What", latest ? shortSummary(latest.title) : "No compendium yet"],
      ["Where", latest?.compendiumTitle ? shortSummary(latest.compendiumTitle) : "Mind"],
      ["When", formatActivityTimestamp(activityTimestamp(latest))]
    ];
  }

  if (label === "Body") {
    const latestNote = latestDashboardArtifact("Body");
    const latestWorkout = latestByActivity(state.bodyTracker.workouts);
    const latest = latestByActivity([latestNote, latestWorkout].filter(Boolean));
    return [
      ["What", latest ? shortSummary(latest.title) : "No body log yet"],
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
    ["What", latestNote ? shortSummary(latestNote.title) : "No life note yet"],
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
  const blockBodies = Array.isArray(compendium.blocks)
    ? compendium.blocks.map((block) => block?.body || block?.content || "").filter(Boolean)
    : [];
  return {
    ...compendium,
    dashboard: "Mind",
    type: "compendium",
    body: [compendium.body, ...blockBodies].filter(Boolean).join("\n\n"),
    properties: compendium.properties || {}
  };
}

function mindSidebarItems() {
  const thoughts = rootNotesForDashboard(state.artifactStore, "Mind")
    .filter((note) => note.properties?.role === "thought");
  const sections = state.compendiums.flatMap((compendium) =>
    (compendium.blocks || []).map((block) => ({
      ...block,
      dashboard: "Mind",
      type: "mind-section",
      parentId: compendium.id,
      compendiumTitle: compendium.title,
      properties: {
        ...(block.properties || {}),
        role: "compendium-section"
      }
    }))
  );
  return newestActivityFirst([...thoughts, ...sections]);
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
  return `
    <button class="sidebar-item${options.active ? " is-active" : ""}" data-action="${options.action}" data-id="${item.id}"${options.parentId ? ` data-parent-id="${escapeHtml(options.parentId)}"` : ""}>
      <span class="sidebar-item-number">${escapeHtml(String(number).padStart(2, "0"))}</span>
      <span class="sidebar-item-label">${escapeHtml(item.title)}</span>
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

function selectedBlock() {
  const compendium = selectedCompendium();
  return compendium?.blocks.find((block) => block.id === state.selectedBlockId) || null;
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
  const labels = ["Mind", "Body", "Spirit", "Life"];
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

function trackerPageKey(dashboard, editable = false) {
  return `${dashboard}:${editable ? "settings" : "quick"}`;
}

function trackerPage(dashboard, editable = false, maxPage = 0) {
  const page = state.trackerPages?.[trackerPageKey(dashboard, editable)] || 0;
  return Math.min(Math.max(page, 0), Math.max(0, maxPage));
}

function setTrackerPage(dashboard, direction, maxPage, editable = false) {
  const current = trackerPage(dashboard, editable, maxPage);
  const nextPage = direction === "prev" ? current - 1 : current + 1;
  setState({
    trackerPages: {
      ...(state.trackerPages || {}),
      [trackerPageKey(dashboard, editable)]: Math.min(Math.max(nextPage, 0), Math.max(0, maxPage))
    }
  });
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

function menuToggleLabel(isOpen = state.mobileMenuOpen) {
  return isOpen ? "↓↓↓ COLLAPSE MENU ↓↓↓" : "↑↑↑ EXPAND MENU ↑↑↑";
}

function persistCompendiums() {
  if (!state.artifactStore) return;
  state.artifactStore = compendiumsToArtifactStore(state.compendiums, state.artifactStore);
  saveArtifactStore(state.artifactStore);
}

function persistArtifactStore(nextStore) {
  state.artifactStore = nextStore;
  state.compendiums = artifactStoreToCompendiums(nextStore);
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
  const nextTool = ["todo", "projects", "calendar", "notes"].includes(tool) ? tool : "";
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
        selectedBlockId: null,
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
  const confirmed = window.confirm("Clear all local app data from this browser? This cannot be undone unless you have an export.");
  if (!confirmed) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(BODY_TRACKER_KEY);
  window.localStorage.removeItem(SPIRIT_PROGRESS_KEY);
  window.localStorage.removeItem(LIFE_PLANNER_KEY);
  window.localStorage.removeItem(TRACKER_SETTINGS_KEY);
  window.localStorage.removeItem(SIDEBAR_WIDTH_KEY);
  window.localStorage.removeItem(ICONIFY_SEARCH_CACHE_KEY);
  await clearLocalFiles().catch(() => {});
  state.artifactStore = null;
  state.compendiums = [];
  state.bodyTracker = createDefaultBodyTracker();
  state.spiritProgress = {};
  state.lifePlanner = createDefaultLifePlanner();
  state.trackerSettings = cloneDefaultTrackers();
  state.settingsTab = "getting-started";
  state.trackerAddArea = "";
  state.trackerEditKey = "";
  state.trackerDeleteKey = "";
  state.lifeTool = "";
  state.selectedLifeProjectId = null;
  state.selectedLifePhaseId = null;
  state.selectedLifeTaskId = null;
  state.galleryImages = null;
  state.gallerySelectedIds = [];
  goHome();
  loadArtifactStore().then(async (artifactStore) => {
    if (artifactStore.appState && !hasStoredAppState()) {
      await restoreImportedAppState(artifactStore.appState);
    }
    setState({
      artifactStore,
      compendiums: artifactStoreToCompendiums(artifactStore)
    });
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
    selectedBlockId: null,
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
    selectedBlockId: null,
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
    selectedBlockId: section === "Mind" ? null : state.selectedBlockId,
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
    selectedBlockId: null,
    selectedArtifactId: null,
    mindMode: "manager"
  });
}

function compendiumReaderPage(compendium) {
  const maxPage = Math.max(0, (compendium?.blocks?.length || 0));
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

function openMindSection(parentId, blockId) {
  if (!parentId || !blockId) return;
  const compendium = state.compendiums.find((item) => item.id === parentId);
  if (!compendium?.blocks?.some((block) => block.id === blockId)) return;
  setState({
    active: "Mind",
    selectedCompendiumId: parentId,
    selectedBlockId: blockId,
    selectedArtifactId: null,
    mindMode: "block-viewer"
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
    selectedBlockId: null,
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
    blocks: []
  };
  state.compendiums = [...state.compendiums, next];
  persistCompendiums();
  setState({
    active: "Mind",
    selectedCompendiumId: next.id,
    selectedBlockId: null,
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
    selectedBlockId: null,
    mindMode: "grid"
  });
}

function addBlock() {
  const compendium = selectedCompendium();
  if (!compendium) return;
  const now = nowIso();
  const nextBlock = {
    id: makeId("block"),
    title: `Section ${compendium.blocks.length + 1}`,
    body: "## New Section\n\nWrite the section body here.",
    created: now,
    edited: now
  };
  state.compendiums = state.compendiums.map((item) =>
    item.id === compendium.id
      ? { ...item, edited: now, blocks: [...item.blocks, nextBlock] }
      : item
  );
  persistCompendiums();
  setState({ selectedBlockId: nextBlock.id, mindMode: "block-editor" });
}

function saveBlock(id, title, body) {
  const compendium = selectedCompendium();
  if (!compendium) return;
  const now = nowIso();
  state.compendiums = state.compendiums.map((item) =>
    item.id === compendium.id
      ? {
          ...item,
          edited: now,
          blocks: item.blocks.map((block) =>
            block.id === id ? { ...block, title, body, edited: now } : block
          )
        }
      : item
  );
  persistCompendiums();
  setState({ mindMode: "block-viewer" });
}

function deleteBlock(id) {
  const compendium = selectedCompendium();
  const block = selectedBlock();
  if (!compendium || !block) return;
  if (!window.confirm(`Delete section "${block.title}"?`)) return;

  const now = nowIso();
  state.compendiums = state.compendiums.map((item) =>
    item.id === compendium.id
      ? {
          ...item,
          edited: now,
          blocks: item.blocks.filter((entry) => entry.id !== id)
        }
      : item
  );
  persistCompendiums();
  setState({
    selectedBlockId: null,
    mindMode: "manager"
  });
}

function reorderCompendiumBlock(compendiumId, blockId, targetIndex) {
  let changed = false;
  state.compendiums = state.compendiums.map((compendium) => {
    if (compendium.id !== compendiumId) return compendium;
    const fromIndex = compendium.blocks.findIndex((block) => block.id === blockId);
    if (fromIndex < 0) return compendium;

    const blocks = [...compendium.blocks];
    const [movedBlock] = blocks.splice(fromIndex, 1);
    const nextIndex = Math.min(Math.max(targetIndex, 0), blocks.length);
    if (nextIndex === fromIndex) return compendium;

    blocks.splice(nextIndex, 0, movedBlock);
    changed = true;
    return { ...compendium, blocks };
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
    title: `New ${dashboard} Note`,
    body: isLife ? "" : `## New ${dashboard} Note\n\nWrite the note here.`,
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
          title: `New ${dashboard} Note`,
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
  state.bodyTracker.workouts = [
    {
      id: makeId("workout"),
      dateKey: todayDateKey(),
      title,
      type,
      minutes,
      effort,
      notes,
      created: now
    },
    ...state.bodyTracker.workouts
  ];
  saveBodyTracker();
  appendBodyLogNote(
    "Workout logged",
    `## Workout log\n\nSaved: ${currentTimestampLabel()}\n\n- Name: ${title}\n- Type: ${type}\n- Minutes: ${minutes}\n- Effort: ${effort}/10${notes ? `\n- Notes: ${notes}` : ""}`
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
  setState({ dashboardPeriod: ["day", "week", "year"].includes(period) ? period : "week" });
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
  const block = selectedBlock();
  const spiritBook = selectedSpiritBook();
  const sidebarScrollTop = app.querySelector(".sidebar-list-scroll")?.scrollTop ?? 0;
  const settingsScrollTop = app.querySelector(".settings-tab-panel")?.scrollTop ?? 0;
  hideThoughtTooltip();
  app.innerHTML = `
    <div class="workspace${state.mobileMenuOpen ? " has-mobile-menu" : ""}" style="--sidebar-width: ${clampSidebarWidth(state.sidebarWidth)}px;">
      <button class="mobile-menu-toggle" data-action="toggle-mobile-menu" type="button" aria-expanded="${state.mobileMenuOpen ? "true" : "false"}">
        ${menuToggleLabel()}
      </button>
      ${sidebarHtml(compendium)}
      <section class="content-shell">
        ${pathBarHtml(compendium, block, spiritBook)}
        <div class="content-stage">${contentHtml(compendium, block)}</div>
      </section>
    </div>
    ${donationModalHtml()}
    ${thoughtToastHtml()}
  `;
  const sidebarScroll = app.querySelector(".sidebar-list-scroll");
  if (sidebarScroll) sidebarScroll.scrollTop = sidebarScrollTop;
  const settingsScroll = app.querySelector(".settings-tab-panel");
  if (settingsScroll) settingsScroll.scrollTop = settingsScrollTop;
  bindActions();
  bindThoughtTooltips();
  bindThoughtToastControls();
  bindTrackerSettingsForms();
  bindTrackerOrbSorting();
  bindSidebarResize();
  bindSidebarHorizontalScroll();
  bindCompendiumSectionSorting();
  bindDashboardBalanceHover();
  bindGalleryControls();
  bindEditorMedia();
  bindLocalAssetImages();
  bindDonationFlow(document);
  updateBodyTimerDom();
  renderLifeMonthCalendar();
  focusThoughtEditor();
}

function thoughtToastHtml() {
  const toast = state.thoughtToast;
  if (!toast) return "";
  const quickNote = toast.quickNote || "";
  const hasQuickNote = quickNote.trim().length > 0;
  const toastDate = thoughtDateInputValue(toast.timestamp);
  const toastTime = thoughtTimeInputValue(toast.timestamp);
  return `
    <aside class="thought-toast" role="status" aria-live="polite">
      <div class="thought-toast-summary">
        <strong>${escapeHtml(toast.dashboard)} thought saved</strong>
        <small><span>${escapeHtml(toast.label)}</span><span id="thought-toast-summary-time">${escapeHtml(thoughtTimestampLabel(toast.timestamp))}</span></small>
      </div>
      <label class="thought-toast-input-label">
        <span>Quick note</span>
        <input class="thought-toast-input" id="thought-toast-note" type="text" value="${escapeHtml(quickNote)}" placeholder="Add a detail">
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
      <button class="icon-button thought-toast-action" data-action="${hasQuickNote ? "submit-thought-toast-note" : "open-thought-toast-note"}" data-id="${escapeHtml(toast.noteId)}" type="button" aria-label="${hasQuickNote ? "Submit quick note" : "Open note"}" title="${hasQuickNote ? "Submit" : "Open Note"}">
        ${iconHtml(hasQuickNote ? "tabler:device-floppy" : "tabler:external-link")}
      </button>
      <button class="icon-button danger-button thought-toast-delete" data-action="delete-thought-toast-note" data-id="${escapeHtml(toast.noteId)}" type="button" aria-label="Delete thought note" title="Delete thought note">${iconHtml("tabler:trash")}</button>
      <button class="icon-button" data-action="dismiss-thought-toast" type="button" aria-label="Dismiss thought popup" title="Dismiss">${iconHtml("tabler:x")}</button>
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
    if (state.thoughtToast) state.thoughtToast.quickNote = noteInput.value;
    actionButton.dataset.action = value ? "submit-thought-toast-note" : "open-thought-toast-note";
    actionButton.innerHTML = iconHtml(value ? "tabler:device-floppy" : "tabler:external-link");
    actionButton.setAttribute("aria-label", value ? "Submit quick note" : "Open note");
    actionButton.setAttribute("title", value ? "Submit" : "Open Note");
    pauseThoughtToastFade();
  };
  const updateTimestamp = () => {
    const timestamp = thoughtTimestampFromToastControls();
    if (state.thoughtToast) state.thoughtToast.timestamp = timestamp;
    if (summaryTime) summaryTime.textContent = thoughtTimestampLabel(timestamp);
    pauseThoughtToastFade();
  };

  toast.addEventListener("pointerenter", pauseThoughtToastFade);
  toast.addEventListener("pointerleave", () => resumeThoughtToastFade(0));
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

function trackerIconInputId(area, target) {
  if (target === "add") return trackerFieldId(area, "icon");
  if (target.startsWith("edit-")) return trackerFieldId(`${area}-${target.replace(/^edit-/, "")}`, "icon");
  return "";
}

function bindTrackerSettingsForms() {
  app.querySelectorAll(".tracker-title-input").forEach((input) => {
    const area = input.dataset.area || "";
    const target = input.dataset.target || "add";
    const slot = app.querySelector(`.tracker-suggestion-slot[data-area="${CSS.escape(area)}"][data-target="${CSS.escape(target)}"]`);
    const iconInput = document.getElementById(trackerIconInputId(area, target));
    if (!slot || !iconInput) return;

    const refresh = () => {
      slot.innerHTML = trackerIconSuggestionsHtml(input.value, area, target, iconInput.value);
      slot.querySelectorAll(".tracker-icon-suggestion").forEach((button) => {
        button.addEventListener("click", () => {
          iconInput.value = button.dataset.icon || "";
          refresh();
        });
      });
    };
    const refreshFromIconify = () => {
      const query = input.value.trim();
      if (query.length < 3) {
        refresh();
        return;
      }
      refresh();
      searchIconifyIcons(query).then(() => {
        if (!document.body.contains(input) || input.value.trim() !== query) return;
        refresh();
      });
    };

    refreshFromIconify();
    input.addEventListener("input", refreshFromIconify);
    iconInput.addEventListener("input", refresh);
  });
}

function trackerDropIndex(row, activeWrap, pointerX) {
  const wraps = Array.from(row.querySelectorAll("[data-tracker-orb-wrap]"))
    .filter((wrap) => wrap !== activeWrap);
  const index = wraps.findIndex((wrap) => {
    const rect = wrap.getBoundingClientRect();
    return pointerX < rect.left + rect.width / 2;
  });
  return index === -1 ? wraps.length : index;
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
          targetIndex = trackerDropIndex(row, wrap, moveEvent.clientX);
          setTrackerDropMarker(row, wrap, targetIndex);
        };

        const onPointerMove = (moveEvent) => {
          const moved = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
          if (!isDragging && moved < 6) return;
          moveEvent.preventDefault();
          if (!isDragging) startDrag(moveEvent);
          targetIndex = trackerDropIndex(row, wrap, moveEvent.clientX);
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
          reorderTracker(area, trackerId, targetIndex ?? 0);
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
  if (state.artifactMode !== "editor" || note?.properties?.role !== "thought") return;
  window.requestAnimationFrame(() => {
    const editor = document.getElementById("editor-body");
    if (!editor) return;
    editor.focus();
    const end = editor.value.length;
    editor.setSelectionRange(end, end);
  });
}

function sidebarHtml(compendium) {
  const sectionLabels = [
    ["01", "Mind"],
    ["02", "Body"],
    ["03", "Spirit"],
    ["04", "Life"]
  ];
  const allExpanded = sectionLabels.every(([, label]) => state.sidebarExpanded[label]);
  return `
    <aside class="sidebar">
      <div class="sidebar-fixed-top">
        <button class="home-button" data-action="home">${buttonContent("tabler:layout-dashboard", "Dashboard")}</button>
        <button class="sidebar-toggle-all" data-action="toggle-all-sidebar-sections" type="button" aria-pressed="${allExpanded ? "true" : "false"}">
          <span>${allExpanded ? "Collapse all" : "Expand all"}</span>
          <span aria-hidden="true">${allExpanded ? "-" : "+"}</span>
        </button>
      </div>
      <div class="sidebar-list-scroll">
        <div class="sidebar-groups">
          ${sectionLabels
            .map(([number, label]) => {
              const expanded = state.sidebarExpanded[label];
              const items = label === "Mind"
                ? mindSidebarItems().map((item, index) => sidebarItemHtml(item, {
                  action: item.type === "mind-section" ? "open-mind-section" : "open-artifact-note",
                  active: item.type === "mind-section" ? state.selectedBlockId === item.id : state.selectedArtifactId === item.id,
                  number: index + 1,
                  parentId: item.parentId || ""
                })).join("")
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
                  <span>${number} ${label}</span>
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
          <span aria-hidden="true">•</span>
          <button class="sidebar-text-link" data-action="open-gallery" type="button">Gallery</button>
          <span aria-hidden="true">•</span>
          <button class="sidebar-text-link" data-action="import-artifacts" type="button">Import</button>
          <span aria-hidden="true">•</span>
          <button class="sidebar-text-link" data-action="export-artifacts" type="button">Export</button>
          <span aria-hidden="true">•</span>
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

function pathBarHtml(compendium, block, spiritBook) {
  return `
    <nav class="path-bar" aria-label="Current location">
      <button data-action="home">Dashboard</button>
      ${state.active !== "Dashboard" ? `<span>/</span><button data-action="dashboard-root">${escapeHtml(state.active)}</button>` : ""}
      ${compendium ? `<span>/</span><button class="truncate" data-action="compendium-root">${escapeHtml(compendium.title)}</button>` : ""}
      ${block ? `<span>/</span><span class="truncate muted">${escapeHtml(block.title)}</span>` : ""}
      ${spiritBook ? `<span>/</span><span class="truncate muted">${escapeHtml(spiritBook.title)}</span>` : ""}
    </nav>
  `;
}

function contentHtml(compendium, block) {
  if (state.active === "Dashboard") return dashboardGridHtml();
  if (state.active === "Settings") return settingsHtml();
  if (state.active === "Gallery") return galleryHtml();
  if (state.active === "Mind") return mindHtml(compendium, block);
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
        ${dashboardCards.map(([number, label]) => `
          <button class="dashboard-card${state.flipped === label ? " is-flipped" : ""}" data-action="open-dashboard-card" data-section="${label}" data-balance-key="${label}" style="--card-color: ${DASHBOARD_COLORS[label]};">
            <span class="dashboard-card-inner">
              <span class="dashboard-card-face dashboard-card-front">
                <span class="dashboard-card-title">${number} ${label.toUpperCase()}</span>
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

function dashboardAnalyticsHtml() {
  const labels = ["Mind", "Body", "Spirit", "Life"];
  const pieLabels = ["Body", "Spirit", "Life", "Mind"];
  const events = lifeEvents().filter((event) => eventIsInPeriod(event, state.dashboardPeriod));
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
  const periodLabel = state.dashboardPeriod === "day" ? "today" : state.dashboardPeriod === "year" ? "this year" : "this week";
  const ideal = total ? total / labels.length : 0;
  const imbalance = total ? labels.map((label) => Math.abs(counts[label] - ideal)).reduce((sum, value) => sum + value, 0) / total : 0;
  const balanceScore = Math.max(0, Math.round((1 - imbalance) * 100));

  return `
    <section class="dashboard-analytics" aria-label="Dashboard analytics">
      <div class="dashboard-analytics-header">
        <div>
          <h2>Balance</h2>
          <p>Mind, Body, Spirit, and Life activity for ${periodLabel}.</p>
        </div>
      </div>
      <div class="dashboard-analytics-body">
        <div class="dashboard-pie-wrap">
          <div class="dashboard-pie">
            <svg class="dashboard-pie-chart" viewBox="0 0 148 148" aria-label="Open balance section">
              ${segments.map(({ label, value, start }) => `
                <circle class="dashboard-pie-segment" data-action="open-dashboard-direct" data-section="${label}" data-balance-key="${label}" tabindex="0" role="button" aria-label="Open ${label}" cx="74" cy="74" r="57" pathLength="100" style="--segment-color: ${DASHBOARD_COLORS[label]}; --segment-start: ${start}; --segment-size: ${value};"></circle>
              `).join("")}
            </svg>
            <span>${total}</span>
            <small>events</small>
          </div>
          <strong>${balanceScore}% balanced</strong>
          <div class="dashboard-period-toggle" role="group" aria-label="Balance period">
            ${["day", "week", "year"].map((period) => `
              <button class="${state.dashboardPeriod === period ? "is-active" : ""}" data-action="set-dashboard-period" data-period="${period}" type="button" aria-pressed="${state.dashboardPeriod === period ? "true" : "false"}">${period}</button>
            `).join("")}
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
    goals: settingsComingSoonHtml("Goals"),
    interface: settingsComingSoonHtml("Interface")
  };
  return panelHtml(`
    ${headerHtml("Settings", "Getting started, Thoughts, Goals, and Interface setup.", `
      <button class="icon-button close-viewer-button" data-action="close-settings" type="button" aria-label="Close settings" title="Close">${iconHtml("tabler:x")}</button>
    `)}
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
          <span>01</span>
          <h3>Mind</h3>
          <p>Use Mind for ideas, notes, books, concepts, plans, and anything you want to understand more clearly. Start rough, then shape notes into sections when an idea becomes reusable.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Body</h3>
          <p>Use Body for fasting, food, workouts, sleep signals, symptoms, and physical routines. The goal is not perfect tracking; it is enough detail to notice what helps and what tends to throw you off.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Spirit</h3>
          <p>Use Spirit for reading, meaning, values, gratitude, prayer, reflection, and the longer questions you want to live with. Mark progress and keep notes close to the works or practices that prompted them.</p>
        </article>
        <article>
          <span>04</span>
          <h3>Life</h3>
          <p>Use Life as the calendar and journal layer. Log the day, mark habits, and record what changed. The calendar helps you see when you worked on something and how steady the rhythm has been.</p>
        </article>
      </div>
      <section class="getting-started-rhythm">
        <h3>A simple rhythm</h3>
        <div>
          <p><strong>Capture:</strong> Put the thing where it belongs. A thought goes to Mind. A workout goes to Body. A reading note goes to Spirit. A day summary goes to Life.</p>
          <p><strong>Check:</strong> Use the dashboard balance chart to see what has been getting attention lately. It is a signal, not a score.</p>
          <p><strong>Connect:</strong> Use the Life calendar to see how scattered edits become a visible thread across days.</p>
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
          <p>Click an orb in Mind, Body, Spirit, or Life to open a new thought note for that exact thought type.</p>
        </div>
        <a class="settings-inline-link" href="${ICONIFY_DOCS_URL}" target="_blank" rel="noopener noreferrer">${buttonContent("tabler:external-link", "Iconify")}</a>
      </section>
      <div class="thoughts-settings-sections">
        ${DASHBOARD_LABELS.map((dashboard) => `
          <section class="thoughts-settings-section" style="--thought-color: ${DASHBOARD_COLORS[dashboard]};">
            <div class="body-card-heading">
              <div>
                <h3>${escapeHtml(dashboard)}</h3>
                <p>${escapeHtml((state.trackerSettings?.[dashboard] || []).length)} thought orb${(state.trackerSettings?.[dashboard] || []).length === 1 ? "" : "s"}</p>
              </div>
            </div>
            ${trackerStripHtml(dashboard, { editable: true, compact: true })}
            ${trackerEditFormHtml(dashboard)}
            ${trackerAddFormHtml(dashboard)}
          </section>
        `).join("")}
      </div>
    </div>
  `;
}

function trackerAddFormHtml(area) {
  if (state.trackerAddArea !== area) return "";
  return `
    <div class="tracker-add-form">
      <label class="body-field">Thought name<input class="tracker-title-input" id="${trackerFieldId(area, "label")}" data-area="${escapeHtml(area)}" data-target="add" type="text" placeholder="Example: Gratitude"></label>
      <input class="tracker-icon-input" id="${trackerFieldId(area, "icon")}" type="hidden" value="">
      <div class="tracker-suggestion-slot" data-area="${escapeHtml(area)}" data-target="add">
        ${trackerIconSuggestionsHtml("", area, "add")}
      </div>
      <div class="action-row body-actions">
        <button class="secondary-button" data-action="cancel-add-tracker" type="button">${buttonContent("tabler:x", "Cancel")}</button>
        <button class="primary-button" data-action="save-tracker" data-area="${escapeHtml(area)}" type="button">${buttonContent("tabler:plus", "Add Thought")}</button>
      </div>
    </div>
  `;
}

function trackerEditFormHtml(area) {
  const [activeArea, id] = String(state.trackerEditKey || "").split(":");
  if (activeArea !== area || !id) return "";
  const tracker = (state.trackerSettings?.[area] || []).find((item) => item.id === id);
  if (!tracker) return "";
  const target = `edit-${id}`;
  const confirmDelete = state.trackerDeleteKey === trackerEditKey(area, id);
  return `
    <div class="tracker-edit-form">
      <div class="tracker-edit-heading">
        <strong>Edit ${escapeHtml(tracker.label)}</strong>
        <button class="icon-button" data-action="cancel-edit-tracker" type="button" aria-label="Close thought editor" title="Close">${iconHtml("tabler:x")}</button>
      </div>
      <div class="tracker-edit-preview">
        <span class="tracker-orb tracker-orb--preview">
          <span class="tracker-orb-icon">${trackerIconHtml(tracker.icon)}</span>
        </span>
      </div>
      <div class="tracker-add-form tracker-add-form--embedded">
        <label class="body-field">Button text<input class="tracker-title-input" id="${trackerFieldId(`${area}-${id}`, "label")}" data-area="${escapeHtml(area)}" data-target="${escapeHtml(target)}" type="text" value="${escapeHtml(tracker.label)}"></label>
        <input class="tracker-icon-input" id="${trackerFieldId(`${area}-${id}`, "icon")}" type="hidden" value="${escapeHtml(tracker.icon)}">
        <div class="tracker-suggestion-slot" data-area="${escapeHtml(area)}" data-target="${escapeHtml(target)}">
          ${trackerIconSuggestionsHtml(tracker.label, area, target, tracker.icon)}
        </div>
        <div class="action-row body-actions">
          <button class="secondary-button" data-action="cancel-edit-tracker" type="button">${buttonContent("tabler:x", "Cancel")}</button>
          <button class="primary-button" data-action="save-edit-tracker" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button">${buttonContent("tabler:device-floppy", "Save")}</button>
          ${confirmDelete
            ? `<button class="secondary-button" data-action="cancel-remove-tracker" type="button">${buttonContent("tabler:arrow-back-up", "Keep")}</button><button class="secondary-button danger-button" data-action="remove-tracker" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button">${buttonContent("tabler:trash", "Confirm Delete")}</button>`
            : `<button class="secondary-button danger-button" data-action="request-remove-tracker" data-area="${escapeHtml(area)}" data-id="${escapeHtml(id)}" type="button">${buttonContent("tabler:trash", "Delete")}</button>`}
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
        <button class="secondary-button danger-button" data-action="gallery-delete-selected" type="button"${selectedCount ? "" : " disabled"}>${buttonContent("tabler:trash", `Delete ${selectedCount || ""}`.trim() || "Delete")}</button>
        <button class="icon-button close-viewer-button" data-action="close-gallery" type="button" aria-label="Close gallery" title="Close">${iconHtml("tabler:x")}</button>
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
      ${headerHtml("Spirit", "Personal reading plans.")}
      ${emptyStateHtml("Plan could not load.", state.spiritPlanError)}
    `);
  }
  if (!state.spiritPlan) {
    return panelHtml(`
      ${headerHtml("Spirit", "Personal reading plans.")}
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

  return panelHtml(`
    ${headerHtml("Spirit", "Personal reading plans.", `
      <div class="action-row spirit-actions">
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
    `)}
    <div class="spirit-dashboard">
      ${trackerStripHtml("Spirit")}
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
          <small>${escapeHtml(work.author)}${work.selection ? ` · ${escapeHtml(work.selection)}` : ""}</small>
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
    ${headerHtml(work.title, `${work.author}${work.selection ? ` · ${work.selection}` : ""}`, `
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
  if (state.artifactMode === "viewer" && note) return artifactReaderHtml(note, `${dashboard} note`);

  const notes = rootNotesForDashboard(state.artifactStore, dashboard);
  return panelHtml(`
    ${headerHtml(`${dashboard} Notes`, "Shared artifacts stored in the local browser first, ready for later analysis across the full root database.", `<button class="secondary-button" data-action="new-artifact-note" data-dashboard="${dashboard}">${buttonContent("tabler:notes", "New Note")}</button>`)}
    ${notes.length ? `
      <div class="scroll-area">
        <div class="section-list">
          ${notes.map((noteItem, index) => `
            <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(noteItem.title)}</strong>
              <small>${escapeHtml(shortSummary(noteItem.body, "No note text yet"))}</small>
              <em>${iconHtml("tabler:notes")} ${escapeHtml(noteItem.dashboard)}</em>
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
      <button class="secondary-button" data-action="edit-artifact-note">${buttonContent("tabler:pencil", "Edit")}</button>
      <button class="secondary-button danger-button" data-action="delete-artifact-note" data-id="${note.id}">${buttonContent("tabler:trash", "Delete")}</button>
      <button class="icon-button close-viewer-button" data-action="close-artifact-viewer" type="button" aria-label="Close note" title="Close">${iconHtml("tabler:x")}</button>
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
    const title = event.role === "thought" && event.thoughtLabel ? event.thoughtLabel : event.title;
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
    const auditEntries = Array.isArray(artifact.properties?.audit) ? artifact.properties.audit : [];
    if (auditEntries.length) {
      auditEntries.forEach((entry) => {
        addEvent({
          id: `${artifact.id}-${entry.at || entry.action}`,
          artifactId: artifact.id,
          title: artifact.title,
          role: artifact.properties?.role || "",
          thoughtLabel: artifact.properties?.thoughtLabel || "",
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
  const label = `${event.dashboard} ${event.action}`;
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
    if (note.dashboard !== "Life") return artifactReaderHtml(note, `${note.dashboard} note`);
    if (note.properties?.role !== "life-journal") return artifactReaderHtml(note, "Life thought");
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
    ${headerHtml("Life", "Calendar-first journal, habits, and app activity.")}
    <div class="life-dashboard">
      ${trackerStripHtml("Life")}
      ${lifeToolSwitcherHtml()}
      <div class="life-mode-panel">
        ${lifePanelHtml()}
      </div>
    </div>
  `);
}

function lifeToolSwitcherHtml() {
  const activeTool = state.lifeTool || "calendar";
  const modes = [
    ["calendar", "Calendar", "tabler:calendar-month"],
    ["todo", "Todo List", "tabler:checkbox"],
    ["projects", "Projects", "tabler:folders"],
    ["notes", "Notes", "tabler:notes"]
  ];
  return `
    <nav class="life-mode-switcher life-tool-switcher" aria-label="Life tools">
      ${modes.map(([mode, label, icon]) => `
        <button class="body-mode-button${activeTool === mode ? " is-active" : ""}" data-action="set-life-tool" data-tool="${mode}" type="button" aria-pressed="${activeTool === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
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
  const tool = state.lifeTool || "calendar";
  if (tool === "todo") return lifeTodoHtml();
  if (tool === "projects") return lifeProjectsHtml();
  if (tool === "notes") return lifeNotesHtml();
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
        <button class="secondary-button" data-action="new-artifact-note" data-dashboard="Life">${buttonContent("tabler:notes", "New Note")}</button>
      </div>
      <div class="life-event-list">${events.length ? events.map(lifeEventRowHtml).join("") : emptyStateHtml("Nothing logged today.", "Create a Life note or edit anything in the app to add activity here.")}</div>
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
        <button class="secondary-button" data-action="new-artifact-note" data-dashboard="Life">${buttonContent("tabler:notes", "New Note")}</button>
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
        <button class="secondary-button" data-action="new-artifact-note" data-dashboard="Life">${buttonContent("tabler:notes", "New Note")}</button>
      </div>
      <div id="life-fullcalendar" class="life-fullcalendar" aria-label="Life month calendar"></div>
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
              <span>${date.getDate()}</span>
              <strong>${events.length ? `${events.length} event${events.length === 1 ? "" : "s"}` : ""}</strong>
              ${events.slice(0, 3).map((event) => `<small><em>${escapeHtml(formatEventTime(event.timestamp))}</em><span>${escapeHtml(event.dashboard)} ${escapeHtml(event.action)}</span></small>`).join("")}
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
  return `
    <article class="life-todo-card${task.status === "complete" ? " is-complete" : ""}${isProjectTask ? " is-project-task" : ""}" data-action="open-life-task" ${taskAttrs} tabindex="0" role="button" aria-label="Open ${escapeHtml(task.title)}">
      <button class="life-todo-check" data-action="toggle-life-task" ${taskAttrs} type="button" aria-label="${task.status === "complete" ? "Reopen" : "Complete"} ${escapeHtml(task.title)}" title="${task.status === "complete" ? "Reopen" : "Complete"}">
        ${iconHtml(task.status === "complete" ? "tabler:circle-check" : "tabler:circle")}
      </button>
      <h4>${escapeHtml(task.title)}</h4>
    </article>
  `;
}

function lifeTodoHtml() {
  const tasks = lifeTaskItems();
  const open = tasks.filter((task) => task.status !== "complete");
  const complete = tasks.filter((task) => task.status === "complete");
  return `
    <section class="body-card life-card life-todo-view">
      <div class="body-card-heading">
        <div>
          <h3>Todo List</h3>
          <p>Standalone todos and project tasks stay connected here and inside Projects.</p>
        </div>
      </div>
      <div class="life-quick-add">
        <input id="life-todo-title" type="text" placeholder="Add a task">
        <button class="primary-button" data-action="add-life-todo" type="button">${buttonContent("tabler:plus", "Add")}</button>
      </div>
      <div class="life-todo-columns">
        <section>
          <h4>Todo</h4>
          <div class="life-todo-stack">${open.length ? open.map(lifeTodoCardHtml).join("") : "<p>No open todos.</p>"}</div>
        </section>
        <section>
          <h4>Done</h4>
          <div class="life-todo-stack">${complete.length ? complete.map(lifeTodoCardHtml).join("") : "<p>No completed todos.</p>"}</div>
        </section>
      </div>
    </section>
  `;
}

function lifeProjectNavButtonHtml(entity, action, active, attrs = "") {
  return `
    <button class="life-project-nav-button${active ? " is-active" : ""}" data-action="${action}" ${attrs} type="button">
      <strong>${escapeHtml(entity.title)}</strong>
      <small>${escapeHtml(entity.status || "planned")}${entity.assignedDate ? ` / ${escapeHtml(formatDateLabel(entity.assignedDate))}` : ""}</small>
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
  const detail = task
    ? lifeProjectDetailHtml("task", task)
    : phase
      ? lifeProjectDetailHtml("phase", phase)
      : project
        ? lifeProjectDetailHtml("project", project)
        : emptyStateHtml("Select or add a project.", "Projects organize phases, tasks, notes, status, assignments, and attachments.");
  return `
    <section class="body-card life-card life-projects-view">
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
          ${project ? `
            <div class="life-quick-add">
              <input id="life-phase-title" type="text" placeholder="New phase">
              <button class="secondary-button" data-action="add-life-phase" data-project-id="${escapeHtml(project.id)}" type="button">${buttonContent("tabler:plus", "Phase")}</button>
            </div>
            <div class="life-project-nav-section">
              <h4>Phases</h4>
              ${project.phases.length ? project.phases.map((item) => lifeProjectNavButtonHtml(item, "select-life-phase", item.id === phase?.id, `data-id="${escapeHtml(item.id)}"`)).join("") : "<p>No phases yet.</p>"}
            </div>
          ` : ""}
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
        </aside>
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
      ` : emptyStateHtml("No Life notes yet.", "Add a journal note to track a day, habit, goal, or reflection.")}
    </section>
  `;
}

function bodyTimerSwitcherHtml() {
  return `
    <nav class="body-mode-switcher body-timer-switcher" aria-label="Body timers">
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
  if (state.artifactMode === "viewer" && note) return artifactReaderHtml(note, "Body note");

  const notes = rootNotesForDashboard(state.artifactStore, "Body");
  const nutrition = state.bodyTracker.nutrition;
  const workouts = state.bodyTracker.workouts;
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
            <p>These are Body artifacts and appear under Body in the left menu.</p>
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
        ` : emptyStateHtml("No Body notes yet.", "Add a note to track fasting, meals, symptoms, workouts, or measurements.")}
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
          <button class="primary-button" data-action="add-body-workout">${buttonContent("tabler:barbell", "Add Workout")}</button>
        </div>
        ${workouts.length ? `
          <div class="body-workout-list">
            ${workouts.map((workout) => `
              <article class="body-workout-item">
                <div>
                  <h4>${escapeHtml(workout.title)}</h4>
                  <p>${escapeHtml(workout.type)} · ${Math.round(Number(workout.minutes) || 0)} min · effort ${Math.round(Number(workout.effort) || 0)}/10</p>
                  ${workout.notes ? `<p>${escapeHtml(workout.notes)}</p>` : ""}
                </div>
                <button class="icon-button danger-button" data-action="delete-body-workout" data-id="${workout.id}" type="button" aria-label="Delete workout" title="Delete">${iconHtml("tabler:trash")}</button>
              </article>
            `).join("")}
          </div>
        ` : emptyStateHtml("No workouts yet.", "Add a quick manual workout log.")}
      </section>`
  };

  return panelHtml(`
    ${headerHtml("Body", "Timers, nutrition, movement, and notes.")}
    <div class="body-dashboard">
      ${trackerStripHtml("Body")}
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
    <nav class="body-mode-switcher" aria-label="Body tools">
      ${modes.map(([mode, label, icon]) => `
        <button class="body-mode-button${state.bodyMode === mode ? " is-active" : ""}" data-action="set-body-mode" data-mode="${mode}" type="button" aria-pressed="${state.bodyMode === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
    </nav>
  `;
}

function mindHtml(compendium, block) {
  const note = findArtifact(state.artifactStore, state.selectedArtifactId);
  if (state.artifactMode === "editor" && note?.dashboard === "Mind") return dashboardNoteEditorHtml(note);
  if (state.artifactMode === "viewer" && note?.dashboard === "Mind") return artifactReaderHtml(note, "Mind note");
  if (state.mindMode === "compendium-editor" && compendium) return compendiumEditorHtml(compendium);
  if (state.mindMode === "block-editor" && block) return blockEditorHtml(block);
  if (state.mindMode === "block-viewer" && block) {
    return panelHtml(`
      ${headerHtml(block.title, "", `
        <div class="action-row">
          <button class="secondary-button" data-action="edit-block">${buttonContent("tabler:pencil", "Edit")}</button>
          <button class="secondary-button danger-button" data-action="delete-block" data-id="${block.id}">${buttonContent("tabler:trash", "Delete")}</button>
          <button class="icon-button close-viewer-button" data-action="manager" type="button" aria-label="Close section viewer" title="Close">${iconHtml("tabler:x")}</button>
        </div>
      `)}
      <div class="reader-panel"><div class="markdown-body">${readerBodyHtml(block.title, block.body)}</div></div>
    `);
  }
  if (state.mindMode === "reader" && compendium) return compendiumReaderHtml(compendium);
  if (state.mindMode === "manager" && compendium) return compendiumManagerHtml(compendium);
  return mindGridHtml();
}

function mindGridHtml() {
  const mindNotes = rootNotesForDashboard(state.artifactStore, "Mind");
  return panelHtml(`
    ${headerHtml("Mind", "Organize your knowledge and share with the world.", `<button class="secondary-button" data-action="new-compendium">${buttonContent("tabler:plus", "New")}</button>`)}
    ${trackerStripHtml("Mind")}
    <div class="scroll-area">
      <div class="compendium-grid">
        ${state.compendiums.map((compendium) => `
          <button class="compendium-tile" data-action="open-compendium" data-id="${compendium.id}">
            <span>${escapeHtml(compendium.title)}</span>
            <small>${compendium.blocks.length} sections</small>
            <em>edited ${escapeHtml(compendium.edited)}</em>
          </button>
        `).join("")}
      </div>
      ${mindNotes.length ? `
        <section class="mind-thought-section">
          <div class="body-card-heading">
            <div>
              <h3>Thoughts</h3>
              <p>Quick notes opened from the Mind thought orbs.</p>
            </div>
          </div>
          <div class="section-list body-notes-list">
            ${newestCreatedFirst(mindNotes).map((noteItem, index) => `
              <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <strong>${escapeHtml(noteItem.title)}</strong>
                <small>${escapeHtml(shortSummary(noteItem.body, "No thought text yet"))}</small>
                <em>${iconHtml(noteItem.properties?.thoughtIcon || "tabler:message-circle")} ${escapeHtml(noteItem.properties?.thoughtLabel || "Thought")}</em>
              </button>
            `).join("")}
          </div>
        </section>
      ` : ""}
    </div>
  `);
}

function compendiumManagerHtml(compendium) {
  const actions = `
    <div class="action-row">
      <button class="secondary-button" data-action="reader">${buttonContent("tabler:book-2", "Read")}</button>
      <button class="secondary-button" data-action="edit-compendium">${buttonContent("tabler:pencil", "Edit")}</button>
      <button class="secondary-button" data-action="add-block">${buttonContent("tabler:plus", "Add")}</button>
      <button class="secondary-button danger-button" data-action="delete-compendium" data-id="${compendium.id}">${buttonContent("tabler:trash", "Delete")}</button>
    </div>
  `;
  return panelHtml(`
    ${headerHtml(compendium.title, "Compendium manager: add, open, and edit ordered content.", actions)}
    ${compendium.blocks.length ? sectionListHtml(compendium) : emptyStateHtml("No items yet.", "Add the first item to begin building the compendium.")}
  `);
}

function sectionListHtml(compendium) {
  return `
    <div class="scroll-area">
      <div class="section-list" data-section-sort-list data-compendium-id="${escapeHtml(compendium.id)}">
        ${compendium.blocks.map((section, index) => `
          <button class="section-row" data-action="open-block" data-id="${escapeHtml(section.id)}" data-section-row>
            <span class="section-number-handle" data-section-drag-handle data-id="${escapeHtml(section.id)}" title="Drag to reorder" aria-label="Drag section ${String(index + 1).padStart(2, "0")} to reorder">${String(index + 1).padStart(2, "0")}</span>
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
    ...compendium.blocks.map((section) => ({
      key: section.id,
      body: `
        <section class="reader-section">
          <button class="reader-section-title" data-action="open-block" data-id="${section.id}">${escapeHtml(section.title)}</button>
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
    subtitle: "Title and body. Content is managed inside the compendium.",
    saveAction: "save-compendium",
    cancelAction: "manager",
    id: compendium.id,
    valueTitle: compendium.title,
    valueBody: compendium.body
  });
}

function blockEditorHtml(block) {
  return editorHtml({
    title: "Edit Item",
    subtitle: "This can be a chapter, part, terms list, index, or any future book unit.",
    saveAction: "save-block",
    cancelAction: "block-viewer",
    id: block.id,
    valueTitle: block.title,
    valueBody: block.body
  });
}

function dashboardNoteEditorHtml(note) {
  if (note.dashboard === "Life" && note.properties?.role === "life-journal") return lifeJournalEditorHtml(note);
  const isThought = note.properties?.role === "thought";
  return editorHtml({
    title: isThought ? "Edit Thought" : "Edit Note",
    subtitle: isThought ? `${note.dashboard} thought / ${note.properties?.thoughtLabel || "Quick thought"}` : `${note.dashboard} artifact note. It uses the same root schema as every dashboard.`,
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
        <button class="secondary-button danger-button" data-action="delete-artifact-note" data-id="${note.id}">${buttonContent("tabler:trash", "Delete")}</button>
        <button class="icon-button close-viewer-button" data-action="artifact-viewer" type="button" aria-label="Close editor" title="Close">${iconHtml("tabler:x")}</button>
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
        ${saveAction === "save-artifact-note" ? `<button class="secondary-button danger-button" data-action="delete-artifact-note" data-id="${id}">${buttonContent("tabler:trash", "Delete")}</button>` : ""}
        ${saveAction === "save-compendium" ? `<button class="secondary-button danger-button" data-action="delete-compendium" data-id="${id}">${buttonContent("tabler:trash", "Delete")}</button>` : ""}
        ${saveAction === "save-block" ? `<button class="secondary-button danger-button" data-action="delete-block" data-id="${id}">${buttonContent("tabler:trash", "Delete")}</button>` : ""}
        <button class="icon-button close-viewer-button" data-action="${cancelAction}" type="button" aria-label="Close editor" title="Close">${iconHtml("tabler:x")}</button>
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

function headerHtml(title, subtitle, actions = "") {
  return `
    <header class="panel-header">
      <div>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>
      ${actions}
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
      thoughtTooltipLongPressTimer = window.setTimeout(() => showThoughtTooltip(element), THOUGHT_TOOLTIP_LONG_PRESS_MS);
    });
    element.addEventListener("pointerup", () => window.clearTimeout(thoughtTooltipLongPressTimer));
    element.addEventListener("pointercancel", hideThoughtTooltip);
  });
}

function bindActions() {
  app.querySelectorAll("[data-action]").forEach((element) => {
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
  list.querySelectorAll("[data-section-row]").forEach((row, index) => {
    const number = String(index + 1).padStart(2, "0");
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
      const blockId = activeRow?.dataset.id;
      if (!activeRow || !compendiumId || !blockId) return;

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
        if (!reorderCompendiumBlock(compendiumId, blockId, targetIndex)) return;
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
  if (state.mobileMenuOpen && !element.closest(".sidebar") && action !== "toggle-mobile-menu") {
    state.mobileMenuOpen = false;
  }
  if (action === "home") goHome();
  if (action === "dashboard-root") {
    if (state.active === "Mind") {
      setState({ active: "Mind", mindMode: "grid", selectedCompendiumId: null, selectedBlockId: null });
    } else if (state.active === "Spirit") {
      setState({ selectedSpiritBookKey: null, artifactMode: "grid", selectedArtifactId: null });
    } else {
      setState({ artifactMode: "grid", selectedArtifactId: null });
    }
  }
  if (action === "compendium-root") setState({ mindMode: "manager", selectedBlockId: null });
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
  if (action === "tracker-page") setTrackerPage(element.dataset.area, element.dataset.direction, Number(element.dataset.maxPage || 0), element.dataset.editable === "true");
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
  if (action === "open-compendium") openCompendium(element.dataset.id);
  if (action === "open-mind-section") openMindSection(element.dataset.parentId, element.dataset.id);
  if (action === "open-artifact-note") openArtifactNote(element.dataset.id, element.dataset.returnActive || "");
  if (action === "open-life-activity") openActivityArtifact(element.dataset.id);
  if (action === "export-artifacts") exportArtifacts();
  if (action === "import-artifacts") importArtifacts();
  if (action === "clear-app-data") clearAppData();
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
      selectedBlockId: null,
      selectedSpiritBookKey: null,
      trackerAddArea: "",
      trackerEditKey: "",
      trackerDeleteKey: ""
    });
  }
  if (action === "close-settings") goHome();
  if (action === "set-settings-tab") setState({ settingsTab: element.dataset.tab === "dashboard" ? "interface" : element.dataset.tab || "getting-started", trackerAddArea: "", trackerEditKey: "", trackerDeleteKey: "" });
  if (action === "start-add-tracker") setState({ trackerAddArea: element.dataset.area || "", trackerEditKey: "", trackerDeleteKey: "" });
  if (action === "cancel-add-tracker") setState({ trackerAddArea: "" });
  if (action === "start-edit-tracker") {
    if (state.suppressNextTrackerEditClick) {
      state.suppressNextTrackerEditClick = false;
      return;
    }
    setState({ trackerEditKey: trackerEditKey(element.dataset.area, element.dataset.id), trackerDeleteKey: "", trackerAddArea: "" });
  }
  if (action === "cancel-edit-tracker") setState({ trackerEditKey: "", trackerDeleteKey: "" });
  if (action === "save-edit-tracker") updateTracker(element.dataset.area, element.dataset.id);
  if (action === "request-remove-tracker") setState({ trackerDeleteKey: trackerEditKey(element.dataset.area, element.dataset.id) });
  if (action === "cancel-remove-tracker") setState({ trackerDeleteKey: "" });
  if (action === "save-tracker") addTracker(element.dataset.area);
  if (action === "remove-tracker") removeTracker(element.dataset.area, element.dataset.id);
  if (action === "quick-thought") quickThought(element.dataset.area, element.dataset.id);
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
  if (action === "delete-block") deleteBlock(element.dataset.id);
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
  if (action === "add-block") addBlock();
  if (action === "open-block") setState({ selectedBlockId: element.dataset.id, mindMode: "block-viewer" });
  if (action === "edit-block") setState({ mindMode: "block-editor" });
  if (action === "block-viewer") setState({ mindMode: "block-viewer" });
  if (action === "edit-artifact-note") setState({ artifactMode: "editor" });
  if (action === "artifact-viewer") setState({ artifactMode: "viewer" });
  if (action === "close-artifact-viewer") closeArtifactViewer();
  if (action === "save-compendium") saveCompendium(element.dataset.id, editorTitle(), editorBody());
  if (action === "save-block") saveBlock(element.dataset.id, editorTitle(), editorBody());
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
bindEnvironmentMedia(installedAppMedia);
bindEnvironmentMedia(mobileViewportMedia);

loadArtifactStore().then(async (artifactStore) => {
  if (artifactStore.appState && !hasStoredAppState()) {
    await restoreImportedAppState(artifactStore.appState);
  }
  setState({
    artifactStore,
    compendiums: artifactStoreToCompendiums(artifactStore)
  });
});

loadSpiritPlan();

window.setInterval(updateBodyTimerDom, 1000);
