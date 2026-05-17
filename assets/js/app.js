import { dashboardCards, today } from "./data.js";
import { donationModalHtml, bindDonationFlow } from "./donations.js";
import { escapeHtml, renderMarkdown } from "./markdown.js";
import {
  artifactStoreToCompendiums,
  compendiumsToArtifactStore,
  findArtifact,
  loadArtifactStore,
  rootNotesForDashboard,
  saveArtifactStore,
  upsertArtifact
} from "./storage.js";

const app = document.getElementById("app");
const artifactStore = loadArtifactStore();

const state = {
  active: "Dashboard",
  flipped: null,
  artifactStore,
  compendiums: artifactStoreToCompendiums(artifactStore),
  selectedCompendiumId: null,
  selectedBlockId: null,
  selectedArtifactId: null,
  mindMode: "grid",
  artifactMode: "grid"
};

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function selectedCompendium() {
  return state.compendiums.find((item) => item.id === state.selectedCompendiumId) || null;
}

function selectedBlock() {
  const compendium = selectedCompendium();
  return compendium?.blocks.find((block) => block.id === state.selectedBlockId) || null;
}

function setState(next) {
  Object.assign(state, next);
  render();
}

function persistCompendiums() {
  state.artifactStore = compendiumsToArtifactStore(state.compendiums, state.artifactStore);
  saveArtifactStore(state.artifactStore);
}

function persistArtifactStore(nextStore) {
  state.artifactStore = nextStore;
  state.compendiums = artifactStoreToCompendiums(nextStore);
  saveArtifactStore(nextStore);
}

