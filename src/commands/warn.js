import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { readConfig, hasSetup } from '../utils/store.js';
import { isMod } from '../utils/perm.js';
import { fill } from '../utils/text.js';
import { colors } from '../utils/colors.js';
import { sendLog } from '../utils/log.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (DM + mod log).')
    .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });
    const cfg = readConfig(interaction.guildId);
    if (!hasSetup(cfg)) return interaction.reply({ content: 'Run `/setup-moderation` first.', ephemeral: true });
    if (!isMod(interaction.member, cfg)) return interaction.reply({ content: 'No permission.', ephemeral: true });

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (cfg?.moderation?.settings?.dmsEnabled) {
      const dmTmpl = cfg?.moderation?.dmTemplates?.warn || 'You have been **warned** in {server}. Reason: {reason}';
      await user.send({ embeds: [new EmbedBuilder().setColor(colors.info).setDescription(fill(dmTmpl, { server: interaction.guild.name, reason }))] }).catch(() => null);
    }

    const embed = new EmbedBuilder()
      .setColor(colors.warning)
      .setTitle('⚠️ Member Warned')
      .addFields(
        { name: 'User', value: `${user} (${user.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'Reason', value: reason }
      ).setTimestamp();

    if (cfg?.moderation?.settings?.logStyle === 'detailed') {
      embed.setThumbnail(user.displayAvatarURL({ size: 128 }));
    }

    await sendLog(interaction.guild, cfg, { embeds: [embed] });
    return interaction.reply({ content: `Warned ${user.tag}.`, ephemeral: true });
  }
};
