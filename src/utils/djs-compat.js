import * as djs from "discord.js"

const Embed = djs.EmbedBuilder || djs.MessageEmbed
const ActionRow = djs.ActionRowBuilder || djs.MessageActionRow
const Button = djs.ButtonBuilder || djs.MessageButton

const buttonPrimary = djs.ButtonStyle?.Primary ?? "PRIMARY"
const adminPerm =
  djs.PermissionFlagsBits?.Administrator ??
  djs.PermissionsBitField?.Flags?.Administrator ??
  djs.Permissions?.FLAGS?.ADMINISTRATOR ??
  "ADMINISTRATOR"

function isAdmin(member) {
  try {
    return Boolean(member?.permissions?.has?.(adminPerm))
  } catch {
    return false
  }
}

function nowMs() {
  return Date.now()
}

export { djs, Embed, ActionRow, Button, buttonPrimary, isAdmin, nowMs }
