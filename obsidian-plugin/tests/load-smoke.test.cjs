const assert = require("assert");
const Module = require("module");

const requestCalls = [];
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      Notice: class Notice {
        constructor(message) {
          this.message = message;
        }
      },
      Plugin: class Plugin {
        constructor(app) {
          this.app = app;
        }

        async loadData() {
          return {
            apiBaseUrl: "https://old.example.invalid",
            apiKey: "ost_live_test_secret",
          };
        }

        async saveData() {}
        addCommand() {}
        addSettingTab() {}
        addRibbonIcon() {}
        registerEvent() {}
        registerInterval(intervalId) {
          clearInterval(intervalId);
        }
      },
      PluginSettingTab: class PluginSettingTab {
        constructor(app, plugin) {
          this.app = app;
          this.plugin = plugin;
        }
      },
      Setting: class Setting {},
      async requestUrl(requestOptions) {
        requestCalls.push(requestOptions);
        return { status: 200, json: {}, text: "{}" };
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

const Plugin = require("../main.js");
Module._load = originalLoad;

function createFakeApp() {
  const files = new Map();
  const folders = new Set();
  const adapter = {
    async exists(filePath) {
      return files.has(filePath) || folders.has(filePath);
    },
    async read(filePath) {
      return files.get(filePath);
    },
    async write(filePath, content) {
      files.set(filePath, content);
    },
    async list() {
      return { files: [], folders: [] };
    },
  };
  return {
    files,
    folders,
    vault: {
      adapter,
      on() {
        return {};
      },
      async createFolder(folderPath) {
        folders.add(folderPath);
      },
      async create(filePath, content) {
        files.set(filePath, content);
      },
    },
  };
}

(async () => {
  const app = createFakeApp();
  const plugin = new Plugin(app);
  await plugin.onload();
  assert.strictEqual(plugin.settings.syncEndpoint, "https://api.ourstuff.space");
  assert.strictEqual(plugin.settings.apiBaseUrl, undefined);
  assert.strictEqual(plugin.settings.passiveSyncEnabled, true);
  assert.strictEqual(plugin.settings.passiveSyncIntervalSeconds, 15);
  await plugin.apiFetch("/api/obsidian/compendiums");
  assert.strictEqual(requestCalls[0].url, "https://api.ourstuff.space/api/obsidian/compendiums");
  assert.strictEqual(requestCalls[0].headers.authorization, "Bearer ost_live_test_secret");
  assert.strictEqual(plugin.isTrackedCompendiumPath("Ourstuff/Compendiums/Test [comp]/01 - A [sec].md"), true);
  assert.strictEqual(plugin.isTrackedCompendiumPath("Ourstuff/Compendiums/.ourstuff-sync/manifest.json"), false);
  assert.strictEqual(plugin.isTrackedCompendiumPath("Ourstuff/Compendiums/_Conflicts/conflict.md"), false);
  const log = app.files.get("Ourstuff/Compendiums/.ourstuff-sync/plugin.log");
  assert(log, "plugin load should create a diagnostic log");
  assert(log.includes("plugin_loaded"), "diagnostic log should record plugin_loaded");
  assert(!log.includes("ost_live_"), "diagnostic log should not contain raw API keys");
  console.log("load smoke test passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
