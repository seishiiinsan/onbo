-- AlterTable : identifiant de la cle de chiffrement (issue #33).
-- Les secrets existants ont tous ete chiffres avec ONBO_ENCRYPTION_KEY,
-- qui prend l'identifiant historique k0.
ALTER TABLE "Credential" ADD COLUMN "keyId" TEXT NOT NULL DEFAULT 'k0';

-- CreateIndex
CREATE INDEX "Credential_keyId_idx" ON "Credential"("keyId");
