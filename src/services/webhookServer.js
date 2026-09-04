/**
 * Payment webhook receiver with real signature verification (Paystack shown
 * here — it covers M-Pesa, card, and bank transfer for Kenyan customers).
 * If you use a different provider, swap out verifyPaystackSignature() and
 * the event-shape mapping in handlePaystackEvent() for that provider's docs.
 *
 * Run alongside src/index.js: `node src/services/webhookServer.js`
 * (or both together via src/start.js, which is what npm start runs)
 */
require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const { upgradeTier } = require('./subscriptionService');
const { TIERS } = require('../config/tiers');

const PORT = process.env.PORT || process.env.WEBHOOK_PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function verifyPaystackSignature(rawBody, signatureHeader) {
  if (!PAYSTACK_SECRET_KEY) {
    console.warn('PAYSTACK_SECRET_KEY is not set — refusing to process webhook.');
    return false;
  }
  const expected = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  // timingSafeEqual needs equal-length buffers, so bail out early on mismatch
  if (!signatureHeader || signatureHeader.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}

/**
 * Paystack sends { event: "charge.success", data: { customer, metadata, ... } }.
 * We rely on YOU passing metadata.customer_phone and metadata.plan_duration_days
 * when you initialize the transaction (Paystack lets you attach arbitrary
 * metadata at checkout) — that's how we know which WhatsApp number to upgrade.
 */
function handlePaystackEvent(event) {
  if (event.event !== 'charge.success') {
    console.log(`Ignoring event type: ${event.event}`);
    return;
  }

  const metadata = event.data?.metadata || {};
  const customerPhone = metadata.customer_phone;
  const planDurationDays = Number(metadata.plan_duration_days) || 30;

  if (!customerPhone) {
    console.error('charge.success received but metadata.customer_phone is missing — cannot upgrade anyone.');
    return;
  }

  const jid = `${customerPhone}@s.whatsapp.net`;
  upgradeTier(jid, TIERS.PRO, planDurationDays);
  console.log(`Upgraded ${jid} to PRO for ${planDurationDays} days`);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook/payment') {
    res.writeHead(404);
    return res.end();
  }

  let rawBody = '';
  req.on('data', (chunk) => (rawBody += chunk));
  req.on('end', () => {
    const signature = req.headers['x-paystack-signature'];

    if (!verifyPaystackSignature(rawBody, signature)) {
      console.warn('Rejected webhook: invalid or missing signature.');
      res.writeHead(401);
      return res.end('invalid signature');
    }

    try {
      const event = JSON.parse(rawBody);
      handlePaystackEvent(event);
      res.writeHead(200);
      res.end('ok');
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.writeHead(400);
      res.end('bad request');
    }
  });
});

server.listen(PORT, () => console.log(`Webhook server listening on :${PORT}`));
