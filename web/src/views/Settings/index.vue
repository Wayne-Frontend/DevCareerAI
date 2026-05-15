<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import GlassCard from '../../components/GlassCard/index.vue'
import PageHeader from '../../components/PageHeader/index.vue'

const settings = reactive({
  apiKey: '',
  defaultRole: '前端工程师',
  resumeStyle: '简洁专业',
})

function saveSettings() {
  ElMessage.success('设置已保存到当前页面状态，API Key 仍需在服务端 .env 配置')
}
</script>

<template>
  <div class="page">
    <PageHeader title="设置" subtitle="模型密钥仍由服务端环境变量管理，前端只保留偏好型配置入口。" />

    <div class="settings-grid">
      <GlassCard>
        <h2 class="section-title">模型配置</h2>
        <div class="setting-list">
          <div class="setting-row">
            <span>Provider</span>
            <strong>DeepSeek Compatible</strong>
          </div>
          <div class="setting-row">
            <span>Model</span>
            <strong>由服务端 DEEPSEEK_MODEL 控制</strong>
          </div>
          <div class="setting-row">
            <span>Base URL</span>
            <strong>由服务端 DEEPSEEK_BASE_URL 控制</strong>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 class="section-title">DeepSeek API Key 配置说明</h2>
        <el-alert
          title="MVP 阶段不在前端保存或展示真实 API Key"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form label-position="top" class="settings-form">
          <el-form-item label="API Key 占位输入">
            <el-input v-model="settings.apiKey" type="password" show-password placeholder="仅作敏感输入视觉占位" />
          </el-form-item>
        </el-form>
      </GlassCard>

      <GlassCard>
        <h2 class="section-title">默认偏好</h2>
        <el-form label-position="top" class="settings-form">
          <el-form-item label="默认岗位方向">
            <el-input v-model="settings.defaultRole" />
          </el-form-item>
          <el-form-item label="默认简历风格">
            <el-select v-model="settings.resumeStyle">
              <el-option label="简洁专业" value="简洁专业" />
              <el-option label="结果导向" value="结果导向" />
              <el-option label="技术深度" value="技术深度" />
            </el-select>
          </el-form-item>
          <el-button class="primary-gradient-btn" @click="saveSettings">保存设置</el-button>
        </el-form>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.settings-grid :deep(.app-glass-card:last-child) {
  grid-column: 1 / -1;
}

.setting-list {
  display: grid;
  gap: 12px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
  padding: 15px 16px;

  span {
    color: var(--color-muted);
    font-size: 13px;
    font-weight: 760;
  }

  strong {
    color: var(--color-text);
    font-size: 14px;
  }
}

.settings-form {
  margin-top: 18px;
}

@media (max-width: 1280px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
