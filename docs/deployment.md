# 部署指南

## 部署形态

推荐使用仓库自带的 Docker 编排做**同源部署**：nginx（web 容器）对外提供服务，静态资源本地托管，`/api` 与 `/uploads` 反向代理到 server 容器。同源部署下浏览器不产生跨域请求，无需配置 CORS。

```
浏览器 ──► web (nginx :80)
              ├── /            前端静态资源（SPA fallback）
              ├── /api/*   ──► server (NestJS :3000)
              └── /uploads/* ─► server（用户头像等上传文件）
```

## 快速开始

```bash
# 1. 准备环境变量（compose 会读取项目根目录的 .env）
cp server/.env.example .env
#    编辑 .env，至少填好：JWT_ACCESS_SECRET、AI_API_KEY、AI_BASE_URL、AI_MODEL_FAST、AI_MODEL_QUALITY

# 2. 构建并启动
docker compose up -d --build

# 3. 访问 http://<主机>:8080（端口可用 WEB_PORT 覆盖）
```

server 容器启动时会自动执行 `prisma migrate deploy`（幂等），首次启动即完成建库。**空库中第一个注册的用户自动成为管理员**，部署完成后请立即注册，避免管理员位置被他人抢注。

## 环境变量

| 变量                                 | 必填 | 说明                                                                                                     |
| ------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET`                  | ✅   | access token 签名密钥，至少 32 位随机字符（`openssl rand -base64 48`）                                   |
| `AI_API_KEY` / `AI_BASE_URL`         | ✅   | 任意 OpenAI 兼容端点（DeepSeek、OpenAI、vLLM 等）                                                        |
| `AI_MODEL_FAST` / `AI_MODEL_QUALITY` | ✅   | 快速/高质量两档模型名                                                                                    |
| `AI_SEND_THINKING`                   |      | 服务支持 thinking 开关（如 DeepSeek）时设 `true`，默认 `false`                                           |
| `ACCESS_TOKEN_TTL_MINUTES`           |      | access token 有效期，默认 15 分钟                                                                        |
| `WEB_PORT`                           |      | 对外端口，默认 8080                                                                                      |
| `CORS_ORIGIN`                        |      | **仅跨域部署需要**：逗号分隔的完整 origin 白名单。生产环境未配置时不放行任何跨域请求（同源反代不受影响） |
| `DATABASE_URL`                       |      | compose 已固定为 `file:/data/devcareer.db`（volume 持久化），一般无需改动                                |

## 数据持久化与备份

两个需要备份的 volume：

- `server-data`：SQLite 数据库文件（`/data/devcareer.db`）
- `server-uploads`：用户上传的头像等文件（`/app/server/uploads`）

```bash
# 备份（SQLite 单文件，冷备最稳妥；服务低峰期执行）
docker compose exec server sh -c 'cp /data/devcareer.db /data/backup-$(date +%Y%m%d).db'
docker cp $(docker compose ps -q server):/data/backup-$(date +%Y%m%d).db ./backups/

# 恢复：停止 server → 覆盖 /data/devcareer.db → 重启
```

## 升级流程

```bash
git pull
docker compose build
docker compose up -d      # server 启动时自动执行新增 migration
```

回滚注意：**migration 不可自动回退**，升级前请先备份数据库文件。

## SQLite 的适用边界

当前使用 SQLite 单文件数据库，适合单机、中小规模使用：

- **不支持多实例横向扩展**（文件锁），扩容前需先迁移到 PostgreSQL；
- 写并发能力有限，AI 调用为主的负载下通常不是瓶颈；
- 迁移路径：修改 `server/prisma/schema.prisma` 的 `datasource` 为 `postgresql`，重新生成 migration，用 `pgloader` 或脚本迁移数据。

同理，进程内存实现的限流（@nestjs/throttler 默认 storage）也只在单实例下有效。

## 常见问题

- **启动即退出，日志报 `Invalid environment configuration`**：`.env` 缺少必填项，按报错列表补齐。
- **前端正常但接口 502**：server 容器还在启动（首次 migrate），或健康检查未过，`docker compose logs server` 查看。
- **跨域部署时浏览器报 CORS 错误**：配置 `CORS_ORIGIN` 为前端完整 origin（含协议与端口），多个用逗号分隔。
- **SSE 流式接口无响应/一次性返回**：确认反代层未开启缓冲（自带 nginx.conf 已配置 `proxy_buffering off`；若外层还有 CDN/网关，需同样放行流式响应）。
