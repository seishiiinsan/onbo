import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Chiffrement des secrets clients (issues #13 et #33).
 *
 * AES-256-GCM, cles hors base. Plusieurs cles peuvent etre actives en meme
 * temps : chaque secret porte l'identifiant de la cle qui l'a chiffre, ce qui
 * permet de dechiffrer avec l'ancienne tout en chiffrant avec la nouvelle,
 * puis de re-chiffrer l'existant progressivement.
 *
 * Sans cle configuree, l'application refuse d'enregistrer un secret plutot
 * que de le stocker en clair.
 */
const KEY_ENV = "ONBO_ENCRYPTION_KEY";
const KEYS_ENV = "ONBO_ENCRYPTION_KEYS";
const ACTIVE_ENV = "ONBO_ENCRYPTION_KEY_ID";

/** Identifiant porte par les secrets chiffres avant la rotation (issue #33). */
export const LEGACY_KEY_ID = "k0";

export class MissingEncryptionKey extends Error {
  constructor() {
    super(
      `Chiffrement indisponible : la variable ${KEY_ENV} n'est pas configurée.`,
    );
  }
}

export class UnknownKeyId extends Error {
  constructor(keyId: string) {
    super(
      `Secret chiffré avec la clé « ${keyId} », absente de ${KEYS_ENV}. La rotation ne doit jamais retirer une clé encore utilisée.`,
    );
  }
}

function decode(name: string, raw: string) {
  const buffer = Buffer.from(raw.trim(), "base64");
  if (buffer.length !== 32) {
    throw new Error(`La clé « ${name} » doit contenir 32 octets encodés en base64.`);
  }
  return buffer;
}

/**
 * Trousseau courant.
 *
 * ONBO_ENCRYPTION_KEYS = "k1:<base64>,k2:<base64>" ; ONBO_ENCRYPTION_KEY reste
 * accepte seul et prend l'identifiant historique k0, pour qu'un deploiement
 * existant continue de fonctionner sans rien changer.
 */
export function keyring() {
  const keys = new Map<string, Buffer>();

  const legacy = process.env[KEY_ENV];
  if (legacy) keys.set(LEGACY_KEY_ID, decode(LEGACY_KEY_ID, legacy));

  for (const entry of (process.env[KEYS_ENV] ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf(":");
    if (separator < 1) {
      throw new Error(`${KEYS_ENV} attend des entrées « identifiant:base64 ».`);
    }

    const id = trimmed.slice(0, separator).trim();
    keys.set(id, decode(id, trimmed.slice(separator + 1)));
  }

  if (keys.size === 0) throw new MissingEncryptionKey();

  // Cle d'ecriture : celle designee, sinon la derniere declaree.
  const requested = process.env[ACTIVE_ENV]?.trim();
  if (requested && !keys.has(requested)) {
    throw new UnknownKeyId(requested);
  }
  const activeId = requested ?? [...keys.keys()].at(-1)!;

  return { keys, activeId };
}

function keyFor(keyId: string) {
  const { keys } = keyring();
  const key = keys.get(keyId);
  if (!key) throw new UnknownKeyId(keyId);
  return key;
}

export function hasEncryptionKey() {
  try {
    keyring();
    return true;
  } catch {
    return false;
  }
}

/** Identifiant de la cle utilisee pour les nouveaux secrets. */
export function activeKeyId() {
  return keyring().activeId;
}

export type Sealed = { cipher: string; iv: string; tag: string; keyId: string };

export function seal(plain: string): Sealed {
  const { keys, activeId } = keyring();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.get(activeId)!, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);

  return {
    cipher: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    keyId: activeId,
  };
}

export function open(sealed: {
  cipher: string;
  iv: string;
  tag: string;
  /** Absent pour les secrets anterieurs a la rotation : cle historique. */
  keyId?: string | null;
}): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor(sealed.keyId || LEGACY_KEY_ID),
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
