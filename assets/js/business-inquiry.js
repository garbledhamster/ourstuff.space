import { FAMILY_API_URL } from "./config.js";

const endpoint = FAMILY_API_URL + "/business-inquiries";

export function setupBusinessInquiry() {
	const details = document.createElement("details");
	details.hidden = true;
	details.innerHTML = `
		<summary>Contact for quote</summary>
		<form class="cloud-email-form">
			<label class="body-field">Name <input name="name" autocomplete="name" maxlength="100" required></label>
			<label class="body-field">Email <input name="email" type="email" autocomplete="email" maxlength="254" required></label>
			<label class="body-field">Message <textarea name="message" rows="4" maxlength="3000" required></textarea></label>
			<p role="status"></p>
			<button class="primary-button" type="submit">Send inquiry</button>
		</form>`;
	const form = details.querySelector("form");
	const fields = form.querySelectorAll("input, textarea");
	const submit = form.querySelector('button[type="submit"]');
	const status = form.querySelector('[role="status"]');
	const call = document.createElement("a");
	call.hidden = true;
	details.append(call);
	let availability = 0;
	form.addEventListener("submit", async event => {
		event.preventDefault();
		if (submit.disabled || details.hidden || !form.reportValidity()) return;
		const values = Object.fromEntries(new FormData(form));
		submit.disabled = true;
		for (const field of fields) field.readOnly = true;
		status.textContent = "Sending…";
		try {
			const response = await fetch(endpoint, {
				method: "POST", headers: { "content-type": "application/json" },
				body: JSON.stringify(values), cache: "no-store", redirect: "error",
			});
			const result = await response.json();
			if (response.ok && result.sent === true) {
				form.reset();
				status.textContent = "Your inquiry was sent.";
			} else {
				status.textContent = result.error?.message || "Couldn’t confirm delivery. Your inquiry is still in the form.";
			}
		} catch {
			status.textContent = "Couldn’t confirm delivery. Your inquiry is still in the form.";
		} finally {
			for (const field of fields) field.readOnly = false;
			submit.disabled = false;
		}
	});

	return {
		details,
		async refresh() {
			const current = ++availability;
			details.hidden = true;
			call.removeAttribute("href");
			try {
				const response = await fetch(endpoint, { cache: "no-store", redirect: "error" });
				const settings = response.ok && await response.json();
				if (availability !== current) return;
				details.hidden = settings?.enabled !== true;
				const phone = settings?.phone;
				call.hidden = details.hidden || !/^\+[1-9]\d{7,14}$/u.test(phone ?? "");
				if (call.hidden) call.removeAttribute("href");
				else {
					call.href = "tel:" + phone;
					call.textContent = "Call " + phone;
				}
			} catch {
				if (availability !== current) return;
				details.hidden = true;
				call.removeAttribute("href");
			}
		},
	};
}
