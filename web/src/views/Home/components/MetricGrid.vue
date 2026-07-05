<script setup lang="ts">
import type { DashboardMetric } from '../types'

defineProps<{ metrics: DashboardMetric[] }>()
</script>

<template>
  <section class="metric-grid" aria-label="关键指标">
    <article
      v-for="metric in metrics"
      :key="metric.label"
      class="glass-card metric-card"
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
          <span class="metric-change">{{ metric.change }}</span>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped lang="scss">
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
    overflow: hidden;
    color: #10204a;
    font-size: 14px;
    font-weight: 780;
    text-overflow: ellipsis;
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
}

.metric-change {
  display: block;
  margin-top: 10px;
  color: #0ca366;
  font-size: 14px;
  font-weight: 760;
  line-height: 1.25;
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

@media (max-width: 1360px) {
  .metric-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1120px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
