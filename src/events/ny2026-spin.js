import ny from "../features/ny2026.js"
import config from "../../ny2026-config.js"
import store from "../utils/ny2026-store.js"
import { Embed } from "../utils/djs-compat.js"

const active = new Set()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction) {
    if (!interaction?.isButton?.()) return
    if (interaction.customId !== config.buttonCustomId) return
    if (!interaction.inGuild?.()) return

    if (ny.isExpired()) {
      return interaction.reply({ content: "⏳ This event ended (2026 already started).", ephemeral: true }).catch(() => {})
    }

    const userId = interaction.user.id
    if (active.has(userId)) {
      return interaction.reply({ content: "⚠️ You’re already rolling. Chill 😭", ephemeral: true }).catch(() => {})
    }

    active.add(userId)
    try {
      const user = await store.getUser(userId)
      const used = user.spinsUsed || 0
      const leftBefore = config.spinsPerUser - used

      if (leftBefore <= 0) {
        return interaction.reply({ content: "🎟️ You used all your spins.", ephemeral: true }).catch(() => {})
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

      for (const pct of [18, 41, 67, 89, 100]) {
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
  },
}
