import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { readConfig, writeConfig, hasSetup } from '../utils/store.js';
import { colors } from '../utils/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mod-config')
    .setDescription('View or edit moderation configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('view').setDescription('Show current settings'))
    .addSubcommand(s => s.setName('dms')
      .setDescription('Toggle DM notification for an action')
      .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true).addChoices(
        { name: 'warn', value: 'warn' },
        { name: 'kick', value: 'kick' },
        { name: 'timeout', value: 'timeout' },
        { name: 'ban', value: 'ban' },
        { name: 'unban', value: 'unban' },
      ))
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable DM for this action').setRequired(true))
    )
    .addSubcommand(s => s.setName('template')
      .setDescription('Set a DM template for an action')
      .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true).addChoices(
        { name: 'warn', value: 'warn' },
        { name: 'kick', value: 'kick' },
        { name: 'timeout', value: 'timeout' },
        { name: 'ban', value: 'ban' },
        { name: 'unban', value: 'unban' },
      ))
      .addStringOption(o => o.setName('text').setDescription('Template text (use {server}, {reason}, {duration})').setRequired(true))
    )
    .addSubcommand(s => s.setName('banner')
      .setDescription('Set the big banner image URL for setup embeds')
      .addStringOption(o => o.setName('url').setDescription('Image URL').setRequired(true))
    )
    .addSubcommand(s => s.setName('logstyle')
      .setDescription('Choose moderation log style')
      .addStringOption(o => o.setName('style').setDescription('Style').setRequired(true).addChoices(
        { name: 'compact', value: 'compact' },
        { name: 'full', value: 'full' }
      ))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });
    const cfg = readConfig(interaction.guildId);
    if (!hasSetup(cfg)) return interaction.reply({ content: 'Run `/setup-moderation` first.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'view') {
      const e = new EmbedBuilder()
        .setColor(colors.primary)
        .setTitle('Moderation Config')
        .addFields(
          { name: 'Admins', value: cfg.moderation.adminRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*' },
          { name: 'Mods', value: cfg.moderation.modRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*' },
          { name: 'Logs', value: cfg.moderation.logsChannelId ? `<#${cfg.moderation.logsChannelId}>` : '*none*' },
          { name: 'DM Notify', value: Object.entries(cfg.moderation.notify).map(([k,v]) => `${k}: ${v ? 'on' : 'off'}`).join(' • ') },
          { name: 'Log Style', value: cfg.logging.style },
          { name: 'Banner URL', value: cfg.embeds.bannerUrl || '*none*' },
        );
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    if (sub === 'dms') {
      const action = interaction.options.getString('action', true);
      const enabled = interaction.options.getBoolean('enabled', true);
      cfg.moderation.notify[action] = enabled;
      writeConfig(interaction.guildId, cfg);
      return interaction.reply({ content: `DM notify for **${action}** → **${enabled ? 'on' : 'off'}**.`, ephemeral: true });
    }

    if (sub === 'template') {
      const action = interaction.options.getString('action', true);
      const text = interaction.options.getString('text', true);
      cfg.moderation.dmTemplates[action] = text;
      writeConfig(interaction.guildId, cfg);
      return interaction.reply({ content: `Template updated for **${action}**.`, ephemeral: true });
    }

    if (sub === 'banner') {
      const url = interaction.options.getString('url', true);
      cfg.embeds.bannerUrl = url;
      writeConfig(interaction.guildId, cfg);
      return interaction.reply({ content: 'Banner URL saved.', ephemeral: true });
    }

    if (sub === 'logstyle') {
      const style = interaction.options.getString('style', true);
      cfg.logging.style = style;
      writeConfig(interaction.guildId, cfg);
      return interaction.reply({ content: `Log style → **${style}**.`, ephemeral: true });
    }
  }
};
