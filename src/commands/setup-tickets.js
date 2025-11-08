import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { colors } from '../utils/colors.js';
import { readConfig, writeConfig } from '../utils/store.js';
import { isOwnerOrManager } from '../utils/perm.js';
import { EMOJI } from '../utils/emoji.js';

const SETUP_BANNER = 'https://cdn.discordapp.com/attachments/1435674664859861163/1436368881122938961/Blue_White_Gradient_Modern_Professional_Business_General_LinkedIn_Banner_7.png?ex=690f5a43&is=690e08c3&hm=8043c1e42b7f141f53acd689f88902525192cc235fab359ace75fc9a6807c99b';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-tickets')
    .setDescription('Guided setup for Arvio tickets'),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use this in a server.', ephemeral: true });
    if (!isOwnerOrManager(interaction.member)) return interaction.reply({ content: `${EMOJI.error} Only the server owner or managers can run this.`, ephemeral: true });

    const cfg = readConfig(interaction.guildId) || {};
    cfg.tickets = cfg.tickets || {};

    const state = {
      guildId: interaction.guildId,
      managerRoleIds: cfg.tickets.managerRoleIds || [],
      staffRoleIds: cfg.tickets.staffRoleIds || [],
      pingRoleIds: cfg.tickets.pingRoleIds || [],
      categoryId: cfg.tickets.categoryId || null,
      logsChannelId: cfg.tickets.logsChannelId || null,
      transcriptChannelId: cfg.tickets.transcriptChannelId || null,
      dmsEnabled: cfg.tickets.dmsEnabled ?? true,
      claimLock: cfg.tickets.claim?.lockOnClaim ?? true,
      style: cfg.tickets.style || 'buttons',
      channelNamePattern: cfg.tickets.channelNamePattern || 'ticket-${number}-${user}',
      panel: {
        title: cfg.tickets.panel?.title || 'Support Tickets',
        description: cfg.tickets.panel?.description || 'Select a ticket type to begin.',
        footerIcon: cfg.tickets.panel?.footerIcon || null,
        largeImageUrl: cfg.tickets.panel?.largeImageUrl || null,
        selectPlaceholder: cfg.tickets.panel?.selectPlaceholder || 'Choose a ticket type',
        options: Array.isArray(cfg.tickets.panel?.options) ? cfg.tickets.panel.options : []
      },
      buttons: {
        claim: { label: cfg.tickets.buttons?.claim?.label || 'Claim', emoji: cfg.tickets.buttons?.claim?.emoji || EMOJI.search },
        hold: { label: cfg.tickets.buttons?.hold?.label || 'Hold', emoji: cfg.tickets.buttons?.hold?.emoji || '⏸️' },
        close: { label: cfg.tickets.buttons?.close?.label || 'Close', emoji: cfg.tickets.buttons?.close?.emoji || '🔒' }
      }
    };

    const intro1 = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle(`${EMOJI.logo} Ticket System Setup`)
      .setDescription([
        'Private guided configuration for your server.',
        '',
        'You will set roles, channels, style, panel design, options, DMs, transcripts, and behavior.',
        'Only you can see this flow.'
      ].join('\n'))
      .setImage(SETUP_BANNER)
      .setFooter({ text: 'Arvio • Tickets', iconURL: interaction.client.user.displayAvatarURL() });

    const intro2 = new EmbedBuilder()
      .setColor(colors.neutral ?? 0x2b2d31)
      .setTitle(`${EMOJI.logoSmall} Steps`)
      .setDescription([
        '• Roles: Managers, Staff, Ping',
        '• Channels: Category, Logs, Transcripts',
        '• Style: Buttons or Select Menu',
        '• Panel: Title, Description, Placeholder, Image (optional)',
        '• Options: Key, Label, Description, Emoji',
        '• Behavior: DMs, Claim Lock, Channel Pattern'
      ].join('\n'));

    const baseRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('t_setup_start').setLabel('Start').setEmoji('<:0v2:1435691438171095232>').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('t_setup_auto').setLabel('Auto-detect').setEmoji(EMOJI.search).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('t_setup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [intro1, intro2], components: [baseRow], ephemeral: true });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 15 * 60 * 1000 });

    const summaryEmbed = () =>
      new EmbedBuilder()
        .setColor(colors.info)
        .setTitle(`${EMOJI.logoSmall} Summary`)
        .addFields(
          { name: 'Managers', value: state.managerRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*', inline: true },
          { name: 'Staff', value: state.staffRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*', inline: true },
          { name: 'Ping', value: state.pingRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*', inline: true },
          { name: 'Category', value: state.categoryId ? `<#${state.categoryId}>` : '*none*', inline: true },
          { name: 'Logs', value: state.logsChannelId ? `<#${state.logsChannelId}>` : '*none*', inline: true },
          { name: 'Transcripts', value: state.transcriptChannelId ? `<#${state.transcriptChannelId}>` : '*none*', inline: true },
          { name: 'Style', value: state.style, inline: true },
          { name: 'DMs', value: state.dmsEnabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Claim Lock', value: state.claimLock ? 'On' : 'Off', inline: true },
          { name: 'Pattern', value: '`' + state.channelNamePattern + '`' }
        );

    const showRoles = async i => {
      const e = new EmbedBuilder()
        .setColor(colors.secondary)
        .setTitle(`${EMOJI.ticket} Step 1 — Roles`)
        .setDescription('Choose Manager, Staff, and optional Ping roles.');

      const r1 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('t_roles_manager').setPlaceholder('Select Manager roles').setMinValues(1).setMaxValues(5)
      );
      const r2 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('t_roles_staff').setPlaceholder('Select Staff roles').setMinValues(0).setMaxValues(10)
      );
      const r3 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('t_roles_ping').setPlaceholder('Select Ping roles').setMinValues(0).setMaxValues(10)
      );
      const next = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_next_channels').setLabel('Next: Channels').setEmoji('<:0v2:1435691438171095232>').setStyle(ButtonStyle.Primary)
      );
      await i.update({ embeds: [e, summaryEmbed()], components: [r1, r2, r3, next] });
    };

    const showChannels = async i => {
      const e = new EmbedBuilder()
        .setColor(colors.accent)
        .setTitle(`${EMOJI.logoSmall} Step 2 — Channels`)
        .setDescription('Select Category for tickets, a Logs channel, and a Transcripts channel.');

      const c1 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('t_ch_category').setPlaceholder('Select Ticket Category').setChannelTypes(ChannelType.GuildCategory).setMaxValues(1)
      );
      const c2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('t_ch_logs').setPlaceholder('Select Logs Channel').setChannelTypes(ChannelType.GuildText).setMaxValues(1)
      );
      const c3 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('t_ch_trans').setPlaceholder('Select Transcripts Channel').setChannelTypes(ChannelType.GuildText).setMaxValues(1)
      );
      const next = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_next_style').setLabel('Next: Style & Prefs').setEmoji('<:0v2:1435691438171095232>').setStyle(ButtonStyle.Primary)
      );
      await i.update({ embeds: [e, summaryEmbed()], components: [c1, c2, c3, next] });
    };

    const showStyle = async i => {
      const e = new EmbedBuilder()
        .setColor(colors.primary)
        .setTitle(`${EMOJI.logo} Step 3 — Style & Preferences`)
        .setDescription('Pick panel style and toggle core behaviors.');

      const s1 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('t_sel_style')
          .setPlaceholder('Select opening style')
          .addOptions(
            { label: 'Buttons', value: 'buttons', emoji: '<:0v2:1435691438171095232>' },
            { label: 'Select Menu', value: 'select', emoji: '<:0v2:1435691438171095232>' }
          )
      );
      const s2 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('t_sel_prefs')
          .setPlaceholder('Toggle behavior')
          .addOptions(
            { label: 'DMs: Enable', value: 'dm_on', emoji: '📩' },
            { label: 'DMs: Disable', value: 'dm_off', emoji: '🔕' },
            { label: 'Claim Lock: On', value: 'lock_on', emoji: '🔒' },
            { label: 'Claim Lock: Off', value: 'lock_off', emoji: '🔓' }
          )
      );
      const s3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_panel_design').setLabel('Panel Text Settings').setEmoji(EMOJI.ticket).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('t_pattern_edit').setLabel('Channel Pattern').setEmoji('🔤').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('t_next_options').setLabel('Next: Options').setEmoji('<:0v2:1435691438171095232>').setStyle(ButtonStyle.Primary)
      );
      await i.update({ embeds: [e, summaryEmbed()], components: [s1, s2, s3] });
    };

    const showOptions = async i => {
      const e = new EmbedBuilder()
        .setColor(colors.info)
        .setTitle(`${EMOJI.logoSmall} Step 4 — Options`)
        .setDescription('Create the choices users will see on the panel.');

      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_opt_add').setLabel('Add Option').setEmoji('➕').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('t_btns_edit').setLabel('Buttons Text/Emoji').setEmoji('🎛️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('t_finish_save').setLabel('Save & Finish').setEmoji(EMOJI.check).setStyle(ButtonStyle.Success)
      );
      const list = new EmbedBuilder()
        .setColor(colors.neutral ?? 0x2b2d31)
        .setTitle(`${EMOJI.search} Current Options`)
        .setDescription(state.panel.options.length
          ? state.panel.options.map(o => `• **${o.label}** \`${o.key}\`${o.emoji ? ` ${o.emoji}` : ''}${o.description ? ` — ${o.description.slice(0,80)}` : ''}`).join('\n')
          : '*none*');
      await i.update({ embeds: [e, list, summaryEmbed()], components: [controls] });
    };

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'Only the setup starter can use this.', ephemeral: true });

      if (i.customId === 't_setup_cancel') {
        collector.stop('cancel');
        return i.update({ content: 'Ticket setup cancelled.', embeds: [], components: [] });
      }

      if (i.customId === 't_setup_auto') {
        const roles = await interaction.guild.roles.fetch();
        state.managerRoleIds = roles.filter(r => r.permissions.has('ManageGuild') || r.permissions.has('Administrator')).map(r => r.id).slice(0, 5);
        state.staffRoleIds = roles.filter(r => !state.managerRoleIds.includes(r.id) && r.permissions.any(['KickMembers', 'BanMembers', 'ModerateMembers'])).map(r => r.id).slice(0, 10);
        const e = new EmbedBuilder().setColor(colors.accent).setTitle(`${EMOJI.check} Auto-detected`).setDescription('Managers and Staff prefilled. Continue to Channels.');
        const next = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('t_next_channels').setLabel('Next: Channels').setEmoji('<:0v2:1435691438171095232>').setStyle(ButtonStyle.Primary));
        return i.update({ embeds: [e, summaryEmbed()], components: [next] });
      }

      if (i.customId === 't_setup_start') return showRoles(i);
      if (i.customId === 't_next_channels') return showChannels(i);
      if (i.customId === 't_next_style') return showStyle(i);
      if (i.customId === 't_next_options') return showOptions(i);

      if (i.customId === 't_roles_manager') { state.managerRoleIds = i.values; return i.reply({ content: `${EMOJI.check} Managers set.`, ephemeral: true }); }
      if (i.customId === 't_roles_staff') { state.staffRoleIds = i.values; return i.reply({ content: `${EMOJI.check} Staff set.`, ephemeral: true }); }
      if (i.customId === 't_roles_ping') { state.pingRoleIds = i.values; return i.reply({ content: `${EMOJI.check} Ping roles set.`, ephemeral: true }); }

      if (i.customId === 't_ch_category') { state.categoryId = i.values[0]; return i.reply({ content: 'Category selected.', ephemeral: true }); }
      if (i.customId === 't_ch_logs') { state.logsChannelId = i.values[0]; return i.reply({ content: 'Logs channel selected.', ephemeral: true }); }
      if (i.customId === 't_ch_trans') { state.transcriptChannelId = i.values[0]; return i.reply({ content: 'Transcripts channel selected.', ephemeral: true }); }

      if (i.customId === 't_sel_style') { state.style = i.values[0]; return i.reply({ content: `Style set to ${state.style}.`, ephemeral: true }); }
      if (i.customId === 't_sel_prefs') {
        for (const v of i.values) {
          if (v === 'dm_on') state.dmsEnabled = true;
          if (v === 'dm_off') state.dmsEnabled = false;
          if (v === 'lock_on') state.claimLock = true;
          if (v === 'lock_off') state.claimLock = false;
        }
        return i.reply({ content: 'Preferences updated.', ephemeral: true });
      }

      if (i.customId === 't_panel_design') {
        const m = new ModalBuilder().setCustomId('t_modal_design').setTitle('Panel Design')
          .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Panel Title').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.panel.title || '')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Panel Description').setRequired(false).setStyle(TextInputStyle.Paragraph).setValue(state.panel.description || '')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('Large Image URL (optional)').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.panel.largeImageUrl || '')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('footer').setLabel('Footer Icon URL (optional)').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.panel.footerIcon || '')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('placeholder').setLabel('Select Placeholder').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.panel.selectPlaceholder || ''))
          );
        return i.showModal(m);
      }

      if (i.customId === 't_pattern_edit') {
        const m = new ModalBuilder().setCustomId('t_modal_pattern').setTitle('Channel Name Pattern')
          .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pattern').setLabel('Pattern').setPlaceholder('ticket-${number}-${user}').setRequired(true).setStyle(TextInputStyle.Short).setValue(state.channelNamePattern)));
        return i.showModal(m);
      }

      if (i.customId === 't_opt_add') {
        const m = new ModalBuilder().setCustomId('t_modal_option').setTitle('Add Ticket Option')
          .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('key').setLabel('Key (unique)').setRequired(true).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Label').setRequired(true).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Description').setRequired(false).setStyle(TextInputStyle.Paragraph)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('emoji').setLabel('Emoji').setRequired(false).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('openTitle').setLabel('Open Embed Title').setRequired(false).setStyle(TextInputStyle.Short))
          );
        return i.showModal(m);
      }

      if (i.customId === 't_btns_edit') {
        const m = new ModalBuilder().setCustomId('t_modal_buttons').setTitle('Buttons Text & Emoji')
          .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('claimL').setLabel('Claim Label').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.buttons.claim.label)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('claimE').setLabel('Claim Emoji').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.buttons.claim.emoji)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('holdL').setLabel('Hold Label').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.buttons.hold.label)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('holdE').setLabel('Hold Emoji').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.buttons.hold.emoji)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('closeL').setLabel('Close Label').setRequired(false).setStyle(TextInputStyle.Short).setValue(state.buttons.close.label))
          );
        return i.showModal(m);
      }

      if (i.customId === 't_finish_save') {
        cfg.tickets = {
          managerRoleIds: state.managerRoleIds,
          staffRoleIds: state.staffRoleIds,
          pingRoleIds: state.pingRoleIds,
          categoryId: state.categoryId,
          logsChannelId: state.logsChannelId,
          transcriptChannelId: state.transcriptChannelId,
          dmsEnabled: state.dmsEnabled,
          claim: { lockOnClaim: state.claimLock },
          channelNamePattern: state.channelNamePattern,
          style: state.style,
          panel: {
            title: state.panel.title,
            description: state.panel.description,
            footerIcon: state.panel.footerIcon || null,
            largeImageUrl: state.panel.largeImageUrl || null,
            selectPlaceholder: state.panel.selectPlaceholder,
            options: state.panel.options
          },
          buttons: state.buttons,
          counter: cfg.tickets?.counter || 1,
          ready: true
        };
        writeConfig(interaction.guildId, cfg);

        const done = new EmbedBuilder()
          .setColor(colors.success)
          .setTitle(`${EMOJI.check} Ticket Setup Complete`)
          .setDescription([
            `Managers: ${state.managerRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*'}`,
            `Staff: ${state.staffRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*'}`,
            `Ping: ${state.pingRoleIds.map(id => `<@&${id}>`).join(', ') || '*none*'}`,
            `Category: ${state.categoryId ? `<#${state.categoryId}>` : '*none*'}`,
            `Logs: ${state.logsChannelId ? `<#${state.logsChannelId}>` : '*none*'}`,
            `Transcripts: ${state.transcriptChannelId ? `<#${state.transcriptChannelId}>` : '*none*'}`,
            `Style: ${state.style}`,
            `DMs: ${state.dmsEnabled ? 'Enabled' : 'Disabled'}`,
            `Claim Lock: ${state.claimLock ? 'On' : 'Off'}`,
            `Pattern: \`${state.channelNamePattern}\``,
            `Options: ${state.panel.options.length}`
          ].join('\n'));
        await i.update({ embeds: [done], components: [] });
        collector.stop('done');
      }
    });

    const modalKey = `tickets-setup-${interaction.id}`;
    if (!interaction.client[modalKey]) {
      interaction.client[modalKey] = true;
      interaction.client.on('interactionCreate', async m => {
        if (!m.isModalSubmit()) return;
        if (m.user.id !== interaction.user.id) return;

        if (m.customId === 't_modal_design') {
          state.panel.title = m.fields.getTextInputValue('title') || state.panel.title;
          state.panel.description = m.fields.getTextInputValue('desc') || state.panel.description;
          state.panel.largeImageUrl = m.fields.getTextInputValue('image') || null;
          state.panel.footerIcon = m.fields.getTextInputValue('footer') || null;
          state.panel.selectPlaceholder = m.fields.getTextInputValue('placeholder') || state.panel.selectPlaceholder;
          return m.reply({ content: `${EMOJI.check} Panel updated.`, ephemeral: true });
        }

        if (m.customId === 't_modal_pattern') {
          state.channelNamePattern = m.fields.getTextInputValue('pattern') || state.channelNamePattern;
          return m.reply({ content: `${EMOJI.check} Pattern saved.`, ephemeral: true });
        }

        if (m.customId === 't_modal_option') {
          const key = m.fields.getTextInputValue('key').trim().toLowerCase();
          const label = m.fields.getTextInputValue('label').trim();
          const desc = m.fields.getTextInputValue('desc') || '';
          const emoji = m.fields.getTextInputValue('emoji') || '';
          const openTitle = m.fields.getTextInputValue('openTitle') || 'Ticket Created';
          if (!key || !label) return m.reply({ content: `${EMOJI.error} Key and label are required.`, ephemeral: true });
          if (state.panel.options.find(o => o.key === key)) return m.reply({ content: `${EMOJI.error} That key already exists.`, ephemeral: true });
          state.panel.options.push({ key, label, description: desc, emoji, openTitle });
          return m.reply({ content: `${EMOJI.check} Option added.`, ephemeral: true });
        }

        if (m.customId === 't_modal_buttons') {
          state.buttons.claim.label = m.fields.getTextInputValue('claimL') || state.buttons.claim.label;
          state.buttons.claim.emoji = m.fields.getTextInputValue('claimE') || state.buttons.claim.emoji;
          state.buttons.hold.label = m.fields.getTextInputValue('holdL') || state.buttons.hold.label;
          state.buttons.hold.emoji = m.fields.getTextInputValue('holdE') || state.buttons.hold.emoji;
          state.buttons.close.label = m.fields.getTextInputValue('closeL') || state.buttons.close.label;
          return m.reply({ content: `${EMOJI.check} Buttons updated.`, ephemeral: true });
        }
      });
    }

    collector.on('end', async (_, r) => {
      if (r === 'time') {
        try { await interaction.editReply({ content: 'Setup timed out. Run `/setup-tickets` again.', embeds: [], components: [] }); } catch {}
      }
    });
  }
};
