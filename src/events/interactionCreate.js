import { Events } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (e) {
      const msg = '<:v7:1435698081399308420> Something went wrong, please try again later.';
      if (interaction.deferred || interaction.replied) await interaction.followUp({ content: msg, ephemeral: true });
      else await interaction.reply({ content: msg, ephemeral: true });
      console.error(e);
    }
  }
};
