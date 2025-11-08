import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  PermissionsBitField,
  StringSelectMenuBuilder
} from 'discord.js';
import { colors } from '../utils/colors.js';
import { EMOJI } from '../utils/emoji.js';
import { readConfig, writeConfig } from '../utils/store.js';
import fs from 'node:fs';
import path from 'node:path';

const TRANSCRIPT_DIR = path.resolve('./data/transcripts');

function encode(id, payload) {
  return `${id}:${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
}
function decode(customId) {
  const idx = customId.indexOf(':');
  const id = idx === -1 ? customId : customId.slice(0, idx);
  const data = idx === -1 ? {} : JSON.parse(Buffer.from(customId.slice(idx + 1), 'base64url').toString());
  return { id, data };
}

function renderPanelEmbed(cfg) {
  const p = cfg.tickets.panel;
  const e = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(p.title || 'Support Tickets')
    .setDescription(p.description || 'Select a ticket type to begin.')
    .setFooter({ text: 'Arvio • Tickets', iconURL: p.footerIcon || null });
  if (p.largeImageUrl) e.setImage(p.largeImageUrl);
  return e;
}

function renderPanelComponents(cfg) {
  const p = cfg.tickets.panel;
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
    return [new ActionRowBuilder().addComponents(menu)];
  } else {
    const rows = [];
    let row = new ActionRowBuilder();
    (p.options || []).forEach((o, i) => {
      if (i > 0 && i % 5 === 0) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`t_open_button:${o.key}`)
          .setLabel(o.label)
          .setEmoji(o.emoji || EMOJI.ticket)
          .setStyle(ButtonStyle.Primary)
      );
    });
    rows.push(row);
    return rows;
  }
}

async function ensureTranscriptDir() {
  if (!fs.existsSync(TRANSCRIPT_DIR)) fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

async function writeTranscriptTxt(channel) {
  await ensureTranscriptDir();
  const msgs = [];
  let lastId;
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!batch || batch.size === 0) break;
    batch.forEach(m => {
      const t = m.createdAt.toISOString();
      const a = `${m.author.tag} (${m.author.id})`;
      const c = m.cleanContent || '';
      msgs.push(`[${t}] ${a}: ${c}`);
    });
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }
  const file = path.join(TRANSCRIPT_DIR, `ticket_${channel.id}.txt`);
  fs.writeFileSync(file, msgs.reverse().join('\n'), 'utf8');
  return new AttachmentBuilder(file, { name: `transcript_${channel.name}.txt` });
}

function staffOverwrites(cfg) {
  const allowRoles = new Set([...(cfg.tickets.managerRoleIds || []), ...(cfg.tickets.staffRoleIds || [])]);
  return [...allowRoles].map(rid => ({
    id: rid,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ReadMessageHistory
    ]
  }));
}

async function createTicketChannel(interaction, cfg, optionKey) {
  const opt = (cfg.tickets.panel.options || []).find(o => o.key === optionKey) || cfg.tickets.panel.options[0];
  cfg.tickets.counter = cfg.tickets.counter || 1;
  const num = cfg.tickets.counter;
  const pattern = cfg.tickets.channelNamePattern || 'ticket-${number}-${user}';
  const name = pattern
    .replaceAll('${number}', String(num))
    .replaceAll('${user}', interaction.user.username.toLowerCase())
    .replaceAll('${id}', interaction.user.id)
    .replaceAll('${option}', opt.key)
    .slice(0, 90);

  const parent = cfg.tickets.categoryId || null;
  const overwrites = [
    { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
    ...staffOverwrites(cfg),
    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
  ];

  const ch = await interaction.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: overwrites,
    topic: `ticket|opener:${interaction.user.id}|option:${opt.key}`
  });

  cfg.tickets.counter = num + 1;
  cfg.tickets.activeTickets = cfg.tickets.activeTickets || {};
  cfg.tickets.activeTickets[ch.id] = { openerId: interaction.user.id, optionKey: opt.key, claimedBy: null, createdAt: Date.now() };
  writeConfig(interaction.guild.id, cfg);

  const e = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(opt.openTitle || 'Ticket Created')
    .setDescription(opt.openDescription || 'A staff member will be with you shortly.')
    .addFields(
      { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Type', value: opt.label, inline: true }
    );
  if (cfg.tickets.panel.largeImageUrl) e.setImage(cfg.tickets.panel.largeImageUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(encode('t_claim', { cid: ch.id })).setLabel(cfg.tickets.buttons?.claim?.label || 'Claim').setEmoji(cfg.tickets.buttons?.claim?.emoji || EMOJI.search).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(encode('t_hold', { cid: ch.id })).setLabel(cfg.tickets.buttons?.hold?.label || 'Hold').setEmoji(cfg.tickets.buttons?.hold?.emoji || '⏸️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(encode('t_close', { cid: ch.id })).setLabel(cfg.tickets.buttons?.close?.label || 'Close').setEmoji(cfg.tickets.buttons?.close?.emoji || '🔒').setStyle(ButtonStyle.Danger)
  );

  const pingRoles = (cfg.tickets.pingRoleIds || []).map(id => `<@&${id}>`).join(' ');
  await ch.send({ content: pingRoles || null, embeds: [e], components: [row] });

  if (cfg.tickets.dmsEnabled) {
    const dm = new EmbedBuilder().setColor(colors.primary).setTitle('Ticket Opened').setDescription(`Your ticket was created in ${interaction.guild.name}\n${ch.toString()}`);
    await interaction.user.send({ embeds: [dm] }).catch(() => {});
  }
  return ch;
}

export function initTickets(client) {
  client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 't_open_select') {
      const cfg = readConfig(interaction.guildId);
      if (!cfg?.tickets?.ready) return interaction.reply({ content: `${EMOJI.error} Run /setup-tickets first.`, ephemeral: true });
      const val = interaction.values[0];
      await interaction.deferReply({ ephemeral: true });
      const ch = await createTicketChannel(interaction, cfg, val);
      return interaction.editReply({ content: `${EMOJI.check} Created ${ch.toString()}` });
    }

    if (interaction.isButton()) {
      const { id, data } = decode(interaction.customId);
      if (id === 't_open_button') {
        const cfg = readConfig(interaction.guildId);
        if (!cfg?.tickets?.ready) return interaction.reply({ content: `${EMOJI.error} Run /setup-tickets first.`, ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const ch = await createTicketChannel(interaction, cfg, data);
        return interaction.editReply({ content: `${EMOJI.check} Created ${ch.toString()}` });
      }
      if (id === 't_claim') {
        const cfg = readConfig(interaction.guildId);
        const ch = interaction.guild.channels.cache.get(data.cid);
        if (!ch) return interaction.reply({ content: `${EMOJI.error} Channel missing.`, ephemeral: true });
        const t = cfg.tickets.activeTickets?.[ch.id] || {};
        if (t.claimedBy) return interaction.reply({ content: `${EMOJI.error} Already claimed by <@${t.claimedBy}>.`, ephemeral: true });
        t.claimedBy = interaction.user.id;
        cfg.tickets.activeTickets[ch.id] = t;
        writeConfig(interaction.guildId, cfg);
        const lock = cfg.tickets.claim?.lockOnClaim ?? true;
        if (lock) {
          const staff = new Set([...(cfg.tickets.managerRoleIds||[]), ...(cfg.tickets.staffRoleIds||[])]);
          await ch.permissionOverwrites.edit(interaction.user.id, { SendMessages: true, ViewChannel: true, ReadMessageHistory: true }).catch(()=>{});
          for (const rid of staff) await ch.permissionOverwrites.edit(rid, { SendMessages: false, ViewChannel: true, ReadMessageHistory: true }).catch(()=>{});
        }
        await ch.send({ embeds: [new EmbedBuilder().setColor(colors.accent).setDescription(`${EMOJI.search} Claimed by <@${interaction.user.id}>`)] });
        return interaction.reply({ content: `${EMOJI.check} Claimed.`, ephemeral: true });
      }
      if (id === 't_hold') {
        const cfg = readConfig(interaction.guildId);
        const ch = interaction.guild.channels.cache.get(data.cid);
        if (!ch) return interaction.reply({ content: `${EMOJI.error} Channel missing.`, ephemeral: true });
        const openerId = cfg.tickets.activeTickets?.[ch.id]?.openerId || null;
        if (openerId) {
          const locked = ch.permissionOverwrites.cache.get(openerId)?.deny?.has(PermissionsBitField.Flags.SendMessages);
          if (locked) {
            await ch.permissionOverwrites.edit(openerId, { SendMessages: true }).catch(()=>{});
            await ch.send({ embeds: [new EmbedBuilder().setColor(colors.success).setDescription('Hold released')] });
          } else {
            await ch.permissionOverwrites.edit(openerId, { SendMessages: false }).catch(()=>{});
            await ch.send({ embeds: [new EmbedBuilder().setColor(colors.neutral).setDescription('Ticket on hold')] });
          }
        }
        return interaction.reply({ content: `${EMOJI.check}`, ephemeral: true });
      }
      if (id === 't_close') {
        const modal = new ModalBuilder().setCustomId(encode('t_close_modal', { cid: data.cid }))
          .setTitle('Close Ticket')
          .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason').setRequired(false).setStyle(TextInputStyle.Paragraph))
          );
        return interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      const { id, data } = decode(interaction.customId);
      if (id === 't_close_modal') {
        const cfg = readConfig(interaction.guildId);
        const ch = interaction.guild.channels.cache.get(data.cid);
        if (!ch) return interaction.reply({ content: `${EMOJI.error} Channel missing.`, ephemeral: true });
        const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';
        await interaction.reply({ content: `${EMOJI.check} Closing...`, ephemeral: true });
        const attach = await writeTranscriptTxt(ch).catch(()=>null);
        const logCh = cfg.tickets.transcriptChannelId ? interaction.guild.channels.cache.get(cfg.tickets.transcriptChannelId) : null;
        const embed = new EmbedBuilder().setColor(colors.danger).setTitle('Ticket Closed').setDescription(`Channel: #${ch.name}\nBy: <@${interaction.user.id}>\nReason: ${reason}`);
        if (logCh) await logCh.send({ embeds: [embed], files: attach ? [attach] : [] }).catch(()=>{});
        const opener = cfg.tickets.activeTickets?.[ch.id]?.openerId;
        if (cfg.tickets.dmsEnabled && opener) {
          const dmE = new EmbedBuilder().setColor(colors.danger).setTitle('Your ticket was closed').setDescription(`Reason: ${reason}`);
          await interaction.client.users.send(opener, { embeds: [dmE], files: attach ? [attach] : [] }).catch(()=>{});
        }
        if (cfg.tickets.activeTickets) delete cfg.tickets.activeTickets[ch.id];
        writeConfig(interaction.guildId, cfg);
        setTimeout(()=> ch.delete().catch(()=>{}), 3000);
      }
    }
  });
}

export { renderPanelEmbed, renderPanelComponents };
