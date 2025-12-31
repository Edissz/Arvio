import config from "../../ny2026-config.js"
import store from "../utils/ny2026-store.js"
import { Embed, ActionRow, Button, buttonPrimary, buttonLink } from "../utils/djs-compat.js"

function endAtMs() {
  return Date.parse(config.endAtIso)
}

function isExpired() {
  return Date.now() >= endAtMs()
}

function oddsLines() {
  return Object.entries(config.rewards)
    .map(([, r]) => `• **${r.label}** — **${r.weight}%**`)
    .join("\n")
}

function buildGiveawayEmbed() {
  const embed = new Embed()
    .setColor(config.brandColor)
    .setTitle("MagicUI New Year Spin — Limited-Time Event")
    .setDescription(
      [
        "Happy New Year — and thank you for an amazing year with MagicUI.",
        "",
        "To celebrate **2,000 Discord members** and **20,000 GitHub stars**, we’re running a limited spin event.",
        "",
        `Each member gets **${config.spinsPerUser} spin**. Click **Spin Now** to roll your reward.`,
        "",
        `**Ends:** ${config.endAtIso} (CET) — available only before 2026.`,
      ].join("\n")
    )
    .addFields(
      { name: "Odds", value: oddsLines(), inline: false },
      {
        name: "How claiming works",
        value:
          "If you receive a voucher reward, open a ticket via **Support** using the button below and include your voucher ID.\nA staff member will help you claim it.",
        inline: false,
      },
      {
        name: "Rules",
        value:
          "• Spins are tracked per user\n• Results are private (only you can see them)\n• Voucher IDs are logged and staff-verifiable\n• Please don’t share voucher IDs publicly",
        inline: false,
      }
    )
    .setImage(config.bannerImageUrl)
    .setFooter({ text: "MagicUI — New Year Event" })
    .setTimestamp()

  return embed
}

function buildMainRow() {
  return new ActionRow().addComponents(
    new Button()
      .setCustomId(config.buttonCustomId)
      .setStyle(buttonPrimary)
      .setLabel("Spin Now"),
    new Button()
      .setStyle(buttonLink)
      .setURL(config.claimUrl)
      .setLabel("Open Support / Claim")
  )
}

function buildClaimRowOnly() {
  return new ActionRow().addComponents(
    new Button().setStyle(buttonLink).setURL(config.claimUrl).setLabel("Open Support / Claim")
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
  const base = new Embed()
    .setColor(config.brandColor)
    .setTitle("Spin Result")
    .setDescription(`Reward: **${picked.reward.label}**`)
    .addFields({ name: "Spins remaining", value: String(spinsLeft), inline: true })
    .setTimestamp()

  if (picked.reward.type === "role") {
    const role = await ensureParticipationRole(interaction.guild)
    if (role) {
      await interaction.member.roles.add(role).catch(() => {})
      base.addFields({ name: "Role", value: `Assigned: <@&${role.id}>`, inline: false })
    } else {
      base.addFields({
        name: "Role",
        value: "Could not auto-assign (missing role ID / permissions / role hierarchy). Staff can assign it manually.",
        inline: false,
      })
    }
    return { embeds: [base], components: [buildClaimRowOnly()] }
  }

  const voucher = await store.issueVoucher({
    userId: interaction.user.id,
    prizeKey: picked.key,
    prizeLabel: picked.reward.label,
    guildId: interaction.guildId,
  })

  const voucherEmbed = new Embed()
    .setColor(config.brandColor)
    .setTitle("Voucher Information")
    .setDescription(
      [
        "Keep this voucher ID private.",
        "To claim your reward, open a Support ticket and include the ID below.",
        "",
        `**Voucher ID:** \`${voucher.id}\``,
      ].join("\n")
    )
    .setFooter({ text: "Claim via Support — staff will verify your voucher ID" })
    .setTimestamp()

  return { embeds: [base, voucherEmbed], components: [buildClaimRowOnly()] }
}

export default {
  isExpired,
  endAtMs,
  buildGiveawayEmbed,
  buildSpinRow: buildMainRow, // keep compatibility with existing sender
  weightedPick,
  buildResultPayload,
}
