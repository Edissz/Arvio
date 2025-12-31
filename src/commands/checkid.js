import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import store from "../utils/ny2026-store.js"
import { Embed } from "../utils/djs-compat.js"
import config from "../ny2026-config.js"

export default {
  data: new SlashCommandBuilder()
    .setName("checkid")
    .setDescription("Verify a NY2026 voucher ID")
    .addStringOption((opt) =>
      opt.setName("id").setDescription("Voucher ID like NY26-000123").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "Use this in a server.", ephemeral: true })
    }

    const id = interaction.options.getString("id", true)
    const voucher = await store.findVoucher(id)

    if (!voucher) {
      return interaction.reply({ content: "❌ No win found for that ID.", ephemeral: true })
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

    return interaction.reply({ embeds: [embed], ephemeral: true })
  },
}
