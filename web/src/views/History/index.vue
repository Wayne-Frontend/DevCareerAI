<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import EmptyState from '../../components/EmptyState/index.vue'
import GlassCard from '../../components/GlassCard/index.vue'
import PageHeader from '../../components/PageHeader/index.vue'
import { deleteHistoryRecord, getHistory } from '../../api/history'
import type { HistoryRecord, HistoryType } from '../../types/history'
import { formatDateTime } from '../../utils/format'

const activeType = ref<HistoryType>('resume-analysis')
const loading = ref(false)
const records = ref<HistoryRecord[]>([])

const tabs: Array<{ label: string; value: HistoryType }> = [
  { label: '简历诊断', value: 'resume-analysis' },
  { label: '项目优化', value: 'project-optimization' },
  { label: '岗位匹配', value: 'job-match' },
  { label: '模拟面试', value: 'interview' },
]

const typeLabelMap: Record<HistoryType, string> = {
  'resume-analysis': '简历诊断',
  'project-optimization': '项目优化',
  'job-match': '岗位匹配',
  interview: '模拟面试',
}

const currentLabel = computed(() => typeLabelMap[activeType.value])

async function load() {
  loading.value = true
  try {
    records.value = await getHistory(activeType.value)
  } finally {
    loading.value = false
  }
}

async function remove(id: string) {
  await deleteHistoryRecord(id)
  ElMessage.success('占位删除成功')
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <PageHeader title="历史记录" subtitle="以卡片方式回看不同类型的分析结果，后续会接入真实持久化数据。" />

    <GlassCard>
      <div class="history-toolbar">
        <el-segmented
          v-model="activeType"
          :options="tabs.map((tab) => ({ label: tab.label, value: tab.value }))"
          @change="load"
        />
        <span class="soft-tag">{{ currentLabel }}</span>
      </div>

      <div v-loading="loading" class="history-content">
        <EmptyState
          v-if="records.length === 0"
          title="暂无历史记录"
          description="完成一次分析或面试后，记录会以卡片形式出现在这里。"
        />
        <div v-else class="history-grid">
          <article v-for="record in records" :key="record.id" class="section-card history-card">
            <div class="history-card-head">
              <span class="history-type" :class="record.type">{{ typeLabelMap[record.type] }}</span>
              <strong v-if="record.score">{{ record.score }}</strong>
            </div>
            <h3>{{ record.title }}</h3>
            <p>{{ formatDateTime(record.createdAt) }}</p>
            <div class="history-actions">
              <el-button text type="primary">查看</el-button>
              <el-button text type="danger" @click="remove(record.id)">删除</el-button>
            </div>
          </article>
        </div>
      </div>
    </GlassCard>
  </div>
</template>

<style scoped lang="scss">
.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.history-content {
  min-height: 300px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.history-card {
  display: grid;
  gap: 14px;

  h3 {
    margin: 0;
    color: var(--color-text);
    font-size: 17px;
  }

  p {
    margin: 0;
    color: var(--color-muted);
    font-size: 13px;
  }
}

.history-card-head,
.history-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.history-card-head strong {
  color: var(--color-primary);
  font-size: 30px;
  line-height: 1;
}

.history-type {
  display: inline-flex;
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 800;

  &.resume-analysis {
    background: rgba(99, 102, 241, 0.1);
    color: #4f46e5;
  }

  &.project-optimization {
    background: rgba(56, 189, 248, 0.12);
    color: #0284c7;
  }

  &.job-match {
    background: rgba(34, 197, 94, 0.12);
    color: #15803d;
  }

  &.interview {
    background: rgba(168, 85, 247, 0.12);
    color: #7e22ce;
  }
}

@media (max-width: 1366px) {
  .history-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
