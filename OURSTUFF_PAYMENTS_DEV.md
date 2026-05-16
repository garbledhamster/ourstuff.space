# OurStuff Payments Dev Notes

## Goal

Use one Cloudflare Worker as the secure payments backend for all `*.ourstuff.space` sites.

Sites can be hosted anywhere, including GitHub Pages. The sites should only show UI and collect user intent. The Worker owns all payment rules, Stripe calls, webhook verification, and redirect decisions.

## Current Worker

Worker:

```text
https://stripe-worker-api.jrice.workers.dev
```

Current test storefront:

```text
https://stripe-worker-api.jrice.workers.dev/demo
```

Current sandbox Stripe Price:

```text
price_1TXWGsRvyjsch3IA2akwV1zf
```

Allowed browser origins:

```text
https://ourstuff.space
https://*.ourstuff.space
```

## Security Rules

Never put these in GitHub Pages or browser JavaScript:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRETS
API_AUTH_TOKEN
```

Public sites may send only safe inputs, such as:

```json
{
  "site": "classics",
  "amount": 10
}
```

The Worker decides:

- which sites are allowed
- which amounts are allowed
- which Stripe product/price/label to use
- where success and cancel redirects go
- whether a Firebase user token is valid
- whether a checkout session belongs to the current user

## Standard Donation Flow

Example site:

```text
https://classics.ourstuff.space
```

User flow:

1. User clicks a donate/thanks button on the site.
2. Site opens its own styled donation UI.
3. User chooses `$5`, `$10`, `$15`, `$20`, `$25`, `$50`, `$100`, or custom.
4. Site sends the selected amount to the Worker.
5. Worker validates the amount and site.
6. Worker creates a Stripe Checkout Session.
7. Browser redirects to Stripe.
8. Stripe redirects back to the site thank-you page.
9. Site asks the Worker for safe checkout details to display.

The user experience is:

```text
ourstuff site UI -> Stripe payment page -> ourstuff thank-you page
```

## Frontend Pattern

Each site can use a simple button:

```html
<button id="donate-button" type="button">Donate</button>
```

The site should call the Worker when the user confirms an amount:

```js
async function startDonation(amount) {
  const response = await fetch("https://stripe-worker-api.jrice.workers.dev/api/donations/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      site: "classics",
      amount
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || "Donation checkout failed");
  }

  window.location.assign(result.url);
}
```

## Worker Donation Rules

The Worker should keep a server-side site registry:

```ts
const DONATION_SITES = {
  classics: {
    name: "Classics",
    origin: "https://classics.ourstuff.space",
    successPath: "/donate/thanks",
    cancelPath: "/"
  }
};
```

The Worker should validate donation amounts:

```ts
const presetAmounts = [5, 10, 15, 20, 25, 50, 100];
const minCustomAmount = 1;
const maxCustomAmount = 500;
```

Then create Stripe Checkout with dynamic `price_data`, not browser-controlled prices:

```ts
line_items: [
  {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: amount * 100,
      product_data: {
        name: `Donation to ${site.name}`
      }
    }
  }
]
```

Success URL:

```text
https://classics.ourstuff.space/donate/thanks?session_id={CHECKOUT_SESSION_ID}
```

Cancel URL:

```text
https://classics.ourstuff.space/
```

## Thank-You Page Pattern

GitHub Pages route:

```text
/donate/thanks
```

The page reads:

```js
const sessionId = new URLSearchParams(window.location.search).get("session_id");
```

Then asks the Worker for safe display data:

```js
const response = await fetch(
  `https://stripe-worker-api.jrice.workers.dev/api/checkout/sessions/${encodeURIComponent(sessionId)}`
);
```

The Worker should return only safe fields:

```json
{
  "status": "paid",
  "amount": "$10.00",
  "site": "Classics",
  "customerEmail": "person@example.com"
}
```

The thanks page displays that using the site's normal style.

## Firebase Auth Pattern

For carts, subscriptions, or user-specific purchases:

1. User signs in with Firebase on the GitHub Pages site.
2. Site gets a Firebase ID token.
3. Site sends it to the Worker:

```http
Authorization: Bearer FIREBASE_ID_TOKEN
```

4. Worker verifies the Firebase token.
5. Worker stores the Firebase UID in Stripe metadata:

```ts
metadata: {
  firebaseUid,
  site: "classics"
}
```

6. Success lookup only returns data if the Firebase UID matches.

Donations can be anonymous. Purchases, subscriptions, and account pages should use Firebase.

## Webhooks

Stripe sends payment events to:

```text
https://stripe-worker-api.jrice.workers.dev/api/webhooks/stripe
```

Webhook events are used for trusted fulfillment, such as:

- recording donations
- granting access
- activating subscriptions
- updating user purchase history
- sending email or notifications

Do not rely only on the thank-you page for fulfillment. The thank-you page is display-only.

## Adding A New Site

To add `classics.ourstuff.space`:

1. Add a site entry in the Worker registry.
2. Add a donate button/modal to the GitHub Pages site.
3. Point the button to `POST /api/donations/checkout`.
4. Add `/donate/thanks` to the site.
5. Deploy the Worker.
6. Test with Stripe test card:

```text
4242 4242 4242 4242
Any future expiration
Any CVC
Any ZIP
```

## Deploy

From the Worker project:

```powershell
cd C:\Codex\stripe-worker-api
npm run typecheck
npx wrangler deploy
```
