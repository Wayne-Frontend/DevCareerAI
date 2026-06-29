<script setup lang="ts">
import { CheckCircle2, Info, Loader2, TriangleAlert, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Component } from 'vue'
import type { MessageBoxRequest, MessageBoxType } from '../../utils/messageBox'

type MessageBoxState = MessageBoxRequest & {
  previousFocus: Element | null
}

const queue = ref<MessageBoxState[]>([])
const activeBox = shallowRef<MessageBoxState | null>(null)
const confirming = ref(false)
const confirmButtonRef = ref<HTMLButtonElement | null>(null)
const cancelButtonRef = ref<HTMLButtonElement | null>(null)

const currentOptions = computed(() => activeBox.value?.options)
const currentType = computed<MessageBoxType>(() => currentOptions.value?.type || 'info')
const showCancel = computed(() => currentOptions.value?.showCancel ?? true)

const typeMeta: Record<MessageBoxType, { label: string; icon: Component }> = {
  success: { label: '操作成功', icon: CheckCircle2 },
  warning: { label: '需要确认', icon: TriangleAlert },
  danger: { label: '危险操作', icon: TriangleAlert },
  info: { label: '提示', icon: Info },
}

function onMessageBox(event: Event) {
  const detail = (event as CustomEvent<MessageBoxRequest>).detail
  if (!detail?.options?.title) return

  queue.value.push({
    ...detail,
    previousFocus: document.activeElement,
  })
  showNextBox()
}

function showNextBox() {
  if (activeBox.value || queue.value.length === 0) return

  activeBox.value = queue.value.shift() || null
}

function restoreFocus(target: Element | null) {
  if (target instanceof HTMLElement) {
    target.focus()
  }
}

function closeBox(confirmed: boolean, force = false) {
  if (!activeBox.value || (confirming.value && !force)) return

  const box = activeBox.value
  activeBox.value = null
  box.resolve(confirmed)
  restoreFocus(box.previousFocus)
  void nextTick(showNextBox)
}

async function confirmBox() {
  if (!activeBox.value || confirming.value) return

  const beforeConfirm = activeBox.value.options.beforeConfirm
  if (!beforeConfirm) {
    closeBox(true, true)
    return
  }

  confirming.value = true
  try {
    await beforeConfirm()
    closeBox(true)
  } finally {
    confirming.value = false
  }
}

function cancelBox() {
  closeBox(false)
}

function onOverlayClick() {
  if (currentOptions.value?.closeOnOverlay === false) return
  cancelBox()
}

function onKeydown(event: KeyboardEvent) {
  if (!activeBox.value) return

  if (event.key === 'Escape' && currentOptions.value?.closeOnEsc !== false) {
    event.preventDefault()
    cancelBox()
  }
}

watch(activeBox, async (box) => {
  if (!box) return

  await nextTick()
  if (showCancel.value) {
    cancelButtonRef.value?.focus()
    return
  }
  confirmButtonRef.value?.focus()
})

onMounted(() => {
  window.addEventListener('app-message-box', onMessageBox)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('app-message-box', onMessageBox)
  window.removeEventListener('keydown', onKeydown)
  activeBox.value?.resolve(false)
  queue.value.forEach((box) => box.resolve(false))
  queue.value = []
})
</script>

<template>
  <Teleport to="body">
    <Transition name="message-box">
      <div v-if="activeBox && currentOptions" class="message-box-layer" @click="onOverlayClick">
        <section
          class="message-box"
          :class="`message-box--${currentType}`"
          role="dialog"
          aria-modal="true"
          :aria-label="currentOptions.title"
          @click.stop
        >
          <button
            class="message-box__close"
            type="button"
            aria-label="关闭弹窗"
            :disabled="confirming"
            @click="cancelBox"
          >
            <X :size="17" />
          </button>

          <div class="message-box__head">
            <span class="message-box__icon">
              <component :is="typeMeta[currentType].icon" :size="24" stroke-width="2.35" />
            </span>
            <div class="min-w-0">
              <span class="message-box__eyebrow">{{ typeMeta[currentType].label }}</span>
              <h2>{{ currentOptions.title }}</h2>
            </div>
          </div>

          <p v-if="currentOptions.message" class="message-box__message">{{ currentOptions.message }}</p>

          <div class="message-box__actions">
            <button
              v-if="showCancel"
              ref="cancelButtonRef"
              class="message-box__button message-box__button--secondary"
              type="button"
              :disabled="confirming"
              @click="cancelBox"
            >
              {{ currentOptions.cancelText || '取消' }}
            </button>
            <button
              ref="confirmButtonRef"
              class="message-box__button message-box__button--primary"
              type="button"
              :disabled="confirming"
              @click="confirmBox"
            >
              <Loader2 v-if="confirming" class="message-box__spinner" :size="16" />
              {{ confirming ? '处理中...' : currentOptions.confirmText || '确认' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.message-box-layer {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.18);
  padding: 20px;
  backdrop-filter: blur(14px);
}

.message-box {
  position: relative;
  width: min(440px, 100%);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(246, 250, 255, 0.76)),
    rgba(255, 255, 255, 0.78);
  padding: 22px;
  color: #0f172a;
  box-shadow: 0 30px 72px rgba(31, 73, 125, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(24px) saturate(140%);
}

.message-box::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: #2563eb;
}

.message-box__close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #64748b;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.message-box__close:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.94);
  color: #1e293b;
}

.message-box__head {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  padding-right: 34px;
}

.message-box__icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 16px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.message-box__eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.message-box h2 {
  margin: 0;
  color: #07163f;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.message-box__message {
  margin: 16px 0 0;
  color: #475569;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.8;
  white-space: pre-wrap;
}

.message-box__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}

.message-box__button {
  display: inline-flex;
  min-height: 40px;
  min-width: 96px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 13px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 850;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.message-box__button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.message-box__button:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.message-box__button--secondary {
  border: 1px solid rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.66);
  color: #475569;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88), 0 10px 22px rgba(31, 73, 125, 0.07);
}

.message-box__button--primary {
  background: linear-gradient(135deg, #6ea8ff 0%, #2563eb 100%);
  color: #fff;
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.24);
}

.message-box__spinner {
  animation: message-box-spin 0.85s linear infinite;
}

.message-box--success::before {
  background: #16a34a;
}

.message-box--success .message-box__icon {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

.message-box--warning::before {
  background: #f59e0b;
}

.message-box--warning .message-box__icon {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.message-box--danger::before {
  background: #ef4444;
}

.message-box--danger .message-box__icon {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.message-box--danger .message-box__button--primary {
  background: linear-gradient(135deg, #fb7185 0%, #ef4444 100%);
  box-shadow: 0 16px 30px rgba(239, 68, 68, 0.22);
}

.message-box-enter-active,
.message-box-leave-active {
  transition: opacity 0.2s ease;
}

.message-box-enter-active .message-box,
.message-box-leave-active .message-box {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.message-box-enter-from,
.message-box-leave-to {
  opacity: 0;
}

.message-box-enter-from .message-box,
.message-box-leave-to .message-box {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@keyframes message-box-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .message-box-layer {
    align-items: end;
    padding: 14px;
  }

  .message-box {
    padding: 20px;
  }

  .message-box__actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
