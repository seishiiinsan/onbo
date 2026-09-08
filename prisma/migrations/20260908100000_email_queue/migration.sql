-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "EmailCategory" AS ENUM ('LOGIN', 'PORTAL', 'REMINDER', 'NOTIFICATION', 'OTHER');

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "html" TEXT,
    "replyTo" TEXT,
    "category" "EmailCategory" NOT NULL DEFAULT 'OTHER',
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT,
    "providerId" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "bounceReason" TEXT,
    "agencyId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailMessage_status_nextAttemptAt_idx" ON "EmailMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailMessage_providerId_idx" ON "EmailMessage"("providerId");

-- CreateIndex
CREATE INDEX "EmailMessage_projectId_idx" ON "EmailMessage"("projectId");

-- CreateIndex
CREATE INDEX "EmailMessage_to_idx" ON "EmailMessage"("to");
