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

function ansiWon(prizeLabel) {
  const ESC = "\u001b"
  return [
    "```ansi",
    `${ESC}[2;36m${ESC}[2;35mYou have won ${prizeLabel}!${ESC}[0m${ESC}[2;36m${ESC}[0m`,
    "```",
  ].join("\n")
}

function formatOdds() {
  const entries = Object.entries(config.rewards || {})
  const lines = entries
    .filter(([, r]) => r?.label && typeof r.weight === "number")
    .sort((a, b) => (b[1].weight || 0) - (a[1].weight || 0))
    .map(([, r]) => `• **${r.label}** - **${r.weight}%**`)
  return lines.length ? lines.join("\n") : "Odds unavailable."
}

function buildGiveawayEmbed() {
  const endUnix = endAtUnix()

  return new Embed()
    .setColor(config.brandColor) // white
    .setTitle("MagicUI New Year Spin")
    .setDescription(
      [
        "We’re celebrating **2,000 Discord members** + **20,000 GitHub stars**.",
        `Click **Spin Now** — you get **${config.spinsPerUser} spin**.`,
        "",
        `Available until <t:${endUnix}:f> (before 2026).`,
      ].join("\n")
    )
    .addFields({ name: "Prizes & Odds", value: formatOdds(), inline: false })
    // ✅ FIRST banner only here
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

async function safeDM(user, payload) {
  try {
    await user.send(payload)
    return true
  } catch {
    return false
  }
}

async function buildResultPayload({ interaction, picked, spinsLeft }) {
  const endUnix = endAtUnix()
  const wonText = ansiWon(picked.reward.label)

  const resultEmbed = new Embed()
    .setColor(config.brandColor)
    .setTitle("Spin Result")
    .setDescription(`Reward: **${picked.reward.label}**`)
    .addFields({ name: "Spins left", value: String(spinsLeft), inline: true })
    .setTimestamp()

  // ✅ ROLE reward
  if (picked.reward.type === "role") {
    const role = await ensureParticipationRole(interaction.guild)
    if (role) await interaction.member.roles.add(role).catch(() => {})

    const dmEmbed = new Embed()
      .setColor(config.brandColor)
      .setTitle("MagicUI New Year Spin")
      .setDescription(
        [
          `Reward: **${picked.reward.label}**`,
          "",
          `Available until <t:${endUnix}:f> (before 2026).`,
        ].join("\n")
      )
      .setImage(config.bannerImageUrl)
      .setTimestamp()

    await safeDM(interaction.user, { content: wonText, embeds: [dmEmbed], components: [buildClaimRowOnly()] })

    return { content: wonText, embeds: [resultEmbed], components: [buildClaimRowOnly()] }
  }

  // ✅ VOUCHER reward
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
        `Reward: **${picked.reward.label}**`,
        "",
        `**Voucher ID:** \`${voucher.id}\``,
        `Valid until <t:${endUnix}:f> (before 2026).`,
        "",
        "Claim it via Support (button below).",
      ].join("\n")
    )
    .setImage(config.voucherImageUrl || config.bannerImageUrl)
    .setTimestamp()

  await safeDM(interaction.user, { content: wonText, embeds: [voucherEmbed], components: [buildClaimRowOnly()] })

  return {
    content: wonText,
    embeds: [resultEmbed, voucherEmbed],
    components: [buildClaimRowOnly()],
  }
}

export default {
  isExpired,
  endAtMs,
  buildGiveawayEmbed,
  buildSpinRow: buildMainRow,
  weightedPick,
  buildResultPayload,
}
