import {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder
} from 'discord.js';
import { colors } from '../utils/colors.js';
import { readConfig, writeConfig, hasSetup, mergeConfig } from '../utils/store.js';
import { isOwnerOrManager } from '../utils/perm.js';

const IMG = 'https://cdn.discordapp.com/attachments/1435646523584024697/1436355551918424190/Blue_White_Gradient_Modern_Professional_Business_General_LinkedIn_Banner_5.png?ex=690f4dd9&is=690dfc59&hm=c98e4b630278e50af584111aa404582408d166a212a55aa1a11a8b4fc891eca9';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-moderation')
    .setDescription('Interactive setup for Arvio’s moderation system.'),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use this in a server.', ephemeral: true });
    if (!isOwnerOrManager(interaction.member)) {
      return interaction.reply({ content: '<:v7:1435698081399308420> Oops, Only the server owner or managers can run setup.', ephemeral: true });
    }

    const intro1 = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle('<:0v1:1435651055944994927> Setup Moderation System')
      .setDescription('Configure Arvio’s moderation system to keep your server organized and safe.')
      .setImage(IMG)
      .setFooter({
        text: 'Arvio - Smart moderation and AI tools for your community.',
        iconURL: interaction.client.user.displayAvatarURL()
      });

    const intro2 = new EmbedBuilder()
      .setColor(colors.neutral ?? 0x2b2d31)
      .setDescription([
        'You’ll select moderator and admin roles, choose a logs channel, and customize user DM, theme, and banner settings.',
        '',
        'Need help or want advanced AI moderation? Check the [support article](https://example.com).',
        '',
        'Once finished, you can adjust settings anytime with `/mod-config`.'
      ].join('\n'));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('arvio_setup_start')
        .setLabel('Start Setup')
        .setEmoji('<:0v2:1435691438171095232>')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('arvio_setup_auto')
        .setLabel('Auto-detect Roles')
        .setEmoji('<:v3:1435691439345635499>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('arvio_setup_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [intro1, intro2], components: [row], ephemeral: true });

    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    const state = {
      guildId: interaction.guildId,
      mods: [],
      admins: [],
      logs: null,
      prefs: { dmsEnabled: true, logStyle: 'compact', theme: 'primary', bannerUrl: IMG }
    };

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: 'Only the setup starter can use these controls.', ephemeral: true });

      if (i.customId === 'arvio_setup_cancel') {
        collector.stop('cancel');
        return i.update({ content: 'Setup cancelled.', embeds: [], components: [] });
      }

      if (i.customId === 'arvio_setup_auto') {
        const roles = await interaction.guild.roles.fetch();
        const guessedAdmins = roles.filter(r => r.permissions.has('Administrator')).map(r => r.id);
        const guessedMods = roles.filter(r =>
          !r.permissions.has('Administrator') &&
          r.permissions.any(['KickMembers', 'BanMembers', 'ModerateMembers'])
        ).map(r => r.id);

        state.admins = guessedAdmins.slice(0, 5);
        state.mods = guessedMods.slice(0, 5);

        const e = new EmbedBuilder()
          .setColor(colors.accent)
          .setTitle('<:v6:1435697974431977522> Auto-detected Roles Found')
          .setDescription([
            `**Admins:** ${state.admins.length ? state.admins.map(id => `<@&${id}>`).join(', ') : '*none found*'}`,
            `**Moderators:** ${state.mods.length ? state.mods.map(id => `<@&${id}>`).join(', ') : '*none found*'}`,
            '',
            'Next, choose a **logs channel** below.'
          ].join('\n'));

        const pickLogs = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId('arvio_pick_logs')
            .setPlaceholder('Pick a channel for moderation logs')
            .setChannelTypes(ChannelType.GuildText)
            .setMaxValues(1)
        );

        return i.update({ embeds: [e], components: [pickLogs] });
      }

      if (i.customId === 'arvio_setup_start') {
        const askMods = new EmbedBuilder()
          .setColor(colors.secondary)
          .setTitle('Step 1 — Select Moderator Roles')
          .setDescription('Choose roles that can **warn**, **timeout**, or **soft-ban** members.');

        const row1 = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId('arvio_pick_mods')
            .setPlaceholder('Select moderator roles')
            .setMinValues(1)
            .setMaxValues(5)
        );

        const askAdmins = new EmbedBuilder()
          .setColor(colors.accent)
          .setTitle('Step 2 — Select Admin Roles')
          .setDescription('Choose roles that can **ban**, **unban**, and manage moderation settings.');

        const row2 = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId('arvio_pick_admins')
            .setPlaceholder('Select admin roles')
            .setMinValues(1)
            .setMaxValues(5)
        );

        return i.update({ embeds: [askMods, askAdmins], components: [row1, row2] });
      }

      if (i.customId === 'arvio_pick_mods') {
        state.mods = i.values;
        return i.reply({ content: `Moderators set: ${state.mods.map(id => `<@&${id}>`).join(', ')}`, ephemeral: true });
      }

      if (i.customId === 'arvio_pick_admins') {
        state.admins = i.values;

        const askLogs = new EmbedBuilder()
          .setColor(colors.success)
          .setTitle('Step 3 — Pick Logs Channel')
          .setDescription('Select the text channel where all **moderation logs** will be sent.');

        const row3 = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId('arvio_pick_logs')
            .setPlaceholder('Select logs channel')
            .setChannelTypes(ChannelType.GuildText)
            .setMaxValues(1)
        );

        return i.update({ embeds: [askLogs], components: [row3] });
      }

      if (i.customId === 'arvio_pick_logs') {
        state.logs = i.values[0];

        const prefs = new EmbedBuilder()
          .setColor(colors.primary)
          .setTitle('Step 4 — Preferences')
          .setDescription('Toggle DMs, choose log style & theme. You can change these later with `/mod-config`.')
          .addFields(
            { name: 'DMs', value: state.prefs.dmsEnabled ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Log Style', value: state.prefs.logStyle, inline: true },
            { name: 'Theme', value: state.prefs.theme, inline: true }
          );

        const selects = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('arvio_pref_dm')
            .setPlaceholder('DM notifications')
            .addOptions([
              { label: 'Enable DMs', value: 'on' },
              { label: 'Disable DMs', value: 'off' }
            ])
        );

        const selects2 = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('arvio_pref_logstyle')
            .setPlaceholder('Select log style')
            .addOptions([
              { label: 'Compact', value: 'compact' },
              { label: 'Detailed', value: 'detailed' }
            ])
        );

        const selects3 = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('arvio_pref_theme')
            .setPlaceholder('Theme color')
            .addOptions([
              { label: 'Primary (mint)', value: 'primary' },
              { label: 'Secondary (purple)', value: 'secondary' },
              { label: 'Accent (yellow)', value: 'accent' },
              { label: 'Neutral (off white)', value: 'neutral' }
            ])
        );

        const finishRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('arvio_finish_ok').setLabel('Finish Setup').setStyle(ButtonStyle.Success)
        );

        return i.update({ embeds: [prefs], components: [selects, selects2, selects3, finishRow] });
      }

      // Handle Preference Changes
      if (i.customId === 'arvio_pref_dm') {
        state.prefs.dmsEnabled = i.values[0] === 'on';
        return i.reply({ content: `DMs ${state.prefs.dmsEnabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
      }

      if (i.customId === 'arvio_pref_logstyle') {
        state.prefs.logStyle = i.values[0];
        return i.reply({ content: `Log style set to ${state.prefs.logStyle}.`, ephemeral: true });
      }

      if (i.customId === 'arvio_pref_theme') {
        state.prefs.theme = i.values[0];
        return i.reply({ content: `Theme set to ${state.prefs.theme}.`, ephemeral: true });
      }

      // Finish Setup
      if (i.customId === 'arvio_finish_ok') {
        const cfg = readConfig(state.guildId);
        cfg.moderation = {
          ...(cfg.moderation || {}),
          modRoleIds: state.mods,
          adminRoleIds: state.admins,
          logsChannelId: state.logs,
          settings: state.prefs,
          dmTemplates: {
            warn: 'You have been **warned** in {server}. Reason: {reason}',
            timeout: 'You have been **timed out** in {server} for {duration}. Reason: {reason}',
            softban: 'You have been **soft-banned** in {server}. Reason: {reason}',
            ban: 'You have been **banned** in {server}. Reason: {reason}',
            kick: 'You have been **kicked** from {server}. Reason: {reason}'
          },
          bannerUrl: state.prefs.bannerUrl || IMG
        };
        writeConfig(state.guildId, cfg);

        const done = new EmbedBuilder()
          .setColor(colors[state.prefs.theme] ?? colors.primary)
          .setTitle('<:v6:1435697974431977522> Moderation Setup Complete')
          .setImage(IMG)
          .setDescription([
            `**Admins:** ${cfg.moderation.adminRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*'}`,
            `**Moderators:** ${cfg.moderation.modRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*'}`,
            `**Logs:** <#${cfg.moderation.logsChannelId}>`,
            `**DMs:** ${cfg.moderation.settings.dmsEnabled ? 'Enabled' : 'Disabled'}`,
            `**Log Style:** ${cfg.moderation.settings.logStyle}`,
            `**Theme:** ${cfg.moderation.settings.theme}`,
            '',
            'Use `/mod-config` anytime to update templates, banner, or theme.'
          ].join('\n'));

        await i.update({ embeds: [done], components: [] });
        collector.stop('done');
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        try {
          await interaction.editReply({
            content: 'Setup timed out. Run `/setup-moderation` again.',
            embeds: [],
            components: []
          });
        } catch {}
      }
    });
  }
};
