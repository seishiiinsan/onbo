import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import path from "node:path";
import { presign, s3Config, s3Request } from "@/lib/s3";

/**
 * Stockage des fichiers deposes (issues #12 et #32).
 *
 * Deux adaptateurs derriere la meme interface : volume disque (MVP, mono-VPS)
 * et objet S3-compatible en UE. Le choix se fait sur la presence des
 * variables S3_* ; rien d'autre dans le code ne connait la difference.
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

export function usingObjectStorage() {
  return s3Config() !== null;
}

function pathFor(storageKey: string) {
  // storageKey est genere par nos soins (hex) : aucun segment issu du client.
  return path.join(ROOT, storageKey);
}

export function newStorageKey() {
  return randomBytes(24).toString("hex");
}

export async function storeFile(data: Buffer, contentType?: string) {
  const storageKey = newStorageKey();
  const config = s3Config();

  if (config) {
    const response = await s3Request(config, "PUT", storageKey, {
      body: data,
      contentType,
    });
    if (!response.ok) {
      throw new Error(
        `Stockage objet indisponible (HTTP ${response.status}).`,
      );
    }
    return storageKey;
  }

  await mkdir(ROOT, { recursive: true });
  await writeFile(pathFor(storageKey), data);
  return storageKey;
}

/**
 * Flux de lecture. Asynchrone parce que l'objet distant se recupere par une
 * requete : les appelants attendent le flux avant de le brancher.
 */
export async function openFileStream(storageKey: string): Promise<Readable> {
  const config = s3Config();
  if (!config) return createReadStream(pathFor(storageKey));

  const response = await s3Request(config, "GET", storageKey);
  if (!response.ok || !response.body) {
    throw new Error(`Fichier introuvable dans l'objet (HTTP ${response.status}).`);
  }
  return Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
}

export async function removeFile(storageKey: string) {
  const config = s3Config();
  if (config) {
    await s3Request(config, "DELETE", storageKey).catch(() => undefined);
    return;
  }
  await unlink(pathFor(storageKey)).catch(() => undefined);
}

/**
 * Depot direct par URL presignee (issue #32) : le binaire ne transite plus
 * par l'application. Null tant que le stockage objet n'est pas configure.
 */
export function presignUpload(contentType: string) {
  const config = s3Config();
  if (!config) return null;

  const storageKey = newStorageKey();
  return {
    storageKey,
    url: presign(config, "PUT", storageKey, { contentType, expiresIn: 900 }),
    headers: { "content-type": contentType },
  };
}

/** Verifie qu'un objet presigne a bien ete depose, et rend sa taille. */
export async function statFile(storageKey: string) {
  const config = s3Config();
  if (!config) return null;

  const response = await s3Request(config, "HEAD", storageKey);
  if (!response.ok) return null;
  return { size: Number(response.headers.get("content-length") ?? 0) };
}

/** Nom de fichier assaini, utilise pour l'affichage et le telechargement. */
export function safeFilename(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "fichier";
}
