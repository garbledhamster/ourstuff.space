import { PAYMENTS_WORKER_URL } from "./config.js";

const offers = [
	{ id: "personal", label: "Personal", price: "$9.99 USD per user per month" },
	{ id: "family", label: "Family & Friends", price: "$14.99 USD per group per month" },
];

export function setupHostedPlans({ account, checkout }) {
	const dialog = document.createElement("dialog");
	dialog.className = "space-locations-modal";
	dialog.setAttribute("aria-label", "Hosted plans");
	const title = document.createElement("h2");
	title.textContent = "Hosted plans";
	title.tabIndex = -1;
	const status = document.createElement("p");
	status.setAttribute("role", "status");
	const list = document.createElement("ul");
	list.className = "space-location-entries";
	const close = document.createElement("button");
	close.type = "button";
	close.className = "secondary-button";
	close.textContent = "Close";
	close.addEventListener("click", () => dialog.close());
	dialog.append(title, status, list, close);
	document.body.append(dialog);

	let catalog;
	let trigger;
	let busy = false;
	let request = 0;
	const buttons = offers.map(offer => {
		const row = document.createElement("li");
		const name = document.createElement("strong");
		name.textContent = offer.label;
		const price = document.createElement("span");
		price.textContent = offer.price;
		const select = document.createElement("button");
		select.type = "button";
		select.className = "primary-button";
		select.textContent = "Subscribe to " + offer.label;
		select.addEventListener("click", async () => {
			if (!dialog.open || select.disabled || busy) return;
			const opened = request;
			busy = true;
			refresh();
			let failure;
			try {
				await checkout(offer.id);
			} catch (error) {
				failure = error;
			} finally {
				if (dialog.open && request === opened) {
					busy = false;
					refresh();
					if (failure) status.textContent = failure.message || "Couldn’t open checkout. Try again.";
				}
			}
		});
		row.append(name, price, select);
		list.append(row);
		return select;
	});

	function refresh() {
		if (!dialog.open) return;
		const user = account();
		const subscribed = user?.entitlement?.cloud;
		for (const button of buttons) button.disabled = busy || !catalog?.enabled || !user?.user || subscribed === true;
		status.textContent = busy ? "Opening checkout…" : !catalog ? "Checking availability…" :
			!catalog.enabled ? "Hosted checkout is unavailable right now." :
				!user?.user ? "Sign in from Data Controls to subscribe." :
					subscribed ? "Manage your existing subscription from Data Controls." : "";
	}

	dialog.addEventListener("close", () => {
		request += 1;
		trigger?.focus();
	});

	return {
		refresh,
		async open(control) {
			if (dialog.open) return;
			const opened = ++request;
			trigger = control;
			catalog = undefined;
			busy = false;
			dialog.showModal();
			title.focus();
			refresh();
			try {
				const response = await fetch(PAYMENTS_WORKER_URL + "/api/subscriptions/plans", {
					cache: "no-store", redirect: "error",
				});
				const result = response.ok && await response.json();
				if (!dialog.open || request !== opened) return;
				catalog = { enabled: result?.enabled === true };
			} catch {
				if (!dialog.open || request !== opened) return;
				catalog = { enabled: false };
			}
			refresh();
		},
	};
}
