# DevCareer AI

面向开发者的 PC 端 Web 应用，用 AI 辅助简历诊断、项目经历优化、岗位 JD 匹配、模拟面试、职业顾问对话和历史复盘。Monorepo，`web` 是 Vue 3 前端，`server` 是 NestJS 后端，`packages/shared` 存放前后端共享的接口类型。产品需求见 [docs/devcareer-ai-mvp.md](./docs/devcareer-ai-mvp.md)。

## 技术栈

- 前端：Vue 3、Vite、TypeScript、Vue Router、Pinia、Axios、ECharts、markdown-it、lucide-vue-next、Tailwind CSS v4
- 后端：NestJS 10、TypeScript、Prisma 6、PostgreSQL、class-validator / class-transformer、multer、pdf-parse、mammoth、axios
- AI：后端 `AiService` 封装 OpenAI 兼容的 Chat Completions API（可对接 DeepSeek、OpenAI、Moonshot、本地 vLLM 等）

## 目录结构

```txt
DevCareerAI
├── web              Vue 3 + Vite 前端
├── server           NestJS + Prisma 后端
├── packages/shared  前后端共享的接口类型
├── docs             产品需求与设计说明
└── README.md
```

后端 `server/src`：

```
config/env.validation.ts   启动时校验环境变量
common/filters             全局异常过滤器
common/guards              限流守卫与 AI 限流装饰器
common/utils               JSON 清洗、文本限制、SSE、结果状态判定
prisma                     PrismaService
prompts                    各功能 Prompt
modules/auth               注册登录、会话、守卫、角色、封禁校验
modules/admin              管理端用户管理（列表、角色、封禁，仅 admin）
modules/ai                 AiService、AiCacheService、AI 用量统计
modules/file               文件解析
modules/resume             简历
modules/project            项目优化
modules/job                岗位匹配
modules/interview          模拟面试
modules/chat               职业顾问对话
modules/dashboard          首页概览
modules/history            历史记录
modules/maintenance        定时清理过期数据
main.ts                    入口
```

前端 `web/src`：

```
api          请求封装（request 走 axios，streamRequest 走 SSE）
components    展示与交互组件
layout        布局与侧栏
router        路由与登录守卫
stores        Pinia（auth / workflow / interview / resume / chat）
types         类型定义（转发自 @devcareer/shared 的契约类型 + 前端专用视图模型）
utils         登录态持久化、格式化等
views         各页面
styles        Tailwind 与主题变量
```

## 共享类型

前后端的接口请求体和响应结构定义在 `packages/shared`，是一个只含类型声明、无运行时代码的包。前端在 `web/src/types` 下按域转发这些类型，后端 DTO 用 `implements` 约束对应的请求类型，改了契约两端会同时报类型错误，避免各写一份导致不一致。

## 环境变量

前端 `web/.env.development`：

```env
VITE_API_BASE_URL=/api
```

开发环境走 Vite 代理：前端请求 `/api` 由 `vite.config.ts` 中的 `server.proxy` 转发到 `http://localhost:3000`，因此不必依赖后端 CORS。推荐的同源 Docker 部署（nginx 反代，见 `docs/deployment.md`）无需改动此项；只有跨域部署时才需要把 `VITE_API_BASE_URL` 改成真实的 API 地址。

后端复制 `server/.env.example` 为 `server/.env`。AI 服务用通用的 `AI_*` 变量，指向任意 OpenAI 兼容端点：

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/devcareer"
PORT=3000

# access token 签名密钥，至少 32 位随机字符；refresh token 仅通过 HttpOnly Cookie 下发
JWT_ACCESS_SECRET="replace_with_at_least_32_random_chars"
# access token 有效期（分钟），可选，默认 15
ACCESS_TOKEN_TTL_MINUTES=15

AI_API_KEY="your_api_key_here"
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL_FAST="gpt-4o-mini"
AI_MODEL_QUALITY="gpt-4o"
AI_SEND_THINKING="false"
```

换成 DeepSeek 时把 `AI_BASE_URL` 设为 `https://api.deepseek.com`、模型改成对应名称，并把 `AI_SEND_THINKING` 设为 `true`（发送 DeepSeek 的 `thinking` 参数；纯 OpenAI 端点不识别该字段，保持 `false`）。

真实 API Key 只放在 `server/.env`，不要写入前端或提交到 Git。启动时会校验：`DATABASE_URL` 必填；`AI_API_KEY` 必填且不能是占位值；`AI_BASE_URL` 必填且为合法 http(s) 地址；快、慢模型分别由 `AI_MODEL_FAST` / `AI_MODEL_QUALITY` 提供；`JWT_ACCESS_SECRET` 必填且至少 32 位；`PORT`、`ACCESS_TOKEN_TTL_MINUTES` 若填写需为合法正整数（`PORT` 限 1–65535）；`CORS_ORIGIN` 若填写需为合法 origin（跨域部署用，见 `docs/deployment.md`）。不内置任何厂商的默认地址或模型，地址与模型必须显式配置。

## 安装与运行

