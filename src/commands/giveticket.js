import config from "../../ny2026-config.js"
import store from "../utils/ny2026-store.js"

function parseUserId(input) {
  if (!input) return null
  const s = String(input).trim()
  const m = s.match(/^<@!?(\d+)>$/)
  if (m) return m[1]
  if (/^\d{14,22}$/.test(s)) return s
  return null
}

function isAdmin(member) {
  if (!member?.permissions) return false
  return member.permissions.has("Administrator") || member.permissions.has("ManageGuild")
}

export default {
  name: "giveticket",
  async execute(message, args) {
    if (!message.guild) return
    if (!isAdmin(message.member)) return message.reply("❌ Admin only.").catch(() => {})

    const targetId = parseUserId(args?.[0])
    if (!targetId) {
      return message.reply("Usage: `!giveticket <userId|@mention> [amount]`").catch(() => {})
    }

    let amount = Number.parseInt(args?.[1] ?? "1", 10)
    if (!Number.isFinite(amount) || amount <= 0) amount = 1
    if (amount > 50) amount = 50

    const userState = await store.addExtraSpins(targetId, amount)

    const allowed = config.spinsPerUser + (userState.extraSpins || 0)
    const left = Math.max(0, allowed - (userState.spinsUsed || 0))

    return message
      .reply(`✅ Added **${amount}** ticket(s) to <@${targetId}>.\nAllowed spins: **${allowed}** • Spins left: **${left}**`)
      .catch(() => {})
  },
}
