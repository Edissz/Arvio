const store = require("../utils/ny2026-store")
const { Embed, isAdmin } = require("../utils/djs-compat")
const config = require("../ny2026-config")

async function handler(...params) {
  const message = params.find((p) => p && p.content && p.author && p.channel) || params[1]
  const args = params.find((p) => Array.isArray(p)) || []

  if (!message?.guild) return
  if (!isAdmin(message.member)) {
    await message.reply("❌ Only admins can use this command.")
    return
  }

  const raw = args?.[0]
  if (!raw) {
    await message.reply("Usage: `!checkid NY26-000000`")
    return
  }

  const voucher = await store.findVoucher(raw)
  if (!voucher) {
    await message.reply("❌ No win found for that ID.")
    return
  }

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

  await message.reply({ embeds: [embed] })
}

module.exports = {
  name: "checkid",
  aliases: ["checkid"],
  run: handler,
  execute: handler,
}
