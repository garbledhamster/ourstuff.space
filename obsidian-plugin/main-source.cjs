const { Notice, Plugin, PluginSettingTab, Setting, requestUrl } = require("obsidian");
const {
  DEFAULT_ROOT,
  CONFLICT_DIR,
  MANIFEST_FILE,
  buildChangesFromVault,
  conflictPathFor,
  markdownForArtifact,
  normalizeVaultPath,
  parseMarkdownArtifact,
  pathsForSnapshot,
} = require("./sync-core.cjs");

const DIAGNOSTIC_LOG_FILE = ".ourstuff-sync/plugin.log";
const PLUGIN_VERSION = "0.1.4";
const DEFAULT_SYNC_ENDPOINT = "https://api.ourstuff.space";
const DEFAULT_PASSIVE_SYNC_INTERVAL_SECONDS = 15;
const MIN_PASSIVE_SYNC_INTERVAL_SECONDS = 5;
const MAX_PASSIVE_SYNC_INTERVAL_SECONDS = 300;
const LOCAL_CHANGE_DEBOUNCE_MS = 3000;
const ACTIVE_EDIT_PROTECTION_MS = 45000;
const DEFAULT_SETTINGS = {
  syncEndpoint: DEFAULT_SYNC_ENDPOINT,
  apiKey: "",
  rootFolder: DEFAULT_ROOT,
  syncOnStartup: false,
  showSyncNotices: false,
  passiveSyncEnabled: true,
  passiveSyncIntervalSeconds: DEFAULT_PASSIVE_SYNC_INTERVAL_SECONDS,
};

