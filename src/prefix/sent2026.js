import { PermissionFlagsBits } from "discord.js"
import config from "../../ny2026-config.js"
import ny from "../features/ny2026.js"
import store from "../utils/ny2026-store.js"

export default {
  async execute(client, message) {
    const isAdmin = message.member?.permissions?.has?.(PermissionFlagsBits.Administrator)
    if (!isAdmin) return message.reply("❌ Admins only.").catch(() => {})

    if (ny.isExpired()) return message.reply("⏳ NY2026 event is over.").catch(() => {})

    const channel = await client.channels.fetch(config.giveawayChannelId).catch(() => null)
    if (!channel?.send) return message.reply("❌ I can’t access the giveaway channel.").catch(() => {})

    const sent = await channel
      .send({ embeds: [ny.buildGiveawayEmbed()], components: [ny.buildSpinRow()] })
      .catch(() => null)

    if (!sent) return message.reply("❌ Failed to send embed (check perms).").catch(() => {})

    await store.setMeta({ giveawayMessageId: sent.id, giveawayChannelId: config.giveawayChannelId })

    const ack = await message.reply(`✅ Sent NY2026 Spin embed to <#${config.giveawayChannelId}>.`).catch(() => null)
    if (ack) setTimeout(() => ack.delete().catch(() => {}), 12_000)
  },
}
