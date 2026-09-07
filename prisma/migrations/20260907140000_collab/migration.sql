-- CreateEnum
CREATE TYPE "CommentAuthor" AS ENUM ('AGENCY', 'CLIENT');

-- CreateEnum
CREATE TYPE "CredentialKind" AS ENUM ('HOSTING', 'DOMAIN', 'CMS', 'SOCIAL', 'ANALYTICS', 'OTHER');

-- DropIndex
DROP INDEX "PortalLink_tokenHash_key";

-- AlterTable
ALTER TABLE "PortalLink" DROP COLUMN "tokenHash",
ADD COLUMN     "token" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" "CommentAuthor" NOT NULL,
    "authorName" TEXT,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "stepId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedByClient" BOOLEAN NOT NULL DEFAULT false,
    "stepId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "CredentialKind" NOT NULL DEFAULT 'OTHER',
    "username" TEXT,
    "url" TEXT,
    "secretCipher" TEXT NOT NULL,
    "secretIv" TEXT NOT NULL,
    "secretTag" TEXT NOT NULL,
    "notes" TEXT,
    "stepId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialAccess" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_stepId_idx" ON "Comment"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_stepId_idx" ON "Asset"("stepId");

-- CreateIndex
CREATE INDEX "Credential_stepId_idx" ON "Credential"("stepId");

-- CreateIndex
CREATE INDEX "CredentialAccess_credentialId_idx" ON "CredentialAccess"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalLink_token_key" ON "PortalLink"("token");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialAccess" ADD CONSTRAINT "CredentialAccess_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

