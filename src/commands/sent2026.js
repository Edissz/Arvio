import config from "../../ny2026-config.js"
import ny from "../features/ny2026.js"
import store from "../utils/ny2026-store.js"
import { isAdmin } from "../utils/djs-compat.js"

async function handler(...params) {
  const client = params.find((p) => p && p.user && p.channels) || params[0]
  const message = params.find((p) => p && p.content && p.author && p.channel) || params[1]

  if (!message?.guild) return
  if (!isAdmin(message.member)) return message.reply("❌ Only admins can use this command.")
  if (ny.isExpired()) return message.reply("⏳ The NY2026 spin event is already over.")

  const channel = await client.channels.fetch(config.giveawayChannelId).catch(() => null)
  if (!channel?.send) return message.reply("❌ I couldn’t access the giveaway channel ID you set.")

  const sent = await channel
    .send({ embeds: [ny.buildGiveawayEmbed()], components: [ny.buildSpinRow()] })
    .catch(() => null)

  if (!sent) return message.reply("❌ Failed to send the giveaway embed. Check my perms in that channel.")

  await store.setMeta({ giveawayMessageId: sent.id, giveawayChannelId: config.giveawayChannelId })
  return message.reply(`✅ Sent NY2026 Spin embed to <#${config.giveawayChannelId}>.`)
}

export default {
  name: "sent2026",
  aliases: ["sent2026"],
  run: handler,
  execute: handler,
}
