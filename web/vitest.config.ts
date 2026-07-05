import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// 复用 vite.config 的插件（vue / tailwind），只补测试相关配置。
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // happy-dom 提供 window / localStorage 等，authSession 与将来的组件测试都需要。
      environment: 'happy-dom',
      // 测试集中在 web/test/ 下，与后端 server/test/ 风格一致。
      include: ['test/**/*.test.ts'],
      exclude: [...configDefaults.exclude],
      // 显式从 'vitest' 导入 describe/it/expect，无需全局注入。
      globals: false,
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/main.ts', 'src/types/**', 'src/**/*.d.ts'],
      },
    },
  }),
)
