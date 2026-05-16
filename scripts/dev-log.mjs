import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const logDir = join(root, 'logs')
const logFile = join(logDir, 'dev.log')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

mkdirSync(logDir, { recursive: true })

const logStream = createWriteStream(logFile, {
  flags: 'w',
  encoding: 'utf8',
})

const child = spawn(npmCommand, ['run', 'dev'], {
  cwd: root,
  env: {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
  },
  stdio: ['inherit', 'pipe', 'pipe'],
})

function writeOutput(stream, chunk) {
  stream.write(chunk)
  logStream.write(chunk)
}

child.stdout.on('data', (chunk) => writeOutput(process.stdout, chunk))
child.stderr.on('data', (chunk) => writeOutput(process.stderr, chunk))

child.on('exit', (code, signal) => {
  logStream.end()
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
