<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  FileSearch,
  Mic,
  PackageCheck,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Target,
} from 'lucide-vue-next'
import { getDashboardOverview } from '@/api/dashboard'
import type { DashboardOverview } from '@/types/dashboard'

// 综合得分环的周长，与 <style> 中 .ring-value 的 stroke-dasharray(414) 保持一致。
const RING_CIRCUMFERENCE = 414
const SUGGESTION_TONES = ['blue', 'green', 'purple', 'orange'] as const
const SUGGESTION_ICONS = [FileSearch, PackageCheck, Star, BriefcaseBusiness]

const loading = ref(true)
const overview = ref<DashboardOverview | null>(null)

async function loadOverview() {
  loading.value = true
  try {
    overview.value = await getDashboardOverview()
  } catch {
    // 请求层已统一弹出错误提示，这里保持空数据即可。
    overview.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadOverview)

const resumeScore = computed(() => overview.value?.resume.score ?? null)

function formatScore(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : String(Math.round(value))
}

function formatDelta(delta: number | null | undefined, unit = '') {
  if (delta === null || delta === undefined) return '暂无对比数据'
  if (delta === 0) return '与上次持平'
  const sign = delta > 0 ? '+' : ''
  return `较上次 ${sign}${Math.round(delta)}${unit}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const metrics = computed(() => {
  const data = overview.value
  return [
    {
      label: '简历综合得分',
      value: formatScore(data?.resume.score),
      unit: '/100',
      change: formatDelta(data?.resume.delta),
      icon: FileSearch,
      tone: 'blue',
    },
    {
      label: '岗位匹配度',
      value: formatScore(data?.jobMatch.score),
      unit: '%',
      change: formatDelta(data?.jobMatch.delta, '%'),
      icon: Target,
      tone: 'green',
    },
    {
      label: '模拟面试得分',
      value: formatScore(data?.interview.score),
      unit: '/100',
      change: formatDelta(data?.interview.delta),
      icon: Mic,
      tone: 'purple',
    },
    {
      label: '累计记录',
      value: String(data?.recordCount ?? 0),
      unit: '',
      change: `简历 / 匹配 / 面试共 ${data?.recordCount ?? 0} 条`,
      icon: Send,
      tone: 'cyan',
    },
  ]
})

const scoreDimensions = computed(() => {
  const dimensions = overview.value?.resume.dimensionScores
  if (!dimensions) return []
  return [
    { label: '技能匹配度', score: dimensions.skillMatch, color: '#3b82f6', icon: CircleGauge },
    { label: '项目质量', score: dimensions.projectQuality, color: '#8b5cf6', icon: FileSearch },
    { label: '技术深度', score: dimensions.technicalDepth, color: '#f59e0b', icon: BarChart3 },
    { label: '专业表达', score: dimensions.professionalExpression, color: '#16a36a', icon: Star },
  ]
})

const suggestions = computed(() =>
  (overview.value?.suggestions ?? []).map((text, index) => ({
    text,
    tone: SUGGESTION_TONES[index % SUGGESTION_TONES.length],
    icon: SUGGESTION_ICONS[index % SUGGESTION_ICONS.length],
  })),
)

const ringOffset = computed(() => {
  if (resumeScore.value === null) return RING_CIRCUMFERENCE
  return RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, resumeScore.value)) / 100)
})

const scoreBadge = computed(() => {
  const score = resumeScore.value
  if (score === null) return '暂无'
  if (score >= 85) return '优秀'
  if (score >= 70) return '良好'
  if (score >= 60) return '中等'
  return '待提升'
})

const lastAnalyzedLabel = computed(() => {
  const formatted = formatDateTime(overview.value?.resume.lastAnalyzedAt)
  return formatted ? `上次诊断：${formatted}` : '尚未进行简历诊断'
})

const actionCards = [
  {
    title: '项目优化',
    description: 'AI 助力项目包装，突出技术亮点',
    points: ['智能提炼项目亮点', '生成 STAR 结构描述'],
    cta: '立即优化',
    path: '/project-optimize',
    tone: 'green',
    icon: Boxes,
  },
  {
    title: 'JD 匹配',
    description: '精准匹配目标岗位，提升投递成功率',
    points: ['多维度匹配分析', '竞争力对比与建议'],
    cta: '开始匹配',
    path: '/job-match',
    tone: 'blue',
    icon: Target,
  },
  {
    title: '模拟面试',
    description: '真实场景模拟，提升面试表现',
    points: ['技术面试模拟', 'AI 智能评估反馈'],
    cta: '开始练习',
    path: '/interview',
    tone: 'purple',
    icon: Mic,
  },
]
</script>

<template>
  <div class="dashboard-page">
    <header class="dashboard-header">
      <div>
        <h1>求职作战台</h1>
        <p>AI 驱动的职业竞争力提升，让每一次投递更有把握。</p>
      </div>

      <div class="header-actions">
        <button class="status-pill" type="button" :disabled="loading" @click="loadOverview">
          <RefreshCw :size="15" />
          {{ loading ? '刷新中…' : '刷新数据' }}
        </button>
      </div>
    </header>

    <section class="metric-grid" aria-label="关键指标">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="glass-panel metric-card"
        :class="`tone-${metric.tone}`"
      >
        <div class="metric-copy">
          <span class="icon-block">
            <component :is="metric.icon" :size="28" stroke-width="1.95" />
          </span>
          <div>
            <p>{{ metric.label }}</p>
            <strong
              >{{ metric.value }}<small>{{ metric.unit }}</small></strong
            >
            <em>{{ metric.change }}</em>
          </div>
        </div>
      </article>
    </section>

    <section class="work-grid">
      <article class="glass-panel diagnosis-card">
        <div class="card-heading">
          <div>
            <h2>AI 简历诊断</h2>
            <p>全面评估简历质量，发现优势与改进点</p>
          </div>
        </div>

        <div class="diagnosis-body">
          <div class="score-column">
            <span class="score-label">综合得分</span>
            <div class="score-ring">
              <svg viewBox="0 0 160 160" aria-hidden="true">
                <defs>
                  <linearGradient
                    id="scoreGradient"
                    x1="20"
                    y1="20"
                    x2="140"
                    y2="140"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stop-color="#74a8ff" />
                    <stop offset="58%" stop-color="#2563eb" />
                    <stop offset="100%" stop-color="#4f7cff" />
                  </linearGradient>
                </defs>
                <circle cx="80" cy="80" r="66" class="ring-track" />
                <circle
                  cx="80"
                  cy="80"
                  r="66"
                  class="ring-value"
                  :style="{ strokeDashoffset: ringOffset }"
                />
              </svg>
              <div>
                <strong>{{ formatScore(resumeScore) }}</strong>
                <span>/100</span>
              </div>
            </div>
            <span class="score-badge">{{ scoreBadge }}</span>
          </div>

          <div v-if="scoreDimensions.length" class="dimension-panel">
            <div v-for="item in scoreDimensions" :key="item.label" class="dimension-row">
              <span
                class="dimension-icon"
                :style="{ color: item.color, background: `${item.color}18` }"
              >
                <component :is="item.icon" :size="17" />
              </span>
              <div>
                <div class="dimension-meta">
                  <strong>{{ item.label }}</strong>
                  <em :style="{ color: item.color }">{{ item.score }}<small>/100</small></em>
                </div>
                <div class="dimension-track">
                  <i :style="{ width: `${item.score}%`, background: item.color }" />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="dimension-panel dimension-panel--empty">
            <p>
              {{ loading ? '正在加载维度得分…' : '完成一次简历诊断后，这里会展示各维度得分。' }}
            </p>
          </div>

          <div class="resume-illustration" aria-hidden="true">
            <div class="iso-cube">
              <span class="sheet sheet-a" />
              <span class="sheet sheet-b" />
              <span class="sheet sheet-c" />
              <span class="lens" />
              <span class="spark spark-a" />
              <span class="spark spark-b" />
            </div>
          </div>
        </div>

        <footer class="diagnosis-footer">
          <span>{{ lastAnalyzedLabel }}</span>
          <RouterLink class="primary-gradient-btn" to="/resume-analyze">
            <Sparkles :size="20" />
            开始诊断
          </RouterLink>
        </footer>
      </article>

      <aside class="glass-panel suggestions-card">
        <div class="side-heading">
          <h2>下一步建议</h2>
          <RouterLink to="/history">
            查看全部
            <ArrowRight :size="16" />
          </RouterLink>
        </div>

        <div v-if="suggestions.length" class="suggestion-list">
          <RouterLink
            v-for="(suggestion, index) in suggestions"
            :key="index"
            class="suggestion-item"
            :class="`priority-${suggestion.tone}`"
            :title="suggestion.text"
            to="/resume-analyze"
          >
            <span class="suggestion-icon">
              <component :is="suggestion.icon" :size="21" />
            </span>
            <span class="suggestion-text">
              <strong>{{ suggestion.text }}</strong>
            </span>
            <em>去优化</em>
            <ChevronRight :size="19" />
          </RouterLink>
        </div>
        <div v-else class="suggestion-empty">
          <p v-if="loading">正在加载建议…</p>
          <template v-else>
            <p>完成一次简历诊断后，这里会显示可执行的改进建议。</p>
            <RouterLink to="/resume-analyze">
              去诊断简历
              <ArrowRight :size="16" />
            </RouterLink>
          </template>
        </div>
      </aside>
    </section>

    <section class="action-grid" aria-label="快捷入口">
      <article
        v-for="card in actionCards"
        :key="card.title"
        class="glass-panel action-card"
        :class="`tone-${card.tone}`"
      >
        <div class="action-copy">
          <span class="icon-block">
            <component :is="card.icon" :size="30" />
          </span>
          <div>
            <h2>{{ card.title }}</h2>
            <p>{{ card.description }}</p>
          </div>
        </div>

        <div class="action-main">
          <ul>
            <li v-for="point in card.points" :key="point">
              <CheckCircle2 :size="17" />
              {{ point }}
            </li>
          </ul>
        </div>

        <RouterLink class="card-action-btn" :to="card.path">
          {{ card.cta }}
          <ArrowRight :size="17" />
        </RouterLink>
      </article>
    </section>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  display: flex;
  min-width: 0;
  width: 100%;
  max-width: var(--app-content-max-width);
  flex-direction: column;
  gap: var(--page-gap);
  margin-inline: auto;
  padding: var(--page-padding-y) var(--page-padding-x) calc(var(--page-padding-y) + 8px);
  animation: pageIn 0.42s ease both;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
  min-height: 88px;

  h1 {
    margin: 0;
    color: #07163f;
    font-size: clamp(34px, 2.4vw, 40px);
    font-weight: 900;
    letter-spacing: 0;
    line-height: 1.08;
  }

  p {
    margin: 9px 0 0;
    color: #415982;
    font-size: 15px;
    font-weight: 650;
    letter-spacing: 0;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
}

.status-pill,
.notice-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.46);
  color: #38517d;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 12px 28px rgba(31, 73, 125, 0.08);
  backdrop-filter: blur(22px);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    color: #2563eb;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.94),
      0 18px 38px rgba(31, 73, 125, 0.12);
  }
}

.status-pill {
  min-height: 38px;
  gap: 8px;
  border-radius: 11px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 750;
}

.notice-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 13px;

  span {
    position: absolute;
    top: -8px;
    right: -8px;
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    border: 2px solid rgba(255, 255, 255, 0.9);
    border-radius: 999px;
    background: #ef4444;
    color: #fff;
    font-size: 12px;
    font-weight: 900;
  }
}

.glass-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: var(--glass-radius);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.64), rgba(247, 251, 255, 0.38)),
    rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 14px 34px rgba(31, 73, 125, 0.09);
  backdrop-filter: blur(24px) saturate(132%);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 118px;
  align-items: center;
  padding: 18px 18px;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.94),
      0 20px 44px rgba(31, 73, 125, 0.12);
  }
}

.metric-copy {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;

  p {
    margin: 0 0 7px;
    color: #10204a;
    font-size: 14px;
    font-weight: 780;
    white-space: nowrap;
  }

  strong {
    display: flex;
    align-items: baseline;
    gap: 3px;
    color: #07163f;
    font-size: 32px;
    font-weight: 900;
    line-height: 1;
  }

  small {
    color: #415982;
    font-size: 15px;
    font-weight: 650;
  }

  em {
    display: block;
    margin-top: 10px;
    color: #0ca366;
    font-size: 14px;
    font-style: normal;
    font-weight: 760;
    line-height: 1.25;
  }
}

.icon-block {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    0 14px 26px rgba(37, 99, 235, 0.22);
}

.tone-blue {
  color: #2563eb;

  .icon-block {
    background: linear-gradient(135deg, #6ea8ff, #2563eb);
  }
}

.tone-green {
  color: #20ad75;

  .icon-block {
    background: linear-gradient(135deg, #73ddb0, #25b876);
  }
}

.tone-purple {
  color: #7c5cf6;

  .icon-block {
    background: linear-gradient(135deg, #ad8bff, #7c3aed);
  }
}

.tone-cyan {
  color: #38bdf8;

  .icon-block {
    background: linear-gradient(135deg, #6ee7f9, #38a8e8);
  }
}

.work-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.66fr) minmax(390px, 1fr);
  gap: var(--page-gap);
  /* 覆盖全局 items-start：两卡等高，底边始终对齐 */
  align-items: stretch;
}

/* 左卡为高度标尺：flex 纵向 + footer 钉底，被拉伸时按钮不脱离卡底 */
.diagnosis-card {
  display: flex;
  flex-direction: column;
}

.diagnosis-card,
.suggestions-card,
.action-card {
  padding: var(--panel-padding);
}

.card-heading {
  h2 {
    margin: 0;
    color: #07163f;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 0;
  }

  p {
    margin: 8px 0 0;
    color: #415982;
    font-size: 15px;
    font-weight: 650;
  }
}

.diagnosis-body {
  display: grid;
  grid-template-columns: 136px minmax(240px, 0.9fr) minmax(180px, 1fr);
  gap: 20px;
  align-items: center;
  min-height: 206px;
  padding: 18px 0 10px;
}

.score-column {
  display: grid;
  place-items: center;
  gap: 12px;
}

.score-label {
  justify-self: start;
  color: #10204a;
  font-size: 15px;
  font-weight: 760;
}

.score-ring {
  position: relative;
  width: 136px;
  height: 136px;

  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
    stroke-width: 11;
    stroke-linecap: round;
  }

  .ring-track {
    stroke: rgba(211, 225, 244, 0.74);
  }

  .ring-value {
    stroke: url('#scoreGradient');
    stroke-dasharray: 414;
    stroke-dashoffset: 91;
    animation: ringIn 0.85s ease both;
  }

  > div {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    text-align: center;
  }

  strong {
    color: #07163f;
    font-size: 42px;
    font-weight: 950;
    line-height: 0.95;
  }

  span {
    color: #10204a;
    font-size: 16px;
    font-weight: 600;
  }
}

.score-badge {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #73a8ff, #4f7cff);
  padding: 0 14px;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.22);
}

.dimension-panel {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  padding: 13px 14px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 14px 34px rgba(31, 73, 125, 0.08);
}

.dimension-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
}

.dimension-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 8px;
}

.dimension-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;

  strong {
    color: #10204a;
    font-size: 14px;
    font-weight: 800;
  }

  em {
    font-size: 14px;
    font-style: normal;
    font-weight: 850;
  }

  small {
    color: #415982;
    font-weight: 650;
  }
}

.dimension-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(207, 219, 235, 0.65);

  i {
    display: block;
    height: 100%;
    border-radius: inherit;
    animation: widthIn 0.7s ease both;
  }
}

.resume-illustration {
  position: relative;
  min-height: 190px;
}

.resume-illustration::before {
  content: '';
  position: absolute;
  inset: 24px 0 12px 0;
  border-radius: 34px;
  background:
    radial-gradient(circle at 72% 18%, rgba(75, 124, 255, 0.24), transparent 12%),
    linear-gradient(145deg, rgba(98, 158, 255, 0.14), rgba(207, 231, 255, 0.02));
  clip-path: polygon(24% 22%, 80% 4%, 100% 44%, 55% 100%, 8% 78%);
}

.iso-cube {
  position: absolute;
  inset: 12px 8px 8px;
  opacity: 0.88;
}

.sheet {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.74);
  background: linear-gradient(145deg, rgba(187, 216, 255, 0.4), rgba(255, 255, 255, 0.18));
  box-shadow:
    0 18px 38px rgba(37, 99, 235, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.sheet-a {
  right: 34px;
  top: 55px;
  width: 104px;
  height: 122px;
  border-radius: 20px;
  transform: skewY(28deg) rotate(-20deg);
}

.sheet-b {
  right: 74px;
  top: 38px;
  width: 96px;
  height: 116px;
  border-radius: 18px;
  transform: skewY(28deg) rotate(-20deg);
  opacity: 0.74;
}

.sheet-c {
  right: 15px;
  bottom: 6px;
  width: 156px;
  height: 54px;
  border-radius: 18px;
  transform: skewX(-28deg);
  opacity: 0.68;
}

.sheet-a::before,
.sheet-a::after {
  content: '';
  position: absolute;
  left: 24px;
  height: 8px;
  border-radius: 999px;
  background: rgba(76, 129, 224, 0.42);
}

.sheet-a::before {
  top: 32px;
  width: 56px;
}

.sheet-a::after {
  top: 52px;
  width: 74px;
}

.lens {
  position: absolute;
  right: 36px;
  bottom: 44px;
  width: 54px;
  height: 54px;
  border: 6px solid rgba(74, 129, 236, 0.58);
  border-radius: 999px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 12px 24px rgba(37, 99, 235, 0.16);
}

.lens::after {
  content: '';
  position: absolute;
  right: -18px;
  bottom: -12px;
  width: 30px;
  height: 8px;
  border-radius: 999px;
  background: rgba(74, 129, 236, 0.48);
  transform: rotate(45deg);
}

.spark {
  position: absolute;
  display: block;
  background: rgba(255, 255, 255, 0.9);
  clip-path: polygon(50% 0, 61% 38%, 100% 50%, 61% 62%, 50% 100%, 39% 62%, 0 50%, 39% 38%);
}

.spark-a {
  left: 40px;
  bottom: 42px;
  width: 30px;
  height: 30px;
}

.spark-b {
  right: 58px;
  top: 24px;
  width: 34px;
  height: 34px;
  background: rgba(87, 140, 255, 0.32);
  border-radius: 999px;
  clip-path: none;
}

.diagnosis-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: auto;
  padding-top: 6px;

  span {
    color: #415982;
    font-size: 14px;
    font-weight: 650;
  }
}

.primary-gradient-btn {
  min-width: 140px;
  min-height: 44px;
  border-radius: 13px;
  font-size: 16px;
}

.suggestions-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 342px;
}

.side-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 0;
    color: #07163f;
    font-size: 21px;
    font-weight: 900;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #2563eb;
    font-size: 14px;
    font-weight: 800;
  }
}

.suggestion-list {
  display: grid;
  flex: 1 1 0;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 11px;
  min-height: 0;
  margin-top: 14px;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-color: rgba(99, 102, 241, 0.32) rgba(226, 232, 240, 0.46);
  scrollbar-width: thin;
}

.dimension-panel--empty {
  place-items: center;
  min-height: 96px;

  p {
    margin: 0;
    max-width: 220px;
    color: #64748b;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.6;
    text-align: center;
  }
}

.suggestion-empty {
  display: grid;
  flex: 1;
  gap: 12px;
  margin-top: 14px;
  place-items: center;
  min-height: 200px;
  align-content: center;
  text-align: center;

  p {
    margin: 0;
    max-width: 240px;
    color: #64748b;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.6;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #2563eb;
    font-size: 14px;
    font-weight: 800;
  }
}

.suggestion-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 11px;
  min-height: 62px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.54);
  padding: 11px 12px;
  box-shadow: 0 10px 24px rgba(31, 73, 125, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;

  &:hover {
    transform: translateX(3px);
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 16px 34px rgba(31, 73, 125, 0.11);
  }
}

.suggestion-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
}

.suggestion-text {
  min-width: 0;

  strong,
  small {
    display: block;
  }

  strong {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
    color: #07163f;
    font-size: 15px;
    font-weight: 850;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  small {
    margin-top: 4px;
    overflow: hidden;
    color: #415982;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.suggestion-item em {
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.priority-blue {
  .suggestion-icon {
    background: linear-gradient(135deg, #72a9ff, #4078ff);
  }

  em {
    background: rgba(37, 99, 235, 0.1);
    color: #2563eb;
  }
}

.priority-green {
  .suggestion-icon {
    background: linear-gradient(135deg, #72ddb1, #27b87b);
  }

  em {
    background: rgba(34, 197, 94, 0.13);
    color: #16a36a;
  }
}

.priority-purple {
  .suggestion-icon {
    background: linear-gradient(135deg, #ad8bff, #7c5cf6);
  }

  em {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
  }
}

.priority-orange {
  .suggestion-icon {
    background: linear-gradient(135deg, #ffc66a, #f59e0b);
  }

  em {
    background: rgba(245, 158, 11, 0.14);
    color: #d97706;
  }
}

.action-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1.16fr;
  gap: var(--page-gap);
}

.action-card {
  min-height: 206px;
}

.action-copy {
  display: flex;
  align-items: flex-start;
  gap: 14px;

  h2 {
    margin: 0;
    color: #07163f;
    font-size: 21px;
    font-weight: 900;
  }

  p {
    margin: 7px 0 0;
    color: #415982;
    font-size: 14px;
    font-weight: 650;
  }
}

.action-main {
  margin-top: 14px;

  ul {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #213a64;
    font-size: 14px;
    font-weight: 700;
  }
}

.card-action-btn {
  display: inline-flex;
  min-width: 124px;
  min-height: 39px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 15px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.62);
  color: currentColor;
  font-size: 14px;
  font-weight: 850;
  box-shadow: 0 10px 22px rgba(31, 73, 125, 0.08);
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 16px 30px rgba(31, 73, 125, 0.12);
  }
}

@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes widthIn {
  from {
    width: 0;
  }
}

@keyframes ringIn {
  from {
    stroke-dashoffset: 414;
  }
}

@media (max-width: 1360px) {
  .dashboard-page {
    padding-inline: var(--page-padding-x);
  }

  .metric-card {
    grid-template-columns: 1fr;
  }

  .diagnosis-body {
    grid-template-columns: 132px minmax(230px, 1fr);
  }

  .resume-illustration {
    display: none;
  }
}

@media (max-width: 1120px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .work-grid,
  .action-grid {
    grid-template-columns: 1fr;
  }

  /* 单列堆叠：取消等高约束，各卡按内容自适应 */
  .suggestions-card {
    min-height: auto;
  }

  .suggestion-list {
    flex: none;
    overflow: visible;
    padding-right: 0;
  }

  .suggestion-empty {
    flex: none;
  }
}

@media (max-width: 760px) {
  .dashboard-page {
    padding: 18px 14px 28px;
  }

  .dashboard-header {
    min-height: auto;
    flex-direction: column;

    h1 {
      font-size: 36px;
    }
  }

  .header-actions {
    width: 100%;
    padding-top: 0;
  }

  .status-pill {
    flex: 1;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .diagnosis-body {
    grid-template-columns: 1fr;
  }

  .score-label {
    justify-self: center;
  }

  .diagnosis-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .suggestion-item {
    grid-template-columns: 44px minmax(0, 1fr) 18px;

    em {
      display: none;
    }
  }
}
</style>
