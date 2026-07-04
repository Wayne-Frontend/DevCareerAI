-- AiUsageLog 新增 usageSource：'reported' = 服务上报的精确用量；'estimated' = usage 丢失时按文本长度估算的兜底值。
ALTER TABLE "AiUsageLog" ADD COLUMN "usageSource" TEXT NOT NULL DEFAULT 'reported';

-- InterviewMessage 新增会话内消息序号，替代"createdAt +1ms"的排序 hack；历史数据为 0，靠 createdAt 兜底。
ALTER TABLE "InterviewMessage" ADD COLUMN "seq" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "InterviewMessage_sessionId_seq_idx" ON "InterviewMessage"("sessionId", "seq");

-- 缓存键格式变更（加入 userId 隔离），旧格式的缓存行永远不会再被命中，直接清空。
DELETE FROM "AiCache";
