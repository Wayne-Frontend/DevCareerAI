# DevCareer AI

面向开发者的 PC 端 Web 应用，用 AI 辅助简历诊断、项目经历优化、岗位 JD 匹配、模拟面试和历史复盘。Monorepo，`web` 是 Vue 3 前端，`server` 是 NestJS 后端。产品需求见 [devcareer-ai-mvp.md](./devcareer-ai-mvp.md)。

## 技术栈

- 前端：Vue 3、Vite、TypeScript、Vue Router、Pinia、Axios、ECharts、markdown-it、lucide-vue-next、Tailwind CSS v4
- 后端：NestJS 10、TypeScript、Prisma 6、SQLite、class-validator / class-transformer、multer、pdf-parse、mammoth、axios
- AI：后端 `AiService` 封装 DeepSeek Chat Completions API

## 目录结构

```txt
DevCareerAI
├── web                  Vue 3 + Vite 前端
├── server               NestJS + Prisma 后端
├── scripts              启动日志、清理日志脚本
├── devcareer-ai-mvp.md  产品需求文档
└── README.md
```

后端 `server/src`：

```
config/env.validation.ts   启动时校验环境变量
common/filters             全局异常过滤器
common/utils               JSON 清洗、文本限制、SSE、结果状态判定
prisma                     PrismaService
prompts                    各功能 Prompt
modules/auth               注册登录、会话、守卫
modules/ai                 AiService、AiCacheService
modules/file               文件解析
modules/resume             简历
modules/project            项目优化
modules/job                岗位匹配
modules/interview          模拟面试
modules/history            历史记录
main.ts                    入口
```

前端 `web/src`：

```
api          请求封装（request 走 axios，streamRequest 走 SSE）
components    展示与交互组件
layout        布局与侧栏
router        路由与登录守卫
stores        Pinia（auth / workflow / interview / resume）
types         类型定义
utils         登录态持久化、格式化等
views         各页面
styles        Tailwind 与主题变量
```

## 环境变量

前端 `web/.env.development`：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

后端复制 `server/.env.example` 为 `server/.env`。AI 服务用通用的 `AI_*` 变量，指向任意 OpenAI 兼容端点：

```env
DATABASE_URL="file:./dev.db"
PORT=3000

AI_API_KEY="your_api_key_here"
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL_FAST="gpt-4o-mini"
AI_MODEL_QUALITY="gpt-4o"
AI_SEND_THINKING="false"
```

换成 DeepSeek 时把 `AI_BASE_URL` 设为 `https://api.deepseek.com`、模型改成对应名称，并把 `AI_SEND_THINKING` 设为 `true`（发送 DeepSeek 的 `thinking` 参数；纯 OpenAI 端点不识别该字段，保持 `false`）。

真实 API Key 只放在 `server/.env`，不要写入前端或提交到 Git。启动时会校验：`DATABASE_URL` 必填；`AI_API_KEY` 必填且不能是占位值；`AI_BASE_URL` 必填且为合法 http(s) 地址；快、慢模型分别由 `AI_MODEL_FAST` / `AI_MODEL_QUALITY` 提供；`PORT` 若填写需为 1–65535。不内置任何厂商的默认地址或模型，地址与模型必须显式配置。

## 安装与运行

根目录使用 npm workspaces，一次安装前后端依赖：

```bash
npm install
```

初始化数据库（SQLite 文件创建在 `server/prisma/dev.db`）：

```bash
npm run prisma:migrate
```

同时启动前后端：

```bash
npm run dev
```

单独启动：

```bash
npm run dev:web
npm run dev:server
```

默认地址：

- Web：http://localhost:5173
- API：http://localhost:3000/api

## 工程校验

```bash
npm run typecheck   # 前后端类型检查
npm run lint        # ESLint（零警告基线，--max-warnings 0）
npm run test        # 后端测试
npm run build       # 前后端构建
npm run check       # 依次执行 typecheck、test、build
```

后端测试用 Node 内置的 `node:test`（无额外依赖），用例在 `server/test/*.test.ts`，由 `test/run-tests.ts` 汇总运行。当前覆盖：JSON 清洗与解析、文本长度限制、各 `normalize*` 的降级与分数 clamp、缓存键稳定性与 `AiCacheService.resolve` 的命中/未命中/解析失败三条路径、密码哈希往返、限流计数维度解析。

后端启动时设置全局前缀 `api`、全局校验管道、全局异常过滤器，开启 CORS，并把 `/uploads` 作为静态目录用于头像访问。

## 鉴权

除注册、登录外，所有接口都需要请求头 `Authorization: Bearer <token>`。

