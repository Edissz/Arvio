import { readConfig, withDefaults } from '../utils/store.js';
import { recordJoin, applyRaidMode } from '../utils/arvio-antiraid.js';
import { sendLog } from '../utils/log.js';
import { EmbedBuilder } from 'discord.js';
import { colors } from '../utils/colors.js';

export default {
  name: 'guildMemberAdd',
  async execute(client, member) {
    const cfg = withDefaults(readConfig(member.guild.id));
    if (!cfg.antiraid.enabled) return;

    const joins = recordJoin(member.guild.id, cfg.antiraid.joins.windowSec);
    if (joins > cfg.antiraid.joins.maxJoins) {
      if (!cfg.antiraid.active && cfg.antiraid.joins.action === 'raidmode') {
        await applyRaidMode(member.guild, true);
      }
      const e = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle('<:v9:1436068886653964318> Anti-Raid: Join surge')
        .setDescription(`**${joins}** joins in **${cfg.antiraid.joins.windowSec}s**.`)
        .setTimestamp();
      await sendLog(member.guild, cfg, { embeds: [e] });
    }
  }
};
