const { Notice, Plugin, PluginSettingTab, Setting } = require("obsidian");
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

const DEFAULT_SETTINGS = {
  apiBaseUrl: "https://stripe-worker-api.jrice.workers.dev",
  apiKey: "",
  rootFolder: DEFAULT_ROOT,
  syncOnStartup: false,
};

module.exports = class OurstuffObsidianSyncPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async apiFetch(path, options = {}) {
    if (!this.settings.apiKey) {
      throw new Error("Add your Ourstuff Obsidian API key in plugin settings.");
    }
    const response = await fetch(`${this.settings.apiBaseUrl.replace(/\/+$/, "")}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.settings.apiKey}`,
        ...(options.headers || {}),
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result?.error?.message || `Ourstuff API failed (${response.status})`);
      error.result = result;
      error.status = response.status;
      throw error;
    }
    return result;
  }

  async syncCompendiums() {
    try {
      const remote = await this.apiFetch("/api/obsidian/compendiums");
      const manifest = await this.readManifest();
      const localFiles = await this.readManifestFiles(manifest);
      const { changes } = buildChangesFromVault({
        manifest,
        localFiles,
        remoteSnapshot: remote,
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
          new Notice(`Ourstuff sync found ${error.result.conflicts.length} conflict(s).`);
        }
      }
      await this.pullCompendiums();
      new Notice(changes.length ? "Ourstuff compendiums synced." : "Ourstuff compendiums already current.");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "Ourstuff sync failed.");
      console.error("ourstuff_obsidian_sync_failed", {
        message: error instanceof Error ? error.message : "Unknown error",
        status: error?.status || "",
      });
    }
  }

  async pullCompendiums() {
    const snapshot = await this.apiFetch("/api/obsidian/compendiums");
    const { files } = pathsForSnapshot(snapshot, this.settings.rootFolder || DEFAULT_ROOT);
    for (const [filePath, content] of files.entries()) {
      await this.ensureFolder(filePath.split("/").slice(0, -1).join("/"));
      await this.writeFile(filePath, content);
    }
    new Notice(`Pulled ${snapshot.compendiums?.length || 0} Ourstuff compendium(s).`);
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
};

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
      .setName("API base URL")
      .addText((text) => text
        .setValue(this.plugin.settings.apiBaseUrl)
        .onChange(async (value) => {
          this.plugin.settings.apiBaseUrl = value.trim() || DEFAULT_SETTINGS.apiBaseUrl;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName("API key")
      .setDesc("Stored only in this vault's plugin settings.")
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
      .setName("Sync now")
      .addButton((button) => button
        .setButtonText("Sync")
        .setCta()
        .onClick(() => this.plugin.syncCompendiums()));
  }
}
