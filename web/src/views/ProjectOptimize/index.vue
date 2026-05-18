<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { AlertTriangle, Code2, Copy, FileText, HelpCircle, Layers, Shield, Sparkles, Square, Star, Trash2, UserRound } from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import StreamPreview from '../../components/StreamPreview/index.vue'
import { deleteProjectOptimization, getProjectOptimizations, optimizeProjectStream } from '../../api/project'
import type { ProjectOptimizationRecord, ProjectOptimizationResult } from '../../types/project'
import { toTagList } from '../../utils/format'
import { notify } from '../../utils/notify'

const loading = ref(false)
const result = ref<ProjectOptimizationResult | null>(null)
const resultStatus = ref<'success' | 'parse_error'>('success')
const streamPreview = ref('')
const streamStatus = ref('')
const controller = ref<AbortController | null>(null)
const records = ref<ProjectOptimizationRecord[]>([])

const form = reactive({
  rawContent: '',
  targetRole: '前端开发工程师',
  techStack: 'Vue 3, TypeScript, Vite',
  style: '简洁专业',
})

const copyText = computed(() => {
  if (!result.value) return ''
  return [
    result.value.projectName,
    result.value.projectDescription,
    `技术栈：${result.value.techStack.join('、')}`,
    `个人职责：${result.value.responsibilities.join('；')}`,
    `技术亮点：${result.value.highlights.join('；')}`,
  ].join('\n')
})

onBeforeUnmount(() => {
  controller.value?.abort()
})

onMounted(() => {
  void loadRecords()
})

async function loadRecords() {
  records.value = await getProjectOptimizations()
}

function applyRecord(record: ProjectOptimizationRecord) {
  form.rawContent = record.rawContent
  form.targetRole = record.targetRole || form.targetRole
  form.techStack = Array.isArray(record.techStack) ? record.techStack.join(', ') : form.techStack
  form.style = record.style || form.style
  result.value = record.resultJson
  resultStatus.value = 'success'
}

async function submit() {
  if (!form.rawContent.trim()) {
    notify('请填写原始项目描述', 'warning')
    return
  }

  controller.value = new AbortController()
  loading.value = true
  streamPreview.value = ''
  streamStatus.value = 'AI 正在建立连接'

  try {
    const response = await optimizeProjectStream(
      {
        rawContent: form.rawContent,
        targetRole: form.targetRole,
        techStack: toTagList(form.techStack),
        style: form.style,
      },
      {
        signal: controller.value.signal,
        onStart: () => {
          streamStatus.value = 'AI 正在优化项目表达'
        },
        onDelta: (delta) => {
          streamStatus.value = 'AI 正在生成结构化项目经历'
          streamPreview.value += delta
        },
      },
    )
    result.value = response.result
    void loadRecords()
    resultStatus.value = response.meta?.status || 'success'
    notify(
      resultStatus.value === 'parse_error'
        ? 'AI 结果格式异常，已保留原文整理结果'
        : response.cached
          ? '命中缓存，项目优化结果已生成'
          : '项目优化结果已生成',
      resultStatus.value === 'parse_error' ? 'warning' : 'success',
    )
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      notify('已取消本次优化', 'info')
    }
  } finally {
    loading.value = false
    controller.value = null
    streamStatus.value = ''
  }
}

async function removeRecord(record: ProjectOptimizationRecord) {
  await deleteProjectOptimization(record.id)
  if (result.value === record.resultJson) {
    result.value = null
  }
  await loadRecords()
  notify('项目优化记录已删除', 'success')
}

function cancelStream() {
  controller.value?.abort()
}

async function copyResult() {
  if (!copyText.value) return
  await navigator.clipboard.writeText(copyText.value)
  notify('已复制优化结果', 'success')
}
</script>

