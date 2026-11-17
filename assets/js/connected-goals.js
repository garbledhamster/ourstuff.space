import { escapeHtml } from "./markdown.js";

const origin = "https://maps.ourstuff.space";
const fields = ["name", "category"];
const edits = (values, base) => Object.fromEntries(
	fields.filter((field) => values[field] !== base[field]).map((field) => [field, values[field]]),
);
const empty = () => ({ status: "loading", goals: [], aliases: new Set(), role: "", message: "" });

export function createConnectedGoals({ getIdToken, onChange }) {
	let scope;
	let visible = false;
	let session;
	let current = empty();
	let form;
	let matches;
	let loading = false;
	let busy = false;

	async function request(selected, route, method = "GET", body) {
		const { controller, uid, ownerUid, appId } = selected;
		const signal = controller.signal;
		const token = await getIdToken({ optional: true, expectedUid: uid });
		signal.throwIfAborted();
		if (!token) throw new Error("Sign in again to open shared goals.");
		const url = `${origin}/api/connected/${encodeURIComponent(ownerUid)}/${encodeURIComponent(appId)}/${route}`;
		const response = await fetch(url, {
			method, credentials: "omit", cache: "no-store", signal,
			headers: { Authorization: `Bearer ${token}`, ...(body && { "Content-Type": "application/json" }) },
			...(body && { body: JSON.stringify(body) }),
		});
		const data = await response.json().catch(() => null);
		if (!response.ok || !data) {
			throw Object.assign(new Error(data?.message || "Couldn’t reach shared goals. Try again."), { data, status: response.status });
		}
		return data;
	}

	async function refresh() {
		if (!session || loading || busy) return;
		const selected = session;
		loading = true;
		current.message = "";
		try {
			const { goals, linkedOurStuffIds, space } = await request(selected, "goals");
			if (selected !== session) return;
			if (!Array.isArray(goals) || !Array.isArray(linkedOurStuffIds)) throw new Error();
			current = { status: "ready", goals, aliases: new Set(linkedOurStuffIds), role: space?.role, message: "" };
		} catch {
			if (selected !== session) return;
			current.status = "error";
			current.goals = [];
			current.message = "Couldn’t load shared goals. Try again.";
		} finally {
			if (selected === session) {
				loading = false;
				onChange();
			}
		}
	}

	function sync(nextScope, shown) {
		const key = nextScope ? JSON.stringify(nextScope) : "";
		const accountChanged = key !== scope;
		const opening = shown && !visible;
		if (!shown && visible) {
			form = undefined;
			matches = undefined;
		}
		visible = shown;
		if (accountChanged) {
			session?.controller.abort();
			scope = key;
			session = nextScope ? { ...nextScope, controller: new AbortController() } : undefined;
			current = empty();
			form = undefined;
			matches = undefined;
			loading = false;
			busy = false;
		}
		if (session && (accountChanged || opening)) void refresh();
		return accountChanged;
	}

	function replaceGoal(goal) {
		const found = current.goals.some(({ id }) => id === goal.id);
		current.goals = found ? current.goals.map((row) => row.id === goal.id ? goal : row) : [...current.goals, goal];
	}

	async function run(operation, onError) {
		if (!session || busy || loading) return;
		const selected = session;
		busy = true;
		current.message = "";
		onChange();
		try {
			await operation(selected);
		} catch (error) {
			if (selected === session) {
				current.message = error.message || "Couldn’t save this change. Try again.";
				if (error.status === 401 || error.data?.code === "SPACE_MISSING" || error.data?.code === "SPACE_READ_ONLY") {
					current.status = "error";
					current.goals = [];
					form = undefined;
				} else {
					onError?.(error.data);
				}
			}
		} finally {
			if (selected === session) {
				busy = false;
				onChange();
			}
		}
	}

	function openForm(goal) {
		form = goal
			? { base: goal, values: { name: goal.name, category: goal.category } }
			: { values: { name: "", category: "Mind" }, requestId: crypto.randomUUID() };
		current.message = "";
		onChange();
	}

	function resolveConflict(conflict, changes, draft) {
		if (!conflict?.goal) return;
		const { goal } = conflict;
		replaceGoal(goal);
		if (form !== draft) return;
		form = {
			base: goal, values: { name: goal.name, category: goal.category, ...changes },
			conflicts: (conflict.fields || []).filter((entry) => fields.includes(entry.field)),
			choices: {},
		};
	}

	function save() {
		const draft = form;
		const { base, values, requestId, conflicts, choices } = draft;
		const changes = base ? edits({ ...values, name: values.name.trim() }, base) : { ...values, name: values.name.trim() };
		for (const conflict of conflicts || []) {
			if (choices[conflict.field] === "current") delete changes[conflict.field];
		}
		void run(async (selected) => {
			const target = base ? `goals/${encodeURIComponent(base.id)}` : "goals";
			const method = base ? "PATCH" : "POST";
			const body = base ? { revision: base.revision, changes } : { ...changes, requestId };
			const { goal } = await request(selected, target, method, body);
			if (selected !== session) return;
			replaceGoal(goal);
			if (form === draft) form = undefined;
			current.message = "Goal saved.";
		}, (data) => resolveConflict(data, changes, draft));
	}

	function remove() {
		const draft = form;
		const goal = draft.base;
		void run(async (selected) => {
			await request(selected, `goals/${encodeURIComponent(goal.id)}`, "DELETE", { revision: goal.revision, confirmed: true });
			if (selected !== session) return;
			current.goals = current.goals.filter(({ id }) => id !== goal.id);
			if (form === draft) form = undefined;
			current.message = "Goal removed from both apps.";
		}, (data) => {
			if (!data?.goal) return;
			replaceGoal(data.goal);
			if (form === draft) {
				form = { base: data.goal, values: data.goal, confirming: false };
			}
		});
	}

	function findMatches() {
		void run(async (selected) => {
			const data = await request(selected, "suggestions");
			if (selected === session) matches = data.suggestions;
		});
	}

	function link(index) {
		const pair = matches?.[index];
		if (!pair) return;
		void run(async (selected) => {
			const { goal } = await request(selected, "links", "POST", {
				mapsId: pair.maps.id, ourStuffId: pair.ourStuff.id, confirmed: true,
			});
			if (selected !== session) return;
			replaceGoal(goal);
			current.aliases.add(pair.ourStuff.id);
			matches = matches?.filter((item) => item.maps.id !== pair.maps.id && item.ourStuff.id !== pair.ourStuff.id);
			current.message = "Goals linked.";
		});
	}

	function bind(root) {
		const panel = root.querySelector("[data-connected-goals]");
		if (!panel) return;
		for (const control of panel.querySelectorAll("[data-goal-control]")) {
			control.addEventListener("click", () => {
				const action = control.dataset.goalControl;
				if (action === "refresh") {
					void refresh();
					onChange();
				} else if (action === "edit") {
					openForm(current.goals.find(({ id }) => id === control.value));
					root.querySelector("#connected-goal-name")?.focus();
				} else if (action === "add") {
					openForm();
					root.querySelector("#connected-goal-name")?.focus();
				} else if (action === "cancel") {
					const id = form?.base?.id;
					form = undefined;
					current.message = "";
					onChange();
					[...root.querySelectorAll('[data-goal-control="edit"]')].find((button) => button.value === id)?.focus();
				} else if (action === "confirm-delete") {
					form.confirming = true;
					onChange();
					root.querySelector('[data-goal-control="keep"]')?.focus();
				} else if (action === "keep") {
					form.confirming = false;
					onChange();
					root.querySelector('[data-goal-control="confirm-delete"]')?.focus();
				} else if (action === "delete") {
					remove();
				} else if (action === "matches") {
					findMatches();
				} else if (action === "link") {
					link(Number(control.value));
				}
			});
		}
		const editor = panel.querySelector("form");
		editor?.addEventListener("input", (event) => {
			const field = event.target.name;
			if (fields.includes(field)) form.values[field] = event.target.value;
			else if (field.startsWith("choice-")) form.choices[field.slice(7)] = event.target.value;
		});
		editor?.addEventListener("submit", (event) => {
			event.preventDefault();
			save();
		});
	}

	return {
		sync, bind,
		refreshVisible() { if (visible && !form) void refresh(); },
		hasAlias(id) { return current.aliases.has(id); },
		html(categories) {
			return session ? goalsHtml({ current, categories, form, matches, pending: busy || loading }) : "";
		},
	};
}

