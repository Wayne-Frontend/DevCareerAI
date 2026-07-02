<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'

const route = useRoute()
const drawerOpen = ref(false)

function openDrawer() {
  drawerOpen.value = true
}
function closeDrawer() {
  drawerOpen.value = false
}

// 路由切换后自动收起抽屉
watch(() => route.path, closeDrawer)

// 抽屉展开时锁定背景滚动，并支持 Esc 关闭
watch(drawerOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDrawer()
}

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="app-bg">
    <!-- 移动端顶部条：汉堡按钮 + 品牌（桌面端隐藏） -->
    <header class="mobile-topbar">
      <button type="button" class="mobile-menu-btn" aria-label="打开菜单" @click="openDrawer">
        <Menu :size="22" />
      </button>
      <strong class="mobile-brand">DevCareer AI</strong>
    </header>

    <AppSidebar :open="drawerOpen" @close="closeDrawer" />

    <!-- 抽屉遮罩（仅移动端展开时出现） -->
    <transition name="backdrop-fade">
      <div v-if="drawerOpen" class="drawer-backdrop" @click="closeDrawer" />
    </transition>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.mobile-topbar,
.drawer-backdrop {
  display: none;
}

@media (max-width: 980px) {
  .mobile-topbar {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 8px 24px rgba(31, 73, 125, 0.08);
    backdrop-filter: blur(18px) saturate(140%);
  }

  .mobile-menu-btn {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.7);
    color: #0b55e8;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 18px rgba(31, 73, 125, 0.08);
  }

  .mobile-brand {
    background: linear-gradient(135deg, #0b55e8 0%, #2563eb 45%, #06b6d4 100%);
    background-clip: text;
    color: transparent;
    font-size: 19px;
    font-weight: 950;
    letter-spacing: -0.02em;
  }

  .drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 55;
    display: block;
    background: rgba(9, 22, 63, 0.42);
    backdrop-filter: blur(2px);
  }

  .backdrop-fade-enter-active,
  .backdrop-fade-leave-active {
    transition: opacity 0.24s ease;
  }

  .backdrop-fade-enter-from,
  .backdrop-fade-leave-to {
    opacity: 0;
  }
}
</style>
