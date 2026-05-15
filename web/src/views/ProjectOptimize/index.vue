<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import KeywordTags from '../../components/KeywordTags/index.vue'
import PageHeader from '../../components/PageHeader/index.vue'
import SuggestionList from '../../components/SuggestionList/index.vue'
import { optimizeProject } from '../../api/project'
import type { ProjectOptimizationResult } from '../../types/project'
import { toTagList } from '../../utils/format'

const loading = ref(false)
const result = ref<ProjectOptimizationResult | null>(null)
const form = reactive({
  rawContent: '',
  targetRole: '',
  techStack: '',
  style: '简洁专业',
})

const copyText = computed(() => {
  if (!result.value) return ''

  return [
    result.value.projectName,
    result.value.projectDescription,
    `技术栈：${result.value.techStack.join('、')}`,
    `个人职责：${result.value.responsibilities.join('；')}`,
    `技术亮点：${result.value.highlights.join('；')}`,
  ].join('\n')
})

async function submit() {
  if (!form.rawContent) {
    ElMessage.warning('请填写原始项目描述')
    return
  }

  loading.value = true
  try {
    result.value = await optimizeProject({
      rawContent: form.rawContent,
      targetRole: form.targetRole,
      techStack: toTagList(form.techStack),
      style: form.style,
    })
    ElMessage.success('占位优化结果已生成')
  } finally {
    loading.value = false
  }
}

async function copyResult() {
  if (!copyText.value) return

  await navigator.clipboard.writeText(copyText.value)
  ElMessage.success('已复制优化结果')
}
</script>

<template>
  <div class="page">
    <PageHeader title="项目优化" subtitle="把原始项目描述转成更清晰的简历表达，并补齐可被面试追问的结构。">
      <template #extra>
        <el-button class="copy-action" :disabled="!result" :icon="CopyDocument" @click="copyResult">
          复制结果
        </el-button>
      </template>
    </PageHeader>

    <div class="work-grid">
      <GlassCard>
        <h2 class="section-title">原始项目信息</h2>
        <el-form label-position="top">
          <el-form-item label="原始项目描述">
            <el-input
              v-model="form.rawContent"
              type="textarea"
              :rows="12"
              placeholder="描述项目背景、你负责的模块、使用过的技术和遇到的问题"
            />
          </el-form-item>
          <el-form-item label="目标岗位">
            <el-input v-model="form.targetRole" placeholder="例如：中高级前端工程师" />
          </el-form-item>
          <el-form-item label="技术栈">
            <el-input v-model="form.techStack" placeholder="Vue, TypeScript, Vite" />
          </el-form-item>
          <el-form-item label="表达风格">
            <el-select v-model="form.style">
              <el-option label="简洁专业" value="简洁专业" />
              <el-option label="结果导向" value="结果导向" />
              <el-option label="技术深度" value="技术深度" />
            </el-select>
          </el-form-item>
          <el-button class="primary-gradient-btn" :loading="loading" @click="submit">开始优化</el-button>
        </el-form>
      </GlassCard>

      <GlassCard>
        <h2 class="section-title">优化结果</h2>
        <EmptyState
          v-if="!result"
          title="等待项目描述"
          description="提交项目后，这里会展示项目名称、描述、职责、亮点、难点和可能追问。"
        />
        <div v-else class="result-stack">
          <section class="section-card hero-result">
            <span class="soft-tag">Project Story</span>
            <h3>{{ result.projectName }}</h3>
            <p>{{ result.projectDescription }}</p>
            <KeywordTags :tags="result.techStack" type="success" />
          </section>
          <SuggestionList title="个人职责" :items="result.responsibilities" />
          <SuggestionList title="技术亮点" :items="result.highlights" />
          <SuggestionList title="项目难点" :items="result.difficulties" />
          <SuggestionList title="面试追问" :items="result.interviewQuestions" />
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.hero-result {
  display: grid;
  gap: 14px;

  h3 {
    margin: 0;
    color: var(--color-text);
    font-size: 24px;
  }

  p {
    margin: 0;
    color: #334155;
    line-height: 1.85;
  }
}
</style>
