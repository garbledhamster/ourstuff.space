import { FAMILY_API_URL } from "./config.js";
import { listDeviceHistory, openDeviceRecord } from "./space-locations.js";

const labels = { location: "Place", review: "Review", note: "Note", "outing-note": "Outing note", route: "Route", photo: "Photo", visit: "Visit" };
const dates = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const scopeQuery = scope => new URLSearchParams({ ownerUid: scope.ownerUid, appId: scope.appId });
const key = scope => scope ? [scope.id, scope.account, scope.ownerUid, scope.appId].join("/") : "";
const writable = role => role === "owner" || role === "editor";

function node(tag, content = "", className = "") {
	const element = document.createElement(tag);
	element.textContent = content;
	element.className = className;
	return element;
}

function button(text, action) {
	const control = node("button", text, "secondary-button");
	control.type = "button";
	control.addEventListener("click", action);
	return control;
}

function link(text, href) {
	const element = node("a", text, "secondary-button");
	element.href = href;
	element.target = "_blank";
	element.rel = "noopener noreferrer";
	return element;
}

async function hosted(scope, tokenFor, resource, options = {}) {
	const token = await tokenFor(scope.account);
	if (!token) throw new Error("Sign in to open this Space.");
	const headers = new Headers({ authorization: "Bearer " + token });
	if (options.body) headers.set("content-type", "application/json");
	const response = await fetch(FAMILY_API_URL + resource, { ...options, headers, cache: "no-store", redirect: "error" });
	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		throw new Error(data.error?.message ?? "This record is unavailable.");
	}
	return options.binary ? response.blob() : response.json();
}

export function readHistoryReference(params) {
	const view = params.get("view");
	if (view !== "space-record" && view !== "space-history") return;
	const mode = params.get("mode");
	const kind = params.get("kind");
	const id = params.get("record");
	if (!["local", "hosted"].includes(mode)) return;
	if (view === "space-record" && (!Object.hasOwn(labels, kind) || !id || !/^[a-z0-9-]{36,48}$/u.test(id))) return;
	if (view === "space-history") {
		if (mode === "local" && params.has("space")) return { mode, spaceId: params.get("space") };
		if (mode === "hosted" && params.has("spaceOwner") && params.has("spaceApp")) {
			return { mode, ownerUid: params.get("spaceOwner"), appId: params.get("spaceApp") };
		}
		return;
	}
	if (mode === "local") return { mode, kind, id, spaceId: params.get("space") };
	return { mode, kind, id, ownerUid: params.get("spaceOwner"), appId: params.get("spaceApp") };
}

function localLink(scope, ref) {
	const url = new URL("/", window.location.origin);
	url.search = new URLSearchParams({ view: "space-record", mode: "local", space: scope.id, kind: ref.kind, record: ref.id });
	return url.href;
}

