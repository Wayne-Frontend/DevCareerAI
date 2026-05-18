<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="app-bg flex min-h-screen gap-2 p-2">
    <AppSidebar />
    <div class="min-w-0 flex-1">
      <AppHeader />
      <main class="mx-auto w-full max-w-none pb-2">
        <RouterView />
      </main>
    </div>
  </div>
</template>
