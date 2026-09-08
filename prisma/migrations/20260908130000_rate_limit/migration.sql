-- CreateEnum
CREATE TYPE "AbuseKind" AS ENUM ('LOGIN_IP', 'LOGIN_EMAIL', 'PORTAL_PROBE', 'PORTAL_UPLOAD', 'PORTAL_MESSAGE', 'PORTAL_ACTION', 'QUOTA_PROJECT', 'QUOTA_AGENCY');

-- CreateTable
CREATE TABLE "RateCounter" (
    "bucket" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCounter_pkey" PRIMARY KEY ("bucket", "windowStart")
);

-- CreateIndex
CREATE INDEX "RateCounter_expiresAt_idx" ON "RateCounter"("expiresAt");

-- CreateTable
CREATE TABLE "AbuseEvent" (
    "id" TEXT NOT NULL,
    "kind" "AbuseKind" NOT NULL,
    "bucket" TEXT NOT NULL,
    "ip" TEXT,
    "email" TEXT,
    "projectId" TEXT,
    "path" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbuseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbuseEvent_kind_createdAt_idx" ON "AbuseEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "AbuseEvent_createdAt_idx" ON "AbuseEvent"("createdAt");
