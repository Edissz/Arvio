const ny = require("../features/ny2026")
const config = require("../ny2026-config")
const store = require("../utils/ny2026-store")
const { Embed } = require("../utils/djs-compat")

const active = new Set()

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function execute(...params) {
  const interaction = params.find((p) => p && typeof p.isButton === "function") || params[0]
  if (!interaction?.isButton?.()) return
  if (interaction.customId !== config.buttonCustomId) return
  if (!interaction.inGuild?.()) return

  if (ny.isExpired()) {
    await interaction.reply({ content: "⏳ This event ended (2026 already started).", ephemeral: true }).catch(() => {})
    return
  }

  const userId = interaction.user.id
  if (active.has(userId)) {
    await interaction.reply({ content: "⚠️ You’re already rolling. Chill 😭", ephemeral: true }).catch(() => {})
    return
  }

  active.add(userId)

  try {
    const user = await store.getUser(userId)
    const used = user.spinsUsed || 0
    const leftBefore = config.spinsPerUser - used

    if (leftBefore <= 0) {
      await interaction.reply({ content: "🎟️ You used all your spins.", ephemeral: true }).catch(() => {})
      return
    }

    await store.addSpin(userId)
    const leftAfter = leftBefore - 1

    const rollingEmbed = new Embed()
      .setColor(config.brandColor)
      .setTitle("🎡 Rolling…")
      .setDescription("Progress: **0%**")
      .addFields({ name: "🎟️ Spins left after this", value: String(leftAfter), inline: true })
      .setTimestamp()

    await interaction.reply({ embeds: [rollingEmbed], ephemeral: true }).catch(() => {})

    const steps = [18, 41, 67, 89, 100]
    for (const pct of steps) {
      await sleep(450)
      rollingEmbed.setDescription(`Progress: **${pct}%**`)
      await interaction.editReply({ embeds: [rollingEmbed] }).catch(() => {})
    }

    const picked = ny.weightedPick()
    const payload = await ny.buildResultPayload({ interaction, picked, spinsLeft: leftAfter })

    await interaction.editReply(payload).catch(() => {})
  } finally {
    active.delete(userId)
  }
}

module.exports = {
  name: "interactionCreate",
  once: false,
  execute,
}
