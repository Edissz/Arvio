import fs from "fs"
import fsp from "fs/promises"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = process.env.BOT_STORE_FILE
  ? path.isAbsolute(process.env.BOT_STORE_FILE)
    ? process.env.BOT_STORE_FILE
    : path.join(process.cwd(), process.env.BOT_STORE_FILE)
  : path.join(DATA_DIR, "store.json")

let writeQueue = Promise.resolve()

// ✅ Defaults for the whole bot (tickets/anti-raid/etc)
export function withDefaults(input) {
  const base = {
    tickets: {},
    antiRaid: {
      enabled: false,
      logChannelId: "",
      action: "timeout", // "timeout" | "kick" | "ban"
      timeoutSeconds: 600,
      minAccountAgeDays: 7,
      minServerJoinAgeMinutes: 5,
    },
  }

  const obj = input && typeof input === "object" ? input : {}
  return {
    ...base,
    ...obj,
    tickets: { ...(base.tickets || {}), ...(obj.tickets || {}) },
    antiRaid: { ...(base.antiRaid || {}), ...(obj.antiRaid || {}) },
  }
}

async function ensurePaths() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILE)) {
    await fsp.writeFile(FILE, JSON.stringify(withDefaults({}), null, 2), "utf8")
  }
}

async function load() {
  await ensurePaths()
  try {
    const raw = await fsp.readFile(FILE, "utf8")
    const json = JSON.parse(raw)
    return withDefaults(json)
  } catch {
    return withDefaults({})
  }
}

async function save(state) {
  await ensurePaths()
  const tmp = FILE + ".tmp"
  await fsp.writeFile(tmp, JSON.stringify(withDefaults(state), null, 2), "utf8")
  await fsp.rename(tmp, FILE)
}

function withWriteLock(fn) {
  writeQueue = writeQueue.then(fn).catch(() => {})
  return writeQueue
}

// ✅ what tickets.js / anti-raid config command imports
export async function readConfig() {
  return await load()
}

export async function writeConfig(next) {
  return withWriteLock(async () => {
    const state = withDefaults(next)
    await save(state)
    return state
  })
}

// (optional helper, safe)
export async function updateConfig(mutator) {
  return withWriteLock(async () => {
    const state = await load()
    const next = (await mutator(state)) ?? state
    const merged = withDefaults(next)
    await save(merged)
    return merged
  })
}

export default {
  readConfig,
  writeConfig,
  withDefaults,
  updateConfig,
}