export function setupSpaceHistory({ currentSpace, resolveSpace, tokenFor, edit }) {
	const dialog = node("dialog", "", "space-locations-modal");
	dialog.setAttribute("aria-labelledby", "space-history-title");
	const title = node("h2", "Space history");
	title.id = "space-history-title";
	title.tabIndex = -1;
	const scopeLabel = node("p", "", "space-location-destination");
	const feedback = node("p");
	feedback.setAttribute("role", "status");
	const content = node("div");
	dialog.append(title, scopeLabel, feedback, content, button("Close", () => dialog.close()));
	document.body.append(dialog);

	let trigger;
	let selected;
	let scopeRef;
	let mode;
	let objectUrl;
	let run = 0;
	let query = "";

	function clear() {
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		objectUrl = undefined;
		content.replaceChildren();
	}

	function returnToSpace() {
		selected = undefined;
		void refresh();
	}

	function paintList(entries, scope) {
		const searchField = node("input");
		searchField.type = "search";
		searchField.value = query;
		const search = node("label", "Search history", "space-history-search");
		search.append(searchField);
		const rows = node("ul", "", "space-location-entries");
		const count = node("p");
		count.setAttribute("role", "status");
		function filter() {
			query = searchField.value;
			const searchTerm = query.trim().toLowerCase();
			const shown = entries.filter(row => summary(row).toLowerCase().includes(searchTerm));
			count.textContent = shown.length + (shown.length === 1 ? " change" : " changes");
			rows.replaceChildren(...shown.map(row => {
				const item = node("li");
				item.dataset.change = row.action;
				if (row.action === "credited") {
					const time = node("time", dates.format(new Date(row.occurredAt)));
					time.dateTime = row.occurredAt;
					const metadata = node("span", "", "space-location-writing");
					metadata.append(time, " · " + row.actorName);
					item.append(node("strong", creditTitle(row), "space-location-writing"),
						node("span", changeDetails(row, row.activity)), metadata);
					return item;
				}
				item.dataset.historyRecord = row.recordId;
				const actor = mode === "local" ? "On this device" : row.actorUid === scope.account ? "You" :
					row.actorUid === scope.ownerUid ? "Space owner" : "Space member";
				item.append(node("strong", summary(row)), node("span", dates.format(new Date(row.at)) + " · " + actor),
					button("Open record", () => {
						selected = { ...scopeRef, mode, kind: row.kind, id: row.recordId };
						void refresh();
					}));
				return item;
			}));
		}
		function summary(row) {
			if (row.action === "credited") return creditTitle(row) + " · " + changeDetails(row, row.activity) + " · " + row.actorName;
			return changeDetails(row, labels[row.kind] + " " + row.action);
		}
		function creditTitle(row) {
			return (row.kind === "goal-credit" ? "Goal" : "Habit") + " · " + row.targetName;
		}
		function changeDetails(row, action) {
			const category = scope.categories[row.categoryId]?.label ?? row.categoryId;
			const source = row.app === "maps" ? "Maps" : row.app === "our-stuff" ? "Our Stuff" : row.app;
			return action + (category ? " · " + category : "") + " · " + source;
		}
		searchField.addEventListener("input", filter);
		content.replaceChildren(search, count, rows);
		filter();
	}

	function paintRecord(result, scope, ref) {
		const { record, location, role } = result;
		const name = record.name ?? record.place?.name ?? record.topic ?? labels[ref.kind];
		const actions = node("div", "", "space-location-actions");
		actions.append(button("Return to Space", returnToSpace));
		const href = mode === "local" ? localLink(scope, ref) : result.href;
		if (href) {
			const app = new URL(href).origin;
			actions.append(link(app === "https://maps.ourstuff.space" ? "Open in Maps" :
				app === window.location.origin ? "Open in Our Stuff" : "Open in source app", href));
		}
		const localKind = ["location", "note", "review"].includes(ref.kind);
		if (localKind && writable(role)) actions.append(button("Edit " + labels[ref.kind].toLowerCase(), () => edit({ ...scope, role }, record, location)));
		if (!localKind && (role === "owner" || (role === "editor" && record.authorUid === scope.account))) {
			const mutationId = crypto.randomUUID();
			const remove = button("Remove " + labels[ref.kind].toLowerCase(), async () => {
				if (!window.confirm("Remove this record from the Space?")) return;
				remove.disabled = true;
				try {
					await hosted(scope, tokenFor, "/outing-items/" + encodeURIComponent(record.id), {
						method: "DELETE", body: JSON.stringify({ ownerUid: scope.ownerUid, appId: scope.appId,
							expectedRevision: record.revision, mutationId }),
					});
					returnToSpace();
				} catch (error) { feedback.textContent = error.message; remove.disabled = false; }
			});
			actions.append(remove);
		}
		content.append(node("h3", name), actions);
		if (record.categoryId) content.append(node("p", scope.categories[record.categoryId]?.label ?? record.categoryId));
		if (location) content.append(node("p", location.name));
		if (record.body) content.append(node("p", record.body, "space-location-writing"));
		if (record.lat !== undefined) content.append(node("p", record.lat + ", " + record.lon));
		if (record.route) {
			const stops = node("ol");
			stops.append(...record.route.stops.map(stop => node("li", stop.name)));
			content.append(stops);
		}
		if (result.blob) {
			objectUrl = URL.createObjectURL(result.blob);
			const photo = node("img", "", "space-outing-photo");
			photo.alt = "Photo from " + name;
			photo.src = objectUrl;
			content.append(photo);
		}
	}

	async function refresh() {
		if (!dialog.open) return;
		const request = ++run;
		clear();
		const scope = resolveSpace(scopeRef, mode);
		const opened = selected;
		title.textContent = opened ? labels[opened.kind] : "Space history";
		scopeLabel.textContent = scope ? scope.name + (mode === "local" ? " · On this device" : "") : "";
		feedback.textContent = "Loading…";
		try {
			if (!scope) throw new Error("This Space is unavailable.");
			if (!opened) {
				const entries = mode === "local" ? await listDeviceHistory(scope.id) :
					(await hosted(scope, tokenFor, "/space-history?" + scopeQuery(scope))).entries;
				if (request !== run || !dialog.open || key(scope) !== key(resolveSpace(scopeRef, mode))) return;
				feedback.textContent = "";
				paintList(entries, scope);
				return;
			}
			const search = scopeQuery(scope);
			search.set("kind", opened.kind);
			search.set("record", opened.id);
			search.set("mode", "hosted");
			const result = mode === "local" ? await openDeviceRecord(scope.id, opened.kind, opened.id) :
				await hosted(scope, tokenFor, "/space-record?" + search);
			if (!result) throw new Error("This record is unavailable.");
			if (opened.kind === "photo") result.blob = await hosted(scope, tokenFor,
				"/outing-items/" + encodeURIComponent(opened.id) + "/photo?" + scopeQuery(scope), { binary: true });
			if (request !== run || !dialog.open || key(scope) !== key(resolveSpace(scopeRef, mode))) return;
			feedback.textContent = "";
			paintRecord(result, scope, opened);
		} catch (error) {
			if (request !== run || !dialog.open) return;
			feedback.textContent = error.message;
			content.append(opened ? button("Return to Space", returnToSpace) : button("Retry", () => void refresh()));
		}
	}

	function open(control, ref) {
		if (dialog.open) return;
		const space = currentSpace();
		trigger = control;
		query = "";
		selected = ref?.kind ? ref : undefined;
		mode = ref?.mode ?? (space?.account ? "hosted" : "local");
		scopeRef = ref ?? (mode === "local" ? { spaceId: space?.id } : { ownerUid: space?.ownerUid, appId: space?.appId });
		dialog.showModal();
		title.focus({ preventScroll: true });
		void refresh();
	}

	dialog.addEventListener("close", () => {
		run++;
		clear();
		if (trigger?.getClientRects().length) trigger.focus();
		trigger = undefined;
	});
	window.addEventListener("focus", () => void refresh());
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) { run++; clear(); }
		else void refresh();
	});
	return { open, refresh };
}
