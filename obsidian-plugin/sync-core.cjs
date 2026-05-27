const path = require("path");

const DEFAULT_ROOT = "Ourstuff/Compendiums";
const MANIFEST_DIR = ".ourstuff-sync";
const MANIFEST_FILE = `${MANIFEST_DIR}/manifest.json`;
const CONFLICT_DIR = "_Conflicts";
const RESERVED_NAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

function sanitizePathPart(value, fallback = "Untitled", maxLength = 90) {
  let text = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  if (!text) text = fallback;
  if (RESERVED_NAMES.has(text.toUpperCase())) text = `${text} item`;
  if (text.length > maxLength) text = text.slice(0, maxLength).trim().replace(/[. ]+$/g, "");
  return text || fallback;
}

function slugWithId(title, id, fallback, maxTitleLength = 72) {
  return `${sanitizePathPart(title, fallback, maxTitleLength)} [${sanitizePathPart(id, "id", 64)}]`;
}

function normalizeVaultPath(...parts) {
  return parts
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function frontmatterValue(value) {
  const text = String(value ?? "");
  return JSON.stringify(text);
}

function markdownForArtifact(artifact, extra = {}) {
  const lines = [
    "---",
    `ourstuff_id: ${frontmatterValue(artifact.id)}`,
    `ourstuff_type: ${frontmatterValue(artifact.type)}`,
    `ourstuff_parent_id: ${frontmatterValue(artifact.parentId || "")}`,
    `title: ${frontmatterValue(artifact.title || "Untitled")}`,
    `created: ${frontmatterValue(artifact.created || "")}`,
    `edited: ${frontmatterValue(artifact.edited || "")}`,
  ];
  Object.entries(extra).forEach(([key, value]) => {
    lines.push(`${key}: ${frontmatterValue(value)}`);
  });
  lines.push("---", "", `# ${artifact.title || "Untitled"}`, "", String(artifact.body || "").trim(), "");
  return lines.join("\n");
}

function parseMarkdownArtifact(text, fallback = {}) {
  const source = String(text || "");
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(source);
  const data = {};
  let body = source;
  if (match) {
    body = match[2] || "";
    match[1].split(/\r?\n/).forEach((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return;
      const key = line.slice(0, colon).trim();
      const raw = line.slice(colon + 1).trim();
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw.replace(/^["']|["']$/g, "");
      }
    });
  }
  const title = String(data.title || fallback.title || titleFromBody(body) || "Untitled").trim();
  const withoutHeading = body
    .replace(new RegExp(`^(?:[ \\t]*\\r?\\n)*#\\s+${escapeRegExp(title)}\\s*\\r?\\n+`), "")
    .trim();
  return {
    id: String(data.ourstuff_id || fallback.id || ""),
    type: data.ourstuff_type === "compendium" ? "compendium" : "note",
    parentId: String(data.ourstuff_parent_id || fallback.parentId || "") || null,
    title,
    body: withoutHeading,
    created: String(data.created || fallback.created || new Date().toISOString()),
    edited: new Date().toISOString(),
  };
}

function titleFromBody(body) {
  const line = String(body || "").split(/\r?\n/).find((entry) => entry.trim());
  return line ? line.replace(/^#+\s*/, "").trim() : "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function indexRemoteArtifacts(snapshot) {
  const artifacts = new Map();
  const compendiums = Array.isArray(snapshot?.compendiums) ? snapshot.compendiums : [];
  compendiums.forEach((compendium) => {
    artifacts.set(compendium.id, { ...compendium, type: "compendium", parentId: null });
    (compendium.sections || []).forEach((section) => {
      artifacts.set(section.id, { ...section, type: "note", parentId: compendium.id });
    });
  });
  return artifacts;
}

function pathsForSnapshot(snapshot, root = DEFAULT_ROOT) {
  const files = new Map();
  const manifest = {
    version: 1,
    syncedAt: new Date().toISOString(),
    revision: snapshot.revision || "",
    root,
    artifacts: {},
  };
  const usedPaths = new Set();
  const compendiums = Array.isArray(snapshot?.compendiums) ? snapshot.compendiums : [];
  compendiums.forEach((compendium) => {
    const folder = uniquePathPart(slugWithId(compendium.title, compendium.id, "Compendium"), usedPaths);
    const folderPath = normalizeVaultPath(root, folder);
    const indexPath = normalizeVaultPath(folderPath, "_index.md");
    files.set(indexPath, markdownForArtifact({ ...compendium, type: "compendium", parentId: null }, { ourstuff_folder: folder }));
    manifest.artifacts[compendium.id] = {
      id: compendium.id,
      type: "compendium",
      path: indexPath,
      folderPath,
      title: compendium.title,
      hash: compendium.hash || "",
      childIds: Array.isArray(compendium.childIds) ? compendium.childIds : [],
    };
    const childUsed = new Set(["_index.md"]);
    (compendium.sections || []).forEach((section, index) => {
      const prefix = String(index + 1).padStart(2, "0");
      const fileName = uniquePathPart(`${prefix} - ${slugWithId(section.title, section.id, "Section", 64)}.md`, childUsed);
      const filePath = normalizeVaultPath(folderPath, fileName);
      files.set(filePath, markdownForArtifact({ ...section, type: "note", parentId: compendium.id }, { ourstuff_order: String(index + 1) }));
      manifest.artifacts[section.id] = {
        id: section.id,
        type: "note",
        parentId: compendium.id,
        path: filePath,
        title: section.title,
        hash: section.hash || "",
        order: index,
      };
    });
  });
  files.set(normalizeVaultPath(root, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  return { files, manifest };
}

function uniquePathPart(part, used) {
  let candidate = part;
  const ext = path.posix.extname(part);
  const base = ext ? part.slice(0, -ext.length) : part;
  let index = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base} ${index}${ext}`;
    index += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function buildChangesFromVault({ manifest, localFiles, remoteSnapshot }) {
  const remote = indexRemoteArtifacts(remoteSnapshot);
  const changes = [];
  const conflicts = [];
  const seen = new Set();
  const newFiles = [];
  const sectionEntriesByParent = new Map();
  const manifestEntries = Object.values(manifest.artifacts || {});
  const manifestPaths = new Set(manifestEntries.map((entry) => normalizeVaultPath(entry.path || "").toLowerCase()).filter(Boolean));
  const usedIds = new Set([...manifestEntries.map((entry) => entry.id).filter(Boolean), ...remote.keys()]);
  Object.values(manifest.artifacts || {}).forEach((entry) => {
    const localItem = localFiles.get(entry.path);
    const localText = typeof localItem === "string" ? localItem : localItem?.content;
    const currentPath = typeof localItem === "string" ? entry.path : localItem?.path || entry.path;
    const remoteArtifact = remote.get(entry.id);
    const baseHash = entry.hash || "";
    if (localText == null) {
      if (remoteArtifact && (remoteArtifact.hash || "") === baseHash) {
        changes.push({ action: "delete", id: entry.id, baseHash });
      } else if (remoteArtifact) {
        conflicts.push({ id: entry.id, reason: "missing_local_remote_changed", remote: remoteArtifact });
      }
      return;
    }
    seen.add(entry.id);
    const parsed = parseMarkdownArtifact(localText, entry);
    if (entry.type === "note" && entry.parentId) {
      if (!sectionEntriesByParent.has(entry.parentId)) sectionEntriesByParent.set(entry.parentId, []);
      sectionEntriesByParent.get(entry.parentId).push({ id: entry.id, path: currentPath, title: parsed.title });
    }
    const titleChanged = parsed.title !== entry.title;
    const bodyChanged = remoteArtifact ? String(parsed.body || "") !== String(remoteArtifact.body || "") : true;
    if (!titleChanged && !bodyChanged) return;
    changes.push({
      action: "upsert",
      baseHash,
      artifact: {
        id: entry.id,
        type: entry.type,
        parentId: entry.parentId || null,
        title: parsed.title,
        body: parsed.body,
        created: parsed.created,
        edited: parsed.edited,
        childIds: entry.type === "compendium" ? entry.childIds || [] : [],
        properties: entry.type === "note" ? { role: "compendium-section", status: "active" } : { status: "active" },
      },
    });
  });
  for (const localItem of uniqueLocalFileItems(localFiles)) {
    const currentPath = normalizeVaultPath(localItem?.path || "");
    if (!currentPath || manifestPaths.has(currentPath.toLowerCase()) || !currentPath.toLowerCase().endsWith(".md")) continue;
    if (currentPath.includes(`/${CONFLICT_DIR}/`) || currentPath.includes(`/${MANIFEST_DIR}/`)) continue;
    if (currentPath.split("/").pop()?.toLowerCase() === "_index.md") continue;
    const parentEntry = compendiumEntryForPath(manifestEntries, currentPath);
    if (!parentEntry) continue;
    const fallbackId = uniqueLocalArtifactId(parentEntry.id, usedIds);
    const fallback = {
      id: fallbackId,
      type: "note",
      parentId: parentEntry.id,
      title: titleFromPath(currentPath),
      created: new Date().toISOString(),
    };
    const parsed = parseMarkdownArtifact(localItem.content, fallback);
    if (!parsed.id || usedIds.has(parsed.id)) parsed.id = fallbackId;
    usedIds.add(parsed.id);
    seen.add(parsed.id);
    if (!sectionEntriesByParent.has(parentEntry.id)) sectionEntriesByParent.set(parentEntry.id, []);
    sectionEntriesByParent.get(parentEntry.id).push({ id: parsed.id, path: currentPath, title: parsed.title });
    newFiles.push({ id: parsed.id, path: currentPath, parentId: parentEntry.id });
    changes.push({
      action: "upsert",
      baseHash: "",
      artifact: {
        id: parsed.id,
        type: "note",
        parentId: parentEntry.id,
        title: parsed.title,
        body: parsed.body,
        created: parsed.created,
        edited: parsed.edited,
        childIds: [],
        properties: { role: "compendium-section", status: "active" },
      },
    });
  }
  for (const [parentId, entries] of sectionEntriesByParent.entries()) {
    const parentEntry = manifest.artifacts?.[parentId];
    const remoteParent = remote.get(parentId);
    if (!parentEntry || !remoteParent) continue;
    const nextChildIds = entries
      .sort((a, b) => compareSectionPaths(a.path, b.path))
      .map((entry) => entry.id);
    if (JSON.stringify(nextChildIds) === JSON.stringify(remoteParent.childIds || [])) continue;
    changes.push({
      action: "upsert",
      baseHash: parentEntry.hash || "",
      artifact: {
        id: parentId,
        type: "compendium",
        parentId: null,
        title: remoteParent.title,
        body: remoteParent.body || "",
        created: remoteParent.created,
        edited: new Date().toISOString(),
        childIds: nextChildIds,
        properties: { status: "active" },
      },
    });
  }
  return { changes, conflicts, seen, newFiles };
}

function uniqueLocalFileItems(localFiles) {
  const byPath = new Map();
  for (const item of localFiles.values()) {
    const path = normalizeVaultPath(typeof item === "string" ? "" : item?.path || "");
    if (!path || byPath.has(path.toLowerCase())) continue;
    byPath.set(path.toLowerCase(), item);
  }
  return Array.from(byPath.values());
}

function compendiumEntryForPath(entries, filePath) {
  return entries.find((entry) => {
    if (entry.type !== "compendium") return false;
    const folderPath = compendiumFolderPathFromEntry(entry);
    if (!folderPath) return false;
    const folder = `${folderPath.toLowerCase()}/`;
    return filePath.toLowerCase().startsWith(folder);
  }) || null;
}

function compendiumFolderPathFromEntry(entry) {
  const explicitFolder = normalizeVaultPath(entry.folderPath || "");
  if (explicitFolder) return explicitFolder;
  const indexPath = normalizeVaultPath(entry.path || "");
  if (!indexPath) return "";
  if (indexPath.split("/").pop()?.toLowerCase() === "_index.md") {
    return normalizeVaultPath(path.posix.dirname(indexPath));
  }
  return "";
}

function uniqueLocalArtifactId(parentId, usedIds) {
  for (let index = 0; index < 25; index += 1) {
    const random = Math.random().toString(36).slice(2, 10);
    const id = `obs_${Date.now().toString(36)}_${sanitizePathPart(parentId, "section", 18).replace(/[^A-Za-z0-9._-]/g, "_")}_${random}`.slice(0, 120);
    if (!usedIds.has(id)) return id;
  }
  return `obs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`.slice(0, 120);
}

function titleFromPath(filePath) {
  const name = String(filePath || "").split("/").pop() || "";
  return sanitizePathPart(name.replace(/\.md$/i, "").replace(/^\d+\s*-\s*/, "").replace(/\s*\[[^\]]+\]\s*$/g, ""), "Untitled section", 120);
}

function compareSectionPaths(a, b) {
  const aName = String(a || "").split("/").pop() || "";
  const bName = String(b || "").split("/").pop() || "";
  const aNumber = Number(/^(\d+)/.exec(aName)?.[1] || Number.MAX_SAFE_INTEGER);
  const bNumber = Number(/^(\d+)/.exec(bName)?.[1] || Number.MAX_SAFE_INTEGER);
  if (aNumber !== bNumber) return aNumber - bNumber;
  return aName.localeCompare(bName);
}

function conflictPathFor(conflict, root = DEFAULT_ROOT) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const title = conflict.remote?.title || conflict.id || "conflict";
  return normalizeVaultPath(root, CONFLICT_DIR, `${stamp} - ${slugWithId(title, conflict.id || "unknown", "Conflict", 60)}.md`);
}

module.exports = {
  DEFAULT_ROOT,
  MANIFEST_FILE,
  CONFLICT_DIR,
  sanitizePathPart,
  slugWithId,
  normalizeVaultPath,
  markdownForArtifact,
  parseMarkdownArtifact,
  pathsForSnapshot,
  buildChangesFromVault,
  conflictPathFor,
};
