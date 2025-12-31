const config = require("../ny2026-config")
const ny = require("../features/ny2026")
const store = require("../utils/ny2026-store")
const { isAdmin } = require("../utils/djs-compat")

async function handler(...params) {
  const client = params.find((p) => p && p.user && p.channels) || params[0]
  const message = params.find((p) => p && p.content && p.author && p.channel) || params[1]
  const args = params.find((p) => Array.isArray(p)) || []

  if (!message?.guild) return
  if (!isAdmin(message.member)) {
    await message.reply("❌ Only admins can use this command.")
    return
  }

  if (ny.isExpired()) {
    await message.reply("⏳ The NY2026 spin event is already over.")
    return
  }

  const channel = await client.channels.fetch(config.giveawayChannelId).catch(() => null)
  if (!channel?.send) {
    await message.reply("❌ I couldn’t access the giveaway channel ID you set.")
    return
  }

  const payload = {
    embeds: [ny.buildGiveawayEmbed()],
    components: [ny.buildSpinRow()],
  }

  const sent = await channel.send(payload).catch(() => null)
  if (!sent) {
    await message.reply("❌ Failed to send the giveaway embed. Check my permissions in that channel.")
    return
  }

  await store.setMeta({ giveawayMessageId: sent.id, giveawayChannelId: config.giveawayChannelId })

  await message.reply(`✅ Sent NY2026 Spin embed to <#${config.giveawayChannelId}>.`)
}

module.exports = {
  name: "sent2026",
  aliases: ["sent2026"],
  run: handler,
  execute: handler,
}
