#!/usr/bin/env node
/**
 * Re-chiffrement progressif du coffre (issue #33).
 *
 * Usage :
 *   node scripts/rekey.mjs            # re-chiffre vers la cle active
 *   node scripts/rekey.mjs --dry-run  # inventaire, sans ecriture
 *   node scripts/rekey.mjs --batch 200
 *
 * Sans interruption de service : les secrets sont traites par lots, chacun
 * dans sa propre transaction. Une execution interrompue peut etre relancee,
 * elle reprend ou elle s'etait arretee.
 */
import { PrismaClient } from "@prisma/client";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const KEY_ENV = "ONBO_ENCRYPTION_KEY";
const KEYS_ENV = "ONBO_ENCRYPTION_KEYS";
const ACTIVE_ENV = "ONBO_ENCRYPTION_KEY_ID";
const LEGACY_KEY_ID = "k0";

function decode(name, raw) {
  const buffer = Buffer.from(raw.trim(), "base64");
  if (buffer.length !== 32) {
    throw new Error(`La clé « ${name} » doit contenir 32 octets en base64.`);
  }
  return buffer;
}

function keyring() {
  const keys = new Map();
  if (process.env[KEY_ENV]) {
    keys.set(LEGACY_KEY_ID, decode(LEGACY_KEY_ID, process.env[KEY_ENV]));
  }
  for (const entry of (process.env[KEYS_ENV] ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(":");
    if (separator < 1) throw new Error(`${KEYS_ENV} attend « identifiant:base64 ».`);
    keys.set(trimmed.slice(0, separator).trim(), decode("clé", trimmed.slice(separator + 1)));
  }
  if (keys.size === 0) throw new Error(`Aucune clé : renseignez ${KEYS_ENV}.`);

  const requested = process.env[ACTIVE_ENV]?.trim();
  if (requested && !keys.has(requested)) {
    throw new Error(`${ACTIVE_ENV}=${requested} absente du trousseau.`);
  }
  return { keys, activeId: requested ?? [...keys.keys()].at(-1) };
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const batchSize = Number(
  args.includes("--batch") ? args[args.indexOf("--batch") + 1] : 100,
);

const { keys, activeId } = keyring();
const prisma = new PrismaClient();

const total = await prisma.credential.count({ where: { keyId: { not: activeId } } });
console.log(`Clé active : ${activeId}`);
console.log(`Secrets à re-chiffrer : ${total}`);

if (dryRun) {
  const parLot = await prisma.credential.groupBy({
    by: ["keyId"],
    _count: { _all: true },
  });
  for (const row of parLot) {
    console.log(`  ${row.keyId} : ${row._count._all}`);
  }
  await prisma.$disconnect();
  process.exit(0);
}

let done = 0;
/** Ids ecartes (cle absente, secret illisible) : ne pas les reboucler. */
const skipped = new Set();

for (;;) {
  const batch = await prisma.credential.findMany({
    where: { keyId: { not: activeId }, id: { notIn: [...skipped] } },
    take: batchSize,
  });
  if (batch.length === 0) break;

  for (const credential of batch) {
    const oldKey = keys.get(credential.keyId || LEGACY_KEY_ID);
    if (!oldKey) {
      console.error(
        `! ${credential.id} : clé « ${credential.keyId} » absente du trousseau, ignoré`,
      );
      skipped.add(credential.id);
      continue;
    }

    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        oldKey,
        Buffer.from(credential.secretIv, "base64"),
      );
      decipher.setAuthTag(Buffer.from(credential.secretTag, "base64"));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(credential.secretCipher, "base64")),
        decipher.final(),
      ]);

      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", keys.get(activeId), iv);
      const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);

      await prisma.credential.update({
        where: { id: credential.id },
        data: {
          secretCipher: encrypted.toString("base64"),
          secretIv: iv.toString("base64"),
          secretTag: cipher.getAuthTag().toString("base64"),
          keyId: activeId,
        },
      });
      done += 1;
    } catch (error) {
      console.error(`! ${credential.id} : ${error.message}`);
      skipped.add(credential.id);
    }
  }

  console.log(`… ${done}/${total}`);
}

console.log(`Terminé : ${done} re-chiffré(s), ${skipped.size} en échec.`);
await prisma.$disconnect();
process.exit(skipped.size > 0 ? 1 : 0);
