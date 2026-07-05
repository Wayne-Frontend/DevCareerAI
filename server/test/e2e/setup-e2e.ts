// e2e 环境注入：在任何测试文件（进而任何 Nest 模块）加载之前设置环境变量。
// 真实 process.env 优先于 server/.env，本地即使存在开发 .env 也不会串库。
import 'reflect-metadata'
import { Logger } from '@nestjs/common'

// 静音 Nest 启动/业务日志，保持 e2e 输出只有测试结果
Logger.overrideLogger(false)

process.env.DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/devcareer_test'
process.env.JWT_ACCESS_SECRET = 'e2e-test-secret-at-least-32-characters!!'
// 非占位值即可通过 env 校验；BASE_URL 指向不可达地址兜底——即使漏 override AI provider
// 也绝不会打到真实模型服务
process.env.AI_API_KEY = 'e2e-fake-key'
process.env.AI_BASE_URL = 'http://127.0.0.1:9'
process.env.AI_MODEL_FAST = 'e2e-fast'
process.env.AI_MODEL_QUALITY = 'e2e-quality'
process.env.NODE_ENV = 'test'

// 安全阀：e2e 会 TRUNCATE 全库，库名必须带 _test，防止误连开发/生产库
const databaseName = new URL(process.env.DATABASE_URL).pathname
if (!databaseName.includes('_test')) {
  throw new Error(`E2E 只允许连接 *_test 数据库，当前为：${databaseName}`)
}
