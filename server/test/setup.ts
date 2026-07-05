// reflect-metadata 必须在导入任何带装饰器的 Nest 模块前加载（原 run-tests.ts 的职责）。
import 'reflect-metadata'
import { Logger } from '@nestjs/common'

// 静音 Nest Logger：多个用例故意触发被测代码的 error 日志（埋点吞错、启动清理容错），
// 属预期行为，放任输出会让全绿的测试看起来像有错误。
Logger.overrideLogger(false)
