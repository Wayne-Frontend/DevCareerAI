<script setup lang="ts">
import { Bell, LogOut, Sun, UserRound } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { logout as logoutRequest } from '../api/auth'
import { useAuthStore } from '../stores/auth'
import { notify } from '../utils/notify'

const router = useRouter()
const authStore = useAuthStore()

async function logout() {
  try {
    await logoutRequest()
  } catch {
    // Local logout should still happen if the remote session is already invalid.
  } finally {
    authStore.clearSession()
    notify('已退出登录', 'success')
    await router.push('/login')
  }
}
</script>

<template>
  <header
    class="relative mb-2 flex h-[80px] items-center justify-end overflow-hidden rounded-[16px] border border-white/70 bg-white/58 px-[18px] shadow-[0_18px_50px_rgba(43,55,96,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_32%,rgba(99,102,241,0.11),transparent_28%),radial-gradient(circle_at_94%_18%,rgba(56,189,248,0.08),transparent_22%)]"
    />

    <div class="relative z-10 flex items-center gap-3">
      <button class="grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/62 text-[#475569] shadow-[0_12px_26px_rgba(43,55,96,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:text-[#4f46e5]" aria-label="切换主题">
        <Sun :size="22" stroke-width="1.75" />
      </button>
      <button class="grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/62 text-[#475569] shadow-[0_12px_26px_rgba(43,55,96,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:text-[#4f46e5]" aria-label="通知">
        <Bell :size="22" stroke-width="1.75" />
      </button>
      <RouterLink to="/settings" class="flex h-12 items-center gap-3 rounded-full text-[#475569]" aria-label="打开设置">
        <span class="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 shadow-[0_10px_24px_rgba(43,55,96,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <UserRound :size="22" stroke-width="1.8" />
        </span>
        <span class="max-w-[120px] truncate text-sm font-bold">{{ authStore.user?.username || '用户' }}</span>
      </RouterLink>
      <button class="grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/62 text-[#475569] shadow-[0_12px_26px_rgba(43,55,96,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:text-red-500" aria-label="退出登录" @click="logout">
        <LogOut :size="21" stroke-width="1.85" />
      </button>
    </div>
  </header>
</template>
