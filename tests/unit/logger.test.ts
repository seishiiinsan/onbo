import { describe, expect, it, vi } from "vitest";
import { logger, maskEmail } from "@/lib/logger";

describe("logs structurés", () => {
  it("réduit une adresse à une empreinte et un domaine", () => {
    const masque = maskEmail("marie@agence.fr");
    expect(masque).not.toContain("marie");
    expect(masque).toContain("@agence.fr");
  });

  it("masque les clés sensibles et les adresses", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("connexion", { email: "marie@agence.fr", token: "abc123" });

    const ligne = JSON.parse(spy.mock.calls[0][0] as string);
    expect(ligne.token).toBe("[masqué]");
    expect(ligne.email).not.toContain("marie");
    expect(ligne.msg).toBe("connexion");
    spy.mockRestore();
  });
});
