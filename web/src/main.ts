import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/index.css'
import App from './App.vue'
import router from './router'
import { initTheme } from './utils/theme'

initTheme()
createApp(App).use(createPinia()).use(router).mount('#app')
