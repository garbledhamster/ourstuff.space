const assert = require("assert");
const fs = require("fs");
const path = require("path");

const main = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");

assert(!main.includes('require("./sync-core.cjs")'), "main.js must be self-contained for Obsidian runtime loading");
assert(main.includes("plugin_loaded"), "main.js should include diagnostic load logging");
assert(main.includes("plugin.log"), "main.js should include the vault-local diagnostic log path");

console.log("bundle tests passed");
