import dotenv from 'dotenv';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DEPLOY_GUILD_ID || null; // set to your test server for instant

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
  process.exit(1);
}

function collectCommandPaths() {
  const candidates = [
    path.join(__dirname, 'src/commands'),
    path.join(__dirname, 'commands')
  ].filter(p => fs.existsSync(p));
  const out = [];
  for (const dir of candidates) {
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
      out.push(path.join(dir, f));
    }
  }
  return out;
}

const commands = [];
for (const file of collectCommandPaths()) {
  const mod = await import(pathToFileURL(file).href);
  const cmd = mod.default ?? mod;
  if (cmd?.data) commands.push(cmd.data.toJSON());
}

console.log(`🚀 Deploying ${commands.length} slash command(s)...`);
const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Guild commands deployed');
  }
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log('✅ Global commands deployed');
} catch (err) {
  console.error('❌ Failed to deploy commands:', err);
  process.exit(1);
}
