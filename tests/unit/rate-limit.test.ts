import { describe, expect, it } from "vitest";
import { anonymize, quotas, RULES } from "@/lib/rate-limit";

describe("limitation de débit", () => {
  it("n'expose jamais l'IP en clair", () => {
    const empreinte = anonymize("203.0.113.7");
    expect(empreinte).not.toContain("203.0.113.7");
    expect(empreinte).toHaveLength(24);
    expect(anonymize("203.0.113.7")).toBe(empreinte);
    expect(anonymize("203.0.113.8")).not.toBe(empreinte);
  });

  it("garde des limites plus strictes par adresse que par IP", () => {
    // Une IP partagée (bureau, NAT) doit être plus tolérée qu'une adresse
    // visée en boucle.
    expect(RULES.loginByEmail.limit).toBeLessThan(RULES.loginByIp.limit);
  });

  it("borne le volume par projet en dessous de celui de l'agence", () => {
    const limites = quotas();
    expect(limites.project).toBeLessThan(limites.agency);
  });
});
