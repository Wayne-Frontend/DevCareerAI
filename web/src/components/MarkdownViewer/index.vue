<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed } from 'vue'

const props = defineProps<{
  content: string
}>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const html = computed(() => md.render(props.content || ''))
</script>

<template>
  <article class="markdown-viewer" v-html="html" />
</template>

<style scoped>
.markdown-viewer {
  color: #344054;
  line-height: 1.8;

  :deep(p:first-child) {
    margin-top: 0;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }
}
</style>
