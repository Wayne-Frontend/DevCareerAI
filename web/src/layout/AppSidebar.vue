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
    class="app-sidebar sticky top-2 flex h-[calc(100vh-16px)] w-[220px] shrink-0 flex-col rounded-[16px] border border-white/70 bg-white/62 px-3 py-4 shadow-[0_14px_42px_rgba(43,55,96,0.07),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl"
  >
    <RouterLink class="flex h-11 items-center gap-2.5 px-2" to="/">
      <span
        class="grid h-7 w-7 place-items-center rounded-[8px] bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 text-white shadow-[0_10px_20px_rgba(99,102,241,0.24)]"
      >
        <Sparkles :size="16" stroke-width="2.4" />
      </span>
      <strong class="text-[18px] font-black tracking-normal text-[#0f172a]">DevCareer AI</strong>
    </RouterLink>

    <nav class="mt-7 grid gap-1.5" aria-label="主导航">
      <RouterLink
        v-for="item in mainMenuItems"
        :key="item.path"
        :to="item.path"
        class="flex h-11 items-center gap-2.5 rounded-[11px] px-3.5 text-[15px] font-bold text-[#475569] transition duration-200 hover:bg-white/75 hover:text-[#0f172a]"
        :class="
          $route.path === item.path
            ? 'bg-gradient-to-r from-violet-500/18 to-sky-400/16 text-[#5a35ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]'
            : ''
        "
      >
        <component :is="item.icon" :size="19" stroke-width="1.9" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mx-3 mb-3 mt-4 h-px bg-slate-200/70" />

    <RouterLink
      :to="settingsItem.path"
      class="flex h-11 items-center gap-2.5 rounded-[11px] px-3.5 text-[15px] font-bold text-[#475569] transition duration-200 hover:bg-white/75 hover:text-[#0f172a]"
      :class="
        $route.path === settingsItem.path
          ? 'bg-gradient-to-r from-violet-500/18 to-sky-400/16 text-[#5a35ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]'
          : ''
      "
    >
      <component :is="settingsItem.icon" :size="19" stroke-width="1.9" />
      <span>{{ settingsItem.label }}</span>
    </RouterLink>
  </aside>
</template>
