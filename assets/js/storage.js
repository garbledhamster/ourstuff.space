export const STORAGE_KEY = "ourstuff.artifactStore.v1";
export const SCHEMA_VERSION = 1;
export const SEED_DATA_URL = "/assets/data/artifacts.json";

export function createEmptyStore() {
  return {
    schemaVersion: SCHEMA_VERSION,
    rootId: "ourstuff-root",
    artifacts: []
  };
}

export async function loadSeedStore() {
  try {
    const response = await fetch(SEED_DATA_URL, { cache: "no-store" });
    if (!response.ok) return createEmptyStore();

    const parsed = await response.json();
    if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.artifacts)) {
      return createEmptyStore();
    }

    return parsed;
  } catch {
    return createEmptyStore();
  }
}

export async function loadArtifactStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return await loadSeedStore();

    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.artifacts)) {
      return await loadSeedStore();
    }

    return parsed;
  } catch {
    return await loadSeedStore();
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
  const previousCompendiumIds = new Set(
    previousStore.artifacts
      .filter((artifact) => artifact.type === "compendium" && artifact.dashboard === "Mind")
      .map((artifact) => artifact.id)
  );
  const artifacts = previousStore.artifacts.filter((artifact) =>
    !(artifact.type === "compendium" && artifact.dashboard === "Mind")
    && !previousCompendiumIds.has(artifact.parentId)
  );

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

export function removeArtifact(store, artifactId) {
  return {
    ...store,
    artifacts: store.artifacts.filter(
      (artifact) => artifact.id !== artifactId && artifact.parentId !== artifactId
    )
  };
}
