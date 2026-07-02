<script setup lang="ts">
import { Compass, Home } from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6">
    <section class="grid max-w-md content-center justify-items-center gap-4 rounded-[28px] border border-white/70 bg-white/70 p-10 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div class="icon-tile h-16 w-16 rounded-[20px]">
        <Compass :size="30" />
      </div>
      <h1 class="m-0 text-6xl font-black leading-none text-indigo-500">404</h1>
      <h2 class="m-0 text-lg font-black text-[#0f172a]">页面不存在或无权访问</h2>
      <p class="m-0 max-w-xs text-sm leading-6 text-[#64748b]">
        你访问的地址可能已失效、被移动，或需要更高权限。请返回首页继续使用。
      </p>
      <RouterLink :to="authStore.isAuthenticated ? '/' : '/login'" class="btn-primary mt-2 min-w-[160px]">
        <Home :size="18" />
        {{ authStore.isAuthenticated ? '返回首页' : '前往登录' }}
      </RouterLink>
    </section>
  </main>
</template>
