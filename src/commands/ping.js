import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with works!'),
  async execute(interaction) {
    await interaction.reply('works');
  }
};
