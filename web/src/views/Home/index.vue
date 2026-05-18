<script setup lang="ts">
import { Code2, FileSearch, Mic, MoveRight, Target } from 'lucide-vue-next'
import FeatureCard from '../../components/FeatureCard/index.vue'

const features = [
  {
    title: '简历诊断',
    description: '从完整度、技能匹配、项目质量、技术深度和表达方式分析简历。',
    path: '/resume-analyze',
    icon: FileSearch,
  },
  {
    title: '项目经历优化',
    description: '把原始描述整理为可放进简历的项目名称、职责、亮点和难点。',
    path: '/project-optimize',
    icon: Code2,
  },
  {
    title: '岗位 JD 匹配',
    description: '对比简历和 JD，识别匹配关键词、缺失关键词和面试准备方向。',
    path: '/job-match',
    icon: Target,
  },
  {
    title: '模拟面试',
    description: '基于简历和目标岗位生成问题，点评回答并持续追问。',
    path: '/interview',
    icon: Mic,
  },
]
</script>

<template>
  <div class="page">
    <section class="home-hero relative min-h-[280px] overflow-hidden rounded-[18px] border border-[rgba(148,163,184,0.22)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(239,244,255,0.72))] p-7 shadow-[0_14px_38px_rgba(43,55,96,0.07)]">
      <div class="home-hero-aura absolute inset-0 bg-[radial-gradient(circle_at_84%_45%,rgba(124,58,237,0.24),transparent_32%),radial-gradient(circle_at_70%_70%,rgba(56,189,248,0.16),transparent_24%)]" />
      <div class="relative z-10 max-w-[760px]">
        <span class="soft-tag">程序员 AI 简历与面试助手</span>
        <h1 class="mb-3 mt-5 text-[36px] font-black leading-[1.12] tracking-normal text-[#08112f]">DevCareer AI</h1>
        <p class="m-0 max-w-[680px] text-[15px] font-semibold leading-7 text-[#64748b]">面向开发者的本地 MVP 工作台，支持简历诊断、项目经历优化、岗位匹配、模拟面试和历史复盘。</p>
        <div class="mt-7 flex gap-3">
          <RouterLink class="btn-primary min-w-[150px]" to="/resume-analyze">
            <FileSearch :size="20" />
            开始诊断
          </RouterLink>
          <RouterLink class="btn-secondary min-w-[140px]" to="/interview">
            <Mic :size="20" />
            模拟面试
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-4 gap-2.5">
      <FeatureCard
        v-for="feature in features"
        :key="feature.path"
        :icon="feature.icon"
        :title="feature.title"
        :description="feature.description"
      >
        <RouterLink class="ml-auto grid h-9 w-9 place-items-center rounded-full bg-white/80 text-[#0f172a] shadow-[0_10px_24px_rgba(43,55,96,0.08)] transition hover:-translate-y-0.5 hover:text-indigo-600" :to="feature.path">
          <MoveRight :size="18" />
        </RouterLink>
      </FeatureCard>
    </section>
  </div>
</template>
