import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { readConfig, hasSetup } from '../utils/store.js';
import { isAdmin } from '../utils/perm.js';
import { fill } from '../utils/text.js';
import { colors } from '../utils/colors.js';
import { sendLog } from '../utils/log.js';

export default {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Soft-ban a member (ban then unban to purge messages).')
    .addUserOption(o => o.setName('user').setDescription('Member to soft-ban').setRequired(true))
    .addIntegerOption(o => o.setName('purge_seconds').setDescription('Delete last N seconds of messages (max 604800)').setMinValue(0).setMaxValue(604800))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });
    const cfg = readConfig(interaction.guildId);
    if (!hasSetup(cfg)) return interaction.reply({ content: 'Run `/setup-moderation` first.', ephemeral: true });
    if (!isAdmin(interaction.member, cfg)) return interaction.reply({ content: 'Admin only.', ephemeral: true });

    const user = interaction.options.getUser('user', true);
    const purge = interaction.options.getInteger('purge_seconds') ?? 86400; // default 1 day
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (cfg?.moderation?.settings?.dmsEnabled) {
      const dm = cfg?.moderation?.dmTemplates?.softban || 'You have been **soft-banned** in {server}. Reason: {reason}';
      await user.send({ embeds: [new EmbedBuilder().setColor(colors.info).setDescription(fill(dm, { server: interaction.guild.name, reason }))] }).catch(() => null);
    }

    await interaction.guild.members.ban(user.id, { reason, deleteMessageSeconds: purge }).catch(e =>
      interaction.reply({ content: `Softban failed: ${e.message}`, ephemeral: true })
    );
    await interaction.guild.bans.remove(user.id, 'Softban unban').catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(colors.danger)
      .setTitle('🧹 Member Soft-banned')
      .addFields(
        { name: 'User', value: `${user} (${user.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'Purged', value: `${purge}s`, inline: true },
        { name: 'Reason', value: reason }
      ).setTimestamp();

    if (cfg?.moderation?.settings?.logStyle === 'detailed') {
      embed.setThumbnail(user.displayAvatarURL({ size: 128 }));
    }

    await sendLog(interaction.guild, cfg, { embeds: [embed] });
    return interaction.reply({ content: `Soft-banned ${user.tag}.`, ephemeral: true });
  }
};
