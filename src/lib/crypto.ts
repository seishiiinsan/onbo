import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Chiffrement des secrets clients (issue #13).
 *
 * AES-256-GCM, cle hors base : ONBO_ENCRYPTION_KEY, 32 octets en base64.
 * Sans cle configuree, l'application refuse d'enregistrer un secret plutot
 * que de le stocker en clair.
 */
const KEY_ENV = "ONBO_ENCRYPTION_KEY";

export class MissingEncryptionKey extends Error {
  constructor() {
    super(
      `Chiffrement indisponible : la variable ${KEY_ENV} n'est pas configurée.`,
    );
  }
}

function key() {
  const raw = process.env[KEY_ENV];
  if (!raw) throw new MissingEncryptionKey();

  const buffer = Buffer.from(raw, "base64");
  if (buffer.length !== 32) {
    throw new Error(`${KEY_ENV} doit contenir 32 octets encodés en base64.`);
  }
  return buffer;
}

export function hasEncryptionKey() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export type Sealed = { cipher: string; iv: string; tag: string };

export function seal(plain: string): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);

  return {
    cipher: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function open(sealed: Sealed): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(sealed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(sealed.cipher, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Empreinte courte, pour tracer un secret dans les logs sans le divulguer. */
export function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
