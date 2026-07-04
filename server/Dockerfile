# ---- 构建阶段：安装全部依赖、生成 Prisma client、编译 NestJS ----
FROM node:22-slim AS builder
WORKDIR /app

# 先复制包描述文件，最大化利用 Docker layer 缓存
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY packages ./packages
COPY server ./server
RUN npm --prefix server run prisma:generate \
  && npm --prefix server run build

# 只保留生产依赖，缩小运行时镜像
RUN npm prune --omit=dev

# ---- 运行阶段 ----
FROM node:22-slim
# Prisma 引擎依赖 openssl
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/package.json ./server/package.json

WORKDIR /app/server
EXPOSE 3000

# 启动前先应用未执行的 migration（幂等），DATABASE_URL 需指向可用的 PostgreSQL（compose 中由 db 服务提供）
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
