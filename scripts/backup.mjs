#!/usr/bin/env node
/**
 * Sauvegarde chiffree de la base et des fichiers (issue #31).
 *
 * pg_dump + archive du volume uploads, chiffres en AES-256-GCM avec
 * BACKUP_KEY, envoyes vers un stockage objet UE **distinct du serveur**.
 * Retention 30 jours. Toute erreur, et toute sauvegarde qui date de plus de
 * 48 h, declenche l'alerte.
 *
 * Usage : node scripts/backup.mjs [--files-only|--db-only]
 */
import { spawn } from "node:child_process";
import { createCipheriv, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  configFromEnv,
  deleteObject,
  listObjects,
  putObject,
} from "./lib/s3.mjs";

const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 30);
const STALE_HOURS = Number(process.env.BACKUP_STALE_HOURS ?? 48);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/uploads";
const args = process.argv.slice(2);

const config = configFromEnv("BACKUP_S3");
const key = process.env.BACKUP_KEY;

async function alert(message) {
  console.error(`! ${message}`);
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: `Onbo — sauvegarde : ${message}` }),
  }).catch(() => undefined);
}

if (!config || !key) {
  await alert(
    "configuration incomplète (BACKUP_S3_* et BACKUP_KEY sont requis).",
  );
  process.exit(1);
}

const secret = Buffer.from(key, "base64");
if (secret.length !== 32) {
  await alert("BACKUP_KEY doit contenir 32 octets encodés en base64.");
  process.exit(1);
}

/** Chiffre : [iv 12][tag 16][données]. Format lu par restore.mjs. */
function encrypt(buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const body = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    const out = [];
    const err = [];
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(Buffer.concat(out))
        : reject(
            new Error(`${command} a échoué (${code}) : ${Buffer.concat(err)}`),
          ),
    );
  });
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

async function backupDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante.");

  const dump = await run("pg_dump", ["--no-owner", "--format=plain", url]);
  const payload = encrypt(gzipSync(dump));
  const objectKey = `db/${stamp}.sql.gz.enc`;

  const response = await putObject(config, objectKey, payload);
  if (!response.ok) throw new Error(`envoi refusé (HTTP ${response.status}).`);

  console.log(`base sauvegardée : ${objectKey} (${payload.length} octets)`);
  return objectKey;
}

async function backupFiles() {
  // tar depuis le volume monte : le stockage objet (#32) rend ceci inutile
  // le jour ou les fichiers n'y sont plus.
  const archive = await run("tar", ["-cf", "-", "-C", UPLOAD_DIR, "."]);
  const payload = encrypt(gzipSync(archive));
  const objectKey = `uploads/${stamp}.tar.gz.enc`;

  const response = await putObject(config, objectKey, payload);
  if (!response.ok) throw new Error(`envoi refusé (HTTP ${response.status}).`);

  console.log(`fichiers sauvegardés : ${objectKey} (${payload.length} octets)`);
  return objectKey;
}

/** Supprime ce qui depasse la retention et verifie la fraicheur. */
async function prune() {
  const keys = await listObjects(config, "");
  const limit = Date.now() - RETENTION_DAYS * 86_400_000;

  let latest = 0;
  for (const objectKey of keys) {
    // "2026-09-08T02-00-00-000Z" -> ISO relisible par Date.parse
    const raw = objectKey.split("/")[1]?.split(".")[0] ?? "";
    const at = Date.parse(
      raw.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "T$1:$2:$3.$4Z"),
    );
    if (Number.isNaN(at)) continue;

    latest = Math.max(latest, at);
    if (at < limit) {
      await deleteObject(config, objectKey);
      console.log(`purgé : ${objectKey}`);
    }
  }

  if (latest && Date.now() - latest > STALE_HOURS * 3600_000) {
    await alert(
      `la sauvegarde la plus récente date de plus de ${STALE_HOURS} h.`,
    );
  }
}

try {
  if (!args.includes("--files-only")) await backupDatabase();
  if (!args.includes("--db-only")) await backupFiles();
  await prune();
  console.log("sauvegarde terminée.");
} catch (error) {
  await alert(error.message);
  process.exit(1);
}
