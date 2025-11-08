import {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} from 'discord.js';
import { colors } from '../utils/colors.js';
import { readConfig, writeConfig, hasSetup } from '../utils/store.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config-moderation')
    .setDescription('Configure moderation settings (DM templates, toggles, banner, escalation).'),
  async execute(interaction) {
    if (!interaction.inGuild())
      return interaction.reply({ content: '<:v7:1435698081399308420> Use in a server.', ephemeral: true });

    const cfg = readConfig(interaction.guildId);
    if (!hasSetup(cfg))
      return interaction.reply({ content: '<:v7:1435698081399308420> Run `/setup-moderation` first.', ephemeral: true });

    const e = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle('Moderation Configuration')
      .setDescription([
        '**What you can edit here:**',
        '• Banner image URL',
        '• DM toggles (ban/kick/warn/timeout)',
        '• DM templates (text with placeholders)',
        '• Log style (stacked/compact)',
        '• Require reason on actions',
        '• Auto-escalation (warn threshold → auto-timeout)'
      ].join('\n'));

    const main = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('cfg_main')
        .setPlaceholder('Choose what to configure')
        .addOptions(
          { label: 'Banner URL', value: 'banner' },
          { label: 'DM Toggles', value: 'dm_toggles' },
          { label: 'DM Templates', value: 'dm_templates' },
          { label: 'Log Style', value: 'log_style' },
          { label: 'Require Reason', value: 'require_reason' },
          { label: 'Escalation', value: 'escalation' }
        )
    );

    await interaction.reply({ embeds: [e], components: [main], ephemeral: true });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 7 * 60 * 1000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: '<:v7:1435698081399308420> Only the opener can use these.', ephemeral: true });

      const cfgNow = readConfig(interaction.guildId);

      if (i.customId === 'cfg_main') {
        const choice = i.values[0];

        if (choice === 'banner') {
          const modal = new ModalBuilder().setCustomId('cfg_banner_modal').setTitle('Set Banner URL');
          const input = new TextInputBuilder()
            .setCustomId('banner_url')
            .setLabel('Image URL')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(cfgNow.moderation.bannerUrl || '');
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return i.showModal(modal);
        }

        if (choice === 'dm_toggles') {
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('cfg_dm_toggle_pick')
              .setPlaceholder('Toggle which actions DM the user')
              .setMinValues(1).setMaxValues(5)
              .addOptions(
                { label: `Ban (${cfgNow.moderation.dmEnabled.ban ? 'on' : 'off'})`, value: 'ban' },
                { label: `Kick (${cfgNow.moderation.dmEnabled.kick ? 'on' : 'off'})`, value: 'kick' },
                { label: `Warn (${cfgNow.moderation.dmEnabled.warn ? 'on' : 'off'})`, value: 'warn' },
                { label: `Timeout (${cfgNow.moderation.dmEnabled.timeout ? 'on' : 'off'})`, value: 'timeout' },
                { label: `SoftBan (${cfgNow.moderation.dmEnabled.softban ? 'on' : 'off'})`, value: 'softban' }
              )
          );
          const e2 = new EmbedBuilder()
            .setColor(colors.info)
            .setTitle('DM Toggles')
            .setDescription('Select items to **flip** their DM state.');
          return i.update({ embeds: [e2], components: [row] });
        }

        if (choice === 'dm_templates') {
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('cfg_dm_template_pick')
              .setPlaceholder('Pick a template to edit')
              .addOptions(
                { label: 'Ban', value: 'ban' },
                { label: 'Kick', value: 'kick' },
                { label: 'Warn', value: 'warn' },
                { label: 'Timeout', value: 'timeout' },
                { label: 'SoftBan', value: 'softban' }
              )
          );
          const e3 = new EmbedBuilder()
            .setColor(colors.info)
            .setTitle('DM Templates')
            .setDescription('Edit template text. Placeholders: `{server}`, `{reason}`, `{duration}` (for timeout).');
          return i.update({ embeds: [e3], components: [row] });
        }

        if (choice === 'log_style') {
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('cfg_log_style_pick')
              .setPlaceholder('Select log style')
              .addOptions(
                { label: 'Stacked embeds', value: 'stacked' },
                { label: 'Compact embeds', value: 'compact' }
              )
          );
          return i.update({
            embeds: [new EmbedBuilder().setColor(colors.primary).setTitle('Log Style')],
            components: [row]
          });
        }

        if (choice === 'require_reason') {
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('cfg_req_reason_pick')
              .setPlaceholder('Require reason?')
              .addOptions(
                { label: 'Require reason for actions', value: 'require' },
                { label: 'Reason optional', value: 'optional' }
              )
          );
          return i.update({
            embeds: [new EmbedBuilder().setColor(colors.primary).setTitle('Require Reason')],
            components: [row]
          });
        }

        if (choice === 'escalation') {
          const modal = new ModalBuilder().setCustomId('cfg_escalation_modal').setTitle('Escalation Settings');
          const th = new TextInputBuilder()
            .setCustomId('thresh')
            .setLabel('Warn threshold')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(String(cfgNow.moderation.escalation.warnThreshold ?? 3));
          const mins = new TextInputBuilder()
            .setCustomId('mins')
            .setLabel('Auto-timeout minutes')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(String(cfgNow.moderation.escalation.timeoutMinutes ?? 30));
          const en = new TextInputBuilder()
            .setCustomId('enabled')
            .setLabel('Enable? (true/false)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(String(!!cfgNow.moderation.escalation.enabled));
          modal.addComponents(
            new ActionRowBuilder().addComponents(th),
            new ActionRowBuilder().addComponents(mins),
            new ActionRowBuilder().addComponents(en)
          );
          return i.showModal(modal);
        }
      }

      if (i.customId === 'cfg_dm_toggle_pick') {
        const cfg2 = readConfig(interaction.guildId);
        for (const key of i.values) {
          cfg2.moderation.dmEnabled[key] = !cfg2.moderation.dmEnabled[key];
        }
        writeConfig(interaction.guildId, cfg2);
        return i.update({
          embeds: [new EmbedBuilder().setColor(colors.success).setTitle('<:v6:1435697974431977522> DM Toggles Updated')],
          components: []
        });
      }

      if (i.customId === 'cfg_log_style_pick') {
        const cfg2 = readConfig(interaction.guildId);
        cfg2.moderation.logStyle = i.values[0];
        writeConfig(interaction.guildId, cfg2);
        return i.update({
          embeds: [new EmbedBuilder().setColor(colors.success).setTitle('<:v6:1435697974431977522> Log Style Updated')],
          components: []
        });
      }

      if (i.customId === 'cfg_req_reason_pick') {
        const cfg2 = readConfig(interaction.guildId);
        cfg2.moderation.requireReason = (i.values[0] === 'require');
        writeConfig(interaction.guildId, cfg2);
        return i.update({
          embeds: [new EmbedBuilder().setColor(colors.success).setTitle('<:v6:1435697974431977522> Require Reason Updated')],
          components: []
        });
      }

      if (i.customId === 'cfg_dm_template_pick') {
        const key = i.values[0];
        const modal = new ModalBuilder().setCustomId(`cfg_dm_template_modal_${key}`).setTitle(`Edit ${key} Template`);
        const input = new TextInputBuilder()
          .setCustomId('tmpl_text')
          .setLabel('Template (supports {server}, {reason}, {duration})')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(readConfig(interaction.guildId).moderation.dmTemplates[key] || '');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return i.showModal(modal);
      }
    });

    interaction.client.on('interactionCreate', async (sub) => {
      if (!sub.isModalSubmit()) return;

      if (sub.customId === 'cfg_banner_modal') {
        const url = sub.fields.getTextInputValue('banner_url').trim();
        const cfg3 = readConfig(sub.guildId);
        cfg3.moderation.bannerUrl = url;
        writeConfig(sub.guildId, cfg3);
        return sub.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(colors.success)
              .setDescription('<:v6:1435697974431977522> Banner URL updated.')
          ]
        });
      }

      if (sub.customId.startsWith('cfg_dm_template_modal_')) {
        const key = sub.customId.replace('cfg_dm_template_modal_', '');
        const text = sub.fields.getTextInputValue('tmpl_text');
        const cfg3 = readConfig(sub.guildId);
        cfg3.moderation.dmTemplates[key] = text;
        writeConfig(sub.guildId, cfg3);
        return sub.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(colors.success)
              .setDescription(`<:v6:1435697974431977522> ${key} template updated.`)
          ]
        });
      }

      if (sub.customId === 'cfg_escalation_modal') {
        const th = parseInt(sub.fields.getTextInputValue('thresh'), 10);
        const mins = parseInt(sub.fields.getTextInputValue('mins'), 10);
        const enabled = String(sub.fields.getTextInputValue('enabled')).toLowerCase() === 'true';
        const cfg3 = readConfig(sub.guildId);
        cfg3.moderation.escalation = {
          warnThreshold: Math.max(1, Math.min(99, isNaN(th) ? 3 : th)),
          timeoutMinutes: Math.max(1, Math.min(40320, isNaN(mins) ? 30 : mins)),
          enabled
        };
        writeConfig(sub.guildId, cfg3);
        return sub.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(colors.success)
              .setDescription('<:v6:1435697974431977522> Escalation updated.')
          ]
        });
      }
    });
  }
};
