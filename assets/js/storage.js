import { demoCompendiums } from "./data.js";

export const STORAGE_KEY = "ourstuff.artifactStore.v1";
export const SCHEMA_VERSION = 1;

export function createSeedStore() {
  const artifacts = [];

  demoCompendiums.forEach((compendium) => {
    artifacts.push({
      id: compendium.id,
      type: "compendium",
      dashboard: "Mind",
      parentId: null,
      title: compendium.title,
      body: compendium.body,
      created: compendium.created,
      edited: compendium.edited,
      childIds: compendium.blocks.map((block) => block.id),
      properties: {
        source: "preview.jsx",
        status: "active"
      },
      analysis: {}
    });

    compendium.blocks.forEach((block) => {
      artifacts.push({
        id: block.id,
        type: "note",
        dashboard: "Mind",
        parentId: compendium.id,
        title: block.title,
        body: block.body,
        created: block.created,
        edited: block.edited,
        childIds: [],
        properties: {
          role: "compendium-section",
          status: "active"
        },
        analysis: {}
      });
    });
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    rootId: "ourstuff-root",
    artifacts
  };
}

export function loadArtifactStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedStore();

    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.artifacts)) {
      return createSeedStore();
    }

    return parsed;
  } catch {
    return createSeedStore();
  }
}

export function saveArtifactStore(store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function artifactStoreToCompendiums(store) {
  return store.artifacts
    .filter((artifact) => artifact.type === "compendium" && artifact.dashboard === "Mind")
    .map((compendium) => ({
      id: compendium.id,
      title: compendium.title,
      body: compendium.body,
      created: compendium.created,
      edited: compendium.edited,
      blocks: store.artifacts
        .filter((artifact) => artifact.parentId === compendium.id && artifact.type === "note")
        .sort((a, b) => compendium.childIds.indexOf(a.id) - compendium.childIds.indexOf(b.id))
        .map((block) => ({
          id: block.id,
          title: block.title,
          body: block.body,
          created: block.created,
          edited: block.edited
        }))
    }));
}

export function compendiumsToArtifactStore(compendiums, previousStore) {
  const previousById = new Map(previousStore.artifacts.map((artifact) => [artifact.id, artifact]));
  const artifacts = previousStore.artifacts.filter((artifact) => artifact.dashboard !== "Mind");

  compendiums.forEach((compendium) => {
    const previous = previousById.get(compendium.id);
    artifacts.push({
      id: compendium.id,
      type: "compendium",
      dashboard: "Mind",
      parentId: null,
      title: compendium.title,
      body: compendium.body,
      created: compendium.created,
      edited: compendium.edited,
      childIds: compendium.blocks.map((block) => block.id),
      properties: previous?.properties || { status: "active" },
      analysis: previous?.analysis || {}
    });

    compendium.blocks.forEach((block) => {
      const previousBlock = previousById.get(block.id);
      artifacts.push({
        id: block.id,
        type: "note",
        dashboard: "Mind",
        parentId: compendium.id,
        title: block.title,
        body: block.body,
        created: block.created,
        edited: block.edited,
        childIds: [],
        properties: previousBlock?.properties || {
          role: "compendium-section",
          status: "active"
        },
        analysis: previousBlock?.analysis || {}
      });
    });
  });

  return {
    ...previousStore,
    artifacts
  };
}

export function rootNotesForDashboard(store, dashboard) {
  return store.artifacts.filter(
    (artifact) => artifact.type === "note" && artifact.dashboard === dashboard && !artifact.parentId
  );
}

export function findArtifact(store, id) {
  return store.artifacts.find((artifact) => artifact.id === id) || null;
}

export function upsertArtifact(store, artifact) {
  const exists = store.artifacts.some((item) => item.id === artifact.id);
  return {
    ...store,
    artifacts: exists
      ? store.artifacts.map((item) => (item.id === artifact.id ? artifact : item))
      : [...store.artifacts, artifact]
  };
}
