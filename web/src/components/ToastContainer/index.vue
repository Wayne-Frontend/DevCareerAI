<script setup lang="ts">
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'

type ToastType = 'success' | 'warning' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const toasts = ref<ToastItem[]>([])
const timers = new Map<number, number>()
let nextId = 1

function iconForType(type: ToastType) {
  if (type === 'success') return CheckCircle2
  if (type === 'warning' || type === 'error') return TriangleAlert
  return Info
}

function titleForType(type: ToastType) {
  if (type === 'success') return '操作成功'
  if (type === 'warning') return '需要确认'
  if (type === 'error') return '操作失败'
  return '提示'
}

function removeToast(id: number) {
  const timer = timers.get(id)
  if (timer) window.clearTimeout(timer)
  timers.delete(id)
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function addToast(message: string, type: ToastType = 'info') {
  // 相同内容的卡片还在展示时不重复叠加（如并行请求同时失败弹出同一条网络错误）。
  if (toasts.value.some((toast) => toast.message === message && toast.type === type)) return

  const id = nextId++
  toasts.value = [...toasts.value, { id, message, type }].slice(-4)
  timers.set(
    id,
    window.setTimeout(() => removeToast(id), type === 'error' ? 5600 : 4200),
  )
}

function onNotify(event: Event) {
  const detail = (event as CustomEvent<{ message?: string; type?: ToastType }>).detail
  if (!detail?.message) return
  addToast(detail.message, detail.type || 'info')
}

onMounted(() => {
  window.addEventListener('app-notify', onNotify)
})

onBeforeUnmount(() => {
  window.removeEventListener('app-notify', onNotify)
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
})
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      name="toast"
      tag="div"
      class="toast-stack"
      aria-live="polite"
      aria-label="操作通知"
    >
      <article
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-card"
        :class="`toast-card--${toast.type}`"
      >
        <span class="toast-card__icon">
          <component :is="iconForType(toast.type)" :size="18" stroke-width="2.2" />
        </span>
        <span class="toast-card__copy">
          <strong>{{ titleForType(toast.type) }}</strong>
          <span>{{ toast.message }}</span>
        </span>
        <button
          class="toast-card__close"
          type="button"
          aria-label="关闭通知"
          @click="removeToast(toast.id)"
        >
          <X :size="16" />
        </button>
      </article>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped lang="scss">
.toast-stack {
  position: fixed;
  top: 22px;
  right: 22px;
  z-index: 120;
  display: grid;
  width: min(390px, calc(100vw - 28px));
  gap: 12px;
  pointer-events: none;
}

.toast-card {
  /* ::before 色条按本卡片定位；缺失时会相对 fixed 的堆栈容器定位，多条 toast 时互相错位 */
  position: relative;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 30px;
  align-items: start;
  gap: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(246, 250, 255, 0.68)),
    rgba(255, 255, 255, 0.72);
  padding: 13px 12px;
  color: #1d2d50;
  box-shadow:
    0 18px 42px rgba(31, 73, 125, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(22px) saturate(135%);
  pointer-events: auto;
}

.toast-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: #2563eb;
}

.toast-card__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.toast-card__copy {
  min-width: 0;

  strong,
  span {
    display: block;
  }

  strong {
    color: #0f172a;
    font-size: 13px;
    font-weight: 900;
  }

  span {
    margin-top: 3px;
    color: #526177;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.55;
  }
}

.toast-card__close {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #64748b;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background 0.18s ease;
}

.toast-card__close:hover {
  background: rgba(255, 255, 255, 0.92);
  color: #1e293b;
}

.toast-card--success::before {
  background: #16a34a;
}
.toast-card--warning::before {
  background: #f59e0b;
}
.toast-card--error::before {
  background: #ef4444;
}
.toast-card--info::before {
  background: #2563eb;
}

.toast-card--success .toast-card__icon {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}
.toast-card--warning .toast-card__icon {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}
.toast-card--error .toast-card__icon {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(18px) translateY(-4px);
}

.toast-move {
  transition: transform 0.22s ease;
}

@media (max-width: 640px) {
  .toast-stack {
    top: 12px;
    right: 14px;
    left: 14px;
    width: auto;
  }
}
</style>
