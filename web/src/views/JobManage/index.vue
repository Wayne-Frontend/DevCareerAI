<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarClock,
  ClipboardList,
  FilePlus2,
  FileText,
  Mic,
  Pencil,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import InlineStatus from '../../components/InlineStatus/index.vue'
import LoadingButton from '../../components/LoadingButton/index.vue'
import {
  createJobDescription,
  deleteJobDescription,
  getJobDescriptions,
  updateJobDescription,
} from '../../api/job'
import type { JobDescriptionPayload, JobDescriptionRecord } from '../../types/job'
import { formatDateTime } from '../../utils/format'
import { messageBox } from '../../utils/messageBox'
import { notify } from '../../utils/notify'

type PanelMode = 'view' | 'create' | 'edit'

const MAX_JD_LENGTH = 10000

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const errorMessage = ref('')
const selectedId = ref('')
const mode = ref<PanelMode>('view')
const descriptions = ref<JobDescriptionRecord[]>([])

const form = reactive<JobDescriptionPayload>({
  jobTitle: '',
  companyName: '',
  content: '',
})

const selectedJd = computed(() => descriptions.value.find((item) => item.id === selectedId.value) || null)
const isEditing = computed(() => mode.value === 'create' || mode.value === 'edit')

onMounted(() => {
  void loadDescriptions()
})

