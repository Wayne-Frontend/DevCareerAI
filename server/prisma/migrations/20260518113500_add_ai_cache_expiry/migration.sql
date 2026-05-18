ALTER TABLE "AiCache" ADD COLUMN "version" TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE "AiCache" ADD COLUMN "expiresAt" DATETIME;

CREATE INDEX "AiCache_expiresAt_idx" ON "AiCache"("expiresAt");
