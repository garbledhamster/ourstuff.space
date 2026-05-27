const assert = require("assert");
const Module = require("module");

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
          return {};
        }

        async saveData() {}
        addCommand() {}
        addSettingTab() {}
        addRibbonIcon() {}
      },
      PluginSettingTab: class PluginSettingTab {
        constructor(app, plugin) {
          this.app = app;
          this.plugin = plugin;
        }
      },
      Setting: class Setting {},
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
  const log = app.files.get("Ourstuff/Compendiums/.ourstuff-sync/plugin.log");
  assert(log, "plugin load should create a diagnostic log");
  assert(log.includes("plugin_loaded"), "diagnostic log should record plugin_loaded");
  assert(!log.includes("ost_live_"), "diagnostic log should not contain raw API keys");
  console.log("load smoke test passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
