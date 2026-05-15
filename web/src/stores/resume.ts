import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ResumeRecord } from '../types/resume'

export const useResumeStore = defineStore('resume', () => {
  const currentResume = ref<ResumeRecord | null>(null)

  function setCurrentResume(resume: ResumeRecord) {
    currentResume.value = resume
  }

  return {
    currentResume,
    setCurrentResume,
  }
})
