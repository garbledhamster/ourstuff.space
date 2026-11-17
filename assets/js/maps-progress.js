import { escapeHtml } from "./markdown.js";

const MAPS_ORIGIN = "https://maps.ourstuff.space";
const PATH_SEGMENT = /^[a-zA-Z0-9_-]{1,128}$/;
const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function progressContext(open, space, cloud) {
	if (!open) return { status: "closed" };
	if (!cloud?.ready || cloud.busy) return { status: "checking" };
	const uid = cloud.user?.uid;
	if (cloud.mode !== "signed-in" || !uid || cloud.isLocalDemo) return { status: "sign-in" };

	const appId = space?.cloudAppId;
	const ownerUid = cloud.cloudOwnerUid;
	const shared = cloud.sharedSpace;
	const confirmed = space?.shareable
		? shared?.spaceId === space.id && shared.appId === appId && shared.ownerUid === ownerUid
		: ownerUid === uid;
	if (!confirmed || !PATH_SEGMENT.test(ownerUid || "") || !PATH_SEGMENT.test(appId || "")) {
		return { status: "unavailable" };
	}
	return { status: "loading", uid, ownerUid, appId };
}

function progressRows(payload) {
	if (!Array.isArray(payload?.events)) throw new Error("Incomplete progress response.");
	const rows = new Map();
	for (const event of payload.events) {
		const { id, goalName, activity, occurredAt, source } = event || {};
		if (![id, goalName, activity, occurredAt, source].every(value => typeof value === "string" && value.trim())) continue;
		const time = Date.parse(occurredAt);
		if (!Number.isFinite(time) || rows.has(id)) continue;
		rows.set(id, { goalName, activity, occurredAt, source, time });
	}
	return [...rows.values()].sort((a, b) => b.time - a.time);
}

export function createMapsProgress({ getIdToken, onChange }) {
	let context;
	let contextKey;
	let request;
	let current = { status: "closed", rows: [] };

	async function load({ uid, ownerUid, appId }) {
		const next = new AbortController();
		const { signal } = next;
		request?.abort();
		request = next;
		current = { status: "loading", rows: [] };

		try {
			const token = await getIdToken({ optional: true, expectedUid: uid });
			if (signal.aborted) return;
			if (!token) {
				current = { status: "sign-in", rows: [] };
				return;
			}
			const response = await fetch(`${MAPS_ORIGIN}/api/connected/${ownerUid}/${appId}/progress`, {
				headers: { Authorization: `Bearer ${token}` },
				cache: "no-store",
				credentials: "omit",
				signal,
			});
			if (signal.aborted) return;
			if (response.status === 401) {
				current = { status: "sign-in", rows: [] };
				return;
			}
			if (response.status === 403 || response.status === 404) {
				current = { status: "unavailable", rows: [] };
				return;
			}
			if (!response.ok) throw new Error("Goal progress request failed.");
			const rows = progressRows(await response.json());
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
		sync(open, space, cloud) {
			const next = progressContext(open, space, cloud);
			const nextKey = JSON.stringify(next);
			if (nextKey === contextKey) return false;
			request?.abort();
			request = null;
			context = next;
			contextKey = nextKey;
			current = { status: next.status, rows: [] };
			if (next.status === "loading") void load(next);
			return true;
		},
		retry() {
			if (current.status !== "error" || context?.status !== "loading") return;
			void load(context);
			onChange();
		},
		get current() {
			return current;
		},
	};
}

export function mapsProgressHtml({ status, rows }) {
	if (status === "closed") return "";
	const messages = {
		checking: "Checking Space access…",
		"sign-in": "Sign in to see goal progress in this Space.",
		unavailable: "Progress for this Space is unavailable.",
		loading: "Loading goal progress…",
		error: "Couldn’t load goal progress.",
		ready: "No goal progress yet.",
	};
	const content = status === "ready" && rows.length
		? `<ul class="space-progress-items" role="list">${rows.map(({ goalName, activity, occurredAt, source, time }) => `
			<li>
				<strong>${escapeHtml(goalName)}</strong>
				<p>${escapeHtml(activity)}</p>
				<p class="space-progress-meta">
					<time datetime="${escapeHtml(occurredAt)}">${escapeHtml(timeFormat.format(time))}</time>
					<span>${escapeHtml(source)}</span>
				</p>
			</li>`).join("")}</ul>`
		: `<p role="status">${messages[status]}</p>`;
	return `
		<section class="data-controls-group space-progress" aria-labelledby="space-progress-title">
			<h4 id="space-progress-title" tabindex="-1">Goal progress</h4>
			${content}
			${status === "error" ? '<button class="secondary-button" type="button" data-action="maps-progress-retry">Retry</button>' : ""}
		</section>
	`;
}
