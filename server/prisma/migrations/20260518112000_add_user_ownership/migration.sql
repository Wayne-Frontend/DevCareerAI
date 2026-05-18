-- Add nullable ownership columns so existing local MVP records remain readable to Prisma.
-- New application writes always set userId, and service queries only expose current-user rows.
ALTER TABLE "Resume" ADD COLUMN "userId" TEXT REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectOptimization" ADD COLUMN "userId" TEXT REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobDescription" ADD COLUMN "userId" TEXT REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewSession" ADD COLUMN "userId" TEXT REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");
CREATE INDEX "ProjectOptimization_userId_idx" ON "ProjectOptimization"("userId");
CREATE INDEX "JobDescription_userId_idx" ON "JobDescription"("userId");
CREATE INDEX "InterviewSession_userId_idx" ON "InterviewSession"("userId");
