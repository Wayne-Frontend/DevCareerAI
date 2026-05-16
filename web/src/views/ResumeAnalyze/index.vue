<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { CheckCircle2, FileSearch, Search, Square, UploadCloud } from 'lucide-vue-next'
import BeforeAfterCompare from '../../components/BeforeAfterCompare/index.vue'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import ScoreCard from '../../components/ScoreCard/index.vue'
import StreamPreview from '../../components/StreamPreview/index.vue'
import SuggestionList from '../../components/SuggestionList/index.vue'
import { analyzeResumeStream, createResume, uploadResume } from '../../api/resume'
import { useResumeStore } from '../../stores/resume'
import type { ResumeAnalysisResult } from '../../types/resume'
import { notify } from '../../utils/notify'

const resumeStore = useResumeStore()
const loading = ref(false)
const uploadLoading = ref(false)
const selectedFileName = ref('')
const result = ref<ResumeAnalysisResult | null>(null)
const streamPreview = ref('')
const streamStatus = ref('')
const controller = ref<AbortController | null>(null)

const form = reactive({
  title: '',
  targetRole: '前端开发工程师',
  experienceLevel: '3-5',
  content: '',
})

onBeforeUnmount(() => {
  controller.value?.abort()
})

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadLoading.value = true
  try {
    const parsed = await uploadResume(file)
    selectedFileName.value = parsed.fileName
    form.title ||= parsed.fileName.replace(/\.[^.]+$/, '')
    form.content = parsed.content
    notify(parsed.truncated ? '文件已解析，内容较长，已自动截断' : '文件已解析', 'success')
  } catch {
    input.value = ''
  } finally {
    uploadLoading.value = false
  }
}

async function submit() {
  if (!form.title.trim() || !form.content.trim()) {
    notify('请填写简历标题和简历内容', 'warning')
    return
  }

  controller.value = new AbortController()
  loading.value = true
  streamPreview.value = ''
  streamStatus.value = 'AI 正在建立连接'

  try {
    const resume = await createResume({ ...form })
    resumeStore.setCurrentResume(resume)
    const analysis = await analyzeResumeStream(resume.id, {
      signal: controller.value.signal,
      onStart: () => {
        streamStatus.value = 'AI 正在分析简历'
      },
      onDelta: (delta) => {
        streamStatus.value = 'AI 正在生成结构化诊断'
        streamPreview.value += delta
      },
    })
    result.value = analysis.result
    notify(analysis.cached ? '命中缓存，简历诊断结果已生成' : '简历诊断结果已生成', 'success')
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      notify('已取消本次分析', 'info')
    }
  } finally {
    loading.value = false
    controller.value = null
    streamStatus.value = ''
  }
}

function cancelStream() {
  controller.value?.abort()
}
</script>

<template>
  <div class="page">
    <header class="flex items-center gap-4">
      <div class="icon-tile h-[58px] w-[58px] rounded-[18px]">
        <FileSearch :size="30" />
      </div>
      <div>
        <h1 class="m-0 text-[34px] font-black text-[#0f172a]">简历诊断</h1>
        <p class="mt-2 text-base font-semibold text-[#64748b]">上传或粘贴简历，获得 AI 评分、问题定位和优化建议。</p>
      </div>
    </header>

    <div class="feature-workspace">
      <GlassCard class="feature-pane-left">
        <div class="mb-5 flex items-center gap-3">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-indigo-50 text-sm font-black text-indigo-600">1</span>
          <h2 class="m-0 text-xl font-black text-[#0f172a]">简历输入</h2>
        </div>

        <label class="field-label">上传简历</label>
        <label class="mb-5 grid min-h-[138px] cursor-pointer place-items-center rounded-[18px] border border-dashed border-indigo-200 bg-white/45 p-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
          <input class="hidden" type="file" accept=".pdf,.docx,.txt,.md" @change="onFileChange" />
          <UploadCloud :size="40" class="text-indigo-500" />
          <span class="mt-3 block text-sm font-extrabold text-[#26324f]">{{ uploadLoading ? '解析中...' : '点击上传 PDF / DOCX / TXT / MD' }}</span>
          <span v-if="selectedFileName" class="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{{ selectedFileName }}</span>
        </label>

        <div class="grid gap-4">
          <label>
            <span class="field-label">简历标题</span>
            <input v-model="form.title" class="input-base" placeholder="例如：前端开发工程师简历" />
          </label>
          <label>
            <span class="field-label">目标岗位</span>
            <input v-model="form.targetRole" class="input-base" placeholder="例如：前端开发工程师" />
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
            <span class="field-label">简历内容</span>
            <textarea v-model="form.content" class="textarea-base min-h-[240px]" maxlength="30000" placeholder="将你的简历内容粘贴到这里..." />
            <span class="mt-1 block text-right text-xs text-[#64748b]">{{ form.content.length }} / 30000</span>
          </label>
        </div>

        <div class="mt-5 grid gap-3">
          <button class="btn-primary w-full" :disabled="loading || uploadLoading" @click="submit">
            <Search :size="18" />
            {{ loading ? '分析中...' : '开始分析' }}
          </button>
          <button v-if="loading" class="btn-secondary w-full" @click="cancelStream">
            <Square :size="16" />
            取消本次生成
          </button>
        </div>
      </GlassCard>

      <GlassCard class="feature-pane-right soft-scrollbar">
        <div class="mb-5 flex items-center gap-3">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-indigo-50 text-sm font-black text-indigo-600">2</span>
          <h2 class="m-0 text-xl font-black text-[#0f172a]">诊断结果</h2>
        </div>

        <StreamPreview v-if="loading" :status="streamStatus" :content="streamPreview" />

        <EmptyState
          v-if="!result && !loading"
          title="等待 AI 诊断"
          description="提交简历后，这里会展示评分、优势、问题、建议和优化示例。"
        />
        <div v-else-if="result" class="grid gap-4">
          <section class="section-card">
            <ScoreCard :score="result.score" title="简历综合评分" :summary="result.summary" />
          </section>

          <section class="section-card">
            <h3 class="mb-4 mt-0 text-lg font-black text-[#0f172a]">维度评分</h3>
            <div class="grid grid-cols-5 gap-3">
              <div v-for="(score, key) in result.dimensionScores" :key="key" class="rounded-2xl border border-slate-200 bg-white/70 p-3 text-center">
                <strong class="block text-2xl text-indigo-600">{{ score }}</strong>
                <span class="text-xs font-bold text-[#64748b]">{{ key }}</span>
              </div>
            </div>
          </section>

          <div class="grid grid-cols-2 gap-4">
            <SuggestionList title="优势" :items="result.strengths" />
            <SuggestionList title="存在问题" :items="result.weaknesses" />
          </div>

          <section class="section-card">
            <h3 class="mb-4 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
              <CheckCircle2 :size="19" class="text-indigo-500" />
              优化建议
            </h3>
            <ul class="m-0 grid list-none gap-3 p-0">
              <li v-for="(item, index) in result.suggestions" :key="item" class="grid grid-cols-[34px_1fr] gap-3 rounded-2xl border border-slate-200 bg-white/60 p-3 text-sm leading-7 text-[#334155]">
                <span class="icon-tile h-8 w-8 rounded-xl">{{ index + 1 }}</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </section>

          <SuggestionList title="项目经历优化方向" :items="result.projectSuggestions" />

          <section class="section-card">
            <h3 class="mb-4 mt-0 text-lg font-black text-[#0f172a]">优化示例</h3>
            <BeforeAfterCompare :list="result.optimizedExamples" />
          </section>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
