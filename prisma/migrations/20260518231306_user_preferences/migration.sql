-- AlterTable
ALTER TABLE "users"
ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "darkMode" BOOLEAN NOT NULL DEFAULT false;