根目录使用 npm workspaces，一次安装前后端依赖：

```bash
npm install
```

初始化数据库（需先在本机准备好 PostgreSQL 并建库，见 `docs/database-setup.md`）。首次拉取代码或换机器时，用 `prisma:deploy` 按已有迁移建表，再生成 Prisma Client（`deploy` 不会生成 client，monorepo 下 `npm install` 也不会自动生成）；只有在修改了 `schema.prisma` 需要生成新迁移时才用 `prisma:migrate`：

```bash
npm --prefix server run prisma:deploy
npm run prisma:generate
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
npm run format      # Prettier 格式化
npm run test        # 前后端单元测试（离线，无需数据库）
npm run test:e2e    # 后端接口层 e2e（需要 PostgreSQL 测试库，见下）
npm run build       # 前后端构建
npm run check       # 依次执行 typecheck、lint、test、build
```

代码风格由 Prettier 统一（无分号、单引号、行宽 100），ESLint 用扁平配置管前后端，两者靠 `eslint-config-prettier` 分工，格式问题只归 Prettier。提交时 husky + lint-staged 只对暂存文件跑 `eslint --fix` 和 `prettier --write`，commitlint 校验提交信息为 Conventional Commits 格式。

前后端测试统一使用 vitest（后端经 unplugin-swc 转译以支持 Nest 装饰器元数据）。分三层：

- **后端单测**（`server/test/*.test.ts`）：手写 stub 冒充 Prisma/AI 服务，离线可跑。覆盖鉴权与会话轮换、AI 缓存与用量、面试收口并发、各 `normalize*` 降级、聊天/看板/文件解析/维护清理等 service 分支。
- **前端测试**（`web/test/**/*.test.ts`）：纯函数与 store 单测，加上组件测试（@vue/test-utils + happy-dom，覆盖 ChatBox 交互、ChatMessage 的 Markdown/XSS 转义、Toast 通知等）与 `request.ts` 401 刷新拦截器测试。
- **后端接口层 e2e**（`server/test/e2e/*.e2e.ts`，`npm run test:e2e`）：supertest 驱动真实请求管道，连 PostgreSQL 测试库，AI 已替换为离线 stub。覆盖首用户成管理员、refresh cookie 轮换与复用吊销、守卫 401、登录限流 429、DTO 校验 400、跨用户数据边界。本地先建库 `CREATE DATABASE devcareer_test;`（默认连 `postgresql://postgres:postgres@localhost:5432/devcareer_test`，可用环境变量 `E2E_DATABASE_URL` 覆盖）；每次运行会自动执行迁移并清空该库，库名必须含 `_test`。

覆盖率：`npm --prefix server run test:cov` / `npm --prefix web run test:cov`（v8 provider，报告输出到各自 `coverage/`）。

后端启动时设置全局前缀 `api`、全局校验管道、全局异常过滤器，启用 CORS，并把 `/uploads` 作为静态目录用于头像访问。

## 鉴权

除注册、登录、刷新、登出外，所有接口都需要请求头 `Authorization: Bearer <accessToken>`。采用 access token + refresh token 双令牌：

- **access token**：短期 JWT（默认 15 分钟，`ACCESS_TOKEN_TTL_MINUTES` 可调），用 `JWT_ACCESS_SECRET` 签名，**只保存在前端内存**中，不写入 localStorage / sessionStorage，避免 XSS 直接读取。
- **refresh token**：随机串，仅通过 `path=/api/auth` 的 HttpOnly Cookie 下发；数据库只存其 SHA-256 哈希。刷新时轮换（旧 token 失效），若检测到已轮换的 refresh token 被再次使用，会吊销整个会话。
- 注册 / 登录 / 刷新成功返回 `{ accessToken, accessTokenExpiresAt, user }`，refresh token 通过 `Set-Cookie` 下发。
- access token 过期时，前端凭 refresh cookie 静默换取新 token（`POST /api/auth/refresh`），失败才清本地会话并跳转登录页。
- 密码用 scrypt 加盐哈希存储，校验用 `timingSafeEqual` 防时序攻击。
- refresh 会话默认 1 天，登录勾选 `remember=true` 为 30 天；会话校验按 10 分钟节流更新 `lastUsedAt`。过期时间在创建会话时确定，当前不做滑动续期。
- `AuthGuard` 为全局守卫，`@Public()` 放行注册、登录、刷新、登出；token 无效或过期返回 401。
- 用户有 `role`（`user` / `admin`）。空系统里第一个注册的用户自动成为管理员，此后注册均为普通用户。`@Roles('admin')` 用于限制管理员接口（如 AI 用量统计、用户管理）。
- 用户有 `status`（`active` / `disabled`）。被封禁（`disabled`）的用户：登录时验密通过也会被拒（返回 403），已存在的会话在下一次鉴权时即失效（`findSession` 直接判空）；封禁操作同时删除该用户所有会话，做到即时踢下线。
- 管理员重置某用户密码后，该用户 `mustChangePassword` 置为 `true`：登录后必须先改密（`PATCH /api/auth/password`），改密前除「改密 / 查询自身 / 登出」外的接口返回 403。

