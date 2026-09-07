-- Les liens existants ne sont pas recuperables : seul leur hash etait stocke.
-- On les supprime, les agences en regenereront un.
DELETE FROM "PortalLink";

-- DropIndex
DROP INDEX "PortalLink_tokenHash_key";

-- AlterTable
ALTER TABLE "PortalLink" DROP COLUMN "tokenHash",
ADD COLUMN     "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PortalLink_token_key" ON "PortalLink"("token");

