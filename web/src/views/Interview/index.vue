<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ChatBox from '../../components/ChatBox/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import PageHeader from '../../components/PageHeader/index.vue'
import { createInterview, finishInterview, submitInterviewAnswer } from '../../api/interview'
import { useInterviewStore } from '../../stores/interview'

const interviewStore = useInterviewStore()
const loading = ref(false)
const form = reactive({
  resumeContent: '',
  jobDescription: '',
  targetRole: '',
  interviewType: '技术面',
  difficulty: '中等',
  questionCount: 5,
})

async function start() {
  if (!form.resumeContent || !form.targetRole) {
    ElMessage.warning('请填写简历内容和目标岗位')
    return
  }

  loading.value = true
  try {
    const response = await createInterview(form)
    interviewStore.startSession(response.sessionId, response.firstQuestion)
    ElMessage.success('占位面试已开始')
  } finally {
    loading.value = false
  }
}

async function sendAnswer(answer: string) {
  if (!interviewStore.sessionId) {
    ElMessage.warning('请先开始面试')
    return
  }

  loading.value = true
  try {
    interviewStore.appendMessage({ id: crypto.randomUUID(), role: 'user', content: answer })
    const response = await submitInterviewAnswer(interviewStore.sessionId, answer)
    interviewStore.appendMessage({
      id: crypto.randomUUID(),
      role: 'ai',
      content: response.nextQuestion,
      feedback: {
        score: response.feedback.score,
        comment: response.feedback.comment,
        problems: response.feedback.problems,
        betterAnswer: response.feedback.betterAnswer,
      },
    })
  } finally {
    loading.value = false
  }
}

async function finish() {
  if (!interviewStore.sessionId) return

  loading.value = true
  try {
    const response = await finishInterview(interviewStore.sessionId)
    interviewStore.appendMessage({
      id: crypto.randomUUID(),
      role: 'system',
      content: response.summary,
    })
    ElMessage.success('占位面试已结束')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="模拟面试" subtitle="左侧配置候选人和面试方向，右侧以 AI Chat 形式完成问答、点评和总结。" />

    <div class="interview-grid">
      <GlassCard>
        <h2 class="section-title">面试配置</h2>
        <el-form label-position="top">
          <el-form-item label="目标岗位">
            <el-input v-model="form.targetRole" placeholder="例如：高级前端工程师" />
          </el-form-item>
          <el-form-item label="面试类型">
            <el-select v-model="form.interviewType">
              <el-option label="技术面" value="技术面" />
              <el-option label="项目深挖" value="项目深挖" />
              <el-option label="综合面" value="综合面" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-segmented v-model="form.difficulty" :options="['简单', '中等', '困难']" />
          </el-form-item>
          <el-form-item label="题目数量">
            <el-input-number v-model="form.questionCount" :min="3" :max="10" />
          </el-form-item>
          <el-form-item label="简历内容">
            <el-input v-model="form.resumeContent" type="textarea" :rows="8" placeholder="粘贴简历内容" />
          </el-form-item>
          <el-form-item label="岗位 JD">
            <el-input v-model="form.jobDescription" type="textarea" :rows="6" placeholder="可选" />
          </el-form-item>
          <div class="actions">
            <el-button class="primary-gradient-btn" :loading="loading" @click="start">开始面试</el-button>
            <el-button :disabled="!interviewStore.sessionId" @click="finish">结束面试</el-button>
          </div>
        </el-form>
      </GlassCard>

      <GlassCard>
        <div class="chat-title">
          <div>
            <h2 class="section-title">AI 面试官</h2>
            <p>每次回答后会生成点评和下一道追问。</p>
          </div>
          <span class="soft-tag">{{ form.difficulty }}</span>
        </div>
        <ChatBox :messages="interviewStore.messages" :loading="loading" @send-answer="sendAnswer" />
      </GlassCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.interview-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.36fr) minmax(620px, 0.64fr);
  gap: 24px;
  align-items: start;
}

.actions {
  display: flex;
  gap: 10px;
}

.chat-title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;

  .section-title {
    margin-bottom: 6px;
  }

  p {
    margin: 0;
    color: var(--color-muted);
    font-size: 13px;
  }
}

@media (max-width: 1366px) {
  .interview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
