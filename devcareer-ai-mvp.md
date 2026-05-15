# DevCareer AI MVP 开发说明文档

## 0. 项目背景

本项目是一个 PC 端 Web 应用，名称暂定为 **DevCareer AI**。

产品定位：面向前端程序员的 AI 简历与面试助手。

MVP 版本核心功能：

1. 简历诊断
2. 项目经历优化
3. 岗位 JD 匹配分析
4. 模拟面试
5. 历史记录

AI 模型暂定使用 DeepSeek V4，但代码层面必须做成可配置模型服务，方便后续替换为其他模型。

---

## 1. 项目总体结构

请在一个大的项目根目录中创建前端和后端两个子项目。

推荐根目录名称(这里你可以忽略，我已经创建了该目录，你可以直接在工作区的目录下创建web和server等目录)：

```bash
DevCareerAI
```

目录结构：

```bash
DevCareerAI
├── web        # 前端项目：Vue3 + Vite + TypeScript
├── server     # 后端项目：NestJS + TypeScript
├── README.md
└── docs
    └── mvp-design.md
```

说明：

- `web` 负责 PC 端页面、交互、状态管理、接口请求。
- `server` 负责接口服务、AI 调用、Prompt 管理、文件解析、数据持久化。
- 前端不允许直接调用 DeepSeek API。
- DeepSeek API Key 只能放在后端 `.env` 中。

---

## 2. 技术栈要求

### 2.1 前端技术栈

前端项目位于：

```bash
web
```

使用：

```txt
Vue 3
Vite
TypeScript
Vue Router
Pinia
Element Plus
Axios
ECharts
Markdown 渲染库：markdown-it 或 md-editor-v3
```

前端 UI 风格：

- PC 端后台管理风格
- 左侧菜单
- 顶部栏
- 右侧内容区
- 主色调简洁、偏科技感
- 优先保证功能完整，不要过度设计

### 2.2 后端技术栈

后端项目位于：

```bash
server
```

使用：

```txt
NestJS
TypeScript
Prisma
SQLite（MVP 阶段）
class-validator
class-transformer
multer 文件上传
pdf-parse 解析 PDF
mammoth 解析 DOCX
```

AI 调用：

```txt
DeepSeek V4
```

但请封装为通用 AI Service。

---

## 3. 前端项目初始化要求

在 `web` 目录下创建 Vue3 + Vite + TypeScript 项目。

推荐命令：

```bash
npm create vite@latest web -- --template vue-ts
```

安装依赖：

```bash
cd web
npm install
npm install vue-router pinia axios element-plus @element-plus/icons-vue echarts markdown-it
npm install -D sass unplugin-auto-import unplugin-vue-components
```

---

## 4. 后端项目初始化要求

在 `server` 目录下创建 NestJS 项目。

推荐命令：

```bash
nest new server
```

安装依赖：

```bash
cd server
npm install @nestjs/config @nestjs/platform-express axios multer pdf-parse mammoth
npm install prisma @prisma/client
npm install class-validator class-transformer
npm install -D @types/multer
npx prisma init
```

数据库使用 SQLite。

`.env` 示例：

```env
DATABASE_URL="file:./dev.db"
DEEPSEEK_API_KEY="your_api_key_here"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-flash"
```

---

## 5. MVP 功能范围

### 5.1 简历诊断

用户可以：

- 粘贴简历文本
- 上传 PDF / DOCX / TXT / MD 文件
- 输入目标岗位
- 选择经验年限
- 点击“开始分析”

系统返回：

- 综合评分
- 各维度评分
- 简历优势
- 简历问题
- 修改建议
- 项目经历优化建议
- 优化示例

### 5.2 项目经历优化

用户输入：

- 原始项目描述
- 目标岗位
- 技术栈
- 表达风格

系统返回：

- 项目名称建议
- 项目描述
- 技术栈
- 个人职责
- 技术亮点
- 项目难点
- 可能的面试追问

### 5.3 岗位 JD 匹配分析

