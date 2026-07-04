-- 管理员重置密码流程：重置后置为 true，用户改密成功后清除。
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
