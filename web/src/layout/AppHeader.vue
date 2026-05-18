<script setup lang="ts">
import { LogOut, Moon, Settings, Sun, UserRound } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { logout as logoutRequest } from '../api/auth'
import { useAuthStore } from '../stores/auth'
import { notify } from '../utils/notify'
import { isDarkTheme, toggleTheme } from '../utils/theme'

const router = useRouter()
const authStore = useAuthStore()
const avatarLoadFailed = ref(false)
const avatarUrl = computed(() => authStore.user?.avatarUrl || '')

watch(avatarUrl, () => {
  avatarLoadFailed.value = false
})

async function logout() {
  const confirmed = window.confirm('确认退出登录？')

  if (!confirmed) return

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
    class="app-header relative mb-2 flex h-[68px] items-center justify-end overflow-hidden rounded-[14px] border border-white/70 bg-white/58 px-4 shadow-[0_14px_36px_rgba(43,55,96,0.07),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_32%,rgba(99,102,241,0.11),transparent_28%),radial-gradient(circle_at_94%_18%,rgba(56,189,248,0.08),transparent_22%)]"
    />

    <div class="relative z-10 flex items-center gap-3">
      <button class="header-icon-btn" :aria-label="isDarkTheme ? '切换白天模式' : '切换夜间模式'" @click="toggleTheme">
        <Sun v-if="isDarkTheme" :size="19" stroke-width="1.85" />
        <Moon v-else :size="19" stroke-width="1.85" />
      </button>

      <RouterLink class="header-icon-btn" to="/settings" aria-label="打开设置">
        <Settings :size="19" stroke-width="1.85" />
      </RouterLink>

      <RouterLink to="/profile" class="header-avatar-btn" aria-label="打开个人中心">
        <span class="avatar-shell">
          <img
            v-if="avatarUrl && !avatarLoadFailed"
            :src="avatarUrl"
            alt="用户头像"
            class="h-full w-full object-cover"
            @error="avatarLoadFailed = true"
          />
          <UserRound v-else :size="19" stroke-width="1.8" />
        </span>
      </RouterLink>

      <button class="header-icon-btn hover:text-red-500" aria-label="退出登录" @click="logout">
        <LogOut :size="19" stroke-width="1.85" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.header-icon-btn,
.header-avatar-btn {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #475569;
  box-shadow: 0 12px 26px rgba(43, 55, 96, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: transform 0.2s ease, color 0.2s ease, background-color 0.2s ease;
}

.header-icon-btn:hover,
.header-avatar-btn:hover {
  transform: translateY(-2px);
  color: #4f46e5;
  background: rgba(255, 255, 255, 0.78);
}

.avatar-shell {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  color: #64748b;
  box-shadow: 0 10px 24px rgba(43, 55, 96, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
</style>
