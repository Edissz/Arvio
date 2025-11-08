import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { readConfig, hasSetup } from '../utils/store.js';
import { isAdmin } from '../utils/perm.js';
import { colors } from '../utils/colors.js';
import { sendLog } from '../utils/log.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID.')
    .addStringOption(o => o.setName('user_id').setDescription('User ID').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });
    const cfg = readConfig(interaction.guildId);
    if (!hasSetup(cfg)) return interaction.reply({ content: 'Run `/setup-moderation` first.', ephemeral: true });
    if (!isAdmin(interaction.member, cfg)) return interaction.reply({ content: 'Admin only.', ephemeral: true });

    const id = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.guild.bans.remove(id, reason).catch(e => interaction.reply({ content: `Unban failed: ${e.message}`, ephemeral: true }));

    const embed = new EmbedBuilder()
      .setColor(colors.success)
      .setTitle('✅ User Unbanned')
      .addFields(
        { name: 'User ID', value: id, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'Reason', value: reason }
      ).setTimestamp();

    await sendLog(interaction.guild, cfg, { embeds: [embed] });
    return interaction.reply({ content: `Unbanned \`${id}\`.`, ephemeral: true });
  }
};
