import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface InterviewWorkflowContext {
  targetRole?: string
  resumeContent?: string
  jobDescription?: string
  projectContext?: string
  sourceLabel?: string
}

function cleanContext(context: InterviewWorkflowContext) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => typeof value === 'string' && value.trim()),
  ) as InterviewWorkflowContext
}

export const useWorkflowStore = defineStore('workflow', () => {
  const interviewContext = ref<InterviewWorkflowContext | null>(null)

  function setInterviewContext(context: InterviewWorkflowContext) {
    const nextContext = cleanContext(context)
    interviewContext.value = Object.keys(nextContext).length ? nextContext : null
  }

  function consumeInterviewContext() {
    const context = interviewContext.value
    interviewContext.value = null
    return context
  }

  return {
    interviewContext,
    setInterviewContext,
    consumeInterviewContext,
  }
})
