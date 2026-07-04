# DevCareer AI — Claude Code 项目指引

面向开发者的 AI 求职工具:简历诊断、项目优化、岗位匹配、模拟面试、职业顾问对话、历史复盘。npm workspaces monorepo:

- `web/`: Vue 3 + Vite + TypeScript + Pinia + Tailwind v4 客户端(细则见 `web/CLAUDE.md`)
- `server/`: NestJS + Prisma + PostgreSQL API 服务(细则见 `server/CLAUDE.md`)
- `packages/shared/`: 前后端共享的接口类型(纯 `.d.ts` 类型声明,无运行时代码)
- `docs/`: 产品与实现说明(文档与代码冲突时以代码为准,并在总结中指出)

## 最高优先级规则

- 优先复用已有组件、API 封装、类型、store、工具函数和后端 service,不要重复造轮子。
- 破坏性操作(删除/清空文件、重命名关键文件、移动目录、大规模替换)必须先说明原因并等待确认。
- 不擅自新增依赖;确需时先说明原因、替代方案、影响范围和安装命令,等待确认。
- 不擅自改变接口字段、组件 props/emits/slot、路由、store 结构、Prisma schema 或公共方法签名。
- 不确定业务含义、字段规则、AI 输出结构、缓存策略时,不要猜测;说明不确定点并给出建议。
- 不为了通过构建而删除业务代码;先分析根因。
- 不留下无用 import、未使用变量、`debugger`、临时 `console.log`。
- 所有文件统一 UTF-8;发现中文乱码先判断编码来源,不要盲目覆盖历史文档。
- 完成修改后用中文总结:改了什么、涉及文件、原因、风险点、是否运行了测试/构建(没运行就明说)。不要编造验证结果。

## 跨端类型契约(monorepo 最重要的约定)

接口的请求体和响应类型**只在 `packages/shared` 定义一份**:

- 后端 DTO 用 `implements` 绑定 shared 里的请求类型(配合 class-validator 装饰器)。
- 前端 `web/src/types` 按域转发 shared 类型,页面/组件从 `web/src/types` 引用,不要临时复制。
- 改接口契约时改 `packages/shared`,让前后端同步产生类型报错,不要两边各写一份。

## 业务边界(代码里看不出来的隐性规则)

- 项目已有完整的注册/登录/鉴权/角色体系,不要按「无登录 MVP」假设设计。
- 「首个注册用户自动成为管理员」的引导逻辑不可更改。
- 管理端自锁保护:不能改自己角色、封禁自己,不能把最后一名启用管理员降级或封禁。
- 用户有 `status` 字段(`active`/`disabled`);封禁同时删除其会话实现即时踢下线。
- AI 输出不能编造用户未提供的经历、公司、项目、指标;缺少量化信息只能建议用户补充。
- AI 缓存命中与 prompt/payload/model/version 相关;调整 prompt 或输出结构时必须考虑缓存版本,否则会命中旧结构的缓存。
- 简历、JD、面试回答属敏感内容:注意脱敏、边界校验;所有涉及用户数据的查询必须带当前用户边界,防止跨用户读取。

## 验证命令(按改动范围选最小验证)

- 前端:`npm --prefix web run typecheck` / `build` / `test`
- 后端:`npm --prefix server run typecheck` / `test` / `build`
- Lint:`npm run lint`(零警告基线,`--max-warnings 0`);格式化:`npm run format`
- Prisma:改了 schema → `npm --prefix server run prisma:migrate`;仅同步已有迁移 → `prisma:deploy`
- 全量:`npm run check`(typecheck + lint + test + build);本地开发:`npm run dev`

## 环境与密钥

- 环境变量校验在 `server/src/config/env.validation.ts`,新增变量要同步校验规则和 `server/.env.example`;不要提交真实 `.env`。
- 关键变量:`DATABASE_URL`、`JWT_ACCESS_SECRET`、`AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL_FAST`/`AI_MODEL_QUALITY`。
- 任何 AI API Key、模型服务端配置绝不进前端代码、日志或响应。

## 注释与文档

- 复杂逻辑、核心业务流程、非直观实现:加中文注释说明原因和边界条件;显而易见的代码不加噪音注释。
- 更新接口、环境变量、数据模型时,同步考虑 README、docs 和 `.env.example`。
