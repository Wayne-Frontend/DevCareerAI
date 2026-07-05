import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { getJobDescriptions } from '@/api/job'
import { getResumes, uploadResume } from '@/api/resume'
import type { JobDescriptionRecord } from '@/types/job'
import type { ResumeRecord } from '@/types/resume'
import { messageBox } from '@/utils/messageBox'
import { notify } from '@/utils/notify'

/** 简历内容截断上限：与后端接口契约一致，模拟面试与岗位匹配共用。 */
export const MAX_RESUME_LENGTH = 20000

interface ResumeJdForm {
  resumeContent: string
  jobDescription: string
}

interface UseResumeJdAssetsOptions {
  /** 页面的 reactive form，composable 只写共享字段 resumeContent/jobDescription */
  form: ResumeJdForm
  /** 选中已有简历后回填页面特有字段（如 targetRole / jobTitle） */
  onResumeApplied?: (resume: ResumeRecord) => void
  /** 选中已有 JD 后回填页面特有字段 */
  onJobDescriptionApplied?: (job: JobDescriptionRecord) => void
  /** 路由 query 带入成功后的反馈（页面自决：页内横幅或 toast） */
  onQueryApplied: (kind: 'resume' | 'jd') => void
  /** query 指定的记录不存在时 warning 文案的动作尾词，如「继续面试」/「继续匹配」 */
  queryMissingActionText: string
  /** 上传覆盖已有内容时确认弹窗的 message */
  uploadConfirmMessage: string
  /** 上传开始前的额外清理（如清空页面级 errorMessage） */
  onUploadStart?: () => void
}

/**
 * 模拟面试 / 岗位匹配共享的「资产」逻辑：
 * 加载已有简历与 JD 列表、按路由 query 带入、选择记录回填、简历文件上传解析。
 * 返回的状态名与两页原有变量一致，模板无需改动。
 */
export function useResumeJdAssets(options: UseResumeJdAssetsOptions) {
  const route = useRoute()
  const resumeOptions = ref<ResumeRecord[]>([])
  const jobOptions = ref<JobDescriptionRecord[]>([])
  const selectedResumeId = ref('')
  const selectedJobDescriptionId = ref('')
  const assetsLoading = ref(false)
  const assetsError = ref('')
  const uploadLoading = ref(false)
  const uploadError = ref('')
  const selectedFileName = ref('')
  const queryApplied = ref(false)

  async function loadAssets() {
    assetsLoading.value = true
    assetsError.value = ''
    try {
      const [resumes, jobs] = await Promise.all([getResumes(), getJobDescriptions()])
      resumeOptions.value = resumes
      jobOptions.value = jobs
      applyFromQuery()
    } catch {
      assetsError.value = '已有简历或 JD 加载失败，你仍可以手动输入内容。'
    } finally {
      assetsLoading.value = false
    }
  }

  function readQueryId(key: 'resumeId' | 'jdId') {
    const value = route.query[key]
    return typeof value === 'string' ? value : ''
  }

  // 仅在首次加载资产后应用一次，避免刷新列表时重复带入覆盖用户输入。
  function applyFromQuery() {
    if (queryApplied.value) return
    queryApplied.value = true

    const resumeId = readQueryId('resumeId')
    if (resumeId) {
      if (resumeOptions.value.some((item) => item.id === resumeId)) {
        applyResume(resumeId)
        options.onQueryApplied('resume')
      } else {
        notify(`指定简历加载失败，可手动选择或填写后${options.queryMissingActionText}`, 'warning')
      }
    }

    const jdId = readQueryId('jdId')
    if (jdId) {
      if (jobOptions.value.some((item) => item.id === jdId)) {
        applyJobDescription(jdId)
        options.onQueryApplied('jd')
      } else {
        notify(`指定 JD 加载失败，可手动选择或填写后${options.queryMissingActionText}`, 'warning')
      }
    }
  }

  function applyResume(id: string) {
    selectedResumeId.value = id
    const resume = resumeOptions.value.find((item) => item.id === id)
    if (!resume) return
    options.form.resumeContent = resume.content.slice(0, MAX_RESUME_LENGTH)
    options.onResumeApplied?.(resume)
    uploadError.value = ''
  }

  function applyJobDescription(id: string) {
    selectedJobDescriptionId.value = id
    const job = jobOptions.value.find((item) => item.id === id)
    if (!job) return
    options.form.jobDescription = job.content
    options.onJobDescriptionApplied?.(job)
  }

  async function onResumeFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (options.form.resumeContent.trim()) {
      const confirmed = await messageBox.confirm({
        type: 'warning',
        title: '替换当前简历内容？',
        message: options.uploadConfirmMessage,
        confirmText: '继续上传',
      })
      if (!confirmed) {
        input.value = ''
        return
      }
    }

    uploadLoading.value = true
    uploadError.value = ''
    options.onUploadStart?.()
    try {
      const parsed = await uploadResume(file)
      selectedResumeId.value = ''
      selectedFileName.value = parsed.fileName
      options.form.resumeContent = parsed.content.slice(0, MAX_RESUME_LENGTH)
      notify(
        parsed.truncated || parsed.content.length > MAX_RESUME_LENGTH
          ? '文件已解析，内容较长，已自动截断'
          : '文件已解析',
        'success',
      )
    } catch {
      uploadError.value = '文件解析失败，请确认格式为 PDF、DOCX、TXT 或 MD 后重试。'
    } finally {
      uploadLoading.value = false
      input.value = ''
    }
  }

  return {
    resumeOptions,
    jobOptions,
    selectedResumeId,
    selectedJobDescriptionId,
    assetsLoading,
    assetsError,
    uploadLoading,
    uploadError,
    selectedFileName,
    loadAssets,
    applyResume,
    applyJobDescription,
    onResumeFileChange,
  }
}
