<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AtSign, CalendarDays, LogOut, Mail, Save, UploadCloud, UserRound } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import LoadingButton from '../../components/LoadingButton/index.vue'
import { logout as logoutRequest, updateProfile, uploadAvatar } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import { messageBox } from '../../utils/messageBox'
import { notify } from '../../utils/notify'

const AVATAR_MAX_SIZE = 5 * 1024 * 1024

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const avatarUploading = ref(false)
const avatarLoadFailed = ref(false)
const logoutLoading = ref(false)

const form = reactive({
  email: authStore.user?.email || '',
})

const avatarPreview = computed(() => authStore.user?.avatarUrl?.trim() || '')
const userInitial = computed(() => (authStore.user?.username || authStore.user?.email || 'D').slice(0, 1).toUpperCase())
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
    avatarLoadFailed.value = false
  },
  { immediate: true },
)

watch(avatarPreview, () => {
  avatarLoadFailed.value = false
})

async function saveProfile() {
  const email = form.email.trim()

  if (!email) {
    notify('请填写邮箱', 'warning')
    return
  }

  loading.value = true

  try {
    const user = await updateProfile({ email })
    authStore.updateUser(user)
    notify('个人信息已更新', 'success')
  } finally {
    loading.value = false
  }
}

async function onAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    notify('请选择图片文件作为头像', 'warning')
    input.value = ''
    return
  }

  if (file.size > AVATAR_MAX_SIZE) {
    notify('头像图片不能超过 5MB', 'warning')
    input.value = ''
    return
  }

  avatarUploading.value = true
  try {
    const user = await uploadAvatar(file)
    authStore.updateUser(user)
    notify('头像已上传', 'success')
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

async function logout() {
  const confirmed = await messageBox.confirm({
    type: 'warning',
    title: '确认退出登录？',
    message: '退出后需要重新登录才能继续使用简历诊断、岗位匹配和模拟面试。',
    confirmText: '退出登录',
  })
  if (!confirmed) return

  logoutLoading.value = true
  try {
    await logoutRequest()
  } catch {
    // 即使远端会话已失效，也要清理本地登录态。
  } finally {
    authStore.clearSession()
    notify('已退出登录', 'success')
    logoutLoading.value = false
    await router.push('/login')
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">个人中心</h1>
        <p class="page-subtitle">管理当前账号的基础资料，头像仅支持上传图片文件。</p>
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
          <span v-else>{{ userInitial }}</span>
        </div>

        <label class="avatar-upload" :class="{ disabled: avatarUploading }">
          <span v-if="avatarUploading" class="mini-spinner" />
          <UploadCloud v-else :size="17" />
          <span>{{ avatarUploading ? '上传中...' : '上传头像' }}</span>
          <input type="file" accept="image/*" :disabled="avatarUploading" @change="onAvatarFileChange" />
        </label>
        <p class="avatar-tip">支持 JPG、PNG、WebP、GIF，最大 5MB。</p>

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
          <span class="icon-tile h-10 w-10 rounded-xl"><UserRound :size="21" /></span>
          <div>
            <h2 class="m-0 text-xl font-black text-[#0f172a]">资料编辑</h2>
            <p class="mt-1 text-sm font-semibold text-[#64748b]">
              邮箱保存后会同步到当前登录状态；头像请通过左侧上传按钮设置。
            </p>
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
          <div class="form-actions">
            <LoadingButton class="min-w-[132px]" type="submit" :loading="loading" loading-text="保存中...">
              <template #icon><Save :size="18" /></template>
              {{ loading ? '保存中...' : '保存修改' }}
            </LoadingButton>
            <LoadingButton variant="danger" class="min-w-[132px]" :loading="logoutLoading" loading-text="退出中..." @click="logout">
              <template #icon><LogOut :size="18" /></template>
              {{ logoutLoading ? '退出中...' : '退出登录' }}
            </LoadingButton>
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
  gap: 16px;
}

.avatar-preview {
  display: grid;
  width: 112px;
  height: 112px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 32px;
  background: linear-gradient(135deg, #74a8ff, #4f7cff 58%, #22d3ee);
  color: #fff;
  font-size: 44px;
  font-weight: 950;
  box-shadow: 0 18px 38px rgba(43, 55, 96, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-upload {
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  padding: 0 15px;
  color: #2563eb;
  cursor: pointer;
  font-size: 14px;
  font-weight: 850;
  box-shadow: 0 12px 22px rgba(31, 73, 125, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.avatar-upload:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 16px 28px rgba(31, 73, 125, 0.12);
}

.avatar-upload.disabled {
  cursor: wait;
  opacity: 0.72;
}

.avatar-upload input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.avatar-tip {
  margin: -6px 0 0;
  color: #7b8dab;
  font-size: 12px;
  font-weight: 650;
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
  gap: 12px;
  padding-top: 2px;
}

.mini-spinner {
  width: 17px;
  height: 17px;
  border: 2px solid rgba(37, 99, 235, 0.2);
  border-top-color: #2563eb;
  border-radius: 999px;
  animation: profile-spin 0.8s linear infinite;
}

@keyframes profile-spin {
  to {
    transform: rotate(360deg);
  }
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
