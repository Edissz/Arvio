import store from "../utils/ny2026-store.js"
import { Embed, isAdmin } from "../utils/djs-compat.js"
import config from "../../ny2026-config.js"

async function handler(...params) {
  const message = params.find((p) => p && p.content && p.author && p.channel) || params[1]
  const args = params.find((p) => Array.isArray(p)) || []

  if (!message?.guild) return
  if (!isAdmin(message.member)) return message.reply("❌ Only admins can use this command.")

  const raw = args?.[0]
  if (!raw) return message.reply("Usage: `!checkid NY26-000000`")

  const voucher = await store.findVoucher(raw)
  if (!voucher) return message.reply("❌ No win found for that ID.")

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

  return message.reply({ embeds: [embed] })
}

export default {
  name: "checkid",
  aliases: ["checkid"],
  run: handler,
  execute: handler,
}
