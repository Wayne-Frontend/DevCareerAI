<script setup lang="ts">
import { ArrowRight, Boxes, CheckCircle2, Mic, Target } from 'lucide-vue-next'

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
  <section class="action-grid" aria-label="快捷入口">
    <article
      v-for="card in actionCards"
      :key="card.title"
      class="glass-card action-card"
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
</template>

<style scoped lang="scss">
.action-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1.16fr;
  gap: var(--page-gap);
}

.action-card {
  min-height: 206px;
  padding: var(--panel-padding);
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

@media (max-width: 1120px) {
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
