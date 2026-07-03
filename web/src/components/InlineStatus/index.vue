<script setup lang="ts">
import { CheckCircle2, Info, LoaderCircle, TriangleAlert } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    type?: 'loading' | 'success' | 'warning' | 'error' | 'info'
    title?: string
    description?: string
  }>(),
  {
    type: 'info',
    title: '',
    description: '',
  },
)

function iconForType() {
  if (props.type === 'loading') return LoaderCircle
  if (props.type === 'success') return CheckCircle2
  if (props.type === 'warning' || props.type === 'error') return TriangleAlert
  return Info
}
</script>

<template>
  <div class="inline-status" :class="`inline-status--${type}`">
    <component
      :is="iconForType()"
      class="inline-status__icon"
      :class="{ 'is-spinning': type === 'loading' }"
      :size="18"
    />
    <div>
      <strong v-if="title">{{ title }}</strong>
      <p v-if="description">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.inline-status {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid rgba(191, 219, 254, 0.78);
  border-radius: 16px;
  background: rgba(239, 246, 255, 0.62);
  padding: 12px 14px;
  color: #41608b;
  font-size: 13px;
  font-weight: 720;
  line-height: 1.7;

  strong {
    display: block;
    margin-bottom: 1px;
    color: #18345f;
    font-size: 13px;
    font-weight: 900;
  }

  p {
    margin: 0;
  }
}

.inline-status__icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #2563eb;
}

.inline-status--success {
  border-color: rgba(187, 247, 208, 0.82);
  background: rgba(240, 253, 244, 0.72);
  color: #166534;

  .inline-status__icon {
    color: #16a36a;
  }
}

.inline-status--warning {
  border-color: rgba(253, 230, 138, 0.9);
  background: rgba(255, 251, 235, 0.76);
  color: #92400e;

  .inline-status__icon {
    color: #f59e0b;
  }
}

.inline-status--error {
  border-color: rgba(254, 202, 202, 0.9);
  background: rgba(254, 242, 242, 0.76);
  color: #991b1b;

  .inline-status__icon {
    color: #ef4444;
  }
}

.is-spinning {
  animation: status-spin 0.9s linear infinite;
}

@keyframes status-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
