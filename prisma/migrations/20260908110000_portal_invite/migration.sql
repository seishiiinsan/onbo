-- CreateTable
CREATE TABLE "PortalInvite" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT,
    "email" TEXT NOT NULL,
    "portalLinkId" TEXT,
    "message" TEXT,
    "emailMessageId" TEXT,
    "sentByUserId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalInvite_projectId_sentAt_idx" ON "PortalInvite"("projectId", "sentAt");

-- AddForeignKey
ALTER TABLE "PortalInvite" ADD CONSTRAINT "PortalInvite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
