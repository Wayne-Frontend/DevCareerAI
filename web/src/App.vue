<script setup lang="ts">
import MessageBox from './components/MessageBox/index.vue'
import ToastContainer from './components/ToastContainer/index.vue'
</script>

<template>
  <RouterView />
  <MessageBox />
  <ToastContainer />
</template>
