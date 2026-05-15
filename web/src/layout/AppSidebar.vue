<script setup lang="ts">
import {
  Aim,
  ChatLineRound,
  DataAnalysis,
  Document,
  House,
  MagicStick,
  Memo,
  Setting,
} from '@element-plus/icons-vue'

const menuItems = [
  { path: '/', label: '首页', icon: House },
  { path: '/resume-analyze', label: '简历诊断', icon: Document },
  { path: '/project-optimize', label: '项目优化', icon: MagicStick },
  { path: '/job-match', label: '岗位匹配', icon: Aim },
  { path: '/interview', label: '模拟面试', icon: ChatLineRound },
  { path: '/history', label: '历史记录', icon: DataAnalysis },
  { path: '/settings', label: '设置', icon: Setting },
]
</script>

<template>
  <aside class="app-sidebar glass-card">
    <RouterLink class="brand" to="/">
      <div class="brand-mark">
        <el-icon><Memo /></el-icon>
      </div>
      <div>
        <strong>DevCareer AI</strong>
        <span>Career copilot</span>
      </div>
    </RouterLink>

    <nav class="side-nav" aria-label="主导航">
      <RouterLink
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="side-link"
        :class="{ 'is-active': $route.path === item.path }"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  position: sticky;
  top: 24px;
  width: 236px;
  height: calc(100vh - 48px);
  flex: 0 0 236px;
  padding: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 18px;
  padding: 10px;

  strong,
  span {
    display: block;
  }

  strong {
    color: var(--color-text);
    font-size: 16px;
    letter-spacing: 0;
  }

  span {
    margin-top: 2px;
    color: var(--color-muted);
    font-size: 12px;
    font-weight: 650;
  }
}

.brand-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 16px;
  background: var(--gradient-primary);
  color: #ffffff;
  font-size: 20px;
  box-shadow: 0 14px 28px rgba(99, 102, 241, 0.28);
}

.side-nav {
  display: grid;
  gap: 6px;
  margin-top: 22px;
}

.side-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: 999px;
  color: #475569;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 720;
  transition:
    transform 160ms ease,
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.68);
    color: var(--color-text);
  }

  &.is-active,
  &.is-root-active {
    border-color: rgba(99, 102, 241, 0.2);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(56, 189, 248, 0.12));
    color: #4338ca;
    box-shadow: 0 14px 30px rgba(99, 102, 241, 0.12);
  }
}
</style>
