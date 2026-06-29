<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BriefcaseBusiness,
  CalendarClock,
  FilePlus2,
  FileText,
  FileUp,
  Mic,
  Pencil,
  Save,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import InlineStatus from '../../components/InlineStatus/index.vue'
import LoadingButton from '../../components/LoadingButton/index.vue'
import { createResume, deleteResume, getResumes, updateResume, uploadResume } from '../../api/resume'
import type { ResumePayload, ResumeRecord } from '../../types/resume'
import { formatDateTime } from '../../utils/format'
import { messageBox } from '../../utils/messageBox'
import { notify } from '../../utils/notify'

type PanelMode = 'view' | 'create' | 'edit'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const uploadLoading = ref(false)
const errorMessage = ref('')
const uploadError = ref('')
const selectedId = ref('')
const mode = ref<PanelMode>('view')
const resumes = ref<ResumeRecord[]>([])

const form = reactive<ResumePayload>({
  title: '',
  content: '',
  targetRole: '',
  experienceLevel: '',
})

const selectedResume = computed(() => resumes.value.find((item) => item.id === selectedId.value) || null)
const isEditing = computed(() => mode.value === 'create' || mode.value === 'edit')
const sortedResumes = computed(() =>
  [...resumes.value].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()),
)

onMounted(() => {
  void loadResumes()
})

async function loadResumes(preferredId = selectedId.value) {
  loading.value = true
  errorMessage.value = ''
  try {
    resumes.value = await getResumes()
    const nextSelected = preferredId && resumes.value.some((item) => item.id === preferredId)
      ? preferredId
      : sortedResumes.value[0]?.id || ''
    selectedId.value = nextSelected
    if (nextSelected && mode.value === 'view') {
      fillForm(resumes.value.find((item) => item.id === nextSelected) || null)
    }
  } catch {
    errorMessage.value = '简历列表加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function fillForm(resume: ResumeRecord | null) {
  form.title = resume?.title || ''
  form.content = resume?.content || ''
  form.targetRole = resume?.targetRole || ''
  form.experienceLevel = resume?.experienceLevel || ''
}

function selectResume(resume: ResumeRecord) {
  if (saving.value || deleting.value) return
  selectedId.value = resume.id
  mode.value = 'view'
  uploadError.value = ''
  fillForm(resume)
}

function startCreate() {
  selectedId.value = ''
  mode.value = 'create'
  uploadError.value = ''
  fillForm(null)
}

function startEdit() {
  if (!selectedResume.value) return
  mode.value = 'edit'
  uploadError.value = ''
  fillForm(selectedResume.value)
}

function cancelEdit() {
  uploadError.value = ''
  mode.value = 'view'
  fillForm(selectedResume.value)
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (form.content.trim()) {
    const confirmed = await messageBox.confirm({
      type: 'warning',
      title: '替换当前内容？',
      message: '上传新文件会替换当前正文内容，未保存的修改将丢失。',
      confirmText: '继续上传',
    })
    if (!confirmed) {
      input.value = ''
      return
    }
  }

  uploadLoading.value = true
  uploadError.value = ''
  try {
    const parsed = await uploadResume(file)
    form.title ||= parsed.fileName.replace(/\.[^.]+$/, '')
    form.content = parsed.content
    notify(parsed.truncated ? '文件已解析，内容较长，已自动截断' : '文件已解析', 'success')
  } catch {
    uploadError.value = '文件解析失败，请确认格式为 PDF、DOCX、TXT 或 MD 后重试。'
  } finally {
    uploadLoading.value = false
    input.value = ''
  }
}

async function saveResume() {
  if (saving.value || uploadLoading.value) return

  if (!form.title.trim() || !form.content.trim()) {
    notify('请填写简历标题和正文内容', 'warning')
    return
  }

  saving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      targetRole: form.targetRole?.trim() || '',
      experienceLevel: form.experienceLevel || '',
    }
    const saved = mode.value === 'edit' && selectedResume.value
      ? await updateResume(selectedResume.value.id, payload)
      : await createResume(payload)
    notify(mode.value === 'edit' ? '简历已更新' : '简历已保存', 'success')
    mode.value = 'view'
    selectedId.value = saved.id
    await loadResumes(saved.id)
  } finally {
    saving.value = false
  }
}

