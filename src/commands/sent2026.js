import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import config from "../../ny2026-config.js"
import ny from "../features/ny2026.js"
import store from "../utils/ny2026-store.js"

export default {
  data: new SlashCommandBuilder()
    .setName("sent2026")
    .setDescription("Post the NY2026 Spin embed in the giveaway channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "Use this in a server.", ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    if (ny.isExpired()) {
      return interaction.editReply("⏳ The NY2026 spin event is already over.")
    }

    const channel = await interaction.client.channels.fetch(config.giveawayChannelId).catch(() => null)
    if (!channel?.send) {
      return interaction.editReply("❌ I couldn’t access the giveaway channel. Check channel ID + perms.")
    }

    const sent = await channel
      .send({ embeds: [ny.buildGiveawayEmbed()], components: [ny.buildSpinRow()] })
      .catch(() => null)

    if (!sent) {
      return interaction.editReply("❌ Failed to send embed. Check perms: Send Messages + Embed Links.")
    }

    await store.setMeta({ giveawayMessageId: sent.id, giveawayChannelId: config.giveawayChannelId })
    return interaction.editReply(`✅ Sent NY2026 Spin embed to <#${config.giveawayChannelId}>.`)
  },
}
