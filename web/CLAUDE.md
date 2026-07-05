# web/ — 前端开发规则

Vue 3 + Vite + TypeScript + Vue Router + Pinia + Tailwind CSS v4。入口样式 `src/styles/index.css`,图标用 `lucide-vue-next`,Markdown 渲染用 `markdown-it`,图表用 `echarts`(封装在 `src/utils/echarts.ts`)。

## API 层

- 业务接口调用统一放 `src/api`,页面和组件不写裸 `axios`/`fetch`。
- 普通请求走 `src/api/request.ts`;SSE/流式请求走 `src/api/streamRequest.ts`。
- 错误提示走 `src/api/errors.ts` 和现有 toast/notify 机制(`src/utils/notify.ts`、`ToastContainer`),不要在页面里散落重复的错误解析逻辑。
- 错误 toast 由 `request.ts`/`streamRequest.ts` 拦截层统一弹;页面 catch 只做有实际意义的事(inline 错误态、回滚、恢复输入),不重复 notify;没有事情做就不写 catch。空 catch 仅限「失败也必须继续流程」的有意忽略,且必须注释原因。本地逻辑(clipboard、文件解析)不经拦截层,提示自行负责。
- 类型从 `src/types` 引用(它按域转发 `@devcareer/shared`),不要在页面里临时定义接口类型。

## 状态与会话

- 状态管理放 `src/stores`(现有:auth、chat、interview、resume、workflow)。
- 登录态优先复用 `auth` store 与 `src/utils/authSession.ts`;跳登录用 `src/utils/redirectToLogin.ts`。

## 组件与页面

- Vue 组件一律 `<script setup lang="ts">`,样式沿用 scoped + 全局 Tailwind 工具类体系。
- 新建 UI 前先看 `src/components` 是否已有可复用组件(GlassCard、LoadingButton、EmptyState、InlineStatus、SkeletonCard、ScoreCard、KeywordTags、SuggestionList、BeforeAfterCompare、ChatBox、ChatMessage、StreamPreview、ToastContainer、MessageBox、FeedbackCard、ListSection、ResumeUploadDropzone)；共享逻辑先看 `src/composables`(useStreamTask、useResumeJdAssets)。
- 路由配置在 `src/router/index.ts`;新增页面同步考虑:鉴权、页面标题、侧边栏入口(`src/layout`)、移动端表现。
- 异步交互必须有 loading、空状态、错误态、禁用态;AI 流式输出要处理取消、失败、最终结果未返回的边界。

## UI 设计规范

现代 AI workspace 风格:Clean、Spacious、Apple-like、Glassmorphism、柔和阴影、圆角卡片、浅色渐变。

- 优先复用核心类:`glass-card`、`section-card`、`page-header`、`page-title`、`page-subtitle`、`primary-gradient-btn`、`soft-tag`。
- 避免:传统后台风格、厚重深色侧边栏、密集表格、锐利边框、过饱和配色。
- 页面兼顾桌面和移动端;侧边栏、双栏工作区、长文本结果区要检查窄屏布局。

## 安全

- 前端只读取 `VITE_` 前缀的公开变量(如 `VITE_API_BASE_URL`);任何 AI API Key、模型配置、服务端密钥不进前端。
