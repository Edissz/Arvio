import dotenv from "dotenv"
dotenv.config({ path: "./.env" })

import { Client, Collection, GatewayIntentBits, Partials } from "discord.js"
import fs from "fs"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"

import { initTickets } from "./features/tickets.js"
import { refreshCommands } from "./register/refresh-commands.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("Loaded token:", process.env.DISCORD_TOKEN ? "✅ Found" : "❌ Missing")

const PREFIX = process.env.PREFIX || "!"

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
})

client.slashCommands = new Collection()
client.chatCommands = new Collection()

function getCommandDirs() {
  const dirs = [
    path.join(__dirname, "commands"),        // /src/commands
    path.resolve("commands"),               // /commands (optional)
  ]
  return dirs.filter((d) => fs.existsSync(d))
}

async function loadCommands() {
  const dirs = getCommandDirs()

  for (const dir of dirs) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"))
    for (const file of files) {
      const full = path.join(dir, file)
      const mod = await import(pathToFileURL(full).href)
      const cmd = mod.default ?? mod

      // Slash command (has .data)
      if (cmd?.data?.name && typeof cmd.execute === "function") {
        client.slashCommands.set(cmd.data.name, cmd)
        continue
      }

      // Chat/prefix command (has .name)
      if (cmd?.name && typeof cmd.execute === "function") {
        client.chatCommands.set(cmd.name, cmd)
        continue
      }
    }
  }

  console.log(
    `✅ Loaded ${client.slashCommands.size} slash cmd(s) + ${client.chatCommands.size} chat cmd(s)`
  )
}

function getEventDirs() {
  const dirs = [
    path.join(__dirname, "events"),          // /src/events
    path.resolve("events"),                 // /events (optional)
  ]
  return dirs.filter((d) => fs.existsSync(d))
}

async function loadEvents() {
  const dirs = getEventDirs()

  for (const dir of dirs) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"))
    for (const file of files) {
      const full = path.join(dir, file)
      const mod = await import(pathToFileURL(full).href)
      const evt = mod.default ?? mod
      if (!evt?.name || typeof evt.execute !== "function") continue

      if (evt.once) client.once(evt.name, (...args) => evt.execute(client, ...args))
      else client.on(evt.name, (...args) => evt.execute(client, ...args))
    }
  }
}

await loadCommands()
await loadEvents()

initTickets(client)

client.on("messageCreate", async (message) => {
  if (!message.guild) return
  if (message.author.bot) return
  if (!message.content?.startsWith(PREFIX)) return

  const raw = message.content.slice(PREFIX.length).trim()
  if (!raw) return

  const parts = raw.split(/\s+/)
  const name = (parts.shift() || "").toLowerCase()
  const args = parts

  const cmd = client.chatCommands.get(name)
  if (!cmd) return

  try {
    await cmd.execute(message, args, client)
  } catch (e) {
    console.error(`❌ Chat cmd failed: ${name}`, e)
    await message.reply("❌ Something went wrong running that command.").catch(() => {})
  }
})

client.on("interactionCreate", async (interaction) => {
  // only handle slash commands here (buttons are handled by your events, like ny2026-spin)
  if (!interaction.isChatInputCommand?.()) return

  const cmd = client.slashCommands.get(interaction.commandName)
  if (!cmd) return

  try {
    await cmd.execute(interaction, client)
  } catch (e) {
    console.error(`❌ Slash cmd failed: ${interaction.commandName}`, e)
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: "❌ Command failed.", ephemeral: true }).catch(() => {})
    } else {
      await interaction.reply({ content: "❌ Command failed.", ephemeral: true }).catch(() => {})
    }
  }
})

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("✅ Arvio Bot is online!"))
  .catch((err) => console.error("❌ Login failed:", err))

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`)

  if (process.env.AUTO_REGISTER_COMMANDS === "true") {
    try {
      await refreshCommands()
      console.log("✅ Slash commands refreshed automatically.")
    } catch (e) {
      console.error("❌ Failed to refresh commands:", e)
    }
  }
})

process.on("unhandledRejection", (err) => console.error("Unhandled Rejection:", err))
process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err))
