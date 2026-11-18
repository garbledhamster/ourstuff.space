import { FAMILY_API_URL } from "./config.js";

const categories = ["Mind", "Body", "Spirit", "Life"];
const localDay = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const stamp = value => localDay.format(new Date(value));
const scopeKey = space => space && [space.account, space.ownerUid, space.appId].join("/");

function element(tag, text = "", className = "") {
	const node = document.createElement(tag);
	node.textContent = text;
	node.className = className;
	return node;
}

function button(text, run, className = "secondary-button") {
	const control = element("button", text, className);
	control.type = "button";
	control.addEventListener("click", run);
	return control;
}

async function fetchItem(space, tokenFor, path, binary = false) {
	const token = await tokenFor(space.account);
	if (!token) throw new Error("Sign in to open saved outings.");
	const query = new URLSearchParams({ ownerUid: space.ownerUid, appId: space.appId });
	const result = await fetch(FAMILY_API_URL + "/outing-items" + path + "?" + query, {
		headers: { authorization: "Bearer " + token }, cache: "no-store", redirect: "error",
	});
	if (!result.ok) {
		const error = await result.json().catch(() => ({}));
		throw new Error(error?.error?.message ?? "Couldn’t open this outing.");
	}
	return binary ? result.blob() : result.json();
}

export function setupSpaceOutings({ currentSpace, tokenFor }) {
	const dialog = element("dialog", "", "space-locations-modal space-outings-modal");
	const title = element("h2", "Saved outings");
	title.id = "space-outings-title";
	title.tabIndex = -1;
	dialog.setAttribute("aria-labelledby", title.id);
	const destination = element("p", "", "space-location-destination");
	const status = element("p");
	status.setAttribute("role", "status");
	const contents = element("div");
	dialog.append(title, destination, status, contents, button("Close", () => dialog.close()));
	document.body.append(dialog);

	let active;
	let selected;
	let category;
	let objectUrl;
	let trigger;
	let sequence = 0;

	function clear() {
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		objectUrl = undefined;
		contents.replaceChildren();
	}
	function back() {
		selected = undefined;
		void load(true);
	}
	function render(items, space) {
		const matching = category ? items.filter(item => item.categoryId === category) : items;
		const newest = [...matching].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
		status.textContent = newest.length ? "" : "No outing records saved here yet.";
		for (const kind of [...categories, "Visits", "Routes"]) {
			const rows = newest.filter(item =>
				(item.categoryId ?? (item.kind === "route" ? "Routes" : "Visits")) === kind);
			if (!rows.length) continue;
			const section = element("section");
			const name = element("h3", space.categories[kind]?.label ?? kind);
			if (space.categories[kind]?.icon) name.prepend(space.categories[kind].icon);
			section.append(name);
			const list = element("ul", "", "space-location-entries");
			for (const item of rows) {
				const row = element("li");
				row.dataset.outingItem = item.id;
				const place = item.place?.name ?? item.topic + " outing";
				const label = item.kind === "route" ? "Open route" : "Open " + item.kind;
				row.append(element("strong", place), element("span", stamp(item.recordedAt) + " · " + item.authorName));
				if (item.body) row.append(element("p", item.body, "space-location-preview"));
				row.append(button(label, () => {
					selected = item;
					void load(true);
				}));
				list.append(row);
			}
			section.append(list);
			contents.append(section);
		}
	}

	function renderItem(saved, space) {
		const item = saved.item;
		contents.append(button("Back", back), element("h3", item.place?.name ?? item.topic + " outing"),
			element("p", stamp(item.recordedAt) + " · " + item.authorName));
		if (item.categoryId) contents.append(element("p", space.categories[item.categoryId]?.label ?? item.categoryId));
		if (item.body) contents.append(element("p", item.body, "space-location-writing"));
		if (saved.blob) {
			objectUrl = URL.createObjectURL(saved.blob);
			const photo = element("img", "", "space-outing-photo");
			photo.alt = "Photo from " + item.place.name;
			photo.src = objectUrl;
			contents.append(photo);
		}
		if (item.route) {
			const ordered = element("ol");
			for (const stop of item.route.stops) ordered.append(element("li", stop.name));
			contents.append(ordered);
			const link = element("a", "Open in Maps", "secondary-button");
			const url = new URL("https://maps.ourstuff.space/");
			url.search = new URLSearchParams({ view: "outing-route", record: item.id, spaceOwner: space.ownerUid, spaceApp: space.appId });
			link.href = url.href;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			contents.append(link);
		}
	}

	async function load(moveFocus = false) {
		const space = currentSpace();
		active = scopeKey(space);
		const check = selected;
		const current = ++sequence;
		clear();
		destination.textContent = space ? space.name + " · " +
			(space.shareable ? "Shared with " + space.name + " members" : "Private to you") : "";
		if (!space?.account) {
			status.textContent = "Sign in to open outings saved from Maps.";
			return;
		}
		if (!space.ownerUid) {
			status.textContent = "This Space is unavailable.";
			return;
		}
		status.textContent = "Loading outings…";
		try {
			const path = check ? "/" + encodeURIComponent(check.id) : "";
			const result = await fetchItem(space, tokenFor, path);
			const blob = check?.kind === "photo" ? await fetchItem(space, tokenFor, path + "/photo", true) : undefined;
			if (!dialog.open || sequence !== current || active !== scopeKey(currentSpace())) return;
			status.textContent = "";
			if (check) renderItem({ ...result, blob }, space);
			else render(result.items, space);
			if (moveFocus) title.focus({ preventScroll: true });
		} catch (error) {
			if (!dialog.open || sequence !== current) return;
			status.textContent = error instanceof Error ? error.message : "Couldn’t open saved outings.";
			if (selected) contents.append(button("Back", back));
			contents.append(button("Retry", () => void load(true)));
		}
	}

	function refresh() {
		if (!dialog.open) return;
		if (active !== scopeKey(currentSpace())) selected = undefined;
		void load();
	}

	dialog.addEventListener("close", () => {
		sequence++;
		clear();
		selected = category = undefined;
		if (trigger?.getClientRects().length) trigger.focus();
		else document.querySelector(".mobile-menu-toggle")?.focus();
		trigger = undefined;
	});
	window.addEventListener("focus", refresh);
	return {
		open(control, selectedCategory) {
			if (dialog.open) return;
			trigger = control;
			category = selectedCategory;
			dialog.showModal();
			title.focus({ preventScroll: true });
			void load();
		},
		refresh,
	};
}
