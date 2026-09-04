async function reactToMessage(sock, message, emoji = '👍') {
  const key = message.key;
  await sock.sendMessage(key.remoteJid, {
    react: { text: emoji, key },
  });
}

module.exports = reactToMessage;
