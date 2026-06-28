<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    loading?: boolean
    disabled?: boolean
    variant?: 'primary' | 'secondary' | 'danger'
    type?: 'button' | 'submit' | 'reset'
    loadingText?: string
  }>(),
  {
    loading: false,
    disabled: false,
    variant: 'primary',
    type: 'button',
    loadingText: '',
  },
)
</script>

<template>
  <button
    :type="type"
    class="loading-button"
    :class="[`loading-button--${variant}`, { 'is-loading': loading }]"
    :disabled="disabled || loading"
  >
    <LoaderCircle v-if="loading" class="loading-button__spinner" :size="17" />
    <slot v-else name="icon" />
    <span><slot>{{ loading && loadingText ? loadingText : '' }}</slot></span>
  </button>
</template>

<style scoped lang="scss">
.loading-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  padding: 0 16px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 850;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, background 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
    transform: none;
  }
}

.loading-button--primary {
  color: #fff;
  background: linear-gradient(135deg, #6ea8ff 0%, #2563eb 100%);
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.24);

  &:hover:not(:disabled) {
    filter: brightness(1.04);
    box-shadow: 0 18px 34px rgba(37, 99, 235, 0.3);
  }
}

.loading-button--secondary {
  border-color: rgba(255, 255, 255, 0.78);
  color: #2563eb;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 8px 20px rgba(31, 73, 125, 0.06);
}

.loading-button--danger {
  border-color: rgba(254, 202, 202, 0.85);
  color: #ef4444;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.08);
}

.loading-button.is-loading {
  position: relative;
  overflow: hidden;
}

.loading-button.is-loading::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent, rgba(255, 255, 255, 0.22), transparent);
  animation: loading-button-sheen 1.4s ease-in-out infinite;
}

.loading-button__spinner {
  animation: loading-button-spin 0.9s linear infinite;
}

@keyframes loading-button-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes loading-button-sheen {
  from {
    transform: translateX(-120%);
  }

  to {
    transform: translateX(120%);
  }
}
</style>
