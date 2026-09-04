# WhatsApp Tiered Bot (starter)

A subscription-gated WhatsApp automation bot built on Baileys (unofficial
WhatsApp Web protocol library). Free tier: view/log messages, react to
messages. Pro tier: auto-view statuses, keyword auto-reply.

## ⚠️ Before you launch

- This automates a real WhatsApp session via an **unofficial** protocol
  library, which violates WhatsApp's Terms of Service. Numbers using this
  approach get banned — sometimes quickly, sometimes after weeks. Don't use
  a subscriber's only/primary number, and be upfront with paying customers
  about this risk before you take their money.
- Each subscriber = one running session (one `auth/<session>` folder, one
  socket connection). Plan hosting resources accordingly — this doesn't
  scale like a stateless web app.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

**Login — two options:**
- **QR code (default)**: scan the printed QR with the WhatsApp account you want the bot to run as.
- **Pairing code**: set `PHONE_NUMBER` in `.env` (digits only, with country code, e.g. `254712345678`) before starting. The console prints a short numeric code instead — enter it on the phone under WhatsApp > Settings > Linked Devices > Link a device > Link with phone number instead. Useful when you're watching server logs rather than a terminal that can render a QR.

Either way, auth state persists in `${DATA_DIR}/auth/<SESSION_NAME>` so you won't need to log in again on restart (unless WhatsApp logs the session out).

## How the tier gate works

`src/config/tiers.js` is the single source of truth for which feature needs
which plan. Every feature handler in `src/features/` is called through
`gatedRun()` in `src/index.js`, which checks the caller's tier via
`subscriptionService.getTier()` before running anything. To add a new
feature:

1. Write the handler in `src/features/`.
2. Add it to `FEATURE_REQUIREMENTS` in `tiers.js`.
3. Call it through `gatedRun()` in `index.js`.

Nothing else needs to change — the gating is automatic.

## Monetizing

`src/services/subscriptionService.js` currently stores tiers in a local JSON
file (`data/subscriptions.json`) — fine for prototyping, swap for
Postgres/Mongo before real users.

`src/services/webhookServer.js` verifies Paystack's signature (HMAC-SHA512
using `PAYSTACK_SECRET_KEY`) before trusting any payload — requests without
a valid `x-paystack-signature` header are rejected with 401. To go live:

1. Create a Paystack account (supports M-Pesa, card, and bank transfer for
   Kenyan customers) and grab your secret key from the dashboard.
2. When you initialize a transaction (from your landing page / checkout
   flow), attach `metadata: { customer_phone: "254...", plan_duration_days: 30 }`
   — the webhook reads these fields to know which WhatsApp number to upgrade
   and for how long.
3. In the Paystack dashboard, set your webhook URL to
   `https://<your-render-service>.onrender.com/webhook/payment`.
4. Set `PAYSTACK_SECRET_KEY` in Render's Environment tab (never commit it).

Using a different provider (Flutterwave, Stripe)? Swap
`verifyPaystackSignature()` and `handlePaystackEvent()` for that provider's
signature scheme and event shape — the rest of the file stays the same.

## Not built yet (natural next features)

- Anti-delete (resurface messages the sender deleted) — `antiDelete` is
  already reserved as a Pro feature key in `tiers.js`.
- Broadcast/bulk send — reserved as `broadcast`.
- Admin dashboard to view subscribers, revenue, session health.
