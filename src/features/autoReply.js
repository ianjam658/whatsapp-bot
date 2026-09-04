// Simple keyword -> response map. Replace with a rules engine or LLM call as you grow.
const RULES = [
  { match: /^(hi|hello|hey)\b/i, reply: 'Hey! Thanks for reaching out 👋' },
  { match: /price|cost|plan/i, reply: 'Check out our plans here: [your pricing link]' },
];

async function autoReply(sock, message, text) {
  const rule = RULES.find((r) => r.match.test(text));
  if (!rule) return false;
  await sock.sendMessage(message.key.remoteJid, { text: rule.reply });
  return true;
}

module.exports = autoReply;
