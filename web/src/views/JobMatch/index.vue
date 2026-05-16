<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { BriefcaseBusiness, ClipboardList, FileText, Info, Target, WandSparkles } from 'lucide-vue-next'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import KeywordTags from '../../components/KeywordTags/index.vue'
import SuggestionList from '../../components/SuggestionList/index.vue'
import ScoreCard from '../../components/ScoreCard/index.vue'
import { matchJob } from '../../api/job'
import type { JobMatchResult } from '../../types/job'
import { notify } from '../../utils/notify'

const loading = ref(false)
const result = ref<JobMatchResult | null>(null)
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

async function submit() {
  if (!form.resumeContent.trim() || !form.jobTitle.trim() || !form.jobDescription.trim()) {
    notify('请填写简历内容、岗位名称和 JD', 'warning')
    return
  }

  loading.value = true
  try {
    const response = await matchJob({ ...form })
    result.value = response.result
    notify('岗位匹配结果已生成', 'success')
  } finally {
    loading.value = false
  }
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

    <div class="grid grid-cols-[0.95fr_1fr] gap-4">
      <GlassCard>
        <h2 class="mb-4 flex items-center gap-2 text-lg font-black text-[#0f172a]">
          <FileText :size="19" class="text-indigo-500" />
          简历内容
        </h2>
        <textarea v-model="form.resumeContent" class="textarea-base min-h-[260px]" maxlength="20000" placeholder="粘贴简历内容..." />
        <p class="mt-2 text-right text-xs text-[#94a3b8]">{{ form.resumeContent.length }} / 20000</p>
      </GlassCard>

      <GlassCard>
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
      </GlassCard>
    </div>

    <div class="flex justify-end">
      <button class="btn-primary min-w-[220px]" :disabled="loading" @click="submit">
        <WandSparkles :size="18" />
        {{ loading ? '分析中...' : '开始匹配分析' }}
      </button>
    </div>

    <section class="grid gap-4">
      <div class="flex items-baseline gap-4">
        <h2 class="m-0 text-[26px] font-black text-[#0f172a]">匹配结果</h2>
        <span class="text-sm text-[#64748b]">基于简历与 JD 的 AI 对比分析</span>
      </div>

      <EmptyState v-if="!result" title="等待匹配分析" description="填写简历和 JD 后，这里会展示匹配度、关键词、风险点和面试准备建议。" />

      <div v-else class="grid gap-4">
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
    </section>
  </div>
</template>
