<script setup lang="ts">
import {
  ArrowRight,
  BarChart3,
  Bell,
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

const metrics = [
  {
    label: '简历综合得分',
    value: '78',
    unit: '/100',
    change: '较上次 +8',
    icon: FileSearch,
    tone: 'blue',
    chart: 'line',
    line: 'M2 34 C12 34 13 28 22 30 C33 33 33 22 43 25 C55 28 54 14 65 18 C75 21 76 7 86 12 C94 17 97 2 106 8 C113 13 115 6 122 5',
  },
  {
    label: '岗位匹配度',
    value: '72',
    unit: '%',
    change: '较上次 +6%',
    icon: Target,
    tone: 'green',
    chart: 'line',
    line: 'M2 36 C11 37 12 29 20 31 C30 34 28 23 39 26 C50 29 49 17 60 20 C70 23 68 8 80 12 C92 16 89 2 101 8 C112 14 111 24 122 14',
  },
  {
    label: '模拟面试得分',
    value: '82',
    unit: '/100',
    change: '较上次 +5',
    icon: Mic,
    tone: 'purple',
    chart: 'line',
    line: 'M2 36 C11 35 12 26 22 28 C33 30 31 13 43 17 C54 22 55 31 66 24 C76 18 77 7 88 13 C98 19 98 31 108 22 C117 14 115 7 122 4',
  },
  {
    label: '投递进展',
    value: '23',
    unit: '',
    change: '本周投递 7 个岗位',
    icon: Send,
    tone: 'cyan',
    chart: 'bar',
    bars: [28, 42, 56, 74, 94, 46],
  },
]

const scoreDimensions = [
  { label: '技能匹配度', score: 82, color: '#3b82f6', icon: CircleGauge },
  { label: '项目相关性', score: 75, color: '#8b5cf6', icon: FileSearch },
  { label: '经验深度', score: 70, color: '#f59e0b', icon: BarChart3 },
  { label: '表达与呈现', score: 85, color: '#16a36a', icon: Star },
]

const suggestions = [
  {
    title: '优化技术栈匹配',
    description: '在简历开头突出与目标岗位匹配的核心技术栈',
    tag: '优先级高',
    tone: 'blue',
    icon: FileSearch,
  },
  {
    title: '补充项目量化成果',
    description: '为 2 个项目补充量化指标，提升说服力',
    tag: '优先级中',
    tone: 'green',
    icon: PackageCheck,
  },
  {
    title: '完善个人亮点',
    description: '提炼 3 个个人核心优势，增强简历记忆点',
    tag: '优先级中',
    tone: 'purple',
    icon: Star,
  },
  {
    title: '扩展岗位匹配',
    description: '发现 8 个高匹配度岗位，建议优先投递',
    tag: '优先级低',
    tone: 'orange',
    icon: BriefcaseBusiness,
  },
]

const actionCards = [
  {
    title: '项目优化',
    description: 'AI 助力项目包装，突出技术亮点',
    points: ['智能提炼项目亮点', '生成 STAR 结构描述'],
    cta: '立即优化',
    path: '/project-optimize',
    tone: 'green',
    icon: Boxes,
    visual: 'code',
  },
  {
    title: 'JD 匹配',
    description: '精准匹配目标岗位，提升投递成功率',
    points: ['多维度匹配分析', '竞争力对比与建议'],
    cta: '开始匹配',
    path: '/job-match',
    tone: 'blue',
    icon: Target,
    visual: 'match',
  },
  {
    title: '模拟面试',
    description: '真实场景模拟，提升面试表现',
    points: ['技术面试模拟', 'AI 智能评估反馈'],
    cta: '开始练习',
    path: '/interview',
    tone: 'purple',
    icon: Mic,
    visual: 'interview',
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
        <button class="status-pill" type="button">
          <RefreshCw :size="15" />
          数据更新于 1 小时前
        </button>
        <button class="notice-btn" type="button" aria-label="通知">
          <Bell :size="19" />
          <span>3</span>
        </button>
      </div>
    </header>

    <section class="metric-grid" aria-label="关键指标">
      <article v-for="metric in metrics" :key="metric.label" class="glass-panel metric-card" :class="`tone-${metric.tone}`">
        <div class="metric-copy">
          <span class="icon-block">
            <component :is="metric.icon" :size="28" stroke-width="1.95" />
          </span>
          <div>
            <p>{{ metric.label }}</p>
            <strong>{{ metric.value }}<small>{{ metric.unit }}</small></strong>
            <em>{{ metric.change }}</em>
          </div>
        </div>

        <svg v-if="metric.chart === 'line'" class="trend-line" viewBox="0 0 124 44" aria-hidden="true">
          <path :d="metric.line" />
        </svg>
        <div v-else class="trend-bars" aria-hidden="true">
          <i v-for="(bar, index) in metric.bars" :key="index" :style="{ height: `${bar}%` }" />
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
                  <linearGradient id="scoreGradient" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#74a8ff" />
                    <stop offset="58%" stop-color="#2563eb" />
                    <stop offset="100%" stop-color="#4f7cff" />
                  </linearGradient>
                </defs>
                <circle cx="80" cy="80" r="66" class="ring-track" />
                <circle cx="80" cy="80" r="66" class="ring-value" />
              </svg>
              <div>
                <strong>78</strong>
                <span>/100</span>
              </div>
            </div>
            <span class="score-badge">良好</span>
          </div>

          <div class="dimension-panel">
            <div v-for="item in scoreDimensions" :key="item.label" class="dimension-row">
              <span class="dimension-icon" :style="{ color: item.color, background: `${item.color}18` }">
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
          <span>上次诊断：2024-05-20 10:30</span>
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

        <div class="suggestion-list">
          <RouterLink
            v-for="suggestion in suggestions"
            :key="suggestion.title"
            class="suggestion-item"
            :class="`priority-${suggestion.tone}`"
            to="/resume-analyze"
          >
            <span class="suggestion-icon">
              <component :is="suggestion.icon" :size="21" />
            </span>
            <span class="suggestion-text">
              <strong>{{ suggestion.title }}</strong>
              <small>{{ suggestion.description }}</small>
            </span>
            <em>{{ suggestion.tag }}</em>
            <ChevronRight :size="19" />
          </RouterLink>
        </div>
      </aside>
    </section>

    <section class="action-grid" aria-label="快捷入口">
      <article v-for="card in actionCards" :key="card.title" class="glass-panel action-card" :class="`tone-${card.tone}`">
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

          <div class="mini-visual" :class="`visual-${card.visual}`" aria-hidden="true">
            <template v-if="card.visual === 'code'">
              <span class="window-bar" />
              <span class="code-mark">&lt;/&gt;</span>
              <span class="chart-chip"><i /><i /><i /></span>
            </template>
            <template v-else-if="card.visual === 'match'">
              <span class="small-ring"><strong>72<small>%</small></strong><em>匹配度</em></span>
            </template>
            <template v-else>
              <span class="voice-panel"><Mic :size="22" /><i /><i /></span>
              <span class="chat-panel"><i /><i /><i /></span>
              <span class="wave"><i /><i /><i /><i /></span>
            </template>
          </div>
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
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88), 0 12px 28px rgba(31, 73, 125, 0.08);
  backdrop-filter: blur(22px);
  transition: transform 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    color: #2563eb;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94), 0 18px 38px rgba(31, 73, 125, 0.12);
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
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 14px 34px rgba(31, 73, 125, 0.09);
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
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94), 0 20px 44px rgba(31, 73, 125, 0.12);
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
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.34), 0 14px 26px rgba(37, 99, 235, 0.22);
}

