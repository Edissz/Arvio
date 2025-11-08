import { withDefaults, readConfig, writeConfig } from './store.js';
import { sendLog } from './log.js';
import { EmbedBuilder, ChannelType } from 'discord.js';
import { colors } from './colors.js';

const msgBuckets = new Map(); 
const joinBuckets = new Map(); 
const now = () => Date.now();

export function recordMessage(guildId, userId, windowSec) {
  const g = msgBuckets.get(guildId) ?? new Map();
  msgBuckets.set(guildId, g);
  const arr = g.get(userId) ?? [];
  const cut = now() - windowSec * 1000;
  const pruned = arr.filter(t => t >= cut);
  pruned.push(now());
  g.set(userId, pruned);
  return pruned.length;
}

export function recordJoin(guildId, windowSec) {
  const arr = joinBuckets.get(guildId) ?? [];
  const cut = now() - windowSec * 1000;
  const pruned = arr.filter(t => t >= cut);
  pruned.push(now());
  joinBuckets.set(guildId, pruned);
  return pruned.length;
}

export async function applyRaidMode(guild, enable) {
  const cfg = withDefaults(readConfig(guild.id));
  cfg.antiraid.active = enable;
  writeConfig(guild.id, cfg);

  const slow = enable ? cfg.antiraid.raidmode.slowmodeSec : 0;
  const tasks = [];

  for (const [, ch] of guild.channels.cache) {
    if (ch?.type !== ChannelType.GuildText) continue;

    if (ch.rateLimitPerUser !== slow) {
      tasks.push(ch.setRateLimitPerUser(slow).catch(() => null));
    }

    if (cfg.antiraid.raidmode.lockdown && enable) {
      tasks.push(
        ch.permissionOverwrites
          .create(guild.roles.everyone, { SendMessages: false }, { reason: 'Anti-Raid Lockdown' })
          .catch(() => null)
      );
    }
    if (cfg.antiraid.raidmode.lockdown && !enable) {
      tasks.push(
        ch.permissionOverwrites
          .delete(guild.roles.everyone, 'End Anti-Raid Lockdown')
          .catch(() => null)
      );
    }
  }
  await Promise.all(tasks);

  const e = new EmbedBuilder()
    .setColor(enable ? (colors.warning ?? colors.accent) : colors.success)
    .setTitle(enable ? '<:v9:1436068886653964318> RaidMode: ENABLED' : '<:v9:1436068886653964318> RaidMode: DISABLED')
    .setDescription(
      enable
        ? `Applied slowmode **${slow}s**${cfg.antiraid.raidmode.lockdown ? ' + lockdown' : ''} to text channels.`
        : 'Slowmode reset and lockdown lifted.'
    )
    .setTimestamp();

  await sendLog(guild, cfg, { embeds: [e] });
}
