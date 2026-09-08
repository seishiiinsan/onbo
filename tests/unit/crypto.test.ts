import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  activeKeyId,
  hasEncryptionKey,
  LEGACY_KEY_ID,
  MissingEncryptionKey,
  open,
  seal,
  UnknownKeyId,
} from "@/lib/crypto";

const k0 = randomBytes(32).toString("base64");
const k1 = randomBytes(32).toString("base64");
const initial = { ...process.env };

beforeEach(() => {
  delete process.env.ONBO_ENCRYPTION_KEY;
  delete process.env.ONBO_ENCRYPTION_KEYS;
  delete process.env.ONBO_ENCRYPTION_KEY_ID;
});

afterEach(() => {
  process.env = { ...initial };
});

describe("coffre", () => {
  it("refuse de chiffrer sans clé, plutôt que de stocker en clair", () => {
    expect(hasEncryptionKey()).toBe(false);
    expect(() => seal("secret")).toThrow(MissingEncryptionKey);
  });

  it("fait un aller-retour avec la clé historique seule", () => {
    process.env.ONBO_ENCRYPTION_KEY = k0;
    const sealed = seal("mot-de-passe-ftp");

    expect(sealed.keyId).toBe(LEGACY_KEY_ID);
    expect(sealed.cipher).not.toContain("mot-de-passe");
    expect(open(sealed)).toBe("mot-de-passe-ftp");
  });

  it("chiffre avec la nouvelle clé et déchiffre encore l'ancienne", () => {
    // Le cas exact d'une rotation en cours (issue #33).
    process.env.ONBO_ENCRYPTION_KEY = k0;
    const ancien = seal("ancien-secret");

    process.env.ONBO_ENCRYPTION_KEYS = `k0:${k0},k1:${k1}`;
    process.env.ONBO_ENCRYPTION_KEY_ID = "k1";

    expect(activeKeyId()).toBe("k1");
    expect(seal("nouveau").keyId).toBe("k1");
    expect(open(ancien)).toBe("ancien-secret");
  });

  it("signale explicitement une clé retirée trop tôt", () => {
    process.env.ONBO_ENCRYPTION_KEY = k0;
    const sealed = seal("secret");

    process.env.ONBO_ENCRYPTION_KEYS = `k1:${k1}`;
    delete process.env.ONBO_ENCRYPTION_KEY;

    expect(() => open(sealed)).toThrow(UnknownKeyId);
  });

  it("rejette un contenu modifié (authentification GCM)", () => {
    process.env.ONBO_ENCRYPTION_KEY = k0;
    const sealed = seal("secret");
    const falsifie = {
      ...sealed,
      cipher: Buffer.from("bidon").toString("base64"),
    };

    expect(() => open(falsifie)).toThrow();
  });
});
