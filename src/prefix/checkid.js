import { PermissionFlagsBits } from "discord.js"
import config from "../../ny2026-config.js"
import store from "../utils/ny2026-store.js"
import { Embed } from "../utils/djs-compat.js"

export default {
  async execute(client, message, args) {
    const isAdmin = message.member?.permissions?.has?.(PermissionFlagsBits.Administrator)
    if (!isAdmin) return message.reply("❌ Admins only.").catch(() => {})

    const rawId = (args?.[0] || "").trim()
    if (!rawId) return message.reply("Usage: `!checkid NY26-000123`").catch(() => {})

    const voucher = await store.findVoucher(rawId)
    if (!voucher) return message.reply("❌ No win found for that ID.").catch(() => {})

    const embed = new Embed()
      .setColor(config.brandColor)
      .setTitle("✅ Voucher Verified")
      .setDescription(
        [
          `**Voucher ID:** \`${voucher.id}\``,
          `**Prize:** ${voucher.prizeLabel}`,
          `**User:** <@${voucher.userId}> (\`${voucher.userId}\`)`,
          `**Issued:** ${voucher.issuedAt}`,
          `**Guild:** ${voucher.guildId || "unknown"}`,
        ].join("\n")
      )
      .setTimestamp()

    try {
      await message.author.send({ embeds: [embed] })
      const ok = await message.reply("✅ Sent verification details to your DMs.").catch(() => null)
      if (ok) setTimeout(() => ok.delete().catch(() => {}), 12_000)
    } catch {
      await message.reply({ embeds: [embed] }).catch(() => {})
    }
  },
}
