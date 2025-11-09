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

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
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

console.log(`🚀 Deploying ${commands.length} global slash command(s)...`);
const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log('✅ Global commands deployed (may take up to 10 minutes to appear globally).');
} catch (err) {
  console.error('❌ Failed to deploy commands:', err);
}
