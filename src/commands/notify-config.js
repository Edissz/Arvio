import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { readConfig, writeConfig } from '../utils/store.js';
import { colors } from '../utils/colors.js';

const TEMPLATES = ['warn','timeout','kick','softban','ban'];

export default {
  data: new SlashCommandBuilder()
    .setName('notify-config')
    .setDescription('View or edit user DM templates for moderation actions.')
    .addSubcommand(s =>
      s.setName('view')
       .setDescription('Show current templates'))
    .addSubcommand(s =>
      s.setName('set')
       .setDescription('Set a specific template')
       .addStringOption(o => o.setName('template').setDescription('Which').setRequired(true).addChoices(
         ...TEMPLATES.map(t => ({ name: t, value: t }))
       ))
       .addStringOption(o => o.setName('value').setDescription('Template text with {server}, {reason}, {duration}').setRequired(true)))
    .addSubcommand(s =>
      s.setName('reset')
       .setDescription('Reset a template or all')
       .addStringOption(o => o.setName('template').setDescription('Which (or leave empty for all)').addChoices(
         ...TEMPLATES.map(t => ({ name: t, value: t }))
       ))),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });

    const guildId = interaction.guildId;
    const cfg = readConfig(guildId);
    cfg.moderation = cfg.moderation || {};
    cfg.moderation.dmTemplates = cfg.moderation.dmTemplates || {};

    const sub = interaction.options.getSubcommand();

    if (sub === 'view') {
      const t = cfg.moderation.dmTemplates;
      const e = new EmbedBuilder()
        .setColor(colors.info)
        .setTitle('DM Templates')
        .setDescription([
          `**warn**: ${t.warn || 'You have been **warned** in {server}. Reason: {reason}'}`,
          `**timeout**: ${t.timeout || 'You have been **timed out** in {server} for {duration}. Reason: {reason}'}`,
          `**kick**: ${t.kick || 'You have been **kicked** from {server}. Reason: {reason}'}`,
          `**softban**: ${t.softban || 'You have been **soft-banned** in {server}. Reason: {reason}'}`,
          `**ban**: ${t.ban || 'You have been **banned** from {server}. Reason: {reason}'}`
        ].join('\n'));
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    if (sub === 'set') {
      const key = interaction.options.getString('template', true);
      const value = interaction.options.getString('value', true);
      cfg.moderation.dmTemplates[key] = value;
      writeConfig(guildId, cfg);
      return interaction.reply({ content: `Saved \`${key}\` template.`, ephemeral: true });
    }

    if (sub === 'reset') {
      const key = interaction.options.getString('template');
      if (key) {
        delete cfg.moderation.dmTemplates[key];
      } else {
        cfg.moderation.dmTemplates = {};
      }
      writeConfig(guildId, cfg);
      return interaction.reply({ content: key ? `Reset \`${key}\`.` : 'Reset all templates.', ephemeral: true });
    }
  }
};
