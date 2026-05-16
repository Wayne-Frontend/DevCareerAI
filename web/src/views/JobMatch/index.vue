<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { BriefcaseBusiness, ClipboardList, FileText, Info, Square, Target, UploadCloud, WandSparkles } from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import KeywordTags from '../../components/KeywordTags/index.vue'
import SuggestionList from '../../components/SuggestionList/index.vue'
import ScoreCard from '../../components/ScoreCard/index.vue'
import StreamPreview from '../../components/StreamPreview/index.vue'
import { matchJobStream } from '../../api/job'
import { uploadResume } from '../../api/resume'
import type { JobMatchResult } from '../../types/job'
import { notify } from '../../utils/notify'

const MAX_RESUME_LENGTH = 20000
const loading = ref(false)
const uploadLoading = ref(false)
const selectedFileName = ref('')
const result = ref<JobMatchResult | null>(null)
const streamPreview = ref('')
const streamStatus = ref('')
const controller = ref<AbortController | null>(null)

const form = reactive({
  resumeContent: '',
  jobTitle: '前端开发工程师',
  companyName: '',
  jobDescription: '',
})

const dimensionItems = computed(() => {
  const score = result.value?.matchScore ?? 0
  return [
    ['技能匹配', Math.min(100, score + 3)],
    ['项目相关', Math.max(0, score - 2)],
    ['工程能力', Math.max(0, score - 4)],
    ['业务理解', Math.max(0, score - 8)],
  ] as Array<[string, number]>
})

onBeforeUnmount(() => {
  controller.value?.abort()
})

async function onResumeFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadLoading.value = true
  try {
    const parsed = await uploadResume(file)
    selectedFileName.value = parsed.fileName
    form.resumeContent = parsed.content.slice(0, MAX_RESUME_LENGTH)
    notify(parsed.truncated || parsed.content.length > MAX_RESUME_LENGTH ? '文件已解析，内容较长，已自动截断' : '文件已解析', 'success')
  } catch {
    input.value = ''
  } finally {
    uploadLoading.value = false
  }
}

