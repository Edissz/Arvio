import dotenv from "dotenv"
dotenv.config({ path: "./.env" })

import { Client, Collection, GatewayIntentBits, Partials, Events } from "discord.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { initTickets } from "./features/tickets.js"
import { refreshCommands } from "./register/refresh-commands.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("Loaded token:", process.env.DISCORD_TOKEN ? "✅ Found" : "❌ Missing")
console.log("Loaded client id:", process.env.DISCORD_CLIENT_ID ? "✅ Found" : "❌ Missing")
console.log("Deploy guild id:", process.env.DEPLOY_GUILD_ID ? `✅ ${process.env.DEPLOY_GUILD_ID}` : "⚠️ Not set")

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
})

client.commands = new Collection()

// Load slash commands from /src/commands
const commandsPath = path.join(__dirname, "commands")
if (fs.existsSync(commandsPath)) {
  for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
    const mod = await import(`./commands/${file}`)
    const cmd = mod.default ?? mod

    if (!cmd?.data?.name || typeof cmd.execute !== "function") {
      console.warn(`⚠️ Skipped command (invalid export): ${file}`)
      continue
    }

    client.commands.set(cmd.data.name, cmd)
  }
  console.log(`✅ Loaded ${client.commands.size} command(s)`)
} else {
  console.warn("⚠️ No src/commands folder found")
}

// Load events from /src/events
const eventsPath = path.join(__dirname, "events")
if (fs.existsSync(eventsPath)) {
  for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))) {
    const mod = await import(`./events/${file}`)
    const evt = mod.default ?? mod

    if (!evt?.name || typeof evt.execute !== "function") {
      console.warn(`⚠️ Skipped event (invalid export): ${file}`)
      continue
    }

    if (evt.once) client.once(evt.name, (...args) => evt.execute(client, ...args))
    else client.on(evt.name, (...args) => evt.execute(client, ...args))
  }
  console.log("✅ Events loaded")
}

initTickets(client)

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("✅ Arvio Bot is online!"))
  .catch((err) => console.error("❌ Login failed:", err))

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`)

  if (process.env.AUTO_REGISTER_COMMANDS === "true") {
    try {
      await refreshCommands()
      console.log("✅ Slash commands refreshed automatically.")
    } catch (e) {
      console.error("❌ Failed to refresh commands:", e)
    }
  } else {
    console.log("ℹ️ AUTO_REGISTER_COMMANDS is OFF. Set it to 'true' to auto-deploy commands.")
  }
})

process.on("unhandledRejection", (err) => console.error("Unhandled Rejection:", err))
process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err))