function goalsHtml({ current, categories, form, matches, pending }) {
	const { status, goals, message, role } = current;
	const writable = status === "ready" && (role === "owner" || role === "editor");
	const disable = pending ? " disabled" : "";
	const categoryName = (id) => categories.find((option) => option.id === id)?.label ?? id;
	const rows = goals.map(({ id, name, category }) => `
		<li>${writable
			? `<button class="secondary-button connected-goal-name" type="button" data-goal-control="edit" value="${escapeHtml(id)}" aria-label="Edit ${escapeHtml(name)}"${disable}>${escapeHtml(name)}</button>`
			: `<strong>${escapeHtml(name)}</strong>`}
			<span>${escapeHtml(categoryName(category))}</span>
		</li>`).join("");
	const review = matches?.length ? `<ul class="connected-goal-list">${matches.map((pair, index) => `
		<li>
			<div>
				<div>${escapeHtml(`Maps · ${pair.maps.name} · ${categoryName(pair.maps.category)}`)}</div>
				<div>${escapeHtml(`Our Stuff · ${pair.ourStuff.name} · ${categoryName(pair.ourStuff.category)}`)}</div>
			</div>
			<button class="secondary-button" type="button" data-goal-control="link" value="${index}"${disable}>Link this pair</button>
		</li>`).join("")}</ul>` : matches ? "<p>No matching goals found.</p>" : "";
	return `
		<section class="thoughts-settings-section connected-goals" data-connected-goals aria-busy="${pending}">
			<h3>Shared goals</h3>
			${status === "loading" ? '<p role="status">Loading shared goals…</p>' : ""}
			${message ? `<p role="status">${escapeHtml(message)}</p>` : ""}
			${rows ? `<ul class="connected-goal-list">${rows}</ul>` : status === "ready" ? "<p>No shared goals yet.</p>" : ""}
			${writable && form ? editorHtml(form, categories, categoryName, disable) : ""}
			${writable ? review : ""}
			${status !== "loading" ? `<div class="action-row">
				${writable && !form ? `<button class="primary-button" type="button" data-goal-control="add"${disable}>Add shared goal</button>` : ""}
				${writable && !form ? `<button class="secondary-button" type="button" data-goal-control="matches"${disable}>Find matching goals</button>` : ""}
				<button class="secondary-button" type="button" data-goal-control="refresh"${disable}>${status === "error" ? "Retry shared goals" : "Refresh shared goals"}</button>
			</div>` : ""}
		</section>`;
}

