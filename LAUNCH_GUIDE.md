# Launch Guide: Local → GitHub → Render → Selling

This walks through the whole path, in order. Don't skip ahead to Render
before Phase 1 works locally — it's much easier to debug a QR/pairing
problem on your own machine than in Render's log stream.

---

## Phase 1 — Run it locally first

```bash
npm install
cp .env.example .env
```

Edit `.env`:
```
PHONE_NUMBER=254797631263
```

```bash
npm start
```

Watch the console for a pairing code, enter it on your phone under
**WhatsApp > Settings > Linked Devices > Link a device > Link with phone
number instead**. Send yourself a test message from another number and
confirm you see it logged and get a 👀 reaction back.

**Use a spare number for this if at all possible.** Baileys automates
WhatsApp outside their supported API, and accounts doing this get banned —
sometimes fast. Don't test (or launch) on a number you can't afford to lose.

Stop the bot (`Ctrl+C`) once you've confirmed it connects and reacts. Fix
anything that didn't work before moving on — local is the cheap place to
debug.

---

## Phase 2 — Push to GitHub

```bash
cd whatsapp-bot
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

(The repo already has an initial commit and `.gitignore` excluding
`node_modules`, `.env`, `auth/`, and `data/` — your session credentials and
secrets never get committed.)

---

## Phase 3 — Deploy on Render

1. render.com → **New > Blueprint** → connect your GitHub repo. It reads
   `render.yaml` and proposes one `web` service with a 1GB persistent disk
   at `/var/data`.
2. This needs the **Starter** paid plan — Render's free tier doesn't include
   persistent disks, and without one your login session gets wiped on every
   redeploy.
3. Environment tab → set `PHONE_NUMBER` (same format as local) and, once you
   have it, `PAYSTACK_SECRET_KEY`.
4. Deploy → open **Logs** → enter the printed pairing code on your phone,
   same as local.
5. Trigger a redeploy afterward and confirm it reconnects without asking for
   a new pairing code — that confirms the disk is actually persisting.

---

## Phase 4 — Wire up payments (Paystack example)

1. Create a Paystack account, get your secret key.
2. Build a simple checkout page (or use Paystack's hosted payment page) that
   initializes a transaction with:
   ```json
   { "metadata": { "customer_phone": "254...", "plan_duration_days": 30 } }
   ```
3. Paystack dashboard → set webhook URL to
   `https://<your-service>.onrender.com/webhook/payment`.
4. Add `PAYSTACK_SECRET_KEY` in Render's Environment tab.
5. Test with a real small payment (Paystack's test mode first, then a real
   1-off charge) and confirm your own number gets upgraded to Pro in the
   logs.

---

## Phase 5 — Before you sell to anyone

A few things that matter once real customers and money are involved:

- **Be upfront about the ban risk.** Since this runs on unofficial
  automation, tell customers plainly that WhatsApp could disable the number
  they connect. Bake this into your terms — customers finding out after
  the fact is how refund disputes and reputational damage happen.
- **Decide your refund/downtime policy** before launch, not after your first
  angry customer.
- **One number per subscriber, not one number for everyone.** Each customer
  should connect *their own* WhatsApp — check `src/index.js` and
  `SESSION_NAME`/`PHONE_NUMBER` assume one session per deployed instance.
  Selling to multiple customers means running one instance per customer (or
  extending the code to manage multiple sessions in one process — a bigger
  change, ask me if you want to build that next).
- **Have a support channel** for "my bot stopped working" — with automation
  like this, that will happen.

## Phase 6 — Pricing and go-to-market (things to decide, not code)

- What does Free vs Pro actually feel like to a user day-to-day? Make the
  upgrade prompt (`[locked]` messages in the logs — you'll want to actually
  message the *user*, not just log it, see note below) clearly explain what
  they're missing.
- Where will customers find you — WhatsApp Business communities, a small
  landing page, referrals? A one-page site with a Paystack payment button is
  enough to start.
- Consider a free trial window (e.g. 3 days of Pro) rather than a hard
  paywall, to reduce the leap of faith for a first-time buyer.

**One code gap worth closing before selling:** right now, when a locked
feature is hit, the bot only logs to your console — the *user* never sees
an upgrade prompt. Want me to add that next (e.g. auto-reply with "This
feature needs a Pro plan — upgrade here: [link]" when a Free user's message
would have triggered a Pro feature)?