module.exports = class OurstuffObsidianSyncPlugin extends Plugin {
  async onload() {
    try {
      this.settings = normalizeSettings(await this.loadData());
      this.syncInProgress = false;
      this.suppressVaultEvents = 0;
      this.localChangePending = false;
      this.localChangeTimer = null;
      this.passiveSyncTimer = null;
      this.lastKnownRevision = "";
      this.lastLocalChangeAtByPath = new Map();
      this.pendingLocalPaths = new Set();
      this.deferredRemoteRevision = "";
      await this.saveSettings();
      await this.loadLastKnownRevision();
      await this.logEvent("plugin_loaded", {
        version: PLUGIN_VERSION,
        rootFolder: this.settings.rootFolder,
        syncEndpoint: this.settings.syncEndpoint,
        syncOnStartup: Boolean(this.settings.syncOnStartup),
        showSyncNotices: Boolean(this.settings.showSyncNotices),
        passiveSyncEnabled: Boolean(this.settings.passiveSyncEnabled),
        passiveSyncIntervalSeconds: this.settings.passiveSyncIntervalSeconds,
      });
      this.addCommand({
        id: "sync-ourstuff-compendiums",
        name: "Sync compendiums",
        callback: () => this.syncCompendiums({ source: "command" }),
      });
      this.addCommand({
        id: "pull-ourstuff-compendiums",
        name: "Pull compendiums from Ourstuff",
        callback: () => this.pullCompendiums({ source: "command_pull" }),
      });
      this.addSettingTab(new OurstuffSyncSettingTab(this.app, this));
      this.addRibbonIcon("refresh-cw", "Sync Ourstuff compendiums", () => this.syncCompendiums());
      this.registerVaultChangeWatchers();
      this.restartPassiveSyncTimer();
      if (this.settings.syncOnStartup && this.settings.apiKey) {
        setTimeout(() => this.syncCompendiums({ showNotice: false, source: "startup" }), 1500);
      }
    } catch (error) {
      await this.logEvent("plugin_load_failed", this.safeError(error)).catch(() => {});
      console.error("ourstuff_obsidian_plugin_load_failed", this.safeError(error));
      new Notice(error instanceof Error ? error.message : "Ourstuff plugin failed to load.");
      throw error;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async apiFetch(path, options = {}) {
    if (!this.settings.apiKey) {
      throw new Error("Add your Ourstuff Obsidian API key in plugin settings.");
    }
    const method = options.method || "GET";
    const url = `${this.settings.syncEndpoint.replace(/\/+$/, "")}${path}`;
    let response;
    try {
      response = await requestUrl({
        url,
        method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.settings.apiKey}`,
          ...(options.headers || {}),
        },
        body: options.body,
      });
    } catch (error) {
      const wrapped = new Error(`Ourstuff sync endpoint could not be reached: ${networkErrorMessage(error)}`);
      wrapped.cause = error;
      await this.logEvent("api_request_network_failed", {
        path,
        method,
        endpoint: this.settings.syncEndpoint,
        message: wrapped.message,
      });
      throw wrapped;
    }
    const result = response.json || parseJsonMaybe(response.text);
    if (response.status < 200 || response.status >= 300) {
      const error = new Error(result?.error?.message || `Ourstuff sync endpoint failed (${response.status})`);
      error.result = result;
      error.status = response.status;
      await this.logEvent("api_request_failed", {
        path,
        method,
        endpoint: this.settings.syncEndpoint,
        status: response.status,
        message: error.message,
      });
      throw error;
    }
    return result;
  }

  async syncCompendiums({ showNotice = true, source = "manual" } = {}) {
    if (this.syncInProgress) {
      await this.logEvent("sync_skipped_busy", { source }).catch(() => {});
      return null;
    }
    this.syncInProgress = true;
    try {
      await this.logEvent("sync_started", { mode: "two-way", source });
      const remote = await this.apiFetch("/api/obsidian/compendiums");
      const manifest = await this.readManifest();
      const localFiles = await this.readManifestFiles(manifest);
      const { changes, newFiles } = buildChangesFromVault({
        manifest,
        localFiles,
        remoteSnapshot: remote,
      });
      await this.logEvent("sync_changes_built", {
        compendiums: remote.compendiums?.length || 0,
        localFiles: localFiles.size,
        changes: changes.length,
        newFiles: newFiles?.length || 0,
      });
      let cleanupSyncedNewFiles = false;
      if (changes.length) {
        try {
          const syncResult = await this.apiFetch("/api/obsidian/compendiums/sync", {
            method: "POST",
            body: JSON.stringify({ changes, deviceId: "obsidian-plugin" }),
          });
          cleanupSyncedNewFiles = true;
          const resolvedCount = syncResult?.resolvedConflicts?.length || 0;
          if (resolvedCount) {
            await this.logEvent("sync_conflicts_resolved_by_server", {
              conflicts: resolvedCount,
              bulkConflictStopped: Boolean(syncResult?.bulkConflictStopped),
            });
            if (this.shouldShowSyncNotice(showNotice)) {
              new Notice(syncResult?.bulkConflictStopped
                ? "Ourstuff sync created a conflict review page."
                : `Ourstuff sync created ${resolvedCount} conflict page(s).`);
            }
          }
        } catch (error) {
          if (error.status !== 409 || !error.result?.conflicts) throw error;
          await this.writeConflictFiles(error.result.conflicts, changes);
          await this.logEvent("sync_legacy_conflicts_written", { conflicts: error.result.conflicts.length });
          if (this.shouldShowSyncNotice(showNotice)) new Notice(`Ourstuff sync wrote ${error.result.conflicts.length} legacy conflict file(s).`);
        }
      }
      await this.pullCompendiums({
        showNotice: false,
        cleanupPaths: cleanupSyncedNewFiles ? (newFiles || []).map((file) => file.path) : [],
        source,
      });
      this.localChangePending = false;
      this.pendingLocalReasons = new Set();
      this.pendingLocalPaths = new Set();
      await this.logEvent("sync_completed", { changes: changes.length, source, revision: this.lastKnownRevision });
      if (this.shouldShowSyncNotice(showNotice)) new Notice(changes.length ? "Ourstuff compendiums synced." : "Ourstuff compendiums already current.");
      return { changes: changes.length, revision: this.lastKnownRevision };
    } catch (error) {
      if (this.shouldShowSyncNotice(showNotice)) new Notice(error instanceof Error ? error.message : "Ourstuff sync failed.");
      await this.logEvent("sync_failed", this.safeError(error)).catch(() => {});
      console.error("ourstuff_obsidian_sync_failed", this.safeError(error));
      return null;
    } finally {
      this.syncInProgress = false;
    }
  }

  async pullCompendiums({ showNotice = true, cleanupPaths = [], source = "manual_pull", protectActiveFile = true } = {}) {
    try {
      const protectedPath = protectActiveFile ? this.protectedActiveFilePath() : "";
      await this.logEvent("pull_started", { source, protectedActiveFile: Boolean(protectedPath) });
      const snapshot = await this.apiFetch("/api/obsidian/compendiums");
      const { files } = pathsForSnapshot(snapshot, this.settings.rootFolder || DEFAULT_ROOT);
      const skippedProtectedFiles = [];
      this.suppressVaultEvents += 1;
      try {
        for (const [filePath, content] of files.entries()) {
          const normalizedPath = normalizeVaultPath(filePath);
          if (protectedPath && normalizedPath === protectedPath) {
            skippedProtectedFiles.push(normalizedPath);
            continue;
          }
          await this.ensureFolder(filePath.split("/").slice(0, -1).join("/"));
          await this.writeFile(filePath, content);
        }
        for (const cleanupPath of cleanupPaths) {
          const normalized = normalizeVaultPath(cleanupPath);
          if (!normalized || files.has(normalized) || normalized.includes(`/${CONFLICT_DIR}/`) || normalized.includes(`/${MANIFEST_FILE}`)) continue;
          if (protectedPath && normalized === protectedPath) {
            skippedProtectedFiles.push(normalized);
            continue;
          }
          if (await this.app.vault.adapter.exists(normalized)) {
            await this.app.vault.adapter.remove(normalized);
          }
        }
      } finally {
        this.suppressVaultEvents = Math.max(0, this.suppressVaultEvents - 1);
      }
      if (skippedProtectedFiles.length) {
        this.deferredRemoteRevision = snapshot.revision || "";
      } else {
        this.lastKnownRevision = snapshot.revision || this.lastKnownRevision || "";
        this.deferredRemoteRevision = "";
      }
      await this.logEvent("pull_completed", {
        compendiums: snapshot.compendiums?.length || 0,
        files: files.size,
        skippedProtectedFiles,
        revision: snapshot.revision || "",
      });
      if (this.shouldShowSyncNotice(showNotice)) new Notice(`Pulled ${snapshot.compendiums?.length || 0} Ourstuff compendium(s).`);
      return { ...snapshot, skippedProtectedFiles };
    } catch (error) {
      if (this.shouldShowSyncNotice(showNotice)) new Notice(error instanceof Error ? error.message : "Ourstuff pull failed.");
      await this.logEvent("pull_failed", this.safeError(error)).catch(() => {});
      throw error;
    }
  }

  async checkRemoteStatus() {
    const status = await this.apiFetch("/api/obsidian/compendiums/status");
    const nextRevision = String(status.revision || "");
    if (!nextRevision) return { changed: false, revision: "" };
    if (!this.lastKnownRevision) {
      await this.logEvent("passive_initial_revision_found", {
        revision: nextRevision,
        compendiums: status.compendiumCount || 0,
        sections: status.sectionCount || 0,
      });
      return { changed: true, revision: nextRevision, status, initial: true };
    }
    return { changed: nextRevision !== this.lastKnownRevision, revision: nextRevision, status };
  }

  async passiveSyncTick(reason = "timer") {
    if (!this.settings.passiveSyncEnabled || !this.settings.apiKey || this.syncInProgress) return;
    try {
      if (reason === "local_change" && this.localChangePending) {
        await this.logEvent("passive_sync_triggered", {
          reason,
          localReasons: Array.from(this.pendingLocalReasons || []),
        });
        await this.syncCompendiums({ showNotice: false, source: "passive_local" });
        return;
      }

      const remote = await this.checkRemoteStatus();
      if (remote.changed) {
        const protectedPath = this.protectedActiveFilePath();
        if (protectedPath) {
          this.deferredRemoteRevision = remote.revision;
          await this.logEvent("passive_sync_deferred_active_file", {
            reason,
            activeFile: protectedPath,
            previousRevision: this.lastKnownRevision,
            nextRevision: remote.revision,
          });
          return;
        }
        await this.logEvent("passive_sync_triggered", {
          reason: "remote_revision",
          previousRevision: this.lastKnownRevision,
          nextRevision: remote.revision,
          compendiums: remote.status?.compendiumCount || 0,
          sections: remote.status?.sectionCount || 0,
        });
        await this.syncCompendiums({ showNotice: false, source: "passive_remote" });
      }
    } catch (error) {
      await this.logEvent("passive_sync_failed", this.safeError(error)).catch(() => {});
    }
  }

  registerVaultChangeWatchers() {
    if (!this.app?.vault?.on) return;
    const watch = (eventName, callback) => {
      const eventRef = this.app.vault.on(eventName, callback);
      if (this.registerEvent && eventRef) this.registerEvent(eventRef);
    };
    watch("create", (file) => this.noteLocalChange(file?.path, "create"));
    watch("modify", (file) => this.noteLocalChange(file?.path, "modify"));
    watch("delete", (file) => this.noteLocalChange(file?.path, "delete"));
    watch("rename", (file, oldPath) => {
      this.noteLocalChange(oldPath, "rename_old");
      this.noteLocalChange(file?.path, "rename_new");
    });
  }

  noteLocalChange(filePath, reason) {
    const normalizedPath = normalizeVaultPath(filePath || "");
    if (this.suppressVaultEvents > 0 || !this.isTrackedCompendiumPath(normalizedPath)) return;
    this.localChangePending = true;
    if (!this.lastLocalChangeAtByPath) this.lastLocalChangeAtByPath = new Map();
    if (!this.pendingLocalPaths) this.pendingLocalPaths = new Set();
    this.lastLocalChangeAtByPath.set(normalizedPath, Date.now());
    this.pendingLocalPaths.add(normalizedPath);
    if (!this.pendingLocalReasons) this.pendingLocalReasons = new Set();
    this.pendingLocalReasons.add(reason);
    if (this.localChangeTimer) clearTimeout(this.localChangeTimer);
    this.localChangeTimer = setTimeout(() => {
      this.localChangeTimer = null;
      this.passiveSyncTick("local_change");
    }, LOCAL_CHANGE_DEBOUNCE_MS);
  }

  isTrackedCompendiumPath(filePath) {
    const path = normalizeVaultPath(filePath || "");
    const root = normalizeVaultPath(this.settings.rootFolder || DEFAULT_ROOT);
    if (!path || !path.startsWith(`${root}/`) || !path.toLowerCase().endsWith(".md")) return false;
    if (path.includes(`/${CONFLICT_DIR}/`)) return false;
    if (path.includes(`/${MANIFEST_FILE}`)) return false;
    if (path === this.diagnosticLogPath()) return false;
    if (path.includes("/.ourstuff-sync/")) return false;
    return true;
  }

  activeTrackedFilePath() {
    const file = this.app?.workspace?.getActiveFile?.();
    const path = normalizeVaultPath(file?.path || "");
    return this.isTrackedCompendiumPath(path) ? path : "";
  }

  protectedActiveFilePath() {
    const path = this.activeTrackedFilePath();
    if (!path) return "";
    const lastChangedAt = this.lastLocalChangeAtByPath?.get(path) || 0;
    const hasPendingChange = Boolean(this.localChangePending && this.pendingLocalPaths?.has(path));
    if (hasPendingChange || (lastChangedAt && Date.now() - lastChangedAt < ACTIVE_EDIT_PROTECTION_MS)) {
      return path;
    }
    return "";
  }

  shouldShowSyncNotice(showNotice) {
    return showNotice === true && this.settings.showSyncNotices === true;
  }

  restartPassiveSyncTimer() {
    this.stopPassiveSyncTimer();
    if (!this.settings.passiveSyncEnabled) return;
    const intervalMs = clampPassiveSyncInterval(this.settings.passiveSyncIntervalSeconds) * 1000;
    this.passiveSyncTimer = setInterval(() => this.passiveSyncTick("timer"), intervalMs);
    if (this.registerInterval) this.registerInterval(this.passiveSyncTimer);
  }

  stopPassiveSyncTimer() {
    if (this.passiveSyncTimer) {
      clearInterval(this.passiveSyncTimer);
      this.passiveSyncTimer = null;
    }
    if (this.localChangeTimer) {
      clearTimeout(this.localChangeTimer);
      this.localChangeTimer = null;
    }
  }

  onunload() {
    this.stopPassiveSyncTimer();
  }

  async loadLastKnownRevision() {
    const manifest = await this.readManifest().catch(() => null);
    this.lastKnownRevision = String(manifest?.revision || "");
  }

  async writeConflictFiles(conflicts, localChanges = []) {
    for (const conflict of conflicts) {
      const filePath = conflictPathFor(conflict, this.settings.rootFolder || DEFAULT_ROOT);
      await this.ensureFolder(filePath.split("/").slice(0, -1).join("/"));
      const local = localChanges.find((change) => change.artifact?.id === conflict.id)?.artifact;
      const remote = conflict.remote || {
        id: conflict.id,
        type: "note",
        title: "Conflict",
        body: JSON.stringify(conflict, null, 2),
      };
      const conflictArtifact = local || remote;
      await this.writeFile(filePath, markdownForArtifact(conflictArtifact, {
        ourstuff_conflict_reason: conflict.reason || "remote_changed",
        ourstuff_remote_hash: conflict.remoteHash || "",
      }));
    }
  }

  async readManifest() {
    const path = normalizeVaultPath(this.settings.rootFolder || DEFAULT_ROOT, MANIFEST_FILE);
    if (!(await this.app.vault.adapter.exists(path))) {
      return { version: 1, root: this.settings.rootFolder || DEFAULT_ROOT, artifacts: {} };
    }
    try {
      return JSON.parse(await this.app.vault.adapter.read(path));
    } catch {
      return { version: 1, root: this.settings.rootFolder || DEFAULT_ROOT, artifacts: {} };
    }
  }

  async readManifestFiles(manifest) {
    const files = new Map();
    const scanned = await this.scanMarkdownFiles(this.settings.rootFolder || DEFAULT_ROOT);
    for (const entry of Object.values(manifest.artifacts || {})) {
      if (entry.path && await this.app.vault.adapter.exists(entry.path)) {
        files.set(entry.path, { path: entry.path, content: await this.app.vault.adapter.read(entry.path) });
        continue;
      }
      const current = scanned.get(entry.id);
      if (current) {
        files.set(entry.path, current);
      }
    }
    for (const [key, current] of scanned.entries()) {
      if (current?.path && key === current.path && !files.has(current.path)) {
        files.set(current.path, current);
      }
    }
    return files;
  }

  async scanMarkdownFiles(root) {
    const found = new Map();
    const visit = async (folder) => {
      if (!(await this.app.vault.adapter.exists(folder))) return;
      const listed = await this.app.vault.adapter.list(folder);
      for (const filePath of listed.files || []) {
        if (!filePath.toLowerCase().endsWith(".md")) continue;
        if (filePath.includes(`/${CONFLICT_DIR}/`) || filePath.includes(`/${MANIFEST_FILE}`)) continue;
        const content = await this.app.vault.adapter.read(filePath);
        const parsed = parseMarkdownArtifact(content, {});
        found.set(filePath, { path: filePath, content });
        if (parsed.id) found.set(parsed.id, { path: filePath, content });
      }
      for (const child of listed.folders || []) {
        await visit(child);
      }
    };
    await visit(normalizeVaultPath(root));
    return found;
  }

  async ensureFolder(folderPath) {
    const parts = normalizeVaultPath(folderPath).split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  async writeFile(filePath, content) {
    if (await this.app.vault.adapter.exists(filePath)) {
      await this.app.vault.adapter.write(filePath, content);
    } else {
      await this.app.vault.create(filePath, content);
    }
  }

  diagnosticLogPath() {
    return normalizeVaultPath(this.settings?.rootFolder || DEFAULT_ROOT, DIAGNOSTIC_LOG_FILE);
  }

  async logEvent(event, data = {}) {
    const line = `${JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      data: redactDiagnostic(data),
    })}\n`;
    const logPath = this.diagnosticLogPath();
    await this.ensureFolder(logPath.split("/").slice(0, -1).join("/"));
    const exists = await this.app.vault.adapter.exists(logPath);
    const previous = exists ? await this.app.vault.adapter.read(logPath).catch(() => "") : "";
    const retained = previous.length > 128000 ? previous.slice(-96000) : previous;
    if (exists) {
      await this.app.vault.adapter.write(logPath, retained + line);
    } else {
      await this.app.vault.create(logPath, line);
    }
  }

  safeError(error) {
    return {
      message: error instanceof Error ? error.message : "Unknown error",
      status: error?.status || "",
      stack: error instanceof Error ? String(error.stack || "").split("\n").slice(0, 5).join("\n") : "",
    };
  }
};

function redactDiagnostic(value, depth = 0) {
  if (depth > 4) return "[depth-limit]";
  if (value == null) return value;
  if (typeof value === "string") {
    return value
      .replace(/ost_(?:live|test)_[A-Za-z0-9._-]+/g, "ost_***")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
      .slice(0, 2000);
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => redactDiagnostic(entry, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (/key|token|authorization|body|content/i.test(key)) return [key, "[redacted]"];
    return [key, redactDiagnostic(entry, depth + 1)];
  }));
}

function normalizeSettings(saved = {}) {
  const settings = Object.assign({}, DEFAULT_SETTINGS, saved || {});
  const savedEndpoint = String(saved?.syncEndpoint || "").trim();
  settings.syncEndpoint = savedEndpoint || DEFAULT_SYNC_ENDPOINT;
  settings.showSyncNotices = saved?.showSyncNotices === true;
  settings.passiveSyncEnabled = saved?.passiveSyncEnabled !== false;
  settings.passiveSyncIntervalSeconds = clampPassiveSyncInterval(saved?.passiveSyncIntervalSeconds);
  delete settings.apiBaseUrl;
  return settings;
}

function clampPassiveSyncInterval(value) {
  const number = Number(value || DEFAULT_PASSIVE_SYNC_INTERVAL_SECONDS);
  if (!Number.isFinite(number)) return DEFAULT_PASSIVE_SYNC_INTERVAL_SECONDS;
  return Math.max(MIN_PASSIVE_SYNC_INTERVAL_SECONDS, Math.min(MAX_PASSIVE_SYNC_INTERVAL_SECONDS, Math.round(number)));
}

function parseJsonMaybe(value) {
  try {
    return JSON.parse(String(value || "{}"));
  } catch {
    return {};
  }
}

function networkErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message || message === "Failed to fetch") {
    return "network request failed before the backend returned a response";
  }
  return message;
}

class OurstuffSyncSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Ourstuff Sync" });
    new Setting(containerEl)
      .setName("API key")
      .setDesc("Used only to call the Ourstuff sync backend. Billing and subscription checks stay server-side.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("ost_live_...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });
    new Setting(containerEl)
      .setName("Root folder")
      .addText((text) => text
        .setValue(this.plugin.settings.rootFolder)
        .onChange(async (value) => {
          this.plugin.settings.rootFolder = value.trim() || DEFAULT_ROOT;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName("Sync on startup")
      .addToggle((toggle) => toggle
        .setValue(Boolean(this.plugin.settings.syncOnStartup))
        .onChange(async (value) => {
          this.plugin.settings.syncOnStartup = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName("Sync notices")
      .setDesc("Show Obsidian popups after sync or pull actions. Background sync stays quiet.")
      .addToggle((toggle) => toggle
        .setValue(Boolean(this.plugin.settings.showSyncNotices))
        .onChange(async (value) => {
          this.plugin.settings.showSyncNotices = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName("Passive sync")
      .setDesc("Quietly watches local compendium files and checks the remote revision on an interval.")
      .addToggle((toggle) => toggle
        .setValue(Boolean(this.plugin.settings.passiveSyncEnabled))
        .onChange(async (value) => {
          this.plugin.settings.passiveSyncEnabled = value;
          await this.plugin.saveSettings();
          this.plugin.restartPassiveSyncTimer();
        }));
    new Setting(containerEl)
      .setName("Passive check interval")
      .setDesc("Seconds between lightweight remote revision checks. Local edits are debounced separately.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = String(MIN_PASSIVE_SYNC_INTERVAL_SECONDS);
        text.inputEl.max = String(MAX_PASSIVE_SYNC_INTERVAL_SECONDS);
        text
          .setValue(String(this.plugin.settings.passiveSyncIntervalSeconds))
          .onChange(async (value) => {
            this.plugin.settings.passiveSyncIntervalSeconds = clampPassiveSyncInterval(value);
            await this.plugin.saveSettings();
            this.plugin.restartPassiveSyncTimer();
          });
      });
    new Setting(containerEl)
      .setName("Diagnostic log")
      .setDesc(this.plugin.diagnosticLogPath())
      .addButton((button) => button
        .setButtonText("Copy path")
        .onClick(async () => {
          await navigator.clipboard.writeText(this.plugin.diagnosticLogPath());
          new Notice("Ourstuff diagnostic log path copied.");
        }));
    new Setting(containerEl)
      .setName("Sync now")
      .addButton((button) => button
        .setButtonText("Sync")
        .setCta()
        .onClick(() => this.plugin.syncCompendiums()));
  }
}