.trend-line {
  position: absolute;
  right: 18px;
  bottom: 18px;
  width: 92px;
  height: 38px;

  path {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 6px 8px color-mix(in srgb, currentColor 22%, transparent));
    stroke-dasharray: 180;
    animation: drawLine 0.85s ease both;
  }
}

.trend-bars {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: flex;
  align-items: end;
  justify-content: end;
  gap: 8px;
  height: 48px;

  i {
    width: 8px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.3;
    animation: barIn 0.6s ease both;
  }
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

  .metric-copy em {
    max-width: 78px;
  }
}

.work-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.66fr) minmax(390px, 1fr);
  gap: var(--page-gap);
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
    stroke: url("#scoreGradient");
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
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86), 0 14px 34px rgba(31, 73, 125, 0.08);
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
  box-shadow: 0 18px 38px rgba(37, 99, 235, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8);
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
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 12px 24px rgba(37, 99, 235, 0.16);
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
  gap: 11px;
  margin-top: 14px;
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
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

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
    color: #07163f;
    font-size: 15px;
    font-weight: 850;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  gap: 14px;
  align-items: center;
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

.mini-visual {
  position: relative;
  min-height: 92px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86), 0 12px 26px rgba(31, 73, 125, 0.06);
}

.visual-code {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(255, 255, 255, 0.38));

  .window-bar {
    position: absolute;
    top: 19px;
    left: 22px;
    width: 96px;
    height: 36px;
    border-radius: 8px 8px 3px 3px;
    background: linear-gradient(135deg, #5ad79b, #20ad75);
    box-shadow: 0 12px 22px rgba(32, 173, 117, 0.18);
  }

  .window-bar::before {
    content: '';
    position: absolute;
    top: 9px;
    left: 10px;
    width: 4px;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 10px 0 0 rgba(255, 255, 255, 0.58), 20px 0 0 rgba(255, 255, 255, 0.46);
  }

  .code-mark {
    position: absolute;
    left: 42px;
    bottom: 18px;
    color: #20ad75;
    font-size: 26px;
    font-weight: 900;
  }

  .chart-chip {
    position: absolute;
    right: 14px;
    bottom: 12px;
    display: flex;
    width: 48px;
    height: 58px;
    align-items: end;
    gap: 5px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.68);
    padding: 10px;
  }

  .chart-chip i {
    flex: 1;
    border-radius: 999px;
    background: rgba(32, 173, 117, 0.44);
  }

  .chart-chip i:nth-child(1) {
    height: 22px;
  }

  .chart-chip i:nth-child(2) {
    height: 34px;
  }

  .chart-chip i:nth-child(3) {
    height: 46px;
  }
}

