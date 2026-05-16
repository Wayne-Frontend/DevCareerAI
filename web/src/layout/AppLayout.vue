<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="app-bg flex min-h-screen gap-3 p-3">
    <AppSidebar />
    <div class="min-w-0 flex-1">
      <AppHeader />
      <main class="mx-auto w-full max-w-[calc(100vw-280px)] pb-3">
        <RouterView />
      </main>
    </div>
  </div>
</template>
