import { dashboardCards, today } from "./data.js";
import { donationModalHtml, bindDonationFlow } from "./donations.js";
import { deleteLocalImages, listLocalImages, resolveLocalImageUrl, storeLocalImage } from "./localMedia.js";
import { escapeHtml, renderMarkdown } from "./markdown.js";
import {
  artifactStoreToCompendiums,
  compendiumsToArtifactStore,
  findArtifact,
  loadArtifactStore,
  removeArtifact,
  rootNotesForDashboard,
  saveArtifactStore,
  upsertArtifact
} from "./storage.js";

const app = document.getElementById("app");
const BODY_TRACKER_KEY = "ourstuff.bodyTracker.v1";
const SPIRIT_PROGRESS_KEY = "ourstuff.spiritPlanProgress.v1";
const RING_CIRCUMFERENCE = 502.6548245743669;
const SIDEBAR_DEFAULT_WIDTH = 270;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 540;
const MOBILE_MENU_QUERY = "(max-width: 860px)";
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

function createDefaultBodyTracker() {
  return {
    fast: {
      active: false,
      label: "Manual fast",
      targetHours: 16,
      startTimestamp: null,
      lastCompletedHours: 0
    },
    nutrition: {
      dateKey: todayDateKey(),
      targetCalories: 2000,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    },
    workouts: []
  };
}

function loadBodyTracker() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BODY_TRACKER_KEY));
    if (!parsed?.fast || !parsed?.nutrition) return createDefaultBodyTracker();
    return {
      ...createDefaultBodyTracker(),
      ...parsed,
      fast: { ...createDefaultBodyTracker().fast, ...parsed.fast },
      nutrition: { ...createDefaultBodyTracker().nutrition, ...parsed.nutrition },
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : []
    };
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

const state = {
  active: "Dashboard",
  flipped: null,
  artifactStore: null,
  compendiums: [],
  selectedCompendiumId: null,
  selectedBlockId: null,
  selectedArtifactId: null,
  artifactReturnActive: "",
  mindMode: "grid",
  artifactMode: "grid",
  bodyMode: "fasting",
  lifeMode: "month",
  dashboardPeriod: "week",
  bodyTracker: loadBodyTracker(),
  spiritPlan: null,
  spiritPlanError: "",
  spiritPlanId: "ten-year",
  spiritYear: 1,
  selectedSpiritBookKey: null,
  spiritProgress: loadSpiritProgress(),
  galleryImages: null,
  gallerySelectedIds: [],
  galleryThumbSize: 180,
  mobileMenuOpen: initialMenuOpen(),
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  suppressNextMenuToggle: false,
  sidebarExpanded: {
    Mind: true,
    Body: true,
    Spirit: true,
    Life: true
  },
  sidebarPages: {}
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
  return `<iconify-icon class="button-icon" icon="${name}" aria-hidden="true"></iconify-icon>`;
}

function buttonContent(icon, label, labelClass = "button-label") {
  return `${iconHtml(icon)}<span class="${labelClass}">${label}</span>`;
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
  const start = state.bodyTracker.fast.startTimestamp;
  if (!state.bodyTracker.fast.active || !start) return 0;
  return Math.max(0, Date.now() - start);
}

function getFastProgress() {
  const targetMs = Math.max(1, state.bodyTracker.fast.targetHours) * 60 * 60 * 1000;
  return Math.min(1, getFastElapsedMs() / targetMs);
}

function getNutritionProgress() {
  const target = Math.max(1, Number(state.bodyTracker.nutrition.targetCalories) || 1);
  return Math.min(1, (Number(state.bodyTracker.nutrition.calories) || 0) / target);
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
    artifact.dashboard === "Spirit" &&
    artifact.properties?.role === "spirit-book-note"
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

function clampSidebarWidth(value) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(Number(value) || SIDEBAR_DEFAULT_WIDTH)));
}

function setSidebarWidth(width, options = {}) {
  const nextWidth = clampSidebarWidth(width);
  state.sidebarWidth = nextWidth;
  const workspace = app.querySelector(".workspace");
  if (workspace) workspace.style.setProperty("--sidebar-width", `${nextWidth}px`);
  if (options.open) {
    state.mobileMenuOpen = true;
    if (workspace) workspace.classList.add("has-mobile-menu");
    const toggle = app.querySelector(".mobile-menu-toggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = ">>> COLLAPSE MENU >>>";
    }
  }
}

