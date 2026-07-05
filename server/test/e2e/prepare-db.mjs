// e2e 前置：把迁移应用到测试库（幂等）。独立小脚本以兼容 win32 的 env 注入，免引入 cross-env。
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/devcareer_test'

if (!new URL(databaseUrl).pathname.includes('_test')) {
  console.error(`E2E 只允许连接 *_test 数据库，当前为：${databaseUrl}`)
  process.exit(1)
}

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  cwd: serverDir,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status ?? 1)
