# OurStuff Payments Dev Notes

## Goal

Use one shared Cloudflare Worker as the secure payments and entitlement backend for all `*.ourstuff.space` apps.

The frontend apps may be hosted on GitHub Pages or another static host. Frontend apps collect user intent only. The Worker owns:

- Stripe Checkout creation.
- Stripe subscription creation.
- Stripe Billing Portal session creation.
- Stripe webhook verification.
- Donation fulfillment records.
- Subscription entitlement records.
- D1 writes.
- Firebase token verification.
- Firebase profile/entitlement copy updates.
- Firebase custom-claim updates.
- Cloud app-state source JSON in D1.
- Firebase app-state copy writes after D1 accepts a sync.
- Cloud app/account deletion markers.

Keep this system simple and secure. Do not leak PII.

## Required Services

This document is limited to these services:

- Firebase
- Stripe
- Cloudflare Workers
- Cloudflare D1

Do not add unrelated services unless explicitly requested.

## Configuration Placeholders

Do not commit real secrets, personal account names, personal URLs, emails, or raw identifiers.

Use placeholders in docs and examples:

```text
<PAYMENTS_WORKER_URL>
<FIREBASE_PROJECT_ID>
<STRIPE_CLOUD_PRICE_ID>
<D1_DATABASE_NAME>
<D1_DATABASE_ID>
<APP_DOMAIN>
<APP_ID>
<SITE_ID>
```

Runtime values belong in Cloudflare Worker env vars/secrets, Firebase Console, Stripe Dashboard, or deployment settings.

## Core Architecture

```text
Frontend app
  -> Firebase Auth for sign-in
  -> Firestore for app-state copy loading
  -> Payments Worker for subscription/billing actions

Payments Worker
  -> verifies Firebase ID tokens
  -> creates Stripe Checkout sessions
  -> receives Stripe webhooks
  -> writes D1 subscription/payment records
  -> writes D1 app-state source records
  -> writes Firebase entitlement copy
  -> writes Firebase app-state copy
  -> sets Firebase custom claims

Stripe
  -> upstream billing system

D1
  -> private backend source for app entitlement and cloud app-state JSON

Firebase
  -> frontend-readable identity, entitlement copy, and app-state JSON copy
```

## Security Rules

