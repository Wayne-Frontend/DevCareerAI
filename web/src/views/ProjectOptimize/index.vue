<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { AlertTriangle, Code2, Copy, FileText, HelpCircle, Layers, Shield, Sparkles, Square, Star, UserRound } from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import StreamPreview from '../../components/StreamPreview/index.vue'
import { optimizeProjectStream } from '../../api/project'
import type { ProjectOptimizationResult } from '../../types/project'
import { toTagList } from '../../utils/format'
import { notify } from '../../utils/notify'

const loading = ref(false)
const result = ref<ProjectOptimizationResult | null>(null)
const streamPreview = ref('')
const streamStatus = ref('')
const controller = ref<AbortController | null>(null)

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
    notify(response.cached ? '命中缓存，项目优化结果已生成' : '项目优化结果已生成', 'success')
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
      <div class="icon-tile h-[60px] w-[60px] rounded-[18px]">
        <Code2 :size="32" />
      </div>
      <div>
        <h1 class="m-0 text-[34px] font-black text-[#0f172a]">项目经历优化</h1>
        <p class="mt-2 text-base font-semibold text-[#64748b]">把原始项目描述整理成适合简历和面试追问的专业表达。</p>
      </div>
    </header>

    <div class="feature-workspace">
      <section class="glass-card feature-pane-left p-5">
        <div class="mb-5 flex items-center gap-3">
          <span class="icon-tile h-10 w-10 rounded-xl"><FileText :size="21" /></span>
          <h2 class="m-0 text-xl font-black text-[#0f172a]">项目信息</h2>
        </div>

        <div class="grid gap-4">
          <label>
            <span class="field-label">原始项目描述</span>
            <textarea v-model="form.rawContent" class="textarea-base min-h-[220px]" maxlength="8000" placeholder="包含项目背景、功能、技术栈、个人职责、成果或遇到的问题..." />
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
      </section>

      <section class="glass-card feature-pane-right soft-scrollbar p-5">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="m-0 flex items-center gap-3 text-xl font-black text-[#0f172a]">
            <span class="icon-tile h-10 w-10 rounded-xl"><Sparkles :size="20" /></span>
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