用户对象字段：`id`、`username`、`email`、`profession`、`avatarUrl`、`role`、`status`、`mustChangePassword`、`createdAt`。

## 限流

全局接入 `@nestjs/throttler`，基础限制每分钟 60 次，AI 生成类接口（简历诊断、项目优化、岗位匹配、模拟面试）每分钟 10 次，登录 / 注册 / 改密等敏感接口按更严格的每分钟 5 次限流。`UserThrottlerGuard` 按登录用户 id 计数，未登录接口退回按 IP；该守卫排在 `AuthGuard` 之后。计数为内存存储，重启清零、多实例不共享。

## 定时清理

`MaintenanceService` 通过 `@nestjs/schedule` 在启动时及每天凌晨 3 点执行清理：删除 `AiCache`、`AuthSession` 中已过期的行，以及无引用的 `auto` 简历 / JD（创建超过 24 小时且没有任何匹配、面试、对话关联），并把卡在 `summarizing` 过渡态超时的面试会话回滚为 `ongoing`。启动时的清理失败只记日志、不阻断服务启动。

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

`AiCacheService` 缓存 AI 结果，缓存键为 `feature:model:version:userId:promptHash`——**按用户隔离**（AI 结果是个性化内容，即使参数相同也不跨用户共享），`promptHash` 是对调用参数稳定序列化后的 SHA-256，TTL 默认 7 天（对话点评类结果用更短的 TTL）。每个功能带独立版本号（如 `resume-analysis-v3`），Prompt 或输出结构升级时改版本号即可整体失效旧缓存。流式与非流式接口通过 `AiCacheService.resolve()` 共用同一份缓存：命中直接返回，未命中才调用模型并写入；只有解析成功（合法 JSON）的结果才会写缓存。

### 流式输出（SSE）

每个 AI 功能除标准接口外都提供 `/stream` 版本，用 Server-Sent Events 推送，事件包括 `start`、`delta`（增量文本）、`usage`（token 用量）、`done`（最终结果）、`error`。前端 `streamRequest.ts` 用 fetch 读取流，`done` 的数据作为最终结果返回。

## 数据模型

Prisma + PostgreSQL，主要表：

- `User`：账号，`role` 为 `user` / `admin`，`status` 为 `active` / `disabled`（封禁后禁止登录），`mustChangePassword` 标记管理员重置密码后需强制改密
- `AuthSession`：登录会话，存 refresh token 哈希、版本号与过期时间
- `Resume`：简历，归属 `userId`；`source` 为 `manual`（用户保存）或 `auto`（匹配/面试按文本临时创建），列表只展示 `manual`
- `ResumeAnalysis`：简历诊断记录
- `ProjectOptimization`：项目优化记录
- `JobDescription`：岗位 JD，同样有 `manual` / `auto` 的 `source`，列表只展示 `manual`
- `JobMatchAnalysis`：岗位匹配记录
- `InterviewSession`：面试会话，状态 `ongoing` / `summarizing` / `finished`（`summarizing` 为生成总结中的过渡态）
- `InterviewMessage`：面试消息，`role` 为 `ai` / `user`
- `ChatSession`：职业顾问对话会话，可关联一份简历和一份 JD 作为上下文
- `ChatMessage`：对话消息，`role` 为 `ai` / `user`
- `AiCache`：AI 结果缓存
- `AiUsageLog`：每次 AI 调用的 token 用量记录，供用量统计汇总

无引用的 `auto` 简历 / JD（创建超过 24 小时且没有任何匹配、面试、对话记录关联）由 `MaintenanceService` 定时清理。完整字段见 `server/prisma/schema.prisma`。

## 接口文档

所有接口前缀均为 `/api`，除注册、登录、刷新、登出外都需登录。完整的接口列表、请求 / 响应结构，以及在线「Try it out」调试，见 Swagger UI：

- 本地启动后端后访问 `http://localhost:3000/api/docs`（仅非生产环境开放，生产环境关闭以免暴露 API 结构）。
- 请求 / 响应的 TypeScript 类型定义见 `packages/shared`（前后端共享同一份契约）。

AI 类接口结果外层带 `meta`：`status` 为 `success` 或 `parse_error`，`cached` 表示是否命中缓存（流式与非流式都会返回）。AI 输出解析失败时后端把原文放入降级字段返回，前端仍可正常渲染。

## 文件解析与文本限制

PDF 用 pdf-parse，DOCX 用 mammoth，TXT / MD 直接按 UTF-8 读取，上传大小限制 5MB。

解析文本总上限 30000 字符。送入 AI 前按场景限制长度：简历 12000、岗位 JD 10000、项目 8000、面试回答 4000、面试记录 12000，超出截断并在末尾标注。

## 错误处理

全局异常过滤器统一返回 `{ statusCode, message, path, timestamp }`。多条校验错误用「；」拼接；multer 上传错误转为中文提示；5xx 对外返回通用提示，详细堆栈仅记入服务端日志；AI Key 未配置或不可用返回 503。
