import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_RESUME_LENGTH, useResumeJdAssets } from '../src/composables/useResumeJdAssets'
import type { ResumeRecord } from '../src/types/resume'

const notifyMock = vi.hoisted(() => vi.fn())
const getResumesMock = vi.hoisted(() => vi.fn())
const getJobDescriptionsMock = vi.hoisted(() => vi.fn())
const routeQuery = vi.hoisted(() => ({ value: {} as Record<string, string> }))

vi.mock('../src/utils/notify', () => ({ notify: notifyMock }))
vi.mock('../src/api/resume', () => ({
  getResumes: getResumesMock,
  uploadResume: vi.fn(),
}))
vi.mock('../src/api/job', () => ({ getJobDescriptions: getJobDescriptionsMock }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery.value }),
}))

const resumeFixture = {
  id: 'r1',
  title: '前端简历',
  targetRole: '资深前端',
  content: 'A'.repeat(MAX_RESUME_LENGTH + 100),
} as ResumeRecord

const jdFixture = {
  id: 'j1',
  jobTitle: '前端工程师',
  companyName: 'Acme',
  content: 'JD 内容',
}

function setup(overrides: Partial<Parameters<typeof useResumeJdAssets>[0]> = {}) {
  const form = reactive({ resumeContent: '', jobDescription: '' })
  const onQueryApplied = vi.fn()
  const onResumeApplied = vi.fn()
  const assets = useResumeJdAssets({
    form,
    onQueryApplied,
    onResumeApplied,
    queryMissingActionText: '继续匹配',
    uploadConfirmMessage: '覆盖确认',
    ...overrides,
  })
  return { form, assets, onQueryApplied, onResumeApplied }
}

beforeEach(() => {
  notifyMock.mockClear()
  routeQuery.value = {}
  getResumesMock.mockResolvedValue([resumeFixture])
  getJobDescriptionsMock.mockResolvedValue([jdFixture])
})

describe('useResumeJdAssets', () => {
  it('loadAssets 成功填充简历与 JD 列表', async () => {
    const { assets } = setup()
    await assets.loadAssets()

    expect(assets.resumeOptions.value).toEqual([resumeFixture])
    expect(assets.jobOptions.value).toEqual([jdFixture])
    expect(assets.assetsError.value).toBe('')
  })

  it('loadAssets 失败置 assetsError，不抛出', async () => {
    getResumesMock.mockRejectedValue(new Error('down'))
    const { assets } = setup()
    await assets.loadAssets()

    expect(assets.assetsError.value).toContain('加载失败')
    expect(assets.resumeOptions.value).toEqual([])
  })

  it('query 命中已有简历：截断写入共享字段并触发回调', async () => {
    routeQuery.value = { resumeId: 'r1' }
    const { form, assets, onQueryApplied, onResumeApplied } = setup()
    await assets.loadAssets()

    expect(form.resumeContent).toHaveLength(MAX_RESUME_LENGTH)
    expect(assets.selectedResumeId.value).toBe('r1')
    expect(onResumeApplied).toHaveBeenCalledWith(resumeFixture)
    expect(onQueryApplied).toHaveBeenCalledWith('resume')
  })

  it('query 未命中：warning 提示带页面尾词', async () => {
    routeQuery.value = { resumeId: 'missing' }
    const { assets, onQueryApplied } = setup()
    await assets.loadAssets()

    expect(onQueryApplied).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalledWith(
      '指定简历加载失败，可手动选择或填写后继续匹配',
      'warning',
    )
  })

  it('applyFromQuery 只应用一次：二次 loadAssets 不重复带入', async () => {
    routeQuery.value = { resumeId: 'r1' }
    const { form, assets, onQueryApplied } = setup()
    await assets.loadAssets()

    form.resumeContent = '用户手动改过的内容'
    await assets.loadAssets()

    expect(form.resumeContent).toBe('用户手动改过的内容')
    expect(onQueryApplied).toHaveBeenCalledTimes(1)
  })

  it('applyJobDescription 写入共享字段并触发回调', async () => {
    const onJobDescriptionApplied = vi.fn()
    const { form, assets } = setup({ onJobDescriptionApplied })
    await assets.loadAssets()
    assets.applyJobDescription('j1')

    expect(form.jobDescription).toBe('JD 内容')
    expect(assets.selectedJobDescriptionId.value).toBe('j1')
    expect(onJobDescriptionApplied).toHaveBeenCalledWith(jdFixture)
  })
})
