<script setup lang="ts">
import { Boxes, Crosshair, FileSearch, History, Home, Mic, Settings, Sparkles } from 'lucide-vue-next'

const mainMenuItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/resume-analyze', label: '简历诊断', icon: FileSearch },
  { path: '/project-optimize', label: '项目优化', icon: Boxes },
  { path: '/job-match', label: '岗位匹配', icon: Crosshair },
  { path: '/interview', label: '模拟面试', icon: Mic },
  { path: '/history', label: '历史记录', icon: History },
]

const settingsItem = { path: '/settings', label: '设置', icon: Settings }
</script>

<template>
  <aside
    class="sticky top-3 flex h-[calc(100vh-24px)] w-[244px] shrink-0 flex-col rounded-[18px] border border-white/70 bg-white/62 px-3.5 py-5 shadow-[0_18px_50px_rgba(43,55,96,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl"
  >
    <RouterLink class="flex h-12 items-center gap-3 px-2" to="/">
      <span
        class="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 text-white shadow-[0_12px_24px_rgba(99,102,241,0.26)]"
      >
        <Sparkles :size="18" stroke-width="2.4" />
      </span>
      <strong class="text-[20px] font-black tracking-normal text-[#0f172a]">DevCareer AI</strong>
    </RouterLink>

    <nav class="mt-9 grid gap-2" aria-label="主导航">
      <RouterLink
        v-for="item in mainMenuItems"
        :key="item.path"
        :to="item.path"
        class="flex h-[52px] items-center gap-3 rounded-[13px] px-4 text-[16px] font-bold text-[#475569] transition duration-200 hover:bg-white/75 hover:text-[#0f172a]"
        :class="
          $route.path === item.path
            ? 'bg-gradient-to-r from-violet-500/18 to-sky-400/16 text-[#5a35ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]'
            : ''
        "
      >
        <component :is="item.icon" :size="22" stroke-width="1.9" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mx-3 mb-3 mt-5 h-px bg-slate-200/70" />

    <RouterLink
      :to="settingsItem.path"
      class="flex h-[52px] items-center gap-3 rounded-[13px] px-4 text-[16px] font-bold text-[#475569] transition duration-200 hover:bg-white/75 hover:text-[#0f172a]"
      :class="
        $route.path === settingsItem.path
          ? 'bg-gradient-to-r from-violet-500/18 to-sky-400/16 text-[#5a35ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]'
          : ''
      "
    >
      <component :is="settingsItem.icon" :size="22" stroke-width="1.9" />
      <span>{{ settingsItem.label }}</span>
    </RouterLink>
  </aside>
</template>
