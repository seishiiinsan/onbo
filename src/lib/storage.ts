import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

/**
 * Stockage des fichiers deposes (issue #12).
 *
 * MVP : volume disque monte dans le conteneur. Le passage a un stockage objet
 * S3-compatible en UE ne changera que ce module.
 */
const ROOT = process.env.UPLOAD_DIR ?? "/app/uploads";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Types acceptes : documents, images, archives. Pas d'executable. */
export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

function pathFor(storageKey: string) {
  // storageKey est genere par nos soins (hex) : aucun segment issu du client.
  return path.join(ROOT, storageKey);
}

export async function storeFile(data: Buffer) {
  const storageKey = randomBytes(24).toString("hex");
  await mkdir(ROOT, { recursive: true });
  await writeFile(pathFor(storageKey), data);
  return storageKey;
}

export function readFileStream(storageKey: string) {
  return createReadStream(pathFor(storageKey));
}

export async function removeFile(storageKey: string) {
  await unlink(pathFor(storageKey)).catch(() => undefined);
}

/** Nom de fichier assaini, utilise pour l'affichage et le telechargement. */
export function safeFilename(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "fichier";
}
