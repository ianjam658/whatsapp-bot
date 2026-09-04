function extractText(message) {
  const m = message.message;
  if (!m) return '[no content — media, reaction, or system message]';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    '[unsupported message type]'
  );
}

function viewMessage(message) {
  const from = message.key.remoteJid;
  const text = extractText(message);
  console.log(`[message] ${from}: ${text}`);
  // Hook point: persist to your DB here if you want message history in a dashboard.
  return { from, text, timestamp: message.messageTimestamp };
}

module.exports = viewMessage;
