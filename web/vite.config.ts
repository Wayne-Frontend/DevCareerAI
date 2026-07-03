import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // dev 下前端走同源 /api 由此转发到后端，避免依赖后端宽松 CORS。
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // echarts 体积大且仅少数页面使用，markdown-it 仅聊天场景使用，单独拆包减小首屏。
        // Vite 8（Rolldown）已移除 manualChunks 的对象写法，只支持函数形式。
        manualChunks(id) {
          // zrender 是 echarts 的底层渲染库，须与 echarts 同包，否则拆分不完整。
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'echarts'
          }
          if (id.includes('node_modules/markdown-it')) {
            return 'markdown'
          }
        },
      },
    },
  },
})
