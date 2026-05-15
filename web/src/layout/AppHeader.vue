<script setup lang="ts">
import { MagicStick, Setting } from '@element-plus/icons-vue'
</script>

<template>
  <header class="app-header">
    <div class="header-title">
      <span class="soft-tag">
        <el-icon><MagicStick /></el-icon>
        AI Resume Workspace
      </span>
      <strong>DevCareer AI</strong>
    </div>

    <div class="header-actions">
      <RouterLink to="/settings" class="settings-link" aria-label="打开设置">
        <el-icon><Setting /></el-icon>
      </RouterLink>
      <div class="avatar">DC</div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  margin-bottom: 22px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;

  strong {
    color: var(--color-text);
    font-size: 15px;
    font-weight: 760;
  }
}

.soft-tag {
  gap: 6px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-link,
.avatar {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.58);
  color: var(--color-text);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(18px);
}

.avatar {
  background: var(--gradient-primary);
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
}
</style>