function editorHtml(form, categories, categoryName, disable) {
	if (form.confirming) return `
		<div class="connected-goal-editor">
			<p>Remove “${escapeHtml(form.base.name)}” from Maps and Our Stuff?</p>
			<div class="action-row">
				<button class="secondary-button" type="button" data-goal-control="keep"${disable}>Cancel</button>
				<button class="danger-button" type="button" data-goal-control="delete"${disable}>Remove from both apps</button>
			</div>
		</div>`;

	const { base, values, choices, conflicts } = form;
	const input = (field, label, control) => {
		const conflict = conflicts?.find((entry) => entry.field === field);
		if (!conflict) return `<label><span>${label}</span>${control}</label>`;
		const display = field === "category" ? categoryName : (value) => value;
		return `<fieldset class="connected-goal-conflict">
			<legend>${label}</legend>
			<label><input type="radio" name="choice-${field}" value="yours" required${choices[field] === "yours" ? " checked" : ""}${disable}>
				<span>Your change · ${escapeHtml(display(conflict.yours))}</span></label>
			<label><input type="radio" name="choice-${field}" value="current" required${choices[field] === "current" ? " checked" : ""}${disable}>
				<span>Current value · ${escapeHtml(display(conflict.current))}</span></label>
		</fieldset>`;
	};
	const categoryOptions = categories.map(({ id, label }) =>
		`<option value="${escapeHtml(id)}"${values.category === id ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
	return `<form class="connected-goal-editor">
		${input("name", "Goal name", `<input id="connected-goal-name" name="name" maxlength="120" value="${escapeHtml(values.name)}" required${disable}>`)}
		${input("category", "Category", `<select id="connected-goal-category" name="category"${disable}>${categoryOptions}</select>`)}
		<div class="action-row">
			<button class="primary-button" type="submit"${disable}>Save goal</button>
			<button class="secondary-button" type="button" data-goal-control="cancel"${disable}>Cancel</button>
			${base ? `<button class="danger-button" type="button" data-goal-control="confirm-delete"${disable}>Delete goal</button>` : ""}
		</div>
	</form>`;
}
