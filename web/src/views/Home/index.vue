<script setup lang="ts">
import { Aim, ChatLineRound, Document, MagicStick } from '@element-plus/icons-vue'
import FeatureCard from '../../components/FeatureCard/index.vue'

const features = [
  {
    title: '简历诊断',
    description: '从完整度、岗位匹配、技术深度和表达质量四个方向拆解简历问题。',
    path: '/resume-analyze',
    icon: Document,
  },
  {
    title: '项目优化',
    description: '把原始项目经历整理成更清晰、更适合面试追问的简历表达。',
    path: '/project-optimize',
    icon: MagicStick,
  },
  {
    title: '岗位匹配',
    description: '对照目标 JD 提取关键词缺口、优势风险和简历修改建议。',
    path: '/job-match',
    icon: Aim,
  },
  {
    title: '模拟面试',
    description: '围绕简历和岗位进行结构化追问，生成点评与参考回答。',
    path: '/interview',
    icon: ChatLineRound,
  },
]

const recentRecords = [
  { type: '简历诊断', title: '前端工程师简历初筛', score: 76 },
  { type: '岗位匹配', title: 'React 中高级岗位 JD 匹配', score: 72 },
  { type: '模拟面试', title: '项目深挖第一轮', score: 78 },
]
</script>

<template>
  <div class="page home-page">
    <section class="hero glass-card">
      <div class="hero-copy">
        <span class="soft-tag">AI powered career workspace</span>
        <h1>让 AI 帮你优化简历，准备面试</h1>
        <p>面向程序员的 AI 简历诊断、岗位匹配和模拟面试工作台。</p>
        <div class="hero-actions">
          <el-button class="primary-gradient-btn" size="large" @click="$router.push('/resume-analyze')">
            开始简历诊断
          </el-button>
          <el-button size="large" @click="$router.push('/interview')">模拟一次面试</el-button>
        </div>
      </div>
      <div class="hero-preview" aria-label="AI 分析预览">
        <div class="preview-card main">
          <span>Resume score</span>
          <strong>86</strong>
          <el-progress :percentage="86" :show-text="false" />
        </div>
        <div class="preview-card floating one">岗位关键词匹配 +18%</div>
        <div class="preview-card floating two">下一轮追问已生成</div>
      </div>
    </section>

    <section class="feature-grid">
      <FeatureCard
        v-for="feature in features"
        :key="feature.path"
        :icon="feature.icon"
        :title="feature.title"
        :description="feature.description"
      >
        <el-button text type="primary" @click="$router.push(feature.path)">进入工具</el-button>
      </FeatureCard>
    </section>

    <section class="recent-section">
      <div class="page-header">
        <div>
          <h2 class="page-title small">最近记录</h2>
          <p class="page-subtitle">这里先展示占位记录，后续会接入真实历史数据。</p>
        </div>
        <el-button @click="$router.push('/history')">查看全部</el-button>
      </div>
      <div class="record-grid">
        <article v-for="record in recentRecords" :key="record.title" class="section-card record-card">
          <span class="soft-tag">{{ record.type }}</span>
          <h3>{{ record.title }}</h3>
          <strong>{{ record.score }}</strong>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
  gap: 28px;
  min-height: 360px;
  padding: 38px;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;

  h1 {
    max-width: 760px;
    margin: 18px 0 16px;
    color: var(--color-text);
    font-size: clamp(42px, 5vw, 68px);
    line-height: 1.04;
    letter-spacing: 0;
  }

  p {
    max-width: 620px;
    margin: 0;
    color: var(--color-muted);
    font-size: 18px;
    line-height: 1.8;
  }
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}

.hero-preview {
  position: relative;
  min-height: 280px;
}

.preview-card {
  border: 1px solid var(--color-border);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 22px 54px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

.preview-card.main {
  position: absolute;
  right: 24px;
  bottom: 22px;
  width: min(100%, 340px);
  padding: 28px;

  span {
    color: var(--color-muted);
    font-size: 13px;
    font-weight: 760;
  }

  strong {
    display: block;
    margin: 14px 0;
    color: var(--color-primary);
    font-size: 74px;
    line-height: 1;
  }
}

.preview-card.floating {
  position: absolute;
  padding: 14px 16px;
  color: #334155;
  font-size: 13px;
  font-weight: 760;
}

.preview-card.one {
  top: 26px;
  left: 16px;
}

.preview-card.two {
  top: 106px;
  right: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.recent-section {
  display: grid;
  gap: 16px;
}

.page-title.small {
  font-size: 22px;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.record-card {
  h3 {
    margin: 16px 0 20px;
    color: var(--color-text);
    font-size: 16px;
  }

  strong {
    color: var(--color-primary);
    font-size: 32px;
  }
}

@media (max-width: 1366px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-preview {
    min-height: 220px;
  }

  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
