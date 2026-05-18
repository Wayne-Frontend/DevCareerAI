<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AtSign, CalendarDays, Camera, Mail, Save, UserRound } from 'lucide-vue-next'
import { updateProfile } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import { notify } from '../../utils/notify'

const authStore = useAuthStore()
const loading = ref(false)
const avatarLoadFailed = ref(false)

const form = reactive({
  email: authStore.user?.email || '',
  avatarUrl: authStore.user?.avatarUrl || '',
})

const avatarPreview = computed(() => form.avatarUrl.trim())
const createdAt = computed(() => {
  if (!authStore.user?.createdAt) return '-'

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(authStore.user.createdAt))
})

watch(
  () => authStore.user,
  (user) => {
    if (!user) return

    form.email = user.email
    form.avatarUrl = user.avatarUrl || ''
    avatarLoadFailed.value = false
  },
  { immediate: true },
)

watch(
  () => form.avatarUrl,
  () => {
    avatarLoadFailed.value = false
  },
)

function isValidHttpUrl(value: string) {
  if (!value) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function saveProfile() {
  const email = form.email.trim()
  const avatarUrl = form.avatarUrl.trim()

  if (!email) {
    notify('请填写邮箱', 'warning')
    return
  }

  if (!isValidHttpUrl(avatarUrl)) {
    notify('头像地址需要是 http 或 https 开头的图片 URL', 'warning')
    return
  }

  loading.value = true

  try {
    const user = await updateProfile({
      email,
      avatarUrl: avatarUrl || null,
    })
    authStore.updateUser(user)
    notify('个人信息已更新', 'success')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <span class="soft-tag">账户资料</span>
        <h1 class="page-title mt-3">个人中心</h1>
        <p class="page-subtitle">管理当前账号的基础资料，用户名暂不支持修改。</p>
      </div>
    </header>

    <div class="profile-grid">
      <section class="glass-card profile-summary">
        <div class="avatar-preview">
          <img
            v-if="avatarPreview && !avatarLoadFailed"
            :src="avatarPreview"
            alt="用户头像"
            @error="avatarLoadFailed = true"
          />
          <UserRound v-else :size="38" stroke-width="1.75" />
        </div>

        <div class="min-w-0 text-center">
          <h2 class="m-0 truncate text-[22px] font-black text-[#0f172a]">{{ authStore.user?.username || '用户' }}</h2>
          <p class="mt-2 truncate text-sm font-semibold text-[#64748b]">{{ authStore.user?.email || '-' }}</p>
        </div>

        <div class="summary-list">
          <div class="summary-item">
            <span class="icon-tile h-9 w-9 rounded-xl"><AtSign :size="18" /></span>
            <div>
              <span>用户名</span>
              <strong>{{ authStore.user?.username || '-' }}</strong>
            </div>
          </div>
          <div class="summary-item">
            <span class="icon-tile h-9 w-9 rounded-xl"><Mail :size="18" /></span>
            <div>
              <span>邮箱</span>
              <strong>{{ authStore.user?.email || '-' }}</strong>
            </div>
          </div>
          <div class="summary-item">
            <span class="icon-tile h-9 w-9 rounded-xl"><CalendarDays :size="18" /></span>
            <div>
              <span>注册时间</span>
              <strong>{{ createdAt }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="glass-card profile-form-card">
        <div class="mb-5 flex items-start gap-3">
          <span class="icon-tile h-10 w-10 rounded-xl"><Camera :size="21" /></span>
          <div>
            <h2 class="m-0 text-xl font-black text-[#0f172a]">资料编辑</h2>
            <p class="mt-1 text-sm font-semibold text-[#64748b]">头像使用图片 URL，邮箱保存后会同步到当前登录状态。</p>
          </div>
        </div>

        <form class="grid gap-4" @submit.prevent="saveProfile">
          <label>
            <span class="field-label">用户名</span>
            <input class="input-base read-only-input" :value="authStore.user?.username || ''" readonly />
          </label>

          <label>
            <span class="field-label">邮箱</span>
            <input v-model="form.email" class="input-base" type="email" autocomplete="email" placeholder="name@example.com" />
          </label>

          <label>
            <span class="field-label">头像 URL</span>
            <input v-model="form.avatarUrl" class="input-base" type="url" placeholder="https://example.com/avatar.png" />
          </label>

          <div class="form-actions">
            <button class="btn-primary min-w-[132px]" type="submit" :disabled="loading">
              <Save :size="18" />
              {{ loading ? '保存中' : '保存修改' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.32fr) minmax(0, 0.68fr);
  gap: 14px;
  align-items: stretch;
}

.profile-summary,
.profile-form-card {
  padding: 22px;
}

.profile-summary {
  display: flex;
  min-height: 430px;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.avatar-preview {
  display: grid;
  width: 112px;
  height: 112px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 32px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(226, 232, 240, 0.72));
  color: #64748b;
  box-shadow: 0 18px 38px rgba(43, 55, 96, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.summary-list {
  display: grid;
  width: 100%;
  gap: 10px;
  margin-top: auto;
}

.summary-item {
  display: flex;
  min-width: 0;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.58);
}

.summary-item div {
  min-width: 0;
}

.summary-item span:not(.icon-tile) {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: #94a3b8;
}

.summary-item strong {
  display: block;
  max-width: 100%;
  margin-top: 2px;
  overflow: hidden;
  color: #1e293b;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-form-card {
  min-height: 430px;
}

.read-only-input {
  color: #64748b;
  background: rgba(241, 245, 249, 0.66);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

@media (max-width: 1280px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-summary,
  .profile-form-card {
    min-height: auto;
  }
}
</style>