用户输入：

- 简历内容或选择历史简历
- 岗位名称
- 岗位 JD

系统返回：

- 匹配度评分
- 匹配关键词
- 缺失关键词
- 优势
- 风险点
- 简历修改建议
- 面试准备建议

### 5.4 模拟面试

用户选择：

- 简历
- 岗位 JD，可选
- 面试类型
- 难度
- 目标岗位

系统流程：

1. AI 生成第一个问题
2. 用户输入回答
3. AI 点评回答
4. AI 给出参考回答
5. AI 生成追问
6. 用户可以继续回答
7. 用户可以结束面试
8. AI 生成面试总结

### 5.5 历史记录

需要保存：

- 简历诊断记录
- 项目优化记录
- 岗位匹配记录
- 模拟面试记录

支持查看和删除。

---

## 6. 前端页面设计

### 6.1 路由列表

请创建以下页面：

```txt
/
/resume-analyze
/project-optimize
/job-match
/interview
/history
/settings
```

对应页面：

```txt
首页
简历诊断
项目优化
岗位匹配
模拟面试
历史记录
设置
```

### 6.2 Layout 布局

创建：

```bash
src/layout/MainLayout.vue
```

布局要求：

- 左侧菜单栏
- 顶部 Header
- 内容区域 RouterView

菜单：

```txt
首页
简历诊断
项目优化
岗位匹配
模拟面试
历史记录
设置
```

### 6.3 首页

文件：

```bash
src/views/Home/index.vue
```

内容：

- 产品名称：DevCareer AI
- 副标题：程序员 AI 简历与面试助手
- 三个核心功能卡片：简历诊断、岗位匹配、模拟面试
- 最近记录区域

### 6.4 简历诊断页

文件：

```bash
src/views/ResumeAnalyze/index.vue
```

布局：

- 左侧输入区
- 右侧结果区

输入区包含：

- 简历标题
- 目标岗位
- 经验年限选择
- 文件上传
- 简历文本输入框
- 开始分析按钮

结果区包含：

- 综合评分
- 维度评分
- 优势列表
- 问题列表
- 建议列表
- 优化示例

### 6.5 项目优化页

文件：

```bash
src/views/ProjectOptimize/index.vue
```

输入区：

- 原始项目描述
- 目标岗位
- 技术栈，逗号分隔或 Tag 输入
- 表达风格选择
- 开始优化按钮

结果区：

- 项目名称
- 项目描述
- 技术栈
- 个人职责
- 技术亮点
- 项目难点
- 可能面试题

### 6.6 岗位匹配页

文件：

```bash
src/views/JobMatch/index.vue
```

输入区：

- 简历内容
- 岗位名称
- 岗位 JD
- 开始匹配按钮

结果区：

- 匹配度评分
- 关键词 Tag
- 缺失关键词 Tag
- 优势
- 风险点
- 简历建议
- 面试准备建议

### 6.7 模拟面试页

文件：

```bash
src/views/Interview/index.vue
```

布局：

- 左侧配置区
- 右侧聊天区

配置区：

- 简历内容
- 岗位 JD，可选
- 目标岗位
- 面试类型
- 难度
- 开始面试按钮
- 结束面试按钮

聊天区：

- AI 问题
- 用户回答
- AI 点评
- 参考答案
- 追问

### 6.8 历史记录页

文件：

```bash
src/views/History/index.vue
```

使用 Tabs 展示：

- 简历诊断
- 项目优化
- 岗位匹配
- 模拟面试

每条记录展示：

- 类型
- 标题
- 分数
- 创建时间
- 查看按钮
- 删除按钮

### 6.9 设置页

文件：

```bash
src/views/Settings/index.vue
```

展示内容：

- 当前模型 Provider
- 当前模型名称
- API 由服务端配置说明

MVP 阶段不允许在前端输入 DeepSeek API Key。

---

## 7. 前端目录结构

请按以下目录组织：

