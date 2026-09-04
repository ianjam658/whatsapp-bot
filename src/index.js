require('dotenv').config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

const { hasAccess } = require('./config/tiers');
const { getTier } = require('./services/subscriptionService');
const reactToMessage = require('./features/reactToMessage');
const viewMessage = require('./features/viewMessages');
const viewStatus = require('./features/viewStatus');
const autoReply = require('./features/autoReply');

const SESSION_NAME = process.env.SESSION_NAME || 'default-session';
const DATA_DIR = process.env.DATA_DIR || '.';
// Set PHONE_NUMBER (with country code, digits only, e.g. 254712345678) to
// get a numeric pairing code instead of a QR image — enter it in WhatsApp
// under Settings > Linked Devices > Link with phone number instead.
const PHONE_NUMBER = process.env.PHONE_NUMBER;

async function gatedRun(userJid, featureName, fn) {
  const tier = getTier(userJid);
  if (!hasAccess(tier, featureName)) {
    console.log(`[locked] "${featureName}" is not available on the "${tier}" plan for ${userJid}`);
    return;
  }
  return fn();
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(`${DATA_DIR}/auth/${SESSION_NAME}`);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    // Suppress Baileys' own QR printing when we're doing pairing-code login
    printQRInTerminal: !PHONE_NUMBER,
  });

  // Pairing code can only be requested once, after the socket exists and
  // before the connection is registered (i.e. no saved creds yet).
  if (PHONE_NUMBER && !sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(PHONE_NUMBER);
    console.log(`\nPairing code: ${code}`);
    console.log('On the phone: WhatsApp > Settings > Linked Devices > Link a device > Link with phone number instead\n');
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && !PHONE_NUMBER) {
      console.log('Scan this QR code with the subscriber\'s WhatsApp:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed.', shouldReconnect ? 'Reconnecting…' : 'Logged out.');
      if (shouldReconnect) start();
    } else if (connection === 'open') {
      console.log(`Connected: ${SESSION_NAME}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;
      const jid = message.key.remoteJid;

      // Statuses arrive on a dedicated broadcast JID
      if (jid === 'status@broadcast') {
        await gatedRun(jid, 'viewStatus', () => viewStatus(sock, message, { saveMedia: true }));
        continue;
      }

      // Free-tier: every message gets logged
      const seen = await gatedRun(jid, 'viewMessages', () => viewMessage(message));

      // Free-tier: react to acknowledge receipt
      await gatedRun(jid, 'reactToMessage', () => reactToMessage(sock, message, '👀'));

      // Pro-tier: keyword auto-reply
      if (seen?.text) {
        await gatedRun(jid, 'autoReply', () => autoReply(sock, message, seen.text));
      }
    }
  });
}

start().catch((err) => console.error('Fatal error starting bot:', err));

module.exports = { start };
