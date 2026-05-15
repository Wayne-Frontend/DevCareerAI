<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type UploadUserFile } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import BeforeAfterCompare from '../../components/BeforeAfterCompare/index.vue'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import PageHeader from '../../components/PageHeader/index.vue'
import ScoreCard from '../../components/ScoreCard/index.vue'
import SuggestionList from '../../components/SuggestionList/index.vue'
import { analyzeResume, createResume } from '../../api/resume'
import { useResumeStore } from '../../stores/resume'
import type { ResumeAnalysisResult } from '../../types/resume'

const resumeStore = useResumeStore()
const loading = ref(false)
const fileList = ref<UploadUserFile[]>([])
const result = ref<ResumeAnalysisResult | null>(null)

const form = reactive({
  title: '',
  targetRole: '',
  experienceLevel: '',
  content: '',
})

async function submit() {
  if (!form.title || !form.content) {
    ElMessage.warning('请填写简历标题和简历内容')
    return
  }

  loading.value = true
  try {
    const resume = await createResume(form)
    resumeStore.setCurrentResume(resume)
    const analysis = await analyzeResume(resume.id)
    result.value = analysis.result
    ElMessage.success('占位诊断已生成')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader
      title="简历诊断"
      subtitle="粘贴简历或上传文件，先跑通结构化诊断流程；下一阶段会接入真实 AI 分析。"
    />

    <div class="work-grid">
      <GlassCard>
        <h2 class="section-title">输入简历信息</h2>
        <el-form label-position="top">
          <el-form-item label="简历标题">
            <el-input v-model="form.title" placeholder="例如：前端开发工程师简历" />
          </el-form-item>
          <el-form-item label="目标岗位">
            <el-input v-model="form.targetRole" placeholder="例如：高级前端工程师" />
          </el-form-item>
          <el-form-item label="经验年限">
            <el-select v-model="form.experienceLevel" placeholder="请选择">
              <el-option label="应届 / 1 年以内" value="junior" />
              <el-option label="1-3 年" value="1-3" />
              <el-option label="3-5 年" value="3-5" />
              <el-option label="5 年以上" value="5+" />
            </el-select>
          </el-form-item>
          <el-form-item label="文件上传">
            <el-upload v-model:file-list="fileList" drag :auto-upload="false" accept=".pdf,.docx,.txt,.md">
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">拖拽 PDF / DOCX / TXT / MD 到这里</div>
            </el-upload>
          </el-form-item>
          <el-form-item label="简历文本">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="11"
              placeholder="粘贴简历内容，建议包含技能栈、项目经历和目标岗位方向"
            />
          </el-form-item>
          <el-button class="primary-gradient-btn" :loading="loading" @click="submit">开始分析</el-button>
        </el-form>
      </GlassCard>

      <GlassCard>
        <h2 class="section-title">AI 诊断结果</h2>
        <EmptyState
          v-if="!result"
          title="还没有诊断结果"
          description="提交简历后，这里会展示评分、优势、问题、建议和优化前后对比。"
        />
        <div v-else class="result-stack">
          <ScoreCard :score="result.score" />
          <div class="result-grid">
            <SuggestionList title="优势" :items="result.strengths" />
            <SuggestionList title="问题" :items="result.weaknesses" />
            <SuggestionList title="建议" :items="result.suggestions" />
            <SuggestionList title="项目优化方向" :items="result.projectSuggestions" />
          </div>
          <section class="section-card">
            <h3 class="mini-title">Before / After</h3>
            <BeforeAfterCompare :list="result.optimizedExamples" />
          </section>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.mini-title {
  margin: 0 0 14px;
  color: var(--color-text);
  font-size: 15px;
}

@media (max-width: 1280px) {
  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
