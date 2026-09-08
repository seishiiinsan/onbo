#!/usr/bin/env node
/**
 * Migration des fichiers du volume disque vers le stockage objet (issue #32).
 *
 * Usage :
 *   node scripts/migrate-storage.mjs --dry-run
 *   node scripts/migrate-storage.mjs
 *   node scripts/migrate-storage.mjs --delete-local   # apres verification
 *
 * Sans coupure : les objets sont copies un a un sous la meme cle. Tant que la
 * copie n'est pas finie, l'application peut continuer a servir depuis le
 * disque ; on bascule en renseignant les variables S3_*.
 */
import { readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { createHash, createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const ROOT = process.env.UPLOAD_DIR ?? "/app/uploads";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const deleteLocal = args.includes("--delete-local");

const config = {
  endpoint: (process.env.S3_ENDPOINT ?? "").replace(/\/+$/, ""),
  region: process.env.S3_REGION ?? "fr-par",
  bucket: process.env.S3_BUCKET,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
};

if (!config.endpoint || !config.bucket || !config.accessKeyId) {
  console.error("Variables S3_* manquantes : rien à faire.");
  process.exit(1);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();

function objectUrl(key) {
  const base = new URL(config.endpoint);
  if (!config.forcePathStyle) base.host = `${config.bucket}.${base.host}`;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const p = config.forcePathStyle ? `/${config.bucket}/${encoded}` : `/${encoded}`;
  return new URL(`${base.origin}${p}`);
}

async function put(key, body, contentType) {
  const url = objectUrl(key);
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);

  const headers = {
    host: url.host,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const entries = Object.entries(headers).sort(([a], [b]) => (a < b ? -1 : 1));
  const canonical = entries.map(([n, v]) => `${n}:${v}\n`).join("");
  const signed = entries.map(([n]) => n).join(";");

  const canonicalRequest = ["PUT", url.pathname, "", canonical, signed, payloadHash].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const key4 = hmac(hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), "s3"), "aws4_request");
  const signature = createHmac("sha256", key4).update(toSign).digest("hex");

  return fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
    },
    body: new Uint8Array(body),
  });
}

const prisma = new PrismaClient();
const assets = await prisma.asset.findMany({
  select: { id: true, storageKey: true, mimeType: true, filename: true },
});

console.log(`${assets.length} fichier(s) référencé(s).`);

let copied = 0;
let missing = 0;
let failed = 0;

for (const asset of assets) {
  const local = path.join(ROOT, asset.storageKey);

  try {
    await stat(local);
  } catch {
    // Deja migre, ou fichier disparu : les deux se voient au meme endroit.
    missing += 1;
    continue;
  }

  if (dryRun) {
    copied += 1;
    continue;
  }

  const body = await readFile(local);
  const response = await put(asset.storageKey, body, asset.mimeType);

  if (!response.ok) {
    console.error(`! ${asset.filename} : HTTP ${response.status}`);
    failed += 1;
    continue;
  }

  copied += 1;
  if (deleteLocal) await unlink(local).catch(() => undefined);
  if (copied % 25 === 0) console.log(`… ${copied}/${assets.length}`);
}

console.log(
  dryRun
    ? `À copier : ${copied}. Absents du disque : ${missing}.`
    : `Copiés : ${copied}. Absents du disque : ${missing}. Échecs : ${failed}.`,
);

await prisma.$disconnect();
process.exit(failed > 0 ? 1 : 0);