```bash
web/src
├── api
│   ├── request.ts
│   ├── resume.ts
│   ├── project.ts
│   ├── job.ts
│   ├── interview.ts
│   └── history.ts
├── assets
├── components
│   ├── ScoreCard
│   │   └── index.vue
│   ├── KeywordTags
│   │   └── index.vue
│   ├── SuggestionList
│   │   └── index.vue
│   ├── BeforeAfterCompare
│   │   └── index.vue
│   ├── MarkdownViewer
│   │   └── index.vue
│   └── ChatBox
│       └── index.vue
├── layout
│   └── MainLayout.vue
├── router
│   └── index.ts
├── stores
│   ├── resume.ts
│   ├── interview.ts
│   └── history.ts
├── types
│   ├── resume.ts
│   ├── project.ts
│   ├── job.ts
│   └── interview.ts
├── utils
│   ├── format.ts
│   └── storage.ts
├── views
│   ├── Home
│   ├── ResumeAnalyze
│   ├── ProjectOptimize
│   ├── JobMatch
│   ├── Interview
│   ├── History
│   └── Settings
├── App.vue
└── main.ts
```

---

## 8. 后端模块设计

后端采用 NestJS 模块化设计。

目录结构：

```bash
server/src
├── modules
│   ├── ai
│   │   ├── ai.module.ts
│   │   ├── ai.service.ts
│   │   └── ai.types.ts
│   ├── resume
│   │   ├── resume.module.ts
│   │   ├── resume.controller.ts
│   │   ├── resume.service.ts
│   │   └── dto
│   ├── project
│   │   ├── project.module.ts
│   │   ├── project.controller.ts
│   │   ├── project.service.ts
│   │   └── dto
│   ├── job
│   │   ├── job.module.ts
│   │   ├── job.controller.ts
│   │   ├── job.service.ts
│   │   └── dto
│   ├── interview
│   │   ├── interview.module.ts
│   │   ├── interview.controller.ts
│   │   ├── interview.service.ts
│   │   └── dto
│   ├── history
│   │   ├── history.module.ts
│   │   ├── history.controller.ts
│   │   └── history.service.ts
│   └── file
│       ├── file.module.ts
│       └── file.service.ts
├── prompts
│   ├── resume.prompt.ts
│   ├── project.prompt.ts
│   ├── job.prompt.ts
│   └── interview.prompt.ts
├── prisma
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common
│   ├── utils
│   │   ├── json-response.util.ts
│   │   └── text-limit.util.ts
│   └── filters
├── app.module.ts
└── main.ts
```

---

## 9. Prisma 数据库设计

请在 `server/prisma/schema.prisma` 中使用以下模型。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Resume {
  id              String   @id @default(cuid())
  title           String
  content         String
  fileName        String?
  fileType        String?
  targetRole      String?
  experienceLevel String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  analyses        ResumeAnalysis[]
  jobMatches      JobMatchAnalysis[]
  interviews      InterviewSession[]
}

model ResumeAnalysis {
  id        String   @id @default(cuid())
  resumeId  String
  score     Int
  resultJson Json
  createdAt DateTime @default(now())

  resume    Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)
}

model ProjectOptimization {
  id         String   @id @default(cuid())
  rawContent String
  targetRole String?
  techStack  Json?
  style      String?
  resultJson Json
  createdAt  DateTime @default(now())
}

model JobDescription {
  id          String   @id @default(cuid())
  jobTitle    String
  companyName String?
  content     String
  createdAt   DateTime @default(now())

  matches     JobMatchAnalysis[]
  interviews  InterviewSession[]
}

model JobMatchAnalysis {
  id               String   @id @default(cuid())
  resumeId         String
  jobDescriptionId String
  matchScore       Int
  resultJson       Json
  createdAt        DateTime @default(now())

  resume           Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)
  jobDescription   JobDescription @relation(fields: [jobDescriptionId], references: [id], onDelete: Cascade)
}

