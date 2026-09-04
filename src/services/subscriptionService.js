const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const { TIERS } = require('../config/tiers');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const adapter = new FileSync(path.join(DATA_DIR, 'subscriptions.json'));
const db = low(adapter);

db.defaults({ users: {} }).write();

/**
 * Returns the tier for a given WhatsApp JID (phone@s.whatsapp.net).
 * Unknown users default to FREE.
 */
function getTier(jid) {
  const record = db.get(`users.${sanitize(jid)}`).value();
  if (!record) return TIERS.FREE;
  if (record.expiresAt && Date.now() > record.expiresAt) return TIERS.FREE; // expired -> downgrade
  return record.tier;
}

/**
 * Called from your payment webhook once a charge succeeds.
 * durationDays lets you support monthly/yearly plans.
 */
function upgradeTier(jid, tier, durationDays = 30) {
  const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
  db.set(`users.${sanitize(jid)}`, { tier, expiresAt }).write();
}

function downgradeToFree(jid) {
  db.set(`users.${sanitize(jid)}`, { tier: TIERS.FREE, expiresAt: null }).write();
}

// lowdb keys can't contain dots; JIDs look like "1234567890@s.whatsapp.net"
function sanitize(jid) {
  return jid.replace(/\./g, '_');
}

module.exports = { getTier, upgradeTier, downgradeToFree };