async function loadDescriptions(preferredId = selectedId.value) {
  loading.value = true
  errorMessage.value = ''
  try {
    descriptions.value = await getJobDescriptions()
    const nextSelected = preferredId && descriptions.value.some((item) => item.id === preferredId)
      ? preferredId
      : descriptions.value[0]?.id || ''
    selectedId.value = nextSelected
    if (nextSelected && mode.value === 'view') {
      fillForm(descriptions.value.find((item) => item.id === nextSelected) || null)
    }
  } catch {
    errorMessage.value = 'JD 列表加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function fillForm(jd: JobDescriptionRecord | null) {
  form.jobTitle = jd?.jobTitle || ''
  form.companyName = jd?.companyName || ''
  form.content = jd?.content || ''
}

function selectJd(jd: JobDescriptionRecord) {
  if (saving.value || deleting.value) return
  selectedId.value = jd.id
  mode.value = 'view'
  fillForm(jd)
}

function startCreate() {
  selectedId.value = ''
  mode.value = 'create'
  fillForm(null)
}

function startEdit() {
  if (!selectedJd.value) return
  mode.value = 'edit'
  fillForm(selectedJd.value)
}

function cancelEdit() {
  mode.value = 'view'
  fillForm(selectedJd.value)
}

async function saveJd() {
  if (saving.value) return

  if (!form.jobTitle.trim() || !form.content.trim()) {
    notify('请填写岗位名称和 JD 正文', 'warning')
    return
  }

  saving.value = true
  try {
    const payload: JobDescriptionPayload = {
      jobTitle: form.jobTitle.trim(),
      companyName: form.companyName?.trim() || undefined,
      content: form.content.trim(),
    }
    const saved = mode.value === 'edit' && selectedJd.value
      ? await updateJobDescription(selectedJd.value.id, payload)
      : await createJobDescription(payload)
    notify(mode.value === 'edit' ? 'JD 已更新' : 'JD 已保存', 'success')
    mode.value = 'view'
    selectedId.value = saved.id
    await loadDescriptions(saved.id)
  } finally {
    saving.value = false
  }
}

async function removeJd() {
  if (!selectedJd.value || deleting.value) return

  const confirmed = await messageBox.confirm({
    type: 'danger',
    title: '确认删除这条 JD？',
    message: '删除后基于该 JD 的岗位匹配记录会一并删除；关联的模拟面试记录会保留，但不再关联该 JD。',
    confirmText: '删除',
  })
  if (!confirmed) return

  deleting.value = true
  try {
    const deletedId = selectedJd.value.id
    await deleteJobDescription(deletedId)
    notify('JD 已删除', 'success')
    mode.value = 'view'
    selectedId.value = ''
    fillForm(null)
    await loadDescriptions()
  } finally {
    deleting.value = false
  }
}

function goJobMatch() {
  if (!selectedJd.value) return
  void router.push({ path: '/job-match', query: { jdId: selectedJd.value.id } })
}

function goInterview() {
  if (!selectedJd.value) return
  void router.push({ path: '/interview', query: { jdId: selectedJd.value.id } })
}
</script>

<template>
  <div class="page page-viewport">
    <header class="flex items-center gap-4">
      <div class="icon-tile">
        <ClipboardList :size="23" />
      </div>
      <div>
        <h1 class="m-0 text-[26px] font-black text-[#0f172a]">JD 管理</h1>
        <p class="mt-1.5 text-sm font-semibold text-[#64748b]">集中维护常用岗位 JD，随时在岗位匹配和模拟面试中复用。</p>
      </div>
      <button class="btn-primary ml-auto min-w-[132px]" type="button" @click="startCreate">
        <FilePlus2 :size="18" />
        新建 JD
      </button>
    </header>

    <InlineStatus v-if="errorMessage" type="error" title="JD 加载失败" :description="errorMessage" />

    <div class="jd-manage-grid">
      <GlassCard class="jd-list-pane soft-scrollbar">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="m-0 text-lg font-black text-[#0f172a]">我的 JD</h2>
          <span class="soft-tag">{{ descriptions.length }} 条</span>
        </div>

        <InlineStatus v-if="loading" type="loading" title="正在加载 JD" description="稍等一下，JD 列表马上回来。" />
        <EmptyState
          v-else-if="descriptions.length === 0"
          title="暂无 JD"
          description="新建一条常用岗位 JD 后，就能在岗位匹配和模拟面试里直接选用。"
        />
        <div v-else class="grid gap-3">
          <button
            v-for="jd in descriptions"
            :key="jd.id"
            type="button"
            class="jd-card"
            :class="{ active: selectedId === jd.id }"
            @click="selectJd(jd)"
          >
            <strong>{{ jd.jobTitle }}</strong>
            <span>{{ jd.companyName || '未填写公司' }}</span>
            <small>
              <CalendarClock :size="14" />
              {{ formatDateTime(jd.createdAt || '') }}
            </small>
            <em>{{ jd.content.length }} 字</em>
          </button>
        </div>
      </GlassCard>

      <GlassCard class="jd-detail-pane soft-scrollbar">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="m-0 text-lg font-black text-[#0f172a]">
              {{ mode === 'create' ? '新建 JD' : mode === 'edit' ? '编辑 JD' : 'JD 详情' }}
            </h2>
            <p class="mb-0 mt-1 text-sm font-semibold text-[#64748b]">
              {{ isEditing ? '保存后可在岗位匹配和模拟面试流程中复用。' : '查看 JD 正文，并选择下一步 AI 工作流。' }}
            </p>
          </div>
          <div v-if="selectedJd && mode === 'view'" class="flex flex-wrap gap-3">
            <button class="btn-secondary min-h-10" type="button" @click="startEdit">
              <Pencil :size="17" />
              编辑
            </button>
            <LoadingButton variant="danger" :loading="deleting" loading-text="删除中..." @click="removeJd">
              <template #icon><Trash2 :size="17" /></template>
              删除
            </LoadingButton>
          </div>
        </div>

        <EmptyState
          v-if="!selectedJd && mode === 'view'"
          title="请选择或新建 JD"
          description="从左侧选择一条 JD 查看详情，或点击新建 JD 开始维护。"
        />

        <div v-else class="grid gap-4">
          <section v-if="isEditing" class="section-card">
            <div class="grid gap-3">
              <label>
                <span class="field-label">岗位名称</span>
                <input v-model="form.jobTitle" class="input-base" maxlength="120" placeholder="例如：前端开发工程师" />
              </label>
              <label>
                <span class="field-label">公司名称（可选）</span>
                <input v-model="form.companyName" class="input-base" maxlength="120" placeholder="例如：某某科技" />
              </label>
              <label>
                <span class="field-label">JD 正文</span>
                <textarea v-model="form.content" class="textarea-base min-h-[280px]" :maxlength="MAX_JD_LENGTH" placeholder="粘贴岗位职责、任职要求等 JD 正文..." />
                <span class="mt-1 block text-right text-xs font-semibold text-[#64748b]">{{ form.content.length }} / {{ MAX_JD_LENGTH }}</span>
              </label>
            </div>

            <div class="mt-5 flex flex-wrap justify-end gap-3">
              <button class="btn-secondary min-w-[112px]" type="button" @click="cancelEdit">
                <X :size="17" />
                取消
              </button>
              <LoadingButton class="min-w-[132px]" :loading="saving" loading-text="保存中..." @click="saveJd">
                <template #icon><Save :size="18" /></template>
                保存
              </LoadingButton>
            </div>
          </section>

          <template v-else-if="selectedJd">
            <section class="section-card">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <h3 class="mb-2 mt-0 truncate text-xl font-black text-[#0f172a]">{{ selectedJd.jobTitle }}</h3>
                  <div class="flex flex-wrap gap-2">
                    <span class="soft-tag">{{ selectedJd.companyName || '未填写公司' }}</span>
                    <span class="soft-tag">{{ selectedJd.content.length }} 字</span>
                  </div>
                </div>
                <span class="text-xs font-bold text-[#64748b]">
                  创建于 {{ formatDateTime(selectedJd.createdAt || '') }}
                </span>
              </div>
            </section>

            <section class="section-card">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 class="m-0 text-base font-black text-[#0f172a]">下一步操作</h3>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <button class="btn-secondary min-h-11" type="button" @click="goJobMatch">
                  <Target :size="18" />
                  去岗位匹配
                </button>
                <button class="btn-secondary min-h-11" type="button" @click="goInterview">
                  <Mic :size="18" />
                  去模拟面试
                </button>
              </div>
            </section>

            <section class="section-card">
              <h3 class="mb-4 mt-0 flex items-center gap-2 text-base font-black text-[#0f172a]">
                <FileText :size="18" class="text-indigo-500" />
                JD 正文
              </h3>
              <pre class="jd-content-preview soft-scrollbar">{{ selectedJd.content }}</pre>
            </section>
          </template>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
.jd-manage-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.34fr) minmax(0, 0.66fr);
  gap: var(--page-gap);
  flex: 1;
  min-height: 0;
}

