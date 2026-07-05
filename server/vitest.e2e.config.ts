import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// e2e 配置：与单测同样走 SWC 转译（Nest DI 依赖装饰器元数据），
// 差异在于连接真实测试数据库、串行执行、放宽超时。
export default defineConfig({
  // vitest 4 默认用 Oxc 转译，会绕过 SWC 导致装饰器元数据丢失，必须显式关闭
  oxc: false,
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2021',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        keepClassNames: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: false,
    include: ['test/e2e/**/*.e2e.ts'],
    setupFiles: ['test/e2e/setup-e2e.ts'],
    // 所有 e2e 文件共享同一个测试库，串行执行避免 truncate 互相干扰
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
