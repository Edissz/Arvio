"use strict"

const fs = require("fs")
const fsp = require("fs/promises")
const path = require("path")
const crypto = require("crypto")
const { voucherPrefix } = require("../ny2026-config")

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "ny2026.json")

let writeQueue = Promise.resolve()

function defaultState() {
  return {
    meta: {},
    users: {},
    vouchers: {},
  }
}

async function ensurePaths() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) await fsp.writeFile(DATA_FILE, JSON.stringify(defaultState(), null, 2), "utf8")
}

async function load() {
  await ensurePaths()
  const raw = await fsp.readFile(DATA_FILE, "utf8")
  try {
    return JSON.parse(raw)
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

function pad6(n) {
  return String(n).padStart(6, "0")
}

function normalizeVoucherId(input) {
  if (!input) return ""
  const s = String(input).trim().toUpperCase()
  if (/^\d{4,10}$/.test(s)) return `${voucherPrefix}-${s}`
  return s
}

function randomNumericCode6() {
  const n = crypto.randomInt(0, 1_000_000)
  return pad6(n)
}

async function getUser(userId) {
  const state = await load()
  if (!state.users[userId]) {
    state.users[userId] = { spinsUsed: 0, lastSpinAt: null }
    await save(state)
  }
  return state.users[userId]
}

async function addSpin(userId) {
  return withWriteLock(async () => {
    const state = await load()
    if (!state.users[userId]) state.users[userId] = { spinsUsed: 0, lastSpinAt: null }
    state.users[userId].spinsUsed += 1
    state.users[userId].lastSpinAt = new Date().toISOString()
    await save(state)
    return state.users[userId]
  })
}

async function issueVoucher({ userId, prizeKey, prizeLabel, guildId }) {
  return withWriteLock(async () => {
    const state = await load()

    let id = ""
    for (let i = 0; i < 10; i++) {
      const code = randomNumericCode6()
      const candidate = `${voucherPrefix}-${code}`
      if (!state.vouchers[candidate]) {
        id = candidate
        break
      }
    }

    if (!id) id = `${voucherPrefix}-${randomNumericCode6()}`

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

async function findVoucher(voucherIdRaw) {
  const id = normalizeVoucherId(voucherIdRaw)
  const state = await load()
  return state.vouchers[id] || null
}

async function setMeta(metaPatch) {
  return withWriteLock(async () => {
    const state = await load()
    state.meta = { ...(state.meta || {}), ...(metaPatch || {}) }
    await save(state)
    return state.meta
  })
}

module.exports = {
  normalizeVoucherId,
  getUser,
  addSpin,
  issueVoucher,
  findVoucher,
  setMeta,
}
