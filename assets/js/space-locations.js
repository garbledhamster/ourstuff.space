import { FAMILY_API_URL } from "./config.js";

const categories = ["Mind", "Body", "Spirit", "Life"];
const dbName = "ourstuff.space-locations.v1";
let opening;

function node(tag, content = "", className = "") {
	const element = document.createElement(tag);
	element.className = className;
	element.textContent = content;
	return element;
}

function action(text, run, className = "secondary-button") {
	const button = node("button", text, className);
	button.type = "button";
	button.addEventListener("click", run);
	return button;
}

function database() {
	opening ??= new Promise((resolve, reject) => {
		const request = indexedDB.open(dbName, 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore("locations", { keyPath: ["spaceId", "record.id"] });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	}).catch(error => { opening = undefined; throw error; });
	return opening;
}

async function transact(mode, run) {
	const db = await database();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction("locations", mode);
		let result;
		let error;
		const onResult = value => { result = value; };
		const onError = value => { error = value; transaction.abort(); };
		transaction.oncomplete = () => resolve(result);
		transaction.onabort = transaction.onerror = () => reject(error ?? transaction.error);
		run(transaction.objectStore("locations"), onResult, onError);
	});
}

function localList(spaceId) {
	return transact("readonly", (store, result) => {
		const range = IDBKeyRange.bound([spaceId, ""], [spaceId, "\uffff"]);
		const request = store.getAll(range);
		request.onsuccess = () => result({ role: "owner", locations: request.result.map(row => row.record) });
	});
}

function localWrite(space, changes, previous) {
	return transact("readwrite", (store, result, reject) => {
		const request = store.get([space.id, changes.id]);
		request.onsuccess = () => {
			const current = request.result?.record;
			if (previous) {
				if (!current) return reject(new Error("This location is unavailable."));
				if (current.revision !== previous.revision) {
					return reject(Object.assign(new Error("The type changed. Review it again."), { location: current }));
				}
			} else if (current) {
				// A retry from this editor refers to the same creation.
				const same = request.result.createKey === JSON.stringify(changes);
				if (!same) return reject(new Error("This location already exists. Reopen it before making a change."));
				return result(current);
			}
			const record = previous
				? { ...current, categoryId: changes.categoryId, revision: current.revision + 1 }
				: { ...changes, appId: space.appId, revision: 1 };
			store.put({ spaceId: space.id, record, createKey: request.result?.createKey ?? JSON.stringify(changes) });
			result(record);
		};
	});
}

async function hostedRequest(scope, tokenFor, suffix, options = {}) {
	const token = await tokenFor(scope.account);
	if (!token) throw new Error("Sign in to open Space locations.");
	const headers = new Headers({ authorization: "Bearer " + token });
	if (options.body) headers.set("content-type", "application/json");
	const response = await fetch(FAMILY_API_URL + "/locations" + suffix, {
		...options, headers, cache: "no-store", redirect: "error",
	});
	const payload = await response.json();
	if (!response.ok) throw Object.assign(new Error(payload.error?.message || "Couldn’t open Space locations."), {
		status: response.status, location: payload.location,
	});
	return payload;
}

function listLocations(space, tokenFor) {
	if (!space.account) return localList(space.id);
	const query = new URLSearchParams({ ownerUid: space.ownerUid, appId: space.appId });
	return hostedRequest(space, tokenFor, "?" + query);
}

async function writeLocation(space, tokenFor, changes, previous) {
	if (!space.account) return localWrite(space, changes, previous);
	const payload = previous
		? { categoryId: changes.categoryId, expectedRevision: previous.revision }
		: changes;
	const { location } = await hostedRequest(space, tokenFor, previous ? "/" + previous.id : "", {
		method: previous ? "PATCH" : "POST",
		body: JSON.stringify({ ...payload, ownerUid: space.ownerUid, appId: space.appId }),
	});
	return location;
}

function canEdit(role) { return role === "owner" || role === "editor"; }

function scopeKey(space) {
	return space && [space.id, space.account, space.ownerUid, space.appId].join("/");
}

function visibility(space) {
	if (!space.account) return "On this device";
	return space.shareable ? "Shared with " + space.name + " members" : "Private to you";
}

function coordinateField(label, min, max) {
	const field = node("label", label);
	const control = node("input");
	control.type = "number";
	control.min = String(min);
	control.max = String(max);
	control.step = "any";
	control.required = true;
	field.append(control);
	return { field, control };
}

function safeSource(value) {
	const link = typeof value === "string" ? URL.parse(value) : null;
	if (link && ["http:", "https:"].includes(link.protocol) && !link.username && !link.password) return link.href;
}