function goHome() {
  setState({
    active: "Dashboard",
    flipped: null,
    mindMode: "grid",
    artifactMode: "grid",
    selectedCompendiumId: null,
    selectedBlockId: null,
    selectedArtifactId: null
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
    selectedArtifactId: null
  });
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

function openArtifactNote(id) {
  const artifact = findArtifact(state.artifactStore, id);
  if (!artifact) return;
  setState({
    active: artifact.dashboard,
    selectedArtifactId: id,
    artifactMode: "viewer",
    selectedCompendiumId: null,
    selectedBlockId: null
  });
}

function addCompendium() {
  const next = {
    id: makeId("compendium"),
    title: `Untitled Compendium ${state.compendiums.length + 1}`,
    body: "## New Compendium\n\nDescribe what this compendium is for.",
    created: today,
    edited: today,
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
  state.compendiums = state.compendiums.map((item) =>
    item.id === id ? { ...item, title, body, edited: today } : item
  );
  persistCompendiums();
  setState({ mindMode: "manager" });
}

function addBlock() {
  const compendium = selectedCompendium();
  if (!compendium) return;
  const nextBlock = {
    id: makeId("block"),
    title: `Section ${compendium.blocks.length + 1}`,
    body: "## New Section\n\nWrite the section body here.",
    created: today,
    edited: today
  };
  state.compendiums = state.compendiums.map((item) =>
    item.id === compendium.id
      ? { ...item, edited: today, blocks: [...item.blocks, nextBlock] }
      : item
  );
  persistCompendiums();
  setState({ selectedBlockId: nextBlock.id, mindMode: "block-editor" });
}

function saveBlock(id, title, body) {
  const compendium = selectedCompendium();
  if (!compendium) return;
  state.compendiums = state.compendiums.map((item) =>
    item.id === compendium.id
      ? {
          ...item,
          edited: today,
          blocks: item.blocks.map((block) =>
            block.id === id ? { ...block, title, body, edited: today } : block
          )
        }
      : item
  );
  persistCompendiums();
  setState({ mindMode: "block-viewer" });
}

function addDashboardNote(dashboard) {
  const note = {
    id: makeId("artifact"),
    type: "note",
    dashboard,
    parentId: null,
    title: `New ${dashboard} Note`,
    body: `## New ${dashboard} Note\n\nWrite the note here.`,
    created: today,
    edited: today,
    childIds: [],
    properties: {
      role: "dashboard-note",
      status: "active"
    },
    analysis: {}
  };
  persistArtifactStore(upsertArtifact(state.artifactStore, note));
  setState({ active: dashboard, selectedArtifactId: note.id, artifactMode: "editor" });
}

function saveDashboardNote(id, title, body) {
  const current = findArtifact(state.artifactStore, id);
  if (!current) return;
  persistArtifactStore(upsertArtifact(state.artifactStore, {
    ...current,
    title,
    body,
    edited: today
  }));
  setState({ selectedArtifactId: id, artifactMode: "viewer" });
}

function render() {
  const compendium = selectedCompendium();
  const block = selectedBlock();
  app.innerHTML = `
    <div class="workspace">
      ${sidebarHtml(compendium)}
      <section class="content-shell">
        ${pathBarHtml(compendium, block)}
        <div class="content-stage">${contentHtml(compendium, block)}</div>
      </section>
    </div>
    ${donationModalHtml()}
  `;
  bindActions();
  bindDonationFlow(document);
}

function sidebarHtml(compendium) {
  const sectionLabels = [
    ["01", "Mind"],
    ["02", "Body"],
    ["03", "Spirit"],
    ["04", "Life"]
  ];
  return `
    <aside class="sidebar">
      <button class="home-button" data-action="home">Dashboard</button>
      <div class="sidebar-groups">
        ${sectionLabels
          .map(([number, label]) => `
            <section class="sidebar-group">
              <h2>${number} ${label}</h2>
              ${label === "Mind" ? state.compendiums.map((item) => `
                <button class="sidebar-item${compendium?.id === item.id ? " is-active" : ""}" data-action="open-compendium" data-id="${item.id}">
                  ${escapeHtml(item.title)}
                </button>
              `).join("") : rootNotesForDashboard(state.artifactStore, label).map((item) => `
                <button class="sidebar-item${state.selectedArtifactId === item.id ? " is-active" : ""}" data-action="open-artifact-note" data-id="${item.id}">
                  ${escapeHtml(item.title)}
                </button>
              `).join("")}
            </section>
          `)
          .join("")}
      </div>
      <div class="sidebar-donate-row">
        <button class="primary-button full-width donate-sidebar" data-action="open-donation" type="button">Thanks / Donate</button>
      </div>
    </aside>
  `;
}

function pathBarHtml(compendium, block) {
  return `
    <nav class="path-bar" aria-label="Current location">
      <button data-action="home">Dashboard</button>
      ${state.active !== "Dashboard" ? `<span>/</span><button data-action="dashboard-root">${escapeHtml(state.active)}</button>` : ""}
      ${compendium ? `<span>/</span><button class="truncate" data-action="compendium-root">${escapeHtml(compendium.title)}</button>` : ""}
      ${block ? `<span>/</span><span class="truncate muted">${escapeHtml(block.title)}</span>` : ""}
    </nav>
  `;
}

function contentHtml(compendium, block) {
  if (state.active === "Dashboard") return dashboardGridHtml();
  if (state.active === "Mind") return mindHtml(compendium, block);
  return dashboardArtifactHtml(state.active);
}

function dashboardGridHtml() {
  return `
    <div class="dashboard-grid">
      ${dashboardCards.map(([number, label]) => `
        <button class="dashboard-card" data-action="open-dashboard-card" data-section="${label}">
          ${state.flipped === label
            ? `<span class="dashboard-card-title">${number} ${label.toUpperCase()}</span><span class="dashboard-card-hint">press again to open</span>`
            : `<span class="dashboard-card-title">${number} ${label.toUpperCase()}</span>`}
        </button>
      `).join("")}
    </div>
  `;
}

function dashboardArtifactHtml(dashboard) {
  const note = findArtifact(state.artifactStore, state.selectedArtifactId);
  if (state.artifactMode === "editor" && note) return dashboardNoteEditorHtml(note);
  if (state.artifactMode === "viewer" && note) {
    return panelHtml(`
      ${headerHtml(note.title, `${dashboard} note`, `<button class="secondary-button" data-action="edit-artifact-note">Edit</button>`)}
      <div class="reader-panel"><div class="markdown-body">${renderMarkdown(note.body)}</div></div>
    `);
  }

  const notes = rootNotesForDashboard(state.artifactStore, dashboard);
  return panelHtml(`
    ${headerHtml(`${dashboard} Notes`, "Shared artifacts stored in the local browser first, ready for later analysis across the full root database.", `<button class="secondary-button" data-action="new-artifact-note" data-dashboard="${dashboard}">+ New Note</button>`)}
    ${notes.length ? `
      <div class="scroll-area">
        <div class="section-list">
          ${notes.map((noteItem, index) => `
            <button class="section-row" data-action="open-artifact-note" data-id="${noteItem.id}">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(noteItem.title)}</strong>
              <small>${escapeHtml(noteItem.body.replace(/[#>*`-]/g, ""))}</small>
              <em>${escapeHtml(noteItem.dashboard)}</em>
            </button>
          `).join("")}
        </div>
      </div>
    ` : emptyStateHtml("No notes yet.", `Add the first ${dashboard.toLowerCase()} note to create an artifact.`)}
  `);
}

function mindHtml(compendium, block) {
  if (state.mindMode === "compendium-editor" && compendium) return compendiumEditorHtml(compendium);
  if (state.mindMode === "block-editor" && block) return blockEditorHtml(block);
  if (state.mindMode === "block-viewer" && block) {
    return panelHtml(`
      ${headerHtml(block.title, "Viewer", `<button class="secondary-button" data-action="edit-block">Edit</button>`)}
      <div class="reader-panel"><div class="markdown-body">${renderMarkdown(block.body)}</div></div>
    `);
  }
  if (state.mindMode === "reader" && compendium) return compendiumReaderHtml(compendium);
  if (state.mindMode === "manager" && compendium) return compendiumManagerHtml(compendium);
  return mindGridHtml();
}

function mindGridHtml() {
  return panelHtml(`
    ${headerHtml("Mind Compendiums", "Structured containers for notes, chapters, terms, and future book exports.", `<button class="secondary-button" data-action="new-compendium">+ New</button>`)}
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
      <button class="secondary-button" data-action="reader">View</button>
      <button class="secondary-button" data-action="add-block">+ Add</button>
      <button class="secondary-button" data-action="edit-compendium">Edit</button>
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
            <em>Item</em>
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
        <div class="markdown-body">${renderMarkdown(compendium.body)}</div>
      </div>
      <button class="secondary-button" data-action="manager">Back</button>
    </div>
    <section class="reader-book">
      <div class="reader-book-inner">
        ${compendium.blocks.map((section, index) => `
          <article class="reader-article">
            <div class="eyebrow">Section ${index + 1}</div>
            <button data-action="open-block" data-id="${section.id}">${escapeHtml(section.title)}</button>
            <div class="markdown-body">${renderMarkdown(section.body)}</div>
          </article>
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

function editorHtml({ title, subtitle, saveAction, cancelAction, id, valueTitle, valueBody }) {
  return panelHtml(`
    ${headerHtml(title, subtitle, `
      <div class="action-row">
        <button class="secondary-button" data-action="${cancelAction}">Cancel</button>
        <button class="secondary-button" data-action="${saveAction}" data-id="${id}">Save</button>
      </div>
    `)}
    <form class="editor-form">
      <input id="editor-title" value="${escapeHtml(valueTitle)}" aria-label="Title">
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
    element.addEventListener("click", () => handleAction(element));
  });
}

