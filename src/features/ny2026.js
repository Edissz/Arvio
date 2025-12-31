const config = require("../ny2026-config")
const store = require("../utils/ny2026-store")
const { Embed, ActionRow, Button, buttonPrimary } = require("../utils/djs-compat")

function endAtMs() {
  return Date.parse(config.endAtIso)
}

function isExpired() {
  return Date.now() >= endAtMs()
}

function oddsLines() {
  const entries = Object.entries(config.rewards)
  return entries
    .map(([, r]) => `• **${r.label}** — **${r.weight}%**`)
    .join("\n")
}

function buildGiveawayEmbed() {
  const embed = new Embed()
    .setColor(config.brandColor)
    .setTitle("🎡 MagicUI New Year Spin — Limited Event")
    .setDescription(
      [
        "🎉 We’re celebrating **2,000 Discord members** + **20,000 GitHub stars** — thank you for building with MagicUI.",
        "",
        "Click the button to spin your rewards.",
        `Everyone gets **${config.spinsPerUser} spins**.`,
        "",
        `⏳ Ends **before 2026** (${config.endAtIso}).`,
      ].join("\n")
    )
    .addFields(
      { name: "🎯 Odds", value: oddsLines(), inline: false },
      {
        name: "🧠 Rules",
        value:
          "• Spins are tracked per user\n• Results are private (only you can see them)\n• Don’t use alts — we log voucher IDs",
        inline: false,
      }
    )
    .setTimestamp()

  return embed
}

function buildSpinRow() {
  const row = new ActionRow().addComponents(
    new Button()
      .setCustomId(config.buttonCustomId)
      .setStyle(buttonPrimary)
      .setLabel("Spin Now 🎰")
  )
  return row
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

async function ensureParticipationRole(guild) {
  const r = config.rewards.participation
  if (!r) return null

  if (r.roleId) {
    const role = guild.roles.cache.get(r.roleId) || (await guild.roles.fetch(r.roleId).catch(() => null))
    return role || null
  }

  const found = guild.roles.cache.find((x) => x.name === r.roleNameFallback) || null
  if (found) return found

  if (!guild.members.me?.permissions?.has?.("ManageRoles")) return null

  const created = await guild.roles
    .create({
      name: r.roleNameFallback,
      reason: "NY2026 participation role",
    })
    .catch(() => null)

  return created || null
}

async function buildResultPayload({ interaction, picked, spinsLeft }) {
  const base = new Embed()
    .setColor(config.brandColor)
    .setTitle("🎡 Spin Result")
    .setDescription(`You won: **${picked.reward.label}**`)
    .addFields({ name: "🎟️ Spins left", value: String(spinsLeft), inline: true })
    .setTimestamp()

  if (picked.reward.type === "role") {
    const role = await ensureParticipationRole(interaction.guild)
    if (role) {
      await interaction.member.roles.add(role).catch(() => {})
      base.addFields({ name: "✅ Role", value: `Added: <@&${role.id}>`, inline: false })
    } else {
      base.addFields({
        name: "⚠️ Role",
        value:
          "Couldn’t auto-assign the role (missing role ID / Manage Roles permission). Admins can assign it manually.",
        inline: false,
      })
    }
    return { embeds: [base] }
  }

  const voucher = await store.issueVoucher({
    userId: interaction.user.id,
    prizeKey: picked.key,
    prizeLabel: picked.reward.label,
    guildId: interaction.guildId,
  })

  const voucherEmbed = new Embed()
    .setColor(config.brandColor)
    .setTitle("🎫 Voucher Details")
    .setDescription(
      [
        `**Voucher ID:** \`${voucher.id}\``,
        "",
        "Save this ID. An admin can verify it with:",
        `\`!checkid ${voucher.id}\``,
        "",
        "If you need help redeeming, open a ticket/support channel and paste the ID.",
      ].join("\n")
    )
    .setTimestamp()

  return { embeds: [base, voucherEmbed] }
}

module.exports = {
  isExpired,
  endAtMs,
  buildGiveawayEmbed,
  buildSpinRow,
  weightedPick,
  buildResultPayload,
}