export function setupSpaceLocations({ currentSpace, tokenFor }) {
	const dialog = node("dialog", "", "space-locations-modal");
	dialog.setAttribute("aria-labelledby", "space-locations-heading");
	const heading = node("h2", "Space locations");
	heading.id = "space-locations-heading";
	heading.tabIndex = -1;
	const destination = node("p", "", "space-location-destination");
	const feedback = node("p");
	feedback.setAttribute("role", "status");
	const content = node("div");
	const close = action("Close", () => dialog.close());
	dialog.append(heading, destination, feedback, content, close);
	document.body.append(dialog);

	let current;
	let editor;
	let sequence = 0;
	let retrigger;
	let saving = false;

	function paintList(result, space) {
		feedback.textContent = result.locations.length ? "" : "No locations saved yet.";
		const add = action("Mark location", () => openEditor(space), "primary-button");
		add.hidden = !canEdit(result.role);
		content.replaceChildren(add, ...categories.flatMap(category => {
			const locations = result.locations.filter(location => location.categoryId === category);
			if (!locations.length) return [];
			const section = node("section");
			section.append(node("h3", space.categories[category] ?? category));
			const entries = node("ul", "", "space-location-entries");
			for (const location of locations) {
				const row = node("li");
				row.append(node("strong", location.name), node("span", `${location.lat}, ${location.lon}`));
				const link = safeSource(location.source?.url);
				if (link) {
					const source = node("a", "View source");
					source.href = link;
					source.target = "_blank";
					source.rel = "noopener noreferrer";
					row.append(source);
				}
				if (canEdit(result.role)) {
					const change = () => openEditor(space, location);
					const type = action(space.categories[category] ?? category, change);
					let timer;
					let touch;
					type.addEventListener("pointerdown", event => {
						if (event.pointerType !== "touch" || !event.isPrimary) return;
						touch = event;
						timer = window.setTimeout(change, 550);
					});
					type.addEventListener("pointermove", event => {
						if (touch && Math.hypot(touch.clientX - event.clientX, touch.clientY - event.clientY) > 8) {
							window.clearTimeout(timer);
						}
					});
					for (const name of ["pointerup", "pointercancel", "pointerleave"]) {
						type.addEventListener(name, () => { window.clearTimeout(timer); touch = undefined; });
					}
					row.append(node("div", "", "space-location-actions"));
					row.lastChild.append(type, action("Change type", change));
				}
				entries.append(row);
			}
			section.append(entries);
			return [section];
		}));
	}

	async function load() {
		editor = undefined;
		current = currentSpace();
		const space = current;
		const request = ++sequence;
		content.replaceChildren();
		destination.textContent = space ? space.name + " · " + visibility(space) : "";
		if (!space || (space.account && !space.ownerUid)) {
			feedback.textContent = "This Space is unavailable.";
			return;
		}
		feedback.textContent = "Loading locations…";
		try {
			const result = await listLocations(space, tokenFor);
			if (dialog.open && sequence === request && scopeKey(currentSpace()) === scopeKey(space)) paintList(result, space);
		} catch (error) {
			if (dialog.open && sequence === request) {
				feedback.textContent = error instanceof Error ? error.message : "Couldn’t load locations.";
				content.append(action("Retry", load));
			}
		}
	}

	function openEditor(space, location) {
		if (editor) return;
		editor = { space, location };
		const form = node("form", "", "space-location-editor");
		const nameField = node("label", "Name");
		const name = node("input");
		name.maxLength = 120;
		name.placeholder = "Use coordinates";
		nameField.append(name);
		const latitude = coordinateField("Latitude", -90, 90);
		const longitude = coordinateField("Longitude", -180, 180);
		const select = node("select");
		select.required = true;
		const blank = node("option", "Choose a type");
		blank.value = "";
		select.append(blank, ...categories.map(category => {
			const choice = node("option", space.categories[category] ?? category);
			choice.value = category;
			return choice;
		}));
		select.value = location?.categoryId ?? "";
		const typeField = node("label", "Type");
		typeField.append(select);
		const save = node("button", location ? "Save type" : "Save location", "primary-button");
		save.type = "submit";
		const cancel = action("Cancel", load);
		const actions = node("div", "", "space-location-actions");
		actions.append(save, cancel);
		const id = location?.id ?? "loc-" + crypto.randomUUID();
		feedback.textContent = "";
		destination.textContent = space.name + " · " + visibility(space);
		if (location) form.append(node("p", location.name + " · " + location.lat + ", " + location.lon));
		else form.append(nameField, latitude.field, longitude.field);
		form.append(typeField, actions);
		content.replaceChildren(form);
		(location ? select : name).focus();

		form.addEventListener("submit", async event => {
			event.preventDefault();
			if (saving || !editor || !categories.includes(select.value) || !canEdit(space.role)) return;
			const original = editor;
			if (space.account !== currentSpace()?.account) return refresh();
			if (!location && scopeKey(space) !== scopeKey(currentSpace())) {
				void load();
				return;
			}
			saving = true;
			save.disabled = cancel.disabled = close.disabled = true;
			feedback.textContent = "Saving…";
			const lat = latitude.control.valueAsNumber;
			const lon = longitude.control.valueAsNumber;
			const changes = { id, categoryId: select.value };
			if (!location) Object.assign(changes, { name: name.value.trim() || `${lat}, ${lon}`, lat, lon });
			try {
				await writeLocation(space, tokenFor, changes, original.location);
				if (editor === original) await load();
			} catch (error) {
				if (editor !== original) return;
				if (error.location?.id === id) {
					original.location = error.location;
					feedback.textContent = "Current type: " +
						(space.categories[error.location.categoryId] ?? error.location.categoryId) + ". Review and confirm again.";
				} else feedback.textContent = error instanceof Error ? error.message : "Couldn’t save location.";
			} finally {
				saving = false;
				save.disabled = cancel.disabled = close.disabled = false;
			}
		});
	}

	function refresh() {
		if (!dialog.open) return;
		const space = currentSpace();
		if (current?.account !== space?.account) {
			dialog.close();
			return;
		}
		if (!editor) void load();
		else if (!editor.location && scopeKey(editor.space) !== scopeKey(space)) void load();
	}

	dialog.addEventListener("cancel", event => { if (saving) event.preventDefault(); });
	dialog.addEventListener("close", () => {
		sequence++;
		editor = current = undefined;
		content.replaceChildren();
		(retrigger?.getClientRects().length ? retrigger : document.querySelector(".mobile-menu-toggle"))?.focus();
	});
	window.addEventListener("focus", refresh);
	return {
		open(trigger) {
			if (dialog.open) return;
			retrigger = trigger;
			dialog.showModal();
			heading.focus({ preventScroll: true });
			void load();
		},
		refresh,
	};
}
