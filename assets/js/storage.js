import { getActiveSpaceId, PERSONAL_SPACE_ID, scopedStorageKey } from "./space.js";

export const STORAGE_KEY = scopedStorageKey("ourstuff.artifactStore.v1");
export const SCHEMA_VERSION = 1;
export const SEED_DATA_URL = "/assets/data/artifacts.json";

export function createEmptyStore() {
	return {
		schemaVersion: SCHEMA_VERSION,
		rootId: "ourstuff-root",
		artifacts: [],
	};
}

export async function loadSeedStore() {
	try {
		const response = await fetch(SEED_DATA_URL, { cache: "no-store" });
		if (!response.ok) {
			return createEmptyStore();
		}

		const parsed = await response.json();
		if (
			parsed?.schemaVersion !== SCHEMA_VERSION ||
			!Array.isArray(parsed.artifacts)
		) {
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
		if (!raw) {
			if (getActiveSpaceId() !== PERSONAL_SPACE_ID) {
				return createEmptyStore();
			}
			return await loadSeedStore();
		}

		const parsed = JSON.parse(raw);
		if (
			parsed?.schemaVersion !== SCHEMA_VERSION ||
			!Array.isArray(parsed.artifacts)
		) {
			if (getActiveSpaceId() !== PERSONAL_SPACE_ID) {
				return createEmptyStore();
			}
			return await loadSeedStore();
		}

		return parsed;
	} catch {
		if (getActiveSpaceId() !== PERSONAL_SPACE_ID) {
			return createEmptyStore();
		}
		return await loadSeedStore();
	}
}

export function saveArtifactStore(store) {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function compendiumSections(compendium) {
	return Array.isArray(compendium.sections)
		? compendium.sections
		: Array.isArray(compendium.blocks)
			? compendium.blocks
			: [];
}

export function isDeletedArtifact(artifact) {
	return artifact?.deleted === true || artifact?.properties?.deleted === true;
}

export function activeArtifacts(store) {
	return (Array.isArray(store?.artifacts) ? store.artifacts : []).filter(
		(artifact) => !isDeletedArtifact(artifact),
	);
}

export function artifactStoreToCompendiums(store) {
	const artifacts = activeArtifacts(store);
	return artifacts
		.filter(
			(artifact) =>
				artifact.type === "compendium" && artifact.dashboard === "Mind",
		)
		.map((compendium) => ({
			id: compendium.id,
			title: compendium.title,
			body: compendium.body,
			created: compendium.created,
			edited: compendium.edited,
			sections: artifacts
				.filter(
					(artifact) =>
						artifact.parentId === compendium.id && artifact.type === "note",
				)
				.sort(
					(a, b) =>
						compendium.childIds.indexOf(a.id) -
						compendium.childIds.indexOf(b.id),
				)
				.map((section) => ({
					id: section.id,
					title: section.title,
					body: section.body,
					created: section.created,
					edited: section.edited,
				})),
		}));
}

export function compendiumsToArtifactStore(compendiums, previousStore) {
	const previousById = new Map(
		previousStore.artifacts.map((artifact) => [artifact.id, artifact]),
	);
	const previousActiveCompendiumIds = new Set(
		previousStore.artifacts
			.filter(
				(artifact) =>
					artifact.type === "compendium" && artifact.dashboard === "Mind",
			)
			.filter((artifact) => !isDeletedArtifact(artifact))
			.map((artifact) => artifact.id),
	);
	const artifacts = previousStore.artifacts.filter(
		(artifact) =>
			isDeletedArtifact(artifact) ||
			(!(artifact.type === "compendium" && artifact.dashboard === "Mind") &&
				!previousActiveCompendiumIds.has(artifact.parentId)),
	);

	compendiums.forEach((compendium) => {
		const previous = previousById.get(compendium.id);
		const sections = compendiumSections(compendium);
		artifacts.push({
			id: compendium.id,
			type: "compendium",
			dashboard: "Mind",
			parentId: null,
			title: compendium.title,
			body: compendium.body,
			created: compendium.created,
			edited: compendium.edited,
			childIds: sections.map((section) => section.id),
			properties: previous?.properties || { status: "active" },
			analysis: previous?.analysis || {},
		});

		sections.forEach((section) => {
			const previousSection = previousById.get(section.id);
			artifacts.push({
				id: section.id,
				type: "note",
				dashboard: "Mind",
				parentId: compendium.id,
				title: section.title,
				body: section.body,
				created: section.created,
				edited: section.edited,
				childIds: [],
				properties: previousSection?.properties || {
					role: "compendium-section",
					status: "active",
				},
				analysis: previousSection?.analysis || {},
			});
		});
	});

	return {
		...previousStore,
		artifacts,
	};
}

export function rootNotesForDashboard(store, dashboard) {
	return activeArtifacts(store).filter(
		(artifact) =>
			artifact.type === "note" &&
			artifact.dashboard === dashboard &&
			!artifact.parentId,
	);
}

export function findArtifact(store, id) {
	return activeArtifacts(store).find((artifact) => artifact.id === id) || null;
}

export function findAnyArtifact(store, id) {
	return (
		(Array.isArray(store?.artifacts) ? store.artifacts : []).find(
			(artifact) => artifact.id === id,
		) || null
	);
}

export function upsertArtifact(store, artifact) {
	const exists = store.artifacts.some((item) => item.id === artifact.id);
	return {
		...store,
		artifacts: exists
			? store.artifacts.map((item) =>
					item.id === artifact.id ? artifact : item,
				)
			: [...store.artifacts, artifact],
	};
}

export function removeArtifact(store, artifactId) {
	return {
		...store,
		artifacts: store.artifacts.filter(
			(artifact) =>
				artifact.id !== artifactId && artifact.parentId !== artifactId,
		),
	};
}
