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
const PLUGIN_VERSION = "0.1.2";
const DEFAULT_SYNC_ENDPOINT = "https://api.ourstuff.space";
const DEFAULT_SETTINGS = {
  syncEndpoint: DEFAULT_SYNC_ENDPOINT,
  apiKey: "",
  rootFolder: DEFAULT_ROOT,
  syncOnStartup: false,
};

module.exports = class OurstuffObsidianSyncPlugin extends Plugin {
  async onload() {
    try {
      this.settings = normalizeSettings(await this.loadData());
      await this.saveSettings();
      await this.logEvent("plugin_loaded", {
        version: PLUGIN_VERSION,
        rootFolder: this.settings.rootFolder,
        syncEndpoint: this.settings.syncEndpoint,
        syncOnStartup: Boolean(this.settings.syncOnStartup),
      });
      this.addCommand({
        id: "sync-ourstuff-compendiums",
        name: "Sync compendiums",
        callback: () => this.syncCompendiums(),
      });
      this.addCommand({
        id: "pull-ourstuff-compendiums",
        name: "Pull compendiums from Ourstuff",
        callback: () => this.pullCompendiums(),
      });
      this.addSettingTab(new OurstuffSyncSettingTab(this.app, this));
      this.addRibbonIcon("refresh-cw", "Sync Ourstuff compendiums", () => this.syncCompendiums());
      if (this.settings.syncOnStartup && this.settings.apiKey) {
        setTimeout(() => this.syncCompendiums(), 1500);
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

  async syncCompendiums() {
    try {
      await this.logEvent("sync_started", { mode: "two-way" });
      const remote = await this.apiFetch("/api/obsidian/compendiums");
      const manifest = await this.readManifest();
      const localFiles = await this.readManifestFiles(manifest);
      const { changes } = buildChangesFromVault({
        manifest,
        localFiles,
        remoteSnapshot: remote,
      });
      await this.logEvent("sync_changes_built", {
        compendiums: remote.compendiums?.length || 0,
        localFiles: localFiles.size,
        changes: changes.length,
      });
      if (changes.length) {
        try {
          await this.apiFetch("/api/obsidian/compendiums/sync", {
            method: "POST",
            body: JSON.stringify({ changes, deviceId: "obsidian-plugin" }),
          });
        } catch (error) {
          if (error.status !== 409 || !error.result?.conflicts) throw error;
          await this.writeConflictFiles(error.result.conflicts, changes);
          await this.logEvent("sync_conflicts_written", { conflicts: error.result.conflicts.length });
          new Notice(`Ourstuff sync found ${error.result.conflicts.length} conflict(s).`);
        }
      }
      await this.pullCompendiums({ showNotice: false });
      await this.logEvent("sync_completed", { changes: changes.length });
      new Notice(changes.length ? "Ourstuff compendiums synced." : "Ourstuff compendiums already current.");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "Ourstuff sync failed.");
      await this.logEvent("sync_failed", this.safeError(error)).catch(() => {});
      console.error("ourstuff_obsidian_sync_failed", this.safeError(error));
    }
  }

  async pullCompendiums({ showNotice = true } = {}) {
    try {
      await this.logEvent("pull_started", {});
      const snapshot = await this.apiFetch("/api/obsidian/compendiums");
      const { files } = pathsForSnapshot(snapshot, this.settings.rootFolder || DEFAULT_ROOT);
      for (const [filePath, content] of files.entries()) {
        await this.ensureFolder(filePath.split("/").slice(0, -1).join("/"));
        await this.writeFile(filePath, content);
      }
      await this.logEvent("pull_completed", {
        compendiums: snapshot.compendiums?.length || 0,
        files: files.size,
        revision: snapshot.revision || "",
      });
      if (showNotice) new Notice(`Pulled ${snapshot.compendiums?.length || 0} Ourstuff compendium(s).`);
      return snapshot;
    } catch (error) {
      if (showNotice) new Notice(error instanceof Error ? error.message : "Ourstuff pull failed.");
      await this.logEvent("pull_failed", this.safeError(error)).catch(() => {});
      throw error;
    }
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
  delete settings.apiBaseUrl;
  return settings;
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