- 注册 / 登录成功返回 `{ token, expiresAt, user }`。
- token 为随机 32 字节字符串，数据库只存其 SHA-256 哈希。
- 会话默认 1 天，登录时 `remember=true` 为 30 天。
- 密码用 scrypt 加盐哈希存储。
- `AuthGuard` 为全局守卫，`@Public()` 放行注册、登录。token 无效或过期返回 401，前端会清除本地会话并跳转登录页。

用户对象字段：`id`、`username`、`email`、`avatarUrl`、`createdAt`。

会话校验时按 10 分钟节流更新 `lastUsedAt`，避免每个请求都写库。

## 限流

全局接入 `@nestjs/throttler`，基础限制每分钟 60 次，AI 生成类接口（简历诊断、项目优化、岗位匹配、模拟面试）每分钟 10 次。`UserThrottlerGuard` 按登录用户 id 计数，未登录接口退回按 IP；该守卫排在 `AuthGuard` 之后。计数为内存存储，重启清零、多实例不共享。

## 定时清理

`MaintenanceService` 通过 `@nestjs/schedule` 在启动时及每天凌晨 3 点删除 `AiCache`、`AuthSession` 中已过期（`expiresAt` 早于当前时间）的行。

## AI 服务

`AiService` 提供 `chat()`（一次性返回）和 `chatStream()`（流式返回）。默认以 `response_format: json_object` 要求模型返回 JSON，`thinking` 默认关闭，`temperature` 默认 0.2，`maxTokens` 默认 2000。

`AiService` 只是门面，实际协议由注入的 `AiProvider` 实现。当前实现是 `OpenAiCompatibleProvider`，对接 `/chat/completions` 协议，可用于 OpenAI、DeepSeek、Moonshot、本地 vLLM 等。换模型只需改环境变量：`AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL_FAST` / `AI_MODEL_QUALITY`。`AI_SEND_THINKING` 默认 `false`，即默认只发送纯 OpenAI 兼容的请求体；接 DeepSeek 并需要 `thinking` 参数时设为 `true`。接入新协议时只需新增一个 `AiProvider` 实现并在 `AiModule` 中注入，业务代码不变。

模型分级：诊断、项目优化、岗位匹配用 quality 档，面试出题、点评、总结用 fast 档。

| 功能     | 档位    | temperature | maxTokens |
| -------- | ------- | ----------- | --------- |
| 简历诊断 | quality | 0.2         | 2600      |
| 项目优化 | quality | 0.25        | 2400      |
| 岗位匹配 | quality | 0.2         | 2400      |
| 面试出题 | fast    | 0.35        | 1200      |
| 回答点评 | fast    | 0.3         | 1800      |
| 面试总结 | fast    | 0.25        | 1800      |

### 结果缓存

`AiCacheService` 缓存 AI 结果，缓存键为 `feature:model:version:promptHash`，`promptHash` 是对调用参数稳定序列化后的 SHA-256，TTL 默认 7 天。每个功能带独立版本号（如 `resume-analysis-v2`），Prompt 升级改版本号即可整体失效。流式与非流式接口通过 `AiCacheService.resolve()` 共用同一份缓存：命中直接返回，未命中才调用模型并写入；只有解析成功（合法 JSON）的结果才会写缓存。

### 流式输出（SSE）

每个 AI 功能除标准接口外都提供 `/stream` 版本，用 Server-Sent Events 推送，事件包括 `start`、`delta`（增量文本）、`usage`（token 用量）、`done`（最终结果）、`error`。前端 `streamRequest.ts` 用 fetch 读取流，`done` 的数据作为最终结果返回。

## 数据模型

Prisma + SQLite，主要表：

- `User`：账号
- `AuthSession`：登录会话，存 token 哈希与过期时间
- `Resume`：简历，归属 `userId`；`source` 为 `manual`（用户保存）或 `auto`（匹配/面试按文本临时创建），列表只展示 `manual`
- `ResumeAnalysis`：简历诊断记录
- `ProjectOptimization`：项目优化记录
- `JobDescription`：岗位 JD，同样有 `manual` / `auto` 的 `source`，列表只展示 `manual`
- `JobMatchAnalysis`：岗位匹配记录
- `InterviewSession`：面试会话，状态 `ongoing` / `finished`
- `InterviewMessage`：面试消息，`role` 为 `ai` / `user`
- `AiCache`：AI 结果缓存

完整字段见 `server/prisma/schema.prisma`。

## 接口

前缀均为 `/api`，除注册、登录外都需登录。AI 类接口结果外层带 `meta`：`status` 为 `success` 或 `parse_error`，`cached` 表示是否命中缓存（流式与非流式都会返回）。AI 输出解析失败时后端把原文放入降级字段返回，前端仍可正常渲染。

