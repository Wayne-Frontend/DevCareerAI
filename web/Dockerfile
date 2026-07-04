# ---- 构建阶段 ----
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY packages ./packages
COPY web ./web
RUN npm --prefix web run build

# ---- 运行阶段：nginx 托管静态资源并反代 API ----
FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/web/dist /usr/share/nginx/html
EXPOSE 80
