import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ResumeRecord } from '@/types/resume'

export const useResumeStore = defineStore('resume', () => {
  const currentResume = ref<ResumeRecord | null>(null)

  function setCurrentResume(resume: ResumeRecord) {
    currentResume.value = resume
  }

  // 登出/会话失效时清空，避免换账号后残留上一账号的简历内容。
  function reset() {
    currentResume.value = null
  }

  return {
    currentResume,
    setCurrentResume,
    reset,
  }
})
