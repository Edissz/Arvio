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

function defaultConfig() {
  return {
    tickets: {},
  }
}

async function ensurePaths() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILE)) {
    await fsp.writeFile(FILE, JSON.stringify(defaultConfig(), null, 2), "utf8")
  }
}

async function load() {
  await ensurePaths()
  try {
    const raw = await fsp.readFile(FILE, "utf8")
    const json = JSON.parse(raw)
    return json && typeof json === "object" ? json : defaultConfig()
  } catch {
    return defaultConfig()
  }
}

async function save(state) {
  await ensurePaths()
  const tmp = FILE + ".tmp"
  await fsp.writeFile(tmp, JSON.stringify(state, null, 2), "utf8")
  await fsp.rename(tmp, FILE)
}

function withWriteLock(fn) {
  writeQueue = writeQueue.then(fn).catch(() => {})
  return writeQueue
}

/**
 * ✅ What tickets.js expects:
 * readConfig() -> returns whole config object
 * writeConfig(nextConfig) -> saves whole object
 */
export async function readConfig() {
  return await load()
}

export async function writeConfig(next) {
  return withWriteLock(async () => {
    const state = next && typeof next === "object" ? next : defaultConfig()
    await save(state)
    return state
  })
}

/**
 * Extra helpers (won’t hurt anything, useful for other modules)
 */
export async function updateConfig(mutator) {
  return withWriteLock(async () => {
    const state = await load()
    const next = (await mutator(state)) ?? state
    await save(next)
    return next
  })
}

const store = {
  readConfig,
  writeConfig,
  updateConfig,
}

export default store
