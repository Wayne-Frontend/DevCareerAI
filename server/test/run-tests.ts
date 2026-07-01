// 汇总入口：用 node:test 注册用例，由 `ts-node test/run-tests.ts` 统一运行。
// reflect-metadata 需在导入任何带装饰器的 Nest 模块前加载。
import 'reflect-metadata'

import './json-response.test'
import './text-limit.test'
import './normalize-util.test'
import './normalize.test'
import './ai-cache.test'
import './ai-config.test'
import './auth.test'
import './throttle.test'
