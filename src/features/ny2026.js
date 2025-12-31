import config from "../../ny2026-config.js"
import store from "../utils/ny2026-store.js"
import { Embed, ActionRow, Button, buttonPrimary, buttonLink } from "../utils/djs-compat.js"

function endAtMs() {
  return Date.parse(config.endAtIso)
}

function endAtUnix() {
  return Math.floor(endAtMs() / 1000)
}

function isExpired() {
  return Date.now() >= endAtMs()
}

function chancesLines() {
  return Object.entries(config.rewards)
    .map(([, r]) => `• **${r.label}** — **${r.weight}%**`)
    .join("\n")
}

function buildGiveawayEmbed() {
  const endUnix = endAtUnix()

  return new Embed()
    .setColor(config.brandColor) // white
    .setTitle("MagicUI New Year Spin")
    .setDescription(
      [
        "We’re celebrating **2,000 Discord members** + **20,000 GitHub stars**.",
        `Tap **Spin Now** to roll your reward. You get **${config.spinsPerUser} spin**.`,
        "",
        `Ends **before 2026** — <t:${endUnix}:f>`,
      ].join("\n")
    )
    .addFields({ name: "Chances", value: chancesLines(), inline: false })
    .setImage(config.bannerImageUrl)
    .setTimestamp()
}

function buildMainRow() {
  return new ActionRow().addComponents(
    new Button().setCustomId(config.buttonCustomId).setStyle(buttonPrimary).setLabel("Spin Now"),
    new Button().setStyle(buttonLink).setURL(config.claimUrl).setLabel("Claim via Support")
  )
}

function buildClaimRowOnly() {
  return new ActionRow().addComponents(
    new Button().setStyle(buttonLink).setURL(config.claimUrl).setLabel("Claim via Support")
  )
}

function weightedPick() {
  const entries = Object.entries(config.rewards)
  const total = entries.reduce((s, [, r]) => s + (r.weight || 0), 0)
  const roll = Math.random() * total
  let acc = 0
  for (const [key, r] of entries) {
    acc += r.weight || 0
    if (roll < acc) return { key, reward: r }
  }
  const [fallbackKey, fallbackReward] = entries[0]
  return { key: fallbackKey, reward: fallbackReward }
}

async function canManageRoles(guild) {
  try {
    const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null))
    return Boolean(me?.permissions?.has?.("ManageRoles"))
  } catch {
    return false
  }
}

async function ensureParticipationRole(guild) {
  const r = config.rewards.participation
  if (!r) return null

  if (r.roleId) {
    const role = guild.roles.cache.get(r.roleId) || (await guild.roles.fetch(r.roleId).catch(() => null))
    return role || null
  }

  const found = guild.roles.cache.find((x) => x.name === r.roleNameFallback) || null
  if (found) return found

  if (!(await canManageRoles(guild))) return null

  const created = await guild.roles
    .create({ name: r.roleNameFallback, reason: "NY2026 participation role" })
    .catch(() => null)

  return created || null
}

async function buildResultPayload({ interaction, picked, spinsLeft }) {
  const endUnix = endAtUnix()

  const resultEmbed = new Embed()
    .setColor(config.brandColor)
    .setTitle("Spin Result")
    .setDescription(`You won: **${picked.reward.label}**`)
    .addFields({ name: "Spins left", value: String(spinsLeft), inline: true })
    .setTimestamp()

  // Role reward
  if (picked.reward.type === "role") {
    const role = await ensureParticipationRole(interaction.guild)
    if (role) {
      await interaction.member.roles.add(role).catch(() => {})
      resultEmbed.addFields({ name: "Status", value: `Role added: <@&${role.id}>`, inline: false })
    } else {
      resultEmbed.addFields({
        name: "Status",
        value: "Role could not be auto-assigned. Staff can assign it manually if needed.",
        inline: false,
      })
    }
    return { embeds: [resultEmbed], components: [buildClaimRowOnly()] }
  }

  // Voucher reward
  const voucher = await store.issueVoucher({
    userId: interaction.user.id,
    prizeKey: picked.key,
    prizeLabel: picked.reward.label,
    guildId: interaction.guildId,
  })

  const voucherEmbed = new Embed()
    .setColor(config.brandColor)
    .setTitle("Your Voucher")
    .setDescription(
      [
        `**Voucher ID:** \`${voucher.id}\``,
        "",
        `Valid until <t:${endUnix}:f> (before 2026).`,
        "To claim: open Support and paste your voucher ID.",
      ].join("\n")
    )
    .setTimestamp()

  return { embeds: [resultEmbed, voucherEmbed], components: [buildClaimRowOnly()] }
}

export default {
  isExpired,
  endAtMs,
  buildGiveawayEmbed,
  buildSpinRow: buildMainRow,
  weightedPick,
  buildResultPayload,
}