model InterviewSession {
  id               String   @id @default(cuid())
  resumeId         String?
  jobDescriptionId String?
  title            String
  targetRole       String?
  interviewType    String
  difficulty       String
  status           String   @default("ongoing")
  summaryJson      Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  resume           Resume? @relation(fields: [resumeId], references: [id], onDelete: SetNull)
  jobDescription   JobDescription? @relation(fields: [jobDescriptionId], references: [id], onDelete: SetNull)
  messages         InterviewMessage[]
}

model InterviewMessage {
  id           String   @id @default(cuid())
  sessionId    String
  role         String
  content      String
  feedbackJson Json?
  createdAt    DateTime @default(now())

  session      InterviewSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

初始化数据库：

```bash
npx prisma migrate dev --name init
```

---

## 10. 后端接口设计

### 10.1 简历保存

```http
POST /api/resumes
```

请求 JSON：

```ts
{
  title: string
  content: string
  targetRole?: string
  experienceLevel?: string
}
```

响应：

```ts
{
  id: string
  title: string
  content: string
  targetRole?: string
  experienceLevel?: string
}
```

### 10.2 简历文件上传并解析

```http
POST /api/resumes/upload
```

请求：

```txt
multipart/form-data
file: PDF / DOCX / TXT / MD
```

响应：

```ts
{
  fileName: string
  fileType: string
  content: string
}
```

### 10.3 简历诊断

```http
POST /api/resumes/:id/analyze
```

响应：

```ts
{
  analysisId: string
  score: number
  result: ResumeAnalysisResult
}
```

### 10.4 项目经历优化

```http
POST /api/projects/optimize
```

请求：

```ts
{
  rawContent: string
  targetRole?: string
  techStack?: string[]
  style?: string
}
```

响应：

```ts
ProjectOptimizationResult
```

### 10.5 岗位匹配分析

```http
POST /api/jobs/match
```

请求：

```ts
{
  resumeContent: string
  resumeId?: string
  jobTitle: string
  jobDescription: string
  companyName?: string
}
```

响应：

```ts
{
  matchScore: number
  result: JobMatchResult
}
```

### 10.6 创建模拟面试

```http
POST /api/interviews
```

请求：

```ts
{
  resumeContent: string
  resumeId?: string
  jobDescription?: string
  jobDescriptionId?: string
  targetRole: string
  interviewType: string
  difficulty: string
}
```

响应：

```ts
{
  sessionId: string
  firstQuestion: string
  expectedPoints: string[]
}
```

### 10.7 提交面试回答

```http
POST /api/interviews/:sessionId/messages
```

请求：

```ts
{
  answer: string
}
```

响应：

```ts
{
  feedback: {
    score: number
    comment: string
    problems: string[]
    betterAnswer: string
  },
  nextQuestion: string
}
```

### 10.8 结束面试

```http
POST /api/interviews/:sessionId/finish
```

响应：

```ts
{
  totalScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  studyPlan: string[]
}
```

### 10.9 历史记录

```http
GET /api/history?type=resume-analysis
GET /api/history?type=project-optimization
GET /api/history?type=job-match
GET /api/history?type=interview
```

---

## 11. TypeScript 类型定义

前后端都需要保持类似结构。

### 11.1 简历分析结果

```ts
export interface ResumeAnalysisResult {
  score: number
  summary: string
  dimensionScores: {
    completeness: number
    skillMatch: number
    projectQuality: number
    technicalDepth: number
    professionalExpression: number
  }
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  projectSuggestions: string[]
  optimizedExamples: Array<{
    before: string
    after: string
    reason: string
  }>
}
```

### 11.2 项目优化结果

```ts
export interface ProjectOptimizationResult {
  projectName: string
  projectDescription: string
  techStack: string[]
  responsibilities: string[]
  highlights: string[]
  difficulties: string[]
  interviewQuestions: string[]
}
```

### 11.3 岗位匹配结果

```ts
export interface JobMatchResult {
  matchScore: number
  summary: string
  matchedKeywords: string[]
  missingKeywords: string[]
  advantages: string[]
  risks: string[]
  resumeSuggestions: string[]
  interviewPreparation: string[]
}
```

### 11.4 面试点评结果

```ts
export interface InterviewFeedbackResult {
  score: number
  comment: string
  problems: string[]
  betterAnswer: string
  followUpQuestion: string
}
```

---

## 12. AI Service 设计

请在后端创建：

```bash
server/src/modules/ai/ai.service.ts
```

要求：

- 从 ConfigService 读取环境变量
- 封装 `chat` 方法
- 支持传入 system prompt、user prompt、temperature、maxTokens
- 返回模型原始文本
- 不在业务代码中直接写 axios 请求 DeepSeek

示例方法签名：

```ts
async chat(options: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}): Promise<string>
```

---

## 13. AI JSON 返回处理

大模型可能返回 Markdown 代码块，需要清洗。

创建：

```bash
server/src/common/utils/json-response.util.ts
```

实现：

```ts
export function cleanJsonResponse(text: string): string {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()
}

export function safeParseJson<T>(text: string): T | { rawText: string; parseError: true } {
  const cleaned = cleanJsonResponse(text)

  try {
    return JSON.parse(cleaned) as T
  } catch {
    return {
      rawText: text,
      parseError: true,
    }
  }
}
```

业务接口如果解析失败，也要返回可展示内容，不能让页面直接崩溃。

---

## 14. Prompt 设计

请将 Prompt 独立放在 `server/src/prompts` 中。

### 14.1 通用系统 Prompt

```ts
export const CAREER_ASSISTANT_SYSTEM_PROMPT = `
你是一个资深程序员面试官和简历优化专家，擅长帮助前端、后端、全栈开发者优化简历、分析岗位匹配度、准备技术面试。

你必须遵守以下规则：
1. 只能基于用户提供的信息进行分析。
2. 不得编造公司、项目、数据、性能指标、用户规模、业务成果。
3. 如果缺少量化成果，只能建议用户补充，不能自行生成虚假数据。
4. 输出要专业、具体、可执行。
5. 重点关注技术栈、项目复杂度、个人职责、技术难点、业务结果。
6. 返回内容必须符合指定 JSON 结构。
`;
```

### 14.2 简历诊断 Prompt

```ts
export function buildResumeAnalyzePrompt(params: {
  targetRole?: string
  experienceLevel?: string
  resumeContent: string
}) {
  return `
请分析下面这份程序员简历。

目标岗位：${params.targetRole || '未指定'}
经验年限：${params.experienceLevel || '未指定'}

简历内容：
${params.resumeContent}

请从以下维度评分：
1. 基础信息完整度
2. 技术栈匹配度
3. 项目经历质量
4. 技术深度表达
5. 专业表达能力

请严格返回 JSON，不要返回 Markdown 代码块：
{
  "score": number,
  "summary": string,
  "dimensionScores": {
    "completeness": number,
    "skillMatch": number,
    "projectQuality": number,
    "technicalDepth": number,
    "professionalExpression": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "suggestions": string[],
  "projectSuggestions": string[],
  "optimizedExamples": [
    {
      "before": string,
      "after": string,
      "reason": string
    }
  ]
}
`;
}
```

### 14.3 项目经历优化 Prompt

```ts
export function buildProjectOptimizePrompt(params: {
  rawContent: string
  targetRole?: string
  techStack?: string[]
  style?: string
}) {
  return `
请把下面的项目原始描述，优化成适合程序员简历的项目经历。

目标岗位：${params.targetRole || '未指定'}
技术栈：${params.techStack?.join('、') || '未指定'}
表达风格：${params.style || '简洁专业'}

原始描述：
${params.rawContent}

要求：
1. 不要编造不存在的业务数据。
2. 不要添加用户没有提到过的核心技术。
3. 可以优化表达方式，但不能虚构经历。
4. 输出要适合放在简历中。

请严格返回 JSON，不要返回 Markdown 代码块：
{
  "projectName": string,
  "projectDescription": string,
  "techStack": string[],
  "responsibilities": string[],
  "highlights": string[],
  "difficulties": string[],
  "interviewQuestions": string[]
}
`;
}
```

### 14.4 岗位匹配 Prompt

```ts
export function buildJobMatchPrompt(params: {
  resumeContent: string
  jobTitle: string
  jobDescription: string
}) {
  return `
请分析下面这份简历和目标岗位 JD 的匹配度。

简历内容：
${params.resumeContent}

岗位名称：
${params.jobTitle}

岗位 JD：
${params.jobDescription}

请严格返回 JSON，不要返回 Markdown 代码块：
{
  "matchScore": number,
  "summary": string,
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "advantages": string[],
  "risks": string[],
  "resumeSuggestions": string[],
  "interviewPreparation": string[]
}
`;
}
```

### 14.5 面试问题 Prompt

```ts
export function buildInterviewQuestionPrompt(params: {
  resumeContent: string
  jobDescription?: string
  targetRole: string
  interviewType: string
  difficulty: string
}) {
  return `
你现在是一名前端技术面试官。

候选人简历：
${params.resumeContent}

目标岗位：
${params.targetRole}

岗位 JD：
${params.jobDescription || '未提供'}

面试类型：
${params.interviewType}

难度：
${params.difficulty}

请生成一个面试问题。问题必须结合候选人的简历或目标岗位，不要问过于泛泛的问题。

请严格返回 JSON，不要返回 Markdown 代码块：
{
  "question": string,
  "questionType": string,
  "expectedPoints": string[]
}
`;
}
```

### 14.6 面试回答点评 Prompt

```ts
export function buildInterviewFeedbackPrompt(params: {
  question: string
  answer: string
  resumeContent: string
}) {
  return `
你是一名前端技术面试官。请点评候选人的回答。

面试问题：
${params.question}

候选人回答：
${params.answer}

候选人简历：
${params.resumeContent}

请严格返回 JSON，不要返回 Markdown 代码块：
{
  "score": number,
  "comment": string,
  "problems": string[],
  "betterAnswer": string,
  "followUpQuestion": string
}
`;
}
```

---

## 15. 文件解析要求

创建：

```bash
server/src/modules/file/file.service.ts
```

支持文件类型：

```txt
PDF
DOCX
TXT
MD
```

限制：

- 单文件最大 5MB
- 解析后文本最大 30,000 字符
- 超出部分截断，并提示用户内容过长

解析要求：

- PDF 使用 `pdf-parse`
- DOCX 使用 `mammoth`
- TXT / MD 直接读取 buffer

---

## 16. 前端 API 封装

创建：

```bash
web/src/api/request.ts
```

要求：

- 使用 axios
- baseURL 使用 Vite 环境变量
- 统一处理错误
- 统一返回 data

`.env.development`：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## 17. 前端组件要求

### 17.1 ScoreCard

用于展示分数。

Props：

```ts
{
  score: number
  title?: string
}
```

### 17.2 KeywordTags

用于展示关键词。

Props：

```ts
{
  tags: string[]
  type?: 'success' | 'warning' | 'danger' | 'info'
}
```

### 17.3 SuggestionList

用于展示建议列表。

Props：

```ts
{
  title: string
  items: string[]
}
```

### 17.4 BeforeAfterCompare

用于展示优化前后对比。

Props：

```ts
{
  list: Array<{
    before: string
    after: string
    reason?: string
  }>
}
```

### 17.5 ChatBox

用于模拟面试。

功能：

- 展示消息列表
- 用户输入回答
- 发送回答
- 显示 AI 点评

---

## 18. 代码风格要求

### 18.1 通用要求

- 使用 TypeScript
- 不要使用 `any`，除非确实无法避免
- 接口返回值必须定义类型
- 异步请求必须有 loading 状态
- 错误必须使用 Element Plus Message 提示
- 页面必须有空状态

### 18.2 前端要求

- Vue 组件使用 `<script setup lang="ts">`
- 样式使用 scoped SCSS
- 业务请求放在 `api` 目录
- 类型放在 `types` 目录
- 不要在页面中直接写 axios

### 18.3 后端要求

- Controller 只处理请求和响应
- Service 处理业务逻辑
- Prompt 独立放在 prompts 目录
- AI 调用统一走 AiService
- DTO 使用 class-validator
- 不要在日志中打印完整简历内容和 API Key

---

## 19. 开发顺序建议

请按以下顺序实现。

### 第一步：基础工程

1. 创建根目录
2. 初始化 `web`
3. 初始化 `server`
4. 配置前后端启动脚本
5. 配置 CORS
6. 配置 Prisma + SQLite

### 第二步：后端基础能力

1. PrismaService
2. AiService
3. FileService
4. JSON 清洗工具
5. Prompt 文件

### 第三步：简历诊断

1. Resume 模块
2. 简历保存接口
3. 文件上传解析接口
4. 简历分析接口
5. 前端简历诊断页面

### 第四步：项目优化

1. Project 模块
2. 项目优化接口
3. 前端项目优化页面

### 第五步：岗位匹配

1. Job 模块
2. 岗位匹配接口
3. 前端岗位匹配页面

### 第六步：模拟面试

1. Interview 模块
2. 创建面试接口
3. 提交回答接口
4. 结束面试接口
5. 前端聊天页面

### 第七步：历史记录

1. History 模块
2. 历史记录列表接口
3. 历史记录页面

### 第八步：打磨

1. Loading 状态
2. 错误提示
3. 空状态
4. 结果复制
5. 页面样式优化

---

## 20. package.json 脚本建议

根目录可以创建 `package.json`，方便统一启动。

```json
{
  "scripts": {
    "dev:web": "cd web && npm run dev",
    "dev:server": "cd server && npm run start:dev",
    "dev": "concurrently \"npm run dev:web\" \"npm run dev:server\""
  },
  "devDependencies": {
    "concurrently": "latest"
  }
}
```

---

## 21. README 内容要求

根目录 README 至少包含：

```txt
项目介绍
技术栈
目录结构
环境变量配置
前端启动方式
后端启动方式
数据库初始化方式
DeepSeek API Key 配置方式
MVP 功能说明
```

---

## 22. 验收标准

MVP 完成后，需要满足：

1. 前端可以正常启动。
2. 后端可以正常启动。
3. SQLite 数据库可以正常创建。
4. 用户可以粘贴简历并发起 AI 诊断。
5. 用户可以上传 PDF / DOCX 并解析出文本。
6. 用户可以输入项目描述并生成优化结果。
7. 用户可以输入岗位 JD 并生成匹配分析。
8. 用户可以进行至少 3 轮模拟面试问答。
9. 历史记录可以保存并查看。
10. DeepSeek API Key 不出现在前端代码中。
11. AI 返回异常时，页面不会崩溃。
12. 所有主要页面都有 loading、空状态和错误提示。

---

## 23. 注意事项

1. 不要实现用户登录系统，MVP 阶段可以先不做账号。
2. 不要实现支付系统。
3. 不要实现语音面试。
4. 不要实现复杂知识库。
5. 不要实现在线简历模板编辑器。
6. 不要把 DeepSeek API Key 写死在代码里。
7. 不要让前端直接请求 DeepSeek API。
8. 不要让 AI 编造用户没有提供的经历和数据。
9. 所有 AI 输出都尽量要求 JSON 格式。
10. 如果 JSON 解析失败，保留原始文本并正常展示。

---

## 24. 最终目标

完成一个可以本地运行的 PC 端 MVP 应用：

```txt
DevCareer AI 是一个面向前端程序员的 AI 简历与面试助手，支持简历诊断、项目经历优化、岗位 JD 匹配和模拟技术面试，帮助用户发现简历问题、优化项目表达，并针对目标岗位进行面试训练。
```
