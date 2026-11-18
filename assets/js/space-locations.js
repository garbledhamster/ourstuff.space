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
		const request = indexedDB.open(dbName, 3);
		request.onupgradeneeded = ({ oldVersion }) => {
			if (oldVersion < 1) request.result.createObjectStore("locations", { keyPath: ["spaceId", "record.id"] });
			if (oldVersion < 2) {
				request.result.createObjectStore("content", { keyPath: ["spaceId", "record.id"] });
				request.result.createObjectStore("editReceipts", { keyPath: ["spaceId", "id", "mutationId"] });
			}
			request.result.createObjectStore("history", { keyPath: ["spaceId", "id"] });

		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	}).catch(error => { opening = undefined; throw error; });
	return opening;
}

async function transact(stores, mode, run) {
	const db = await database();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(stores, mode);
		let result;
		let error;
		const onResult = value => { result = value; };
		const onError = value => { error = value; transaction.abort(); };
		transaction.oncomplete = () => resolve(result);
		transaction.onabort = transaction.onerror = () => reject(error ?? transaction.error);
		run(transaction, onResult, onError);
	});
}

function localList(spaceId, collection, locationId) {
	return transact([collection], "readonly", (transaction, result) => {
		const range = IDBKeyRange.bound([spaceId, ""], [spaceId, "\uffff"]);
		const request = transaction.objectStore(collection).getAll(range);
		request.onsuccess = () => {
			const records = request.result.map(row => row.record).filter(row => !row.deleted);
			result({ role: "owner", records: locationId ? records.filter(row => row.locationId === locationId) : records });
		};
	});
}

async function localWrite(space, changes, previous, mutationId) {
	const createKey = JSON.stringify(changes);
	const payload = previous ? JSON.stringify([previous.revision, changes]) : createKey;
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
	const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
	const collection = (changes.kind || previous?.kind) ? "content" : "locations";
	return transact(["locations", "content", "editReceipts", "history"], "readwrite", (transaction, result, reject) => {
		const store = transaction.objectStore(collection);
		const key = [space.id, changes.id];
		const request = store.get(key);
		request.onsuccess = () => {
			const current = request.result?.record;
			if (current?.deleted || (previous && !current)) return reject(new Error("This record is unavailable."));
			if (previous) {
				const receipts = transaction.objectStore("editReceipts");
				const retry = receipts.get([...key, mutationId]);
				retry.onsuccess = () => {
					if (retry.result?.fingerprint === fingerprint) return result(current);
					if (retry.result) return reject(new Error("Reopen the record before making another edit."));
					if (current.revision !== previous.revision) {
						return reject(Object.assign(new Error("The record changed. Review it again."), { record: current }));
					}
					const modified = { actorUid: "local", app: "our-stuff", at: new Date().toISOString() };
					const changed = Object.keys(changes).filter(key => changes[key] !== current[key]);
					const record = changed.length ? { ...current, ...changes, revision: current.revision + 1, modified } : current;
					if (changed.length) {
						store.put({ spaceId: space.id, record, createKey: request.result.createKey });
						logLocal(transaction, space.id, record, changed.length === 1 && changed[0] === "categoryId" ? "retagged" : "edited", modified);
					}
					receipts.add({ spaceId: space.id, id: changes.id, mutationId, fingerprint, ...modified, revision: record.revision });
					result(record);
				};
				return;
			}
			if (current) {
				if (request.result.createKey !== fingerprint && request.result.createKey !== createKey) {
					return reject(new Error("This record already exists. Reopen it before making a change."));
				}
				return result(current);
			}
			function create() {
				const created = { actorUid: "local", app: "our-stuff", at: new Date().toISOString() };
				const record = { ...changes, appId: space.appId, authorUid: "local", authorName: "On this device", revision: 1, created };
				store.add({ spaceId: space.id, record, createKey: fingerprint });
				logLocal(transaction, space.id, record, "created", created);
				result(record);
			}
			if (!changes.locationId) return create();
			const linked = transaction.objectStore("locations").get([space.id, changes.locationId]);
			linked.onsuccess = () => {
				if (!linked.result || linked.result.record.deleted) return reject(new Error("This location is unavailable in this Space."));
				create();
			};
		};
	});
}

