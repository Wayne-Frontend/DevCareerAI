# DevCareer AI Agent Guide

## 项目范围

本仓库是 DevCareer AI 的前后端 monorepo，面向开发者的 AI 简历、项目优化、岗位匹配、模拟面试与历史复盘场景。

- `web`: Vue 3 + Vite + TypeScript 客户端。
- `server`: NestJS + Prisma + SQLite API 服务。
- `docs`: 产品、设计和实现说明。
- `scripts`: 本地开发辅助脚本，例如日志启动与清理。

## 最高优先级规则

- 优先复用已有组件、API 封装、类型、store、工具函数、样式类和后端 service，不要重复造轮子。
- 删除文件、清空文件、重命名关键文件、移动目录、大规模替换内容前，必须先说明原因并等待确认。
- 不要擅自新增依赖；确实需要时，先说明原因、替代方案、影响范围和安装命令，等待确认。
- 不要擅自改变接口字段、数据结构、组件 props、emits、slot、路由、状态管理结构、Prisma schema 或公共方法签名。
- 不确定业务含义、字段含义、接口规则、AI 输出结构、缓存策略或计算公式时，不要猜测；说明不确定点并给出建议。
- 不要为了通过构建或消除报错而删除业务代码，应先分析根因。
- 不要留下无用 import、未使用变量、`debugger`、临时 `console.log` 或无意义注释。
- 所有文件统一使用 UTF-8 编码；发现中文乱码时先判断编码来源，不要盲目覆盖历史文档。
- 完成修改后，用中文总结修改内容、涉及文件、修改原因、风险点、是否运行测试或构建；没有运行就明确说明。

## 技术栈事实

前端当前使用：

- Vue 3、Vite、TypeScript、Vue Router、Pinia。
- Tailwind CSS v4，入口样式在 `web/src/styles/index.css`。
- Axios 请求封装在 `web/src/api/request.ts`。
- SSE/流式请求封装在 `web/src/api/streamRequest.ts`。
- 图标使用 `lucide-vue-next`。
- Markdown 渲染使用 `markdown-it`，图表能力使用 `echarts`。

后端当前使用：

- NestJS、TypeScript、Prisma、SQLite。
- 全局 API 前缀为 `/api`。
- 全局鉴权守卫为 `AuthGuard`，公开接口通过 `@Public()` 放行。
- DTO 使用 `class-validator` / `class-transformer`，全局 `ValidationPipe` 开启 `whitelist` 与 `transform`。
- AI 能力统一由 `server/src/modules/ai/AiService` 封装，包含普通请求和流式请求。
- AI 结果缓存由 `AiCacheService` 和 Prisma `AiCache` 模型承载。
- 文件解析由 `FileModule` / `FileService` 承载，支持简历上传解析场景。

## 前端开发规则

- 业务接口调用统一放在 `web/src/api`，页面和组件不要直接写 `axios` 或裸 `fetch`；流式接口复用 `streamRequest`。
- 共享类型统一放在 `web/src/types`，避免在页面里临时复制接口类型。
- 状态管理放在 `web/src/stores`，登录态优先复用 `auth` store 与 `web/src/utils/authSession.ts`。
- Vue 组件使用 `<script setup lang="ts">`，样式沿用当前 scoped 样式和全局 Tailwind 工具类体系。
- 路由配置在 `web/src/router/index.ts`；新增页面时同步考虑鉴权、标题、侧边栏入口和移动端表现。
- 复用现有通用组件：`GlassCard`、`LoadingButton`、`EmptyState`、`InlineStatus`、`SkeletonCard`、`ToastContainer`、`ScoreCard`、`KeywordTags`、`SuggestionList`、`BeforeAfterCompare`、`ChatBox`、`ChatMessage`、`StreamPreview` 等。
- API 错误提示优先走 `web/src/api/errors.ts` 和现有 toast/notify 机制，不要在页面里散落重复错误解析逻辑。
- 异步交互必须有合理的 loading、空状态、错误态和禁用态；AI 流式输出要考虑取消、失败和最终结果未返回的边界。
- 不要把 DeepSeek API Key、模型配置或服务端密钥放到前端。前端只读取 `VITE_API_BASE_URL` 等公开变量。

## 后端开发规则