.jd-list-pane,
.jd-detail-pane {
  min-height: 0;
  overflow-y: auto;
}

.jd-card {
  position: relative;
  display: grid;
  gap: 7px;
  width: 100%;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.58);
  padding: 14px;
  color: #0f172a;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.jd-card:hover,
.jd-card.active {
  transform: translateY(-1px);
  border-color: rgba(99, 102, 241, 0.28);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 14px 30px rgba(31, 73, 125, 0.08);
}

.jd-card strong,
.jd-card span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jd-card strong {
  font-size: 15px;
  font-weight: 900;
}

.jd-card span,
.jd-card small {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
}

.jd-card small {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.jd-card em {
  position: absolute;
  right: 12px;
  bottom: 12px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.1);
  padding: 3px 8px;
  color: #4f46e5;
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
}

.jd-content-preview {
  /* 不限制高度：让正文自动撑开，滚动统一交给外层卡片，避免双滚动条。 */
  margin: 0;
  white-space: pre-wrap;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.66);
  padding: 16px;
  color: #334155;
  font-family: inherit;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.9;
}

@media (max-width: 1180px) {
  .jd-manage-grid {
    grid-template-columns: 1fr;
    flex: none;
  }

  .jd-list-pane,
  .jd-detail-pane {
    max-height: none;
  }
}

@media (max-width: 760px) {
  .jd-detail-pane :deep(.grid-cols-2) {
    grid-template-columns: 1fr;
  }
}
</style>