Never put these in GitHub Pages, browser JavaScript, or committed docs:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
API_AUTH_TOKEN
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_PRIVATE_KEY
D1_DATABASE_ID
OWNER_UIDS
OWNER_EMAILS
PII_HASH_SECRET
```

Frontend may send only safe intent:

```json
{
  "site": "<SITE_ID>",
  "appId": "<APP_ID>",
  "returnUrl": "https://<APP_DOMAIN>/settings"
}
```

For authenticated purchase/subscription/account actions, the frontend sends a Firebase ID token:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

Do not log:

- Firebase ID tokens.
- Stripe secret keys.
- Stripe webhook signing secrets.
- raw webhook bodies in normal logs.
- service account JSON.
- raw emails.
- payment method details.
- full customer objects.

## PII-Minimizing Data Policy

Use Firebase Auth and Stripe for identity/payment details. Do not duplicate raw PII into app databases unless strictly needed.

Recommended:

- Use Firebase UID as the main app identity key.
- Store Stripe customer/subscription IDs in D1, not in frontend-readable documents unless needed.
- Store raw customer email only in Stripe/Firebase Auth, not in D1 or Firestore.
- If a backend lookup needs an email fallback, prefer a keyed hash stored server-side only.
- Display the signed-in user's own email/name from Firebase Auth in the UI, but do not log it.
- Store minimal entitlement fields in Firestore.

Firestore `/users/{uid}` should contain only:

```json
{
  "role": "member",
  "cloud": true,
  "admin": false,
  "subscriptionStatus": "active",
  "plan": "cloud",
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

D1 may contain Stripe IDs and subscription status, but should avoid raw PII.

## Cloudflare Worker Configuration

### wrangler.toml shape

Use placeholders:

```toml
name = "<PAYMENTS_WORKER_NAME>"
main = "src/worker.ts"
compatibility_date = "2026-05-23"

[vars]
FIREBASE_PROJECT_ID = "<FIREBASE_PROJECT_ID>"
STRIPE_CLOUD_PRICE_ID = "<STRIPE_CLOUD_PRICE_ID>"
APP_BASE_DOMAIN = "ourstuff.space"
ALLOWED_ORIGINS = "https://ourstuff.space,https://*.ourstuff.space,http://localhost:4173"

[[d1_databases]]
binding = "PAYMENTS_DB"
database_name = "<D1_DATABASE_NAME>"
database_id = "<D1_DATABASE_ID>"
```

### Secrets

Set secrets through Wrangler, not committed files:

```powershell
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
npx wrangler secret put API_AUTH_TOKEN
npx wrangler secret put OWNER_UIDS
```

Optional only if needed:

```powershell
npx wrangler secret put OWNER_EMAILS
npx wrangler secret put PII_HASH_SECRET
```

Prefer `OWNER_UIDS` over owner email where possible.

## D1 Setup

Create database:

```powershell
npx wrangler d1 create <D1_DATABASE_NAME>
```

Apply schema:

```powershell
npx wrangler d1 execute <D1_DATABASE_NAME> --file=./schema.sql --remote
```

Local dev, if used:

```powershell
npx wrangler d1 execute <D1_DATABASE_NAME> --file=./schema.sql --local
```

## D1 Schema

Create `schema.sql` in the Worker repo.

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firebase_uid TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  raw_event_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_customer
ON subscriptions(stripe_customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_subscription
ON subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_firebase_uid
ON subscriptions(firebase_uid);

CREATE TABLE IF NOT EXISTS stripe_events (
  stripe_event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  raw_event_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_session
ON donations(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_donations_site
ON donations(site);
```

Notes:

- D1 is private to the Worker.
- Frontend must never read or write D1.
- Firestore Security Rules do not talk to D1.
- The Worker copies only minimal entitlement state to Firebase.

## Stripe Setup

### Products

Create a Stripe Product:

```text
Name: Cloud
Billing: recurring monthly
Price: 9.99 USD/month
```

Store the monthly Price ID as:

```text
STRIPE_CLOUD_PRICE_ID
```

Do not commit the real Price ID unless this repo intentionally stores public Stripe config. Prefer env/config placeholders.

### Webhook Endpoint

Stripe webhook URL:

```text
<PAYMENTS_WORKER_URL>/api/webhooks/stripe
```

Required events:

```text
checkout.session.completed
checkout.session.expired
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Rules:

- Fulfillment must happen from verified webhooks.
- The success page is display-only.
- Do not grant access based only on a URL query parameter.
- Deduplicate webhook events using `stripe_events`.

### Billing Portal

Use Stripe Customer Portal for:

- update payment method
- view invoices
- cancel subscription
- manage subscription

Do not build custom billing management for MVP.

## Worker Endpoint Contracts

Current implementation note:

- `C:\Codex\stripe-worker-api` implements the subscription frontend endpoints below.
- Firebase custom claims and Firestore entitlement-copy writes are attempted only when the Worker has `FIREBASE_SERVICE_ACCOUNT_JSON` configured as a secret.
- The frontend must treat D1/Worker entitlement as the payment source of truth and never write entitlement fields itself.

### POST /api/bootstrap-user

Purpose:

- Verify Firebase ID token.
- Ensure the Firebase user has correct entitlement claims.
- Write minimal `/users/{uid}` profile/entitlement copy.

Input:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

Behavior:

- Verify token.
- Extract UID and verified account data.
- If UID is in `OWNER_UIDS`, grant admin/cloud.
- If using `OWNER_EMAILS`, require verified email before admin/cloud.
- Otherwise look up D1 subscription by Firebase UID.
- Compute entitlement.
- Set Firebase custom claims.
- Write minimal Firestore profile.

Output:

```json
{
  "uid": "<uid>",
  "role": "member",
  "cloud": false,
  "admin": false,
  "subscriptionStatus": "inactive",
  "plan": null
}
```

Do not return raw Stripe customer objects or raw PII.

### POST /api/subscriptions/checkout

Purpose:

- Create Stripe Checkout session for the Cloud subscription.

Input:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: application/json
```

```json
{
  "site": "<SITE_ID>",
  "appId": "<APP_ID>",
  "returnUrl": "https://<APP_DOMAIN>/settings"
}
```

Behavior:

- Verify Firebase ID token.
- If owner/admin, do not create checkout; return current entitlement.
- Create or reuse a Stripe customer keyed by Firebase UID metadata.
- Create Checkout Session with `mode=subscription`.
- Use `STRIPE_CLOUD_PRICE_ID` server-side.
- Add metadata:
  - `firebase_uid`
  - `site`
  - `app_id`
- Add the same metadata to `subscription_data.metadata`.
- Return only the Checkout URL.

Output:

```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/subscriptions/portal

Purpose:

- Create Stripe Billing Portal session.

Input:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: application/json
```

```json
{
  "returnUrl": "https://<APP_DOMAIN>/settings"
}
```

Behavior:

- Verify Firebase ID token.
- Look up Stripe customer ID from D1 by Firebase UID.
- If no customer exists, return a controlled error.
- If owner/admin without Stripe customer, return no portal needed.
- Return Billing Portal URL.

Output:

```json
{
  "url": "https://billing.stripe.com/..."
}
```

### POST /api/donations/checkout

Purpose:

- Create anonymous or optional-auth donation Checkout session.

Input:

```json
{
  "site": "<SITE_ID>",
  "amount": 10
}
```

Behavior:

- Validate site against Worker registry.
- Validate amount against server-side presets/custom min/max.
- Create Checkout Session with dynamic `price_data`.
- Do not allow browser-controlled product/price IDs.

### GET /api/checkout/sessions/:sessionId

Purpose:

- Return safe thank-you page display data.

Output shape:

```json
{
  "status": "paid",
  "amount": "$10.00",
  "site": "Site Name"
}
```

Do not return raw customer details. If customer email is displayed, return it only for authenticated same-user purchase flows and avoid storing/logging it.

### POST /api/webhooks/stripe

Purpose:

- Trusted Stripe fulfillment.

Behavior:

- Verify Stripe webhook signature using `STRIPE_WEBHOOK_SECRET`.
- Deduplicate via `stripe_events`.
- For donations, record safe donation status in D1.
- For subscriptions, upsert D1 subscription record.
- Compute entitlement.
- Update Firebase profile copy.
- Set Firebase custom claims.

## D1-First App-State Sync

D1 owns the original cloud app-state JSON. Firebase is the app-readable copy.

```text
App export -> Worker /api/cloud/apps/{appId}/state -> D1 app_states -> Firebase /users/{uid}/apps/{appId}
```

Rules:

- Frontend never reads or writes D1 directly.
- Frontend should not write app-state JSON directly to Firestore.
- On first sign-in, the frontend checks the Worker for existing D1 cloud data before syncing local state up.
- If cloud data exists, prompt the user to import it.
- If the user declines import, warn that syncing this device will replace the cloud copy and recommend exporting first.
- `DELETE /api/cloud/apps/{appId}/state` marks the app state deleted in D1 and deletes the Firebase copy.
- `DELETE /api/cloud/account` marks all app states deleted in D1 and requests Firebase cloud account deletion.
- If Firebase and D1 disagree, D1 wins.

## Subscription Entitlement Logic

Use this conceptual logic:

```ts
function computeEntitlement(input) {
  if (input.isOwner === true) {
    return {
      role: "admin",
      admin: true,
      cloud: true,
      subscriptionStatus: "owner",
      plan: "owner"
    };
  }

  if (input.stripeStatus === "active" || input.stripeStatus === "trialing") {
    return {
      role: "member",
      admin: false,
      cloud: true,
      subscriptionStatus: input.stripeStatus,
      plan: "cloud"
    };
  }

  return {
    role: "member",
    admin: false,
    cloud: false,
    subscriptionStatus: input.stripeStatus || "inactive",
    plan: null
  };
}
```

MVP status policy:

```text
active      -> cloud true
trialing    -> cloud true only if trials are intentionally enabled
past_due    -> cloud false for MVP
unpaid      -> cloud false
canceled    -> cloud true only until current_period_end if Stripe reports a still-open paid period
incomplete  -> cloud false
```

Cancellation rule:

- `cancel_at_period_end=true` must not remove access immediately.
- The Worker stores current subscription period timestamps in D1 and keeps access active until `current_period_end`.
- After `current_period_end`, bootstrap and sync checks must resolve the entitlement as inactive unless a Stripe renewal/update extended the period.

## Firebase Update From Worker

Worker must perform backend Firebase operations only from server-side code.

Required backend Firebase actions:

- Verify Firebase ID token from frontend requests.
- Write `/users/{uid}` entitlement copy.
- Set custom claims.

Implementation note:

- Use a Worker-compatible Firebase Admin approach.
- Do not assume browser Firebase SDK can do admin actions.
- If the Node Admin SDK is not compatible with the Worker runtime, use Firebase/Google REST APIs with a service-account credential stored as a Worker secret.

## Firebase Custom Claims

Owner/admin:

```json
{
  "cloud": true,
  "admin": true,
  "role": "admin"
}
```

Paid member:

```json
{
  "cloud": true,
  "admin": false,
  "role": "member"
}
```

Signed-in non-premium:

```json
{
  "cloud": false,
  "admin": false,
  "role": "member"
}
```

## Firestore Entitlement Copy

Worker writes:

```text
/users/{uid}
```

Minimal document:

```json
{
  "role": "member",
  "cloud": true,
  "admin": false,
  "subscriptionStatus": "active",
  "plan": "cloud",
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

Do not let the frontend write this document.

## Frontend Subscription Pattern

Frontend starts subscription checkout:

```js
async function startCloudSubscription({ idToken, site, appId, returnUrl }) {
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/subscriptions/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({ site, appId, returnUrl })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || "Subscription checkout failed");
  }

  if (result.url) {
    window.location.assign(result.url);
  }

  return result;
}
```

Frontend opens billing portal:

```js
async function openBillingPortal({ idToken, returnUrl }) {
  const response = await fetch(`${PAYMENTS_WORKER_URL}/api/subscriptions/portal`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({ returnUrl })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || "Billing portal failed");
  }

  if (result.url) {
    window.location.assign(result.url);
  }

  return result;
}
```

## Site Registry

Worker should keep a server-side registry.

Example:

```ts
const SITES = {
  main: {
    id: "main",
    name: "Ourstuff",
    origin: "https://ourstuff.space",
    donateSuccessPath: "/donate/thanks",
    donateCancelPath: "/",
    cloudReturnPath: "/settings"
  }
};
```

Rules:

- Browser cannot choose arbitrary success/cancel URLs.
- Worker validates requested `site` and `returnUrl` against the registry.
- Worker validates origins with a strict allowlist.

## Donation Flow

Donation flow can remain anonymous.

```text
site UI
-> Worker /api/donations/checkout
-> Stripe Checkout
-> site thank-you page
-> Worker safe checkout session lookup
```

Allowed donation amounts should be server-side:

```ts
const presetAmounts = [5, 10, 15, 20, 25, 50, 100];
const minCustomAmount = 1;
const maxCustomAmount = 500;
```

Frontend may send:

```json
{
  "site": "main",
  "amount": 10
}
```

Worker decides product name, unit amount, success URL, cancel URL, and Stripe parameters.

## Subscription Flow

```text
User signs in with Firebase
↓
Frontend calls /api/bootstrap-user
↓
If not cloud, user clicks Subscribe
↓
Frontend calls /api/subscriptions/checkout with Firebase ID token
↓
Worker verifies token and creates Stripe Checkout Session
↓
Stripe redirects to success URL
↓
Stripe webhook reaches /api/webhooks/stripe
↓
Worker verifies webhook and updates D1
↓
Worker writes Firebase entitlement copy and custom claims
↓
Frontend force-refreshes token and enables cloud sync
```

## Cloudflare Deployment

From the Worker project:

```powershell
npm run typecheck
npx wrangler deploy
```

If there is no TypeScript setup, use the repo's existing check command.

After deploy:

- Confirm Worker route.
- Confirm CORS allowlist.
- Confirm Stripe webhook endpoint uses the deployed Worker URL.
- Confirm D1 binding works.
- Confirm secrets exist.

## Testing

### Local checks

- [ ] Worker starts locally if supported.
- [ ] D1 schema applies locally.
- [x] CORS allows expected local origin.
- [ ] CORS rejects unknown origins.
- [ ] Donation checkout rejects bad amounts.
- [x] Subscription checkout rejects missing/invalid Firebase token.
- [ ] Subscription checkout accepts valid Firebase token.
- [ ] Webhook rejects invalid signature.
- [ ] Webhook dedupes repeated event IDs.

### Stripe test checks

- [ ] Donation Checkout succeeds in test mode.
- [ ] Subscription Checkout succeeds in test mode.
- [ ] Webhook receives checkout/subscription events.
- [ ] D1 subscription row is written.
- [ ] Firebase `/users/{uid}` is updated.
- [ ] Custom claims are set.
- [ ] Billing Portal opens for subscribed users.
- [ ] Canceled/unpaid subscription removes cloud access after the paid period ends.

### PII/security checks

- [ ] No raw emails in repo docs.
- [ ] No account usernames in repo docs.
- [ ] No secret keys in repo docs.
- [ ] No service-account JSON in repo docs.
- [ ] No Firebase ID token logs.
- [ ] No raw Stripe webhook body logs in normal operation.
- [ ] D1 is not exposed to frontend.

## Adding A New ourstuff.space App

For a new app:

1. Add the site/app to the Worker registry.
2. Define `APP_ID` in the frontend.
3. Use the shared Firebase project.
4. Use the shared payments Worker.
5. Add Link Settings Cloud UI.
6. Add Firebase sign-in from `FIREBASE_MCP_CODEX.md`.
7. Add full JSON app-state export/import.
8. Save app state to `/users/{uid}/apps/{appId}`.
9. Use `/api/bootstrap-user` after sign-in.
10. Use `/api/subscriptions/checkout` for Cloud subscription.
11. Use `/api/subscriptions/portal` for billing.
12. Verify Firestore rules prevent cross-user access.

## Official Reference Links

- Stripe Checkout overview: https://docs.stripe.com/payments/checkout/how-checkout-works
- Stripe subscriptions webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Cloudflare D1 get started: https://developers.cloudflare.com/d1/get-started/
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Firebase MCP server: https://firebase.google.com/docs/ai-assistance/mcp-server
- Firebase custom claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
