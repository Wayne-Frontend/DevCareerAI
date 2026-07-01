-- AlterTable
ALTER TABLE "Resume" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "JobDescription" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
