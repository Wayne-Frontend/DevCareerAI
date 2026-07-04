# 数据库初始化与多设备同步指南

本项目后端使用 **Prisma + PostgreSQL**。每台开发设备连接各自的本地 PostgreSQL 实例（库内数据各自独立，不互通）。

git 里同步的是两样东西：

- `server/prisma/schema.prisma` —— 数据库结构的"设计图"（有哪些表、哪些字段）。
- `server/prisma/migrations/` —— 一串按时间排序的 SQL 脚本（迁移文件），记录结构是如何一步步演变到现在的。

任何一台设备只要按顺序执行完这串脚本，就能得到和设计图一致的数据库。Prisma 会在库里维护一张 `_prisma_migrations` 表，记录"哪些脚本已经跑过了"，因此重复执行是安全的——已跑过的会自动跳过。

理解了这一点，下面所有操作就都好懂了：**你要做的永远只是"把还没跑的迁移脚本跑一遍"**。

---

## 〇、前置条件：本机要有 PostgreSQL

任选其一：

**方式 A：Docker（推荐，一条命令）**

```bash
docker run -d --name devcareer-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=devcareer postgres:16-alpine
```

**方式 B：本机安装**（Windows 用 [EDB 安装包](https://www.postgresql.org/download/windows/)，macOS 用 `brew install postgresql@16`）

安装后需要建一个库（Docker 方式已通过 `POSTGRES_DB` 自动建好）：

```sql
CREATE DATABASE devcareer;
```

> Windows 下可用开始菜单的 "SQL Shell (psql)" 或 pgAdmin 执行。

---

## 一、在新设备上首次初始化

在项目根目录依次执行：

```bash
# 1. 安装依赖（monorepo，根目录装一次即可）
npm install

# 2. 创建后端环境变量文件
cp server/.env.example server/.env
# 编辑 server/.env：把 DATABASE_URL 改成本机 PostgreSQL 的连接串（用户/密码/端口/库名），
# 并填入你的 AI_API_KEY 等配置。连接串格式：
#   postgresql://用户:密码@localhost:5432/devcareer

# 3. 初始化数据库：按顺序执行所有迁移脚本，在库里建出全部表
npm run prisma:migrate

# 4. 启动
npm run dev
```

第 3 步执行时 Prisma 发现库是空的，会从头跑完全部迁移，结束后数据库结构就和最新代码完全一致了。

> 首个注册的用户会自动成为管理员，无需额外配置。

---

## 二、日常同步：在另一台设备上 `git pull` 之后

如果别的设备提交了新的数据库改动（新表、新字段），pull 下来后本机的库就落后了。此时：

```bash
git pull
npm install            # 依赖有变动时需要；不确定就跑一下，很快
npm run prisma:migrate
```

`prisma:migrate` 会对比 `migrations/` 目录和本机库里的 `_prisma_migrations` 记录，只执行本机还没跑过的那几个新脚本，已有数据不受影响。

**判断是否需要跑迁移的简单办法**：`git pull` 的输出里如果出现了 `server/prisma/migrations/` 下的新文件，就需要跑。跑了也无害，所以拿不准就直接跑。

如果跳过这一步直接 `npm run dev`，典型症状是接口报错类似：

```
The column `User.xxx` does not exist in the current database
```

意思就是"代码认为有这个字段，但你本机数据库还没加上"——跑一次 `npm run prisma:migrate` 即可。

---

## 三、本机修改了数据库结构（改了 schema.prisma）之后

改完 `server/prisma/schema.prisma`，执行：

```bash
cd server
npx prisma migrate dev --name 描述这次改动的英文名   # 例如 add_user_phone
```

这一步会：生成一个新的迁移脚本到 `migrations/` 目录、在本机库执行它、并重新生成 Prisma Client（TypeScript 类型）。

然后**务必把新生成的 `migrations/xxx/` 目录连同 `schema.prisma` 一起提交到 git**，其他设备才能通过第二节的流程同步到这次改动。

> `prisma migrate dev` 需要临时创建 shadow database 做校验，本地用 `postgres` 超级用户（或有 `CREATEDB` 权限的用户）连接即可，无需额外配置。

### ⚠️ 两条铁律（本项目之前的故障都源于违反它们）

1. **永远不要用 `prisma db push` 改结构。** `db push` 直接改库但不生成迁移脚本，会导致"库里有表、迁移历史里却没有"，其他设备（以及未来的自己）执行迁移时就会撞上 `table already exists` 这类错误。
2. **永远不要手动修改或重建 `migrations/` 目录里已提交的 SQL 文件。** Prisma 对每个迁移文件记录了校验和，文件内容一旦和执行时不一致，就会报 "migration was modified after it was applied" 并拒绝继续。写错了就再生成一个新迁移去修正，而不是回头改旧文件。

---

## 四、故障排查

### 症状 A：`migrate` 报 "Drift detected" / 提示要 reset

原因：本机库的实际结构和迁移历史对不上了（通常是违反了上面的铁律，或库是旧实验遗留的）。

**开发库里没有需要保留的数据时，最省事的修法就是重建：**

```bash
cd server
npx prisma migrate reset
```

它会清空本机这个库、从头跑完所有迁移。代价是本机数据清空（重新注册一个账号即可）。它只影响你本机 PostgreSQL 里的这一个库，**不会影响其他设备**。

### 症状 B：报 "A migration failed to apply. New migrations cannot be applied before the error is recovered"

原因：某次迁移执行到一半失败，失败记录卡在库里，阻塞了后续迁移。开发环境下同样直接 `npx prisma migrate reset` 重建即可。

### 症状 C：代码里 Prisma 的类型不对 / 编辑器提示某字段不存在

数据库是对的，但 Prisma Client（生成的 TS 代码）没更新。执行：

```bash
npm run prisma:generate
```

（`npx prisma migrate dev` 和 `reset` 会自动做这一步，通常只在只 pull 了代码、别人已生成过迁移的场景需要手动跑。）

### 症状 D：启动报缺少环境变量 / DATABASE_URL

`server/.env` 不存在或不完整。`.env` 不进 git，每台设备都要按第一节第 2 步单独创建。

### 症状 E：报 "Can't reach database server at localhost:5432"

本机 PostgreSQL 没在运行。Docker 方式执行 `docker start devcareer-pg`；安装版检查 Windows 服务 / `brew services` 里的 postgresql 是否启动。

---

## 五、速查表

| 场景                  | 命令（项目根目录）                                                                   |
| --------------------- | ------------------------------------------------------------------------------------ |
| 新设备首次搭建        | 装 PostgreSQL 并建库 → `npm install` → 建 `server/.env` → `npm run prisma:migrate`   |
| pull 到别人的结构改动 | `npm run prisma:migrate`                                                             |
| 自己要改表结构        | 改 `schema.prisma` → `cd server && npx prisma migrate dev --name xxx` → 提交迁移文件 |
| 本机库坏了/对不上     | `cd server && npx prisma migrate reset`（清空本机数据）                              |
| 类型/字段提示不对     | `npm run prisma:generate`                                                            |
| 数据库连不上          | 确认本机 PostgreSQL 服务在运行（见症状 E）                                           |
