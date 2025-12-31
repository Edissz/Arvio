import { REST, Routes } from "discord.js"
import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"

function collectCommandFiles() {
  const roots = [path.join(process.cwd(), "src", "commands"), path.join(process.cwd(), "commands")].filter((p) =>
    fs.existsSync(p)
  )

  const files = []
  for (const dir of roots) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) {
      files.push(path.join(dir, f))
    }
  }
  return files
}

export async function refreshCommands() {
  const TOKEN = process.env.DISCORD_TOKEN
  const APP_ID =
    process.env.DISCORD_CLIENT_ID ||
    process.env.DISCORD_APPLICATION_ID ||
    process.env.CLIENT_ID

  const GUILD_ID =
    process.env.DEPLOY_GUILD_ID ||
    process.env.GUILD_ID ||
    null

  if (!TOKEN || !APP_ID) throw new Error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID")

  const commands = []
  const files = collectCommandFiles()

  for (const file of files) {
    const mod = await import(pathToFileURL(file).href)
    const cmd = mod.default ?? mod

    if (cmd?.data?.name && typeof cmd.execute === "function") {
      commands.push(cmd.data.toJSON())
    } else {
      console.warn(`⚠️ Skipped command (missing data/execute): ${path.basename(file)}`)
    }
  }

  const rest = new REST({ version: "10" }).setToken(TOKEN)

  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body: commands })
    console.log(`✅ Guild commands refreshed (${commands.length}) for guild ${GUILD_ID}`)

    if (process.env.DEPLOY_GLOBAL === "true") {
      await rest.put(Routes.applicationCommands(APP_ID), { body: commands })
      console.log(`✅ Global commands refreshed (${commands.length})`)
    } else {
      console.log("ℹ️ Skipping global deploy (set DEPLOY_GLOBAL=true if you want)")
    }

    return
  }

  await rest.put(Routes.applicationCommands(APP_ID), { body: commands })
  console.log(`✅ Global commands refreshed (${commands.length})`)
  console.log("ℹ️ Global commands can take time to appear. For instant, set DEPLOY_GUILD_ID.")
}
