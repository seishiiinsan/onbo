import { describe, expect, it } from "vitest";
import { reminderEmail, loginLinkEmail } from "@/lib/email/templates";

describe("gabarits d'email", () => {
  it("liste les éléments manquants dans le texte comme dans le HTML", () => {
    const template = reminderEmail({
      branding: { agencyName: "Studio Zèbre", accentColor: "#ff0000" },
      projectName: "Refonte Dupont",
      clientName: "Léa",
      pending: ["Logo vectoriel", "Textes page d'accueil"],
      url: "https://exemple.fr/p/abc",
    });

    expect(template.category).toBe("REMINDER");
    expect(template.text).toContain("Logo vectoriel");
    expect(template.html).toContain(
      "Textes page d&#39;accueil".replace("&#39;", "'"),
    );
    expect(template.html).toContain("https://exemple.fr/p/abc");
    expect(template.subject).toContain("Refonte Dupont");
  });

  it("échappe le HTML fourni par l'utilisateur", () => {
    const template = reminderEmail({
      branding: { agencyName: "<script>alert(1)</script>" },
      projectName: "Projet",
      pending: ["<img onerror=x>"],
      url: "https://exemple.fr/p/abc",
    });

    expect(template.html).not.toContain("<script>");
    expect(template.html).not.toContain("<img onerror");
  });

  it("annonce la durée de validité du lien de connexion", () => {
    const template = loginLinkEmail("https://exemple.fr/verify?token=x", 15);
    expect(template.text).toContain("15 minutes");
    expect(template.category).toBe("LOGIN");
  });
});