async function submit() {
  if (!form.resumeContent.trim() || !form.jobTitle.trim() || !form.jobDescription.trim()) {
    notify('请填写简历内容、岗位名称和 JD', 'warning')
    return
  }

  controller.value = new AbortController()
  loading.value = true
  streamPreview.value = ''
  streamStatus.value = 'AI 正在建立连接'

  try {
    const response = await matchJobStream(
      { ...form },
      {
        signal: controller.value.signal,
        onStart: () => {
          streamStatus.value = 'AI 正在对比简历与 JD'
        },
        onDelta: (delta) => {
          streamStatus.value = 'AI 正在生成匹配报告'
          streamPreview.value += delta
        },
      },
    )
    result.value = response.result
    notify(response.cached ? '命中缓存，岗位匹配结果已生成' : '岗位匹配结果已生成', 'success')
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      notify('已取消本次匹配分析', 'info')
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
      <div class="icon-tile h-[58px] w-[58px] rounded-2xl">
        <Target :size="28" />
      </div>
      <div>
        <h1 class="m-0 text-[34px] font-black text-[#0f172a]">岗位 JD 匹配</h1>
        <p class="mt-2 text-base font-semibold text-[#64748b]">分析简历与目标 JD 的匹配度，定位优势、风险和补强方向。</p>
      </div>
    </header>

    <div class="feature-workspace-balanced">
      <GlassCard class="feature-pane-left">
        <h2 class="mb-4 flex items-center gap-2 text-lg font-black text-[#0f172a]">
          <FileText :size="19" class="text-indigo-500" />
          简历内容
        </h2>

        <label class="mb-4 grid min-h-[112px] cursor-pointer place-items-center rounded-[18px] border border-dashed border-indigo-200 bg-white/45 p-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
          <input class="hidden" type="file" accept=".pdf,.docx,.txt,.md" @change="onResumeFileChange" />
          <UploadCloud :size="32" class="text-indigo-500" />
          <span class="mt-2 block text-sm font-extrabold text-[#26324f]">{{ uploadLoading ? '解析中...' : '上传 PDF / DOCX / TXT / MD' }}</span>
          <span v-if="selectedFileName" class="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">{{ selectedFileName }}</span>
        </label>

        <textarea v-model="form.resumeContent" class="textarea-base min-h-[190px]" :maxlength="MAX_RESUME_LENGTH" placeholder="粘贴或上传简历内容..." />
        <p class="mt-2 text-right text-xs text-[#94a3b8]">{{ form.resumeContent.length }} / {{ MAX_RESUME_LENGTH }}</p>

        <h2 class="mb-4 flex items-center gap-2 text-lg font-black text-[#0f172a]">
          <BriefcaseBusiness :size="19" class="text-indigo-500" />
          目标岗位
        </h2>
        <input v-model="form.jobTitle" class="input-base" placeholder="岗位名称" />
        <input v-model="form.companyName" class="input-base mt-3" placeholder="公司名称（可选）" />
        <div class="mb-4 mt-5 flex items-center justify-between">
          <h2 class="m-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
            <ClipboardList :size="19" class="text-indigo-500" />
            职位描述（JD）
          </h2>
          <span class="soft-tag">AI 解析</span>
        </div>
        <textarea v-model="form.jobDescription" class="textarea-base min-h-[154px]" maxlength="10000" placeholder="粘贴岗位 JD..." />
        <p class="mt-2 text-right text-xs text-[#94a3b8]">{{ form.jobDescription.length }} / 10000</p>

        <div class="mt-5 flex justify-end gap-3">
          <button v-if="loading" class="btn-secondary min-w-[150px]" @click="cancelStream">
            <Square :size="16" />
            取消生成
          </button>
          <button class="btn-primary min-w-[200px]" :disabled="loading || uploadLoading" @click="submit">
            <WandSparkles :size="18" />
            {{ loading ? '分析中...' : '开始匹配分析' }}
          </button>
        </div>
      </GlassCard>

      <GlassCard class="feature-pane-right soft-scrollbar">
        <div class="mb-5 flex items-baseline gap-4">
          <h2 class="m-0 text-[26px] font-black text-[#0f172a]">匹配结果</h2>
          <span class="text-sm text-[#64748b]">基于简历与 JD 的 AI 对比分析</span>
        </div>

        <StreamPreview v-if="loading" :status="streamStatus" :content="streamPreview" />

        <EmptyState v-if="!result && !loading" title="等待匹配分析" description="填写简历和 JD 后，这里会展示匹配度、关键词、风险点和面试准备建议。" />

        <div v-else-if="result" class="grid gap-4">
          <div class="grid grid-cols-[0.78fr_1fr] gap-4">
            <section class="section-card">
              <ScoreCard :score="result.matchScore" title="综合匹配度" :summary="result.summary" />
            </section>

            <section class="section-card">
              <h3 class="mb-4 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
                维度参考
                <Info :size="15" class="text-[#94a3b8]" />
              </h3>
              <ul class="m-0 grid list-none gap-3 p-0">
                <li v-for="[label, score] in dimensionItems" :key="label" class="grid grid-cols-[90px_1fr_48px] items-center gap-3 text-sm text-[#475569]">
                  <span>{{ label }}</span>
                  <span class="progress-track"><i class="progress-fill block" :style="{ width: `${score}%` }" /></span>
                  <b>{{ score }}</b>
                </li>
              </ul>
            </section>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <section class="section-card">
              <h3 class="mb-4 mt-0 text-lg font-black text-[#0f172a]">匹配关键词</h3>
              <KeywordTags :tags="result.matchedKeywords" type="success" />
            </section>
            <section class="section-card">
              <h3 class="mb-4 mt-0 text-lg font-black text-[#0f172a]">缺失关键词</h3>
              <KeywordTags :tags="result.missingKeywords" type="danger" />
            </section>
            <SuggestionList title="优势" :items="result.advantages" />
            <SuggestionList title="风险点" :items="result.risks" />
            <SuggestionList title="简历修改建议" :items="result.resumeSuggestions" />
            <SuggestionList title="面试准备建议" :items="result.interviewPreparation" />
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