.visual-match {
  display: grid;
  place-items: center;

  .small-ring {
    position: relative;
    display: grid;
    width: 88px;
    height: 88px;
    place-content: center;
    border-radius: 999px;
    background: conic-gradient(#4f7cff 0 72%, rgba(203, 219, 244, 0.7) 72% 100%);
    text-align: center;
  }

  .small-ring::before {
    content: '';
    position: absolute;
    inset: 10px;
    border-radius: inherit;
    background: rgba(255, 255, 255, 0.88);
  }

  strong,
  em {
    position: relative;
    z-index: 1;
  }

  strong {
    color: #2563eb;
    font-size: 27px;
    font-weight: 950;
    line-height: 1;
  }

  small {
    font-size: 15px;
  }

  em {
    margin-top: 4px;
    color: #213a64;
    font-size: 12px;
    font-style: normal;
    font-weight: 800;
  }
}

.visual-interview {
  .voice-panel,
  .chat-panel {
    position: absolute;
    display: flex;
    align-items: center;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.58);
    box-shadow: 0 8px 18px rgba(124, 58, 237, 0.08);
  }

  .voice-panel {
    top: 14px;
    left: 16px;
    width: 104px;
    height: 38px;
    gap: 10px;
    padding: 8px;
    color: #7c3aed;
  }

  .voice-panel i {
    display: block;
    height: 6px;
    flex: 1;
    border-radius: 999px;
    background: rgba(124, 92, 246, 0.32);
  }

  .chat-panel {
    right: 13px;
    bottom: 14px;
    width: 96px;
    height: 56px;
    flex-direction: column;
    align-items: stretch;
    gap: 7px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.8), rgba(124, 92, 246, 0.72));
  }

  .chat-panel i {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.58);
  }

  .wave {
    position: absolute;
    left: 20px;
    bottom: 18px;
    display: flex;
    align-items: end;
    gap: 5px;
  }

  .wave i {
    width: 6px;
    border-radius: 999px;
    background: rgba(124, 92, 246, 0.32);
  }

  .wave i:nth-child(1) {
    height: 24px;
  }

  .wave i:nth-child(2) {
    height: 42px;
  }

  .wave i:nth-child(3) {
    height: 30px;
  }

  .wave i:nth-child(4) {
    height: 50px;
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
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;

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

@keyframes drawLine {
  from {
    stroke-dashoffset: 180;
  }
  to {
    stroke-dashoffset: 0;
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

@keyframes barIn {
  from {
    transform: scaleY(0.35);
    transform-origin: bottom;
  }
}

@media (max-width: 1360px) {
  .dashboard-page {
    padding-inline: var(--page-padding-x);
  }

  .metric-card {
    grid-template-columns: 1fr;
  }

  .trend-line,
  .trend-bars {
    justify-self: end;
    margin-top: -20px;
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

  .action-main {
    grid-template-columns: 1fr;
  }
}
</style>
