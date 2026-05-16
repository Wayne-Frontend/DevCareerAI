import { readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const logDirectories = [root, join(root, 'web'), join(root, 'server'), join(root, 'logs')]
let removedCount = 0

for (const directory of logDirectories) {
  let entries = []

  try {
    entries = readdirSync(directory)
  } catch {
    continue
  }

  for (const entry of entries) {
    const filePath = join(directory, entry)

    if (!entry.endsWith('.log')) {
      continue
    }

    try {
      if (statSync(filePath).isFile()) {
        rmSync(filePath, { force: true })
        removedCount += 1
      }
    } catch (error) {
      console.warn(`Skipped locked log file: ${filePath}`)
    }
  }
}

console.log(`Removed ${removedCount} log file${removedCount === 1 ? '' : 's'}.`)
