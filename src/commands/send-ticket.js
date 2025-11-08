import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} from 'discord.js';
import { colors } from '../utils/colors.js';
import { readConfig } from '../utils/store.js';
import { isOwnerOrManager } from '../utils/perm.js';
import { EMOJI } from '../utils/emoji.js';

export default {
  data: new SlashCommandBuilder()
    .setName('send-ticket')
    .setDescription('Send the configured ticket panel in this channel'),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use this in a server.', ephemeral: true });
    if (!isOwnerOrManager(interaction.member)) return interaction.reply({ content: `${EMOJI.error} Only the server owner or managers can do this.`, ephemeral: true });

    const cfg = readConfig(interaction.guildId);
    if (!cfg?.tickets?.ready) return interaction.reply({ content: `${EMOJI.error} Run /setup-tickets first.`, ephemeral: true });

    const p = cfg.tickets.panel;
    const e = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle(p.title || 'Support Tickets')
      .setDescription(p.description || 'Select a ticket type to begin.')
      .setFooter({ text: 'Arvio • Tickets', iconURL: p.footerIcon || null });
    if (p.largeImageUrl) e.setImage(p.largeImageUrl);

    let components = [];
    if ((cfg.tickets.style || 'buttons') === 'select') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('t_open_select')
        .setPlaceholder(p.selectPlaceholder || 'Choose a ticket type')
        .addOptions(
          (p.options || []).map(o => ({
            label: o.label,
            value: o.key,
            description: o.description?.slice(0, 100) || undefined,
            emoji: o.emoji || undefined
          }))
        );
      components = [new ActionRowBuilder().addComponents(menu)];
    } else {
      const row = new ActionRowBuilder();
      (p.options || []).slice(0, 5).forEach(o => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`t_open_button:${o.key}`)
            .setLabel(o.label)
            .setEmoji(o.emoji || EMOJI.ticket)
            .setStyle(ButtonStyle.Primary)
        );
      });
      components = [row];
    }

    await interaction.reply({ content: `${EMOJI.check} Panel sent.`, ephemeral: true });
    await interaction.channel.send({ embeds: [e], components });
  }
};
