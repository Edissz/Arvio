import * as djs from "discord.js"

const Embed = djs.EmbedBuilder || djs.MessageEmbed
const ActionRow = djs.ActionRowBuilder || djs.MessageActionRow
const Button = djs.ButtonBuilder || djs.MessageButton

const buttonPrimary = djs.ButtonStyle?.Primary ?? "PRIMARY"
const buttonLink = djs.ButtonStyle?.Link ?? "LINK"

export { djs, Embed, ActionRow, Button, buttonPrimary, buttonLink }
