const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

/**
 * Statuses arrive as messages in the special JID "status@broadcast".
 * Marking them read is enough to register a "view"; downloading media
 * is optional and only makes sense for image/video statuses.
 */
async function viewStatus(sock, statusMessage, { saveMedia = false } = {}) {
  await sock.readMessages([statusMessage.key]);

  if (!saveMedia) return null;

  const type = Object.keys(statusMessage.message || {})[0];
  if (type !== 'imageMessage' && type !== 'videoMessage') return null;

  const buffer = await downloadMediaMessage(statusMessage, 'buffer', {});
  const ext = type === 'imageMessage' ? 'jpg' : 'mp4';
  const outDir = path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'statuses');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `${statusMessage.key.id}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = viewStatus;
