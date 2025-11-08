import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { readConfig, hasSetup } from '../utils/store.js';
import { isAdmin } from '../utils/perm.js';
import { fill } from '../utils/text.js';
import { colors } from '../utils/colors.js';
import { sendLog } from '../utils/log.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member.')
    .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),
  async execute(interaction) {
    if (!interaction.inGuild())
      return interaction.reply({ content: '<:v7:1435698081399308420> Use in a server.', ephemeral: true });

    const cfg = readConfig(interaction.guildId);
    if (!hasSetup(cfg))
      return interaction.reply({ content: '<:v7:1435698081399308420> Error: Run `/setup-moderation` first.', ephemeral: true });

    if (!isAdmin(interaction.member, cfg))
      return interaction.reply({ content: '<:v7:1435698081399308420> You’re missing the roles or permissions needed to use this command.', ephemeral: true });

    const theme = colors[cfg?.moderation?.settings?.theme] ?? colors.primary;
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Send DM if enabled
    if (cfg?.moderation?.settings?.dmsEnabled) {
      const dm = cfg?.moderation?.dmTemplates?.ban || '<:v8:1435703107332997301> You have been **banned** from {server}. Reason: {reason}';
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.info)
            .setDescription(fill(dm, { server: interaction.guild.name, reason }))
        ]
      }).catch(() => null);
    }

    // Try to ban user
    try {
      await interaction.guild.members.ban(user.id, { reason });
    } catch (e) {
      return interaction.reply({
        content: `<:v7:1435698081399308420> Ban failed: ${e.message}`,
        ephemeral: true
      });
    }

    // Log embed
    const embed = new EmbedBuilder()
      .setColor(colors.danger)
      .setTitle('<:v8:1435703107332997301> Member Banned')
      .addFields(
        { name: 'User', value: `${user} (${user.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    if (cfg?.moderation?.settings?.logStyle === 'detailed') {
      embed.setThumbnail(user.displayAvatarURL({ size: 128 }));
    }

    await sendLog(interaction.guild, cfg, { embeds: [embed] });

    return interaction.reply({
      content: `<:v8:1435703107332997301> Banned **${user.tag}** successfully.`,
      ephemeral: true
    });
  }
};