### 账号

```
POST   /api/auth/register     注册（公开）
POST   /api/auth/login        登录（公开）
GET    /api/auth/me           当前用户
PATCH  /api/auth/me           修改邮箱
POST   /api/auth/me/avatar    上传头像（multipart，字段 avatar，≤5MB，jpg/png/webp/gif）
POST   /api/auth/logout       退出登录
```

注册请求体：`username`（2–32）、`email`、`password`（6–72）。
登录请求体：`account`（用户名或邮箱）、`password`、`remember?`。

### 简历

```
POST   /api/resumes                    保存简历
GET    /api/resumes                    简历列表
GET    /api/resumes/:id                简历详情
PATCH  /api/resumes/:id                更新简历
DELETE /api/resumes/:id                删除简历
POST   /api/resumes/upload             上传解析文件（multipart，字段 file，pdf/docx/txt/md，≤5MB）
POST   /api/resumes/:id/analyze        诊断
POST   /api/resumes/:id/analyze/stream 诊断（SSE）
```

保存简历请求体：`title`（1–120）、`content`（1–30000）、`targetRole?`（≤80）、`experienceLevel?`（`'' | junior | 1-3 | 3-5 | 5+`）。
上传解析返回：`{ fileName, fileType, content, truncated }`。
诊断返回：`{ analysisId, score, result, meta }`。

### 项目优化

```
POST   /api/projects/optimize              优化
POST   /api/projects/optimize/stream       优化（SSE）
GET    /api/projects/optimizations         记录列表
GET    /api/projects/optimizations/:id     记录详情
DELETE /api/projects/optimizations/:id     删除记录
```

请求体：`rawContent`（1–8000）、`targetRole?`（≤80）、`techStack?`（≤20 项，每项 ≤40）、`style?`（`'' | 简洁专业 | 技术细节 | 社招强化 | 应届友好`）。

### 岗位匹配

```
POST   /api/jobs/match                 匹配分析
POST   /api/jobs/match/stream          匹配分析（SSE）
GET    /api/jobs/descriptions          JD 列表
GET    /api/jobs/descriptions/:id      JD 详情
DELETE /api/jobs/descriptions/:id      删除 JD
```

请求体：`resumeContent`（1–20000）、`resumeId?`、`jobTitle`（1–120）、`jobDescription`（1–10000）、`companyName?`（≤120）、`jobDescriptionId?`。未传 `resumeId` / `jobDescriptionId` 时，后端用传入文本即时落库再生成匹配记录。返回 `{ matchScore, result, meta }`。

### 模拟面试

```
POST   /api/interviews                              创建会话 + 首题
POST   /api/interviews/stream                       创建会话（SSE）
POST   /api/interviews/:sessionId/messages          提交回答
POST   /api/interviews/:sessionId/messages/stream   提交回答（SSE）
POST   /api/interviews/:sessionId/finish            结束并生成总结
POST   /api/interviews/:sessionId/finish/stream     结束（SSE）
```

创建请求体：`resumeContent`（1–20000）、`resumeId?`、`jobDescription?`（≤10000）、`jobDescriptionId?`、`targetRole`（1–80）、`interviewType`（`项目面试 | 技术面 | 综合面`）、`difficulty`（`简单 | 中等 | 困难`）。返回 `{ sessionId, firstQuestion, expectedPoints, meta }`。
提交回答请求体：`answer`（1–4000）。返回 `{ sessionId, feedback, nextQuestion, meta }`。会话结束后再次操作返回 409。
结束返回：`{ sessionId, totalScore, summary, strengths, weaknesses, studyPlan, meta }`。

### 历史记录

```
GET    /api/history?type=...   按类型查询，省略 type 返回全部按时间倒序
DELETE /api/history/:id        删除一条
```

`type` 取值：`resume-analysis`、`project-optimization`、`job-match`、`interview`。

## 文件解析与文本限制

PDF 用 pdf-parse，DOCX 用 mammoth，TXT / MD 直接按 UTF-8 读取，上传大小限制 5MB。

解析文本总上限 30000 字符。送入 AI 前按场景限制长度：简历 12000、岗位 JD 10000、项目 8000、面试回答 4000、面试记录 12000，超出截断并在末尾标注。

## 错误处理

全局异常过滤器统一返回 `{ statusCode, message, path, timestamp }`。多条校验错误用「；」拼接；multer 上传错误转为中文提示；5xx 对外返回通用提示，详细堆栈仅记入服务端日志；AI Key 未配置或不可用返回 503。
