# DevCareer AI

DevCareer AI 是一个面向开发者的 PC Web MVP，用 AI 辅助完成简历诊断、项目经历优化、岗位 JD 匹配、模拟面试和历史复盘。

## 技术栈

- 前端：Vue 3、Vite、TypeScript、Vue Router、Pinia、Axios、Tailwind CSS、lucide-vue-next
- 后端：NestJS、TypeScript、Prisma、SQLite、class-validator、multer、pdf-parse、mammoth
- AI：后端 `AiService` 封装 DeepSeek Chat Completions API

## 目录结构

```txt
DevCareerAI
|-- web        # Vue 3 + Vite 前端
|-- server     # NestJS + Prisma API
|-- docs       # 产品与实现文档
|-- AGENTS.md
`-- README.md
```

## 环境变量

前端：`web/.env.development`

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

后端：复制 `server/.env.example` 为 `server/.env` 并填写：

```env
DATABASE_URL="file:./dev.db"
DEEPSEEK_API_KEY="your_api_key_here"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-pro"
PORT=3000
```

真实 DeepSeek API Key 只应放在 `server/.env`，不要写入前端代码或提交到 Git。

## 安装

```bash
npm install
```

## 数据库初始化

```bash
npm run prisma:migrate
```

SQLite 数据库会创建在 `server/prisma/dev.db`。

## 启动

同时启动前后端：

```bash
npm run dev
```

默认开发命令不会写入日志文件。如果需要保留启动日志，请使用统一入口：

```bash
npm run dev:log
```

该命令只会写入 `logs/dev.log`，并关闭彩色控制字符，避免 Windows 下出现大量零散乱码日志。清理日志：

```bash
npm run clean:logs
```

单独启动：

```bash
npm run dev:web
npm run dev:server
```

默认地址：

- Web: http://localhost:5173
- API: http://localhost:3000/api

## MVP 功能

- 简历诊断：保存简历，调用 AI 生成评分、维度评分、优势、问题、建议和优化示例。
- 项目经历优化：根据原始项目描述生成项目名称、描述、技术栈、职责、亮点、难点和面试追问。
- 岗位 JD 匹配：分析简历与 JD 的匹配度，输出关键词、风险点、简历修改建议和面试准备建议。
- 模拟面试：创建面试会话，生成首题，提交回答后获得点评、参考回答和追问，结束时生成总结。
- 历史记录：保存并展示四类业务记录，支持查看详情和删除。
