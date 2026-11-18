import { FAMILY_API_URL } from "./config.js";

const categories = ["Mind", "Body", "Spirit", "Life"];
const editable = role => role === "owner" || role === "editor";
const key = space => space && [space.account, space.ownerUid, space.appId, space.id].join("/");

function node(tag, text = "", className = "") {
	const el = document.createElement(tag);
	el.textContent = text;
	el.className = className;
	return el;
}

function button(text, run, className = "secondary-button") {
	const el = node("button", text, className);
	el.type = "button";
	el.addEventListener("click", run);
	return el;
}

function field(label, control) {
	const el = node("label", label);
	el.append(control);
	return el;
}

function option(label, value) {
	const el = node("option", label);
	el.value = value;
	return el;
}

function category(space, id) {
	return space.categories[id]?.label ?? id;
}

function audience(space) {
	if (!space.account) return "On this device";
	return space.shareable ? "Shared with " + space.name + " members" : "Private to you";
}

async function request(space, tokenFor, path, options = {}) {
	const token = await tokenFor(space.account);
	if (!token) throw new Error("Sign in to open Space goals and habits.");
	const headers = new Headers({ authorization: "Bearer " + token });
	const scope = { ownerUid: space.ownerUid, appId: space.appId };
	const query = new URLSearchParams(scope);
	if (options.kind) query.set("kind", options.kind);
	let body;
	if (options.method) {
		body = JSON.stringify({ ...scope, ...options.data });
		headers.set("content-type", "application/json");
	}
	const response = await fetch(FAMILY_API_URL + "/targets" + path + (body ? "" : "?" + query), {
		method: options.method ?? "GET", headers, body, cache: "no-store", redirect: "error",
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw Object.assign(new Error(data.error?.message || "Couldn’t open Space goals and habits."), {
		code: data.error?.code, status: response.status, target: data.target, fields: data.fields,
	});
	return data;
}

export function setupSpaceTargets({ currentSpace, localGoals, openLegacy, tokenFor }) {
	const dialog = node("dialog", "", "space-locations-modal space-targets-modal");
	const title = node("h2");
	title.id = "space-targets-title";
	title.tabIndex = -1;
	dialog.setAttribute("aria-labelledby", title.id);
	const destination = node("p", "", "space-location-destination");
	const permission = node("p");
	const feedback = node("p");
	feedback.setAttribute("role", "status");
	const content = node("div");
	const close = button("Close", () => dialog.close());
	const backToMaps = button("Return to Maps tab", () => {
		window.close();
		if (!window.closed) feedback.textContent = "Switch back to the Maps tab to continue.";
	});
	backToMaps.hidden = true;
	dialog.append(title, destination, permission, feedback, content, close, backToMaps);
	document.body.append(dialog);

	let trigger;
	let mode;
	let selectedHistory;
	let selectedTarget;
	let expectedScope;
	let role;
	let state;
	let sequence = 0;
	let busy = false;
	const pendingChecks = new Map();

	function open(kind, initiating, options = {}) {
		if (dialog.open) return;
		mode = kind;
		trigger = initiating;
		expectedScope = options.scope;
		selectedTarget = options.id;
		title.textContent = kind === "goal" ? "Goals" : "Habit Tracker";
		backToMaps.hidden = !options.fromMaps;
		dialog.showModal();
		title.focus({ preventScroll: true });
		void load();
	}

	function sameRequestedSpace(space) {
		return !expectedScope || (space?.ownerUid === expectedScope.ownerUid && space.appId === expectedScope.appId);
	}

	function updateRole(next) {
		role = next;
		permission.textContent = role === "reader" ? "Read-only access" : "";
	}

	function showFailure(error) {
		feedback.textContent = error instanceof Error ? error.message : "Couldn’t open these records.";
	}

	function returnToList() {
		selectedHistory = selectedTarget = undefined;
		void load();
	}

	function legacyEntries(result) {
		const local = localGoals();
		return [...new Map([...local, ...(result.legacyGoals ?? [])].map(goal => [goal.id, goal])).values()]
			.filter(goal => !result.connectedGoalIds?.includes(goal.id))
			.map(goal => ({ ...goal, local: local.some(item => item.id === goal.id) }));
	}

	async function load() {
		const space = currentSpace();
		state = space;
		const requestId = ++sequence;
		content.replaceChildren();
		updateRole(undefined);
		destination.textContent = space ? space.name + " · " + audience(space) : "";
		feedback.textContent = "";
		if (!space || !sameRequestedSpace(space) || (space.account && !space.ownerUid)) {
			feedback.textContent = expectedScope && space && !space.account
				? "Sign in to open the selected Space." : "This Space is unavailable.";
			return;
		}
		if (!space.account) {
			if (mode === "habit") feedback.textContent = "Sign in to use the Space Habit Tracker.";
			else paintList({ targets: [], legacyGoals: [], role: "owner" }, space);
			return;
		}
		feedback.textContent = "Loading…";
		try {
			const path = selectedHistory ? "/" + encodeURIComponent(selectedHistory) + "/progress" : "";
			const result = await request(space, tokenFor, path, { kind: mode });
			if (!dialog.open || requestId !== sequence || key(space) !== key(currentSpace())) return;
			updateRole(result.role);
			if (selectedHistory) paintHistory(result, space);
			else if (selectedTarget) {
				const record = result.targets.find(row => row.id === selectedTarget);
				selectedTarget = undefined;
				if (record) {
					if (editable(role)) editTarget(space, record);
					else paintList(result, space);
				} else {
					paintList(result, space);
					feedback.textContent = "This target is unavailable.";
				}
			} else paintList(result, space);
		} catch (error) {
			if (!dialog.open || requestId !== sequence || key(space) !== key(currentSpace())) return;
			showFailure(error);
			content.append(button("Retry", load));
			if (selectedHistory) content.append(button(mode === "goal" ? "All goals" : "All habits", returnToList));
		}
	}

	function paintList(result, space) {
		updateRole(result.role);
		const rows = result.targets;
		const legacy = mode === "goal" ? legacyEntries(result) : [];
		feedback.textContent = rows.length || legacy.length ? "" : "No " + mode + "s in this Space yet.";
		const controls = node("div", "", "space-location-actions");
		if (space.account && editable(role)) {
			controls.append(button("Create " + mode, () => editTarget(space), "primary-button"));
		}
		if (mode === "goal" && !space.account) {
			controls.append(button("Add goal", () => { dialog.close(); openLegacy(); }, "primary-button"));
		}
		if (mode === "goal" && legacy.length && space.account && role === "owner") {
			controls.append(button("Find matching Maps goals", () => void matches(space, legacy)));
		}
		content.replaceChildren(controls);
		const list = node("ul", "", "space-location-entries");
		for (const target of rows) {
			const row = node("li");
			row.dataset.targetId = target.id;
			const description = [category(space, target.categoryId)];
			if (target.kind === "habit") description.push(target.frequency);
			if (!target.enabled) description.push("Inactive");
			row.append(node("strong", target.name), node("span", description.join(" · ")));
			const actions = node("div", "", "space-location-actions");
			if (target.kind === "habit" && editable(role) && target.enabled) {
				actions.append(button("Check in", event => void checkIn(space, target, event.currentTarget)));
			}
			actions.append(button("History", () => {
				if (key(space) !== key(currentSpace())) return refresh();
				selectedHistory = target.id;
				void load();
			}));
			if (editable(role)) actions.append(button("Edit " + mode, () => editTarget(space, target)));
			row.append(actions);
			list.append(row);
		}
		content.append(list);
		if (!legacy.length) return;
		content.append(node("h3", "Goal Orbs"));
		const nativeList = node("ul", "", "space-location-entries");
		for (const goal of legacy) {
			const row = node("li");
			row.dataset.nativeGoalId = goal.id;
			row.append(node("strong", goal.name), node("span", category(space, goal.categoryId)));
			const actions = node("div", "", "space-location-actions");
			if (goal.local && editable(role)) actions.append(button("Edit in Goal Orbs", () => {
				dialog.close();
				openLegacy(goal);
			}));
			if (space.account && role === "owner") actions.append(button("Share goal", () => reviewLink(space, goal)));
			row.append(actions);
			nativeList.append(row);
		}
		content.append(nativeList);
	}

	async function matches(space, legacy) {
		const activeRequest = ++sequence;
		feedback.textContent = "Looking for matches…";
		content.replaceChildren(button("Cancel", returnToList));
		try {
			const result = await request(space, tokenFor, "/suggestions", {
				method: "POST", data: { localGoals: legacy.filter(goal => goal.local) },
			});
			if (activeRequest !== sequence || !dialog.open) return;
			feedback.textContent = result.suggestions.length ? "" : "No matching private Maps goals.";
			const list = node("ul", "", "space-location-entries");
			for (const match of result.suggestions) {
				const row = node("li");
				row.append(node("strong", match.native.name), node("span", "Maps · " + match.maps.name),
					button("Review match", () => reviewLink(space, match.native, match.maps)));
				list.append(row);
			}
			content.append(list);
		} catch (error) { if (activeRequest === sequence) showFailure(error); }
	}

	function reviewLink(space, native, maps) {
		feedback.textContent = "";
		const prompt = node("h3", maps ? "Link these goals?" : "Share this goal?");
		const source = node("p", "Goal Orbs · " + native.name);
		const actions = node("div", "", "space-location-actions");
		const cancel = button("Cancel", returnToList);
		const confirm = button(maps ? "Link both goals" : "Confirm sharing", async () => {
			if (key(space) !== key(currentSpace())) return refresh();
			busy = true;
			confirm.disabled = cancel.disabled = close.disabled = true;
			try {
				await request(space, tokenFor, "/link", { method: "POST", data: {
					nativeId: native.id, mapsId: maps?.id, localGoal: localGoals().find(goal => goal.id === native.id), confirmed: true,
				} });
				returnToList();
			} catch (error) { showFailure(error); }
			finally {
				busy = false;
				confirm.disabled = cancel.disabled = close.disabled = false;
			}
		}, "primary-button");
		actions.append(confirm, cancel);
		content.replaceChildren(prompt, source);
		if (maps) content.append(node("p", "Private Maps goals · " + maps.name));
		content.append(node("p", "The linked goal keeps its Our Stuff ID and becomes available through Goals in both apps."), actions);
		confirm.focus();
	}

	function editTarget(space, original) {
		const id = original?.id ?? mode + "-" + crypto.randomUUID();
		const capture = ++sequence;
		const form = node("form", "", "space-location-editor");
		const name = node("input");
		name.required = true;
		name.maxLength = 120;
		name.value = original?.name ?? "";
		const type = node("select");
		type.required = true;
		type.append(option("Choose a type", ""), ...categories.map(item => option(category(space, item), item)));
		type.value = original?.categoryId ?? "";
		const enabled = node("input");
		enabled.type = "checkbox";
		enabled.checked = original?.enabled ?? true;
		const frequency = node("select");
		frequency.append(option("Daily", "daily"), option("Weekly", "weekly"));
		const conflicts = node("div");
		const save = node("button", "Save " + mode, "primary-button");
		save.type = "submit";
		const actions = node("div", "", "space-location-actions");
		const cancel = button("Cancel", returnToList);
		actions.append(save, cancel);
		const isHabit = mode === "habit";
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (original && role === "owner") actions.append(button("Delete " + mode, () => removeTarget(space, original)));
		form.append(field("Name", name), field("Type", type), field("Active", enabled));
		if (isHabit && !original) form.append(field("Frequency", frequency), node("p", "Time zone · " + timeZone));
		if (isHabit && original) form.append(node("p", original.frequency + " · " + original.timeZone));
		form.append(conflicts, actions);
		content.replaceChildren(form);
		feedback.textContent = "";
		name.focus();
		let previous;
		let conflict;

		form.addEventListener("submit", async event => {
			event.preventDefault();
			if (busy || !editable(role) || key(space) !== key(currentSpace())) return;
			const values = { name: name.value.trim(), categoryId: type.value, enabled: enabled.checked };
			const changes = Object.fromEntries(Object.entries(values).filter(([fieldName, value]) => value !== original?.[fieldName]));
			for (const select of conflicts.querySelectorAll("select")) {
				if (select.value === "latest") delete changes[select.name];
			}
			const revision = conflict?.target.revision ?? original?.revision;
			const fingerprint = JSON.stringify([revision, changes]);
			if (previous?.fingerprint !== fingerprint) previous = { fingerprint, id: crypto.randomUUID() };
			const data = original ? { revision, changes, mutationId: previous.id } : { id, kind: mode, ...values,
				...(isHabit ? { frequency: frequency.value, timeZone } : {}) };
			busy = true;
			save.disabled = close.disabled = cancel.disabled = true;
			feedback.textContent = "Saving…";
			try {
				await request(space, tokenFor, original ? "/" + encodeURIComponent(id) : "", {
					method: original ? "PATCH" : "POST", data,
				});
				if (dialog.open && capture === sequence) returnToList();
			} catch (error) {
				if (capture !== sequence) return;
				showFailure(error);
				if ([401, 403, 404].includes(error.status)) {
					if (error.status === 403) updateRole("reader");
					else content.replaceChildren(button("Back", returnToList));
				}
				if (error.target?.id === id && error.code === "target_conflict") {
					conflict = error;
					conflicts.replaceChildren(...error.fields.map(key => {
						const choice = node("select");
						choice.name = key;
						choice.required = true;
						const label = key === "categoryId" ? "Type" : key === "enabled" ? "Active" : "Name";
						const current = key === "categoryId" ? category(space, error.target[key]) : String(error.target[key]);
						choice.append(option("Choose a version", ""), option("Use current · " + current, "latest"), option("Keep my edit", "mine"));
						return field(label + " conflict", choice);
					}));
				}
			} finally {
				busy = false;
				save.disabled = !editable(role);
				close.disabled = cancel.disabled = false;
			}
		});
	}

	function removeTarget(space, target) {
		const actions = node("div", "", "space-location-actions");
		const label = target.kind === "goal" ? "Delete from both views" : "Delete habit";
		const heading = node("h3", "Delete " + target.name + "?");
		const detail = node("p", "This removes the " + target.kind + " from this Space in Maps and Our Stuff.");
		const cancel = button("Cancel", () => editTarget(space, target));
		const confirm = button(label, async () => {
			if (key(space) !== key(currentSpace())) return refresh();
			busy = true;
			confirm.disabled = cancel.disabled = close.disabled = true;
			try {
				await request(space, tokenFor, "/" + encodeURIComponent(target.id), {
					method: "DELETE", data: { confirmed: true, revision: target.revision },
				});
				returnToList();
			} catch (error) {
				showFailure(error);
				if (error.target) {
					const review = button("Review latest", () => editTarget(space, error.target));
					confirm.replaceWith(review);
					review.focus();
				}
			} finally {
				busy = false;
				confirm.disabled = cancel.disabled = close.disabled = false;
			}
		}, "danger-button");
		actions.append(confirm, cancel);
		content.replaceChildren(heading, detail, actions);
		confirm.focus();
	}

	async function checkIn(space, target, control) {
		if (control.disabled) return;
		if (key(space) !== key(currentSpace())) return refresh();
		const capture = sequence;
		const id = target.id;
		const scopeKey = key(space) + "/" + id;
		const requestId = pendingChecks.get(scopeKey) ?? crypto.randomUUID();
		pendingChecks.set(scopeKey, requestId);
		control.disabled = true;
		try {
			const { event } = await request(space, tokenFor, "/" + encodeURIComponent(id) + "/check-ins", {
				method: "POST", data: { requestId },
			});
			pendingChecks.delete(scopeKey);
			if (capture === sequence) feedback.textContent = "Checked in for " + event.period + ".";
		} catch (error) {
			if (capture !== sequence) return;
			if ([401, 403, 404].includes(error.status)) await load();
			else showFailure(error);
		} finally { control.disabled = false; }
	}

	function paintHistory(result, space) {
		const list = node("ul", "", "space-location-entries");
		const dates = new Intl.DateTimeFormat(undefined, {
			timeZone: result.target.timeZone, dateStyle: "medium", timeStyle: "short",
		});
		// A stop that satisfies a habit period already appears as a progress event.
		const entries = [...result.progress, ...result.checks.filter(check => !check.creditId)]
			.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
		for (const entry of entries) {
			const row = node("li");
			const time = node("time", dates.format(new Date(entry.occurredAt)));
			time.dateTime = entry.occurredAt;
			if (entry.action === "credited") {
				const source = entry.app === "maps" ? "Maps" : entry.app === "our-stuff" ? "Our Stuff" : entry.app;
				const metadata = node("span");
				metadata.append(time, " · " + source);
				row.append(node("strong", entry.activity), node("span", entry.actorName, "space-location-writing"), metadata);
			} else row.append(node("strong", entry.actorName), node("span", "Checked in"), time);
			list.append(row);
		}
		feedback.textContent = entries.length ? "" : mode === "goal" ? "No completed stops yet." : "No check-ins yet.";
		const actions = node("div", "", "space-location-actions");
		actions.append(button(mode === "goal" ? "All goals" : "All habits", returnToList));
		content.replaceChildren(node("h3", result.target.name, "space-location-writing"),
			node("p", category(space, result.target.categoryId)), actions, list);
	}

	function refresh() {
		if (!dialog.open) return;
		const current = currentSpace();
		if (key(current) !== key(state)) {
			selectedHistory = selectedTarget = undefined;
			void load();
		} else if (!content.querySelector("form")) void load();
	}

	dialog.addEventListener("cancel", event => { if (busy) event.preventDefault(); });
	dialog.addEventListener("close", () => {
		sequence++;
		content.replaceChildren();
		selectedHistory = selectedTarget = expectedScope = undefined;
		if (trigger?.getClientRects().length) trigger.focus();
		else document.querySelector(".mobile-menu-toggle")?.focus();
	});
	async function openExistingGoal(id, control, fallback) {
		const space = currentSpace();
		if (!space?.account || !space.ownerUid) return fallback();
		control.disabled = true;
		try {
			const result = await request(space, tokenFor, "", { kind: "goal" });
			if (key(space) !== key(currentSpace())) return;
			if (result.connectedGoalIds?.includes(id)) open("goal", control, { id });
			else if (editable(result.role)) fallback();
			else open("goal", control);
		} catch {
			if (key(space) === key(currentSpace())) open("goal", control);
		} finally { control.disabled = false; }
	}

	window.addEventListener("focus", refresh);
	return { open, refresh, openExistingGoal };
}
