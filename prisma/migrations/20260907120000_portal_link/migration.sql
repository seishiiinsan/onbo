-- CreateTable
CREATE TABLE "PortalLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalLink_tokenHash_key" ON "PortalLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalLink_projectId_idx" ON "PortalLink"("projectId");

-- AddForeignKey
ALTER TABLE "PortalLink" ADD CONSTRAINT "PortalLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

