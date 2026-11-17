import { escapeHtml } from "./markdown.js";

const MAPS_ORIGIN = "https://maps.ourstuff.space";

export function mapsUrl({ view, theme } = {}) {
	const url = new URL("/", MAPS_ORIGIN);
	if (view) url.searchParams.set("view", view);
	if (theme && theme !== "default") url.searchParams.set("theme", theme);
	return url.href;
}
const VIEWS = new Map([
	["Places", { path: "places", collection: "lists" }],
	["Interests & goals", { path: "interests", collection: "entries" }],
]);

export function createMapsProfile({ getIdToken, onChange }) {
	let view;
	let owner;
	let checking;
	let request;
	let current = { status: "loading", rows: [] };

	async function load() {
		const next = new AbortController();
		const { signal } = next;
		const selected = VIEWS.get(view);
		request?.abort();
		request = next;
		current = { status: "loading", rows: [] };

		try {
			const token = await getIdToken({ optional: true, expectedUid: owner });
			if (signal.aborted) return;
			if (!token) {
				current = { status: "sign-in-again", rows: [] };
				return;
			}
			const response = await fetch(`${MAPS_ORIGIN}/api/profile/${selected.path}`, {
				headers: { Authorization: `Bearer ${token}` },
				cache: "no-store",
				credentials: "omit",
				signal,
			});
			if (signal.aborted) return;
			if (response.status === 401) {
				current = { status: "sign-in-again", rows: [] };
				return;
			}
			if (!response.ok) throw new Error("Maps profile request failed.");
			const data = await response.json();
			const rows = data?.[selected.collection];
			if (!Array.isArray(rows)) throw new Error("Maps profile response was incomplete.");
			if (!signal.aborted) current = { status: "ready", rows };
		} catch {
			if (!signal.aborted) current = { status: "error", rows: [] };
		} finally {
			if (!signal.aborted) {
				request = null;
				onChange();
			}
		}
	}

	return {
		sync(active, cloud) {
			const nextView = VIEWS.has(active) ? active : null;
			const nextOwner = nextView && cloud?.mode === "signed-in" && !cloud.isLocalDemo
				? cloud.user?.uid || null
				: null;
			const nextChecking = Boolean(nextView && !cloud?.ready);
			if (nextView === view && nextOwner === owner && nextChecking === checking) {
				return false;
			}
			request?.abort();
			request = null;
			view = nextView;
			owner = nextOwner;
			checking = nextChecking;
			current = { status: checking ? "checking" : "sign-in", rows: [] };
			if (view && owner && !checking) void load();
			return true;
		},
		retry() {
			if (!view || !owner) return;
			void load();
			onChange();
		},
		get current() {
			return current;
		},
	};
}

function placeName(place) {
	const name = escapeHtml(place.name);
	try {
		const url = new URL(place.url);
		if (url.protocol === "https:" || url.protocol === "http:") {
			return `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${name}</a>`;
		}
	} catch {
		// A venue may have no verified link.
	}
	return `<strong>${name}</strong>`;
}

function row(name, details) {
	return `<li>${name}${details ? `<span>${escapeHtml(details)}</span>` : ""}</li>`;
}

function placesHtml(lists) {
	return lists.map((list) => {
		const places = Array.isArray(list.places) ? list.places : [];
		return `
			<section class="maps-profile-list">
				<h3>${escapeHtml(list.name)}</h3>
				${places.length ? `<ul>${places.map((place) => row(
					placeName(place), [place.category, place.address].filter(Boolean).join(" · "),
				)).join("")}</ul>` : "<p>No places in this list yet.</p>"}
			</section>`;
	}).join("");
}

function interestsHtml(entries) {
	return `<ul>${entries.map((entry) => row(
		`<strong>${escapeHtml(entry.name)}</strong>`,
		[entry.category, ...(Array.isArray(entry.labels) ? entry.labels : []), entry.learning].filter(Boolean).join(" · "),
	)).join("")}</ul>`;
}

export function mapsProfileHtml(view, { status, rows }, cloud, theme) {
	const isPlaces = view === "Places";
	const editLink = !isPlaces && status === "ready"
		? `<a class="secondary-button" href="${escapeHtml(mapsUrl({ view: "interests", theme }))}">Edit in Maps</a>`
		: "";
	let content;
	if (status === "checking") {
		content = '<p role="status">Checking sign-in…</p>';
	} else if (status === "sign-in") {
		const message = cloud?.busy
			? "Opening Google sign-in…"
			: cloud?.error
				? "Google sign-in didn’t finish. Try again."
				: "Sign in with the Google account you use in Maps.";
		content = `
			<p role="status">${message}</p>
			<button class="primary-button" data-action="maps-profile-sign-in" type="button"${cloud?.busy ? " disabled" : ""}>Sign in with Google</button>`;
	} else if (status === "sign-in-again") {
		content = `
			<p role="status">Check that you’re signed in with the Google account you use in Maps.</p>
			<div class="action-row">
				<button class="secondary-button" data-action="maps-profile-account" type="button">Cloud settings</button>
				<button class="primary-button" data-action="maps-profile-retry" type="button">Retry</button>
			</div>`;
	} else if (status === "loading") {
		content = `<p role="status">Loading ${isPlaces ? "places" : "interests &amp; goals"}…</p>`;
	} else if (status === "error") {
		content = `
			<p role="status">Couldn’t load ${isPlaces ? "places" : "interests &amp; goals"} from Maps.</p>
			<button class="primary-button" data-action="maps-profile-retry" type="button">Retry</button>`;
	} else if (rows.length) {
		content = isPlaces ? placesHtml(rows) : interestsHtml(rows);
	} else {
		content = isPlaces
			? `<p role="status">No saved places yet.</p><a class="secondary-button" href="${escapeHtml(mapsUrl({ theme }))}">Open Maps</a>`
			: '<p role="status">No interests or goals yet.</p>';
	}

	return `
		<header class="panel-header maps-profile-header">
			<div class="panel-header-copy">
				<h2 id="maps-profile-heading" tabindex="-1">${escapeHtml(view)}</h2>
			</div>
			${editLink}
		</header>
		<div class="scroll-area maps-profile-page"${rows.length ? ` role="region" aria-label="${escapeHtml(view)} from Maps" tabindex="0"` : ""}>${content}</div>`;
}
