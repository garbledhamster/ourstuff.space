const assert = require("assert");
const {
  buildChangesFromVault,
  parseMarkdownArtifact,
  pathsForSnapshot,
  sanitizePathPart,
} = require("../sync-core.cjs");

assert.strictEqual(sanitizePathPart('CON: bad/name*? '), "CON bad name");
assert.strictEqual(sanitizePathPart("NUL"), "NUL item");
assert.strictEqual(sanitizePathPart("ends."), "ends");

const snapshot = {
  revision: "rev1",
  compendiums: [
    {
      id: "comp-1",
      type: "compendium",
      title: "Birds: Windows / Safe?",
      body: "Cover body",
      created: "2026-01-01T00:00:00.000Z",
      edited: "2026-01-01T00:00:00.000Z",
      childIds: ["sec-1"],
      hash: "a".repeat(64),
      sections: [
        {
          id: "sec-1",
          type: "note",
          parentId: "comp-1",
          title: "CON",
          body: "Section body",
          created: "2026-01-01T00:00:00.000Z",
          edited: "2026-01-01T00:00:00.000Z",
          childIds: [],
          hash: "b".repeat(64),
        },
      ],
    },
  ],
};

const { files, manifest } = pathsForSnapshot(snapshot);
const paths = Array.from(files.keys());
assert(paths.some((item) => item.includes("Birds Windows Safe [comp-1]/_index.md")));
assert(paths.some((item) => item.includes("01 - CON item [sec-1].md")));

const sectionPath = manifest.artifacts["sec-1"].path;
const parsed = parseMarkdownArtifact(files.get(sectionPath), manifest.artifacts["sec-1"]);
assert.strictEqual(parsed.id, "sec-1");
assert.strictEqual(parsed.title, "CON");
assert.strictEqual(parsed.body, "Section body");

const localFiles = new Map(files);
localFiles.set(sectionPath, files.get(sectionPath).replace("Section body", "Changed body"));
const { changes } = buildChangesFromVault({ manifest, localFiles, remoteSnapshot: snapshot });
assert.strictEqual(changes.length, 1);
assert.strictEqual(changes[0].artifact.body, "Changed body");

console.log("sync-core tests passed");
