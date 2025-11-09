import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

function loadCommandFiles() {
  const roots = [path.resolve('src/commands'), path.resolve('commands')].filter(fs.existsSync);
  const files = [];
  for (const dir of roots) {
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
      files.push(path.join(dir, f));
    }
  }
  return files;
}

export async function refreshCommands() {
  const TOKEN = process.env.DISCORD_TOKEN;
  const APP_ID = process.env.DISCORD_CLIENT_ID;
  const GUILD_ID = process.env.DEPLOY_GUILD_ID || null; // optional fast deploy
  if (!TOKEN || !APP_ID) throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');

  const commands = [];
  for (const file of loadCommandFiles()) {
    const mod = await import(pathToFileURL(file).href);
    const cmd = mod.default ?? mod;
    if (cmd?.data) commands.push(cmd.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body: commands });
    console.log('✅ Guild commands refreshed');
  }
  await rest.put(Routes.applicationCommands(APP_ID), { body: commands });
  console.log('✅ Global commands refreshed');
}
