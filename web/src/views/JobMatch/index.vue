<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import KeywordTags from '../../components/KeywordTags/index.vue'
import PageHeader from '../../components/PageHeader/index.vue'
import SuggestionList from '../../components/SuggestionList/index.vue'
import { matchJob } from '../../api/job'
import type { JobMatchResult } from '../../types/job'

const loading = ref(false)
const result = ref<JobMatchResult | null>(null)
const form = reactive({
  resumeContent: '',
  jobTitle: '',
  companyName: '',
  jobDescription: '',
})

async function submit() {
  if (!form.resumeContent || !form.jobTitle || !form.jobDescription) {
    ElMessage.warning('请填写简历内容、岗位名称和 JD')
    return
  }

  loading.value = true
  try {
    const response = await matchJob(form)
    result.value = response.result
    ElMessage.success('占位匹配结果已生成')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="岗位匹配" subtitle="把简历与目标 JD 放在同一视图里，快速识别关键词、风险和修改方向。" />

    <GlassCard>
      <h2 class="section-title">简历与 JD</h2>
      <el-form label-position="top">
        <div class="input-grid">
          <el-form-item label="简历内容">
            <el-input v-model="form.resumeContent" type="textarea" :rows="9" placeholder="粘贴简历内容" />
          </el-form-item>
          <el-form-item label="岗位 JD">
            <el-input v-model="form.jobDescription" type="textarea" :rows="9" placeholder="粘贴岗位 JD" />
          </el-form-item>
        </div>
        <div class="meta-grid">
          <el-form-item label="岗位名称">
            <el-input v-model="form.jobTitle" placeholder="例如：前端工程师" />
          </el-form-item>
          <el-form-item label="公司名称">
            <el-input v-model="form.companyName" placeholder="可选" />
          </el-form-item>
          <div class="match-action">
            <el-button class="primary-gradient-btn" :loading="loading" @click="submit">开始匹配</el-button>
          </div>
        </div>
      </el-form>
    </GlassCard>

    <GlassCard>
      <h2 class="section-title">匹配结果</h2>
      <EmptyState
        v-if="!result"
        title="等待匹配分析"
        description="提交后会在这里突出显示匹配度、命中关键词、缺失关键词和风险建议。"
      />
      <div v-else class="match-results">
        <section class="section-card match-score">
          <div>
            <span class="soft-tag">Match Score</span>
            <strong>{{ result.matchScore }}</strong>
            <p>{{ result.summary }}</p>
          </div>
          <el-progress :percentage="result.matchScore" :stroke-width="14" />
        </section>

        <div class="result-grid">
          <section class="section-card">
            <h3>匹配关键词</h3>
            <KeywordTags :tags="result.matchedKeywords" type="success" />
          </section>
          <section class="section-card">
            <h3>缺失关键词</h3>
            <KeywordTags :tags="result.missingKeywords" type="warning" />
          </section>
          <SuggestionList title="优势" :items="result.advantages" />
          <SuggestionList title="风险点" :items="result.risks" />
          <SuggestionList title="简历修改建议" :items="result.resumeSuggestions" />
          <SuggestionList title="面试准备建议" :items="result.interviewPreparation" />
        </div>
      </div>
    </GlassCard>
  </div>
</template>

<style scoped lang="scss">
.input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 18px;
  align-items: end;
}

.match-action {
  display: flex;
  align-items: flex-end;
  min-height: 76px;
}

.match-results {
  display: grid;
  gap: 18px;
}

.match-score {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 28px;
  align-items: center;

  strong {
    display: block;
    margin: 14px 0 8px;
    color: var(--color-primary);
    font-size: 64px;
    line-height: 1;
  }

  p {
    margin: 0;
    color: var(--color-muted);
    line-height: 1.75;
  }
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  h3 {
    margin: 0 0 14px;
    color: var(--color-text);
    font-size: 15px;
  }
}

@media (max-width: 1280px) {
  .input-grid,
  .result-grid {
    grid-template-columns: 1fr;
  }

  .meta-grid,
  .match-score {
    grid-template-columns: 1fr;
  }
}
</style>
