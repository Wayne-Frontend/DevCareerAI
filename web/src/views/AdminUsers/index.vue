<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Ban, CircleCheck, RefreshCw, Search, Users, KeyRound } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState/index.vue'
import InlineStatus from '@/components/InlineStatus/index.vue'
import LoadingButton from '@/components/LoadingButton/index.vue'
import SkeletonCard from '@/components/SkeletonCard/index.vue'
import { getAdminUsers, resetUserPassword, updateUserRole, updateUserStatus } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import type { AdminUserItem } from '@/types/auth'
import { formatDateTime } from '@/utils/format'
import { messageBox } from '@/utils/messageBox'
import { notify } from '@/utils/notify'

const PAGE_SIZE = 20

const authStore = useAuthStore()
const loading = ref(true)
const loadError = ref(false)
const keyword = ref('')
const page = ref(1)
const total = ref(0)
const items = ref<AdminUserItem[]>([])
// 记录正在提交的行，避免重复点击。
const pendingId = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const hasData = computed(() => items.value.length > 0)
const currentUserId = computed(() => authStore.user?.id || '')

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const result = await getAdminUsers({
      page: page.value,
      pageSize: PAGE_SIZE,
      keyword: keyword.value.trim() || undefined,
    })
    items.value = result.items
    total.value = result.total
  } catch {
    // 接口失败时保留上一次列表，仅置错误态；具体错误提示已由响应拦截器弹出。
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function onSearch() {
  page.value = 1
  await load()
}

async function changePage(next: number) {
  if (next < 1 || next > totalPages.value || next === page.value) return
  page.value = next
  await load()
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

async function onToggleRole(user: AdminUserItem) {
  const nextRole = user.role === 'admin' ? 'user' : 'admin'
  const confirmed = await messageBox.confirm({
    type: nextRole === 'admin' ? 'warning' : 'danger',
    title:
      nextRole === 'admin'
        ? `将 ${user.username} 设为管理员？`
        : `取消 ${user.username} 的管理员？`,
    message:
      nextRole === 'admin'
        ? '管理员可访问用量监控和用户管理，请谨慎授予。'
        : '取消后该用户将失去管理端权限。',
  })
  if (!confirmed) return

  pendingId.value = user.id
  try {
    const updated = await updateUserRole(user.id, nextRole)
    user.role = updated.role
    notify('角色已更新', 'success')
  } finally {
    pendingId.value = ''
  }
}

async function onResetPassword(user: AdminUserItem) {
  const confirmed = await messageBox.confirm({
    type: 'danger',
    title: `重置 ${user.username} 的密码？`,
    message:
      '将生成一次性临时密码并强制该用户下线；临时密码只显示一次，用户下次登录后必须修改密码。',
    confirmText: '重置密码',
  })
  if (!confirmed) return

  pendingId.value = user.id
  try {
    const { tempPassword } = await resetUserPassword(user.id)
    // 临时密码仅此一次机会展示，请管理员立即转交用户。
    await messageBox.alert({
      type: 'warning',
      title: '临时密码（只显示这一次）',
      message: `${user.username} 的临时密码：${tempPassword}\n请立即通过安全渠道转交用户；用户登录后需先修改密码。`,
      confirmText: '我已记录',
      closeOnOverlay: false,
      closeOnEsc: false,
    })
  } finally {
    pendingId.value = ''
  }
}

async function onToggleStatus(user: AdminUserItem) {
  const nextStatus = user.status === 'disabled' ? 'active' : 'disabled'
  if (nextStatus === 'disabled') {
    const confirmed = await messageBox.confirm({
      type: 'danger',
      title: `封禁 ${user.username}？`,
      message: '封禁后该用户无法登录，且当前登录会话会被立即踢下线。数据保留，可随时解封。',
      confirmText: '封禁',
    })
    if (!confirmed) return
  }

  pendingId.value = user.id
  try {
    const updated = await updateUserStatus(user.id, nextStatus)
    user.status = updated.status
    notify(nextStatus === 'disabled' ? '已封禁该用户' : '已解封该用户', 'success')
  } finally {
    pendingId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="flex flex-wrap items-center gap-5">
      <div class="icon-tile h-[60px] w-[60px] rounded-[18px]">
        <Users :size="32" />
      </div>
      <div>
        <h1 class="m-0 text-[34px] font-black text-[#0f172a]">用户管理</h1>
        <p class="mt-2 text-base font-semibold text-[#64748b]">
          管理注册用户的角色与启用状态，仅管理员可见。
        </p>
      </div>
      <LoadingButton
        class="ml-auto"
        variant="secondary"
        :loading="loading"
        loading-text="刷新中..."
        @click="load"
      >
        <template #icon><RefreshCw :size="17" /></template>
        刷新
      </LoadingButton>
    </header>

    <section class="glass-card p-5">
      <div class="flex flex-wrap gap-3">
        <div class="relative min-w-[240px] flex-1">
          <Search
            :size="18"
            class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
          />
          <input
            v-model="keyword"
            class="input-base pl-11"
            placeholder="按用户名或邮箱搜索"
            @keyup.enter="onSearch"
          />
        </div>
        <LoadingButton :loading="loading" loading-text="搜索中..." @click="onSearch">
          <template #icon><Search :size="17" /></template>
          搜索
        </LoadingButton>
      </div>
    </section>

    <section v-if="loading" class="grid gap-4">
      <SkeletonCard v-for="index in 4" :key="index" />
    </section>

    <InlineStatus
      v-else-if="loadError"
      type="error"
      title="用户列表加载失败"
      description="可能是网络或服务异常，请重试。"
    >
      <button type="button" class="btn-secondary mt-3 min-h-9 text-sm" @click="load">
        重新加载
      </button>
    </InlineStatus>

    <EmptyState
      v-else-if="!hasData"
      title="没有匹配的用户"
      description="换个关键词，或清空搜索后重试。"
    />

    <template v-else>
      <section class="glass-card overflow-x-auto p-0">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th class="col-email">邮箱</th>
              <th class="text-center">角色</th>
              <th class="text-center">状态</th>
              <th class="text-right">累计 Token</th>
              <th>注册时间</th>
              <th class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in items" :key="user.id">
              <td class="font-bold text-[#0f172a]">
                {{ user.username }}
                <span v-if="user.id === currentUserId" class="self-badge">我</span>
              </td>
              <td class="col-email text-[#64748b]">{{ user.email }}</td>
              <td class="text-center">
                <span class="tag" :class="user.role === 'admin' ? 'tag-admin' : 'tag-user'">
                  {{ user.role === 'admin' ? '管理员' : '普通用户' }}
                </span>
              </td>
              <td class="text-center">
                <span
                  class="tag"
                  :class="user.status === 'disabled' ? 'tag-disabled' : 'tag-active'"
                >
                  {{ user.status === 'disabled' ? '已封禁' : '启用' }}
                </span>
              </td>
              <td class="num text-right font-semibold text-[#334155]">
                {{ formatNumber(user.totalTokens) }}
              </td>
              <td class="text-[#64748b]">{{ formatDateTime(user.createdAt) }}</td>
              <td>
                <div class="flex justify-end gap-2">
                  <template v-if="user.id !== currentUserId">
                    <button
                      class="btn-mini"
                      :disabled="pendingId === user.id"
                      @click="onToggleRole(user)"
                    >
                      {{ user.role === 'admin' ? '取消管理员' : '设为管理员' }}
                    </button>
                    <button
                      v-if="user.role !== 'admin'"
                      class="btn-mini"
                      :disabled="pendingId === user.id"
                      @click="onResetPassword(user)"
                    >
                      <KeyRound :size="15" />
                      重置密码
                    </button>
                    <button
                      class="btn-mini"
                      :class="user.status === 'disabled' ? 'btn-mini-ok' : 'btn-mini-danger'"
                      :disabled="pendingId === user.id"
                      @click="onToggleStatus(user)"
                    >
                      <CircleCheck v-if="user.status === 'disabled'" :size="15" />
                      <Ban v-else :size="15" />
                      {{ user.status === 'disabled' ? '解封' : '封禁' }}
                    </button>
                  </template>
                  <span v-else class="text-xs font-semibold text-[#94a3b8]">当前账号</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="flex items-center justify-between">
        <p class="m-0 text-sm font-semibold text-[#64748b]">
          共 {{ total }} 位用户 · 第 {{ page }} / {{ totalPages }} 页
        </p>
        <div class="flex gap-2">
          <button class="btn-mini" :disabled="page <= 1 || loading" @click="changePage(page - 1)">
            上一页
          </button>
          <button
            class="btn-mini"
            :disabled="page >= totalPages || loading"
            @click="changePage(page + 1)"
          >
            下一页
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

/* 表头/表体统一左右内边距，保证各列上下对齐 */
.admin-table th,
.admin-table td {
  padding: 15px 22px;
  white-space: nowrap;
  vertical-align: middle;
}

.admin-table th {
  text-align: left;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.02em;
  color: #94a3b8;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.admin-table td {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.admin-table tbody tr:last-child td {
  border-bottom: none;
}

.admin-table tbody tr {
  transition: background 0.15s ease;
}

.admin-table tbody tr:hover {
  background: rgba(99, 102, 241, 0.045);
}

/* 邮箱列吸收多余宽度，其余列贴合内容，避免列间距被平均摊开 */
.col-email {
  width: 100%;
}

/* 数字用等宽字形，右对齐时位数整齐 */
.num {
  font-variant-numeric: tabular-nums;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.tag-admin {
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
}

.tag-user {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}

.tag-active {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
}

.tag-disabled {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.self-badge {
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
}

.btn-mini {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  color: #334155;
  font-size: 13px;
  font-weight: 800;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.btn-mini:hover:not(:disabled) {
  border-color: rgba(99, 102, 241, 0.5);
  color: #4f46e5;
}

.btn-mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-mini-danger:hover:not(:disabled) {
  border-color: rgba(239, 68, 68, 0.5);
  color: #dc2626;
}

.btn-mini-ok:hover:not(:disabled) {
  border-color: rgba(16, 185, 129, 0.5);
  color: #059669;
}
</style>
