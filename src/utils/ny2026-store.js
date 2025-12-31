import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import crypto from "crypto"
import config from "../../ny2026-config.js"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "ny2026.json")

let writeQueue = Promise.resolve()

function defaultState() {
  return { users: {}, vouchers: {} }
}

async function ensurePaths() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    await fsp.writeFile(DATA_FILE, JSON.stringify(defaultState(), null, 2), "utf8")
  }
}

async function load() {
  await ensurePaths()
  try {
    const raw = await fsp.readFile(DATA_FILE, "utf8")
    const json = JSON.parse(raw)
    return json && typeof json === "object" ? json : defaultState()
  } catch {
    return defaultState()
  }
}

async function save(state) {
  await ensurePaths()
  const tmp = DATA_FILE + ".tmp"
  await fsp.writeFile(tmp, JSON.stringify(state, null, 2), "utf8")
  await fsp.rename(tmp, DATA_FILE)
}

function withWriteLock(fn) {
  writeQueue = writeQueue.then(fn).catch(() => {})
  return writeQueue
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

function randomCode(len = 8) {
  const bytes = crypto.randomBytes(len)
  let out = ""
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

function ensureUser(state, userId) {
  if (!state.users[userId]) {
    state.users[userId] = { spinsUsed: 0, lastSpinAt: null }
  } else {
    if (typeof state.users[userId].spinsUsed !== "number") state.users[userId].spinsUsed = 0
    if (!("lastSpinAt" in state.users[userId])) state.users[userId].lastSpinAt = null
  }
  return state.users[userId]
}

async function getUser(userId) {
  const state = await load()
  const u = ensureUser(state, userId)
  await save(state)
  return u
}

async function addSpin(userId) {
  return withWriteLock(async () => {
    const state = await load()
    const u = ensureUser(state, userId)
    u.spinsUsed += 1
    u.lastSpinAt = new Date().toISOString()
    await save(state)
    return u
  })
}

async function issueVoucher({ userId, prizeKey, prizeLabel, guildId }) {
  return withWriteLock(async () => {
    const state = await load()

    let id = ""
    for (let i = 0; i < 12; i++) {
      const candidate = `${config.voucherPrefix}-${randomCode(8)}`
      if (!state.vouchers[candidate]) {
        id = candidate
        break
      }
    }
    if (!id) id = `${config.voucherPrefix}-${randomCode(10)}`

    state.vouchers[id] = {
      id,
      userId,
      guildId: guildId || null,
      prizeKey,
      prizeLabel,
      issuedAt: new Date().toISOString(),
    }

    await save(state)
    return state.vouchers[id]
  })
}

async function findVoucher(voucherId) {
  const state = await load()
  const key = String(voucherId || "").trim().toUpperCase()
  return state.vouchers[key] || null
}

export default {
  getUser,
  addSpin,
  issueVoucher,
  findVoucher,
}
