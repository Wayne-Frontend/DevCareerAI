<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="layout-main">
      <AppHeader />
      <main class="content-shell">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  display: flex;
  min-height: 100vh;
  gap: 24px;
  padding: 24px;
}

.layout-main {
  min-width: 0;
  flex: 1;
}

.content-shell {
  width: min(100%, 1440px);
  margin: 0 auto;
  padding-bottom: 32px;
}
</style>
