<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
  }>(),
  {
    rows: 3,
  },
)
</script>

<template>
  <article class="skeleton-card">
    <div class="skeleton-card__top">
      <span class="skeleton-dot" />
      <span class="skeleton-pill" />
    </div>
    <span class="skeleton-line skeleton-line--wide" />
    <span
      v-for="index in rows"
      :key="index"
      class="skeleton-line"
      :style="{ width: `${88 - index * 12}%` }"
    />
    <div class="skeleton-card__actions">
      <span />
      <span />
    </div>
  </article>
</template>

<style scoped lang="scss">
.skeleton-card {
  display: grid;
  min-height: 250px;
  align-content: start;
  gap: 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.52);
  padding: 20px;
  box-shadow: 0 20px 48px rgba(31, 73, 125, 0.08);
  backdrop-filter: blur(18px);
}

.skeleton-card__top,
.skeleton-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.skeleton-dot,
.skeleton-pill,
.skeleton-line,
.skeleton-card__actions span {
  display: block;
  border-radius: 999px;
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0.42),
    rgba(191, 219, 254, 0.55),
    rgba(255, 255, 255, 0.42)
  );
  background-size: 220% 100%;
  animation: skeleton-shimmer 1.35s ease-in-out infinite;
}

.skeleton-dot {
  width: 42px;
  height: 42px;
  border-radius: 14px;
}

.skeleton-pill {
  width: 74px;
  height: 28px;
}

.skeleton-line {
  height: 12px;
}

.skeleton-line--wide {
  width: 72%;
  height: 18px;
  margin-top: 16px;
}

.skeleton-card__actions {
  margin-top: auto;

  span {
    width: 46%;
    height: 40px;
    border-radius: 14px;
  }
}

@keyframes skeleton-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -120% 0;
  }
}
</style>
