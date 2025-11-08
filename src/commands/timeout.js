import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { readConfig, hasSetup } from '../utils/store.js';
import { isMod } from '../utils/perm.js';
import { fill } from '../utils/text.js';
import { colors } from '../utils/colors.js';
import { sendLog } from '../utils/log.js';

function minutesToMs(m) { return Math.max(1, Math.min(40320, m)) * 60 * 1000; } // 28d max

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a member for N minutes.')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Duration (1–40320)').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });
    const cfg = readConfig(interaction.guildId);
    if (!hasSetup(cfg)) return interaction.reply({ content: 'Run `/setup-moderation` first.', ephemeral: true });
    if (!isMod(interaction.member, cfg)) return interaction.reply({ content: 'No permission.', ephemeral: true });

    const user = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });

    if (cfg?.moderation?.settings?.dmsEnabled) {
      const dm = cfg?.moderation?.dmTemplates?.timeout || 'You have been **timed out** in {server} for {duration}. Reason: {reason}';
      await user.send({ embeds: [new EmbedBuilder().setColor(colors.info).setDescription(fill(dm, { server: interaction.guild.name, duration: `${minutes} minutes`, reason }))] }).catch(() => null);
    }

    await member.timeout(minutesToMs(minutes), reason).catch(e => interaction.reply({ content: `Timeout failed: ${e.message}`, ephemeral: true }));

    const embed = new EmbedBuilder()
      .setColor(colors.warning)
      .setTitle('⏳ Member Timed Out')
      .addFields(
        { name: 'User', value: `${user} (${user.id})`, inline: true },
        { name: 'Duration', value: `${minutes} minutes`, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    if (cfg?.moderation?.settings?.logStyle === 'detailed') {
      embed.setThumbnail(user.displayAvatarURL({ size: 128 }));
    }

    await sendLog(interaction.guild, cfg, { embeds: [embed] });
    return interaction.reply({ content: `Timed out ${user.tag} for ${minutes}m.`, ephemeral: true });
  }
};
