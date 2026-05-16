<script setup lang="ts">
import { Box, LockKeyhole, Settings, Shield } from 'lucide-vue-next'
</script>

<template>
  <div class="page">
    <header class="flex items-center gap-5">
      <div class="icon-tile h-[60px] w-[60px] rounded-[18px]">
        <Settings :size="32" />
      </div>
      <div>
        <h1 class="m-0 text-[34px] font-black text-[#0f172a]">设置</h1>
        <p class="mt-2 text-base font-semibold text-[#64748b]">MVP 阶段 API Key 只在服务端环境变量中配置，前端不接收密钥输入。</p>
      </div>
    </header>

    <div class="grid grid-cols-2 gap-4">
      <section class="glass-card p-5">
        <div class="mb-5 flex items-start gap-3">
          <span class="icon-tile h-10 w-10 rounded-xl"><Box :size="22" /></span>
          <div>
            <h2 class="m-0 text-xl font-black text-[#0f172a]">模型配置</h2>
            <p class="mt-1 text-sm font-semibold text-[#64748b]">当前由后端 `AiService` 统一读取环境变量并调用 DeepSeek。</p>
          </div>
        </div>

        <div class="grid gap-4">
          <label>
            <span class="field-label">Provider</span>
            <input class="input-base" value="DeepSeek" readonly />
          </label>
          <label>
            <span class="field-label">Model</span>
            <input class="input-base" value="deepseek-v4-pro" readonly />
          </label>
          <label>
            <span class="field-label">Base URL</span>
            <input class="input-base" value="https://api.deepseek.com" readonly />
          </label>
        </div>
        <p class="mt-3 flex items-center gap-2 text-xs font-semibold text-[#64748b]">
          <LockKeyhole :size="14" />
          请在 `server/.env` 配置 `DEEPSEEK_API_KEY`，不要把真实 Key 写入前端代码。
        </p>
      </section>

      <section class="glass-card p-5">
        <div class="mb-5 flex items-start gap-3">
          <span class="icon-tile h-10 w-10 rounded-xl"><Shield :size="22" /></span>
          <div>
            <h2 class="m-0 text-xl font-black text-[#0f172a]">数据说明</h2>
            <p class="mt-1 text-sm font-semibold text-[#64748b]">本地 SQLite 保存分析历史，便于复盘和删除。</p>
          </div>
        </div>
        <ul class="m-0 grid list-disc gap-3 pl-5 text-sm font-semibold leading-7 text-[#475569]">
          <li>简历诊断、项目优化、JD 匹配和模拟面试会写入历史记录。</li>
          <li>前端不会直接请求 DeepSeek，所有 AI 调用都经过后端 `AiService`。</li>
          <li>真实 API Key 只应存在于本地 `.env`，并由 `.gitignore` 排除。</li>
        </ul>
      </section>
    </div>
  </div>
</template>
