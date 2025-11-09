import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initTickets } from './features/tickets.js';
import { refreshCommands } from './register/refresh-commands.js'; // <-- new auto-register

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Loaded token:', process.env.DISCORD_TOKEN ? '✅ Found' : '❌ Missing');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const mod = await import(`./commands/${file}`);
    const cmd = mod.default ?? mod;
    client.commands.set(cmd.data.name, cmd);
  }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
    const mod = await import(`./events/${file}`);
    const evt = mod.default ?? mod;
    if (evt.once) client.once(evt.name, (...args) => evt.execute(client, ...args));
    else client.on(evt.name, (...args) => evt.execute(client, ...args));
  }
}

initTickets(client);

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('✅ Arvio Bot is online!'))
  .catch(err => console.error('❌ Login failed:', err));

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  if (process.env.AUTO_REGISTER_COMMANDS === 'true') {
    try {
      await refreshCommands();
      console.log('✅ Slash commands refreshed automatically.');
    } catch (e) {
      console.error('❌ Failed to refresh commands:', e);
    }
  }
});

process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));

client.on('interactionCreate', i => {
  if (!i.isCommand() && !i.isButton() && !i.isStringSelectMenu()) return;
  if (!client.commands.has(i.commandName) && !i.customId)
    console.warn('⚠️ Unknown interaction received.');
});