function toggleMobileMenu() {
  setState({ mobileMenuOpen: !state.mobileMenuOpen });
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

function exportArtifacts() {
  if (!state.artifactStore) return;
  const dateKey = todayDateKey();
  const payload = JSON.stringify(state.artifactStore, null, 2);
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
  if (!work || !state.artifactStore) return;
  const current = spiritArtifactForKey(key);
  const completed = !isSpiritComplete(key);

  state.spiritProgress = { ...state.spiritProgress, [key]: completed };
  saveSpiritProgress();
  persistArtifactStore(upsertArtifact(state.artifactStore, spiritReadingArtifactPayload(work, completed, current)));
  render();
}

function addSpiritBookNote(key) {
  const work = spiritWorks().find((entry) => entry.key === key);
  if (!work || !state.artifactStore) return;
  const readingArtifact = ensureSpiritReadingArtifact(work);
  const noteId = makeId("spirit-note");
  const focus = Array.isArray(work.blackBox?.outputs) ? work.blackBox.outputs : [];
  const now = nowIso();
  const note = {
    id: noteId,
    type: "note",
    dashboard: "Spirit",
    parentId: readingArtifact.id,
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
      readingArtifactId: readingArtifact.id,
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
  const readingWithChild = {
    ...readingArtifact,
    childIds: Array.from(new Set([...(readingArtifact.childIds || []), noteId])),
    edited: now
  };
  persistArtifactStore(upsertArtifact(upsertArtifact(state.artifactStore, readingWithChild), note));
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

function saveBodyFastSettings() {
  state.bodyTracker.fast = {
    ...state.bodyTracker.fast,
    label: document.getElementById("body-fast-label")?.value.trim() || "Manual fast",
    targetHours: Math.max(1, numberFromInput("body-fast-target", 16))
  };
  saveBodyTracker();
  appendBodyLogNote(
    "Fasting settings saved",
    `## Fasting settings\n\nSaved: ${currentTimestampLabel()}\n\n- Label: ${state.bodyTracker.fast.label}\n- Target hours: ${state.bodyTracker.fast.targetHours}`
  );
  render();
}

function startBodyFast() {
  state.bodyTracker.fast = {
    ...state.bodyTracker.fast,
    label: document.getElementById("body-fast-label")?.value.trim() || state.bodyTracker.fast.label,
    targetHours: Math.max(1, numberFromInput("body-fast-target", state.bodyTracker.fast.targetHours)),
    active: true,
    startTimestamp: Date.now()
  };
  saveBodyTracker();
  appendBodyLogNote(
    "Fast started",
    `## Fast started\n\nStarted: ${currentTimestampLabel()}\n\n- Label: ${state.bodyTracker.fast.label}\n- Target hours: ${state.bodyTracker.fast.targetHours}`
  );
  render();
}

function stopBodyFast() {
  const completedHours = getFastElapsedMs() / 3600000;
  state.bodyTracker.fast = {
    ...state.bodyTracker.fast,
    active: false,
    startTimestamp: null,
    lastCompletedHours: completedHours
  };
  saveBodyTracker();
  appendBodyLogNote(
    "Fast stopped",
    `## Fast stopped\n\nStopped: ${currentTimestampLabel()}\n\n- Label: ${state.bodyTracker.fast.label}\n- Completed hours: ${completedHours.toFixed(1)}\n- Target hours: ${state.bodyTracker.fast.targetHours}`
  );
  render();
}

function saveBodyNutrition() {
  state.bodyTracker.nutrition = {
    dateKey: todayDateKey(),
    targetCalories: Math.max(1, numberFromInput("body-target-calories", 2000)),
    calories: Math.max(0, numberFromInput("body-calories", 0)),
    protein: Math.max(0, numberFromInput("body-protein", 0)),
    carbs: Math.max(0, numberFromInput("body-carbs", 0)),
    fat: Math.max(0, numberFromInput("body-fat", 0))
  };
  saveBodyTracker();
  appendBodyLogNote(
    "Nutrition logged",
    `## Nutrition log\n\nSaved: ${currentTimestampLabel()}\n\n- Target calories: ${state.bodyTracker.nutrition.targetCalories}\n- Calories: ${state.bodyTracker.nutrition.calories}\n- Protein: ${state.bodyTracker.nutrition.protein}g\n- Carbs: ${state.bodyTracker.nutrition.carbs}g\n- Fat: ${state.bodyTracker.nutrition.fat}g`
  );
  render();
}

function resetBodyNutrition() {
  state.bodyTracker.nutrition = {
    ...createDefaultBodyTracker().nutrition,
    targetCalories: state.bodyTracker.nutrition.targetCalories
  };
  saveBodyTracker();
  appendBodyLogNote(
    "Nutrition reset",
    `## Nutrition reset\n\nSaved: ${currentTimestampLabel()}\n\n- Target calories: ${state.bodyTracker.nutrition.targetCalories}\n- Calories: ${state.bodyTracker.nutrition.calories}\n- Protein: ${state.bodyTracker.nutrition.protein}g\n- Carbs: ${state.bodyTracker.nutrition.carbs}g\n- Fat: ${state.bodyTracker.nutrition.fat}g`
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
  setState({
    bodyMode: mode,
    artifactMode: "grid",
    selectedArtifactId: null
  });
}

function setLifeMode(mode) {
  setState({
    lifeMode: mode,
    artifactMode: "grid",
    selectedArtifactId: null
  });
}

function setDashboardPeriod(period) {
  setState({ dashboardPeriod: ["day", "week", "year"].includes(period) ? period : "week" });
}

function render() {
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
  app.innerHTML = `
    <div class="workspace${state.mobileMenuOpen ? " has-mobile-menu" : ""}" style="--sidebar-width: ${clampSidebarWidth(state.sidebarWidth)}px;">
      <button class="mobile-menu-toggle" data-action="toggle-mobile-menu" type="button" aria-expanded="${state.mobileMenuOpen ? "true" : "false"}">
        ${state.mobileMenuOpen ? ">>> COLLAPSE MENU >>>" : ">>> EXPAND MENU >>>"}
      </button>
      ${sidebarHtml(compendium)}
      <section class="content-shell">
        ${pathBarHtml(compendium, block, spiritBook)}
        <div class="content-stage">${contentHtml(compendium, block)}</div>
      </section>
    </div>
    ${donationModalHtml()}
  `;
  bindActions();
  bindSidebarResize();
  bindSidebarHorizontalScroll();
  bindDashboardBalanceHover();
  bindGalleryControls();
  bindEditorMedia();
  bindLocalAssetImages();
  bindDonationFlow(document);
  updateBodyTimerDom();
  renderLifeMonthCalendar();
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
                ? state.compendiums.map((item) => `
                  <button class="sidebar-item${compendium?.id === item.id ? " is-active" : ""}" data-action="open-compendium" data-id="${item.id}">
                    <span class="sidebar-item-label">${escapeHtml(item.title)}</span>
                  </button>
                `).join("")
                : label === "Spirit"
                  ? spiritNotes().map((item) => `
                  <button class="sidebar-item${state.selectedArtifactId === item.id ? " is-active" : ""}" data-action="open-artifact-note" data-id="${item.id}">
                    <span class="sidebar-item-label">${escapeHtml(item.title)}</span>
                  </button>
                `).join("")
                  : rootNotesForDashboard(state.artifactStore, label).map((item) => `
                  <button class="sidebar-item${state.selectedArtifactId === item.id ? " is-active" : ""}" data-action="open-artifact-note" data-id="${item.id}">
                    <span class="sidebar-item-label">${escapeHtml(item.title)}</span>
                  </button>
                `).join("");

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
          <button class="sidebar-text-link" data-action="open-getting-started" type="button">Getting Started</button>
          <span aria-hidden="true">•</span>
          <button class="sidebar-text-link" data-action="open-gallery" type="button">Gallery</button>
          <span aria-hidden="true">•</span>
          <button class="sidebar-text-link" data-action="export-artifacts" type="button">Export</button>
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
  return `
    <div class="sidebar-group-page">
      ${itemButtons.slice(activePage * 5, activePage * 5 + 5).join("")}
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
  if (state.active === "Getting Started") return gettingStartedHtml();
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
      <div class="dashboard-divider" aria-hidden="true"></div>
      ${dashboardAnalyticsHtml()}
    </div>
  `;
}

function dashboardAnalyticsHtml() {
  const labels = ["Mind", "Body", "Spirit", "Life"];
  const events = lifeEvents().filter((event) => eventIsInPeriod(event, state.dashboardPeriod));
  const counts = Object.fromEntries(labels.map((label) => [label, 0]));
  events.forEach((event) => {
    if (counts[event.dashboard] !== undefined) counts[event.dashboard] += 1;
  });
  const total = labels.reduce((sum, label) => sum + counts[label], 0);
  let cursor = 0;
  const segments = labels.map((label) => {
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
            <svg class="dashboard-pie-chart" viewBox="0 0 148 148" aria-hidden="true">
              ${segments.map(({ label, value, start }) => `
                <circle class="dashboard-pie-segment" data-balance-key="${label}" cx="74" cy="74" r="57" pathLength="100" style="--segment-color: ${DASHBOARD_COLORS[label]}; --segment-start: ${start}; --segment-size: ${value};"></circle>
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

function gettingStartedHtml() {
  return panelHtml(`
    ${headerHtml("Getting Started", "Use the four areas as a simple loop: collect what matters, act on it, reflect, and keep the record useful.", `
      <button class="icon-button close-viewer-button" data-action="close-getting-started" type="button" aria-label="Close getting started" title="Close">${iconHtml("tabler:x")}</button>
    `)}
    <div class="getting-started-page">
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
  `);
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
  const completedCount = works.filter((work) => isSpiritComplete(work.key)).length;
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
      <section class="spirit-summary">
        <div>
          <strong>${escapeHtml(completedCount)}</strong>
          <span>complete</span>
        </div>
        <div>
          <strong>${escapeHtml(works.length)}</strong>
          <span>total readings</span>
        </div>
        <div>
          <strong>${escapeHtml(years.length)}</strong>
          <span>years</span>
        </div>
      </section>
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
              <small>${escapeHtml(noteItem.body.replace(/[#>*`-]/g, ""))}</small>
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
  state.artifactStore.artifacts.forEach((artifact) => {
    const auditEntries = Array.isArray(artifact.properties?.audit) ? artifact.properties.audit : [];
    if (auditEntries.length) {
      auditEntries.forEach((entry) => {
        events.push({
          id: `${artifact.id}-${entry.at || entry.action}`,
          artifactId: artifact.id,
          title: artifact.title,
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
      events.push({
        id: `${artifact.id}-created`,
        artifactId: artifact.id,
        title: artifact.title,
        dashboard: artifact.dashboard,
        type: artifact.type,
        action: "created",
        changed: [],
        dateKey: dateKeyFromValue(artifact.properties?.dateKey || artifact.created),
        timestamp: artifact.created
      });
    }
    if (artifact.edited && artifact.edited !== artifact.created) {
      events.push({
        id: `${artifact.id}-edited`,
        artifactId: artifact.id,
        title: artifact.title,
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

function lifeCalendarEvents() {
  return lifeEvents().map((event) => ({
    id: event.id,
    title: event.title,
    start: event.timestamp && !Number.isNaN(new Date(event.timestamp).getTime())
      ? event.timestamp
      : `${event.dateKey}T12:00:00`,
    allDay: false,
    extendedProps: {
      artifactId: event.artifactId,
      dashboard: event.dashboard,
      action: event.action,
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
      if (artifactId) openArtifactNote(artifactId, "Life");
    },
    eventContent(info) {
      const timeText = info.timeText || formatEventTime(info.event.start);
      const title = info.event.title;
      const dashboard = info.event.extendedProps.dashboard || "";
      const wrapper = document.createElement("div");
      wrapper.className = "life-fc-event-inner";
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
  const canOpen = event.type === "note" && !findArtifact(state.artifactStore, event.artifactId)?.parentId;
  const className = `life-event-row${variant ? ` life-event-row--${variant}` : ""}`;
  return canOpen
    ? `<button class="${className}" data-action="open-artifact-note" data-id="${event.artifactId}" data-return-active="Life" type="button">${inner}</button>`
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
  if (state.artifactMode === "editor" && note?.dashboard === "Life") return lifeJournalEditorHtml(note);
  if (state.artifactMode === "editor" && note) return dashboardNoteEditorHtml(note);
  if (state.artifactMode === "viewer" && note) {
    if (note.dashboard !== "Life") return artifactReaderHtml(note, `${note.dashboard} note`);
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
      ${lifeModeSwitcherHtml()}
      <div class="life-mode-panel">
        ${lifePanelHtml()}
      </div>
    </div>
  `);
}

function lifeModeSwitcherHtml() {
  const modes = [
    ["day", "Day", "tabler:calendar-event"],
    ["week", "Week", "tabler:calendar-week"],
    ["month", "Month", "tabler:calendar-month"],
    ["list", "List", "tabler:list-details"],
    ["notes", "Notes", "tabler:notes"]
  ];
  return `
    <nav class="life-mode-switcher" aria-label="Life tools">
      ${modes.map(([mode, label, icon]) => `
        <button class="body-mode-button${state.lifeMode === mode ? " is-active" : ""}" data-action="set-life-mode" data-mode="${mode}" type="button" aria-pressed="${state.lifeMode === mode ? "true" : "false"}">
          ${buttonContent(icon, label, "body-mode-label")}
        </button>
      `).join("")}
    </nav>
  `;
}

function lifePanelHtml() {
  if (state.lifeMode === "day") return lifeDayHtml();
  if (state.lifeMode === "week") return lifeWeekHtml();
  if (state.lifeMode === "list") return lifeListHtml();
  if (state.lifeMode === "notes") return lifeNotesHtml();
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
              <small>${escapeHtml([noteItem.properties?.mood, ...(noteItem.properties?.habits || [])].filter(Boolean).join(" / ") || noteItem.body.replace(/[#>*`-]/g, ""))}</small>
              <em>${iconHtml("tabler:calendar")} ${escapeHtml(noteItem.properties?.dateKey || noteItem.edited)}</em>
            </button>
          `).join("")}
        </div>
      ` : emptyStateHtml("No Life notes yet.", "Add a journal note to track a day, habit, goal, or reflection.")}
    </section>
  `;
}

function bodyHtml() {
  const note = findArtifact(state.artifactStore, state.selectedArtifactId);
  if (state.artifactMode === "editor" && note) return dashboardNoteEditorHtml(note);
  if (state.artifactMode === "viewer" && note) return artifactReaderHtml(note, "Body note");

  const notes = rootNotesForDashboard(state.artifactStore, "Body");
  const fast = state.bodyTracker.fast;
  const nutrition = state.bodyTracker.nutrition;
  const workouts = state.bodyTracker.workouts;
  const fastProgress = getFastProgress();
  const nutritionProgress = getNutritionProgress();
  const fastDashOffset = RING_CIRCUMFERENCE * (1 - fastProgress);
  const nutritionDashOffset = RING_CIRCUMFERENCE * (1 - nutritionProgress);

  const panels = {
    fasting: `
      <section class="body-card body-card--timer is-active">
        <div class="body-ring-wrap">
          <svg class="body-ring" viewBox="0 0 220 220" aria-hidden="true">
            <circle class="body-ring-track" cx="110" cy="110" r="80"></circle>
            <circle class="body-ring-value" id="body-fast-ring" cx="110" cy="110" r="80" style="stroke-dashoffset: ${fastDashOffset};"></circle>
          </svg>
          <div class="body-ring-center">
            <div class="body-ring-label">${escapeHtml(fast.label)}</div>
            <div class="body-ring-value-text" id="body-fast-time">${formatDuration(getFastElapsedMs())}</div>
            <div class="body-ring-sub">${fast.active ? "Active fast" : "No active fast"}</div>
          </div>
        </div>
        <div class="body-form-grid">
          <label class="body-field">Fast label<input id="body-fast-label" type="text" value="${escapeHtml(fast.label)}"></label>
          <label class="body-field">Target hours<input id="body-fast-target" type="number" min="1" step="1" value="${escapeHtml(fast.targetHours)}"></label>
        </div>
        <div class="action-row body-actions">
          <button class="secondary-button" data-action="save-body-fast-settings">${buttonContent("tabler:device-floppy", "Save")}</button>
          ${fast.active
            ? `<button class="secondary-button danger-button" data-action="stop-body-fast">${buttonContent("tabler:player-stop", "Stop Fast")}</button>`
            : `<button class="primary-button" data-action="start-body-fast">${buttonContent("tabler:player-play", "Start Fast")}</button>`}
        </div>
        <p class="body-card-note">${fast.lastCompletedHours ? `Last completed: ${fast.lastCompletedHours.toFixed(1)} hours` : "Start a fast to track elapsed time against your target."}</p>
      </section>`,

    nutrition: `
      <section class="body-card body-card--nutrition">
        <div class="body-ring-wrap body-ring-wrap--small">
          <svg class="body-ring" viewBox="0 0 220 220" aria-hidden="true">
            <circle class="body-ring-track" cx="110" cy="110" r="80"></circle>
            <circle class="body-ring-value body-ring-value--nutrition" cx="110" cy="110" r="80" style="stroke-dashoffset: ${nutritionDashOffset};"></circle>
          </svg>
          <div class="body-ring-center">
            <div class="body-ring-label">Nutrition</div>
            <div class="body-ring-value-text">${Math.round(Number(nutrition.calories) || 0)}</div>
            <div class="body-ring-sub">of ${Math.round(Number(nutrition.targetCalories) || 0)} cal</div>
          </div>
        </div>
        <div class="body-form-grid body-form-grid--nutrition">
          <label class="body-field">Target calories<input id="body-target-calories" type="number" min="1" step="1" value="${escapeHtml(nutrition.targetCalories)}"></label>
          <label class="body-field">Calories<input id="body-calories" type="number" min="0" step="1" value="${escapeHtml(nutrition.calories)}"></label>
          <label class="body-field">Protein g<input id="body-protein" type="number" min="0" step="1" value="${escapeHtml(nutrition.protein)}"></label>
          <label class="body-field">Carbs g<input id="body-carbs" type="number" min="0" step="1" value="${escapeHtml(nutrition.carbs)}"></label>
          <label class="body-field">Fat g<input id="body-fat" type="number" min="0" step="1" value="${escapeHtml(nutrition.fat)}"></label>
        </div>
        <div class="body-macro-row">
          <span>${Math.round(Number(nutrition.protein) || 0)}g protein</span>
          <span>${Math.round(Number(nutrition.carbs) || 0)}g carbs</span>
          <span>${Math.round(Number(nutrition.fat) || 0)}g fat</span>
        </div>
        <div class="action-row body-actions">
          <button class="secondary-button" data-action="save-body-nutrition">${buttonContent("tabler:device-floppy", "Save Nutrition")}</button>
          <button class="secondary-button danger-button" data-action="reset-body-nutrition">${buttonContent("tabler:restore", "Reset Today")}</button>
        </div>
      </section>`,

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
                <small>${escapeHtml(noteItem.body.replace(/[#>*`-]/g, ""))}</small>
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
    ${headerHtml("Body", "Manual fasting, nutrition, and notes.")}
    <div class="body-dashboard">
      <div class="body-mode-panel">
        ${panels[state.bodyMode] || panels.fasting}
      </div>
      ${bodyModeSwitcherHtml()}
    </div>
  `);
}

function bodyModeSwitcherHtml() {
  const modes = [
    ["fasting", "Fasting", "tabler:clock-hour-4"],
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
  return panelHtml(`
    ${headerHtml("Knowledge", "Organize your knowledge and share with the world.", `<button class="secondary-button" data-action="new-compendium">${buttonContent("tabler:plus", "New")}</button>`)}
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
      <div class="section-list">
        ${compendium.blocks.map((section, index) => `
          <button class="section-row" data-action="open-block" data-id="${section.id}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(section.title)}</strong>
            <small>${escapeHtml(section.body.replace(/[#>*`-]/g, ""))}</small>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function compendiumReaderHtml(compendium) {
  return panelHtml(`
    <div class="reader-heading">
      <div>
        <h2>${escapeHtml(compendium.title)}</h2>
        <div class="markdown-body">${readerBodyHtml(compendium.title, compendium.body, "")}</div>
      </div>
      <button class="icon-button close-viewer-button" data-action="manager" type="button" aria-label="Close reader" title="Close">${iconHtml("tabler:x")}</button>
    </div>
    <section class="reader-book">
      <div class="reader-book-inner">
        ${compendium.blocks.map((section) => `
          <section class="reader-section">
            <button class="reader-section-title" data-action="open-block" data-id="${section.id}">${escapeHtml(section.title)}</button>
            <div class="markdown-body">${renderMarkdown(section.body)}</div>
          </section>
        `).join("")}
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
  if (note.dashboard === "Life") return lifeJournalEditorHtml(note);
  return editorHtml({
    title: "Edit Note",
    subtitle: `${note.dashboard} artifact note. It uses the same root schema as every dashboard.`,
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
        <button class="secondary-button" data-action="artifact-viewer">${buttonContent("tabler:x", "Cancel")}</button>
        <button class="secondary-button" data-action="save-artifact-note" data-id="${note.id}">${buttonContent("tabler:device-floppy", "Save")}</button>
        <button class="secondary-button danger-button" data-action="delete-artifact-note" data-id="${note.id}">${buttonContent("tabler:trash", "Delete")}</button>
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
      ${editorMediaToolbarHtml()}
      <label class="body-field">Journal<textarea id="editor-body" aria-label="Body" placeholder="What happened today? What needs attention?">${escapeHtml(note.body)}</textarea></label>
    </form>
  `);
}

function editorHtml({ title, subtitle, saveAction, cancelAction, id, valueTitle, valueBody }) {
  return panelHtml(`
    ${headerHtml(title, subtitle, `
      <div class="action-row">
        <button class="secondary-button" data-action="${cancelAction}">${buttonContent("tabler:x", "Cancel")}</button>
        <button class="secondary-button" data-action="${saveAction}" data-id="${id}">${buttonContent("tabler:device-floppy", "Save")}</button>
        ${saveAction === "save-artifact-note" ? `<button class="secondary-button danger-button" data-action="delete-artifact-note" data-id="${id}">${buttonContent("tabler:trash", "Delete")}</button>` : ""}
        ${saveAction === "save-compendium" ? `<button class="secondary-button danger-button" data-action="delete-compendium" data-id="${id}">${buttonContent("tabler:trash", "Delete")}</button>` : ""}
        ${saveAction === "save-block" ? `<button class="secondary-button danger-button" data-action="delete-block" data-id="${id}">${buttonContent("tabler:trash", "Delete")}</button>` : ""}
      </div>
    `)}
    <form class="editor-form">
      <input id="editor-title" value="${escapeHtml(valueTitle)}" aria-label="Title">
      ${editorMediaToolbarHtml()}
      <textarea id="editor-body" aria-label="Body">${escapeHtml(valueBody)}</textarea>
    </form>
  `);
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

function bindActions() {
  app.querySelectorAll("[data-action]").forEach((element) => {
    const action = element.dataset.action;
    if (action === "open-donation") return;
    if (action === "select-spirit-plan") {
      element.addEventListener("change", () => selectSpiritPlan(element.value));
    } else {
      element.addEventListener("click", () => handleAction(element));
    }
  });
}

function bindSidebarResize() {
  const toggle = app.querySelector(".mobile-menu-toggle");
  const workspace = app.querySelector(".workspace");
  if (!toggle || !workspace) return;
  if (window.matchMedia(MOBILE_MENU_QUERY).matches) return;

  let startX = 0;
  let startWidth = state.mobileMenuOpen ? state.sidebarWidth : SIDEBAR_MIN_WIDTH;
  let dragging = false;

  toggle.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    startX = event.clientX;
    startWidth = state.mobileMenuOpen ? state.sidebarWidth : SIDEBAR_MIN_WIDTH;
    dragging = false;
    toggle.setPointerCapture?.(event.pointerId);
  });

  toggle.addEventListener("pointermove", (event) => {
    if (startX === 0) return;
    const delta = event.clientX - startX;
    if (!dragging && Math.abs(delta) < 5) return;
    dragging = true;
    const openingFromCollapsed = !state.mobileMenuOpen && delta > 0;
    if (openingFromCollapsed) {
      workspace.classList.add("has-mobile-menu");
    }
    setSidebarWidth(startWidth + delta, { open: state.mobileMenuOpen || openingFromCollapsed });
  });

  const finishDrag = (event) => {
    if (startX === 0) return;
    toggle.releasePointerCapture?.(event.pointerId);
    startX = 0;
    if (dragging) {
      state.suppressNextMenuToggle = true;
      window.setTimeout(() => {
        state.suppressNextMenuToggle = false;
      }, 0);
    }
    dragging = false;
  };

  toggle.addEventListener("pointerup", finishDrag);
  toggle.addEventListener("pointercancel", finishDrag);
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

function editorMediaToolbarHtml() {
  return `
    <div class="editor-media-toolbar">
      <label class="secondary-button editor-media-button">
        ${buttonContent("tabler:photo-plus", "Image")}
        <input data-editor-image-input type="file" accept="image/*" multiple>
      </label>
    </div>
  `;
}

function bindEditorMedia() {
  const editor = document.getElementById("editor-body");
  if (!editor) return;
  app.querySelectorAll("[data-editor-image-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      await insertEditorImages(Array.from(input.files || []));
      input.value = "";
    });
  });
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
    await insertEditorImages(files);
  });
}

async function insertEditorImages(files) {
  const editor = document.getElementById("editor-body");
  if (!editor) return;
  const images = files.filter((file) => file?.type?.startsWith("image/"));
  if (!images.length) return;
  const previousCursor = editor.selectionStart ?? editor.value.length;
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
  insertTextAtEditorCursor(markdownItems.join("\n\n"), previousCursor, editor.selectionEnd ?? previousCursor);
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
  if (action === "open-artifact-note") openArtifactNote(element.dataset.id, element.dataset.returnActive || "");
  if (action === "export-artifacts") exportArtifacts();
  if (action === "open-gallery") openGallery();
  if (action === "close-gallery") goHome();
  if (action === "gallery-select-all") selectAllGalleryImages();
  if (action === "gallery-clear-selection") clearGallerySelection();
  if (action === "gallery-delete-selected") deleteSelectedGalleryImages();
  if (action === "open-getting-started") {
    setState({
      active: "Getting Started",
      flipped: null,
      artifactMode: "grid",
      selectedArtifactId: null,
      selectedCompendiumId: null,
      selectedBlockId: null,
      selectedSpiritBookKey: null
    });
  }
  if (action === "close-getting-started") goHome();
  if (action === "new-compendium") addCompendium();
  if (action === "new-artifact-note") addDashboardNote(element.dataset.dashboard);
  if (action === "delete-compendium") deleteCompendium(element.dataset.id);
  if (action === "delete-block") deleteBlock(element.dataset.id);
  if (action === "delete-artifact-note") deleteDashboardNote(element.dataset.id);
  if (action === "save-body-fast-settings") saveBodyFastSettings();
  if (action === "start-body-fast") startBodyFast();
  if (action === "stop-body-fast") stopBodyFast();
  if (action === "save-body-nutrition") saveBodyNutrition();
  if (action === "reset-body-nutrition") resetBodyNutrition();
  if (action === "add-body-workout") addBodyWorkout();
  if (action === "delete-body-workout") deleteBodyWorkout(element.dataset.id);
  if (action === "set-body-mode") setBodyMode(element.dataset.mode);
  if (action === "set-life-mode") setLifeMode(element.dataset.mode);
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
  if (!state.bodyTracker.fast.active) return;

  const timeEl = document.getElementById("body-fast-time");
  const ringEl = document.getElementById("body-fast-ring");
  if (!timeEl || !ringEl) return;

  timeEl.textContent = formatDuration(getFastElapsedMs());
  ringEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - getFastProgress()));
}

render();

loadArtifactStore().then((artifactStore) => {
  setState({
    artifactStore,
    compendiums: artifactStoreToCompendiums(artifactStore)
  });
});

loadSpiritPlan();

window.setInterval(updateBodyTimerDom, 1000);
