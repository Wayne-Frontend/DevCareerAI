<script setup lang="ts">
import { ArrowRight, ChevronRight } from 'lucide-vue-next'
import type { DashboardSuggestion } from '../types'

defineProps<{
  suggestions: DashboardSuggestion[]
  loading: boolean
}>()
</script>

<template>
  <aside class="glass-card suggestions-card">
    <div class="side-heading">
      <h2>下一步建议</h2>
      <RouterLink to="/history">
        查看全部
        <ArrowRight :size="16" />
      </RouterLink>
    </div>

    <div v-if="suggestions.length" class="suggestion-list">
      <RouterLink
        v-for="suggestion in suggestions"
        :key="suggestion.text"
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
        <span class="suggestion-cta">去优化</span>
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
</template>

<style scoped lang="scss">
.suggestions-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 342px;
  padding: var(--panel-padding);
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
}

.suggestion-cta {
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
}

.priority-blue {
  .suggestion-icon {
    background: linear-gradient(135deg, #72a9ff, #4078ff);
  }

  .suggestion-cta {
    background: rgba(37, 99, 235, 0.1);
    color: #2563eb;
  }
}

.priority-green {
  .suggestion-icon {
    background: linear-gradient(135deg, #72ddb1, #27b87b);
  }

  .suggestion-cta {
    background: rgba(34, 197, 94, 0.13);
    color: #16a36a;
  }
}

.priority-purple {
  .suggestion-icon {
    background: linear-gradient(135deg, #ad8bff, #7c5cf6);
  }

  .suggestion-cta {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
  }
}

.priority-orange {
  .suggestion-icon {
    background: linear-gradient(135deg, #ffc66a, #f59e0b);
  }

  .suggestion-cta {
    background: rgba(245, 158, 11, 0.14);
    color: #d97706;
  }
}

@media (max-width: 1120px) {
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
  .suggestion-item {
    grid-template-columns: 44px minmax(0, 1fr) 18px;

    .suggestion-cta {
      display: none;
    }
  }
}
</style>
