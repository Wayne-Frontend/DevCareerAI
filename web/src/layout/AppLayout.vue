<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="app-bg">
    <AppSidebar />
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
