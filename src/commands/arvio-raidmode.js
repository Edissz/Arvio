import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { readConfig, writeConfig, withDefaults } from '../utils/store.js';
import { isOwnerOrManager } from '../utils/perm.js';
import { colors } from '../utils/colors.js';
import { applyRaidMode } from '../utils/arvio-antiraid.js';

export default {
  data: new SlashCommandBuilder()
    .setName('raidmode')
    .setDescription('Turn Anti-Raid mode on/off or check status.')
    .addSubcommand(s => s.setName('on')
      .setDescription('Enable raid mode (slowmode + optional lockdown).')
      .addIntegerOption(o => o.setName('slowmode_sec').setDescription('Slowmode seconds (0-120, default 5)').setMinValue(0).setMaxValue(120))
      .addBooleanOption(o => o.setName('lockdown').setDescription('Also deny Send Messages for @everyone')))
    .addSubcommand(s => s.setName('off').setDescription('Disable raid mode.'))
    .addSubcommand(s => s.setName('status').setDescription('Show current raid mode status.')),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });
    if (!isOwnerOrManager(interaction.member)) {
      return interaction.reply({ content: '<:v7:1435698081399308420> Only owner/managers can use this.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const raw = readConfig(interaction.guildId);
    const cfg = withDefaults(raw);

    if (sub === 'status') {
      const e = new EmbedBuilder()
        .setColor(cfg.antiraid.active ? colors.warning : colors.success)
        .setTitle('<:v9:1436068309723381942> RaidMode Status')
        .addFields(
          { name: 'Active', value: String(!!cfg.antiraid.active), inline: true },
          { name: 'Slowmode', value: `${cfg.antiraid.raidmode.slowmodeSec}s`, inline: true },
          { name: 'Lockdown', value: String(!!cfg.antiraid.raidmode.lockdown), inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    if (sub === 'on') {
      const sm = interaction.options.getInteger('slowmode_sec') ?? cfg.antiraid.raidmode.slowmodeSec;
      const lock = interaction.options.getBoolean('lockdown');
      cfg.antiraid.raidmode.slowmodeSec = Math.max(0, Math.min(120, sm));
      if (lock !== null && lock !== undefined) cfg.antiraid.raidmode.lockdown = !!lock;
      writeConfig(interaction.guildId, cfg);

      await applyRaidMode(interaction.guild, true);
      return interaction.reply({
        content: `<:v9:1436068886653964318> RaidMode **ON** — slowmode **${cfg.antiraid.raidmode.slowmodeSec}s**${cfg.antiraid.raidmode.lockdown ? ' + lockdown' : ''}.`,
        ephemeral: true
      });
    }

    if (sub === 'off') {
      await applyRaidMode(interaction.guild, false);
      return interaction.reply({ content: '<:v6:1435697974431977522> RaidMode **OFF**.', ephemeral: true });
    }
  }
};
