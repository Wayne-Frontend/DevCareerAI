<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import type { ScoreDimension } from '../types'

defineProps<{
  scoreText: string
  scoreBadge: string
  ringOffset: number
  dimensions: ScoreDimension[]
  lastAnalyzedLabel: string
  loading: boolean
}>()
</script>

<template>
  <article class="glass-card diagnosis-card">
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
            <strong>{{ scoreText }}</strong>
            <span>/100</span>
          </div>
        </div>
        <span class="score-badge">{{ scoreBadge }}</span>
      </div>

      <div v-if="dimensions.length" class="dimension-panel">
        <div v-for="item in dimensions" :key="item.label" class="dimension-row">
          <span
            class="dimension-icon"
            :style="{ color: item.color, background: `${item.color}18` }"
          >
            <component :is="item.icon" :size="17" />
          </span>
          <div>
            <div class="dimension-meta">
              <strong>{{ item.label }}</strong>
              <span class="dimension-score" :style="{ color: item.color }"
                >{{ item.score }}<small>/100</small></span
              >
            </div>
            <div class="dimension-track">
              <span
                class="dimension-fill"
                :style="{ width: `${item.score}%`, background: item.color }"
              />
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
</template>

<style scoped lang="scss">
/* 左卡为高度标尺：flex 纵向 + footer 钉底，被拉伸时按钮不脱离卡底 */
.diagnosis-card {
  display: flex;
  flex-direction: column;
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

  .dimension-score {
    font-size: 14px;
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

  .dimension-fill {
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
  font-size: 16px;
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
  .diagnosis-body {
    grid-template-columns: 132px minmax(230px, 1fr);
  }

  .resume-illustration {
    display: none;
  }
}

@media (max-width: 760px) {
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
}
</style>