- Controller 保持薄，只处理参数、用户上下文和响应；业务逻辑放到对应 Service。
- AI 调用必须经过 `AiService`；业务模块不要直接请求 DeepSeek，也不要把 API Key 暴露到日志或响应里。
- Prompt 统一放在 `server/src/prompts`，业务模块按需引用，不要把长 prompt 散落在 controller 中。
- AI JSON 解析和兜底展示优先复用 `server/src/common/utils/json-response.util.ts`；解析失败时保留可展示原文，不要让页面直接崩溃。
- SSE 响应优先复用 `server/src/common/utils/sse.util.ts`，保持 `start`、`delta`、`usage`、`done`、`error` 事件语义稳定。
- 文本长度、AI 状态、响应格式等公共逻辑优先复用 `server/src/common/utils` 下已有工具。
- 涉及用户数据的查询必须带上当前用户边界，避免跨用户读取历史、简历、岗位、项目优化或面试记录。
- Prisma schema、migration 和 service 返回结构要同步维护；不要只改数据库不改类型或前端调用。
- 环境变量校验在 `server/src/config/env.validation.ts`，不要绕过校验或提交真实 `.env`。
- 日志中不要打印完整简历、完整 JD、完整 AI prompt、完整 AI 返回内容、token、API Key 或密码哈希。

## 业务边界

- 当前项目已经包含注册、登录、鉴权、个人信息、简历诊断、项目优化、岗位匹配、模拟面试、历史记录和 AI 缓存能力；不要再按“无登录 MVP”假设设计。
- AI 输出不能编造用户没有提供的经历、公司、项目、指标、规模或结果；缺少量化信息时只能建议用户补充。
- 简历、JD、面试回答等用户输入属于敏感内容，处理时注意脱敏、边界校验和错误提示。
- AI 缓存命中逻辑与 prompt/payload/model/version 相关，调整 prompt 或输出结构时要考虑缓存版本。
- 历史记录、简历、岗位、项目优化、面试会话都与用户归属有关，改动时优先确认 Prisma 关系和权限边界。

## UI 设计规范

项目采用现代 AI workspace 视觉风格：

- 关键词：Clean、Spacious、Apple-like、Glassmorphism、Soft shadows、Rounded cards、Light gradients、Minimal dashboard feel。
- 优先使用浅色渐变背景、玻璃侧边栏、卡片化内容、大标题、柔和描述文案、渐变主按钮、清晰状态反馈。
- 避免传统后台风格、厚重深色侧边栏、密集表格、锐利边框、过饱和配色。
- 优先复用核心类：`glass-card`、`section-card`、`page-header`、`page-title`、`page-subtitle`、`primary-gradient-btn`、`soft-tag`。
- 新增图标按钮优先使用 `lucide-vue-next`，并保持与现有导航、按钮、状态卡视觉一致。
- 页面要兼顾桌面和移动端；侧边栏、双栏工作区、长文本结果区要检查窄屏布局。

## 目录约定

前端：

- `web/src/api`: 请求封装和业务 API。
- `web/src/components`: 可复用 UI 组件。
- `web/src/layout`: 应用布局、侧边栏等框架组件。
- `web/src/router`: 路由与鉴权跳转。
- `web/src/stores`: Pinia 状态。
- `web/src/types`: 前端共享类型。
- `web/src/utils`: 纯工具函数和浏览器端会话工具。
- `web/src/views`: 页面级业务视图。

后端：

- `server/src/modules`: Nest 业务模块。
- `server/src/modules/ai`: AI 服务与缓存。
- `server/src/prompts`: Prompt 构造与系统提示。
- `server/src/common`: 通用过滤器和工具。
- `server/src/prisma`: PrismaService 与模块。
- `server/prisma`: schema 与 migrations。

## 验证命令

按改动范围选择最小但足够的验证：

- 前端类型检查：`npm --prefix web run typecheck`
- 前端构建：`npm --prefix web run build`
- 后端类型检查：`npm --prefix server run typecheck`
- 后端测试：`npm --prefix server run test`
- 后端构建：`npm --prefix server run build`
- Prisma migration：`npm --prefix server run prisma:migrate`
- 全量检查：`npm run check`
- 本地开发：`npm run dev`
- 带日志本地开发：`npm run dev:log`
- 清理开发日志：`npm run clean:logs`

不要凭空编造验证结果。命令失败时，记录失败命令、关键错误和下一步建议。

## 注释与文档

- 对复杂逻辑、复杂封装、核心业务流程、非直观实现必须添加中文注释，解释原因、业务含义和边界条件。
- 简单赋值、直观样式、显而易见的函数不要添加噪音注释。
- 更新接口、环境变量、启动方式、数据模型或验收方式时，同步考虑 README、docs 和 `.env.example`。
- 如果发现现有文档与代码不一致，优先以当前代码为准，并在总结中指出文档可能过时。
