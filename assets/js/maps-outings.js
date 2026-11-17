import { escapeHtml } from "./markdown.js";

const origin = "https://maps.ourstuff.space";
const pathFor = ({ ownerUid, appId }) => "/api/connected/" +
	encodeURIComponent(ownerUid) + "/" + encodeURIComponent(appId);

export function createMapsOutings({ getIdToken, onChange }) {
	let scope;
	let view;
	let load;
	let data;
	let message = "";
	let photos = new Map();

	async function request(path, init = {}, selected = scope, binary = false) {
		if (!selected?.uid) throw new Error("Sign in with Google.");
		const token = await getIdToken({ optional: true, expectedUid: selected.uid });
		if (!token) throw new Error("Sign in with Google.");
		if (scope?.uid !== selected.uid) throw new Error("Your account changed.");
		const response = await fetch(origin + path, {
			...init,
			cache: "no-store",
			headers: { Authorization: "Bearer " + token, ...(init.body ? { "Content-Type": "application/json" } : {}) },
		});
		if (scope?.uid !== selected.uid) throw new Error("Your account changed.");
		if (binary && response.ok) return response.blob();
		const reply = await response.json();
		if (!response.ok) throw new Error(reply.message || "Try again.");
		return reply;
	}

	function releasePhotos() {
		for (const url of photos.values()) URL.revokeObjectURL(url);
		photos.clear();
	}

	function reload() {
		const selected = scope;
		const displayed = view;
		load?.abort();
		load = undefined;
		data = undefined;
		message = "";
		releasePhotos();
		if (!selected?.appId || !displayed) return;
		const controller = new AbortController();
		load = controller;
		const section = displayed === "habits" ? "habits" : displayed === "goals" ? "visit-credit" : "visits";
		void request(pathFor(selected) + "/" + section, { signal: controller.signal }, selected).then((result) => {
			if (load !== controller) return;
			data = result;
			onChange();
		}).catch((error) => {
			if (load !== controller) return;
			message = error.message;
			onChange();
		});
	}

	function sync(next, nextView) {
		const key = (item) => item ? [item.uid, item.ownerUid, item.appId, item.role].join("/") : "";
		if (key(next) === key(scope) && nextView === view) return;
		scope = next;
		view = nextView;
		reload();
	}

	function localDay() {
		const today = new Date();
		return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"),
			String(today.getDate()).padStart(2, "0")].join("-");
	}

	async function action(kind, id, form) {
		const selected = scope;
		const displayed = view;
		if (!selected?.appId) return;
		try {
			const target = pathFor(selected);
			if (kind === "retry") { reload(); onChange(); return; }
			if (kind === "photo") {
				if (photos.has(id)) return;
				const image = await request(target + "/visits/" + encodeURIComponent(id), {}, selected, true);
				if (scope !== selected || view !== displayed) return;
				photos.set(id, URL.createObjectURL(image));
				onChange();
				return;
			}
			if (kind === "create") {
				const fields = new FormData(form);
				await request(target + "/habits", {
					method: "POST",
					body: JSON.stringify({ name: fields.get("name"), cadence: fields.get("cadence") }),
				}, selected);
			}
			if (kind === "check-in") await request(target + "/habits/" + encodeURIComponent(id), {
				method: "POST", body: JSON.stringify({ day: localDay() }),
			}, selected);
			if (scope === selected && view === displayed) {
				reload();
				onChange();
			}
		} catch (error) {
			if (scope !== selected || view !== displayed) return;
			message = error.message;
			onChange();
		}
	}

	function statusHtml() {
		return message ? `<p role="status">${escapeHtml(message)}</p>
			<button class="secondary-button" data-action="maps-outings-retry" type="button">Retry</button>` : "";
	}

	function habitsHtml() {
		if (!scope) return '<p>Sign in with Google to open Habit Tracker.</p>';
		if (!scope.appId) return '<p>Choose an unlocked Space to open Habit Tracker.</p>';
		const create = scope.role !== "reader" ? `<form id="maps-habit-form" class="body-actions">
			<label>Habit <input name="name" maxlength="120" required></label>
			<label>Schedule <select name="cadence"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
			<button class="primary-button" type="submit">Add habit</button>
		</form>` : "";
		if (!data) return statusHtml() || '<p role="status">Loading habits…</p>';
		const rows = data.habits.map((habit) => {
			const history = data.checkIns.filter(entry => entry.habitId === habit.id);
			const day = localDay();
			const week = new Date(day);
			week.setUTCDate(week.getUTCDate() - (week.getUTCDay() + 6) % 7);
			const key = habit.cadence === "weekly" ? week.toISOString().slice(0, 10) : day;
			const complete = history.some(entry => entry.actorUid === data.viewerUid && entry.period === key);
			return `<li><h3>${escapeHtml(habit.name)}</h3>
				<p>${habit.cadence === "weekly" ? "Weekly" : "Daily"}</p>
				<button class="secondary-button" data-action="maps-habit-check-in"
					data-id="${escapeHtml(habit.id)}" type="button"${complete ? " disabled" : ""}>${complete ? "Checked in" : "Check in"}</button>
				<details><summary>History (${history.length})</summary><ul>
					${history.map(entry => `<li>${escapeHtml(entry.actorUid === data.viewerUid ? "You" : entry.actorName)} ·
						<time datetime="${escapeHtml(entry.day)}">${escapeHtml(entry.day)}</time></li>`).join("")}
				</ul></details>
			</li>`;
		}).join("");
		return create + statusHtml() + (rows ? `<ul class="maps-habit-list">${rows}</ul>` : '<p>No habits in this Space yet.</p>');
	}

	function visitsHtml(category) {
		if (!scope) return "";
		const records = data?.records?.filter(record => record.category === category) ?? [];
		if (!records.length && !message) return "";
		return `<section class="maps-outing-records">
			<h2>Outing notes</h2>${statusHtml()}<ul>${records.map(record => {
				const photo = photos.get(record.id);
				return `<li><strong>${escapeHtml(record.place)}</strong>
					<time datetime="${escapeHtml(record.visitedAt)}">${escapeHtml(new Date(record.visitedAt).toLocaleDateString())}</time>
					${record.note ? `<p>${escapeHtml(record.note)}</p>` : ""}
					${photo ? `<img src="${escapeHtml(photo)}" alt="Photo from ${escapeHtml(record.place)}">` :
						record.hasPhoto ? `<button class="secondary-button" type="button" data-action="maps-outings-photo"
							data-id="${escapeHtml(record.id)}">Show photo</button>` : ""}
				</li>`;
			}).join("")}</ul>
		</section>`;
	}

	function creditHtml() {
		const events = data?.events?.filter(event => event.targetType === "goal") ?? [];
		return events.length ? `<section class="maps-outing-records">
			<h3>Outing activity</h3><ul>${events.map(event => `<li><strong>${escapeHtml(event.targetName)}</strong> ·
				${escapeHtml(event.activity)} · <time datetime="${escapeHtml(event.occurredAt)}">${escapeHtml(new Date(event.occurredAt).toLocaleDateString())}</time> ·
				${escapeHtml(event.source)}</li>`).join("")}</ul>
		</section>` : "";
	}

	return {
		sync, action, habitsHtml, visitsHtml, creditHtml, refresh: reload,
		active: () => request("/api/connected/active-space"),
		select: (space) => request("/api/connected/active-space", { method: "PUT", body: JSON.stringify(space) }),
	};
}
