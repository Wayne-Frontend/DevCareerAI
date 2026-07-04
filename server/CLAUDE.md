# server/ — 后端开发规则

NestJS + TypeScript + Prisma + PostgreSQL。全局 API 前缀 `/api`。

## 分层与模块

- Controller 保持薄:只处理参数、用户上下文和响应;业务逻辑放对应 Service。
- 业务模块在 `src/modules`:auth、resume、project、job、interview、chat、history、dashboard、admin、ai、file、maintenance。
- 通用能力优先复用 `src/common/utils` 已有工具(文本限长、AI 状态、重试、稳定 JSON、token 估算、文件签名等),不要另写一份。

## 鉴权与权限

- 全局鉴权守卫 `AuthGuard`;公开接口用 `@Public()` 放行;管理员接口用 `@Roles('admin')`(admin 模块全模块限制)。
- 涉及用户数据的查询必须带当前用户边界,禁止跨用户读取历史、简历、岗位、项目优化、面试和对话记录。

## AI 调用(核心约束)

- AI 调用必须经过 `src/modules/ai/AiService`(含普通与流式);业务模块不直接请求模型服务,不把 API Key 暴露到日志或响应。
- Prompt 统一放 `src/prompts`(按域拆分:resume/project/job/interview/chat),不要把长 prompt 散落在 controller/service 里。
- AI 结果缓存由 `AiCacheService` + Prisma `AiCache` 模型承载;用量记入 `AiUsageLog`。改 prompt 或输出结构时考虑缓存版本。
- AI JSON 解析和兜底复用 `src/common/utils/json-response.util.ts`;解析失败保留可展示原文,不让前端崩溃。
- SSE 响应复用 `src/common/utils/sse.util.ts`,保持 `start`、`delta`、`usage`、`done`、`error` 事件语义稳定,前端 streamRequest 依赖这些事件名。

## DTO 与类型契约

- DTO 用 `class-validator`/`class-transformer`,全局 `ValidationPipe` 开启 `whitelist` + `transform`。
- DTO 用 `implements` 绑定 `@devcareer/shared` 里的请求类型;改字段先改 `packages/shared`,不要前后端各写一份。

## Prisma

- schema 在 `prisma/schema.prisma`;改 schema、migration 和 service 返回结构要同步维护,不要只改数据库不改类型和前端调用。
- 改了 schema:`npm run prisma:migrate`;仅同步已有迁移:`npm run prisma:deploy`。

## 环境与日志

- 环境变量校验在 `src/config/env.validation.ts`,新增变量同步校验规则和 `.env.example`;不要绕过校验或提交真实 `.env`。
- 日志禁止打印:完整简历、完整 JD、完整 AI prompt、完整 AI 返回内容、token、API Key、密码哈希。

## 测试

- 测试入口 `npm run test`(`test/run-tests.ts`,ts-node 自研 runner,非 jest)。
