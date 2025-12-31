import config from "../../ny2026-config.js"
import store from "../utils/ny2026-store.js"

function isAdmin(member) {
  if (!member?.permissions) return false
  return member.permissions.has("Administrator") || member.permissions.has("ManageGuild")
}

async function resolveTargetUserId(message, raw) {
  // 1) Real mention
  const mentioned = message.mentions?.users?.first?.()
  if (mentioned?.id) return mentioned.id

  if (!raw) return null
  const input = String(raw).trim()

  // 2) User ID
  if (/^\d{14,22}$/.test(input)) return input

  // 3) "@name" or "name" -> try find in cache
  const name = input.replace(/^@/, "").toLowerCase()

  const fromCache =
    message.guild.members.cache.find((m) => m.user?.username?.toLowerCase() === name) ||
    message.guild.members.cache.find((m) => m.displayName?.toLowerCase() === name)

  if (fromCache?.id) return fromCache.id

  // 4) Search/fetch members by query (works well even if not cached)
  try {
    const fetched = await message.guild.members.fetch({ query: name, limit: 10 })
    const exact =
      fetched.find((m) => m.user?.username?.toLowerCase() === name) ||
      fetched.find((m) => m.displayName?.toLowerCase() === name) ||
      fetched.first()

    return exact?.id || null
  } catch {
    return null
  }
}

export default {
  name: "giveticket",
  async execute(message, args) {
    if (!message.guild) return
    if (!isAdmin(message.member)) {
      return message.reply("❌ Admin only.").catch(() => {})
    }

    const targetId = await resolveTargetUserId(message, args?.[0])
    if (!targetId) {
      return message.reply("Usage: `!giveticket <@user | userId | username> [amount]`").catch(() => {})
    }

    let amount = Number.parseInt(args?.[1] ?? "1", 10)
    if (!Number.isFinite(amount) || amount <= 0) amount = 1
    if (amount > 200) amount = 200

    if (typeof store.addExtraSpins !== "function") {
      return message.reply("❌ Storage function missing: `addExtraSpins`. Update `src/utils/ny2026-store.js`.").catch(() => {})
    }

    const userState = await store.addExtraSpins(targetId, amount)

    const allowed = config.spinsPerUser + (userState.extraSpins || 0)
    const left = Math.max(0, allowed - (userState.spinsUsed || 0))

    return message
      .reply(
        `✅ Added **${amount}** ticket(s) to <@${targetId}>.\nAllowed spins: **${allowed}** • Spins left: **${left}**`
      )
      .catch(() => {})
  },
}
