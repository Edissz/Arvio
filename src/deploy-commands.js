import dotenv from 'dotenv';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = 'YOUR_GUILD_ID'; // replace with your server ID (right-click → Copy ID)

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Missing token, client, or guild ID.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const mod = await import(`./commands/${file}`);
  const cmd = mod.default ?? mod;
  if (!cmd?.data) continue;
  commands.push(cmd.data.toJSON());
}

console.log(`🚀 Deploying ${commands.length} slash command(s) to guild ${GUILD_ID}...`);
const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('✅ Commands deployed instantly (guild mode).');
} catch (err) {
  console.error('❌ Failed to deploy:', err);
}
