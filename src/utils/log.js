export async function sendLog(guild, cfg, payload) {
  const id = cfg?.moderation?.logsChannelId;
  if (!id) return;
  const ch = guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
  if (!ch) return;
  return ch.send(payload).catch(() => null);
}