function logLocal(transaction, spaceId, record, action, meta) {
	const { id: recordId, categoryId, revision } = record;
	transaction.objectStore("history").add({
		spaceId, id: recordId + ":" + revision, recordId, categoryId, revision,
		kind: record.kind ?? "location", action, sourceApp: "our-stuff", ...meta,
	});
}

export function listDeviceHistory(spaceId) {
	return transact(["history"], "readonly", (transaction, result) => {
		const range = IDBKeyRange.bound([spaceId, ""], [spaceId, "\uffff"]);
		const request = transaction.objectStore("history").getAll(range);
		request.onsuccess = () => result(request.result.sort((a, b) => b.at.localeCompare(a.at)));
	});
}

export function openDeviceRecord(spaceId, kind, id) {
	const collection = kind === "location" ? "locations" : "content";
	return transact(["locations", "content"], "readonly", (transaction, result) => {
		const request = transaction.objectStore(collection).get([spaceId, id]);
		request.onsuccess = () => {
			const record = request.result?.record;
			if (!record || record.deleted || (record.kind ?? "location") !== kind) return result(undefined);
			if (!record.locationId) return result({ record, role: "owner" });
			const linked = transaction.objectStore("locations").get([spaceId, record.locationId]);
			linked.onsuccess = () => {
				const place = linked.result?.record;
				return result({ record, role: "owner", location: place && !place.deleted ? place : undefined });
			};
		};
	});
}

function localRemove(space, record, mutationId) {
	const collection = record.kind ? "content" : "locations";
	return transact([collection, "history"], "readwrite", (transaction, result, reject) => {
		const store = transaction.objectStore(collection);
		const key = [space.id, record.id];
		const request = store.get(key);
		request.onsuccess = () => {
			const found = request.result?.record;
			if (found?.deleted && found.removalId === mutationId) return result(true);
			if (!found || found.deleted || found.revision !== record.revision) {
				return reject(new Error("This record changed. Reopen it before removing it."));
			}
			const meta = { actorUid: "local", app: "our-stuff", at: new Date().toISOString() };
			const removed = { id: found.id, kind: found.kind, categoryId: found.categoryId, revision: found.revision + 1,
				deleted: true, removalId: mutationId };
			store.put({ spaceId: space.id, record: removed });
			logLocal(transaction, space.id, removed, "removed", meta);
			result(true);
		};
	});
}

async function hostedRequest(scope, tokenFor, resource, options = {}) {
	const token = await tokenFor(scope.account);
	if (!token) throw new Error("Sign in to open Space locations.");
	const headers = new Headers({ authorization: "Bearer " + token });
	if (options.body) headers.set("content-type", "application/json");
	const response = await fetch(FAMILY_API_URL + resource, {
		...options, headers, cache: "no-store", redirect: "error",
	});
	const payload = await response.json();
	if (!response.ok) throw Object.assign(new Error(payload.error?.message || "Couldn’t open Space locations."), {
		status: response.status, record: payload.record ?? payload.location,
	});
	return payload;
}

async function listRecords(space, tokenFor, locationId = undefined) {
	if (!space.account) {
		const [locations, writing] = await Promise.all([
			localList(space.id, "locations"), localList(space.id, "content", locationId),
		]);
		return { role: locations.role, locations: locations.records, records: writing.records };
	}
	const query = new URLSearchParams({ ownerUid: space.ownerUid, appId: space.appId });
	const contentQuery = new URLSearchParams(query);
	if (locationId) contentQuery.set("locationId", locationId);
	const [places, writing] = await Promise.all([
		hostedRequest(space, tokenFor, "/locations?" + query),
		hostedRequest(space, tokenFor, "/content?" + contentQuery),
	]);
	const role = places.role === "reader" || writing.role === "reader" ? "reader" : writing.role;
	return { role, locations: places.locations, records: writing.records };
}