<template>
  <div class="page">
    <header class="flex items-center gap-5">
      <div class="icon-tile">
        <Code2 :size="23" />
      </div>
      <div>
        <h1 class="m-0 text-[26px] font-black text-[#0f172a]">项目经历优化</h1>
        <p class="mt-1.5 text-sm font-semibold text-[#64748b]">把原始项目描述整理成适合简历和面试追问的专业表达。</p>
      </div>
    </header>

    <div class="feature-workspace">
      <section class="glass-card feature-pane-left p-5">
        <div class="mb-4 flex items-center gap-3">
          <span class="icon-tile"><FileText :size="18" /></span>
          <h2 class="m-0 text-lg font-black text-[#0f172a]">项目信息</h2>
        </div>

        <div class="grid gap-3">
          <label>
            <span class="field-label">原始项目描述</span>
            <textarea v-model="form.rawContent" class="textarea-base min-h-[170px]" maxlength="8000" placeholder="包含项目背景、功能、技术栈、个人职责、成果或遇到的问题..." />
            <span class="mt-1 block text-right text-xs font-semibold text-[#64748b]">{{ form.rawContent.length }} / 8000</span>
          </label>
          <label>
            <span class="field-label">目标岗位</span>
            <input v-model="form.targetRole" class="input-base" />
          </label>
          <label>
            <span class="field-label">技术栈</span>
            <input v-model="form.techStack" class="input-base" placeholder="用逗号分隔，例如 Vue 3, TypeScript, Pinia" />
          </label>
          <label>
            <span class="field-label">表达风格</span>
            <select v-model="form.style" class="select-base">
              <option>简洁专业</option>
              <option>技术细节</option>
              <option>社招强化</option>
              <option>应届友好</option>
            </select>
          </label>
        </div>

        <div class="mt-5 grid gap-3">
          <button class="btn-primary w-full" :disabled="loading" @click="submit">
            <Sparkles :size="18" />
            {{ loading ? '优化中...' : '开始优化' }}
          </button>
          <button v-if="loading" class="btn-secondary w-full" @click="cancelStream">
            <Square :size="16" />
            取消本次生成
          </button>
        </div>

        <section v-if="records.length" class="mt-5 rounded-2xl border border-slate-200 bg-white/55 p-4">
          <h3 class="mb-3 mt-0 text-base font-black text-[#0f172a]">最近优化记录</h3>
          <div class="grid gap-2">
            <article v-for="record in records.slice(0, 5)" :key="record.id" class="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-white/70 p-3">
              <button class="min-w-0 text-left" type="button" @click="applyRecord(record)">
                <strong class="block truncate text-sm text-[#0f172a]">{{ record.resultJson.projectName || record.targetRole || '项目优化记录' }}</strong>
                <span class="mt-1 block truncate text-xs font-semibold text-[#64748b]">{{ record.targetRole || '未指定岗位' }}</span>
              </button>
              <button class="grid h-9 w-9 place-items-center rounded-xl text-red-500 hover:bg-red-50" type="button" @click="removeRecord(record)">
                <Trash2 :size="16" />
              </button>
            </article>
          </div>
        </section>
      </section>

      <section class="glass-card feature-pane-right soft-scrollbar p-5">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="m-0 flex items-center gap-3 text-lg font-black text-[#0f172a]">
            <span class="icon-tile"><Sparkles :size="18" /></span>
            优化结果
          </h2>
          <button class="btn-secondary min-h-10" :disabled="!result" @click="copyResult">
            <Copy :size="18" />
            复制结果
          </button>
        </div>

        <StreamPreview v-if="loading" :status="streamStatus" :content="streamPreview" />

        <EmptyState v-if="!result && !loading" title="等待项目优化" description="提交原始描述后，这里会展示项目名称、职责、亮点、难点和面试追问。" />
        <div v-else-if="result" class="grid gap-4">
          <p v-if="resultStatus === 'parse_error'" class="m-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-6 text-amber-700">
            AI 返回内容不是合法 JSON，已保留原文整理结果，建议重试生成。
          </p>

          <section class="section-card">
            <h3 class="mb-3 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]"><FileText :size="20" class="text-emerald-500" />项目名称建议</h3>
            <span class="inline-flex rounded-[10px] border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-black text-[#26324f]">{{ result.projectName }}</span>
          </section>
          <section class="section-card">
            <h3 class="mb-3 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]"><Shield :size="20" class="text-blue-500" />项目描述</h3>
            <p class="m-0 whitespace-pre-wrap text-sm font-semibold leading-7 text-[#334155]">{{ result.projectDescription }}</p>
          </section>
          <section class="section-card">
            <h3 class="mb-4 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]"><Layers :size="20" class="text-indigo-500" />技术栈</h3>
            <div class="flex flex-wrap gap-3">
              <span v-for="tag in result.techStack" :key="tag" class="rounded-[10px] border border-slate-200 bg-white/70 px-4 py-2 text-sm font-bold text-indigo-600">{{ tag }}</span>
            </div>
          </section>
          <div class="grid grid-cols-2 gap-4">
            <ListSection title="个人职责" :icon="UserRound" :items="result.responsibilities" />
            <ListSection title="技术亮点" :icon="Star" :items="result.highlights" />
            <ListSection title="项目难点" :icon="AlertTriangle" :items="result.difficulties" />
            <ListSection title="可能的面试追问" :icon="HelpCircle" :items="result.interviewQuestions" ordered />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import type { Component } from 'vue'

export default {
  components: {
    ListSection: {
      props: {
        title: { type: String, required: true },
        icon: { type: Object as () => Component, required: true },
        items: { type: Array as () => string[], required: true },
        ordered: { type: Boolean, default: false },
      },
      template: `
        <section class="section-card">
          <h3 class="mb-3 mt-0 flex items-center gap-2 text-lg font-black text-[#0f172a]">
            <component :is="icon" :size="20" class="text-indigo-500" />
            {{ title }}
          </h3>
          <ol v-if="ordered" class="m-0 grid gap-2 pl-5 text-sm font-semibold leading-7 text-[#334155]">
            <li v-for="item in items" :key="item">{{ item }}</li>
          </ol>
          <ul v-else class="m-0 grid list-disc gap-2 pl-5 text-sm font-semibold leading-7 text-[#334155]">
            <li v-for="item in items" :key="item">{{ item }}</li>
          </ul>
        </section>
      `,
    },
  },
}
</script>
