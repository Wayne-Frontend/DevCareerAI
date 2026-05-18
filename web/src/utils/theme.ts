import { computed, ref } from 'vue'

export type AppTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'devcareer-theme'
const currentTheme = ref<AppTheme>('light')

export const theme = computed(() => currentTheme.value)
export const isDarkTheme = computed(() => currentTheme.value === 'dark')

export function initTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  const nextTheme: AppTheme = storedTheme === 'dark' ? 'dark' : 'light'

  applyTheme(nextTheme)
}

export function toggleTheme() {
  applyTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
}

function applyTheme(nextTheme: AppTheme) {
  currentTheme.value = nextTheme
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
}
