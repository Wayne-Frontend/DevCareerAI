import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'vitest'
import { DashboardService } from '../src/modules/dashboard/dashboard.service'
import type { PrismaService } from '../src/prisma/prisma.service'

interface StubData {
  resumeRows?: Array<{ score: number; createdAt: Date; resultJson: unknown }>
  jobRows?: Array<{ matchScore: number }>
  interviewRows?: Array<{ summaryJson: unknown }>
  counts?: { resume?: number; job?: number; interview?: number }
  trendRows?: Array<{ score: number; createdAt: Date; resume: { title: string } }>
}

function createService(data: StubData = {}) {
  const prisma = {
    resumeAnalysis: {
      // getOverview 取最近 2 条，getResumeTrend 取最近 N 条，按调用参数区分
      findMany: async (args: { take: number }) =>
        args.take === 2 ? (data.resumeRows ?? []) : (data.trendRows ?? []),
      count: async () => data.counts?.resume ?? data.resumeRows?.length ?? 0,
    },
    jobMatchAnalysis: {
      findMany: async () => data.jobRows ?? [],
      count: async () => data.counts?.job ?? data.jobRows?.length ?? 0,
    },
    interviewSession: {
      findMany: async () => data.interviewRows ?? [],
      count: async () => data.counts?.interview ?? data.interviewRows?.length ?? 0,
    },
  } as unknown as PrismaService

  return new DashboardService(prisma)
}

test('getOverview：delta = 最新分 - 上一次分', async () => {
  const service = createService({
    resumeRows: [
      { score: 88, createdAt: new Date('2026-07-01'), resultJson: {} },
      { score: 80, createdAt: new Date('2026-06-01'), resultJson: {} },
    ],
  })

  const overview = await service.getOverview('u1')

  equal(overview.resume.score, 88)
  equal(overview.resume.delta, 8)
})

test('getOverview：只有一次记录时 delta 为 null', async () => {
  const service = createService({
    resumeRows: [{ score: 88, createdAt: new Date('2026-07-01'), resultJson: {} }],
  })

  const overview = await service.getOverview('u1')

  equal(overview.resume.delta, null)
})

test('getOverview：三类记录都为空时 hasData=false，各指标为空态', async () => {
  const service = createService()

  const overview = await service.getOverview('u1')

  equal(overview.hasData, false)
  equal(overview.recordCount, 0)
  deepEqual(overview.resume, {
    score: null,
    delta: null,
    dimensionScores: null,
    lastAnalyzedAt: null,
  })
  deepEqual(overview.suggestions, [])
})

test('getOverview：suggestions 缺失时回退 weaknesses，且最多取 4 条', async () => {
  const service = createService({
    resumeRows: [
      {
        score: 70,
        createdAt: new Date('2026-07-01'),
        resultJson: { weaknesses: ['a', 'b', 'c', 'd', 'e'] },
      },
    ],
  })

  const overview = await service.getOverview('u1')

  deepEqual(overview.suggestions, ['a', 'b', 'c', 'd'])
})

test('getOverview：维度分越界/非法值被 clamp 到 0-100', async () => {
  const service = createService({
    resumeRows: [
      {
        score: 70,
        createdAt: new Date('2026-07-01'),
        resultJson: {
          dimensionScores: {
            completeness: 120,
            skillMatch: -5,
            projectQuality: 'not-a-number',
            technicalDepth: 66.6,
            professionalExpression: 90,
          },
        },
      },
    ],
  })

  const overview = await service.getOverview('u1')

  deepEqual(overview.resume.dimensionScores, {
    completeness: 100,
    skillMatch: 0,
    projectQuality: 0,
    technicalDepth: 67,
    professionalExpression: 90,
  })
})

test('getOverview：面试分从 summaryJson.totalScore 提取，非法值被过滤', async () => {
  const service = createService({
    interviewRows: [{ summaryJson: { totalScore: 82 } }, { summaryJson: { totalScore: 'bad' } }],
    counts: { interview: 2 },
  })

  const overview = await service.getOverview('u1')

  equal(overview.interview.score, 82)
  equal(overview.interview.delta, null)
})

test('getResumeTrend：无记录时返回空态', async () => {
  const service = createService()

  deepEqual(await service.getResumeTrend('u1'), { resumeId: null, title: null, points: [] })
})

test('getResumeTrend：查询倒序取最近 N 条，输出按时间正序', async () => {
  const service = createService({
    trendRows: [
      { score: 90, createdAt: new Date('2026-07-03'), resume: { title: '最新简历' } },
      { score: 80, createdAt: new Date('2026-07-02'), resume: { title: '旧简历' } },
      { score: 70, createdAt: new Date('2026-07-01'), resume: { title: '更旧简历' } },
    ],
  })

  const trend = await service.getResumeTrend('u1')

  equal(trend.title, '最新简历')
  deepEqual(
    trend.points.map((point) => point.score),
    [70, 80, 90],
  )
})