async function writeRecord(space, tokenFor, changes, previous, mutationId) {
	if (!space.account) return localWrite(space, changes, previous, mutationId);
	const resource = (changes.kind || previous?.kind) ? "/content" : "/locations";
	const payload = previous ? { ...changes, expectedRevision: previous.revision, mutationId } : changes;
	const result = await hostedRequest(space, tokenFor, resource + (previous ? "/" + previous.id : ""), {
		method: previous ? "PATCH" : "POST",
		body: JSON.stringify({ ...payload, ownerUid: space.ownerUid, appId: space.appId }),
	});
	return result.record ?? result.location;
}

function canEdit(role) { return role === "owner" || role === "editor"; }

function scopeKey(space) {
	return space && [space.id, space.account, space.ownerUid, space.appId].join("/");
}

function author(space, record) {
	if (record?.authorName) return record.authorName;
	if (!space.account) return "On this device";
	if (!record || record.authorUid === space.account) return space.author || "You";
	return "Space member";
}

function labelFor(space, category) {
	return space.categories[category]?.label ?? category;
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

export function setupSpaceLocations({ currentSpace, tokenFor, onChange }) {
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
	let exact;
	let editor;
	let linkedId;
	let detail;
	let sequence = 0;
	let retrigger;
	let saving = false;

	function paintList(result, space) {
		space = { ...space, role: result.role };
		const locations = new Map(result.locations.map(location => [location.id, location]));
		const linked = locations.get(linkedId);
		feedback.textContent = linkedId && !linked ? "This location is unavailable." : "";
		const rows = linkedId ? result.records : [...result.locations, ...result.records];
		const controls = node("div", "", "space-location-actions");
		if (linkedId) controls.append(action("All locations and writing", () => { linkedId = undefined; void load(); }));
		if (canEdit(result.role) && !linkedId) {
			controls.append(action("Mark location", () => openEditor(space), "primary-button"));
		}
		if (canEdit(result.role) && linked) {
			controls.append(action("Write review", () => openEditor(space, undefined, { kind: "review", linked })));
		}
		if (canEdit(result.role) && (!linkedId || linked)) {
			controls.append(action("Write note", () => openEditor(space, undefined, { kind: "note", linked })));
		}
		if (linked) {
			controls.prepend(node("p", linked.name, "space-location-linked"));
			feedback.textContent = `${rows.length} ${rows.length === 1 ? "entry" : "entries"}`;
		} else if (!linkedId && !rows.length) feedback.textContent = "No locations or writing saved yet.";
		content.replaceChildren(controls, ...categories.flatMap(category => {
			const records = rows.filter(record => record.categoryId === category);
			if (!records.length) return [];
			const section = node("section");
			const title = node("h3", labelFor(space, category));
			const icon = space.categories[category]?.icon;
			if (icon) title.prepend(icon);
			section.append(title);
			const entries = node("ul", "", "space-location-entries");
			records.forEach(record => {
				const row = node("li");
				row.dataset.recordId = record.id;
				const actions = node("div", "", "space-location-actions");
				if (record.kind) {
					const relation = locations.get(record.locationId);
					row.append(node("strong", record.kind === "review" ? "Review" : "Note"),
						node("p", record.body, "space-location-preview"), node("span", "Author · " + author(space, record)));
					if (relation) row.append(node("span", relation.name));
					actions.append(action("Open " + record.kind, () => {
						detail = record.id;
						paintDetails(space, record, relation);
					}));
					if (canEdit(result.role)) actions.append(action("Edit " + record.kind, () => openEditor(space, record, { linked: relation })));
				} else {
					row.append(node("strong", record.name), node("span", `${record.lat}, ${record.lon}`));
					const url = safeSource(record.source?.url);
					if (url) {
						const source = node("a", "View source");
						source.href = url;
						source.target = "_blank";
						source.rel = "noopener noreferrer";
						row.append(source);
					}
					actions.append(action("Reviews & notes", () => { linkedId = record.id; void load(); }));
					if (canEdit(result.role)) {
						const change = () => openEditor(space, record, { typeOnly: true });
						const type = action(labelFor(space, category), change);
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
						actions.append(type, action("Change type", change),
							action("Edit location", () => openEditor(space, record)));
					}
				}
				row.append(actions);
				entries.append(row);
			});
			section.append(entries);
			return [section];
		}));
		if (detail) {
			const opened = result.records.find(record => record.id === detail);
			if (opened) paintDetails(space, opened, locations.get(opened.locationId));
		}
	}

	function paintDetails(space, record, linked) {
		const title = node("h3", record.kind === "review" ? "Review" : "Note");
		title.tabIndex = -1;
		const summary = node("p", author(space, record) + " · " + labelFor(space, record.categoryId));
		const body = node("p", record.body, "space-location-writing");
		const actions = node("div", "", "space-location-actions");
		actions.append(action("Back", () => { detail = undefined; void load(); }));
		if (canEdit(space.role)) actions.append(action("Edit " + record.kind, () => openEditor(space, record, { linked })));
		content.replaceChildren(title, summary, body, actions);
		if (linked) title.after(node("p", linked.name));
		title.focus();
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
		feedback.textContent = "Loading…";
		try {
			const result = await listRecords(space, tokenFor, linkedId);
			if (dialog.open && sequence === request && scopeKey(currentSpace()) === scopeKey(space)) paintList(result, space);
		} catch (error) {
			if (dialog.open && sequence === request) {
				feedback.textContent = error instanceof Error ? error.message : "Couldn’t load Space records.";
				content.append(action("Retry", load));
			}
		}
	}

	function openEditor(space, record, { kind = record?.kind, linked, typeOnly = false } = {}) {
		if (editor) return;
		editor = { space, record };
		const form = node("form", "", "space-location-editor");
		const nameField = node("label", "Name");
		const name = node("input");
		name.maxLength = 120;
		name.placeholder = "Use coordinates";
		name.value = record?.name ?? "";
		nameField.append(name);
		const bodyField = node("label", kind === "review" ? "Review" : "Note");
		const body = node("textarea");
		body.maxLength = 8000;
		body.required = true;
		body.value = record?.body ?? "";
		bodyField.append(body);
		const latitude = coordinateField("Latitude", -90, 90);
		const longitude = coordinateField("Longitude", -180, 180);
		const select = node("select");
		select.required = true;
		const blank = node("option", "Choose a type");
		blank.value = "";
		select.append(blank, ...categories.map(category => {
			const choice = node("option", labelFor(space, category));
			choice.value = category;
			return choice;
		}));
		select.value = record?.categoryId ?? "";
		const typeField = node("label", "Type");
		typeField.append(select);
		const save = node("button", "Save " + (kind ?? (typeOnly ? "type" : "location")), "primary-button");
		save.type = "submit";
		const cancel = action("Cancel", () => {
			if (exact) dialog.close();
			else if (scopeKey(space) === scopeKey(currentSpace())) void load();
			else resetView();
		});
		const actions = node("div", "", "space-location-actions");
		actions.append(save, cancel);
		const id = record?.id ?? (kind ?? "loc") + "-" + crypto.randomUUID();
		const authorLine = node("p", "Author · " + author(space, record), "space-location-destination");
		let lastAttempt;
		const removalId = crypto.randomUUID();
		if (record) {
			const remove = action("Remove " + (kind ?? "location"), async () => {
				if (saving || !window.confirm("Remove this " + (kind ?? "location") + " from the Space?")) return;
				saving = true;
				remove.disabled = cancel.disabled = close.disabled = save.disabled = true;
				try {
					if (space.account) await hostedRequest(space, tokenFor, (kind ? "/content/" : "/locations/") + id, {
						method: "DELETE", body: JSON.stringify({ ownerUid: space.ownerUid, appId: space.appId,
							expectedRevision: editor.record.revision, mutationId: removalId }),
					});
					else await localRemove(space, editor.record, removalId);
					if (exact) dialog.close();
					else resetView();
					onChange?.();
				} catch (error) { feedback.textContent = error.message; }
				finally {
					saving = false;
					remove.disabled = cancel.disabled = close.disabled = save.disabled = false;
				}
			});
			actions.append(remove);
		}
		feedback.textContent = "";
		destination.textContent = space.name + " · " + visibility(space);
		if (kind) {
			if (linked) form.append(node("p", linked.name));
			form.append(bodyField);
		} else if (record) {
			if (!typeOnly) form.append(nameField);
			form.append(node("p", typeOnly ? record.name + " · " + record.lat + ", " + record.lon : `${record.lat}, ${record.lon}`));
		} else form.append(nameField, latitude.field, longitude.field);
		form.append(typeField, authorLine, actions);
		content.replaceChildren(form);
		(kind ? body : typeOnly ? select : name).focus();

		form.addEventListener("submit", async event => {
			event.preventDefault();
			if (saving || !editor || !categories.includes(select.value) || !canEdit(space.role)) return;
			const original = editor;
			if (scopeKey(space) === scopeKey(currentSpace()) && !canEdit(currentSpace()?.role)) {
				save.disabled = true;
				feedback.textContent = "You have read-only access to this Space.";
				return;
			}
			if ((space.account || !exact) && space.account !== currentSpace()?.account) return refresh();
			if (!record && scopeKey(space) !== scopeKey(currentSpace())) {
				resetView();
				return;
			}
			const changes = { id, categoryId: select.value };
			if (kind) {
				if (!body.value.trim()) {
					feedback.textContent = "Enter text before saving.";
					return;
				}
				changes.body = body.value.trim();
				if (!record) Object.assign(changes, { kind, locationId: linked?.id });
			} else {
				const lat = record?.lat ?? latitude.control.valueAsNumber;
				const lon = record?.lon ?? longitude.control.valueAsNumber;
				if (!typeOnly) changes.name = name.value.trim() || `${lat}, ${lon}`;
				if (!record) Object.assign(changes, { lat, lon });
			}
			const fingerprint = JSON.stringify([original.record?.revision, changes]);
			if (lastAttempt?.fingerprint !== fingerprint) lastAttempt = { fingerprint, id: crypto.randomUUID() };
			saving = true;
			save.disabled = cancel.disabled = close.disabled = true;
			feedback.textContent = "Saving…";
			try {
				await writeRecord(space, tokenFor, changes, original.record, lastAttempt.id);
				if (editor === original) {
					if (exact) dialog.close();
					else if (scopeKey(space) !== scopeKey(currentSpace())) resetView();
					else await load();
					onChange?.();
				}
			} catch (error) {
				if (editor !== original) return;
				if ([401, 403, 404].includes(error.status)) original.permissionLost = true;
				if (error.record?.id === id) {
					original.record = error.record;
					const latest = error.record.body ?? error.record.name;
					feedback.textContent = "Current " + (kind ?? "location") + " · " +
						labelFor(space, error.record.categoryId) + " · " + latest + ". Review and confirm again.";
				} else feedback.textContent = error instanceof Error ? error.message : "Couldn’t save this record.";
			} finally {
				saving = false;
				save.disabled = Boolean(original.permissionLost);
				cancel.disabled = close.disabled = false;
			}
		});
	}

	function resetView() {
		linkedId = detail = undefined;
		void load();
	}

	function refresh() {
		if (!dialog.open) return;
		if (exact) {
			if (exact.account && exact.account !== currentSpace()?.account) {
				dialog.close();
				return;
			}
			const original = editor;
			if (exact.account && original?.record && !saving) {
				const query = new URLSearchParams({ ownerUid: exact.ownerUid, appId: exact.appId,
					mode: "hosted", kind: original.record.kind ?? "location", record: original.record.id });
				content.hidden = true;
				const verification = ++sequence;
				void hostedRequest(exact, tokenFor, "/space-record?" + query).then(result => {
					if (sequence === verification && result.role === "reader") dialog.close();
				}).catch(() => {
					if (sequence === verification && dialog.open) dialog.close();
				}).finally(() => {
					if (sequence === verification) content.hidden = false;
				});
			}
			return;
		}
		const space = currentSpace();
		if (current?.account !== space?.account) {
			dialog.close();
			return;
		}
		if (scopeKey(current) !== scopeKey(space)) {
			if (!editor?.record) resetView();
		} else if (!editor) void load();
	}

	dialog.addEventListener("cancel", event => { if (saving) event.preventDefault(); });
	dialog.addEventListener("close", () => {
		sequence++;
		content.hidden = false;
		editor = current = linkedId = detail = exact = undefined;
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
		openExact(space, record, linked) {
			if (dialog.open) return;
			exact = current = space;
			dialog.showModal();
			openEditor(space, record, { linked });
		},
		refresh,
	};
}
