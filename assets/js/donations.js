const DONATION_WORKER_URL = "https://stripe-worker-api.jrice.workers.dev";
const DONATION_SITE = "ourstuff";
let escapeListenerBound = false;

function iconHtml(name) {
  return `<iconify-icon class="button-icon" icon="${name}" aria-hidden="true"></iconify-icon>`;
}

export function donationModalHtml() {
  return `
    <section class="donation-modal" id="donation-modal" role="dialog" aria-modal="true" aria-labelledby="donation-title" hidden>
      <div class="donation-panel">
        <div class="donation-panel-header">
          <div>
            <h2 id="donation-title">Send Thanks</h2>
            <p>Choose an amount and continue to secure Stripe checkout.</p>
          </div>
          <button class="icon-button donation-close" id="donation-close" type="button" aria-label="Close donation form">${iconHtml("tabler:x")}</button>
        </div>
        <div class="amount-grid" aria-label="Donation amount">
          ${[5, 10, 15, 20, 25, 50, 100]
            .map((amount) => `<button class="amount-option${amount === 10 ? " is-selected" : ""}" type="button" data-amount="${amount}">$${amount}</button>`)
            .join("")}
        </div>
        <label class="field-label" for="custom-donation-amount">
          Custom amount
          <input id="custom-donation-amount" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="$1 to $500">
        </label>
        <button class="primary-button full-width" id="donation-submit" type="button">${iconHtml("tabler:heart-handshake")}<span class="button-label">Continue to Checkout</span></button>
        <p class="donation-status" id="donation-status" aria-live="polite"></p>
      </div>
    </section>
  `;
}

export function bindDonationFlow(root = document, options = {}) {
  const modal = root.getElementById("donation-modal");
  const openButtons = Array.from(root.querySelectorAll("[data-action='open-donation']"));
  const closeButton = root.getElementById("donation-close");
  const submitButton = root.getElementById("donation-submit");
  const status = root.getElementById("donation-status");
  const customAmountInput = root.getElementById("custom-donation-amount");
  const amountOptions = Array.from(root.querySelectorAll(".amount-option"));
  let selectedAmount = 10;

  if (!modal || !submitButton || !customAmountInput) return;

  function openModal() {
    options.onOpen?.();
    modal.hidden = false;
    status.textContent = "";
    submitButton.disabled = false;
    submitButton.innerHTML = `${iconHtml("tabler:heart-handshake")}<span class="button-label">Continue to Checkout</span>`;
    customAmountInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
    openButtons[0]?.focus();
  }

  function getDonationAmount() {
    const customAmount = customAmountInput.value.trim();
    const amount = customAmount ? Number(customAmount) : selectedAmount;
    if (!Number.isInteger(amount) || amount < 1 || amount > 500) {
      throw new Error("Choose a whole dollar amount from $1 to $500.");
    }
    return amount;
  }

  async function startDonation(amount) {
    const response = await fetch(`${DONATION_WORKER_URL}/api/donations/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ site: DONATION_SITE, amount })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error?.message || "Donation checkout failed");
    }
    window.location.assign(result.url);
  }

  openButtons.forEach((button) => button.addEventListener("click", openModal));
  closeButton?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  if (!escapeListenerBound) {
    document.addEventListener("keydown", (event) => {
      const currentModal = document.getElementById("donation-modal");
      const currentOpenButton = document.querySelector("[data-action='open-donation']");
      if (event.key === "Escape" && currentModal && !currentModal.hidden) {
        currentModal.hidden = true;
        currentOpenButton?.focus();
      }
    });
    escapeListenerBound = true;
  }
  amountOptions.forEach((button) => {
    button.addEventListener("click", () => {
      selectedAmount = Number(button.dataset.amount);
      customAmountInput.value = "";
      amountOptions.forEach((option) => option.classList.toggle("is-selected", option === button));
    });
  });
  customAmountInput.addEventListener("input", () => {
    amountOptions.forEach((button) => button.classList.remove("is-selected"));
  });
  submitButton.addEventListener("click", async () => {
    try {
      status.textContent = "";
      submitButton.disabled = true;
      submitButton.innerHTML = `${iconHtml("tabler:loader-2")}<span class="button-label">Creating checkout...</span>`;
      await startDonation(getDonationAmount());
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Donation checkout failed.";
      submitButton.disabled = false;
      submitButton.innerHTML = `${iconHtml("tabler:heart-handshake")}<span class="button-label">Continue to Checkout</span>`;
    }
  });
}
