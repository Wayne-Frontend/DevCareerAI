<script setup lang="ts">
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardList,
  Files,
  FileSearch,
  Gauge,
  Home,
  Mic,
  Sparkles,
  X,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

defineProps<{ open?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const authStore = useAuthStore()

const baseMenuItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/resumes', label: '简历管理', icon: Files },
  { path: '/resume-analyze', label: '简历诊断', icon: FileSearch },
  { path: '/project-optimize', label: '项目优化', icon: Boxes },
  { path: '/jobs', label: 'JD 管理', icon: ClipboardList },
  { path: '/job-match', label: '岗位匹配', icon: BriefcaseBusiness },
  { path: '/interview', label: '模拟面试', icon: Mic },
  { path: '/history', label: '复盘中心', icon: BarChart3 },
]

// 用量监控仅管理员可见，与后端 @Roles('admin') 对齐。
const mainMenuItems = computed(() =>
  authStore.isAdmin
    ? [...baseMenuItems, { path: '/admin/ai-usage', label: '用量监控', icon: Gauge }]
    : baseMenuItems,
)

const avatarLoadFailed = ref(false)
const userName = computed(() => authStore.user?.username || authStore.user?.email || 'Dev 同学')
const avatarUrl = computed(() => authStore.user?.avatarUrl?.trim() || '')

watch(avatarUrl, () => {
  avatarLoadFailed.value = false
})
</script>

<template>
  <aside class="app-sidebar" :class="{ 'is-open': open }" aria-label="主导航">
    <button type="button" class="drawer-close" aria-label="关闭菜单" @click="emit('close')">
      <X :size="20" />
    </button>

    <RouterLink class="brand-link" to="/" @click="emit('close')">
      <span class="brand-mark">
        <Sparkles :size="30" stroke-width="1.7" />
      </span>
      <strong>DevCareer AI</strong>
    </RouterLink>

    <nav class="main-menu">
      <RouterLink
        v-for="item in mainMenuItems"
        :key="item.path"
        :to="item.path"
        class="menu-item"
        :class="{ active: $route.path === item.path }"
        @click="emit('close')"
      >
        <component :is="item.icon" :size="23" stroke-width="1.9" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <RouterLink class="user-card" to="/profile" @click="emit('close')">
      <span class="user-avatar">
        <img
          v-if="avatarUrl && !avatarLoadFailed"
          :src="avatarUrl"
          alt="用户头像"
          @error="avatarLoadFailed = true"
        />
        <span v-else>{{ userName.slice(0, 1).toUpperCase() }}</span>
      </span>
      <span class="user-copy">
        <strong>{{ userName }}</strong>
        <small>高级软件工程师</small>
      </span>
      <ChevronRight :size="20" />
    </RouterLink>
  </aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: flex;
  width: var(--app-sidebar-width);
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 0 18px 18px 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(246, 250, 255, 0.25)),
    rgba(255, 255, 255, 0.34);
  padding: 28px 16px 30px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.96), 14px 0 42px rgba(64, 104, 164, 0.11);
  backdrop-filter: blur(24px) saturate(132%);
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  padding: 0 10px;
  color: #0b55e8;

  strong {
    white-space: nowrap;
    background: linear-gradient(135deg, #0b55e8 0%, #2563eb 45%, #06b6d4 100%);
    background-clip: text;
    color: transparent;
    font-size: 23px;
    font-weight: 950;
    letter-spacing: -0.02em;
    line-height: 1;
    text-shadow: 0 18px 32px rgba(37, 99, 235, 0.14);
  }
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  color: #2563eb;
  filter: drop-shadow(0 10px 18px rgba(37, 99, 235, 0.2));
}

.main-menu {
  display: grid;
  gap: 9px;
  margin-top: 32px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 50px;
  border: 1px solid transparent;
  border-radius: 13px;
  padding: 0 16px;
  color: #071b4a;
  font-size: 16px;
  font-weight: 820;
  transition: transform 0.18s ease, color 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateX(2px);
    border-color: rgba(255, 255, 255, 0.58);
    background: rgba(255, 255, 255, 0.36);
    color: #2563eb;
  }

  &.active {
    border-color: rgba(255, 255, 255, 0.82);
    background: rgba(255, 255, 255, 0.42);
    color: #0b55e8;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 14px 28px rgba(37, 99, 235, 0.08);
  }
}

.user-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  min-height: 78px;
  margin-top: auto;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.4);
  padding: 14px;
  color: #071b4a;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 16px 34px rgba(31, 73, 125, 0.09);
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.55);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94), 0 20px 42px rgba(31, 73, 125, 0.12);
  }
}

.user-avatar {
  display: grid;
  width: 42px;
  height: 42px;
  overflow: hidden;
  place-items: center;
  border-radius: 11px;
  background: linear-gradient(135deg, #74a8ff, #4f7cff);
  color: #fff;
  font-size: 19px;
  font-weight: 900;
  box-shadow: 0 14px 26px rgba(37, 99, 235, 0.2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.user-copy {
  min-width: 0;

  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #071b4a;
    font-size: 15px;
    font-weight: 900;
  }

  small {
    margin-top: 4px;
    color: #415982;
    font-size: 12px;
    font-weight: 650;
  }
}

.drawer-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: none;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: #0b55e8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 18px rgba(31, 73, 125, 0.08);
}

@media (max-width: 980px) {
  /* 抽屉模式：竖向布局保持不变，仅露出关闭按钮并适配圆角 */
  .drawer-close {
    display: grid;
  }

  .app-sidebar {
    border-radius: 0 20px 20px 0;
    padding-top: 22px;
  }
}
</style>

