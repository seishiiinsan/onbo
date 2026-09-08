#!/usr/bin/env node
/**
 * Restauration d'une sauvegarde (issue #31).
 *
 * Usage :
 *   node scripts/restore.mjs --list
 *   node scripts/restore.mjs --db db/2026-09-08T02-00-00-000Z.sql.gz.enc
 *   node scripts/restore.mjs --files uploads/....tar.gz.enc
 *
 * A rejouer sur un environnement vierge : une sauvegarde non restauree n'est
 * pas une sauvegarde.
 */
import { spawn } from "node:child_process";
import { createDecipheriv } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { configFromEnv, getObject, listObjects } from "./lib/s3.mjs";

const args = process.argv.slice(2);
const config = configFromEnv("BACKUP_S3");
const key = process.env.BACKUP_KEY;

if (!config || !key) {
  console.error("BACKUP_S3_* et BACKUP_KEY sont requis.");
  process.exit(1);
}

const secret = Buffer.from(key, "base64");

function decrypt(buffer) {
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const decipher = createDecipheriv("aes-256-gcm", secret, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]);
}

async function download(objectKey) {
  const response = await getObject(config, objectKey);
  if (!response.ok) {
    throw new Error(`${objectKey} illisible (HTTP ${response.status}).`);
  }
  return gunzipSync(decrypt(Buffer.from(await response.arrayBuffer())));
}

function feed(command, commandArgs, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} a échoué (${code}).`)),
    );
    child.stdin.end(input);
  });
}

const flag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

if (args.includes("--list")) {
  const keys = await listObjects(config, "");
  for (const objectKey of keys.sort()) console.log(objectKey);
  process.exit(0);
}

const dbKey = flag("--db");
const filesKey = flag("--files");

if (!dbKey && !filesKey) {
  console.error("Rien à restaurer : --db et/ou --files, ou --list.");
  process.exit(1);
}

if (dbKey) {
  const sql = await download(dbKey);
  console.log(`restauration de ${dbKey} (${sql.length} octets)…`);
  await feed("psql", [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1"], sql);
  console.log("base restaurée.");
}

if (filesKey) {
  const target = process.env.UPLOAD_DIR ?? "/app/uploads";
  const archive = await download(filesKey);
  console.log(`restauration de ${filesKey} vers ${target}…`);
  await feed("tar", ["-xf", "-", "-C", target], archive);
  console.log("fichiers restaurés.");
}

console.log(
  "Ne pas oublier : sans ONBO_ENCRYPTION_KEY, les accès clients restent illisibles.",
);