function handleAction(element) {
  const action = element.dataset.action;
  if (action === "home") goHome();
  if (action === "dashboard-root") {
    if (state.active === "Mind") {
      setState({ active: "Mind", mindMode: "grid", selectedCompendiumId: null, selectedBlockId: null });
    } else {
      setState({ artifactMode: "grid", selectedArtifactId: null });
    }
  }
  if (action === "compendium-root") setState({ mindMode: "manager", selectedBlockId: null });
  if (action === "open-dashboard-card") openDashboardCard(element.dataset.section);
  if (action === "open-compendium") openCompendium(element.dataset.id);
  if (action === "open-artifact-note") openArtifactNote(element.dataset.id);
  if (action === "new-compendium") addCompendium();
  if (action === "new-artifact-note") addDashboardNote(element.dataset.dashboard);
  if (action === "reader") setState({ mindMode: "reader" });
  if (action === "manager") setState({ mindMode: "manager" });
  if (action === "edit-compendium") setState({ mindMode: "compendium-editor" });
  if (action === "add-block") addBlock();
  if (action === "open-block") setState({ selectedBlockId: element.dataset.id, mindMode: "block-viewer" });
  if (action === "edit-block") setState({ mindMode: "block-editor" });
  if (action === "block-viewer") setState({ mindMode: "block-viewer" });
  if (action === "edit-artifact-note") setState({ artifactMode: "editor" });
  if (action === "artifact-viewer") setState({ artifactMode: "viewer" });
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

render();
