const DONATION_WORKER_URL = "https://stripe-worker-api.jrice.workers.dev";
const messageEl = document.getElementById("thanks-message");
const detailsEl = document.getElementById("thanks-details");
const sessionId = new URLSearchParams(window.location.search).get("session_id");

function setError(message) {
	messageEl.classList.add("error");
	messageEl.textContent = message;
	detailsEl.hidden = true;
}

function addDetail(label, value) {
	if (!value) return;

	const row = document.createElement("div");
	const labelEl = document.createElement("span");
	const valueEl = document.createElement("strong");
	row.className = "detail-row";
	labelEl.textContent = label;
	valueEl.textContent = value;
	row.append(labelEl, valueEl);
	detailsEl.appendChild(row);
}

async function loadDonationDetails() {
	if (!sessionId) {
		setError(
			"Missing checkout session. Your donation may still have completed, but there are no details to show here.",
		);
		return;
	}

	const response = await fetch(
		`${DONATION_WORKER_URL}/api/checkout/sessions/${encodeURIComponent(sessionId)}`,
	);
	const result = await response.json();

	if (!response.ok) {
		throw new Error(
			result?.error?.message || "Could not load donation details.",
		);
	}

	messageEl.textContent =
		result.status === "paid"
			? "Your donation was received through secure Stripe checkout."
			: "Stripe returned you to this page. The payment status is shown below.";
	addDetail("Status", result.status);
	addDetail("Amount", result.amount);
	addDetail("Site", result.site);
	addDetail("Email", result.customerEmail);
	detailsEl.hidden = false;
}

loadDonationDetails().catch((error) => {
	setError(
		error instanceof Error ? error.message : "Could not load donation details.",
	);
});
