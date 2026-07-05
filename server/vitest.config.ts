import swc from 'unplugin-swc'
import { configDefaults, defineConfig } from 'vitest/config'

// esbuild 不支持 emitDecoratorMetadata，Nest 的构造器注入依赖 design:paramtypes 元数据，
// 因此测试转译必须走 SWC（与 NestJS 官方 vitest 方案一致）。
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
    include: ['test/**/*.test.ts'],
    // e2e 依赖真实测试数据库，走独立的 vitest.e2e.config.ts，默认单测保持离线可跑
    exclude: [...configDefaults.exclude, 'test/e2e/**'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.module.ts', 'src/prompts/**', 'src/**/dto/**'],
    },
  },
})
