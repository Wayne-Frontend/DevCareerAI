<script setup lang="ts">
import { onMounted } from 'vue'
import MessageBox from './components/MessageBox/index.vue'
import ToastContainer from './components/ToastContainer/index.vue'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

// 启动后向服务端校验一次本地会话，避免「本地有 token 但服务端已失效」的假登录态。
onMounted(() => {
  authStore.hydrate()
})
</script>

<template>
  <RouterView />
  <MessageBox />
  <ToastContainer />
</template>
