<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
</script>

<template>
  <main class="app-bg grid min-h-screen place-items-center p-8">
    <section class="glass-card grid w-full max-w-[520px] gap-6 p-8 text-center">
      <div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 text-white">
        <Sparkles :size="28" />
      </div>
      <div>
        <h1 class="m-0 text-3xl font-black text-[#0f172a]">DevCareer AI</h1>
        <p class="mt-3 text-sm leading-7 text-[#64748b]">MVP 阶段暂不实现登录系统，请直接进入工作台使用。</p>
      </div>
      <RouterLink class="btn-primary" to="/">进入工作台</RouterLink>
    </section>
  </main>
</template>
