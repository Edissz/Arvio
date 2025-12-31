import sent2026 from "../prefix/sent2026.js"
import checkid from "../prefix/checkid.js"

const PREFIX = process.env.PREFIX || "!"

const map = new Map([
  ["sent2026", sent2026],
  ["checkid", checkid],
])

export default {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (!message?.guild) return
    if (!message?.content) return
    if (message.author?.bot) return
    if (!message.content.startsWith(PREFIX)) return

    const raw = message.content.slice(PREFIX.length).trim()
    if (!raw) return

    const [nameRaw, ...args] = raw.split(/\s+/g)
    const name = (nameRaw || "").toLowerCase()

    const cmd = map.get(name)
    if (!cmd) return

    try {
      await cmd.execute(client, message, args)
    } catch (e) {
      console.error(`Prefix cmd error: ${name}`, e)
      await message.reply("❌ Command failed. Check logs.").catch(() => {})
    }
  },
}
