import { readConfig, withDefaults } from '../utils/store.js';
import { recordMessage } from '../utils/arvio-antiraid.js';
import { sendLog } from '../utils/log.js';
import { EmbedBuilder } from 'discord.js';
import { colors } from '../utils/colors.js';

export default {
  name: 'messageCreate',
  async execute(client, message) {
    if (!message.guild || message.author.bot) return;

    const cfg = withDefaults(readConfig(message.guild.id));
    if (!cfg.antiraid.enabled) return;

    // very new accounts
    const minH = cfg.antiraid.newAccountMinHours;
    if (minH > 0) {
      const ageH = (Date.now() - message.author.createdTimestamp) / 3_600_000;
      if (ageH < minH) {
        await message.delete().catch(() => null);
        const e = new EmbedBuilder()
          .setColor(colors.warning)
          .setTitle('<:v9:1436068309723381942> Anti-Raid: New account blocked')
          .setDescription(`User ${message.author} (${message.author.id}) is younger than **${minH}h**.`)
          .setTimestamp();
        return sendLog(message.guild, cfg, { embeds: [e] });
      }
    }

    // spam window
    const count = recordMessage(message.guild.id, message.author.id, cfg.antiraid.spam.windowSec);
    if (count > cfg.antiraid.spam.maxMsgs) {
      if (cfg.antiraid.spam.action === 'timeout' && message.member?.moderatable) {
        await message.member.timeout(cfg.antiraid.spam.timeoutMinutes * 60 * 1000, 'Anti-Raid spam').catch(() => null);
      }
      const e = new EmbedBuilder()
        .setColor(colors.danger)
        .setTitle('<:v9:1436068886653964318> Anti-Raid: Spam tripped')
        .setDescription(`User ${message.author} sent **${count}** msgs in **${cfg.antiraid.spam.windowSec}s**.`)
        .addFields({ name: 'Action', value: `${cfg.antiraid.spam.action} (${cfg.antiraid.spam.timeoutMinutes}m timeout)` })
        .setTimestamp();
      await sendLog(message.guild, cfg, { embeds: [e] });
    }
  }
};
