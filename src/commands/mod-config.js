import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { colors } from '../utils/colors.js';
import { readConfig, mergeConfig, hasSetup } from '../utils/store.js';
import { isOwnerOrManager } from '../utils/perm.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mod-config')
    .setDescription('Edit moderation configuration.')
    .addSubcommand(sc => sc
      .setName('toggle-dms')
      .setDescription('Enable/disable user DMs for punishments.')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable DMs?').setRequired(true)))
    .addSubcommand(sc => sc
      .setName('set-theme')
      .setDescription('Set theme color for moderation embeds.')
      .addStringOption(o => o.setName('theme').setDescription('Theme name').setRequired(true)
        .addChoices(
          { name: 'primary', value: 'primary' },
          { name: 'secondary', value: 'secondary' },
          { name: 'accent', value: 'accent' },
          { name: 'neutral', value: 'neutral' }
        )))
    .addSubcommand(sc => sc
      .setName('set-banner')
      .setDescription('Set banner image URL shown in setup/announcements.')
      .addStringOption(o => o.setName('url').setDescription('Image URL').setRequired(true)))
    .addSubcommand(sc => sc
      .setName('set-templates')
      .setDescription('Customize DM templates.')
      .addStringOption(o => o.setName('warn').setDescription('Warn template'))
      .addStringOption(o => o.setName('timeout').setDescription('Timeout template'))
      .addStringOption(o => o.setName('softban').setDescription('Softban template'))
      .addStringOption(o => o.setName('ban').setDescription('Ban template'))
      .addStringOption(o => o.setName('kick').setDescription('Kick template'))),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });
    if (!isOwnerOrManager(interaction.member)) return interaction.reply({ content: 'Owner/manager only.', ephemeral: true });

    const cfg = readConfig(interaction.guildId);
    if (!hasSetup(cfg)) return interaction.reply({ content: 'Run `/setup-moderation` first.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'toggle-dms') {
      const enabled = interaction.options.getBoolean('enabled', true);
      const next = mergeConfig(interaction.guildId, { moderation: { settings: { ...(cfg.moderation.settings || {}), dmsEnabled: enabled } } });
      const e = new EmbedBuilder().setColor(enabled ? colors.success : colors.warning).setDescription(`DMs **${enabled ? 'enabled' : 'disabled'}**.`);
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    if (sub === 'set-theme') {
      const theme = interaction.options.getString('theme', true);
      const next = mergeConfig(interaction.guildId, { moderation: { settings: { ...(cfg.moderation.settings || {}), theme } } });
      const e = new EmbedBuilder().setColor(colors[theme] ?? colors.primary).setDescription(`Theme set to **${theme}**.`);
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    if (sub === 'set-banner') {
      const url = interaction.options.getString('url', true);
      const next = mergeConfig(interaction.guildId, { moderation: { bannerUrl: url } });
      const e = new EmbedBuilder().setColor(colors.info).setDescription('Banner updated.').setImage(url);
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    if (sub === 'set-templates') {
      const dmTemplates = { ...(cfg.moderation.dmTemplates || {}) };
      for (const key of ['warn','timeout','softban','ban','kick']) {
        const val = interaction.options.getString(key);
        if (val) dmTemplates[key] = val;
      }
      mergeConfig(interaction.guildId, { moderation: { dmTemplates } });
      const e = new EmbedBuilder().setColor(colors.success).setTitle('DM templates updated').setDescription(Object.entries(dmTemplates).map(([k,v]) => `**${k}:** ${v}`).join('\n'));
      return interaction.reply({ embeds: [e], ephemeral: true });
    }
  }
};