async function removeResume() {
  if (!selectedResume.value || deleting.value) return

  const confirmed = await messageBox.confirm({
    type: 'danger',
    title: '确认删除这份简历？',
    message: '删除后关联的简历诊断和岗位匹配记录可能一并删除，模拟面试记录会保留但不再关联该简历。',
    confirmText: '删除',
  })
  if (!confirmed) return

  deleting.value = true
  try {
    const deletedId = selectedResume.value.id
    await deleteResume(deletedId)
    notify('简历已删除', 'success')
    mode.value = 'view'
    selectedId.value = ''
    fillForm(null)
    await loadResumes()
  } finally {
    deleting.value = false
  }
}

function goAnalyze() {
  if (!selectedResume.value) return
  void router.push({ path: '/resume-analyze', query: { resumeId: selectedResume.value.id } })
}

function goJobMatch() {
  if (!selectedResume.value) return
  void router.push({ path: '/job-match', query: { resumeId: selectedResume.value.id } })
}

function goInterview() {
  if (!selectedResume.value) return
  void router.push({ path: '/interview', query: { resumeId: selectedResume.value.id } })
}
</script>

<template>
  <div class="page">
    <header class="flex items-center gap-4">
      <div class="icon-tile">
        <FileText :size="23" />
      </div>
      <div>
        <h1 class="m-0 text-[26px] font-black text-[#0f172a]">简历管理</h1>
        <p class="mt-1.5 text-sm font-semibold text-[#64748b]">集中维护简历资产，并快速进入诊断、岗位匹配和模拟面试。</p>
      </div>
      <button class="btn-primary ml-auto min-w-[132px]" type="button" @click="startCreate">
        <FilePlus2 :size="18" />
        新建简历
      </button>
    </header>

    <InlineStatus v-if="errorMessage" type="error" title="简历加载失败" :description="errorMessage" />

    <div class="resume-manage-grid">
      <GlassCard class="resume-list-pane soft-scrollbar">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="m-0 text-lg font-black text-[#0f172a]">我的简历</h2>
          <span class="soft-tag">{{ resumes.length }} 份</span>
        </div>

        <InlineStatus v-if="loading" type="loading" title="正在加载简历" description="稍等一下，简历列表马上回来。" />
        <EmptyState
          v-else-if="resumes.length === 0"
          title="暂无简历"
          description="新建或上传一份简历后，就可以在这里统一维护。"
        />
        <div v-else class="grid gap-3">
          <button
            v-for="resume in sortedResumes"
            :key="resume.id"
            type="button"
            class="resume-card"
            :class="{ active: selectedId === resume.id }"
            @click="selectResume(resume)"
          >
            <strong>{{ resume.title }}</strong>
            <span>{{ resume.targetRole || '未指定目标岗位' }}</span>
            <small>
              <CalendarClock :size="14" />
              {{ formatDateTime(resume.updatedAt || resume.createdAt || '') }}
            </small>
            <em>{{ resume.content.length }} 字</em>
          </button>
        </div>
      </GlassCard>

      <GlassCard class="resume-detail-pane soft-scrollbar">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="m-0 text-lg font-black text-[#0f172a]">
              {{ mode === 'create' ? '新建简历' : mode === 'edit' ? '编辑简历' : '简历详情' }}
            </h2>
            <p class="mb-0 mt-1 text-sm font-semibold text-[#64748b]">
              {{ isEditing ? '保存后可在诊断、匹配和面试流程中复用。' : '查看简历正文，并选择下一步 AI 工作流。' }}
            </p>
          </div>
          <div v-if="selectedResume && mode === 'view'" class="flex flex-wrap gap-3">
            <button class="btn-secondary min-h-10" type="button" @click="startEdit">
              <Pencil :size="17" />
              编辑
            </button>
            <LoadingButton variant="danger" :loading="deleting" loading-text="删除中..." @click="removeResume">
              <template #icon><Trash2 :size="17" /></template>
              删除
            </LoadingButton>
          </div>
        </div>

        <EmptyState
          v-if="!selectedResume && mode === 'view'"
          title="请选择或新建简历"
          description="从左侧选择一份简历查看详情，或点击新建简历开始维护。"
        />

        <div v-else class="grid gap-4">
          <section v-if="isEditing" class="section-card">
            <label class="mb-4 grid min-h-[102px] cursor-pointer place-items-center rounded-[14px] border border-dashed border-indigo-200 bg-white/45 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40" :class="{ 'pointer-events-none opacity-70': uploadLoading }">
              <input class="hidden" type="file" accept=".pdf,.docx,.txt,.md" :disabled="uploadLoading" @change="onFileChange" />
              <UploadCloud :size="34" class="text-indigo-500" />
              <span class="mt-2 block text-sm font-extrabold text-[#26324f]">{{ uploadLoading ? '解析中...' : '上传 PDF / DOCX / TXT / MD 并填入正文' }}</span>
              <InlineStatus v-if="uploadLoading" class="mt-3" type="loading" title="正在解析文件" description="完成后会自动填入简历正文。" />
              <InlineStatus v-if="uploadError" class="mt-3" type="error" title="上传失败" :description="uploadError" />
            </label>

            <div class="grid gap-3">
              <label>
                <span class="field-label">简历标题</span>
                <input v-model="form.title" class="input-base" maxlength="120" placeholder="例如：前端开发工程师简历" />
              </label>
              <label>
                <span class="field-label">目标岗位</span>
                <input v-model="form.targetRole" class="input-base" maxlength="80" placeholder="例如：前端开发工程师" />
              </label>
              <label>
                <span class="field-label">经验年限</span>
                <select v-model="form.experienceLevel" class="select-base">
                  <option value="">未指定</option>
                  <option value="junior">应届 / 1 年以内</option>
                  <option value="1-3">1-3 年</option>
                  <option value="3-5">3-5 年</option>
                  <option value="5+">5 年以上</option>
                </select>
              </label>
              <label>
                <span class="field-label">简历正文</span>
                <textarea v-model="form.content" class="textarea-base min-h-[280px]" maxlength="30000" placeholder="粘贴或上传简历正文..." />
                <span class="mt-1 block text-right text-xs font-semibold text-[#64748b]">{{ form.content.length }} / 30000</span>
              </label>
            </div>

            <div class="mt-5 flex flex-wrap justify-end gap-3">
              <button class="btn-secondary min-w-[112px]" type="button" @click="cancelEdit">
                <X :size="17" />
                取消
              </button>
              <LoadingButton class="min-w-[132px]" :loading="saving" loading-text="保存中..." :disabled="uploadLoading" @click="saveResume">
                <template #icon><Save :size="18" /></template>
                保存
              </LoadingButton>
            </div>
          </section>

          <template v-else-if="selectedResume">
            <section class="section-card">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <h3 class="mb-2 mt-0 truncate text-xl font-black text-[#0f172a]">{{ selectedResume.title }}</h3>
                  <div class="flex flex-wrap gap-2">
                    <span class="soft-tag">{{ selectedResume.targetRole || '未指定岗位' }}</span>
                    <span class="soft-tag">{{ selectedResume.experienceLevel || '未指定经验' }}</span>
                    <span class="soft-tag">{{ selectedResume.content.length }} 字</span>
                  </div>
                </div>
                <span class="text-xs font-bold text-[#64748b]">
                  更新于 {{ formatDateTime(selectedResume.updatedAt || selectedResume.createdAt || '') }}
                </span>
              </div>
            </section>

            <section class="section-card">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 class="m-0 text-base font-black text-[#0f172a]">下一步操作</h3>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <button class="btn-secondary min-h-11" type="button" @click="goAnalyze">
                  <Search :size="18" />
                  去诊断
                </button>
                <button class="btn-secondary min-h-11" type="button" @click="goJobMatch">
                  <BriefcaseBusiness :size="18" />
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
                <FileUp :size="18" class="text-indigo-500" />
                简历正文
              </h3>
              <pre class="resume-content-preview soft-scrollbar">{{ selectedResume.content }}</pre>
            </section>
          </template>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
.resume-manage-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.34fr) minmax(0, 0.66fr);
  gap: var(--page-gap);
  min-height: calc(100vh - 146px);
}

.resume-list-pane,
.resume-detail-pane {
  min-height: 0;
  max-height: calc(100vh - 146px);
  overflow-y: auto;
}

.resume-card {
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

.resume-card:hover,
.resume-card.active {
  transform: translateY(-1px);
  border-color: rgba(99, 102, 241, 0.28);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 14px 30px rgba(31, 73, 125, 0.08);
}

.resume-card strong,
.resume-card span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-card strong {
  font-size: 15px;
  font-weight: 900;
}

.resume-card span,
.resume-card small {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
}

.resume-card small {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.resume-card em {
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

.resume-content-preview {
  max-height: 440px;
  margin: 0;
  overflow: auto;
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
  .resume-manage-grid {
    grid-template-columns: 1fr;
  }

  .resume-list-pane,
  .resume-detail-pane {
    max-height: none;
  }
}

@media (max-width: 760px) {
  .resume-detail-pane :deep(.grid-cols-3) {
    grid-template-columns: 1fr;
  }
}
</style>
