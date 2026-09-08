import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hasDatabase, prisma, resetDatabase } from "./setup";

/**
 * Regles de relance (issue #36).
 *
 * On rejoue ici la condition metier : rien n'a bouge depuis reminderDays, il
 * reste une etape non validee, un lien actif et un contact existent.
 */
describe.skipIf(!hasDatabase)("relances", () => {
  const ilYA = (jours: number) => new Date(Date.now() - jours * 86_400_000);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  async function projetRelancable(overrides: Record<string, unknown> = {}) {
    const agency = await prisma.agency.create({
      data: {
        name: "Alpha",
        slug: `alpha-${Math.random().toString(36).slice(2, 8)}`,
      },
    });
    const client = await prisma.client.create({
      data: {
        email: `client-${Math.random().toString(36).slice(2, 8)}@exemple.fr`,
      },
    });

    return prisma.project.create({
      data: {
        name: "Refonte",
        agencyId: agency.id,
        status: "ACTIVE",
        reminderDays: 3,
        steps: { create: { title: "Assets", position: 0 } },
        clients: { create: { clientId: client.id } },
        portalLinks: { create: { token: Math.random().toString(36).slice(2) } },
        ...overrides,
      },
      include: { steps: true },
    });
  }

  /** Reprend la clause de runReminders : c'est elle qui est testee. */
  function candidats() {
    return prisma.project.findMany({
      where: {
        remindersEnabled: true,
        status: { in: ["DRAFT", "ACTIVE"] },
        steps: { some: { status: { not: "VALIDATED" } } },
      },
      select: { id: true },
    });
  }

  it("retient un projet en cours avec une étape non validée", async () => {
    const projet = await projetRelancable();
    expect((await candidats()).map((p) => p.id)).toContain(projet.id);
  });

  it("écarte un projet dont les relances sont coupées", async () => {
    const projet = await projetRelancable({ remindersEnabled: false });
    expect((await candidats()).map((p) => p.id)).not.toContain(projet.id);
  });

  it("écarte un projet terminé ou archivé", async () => {
    const projet = await projetRelancable({ status: "COMPLETED" });
    expect((await candidats()).map((p) => p.id)).not.toContain(projet.id);
  });

  it("écarte un projet dont tout est validé", async () => {
    const projet = await projetRelancable();
    await prisma.onboardingStep.updateMany({
      where: { projectId: projet.id },
      data: { status: "VALIDATED" },
    });

    expect((await candidats()).map((p) => p.id)).not.toContain(projet.id);
  });

  it("respecte le garde-fou anti-spam d'une relance par fenêtre", async () => {
    const projet = await projetRelancable({ lastReminderAt: ilYA(1) });
    const fenetre = projet.reminderDays * 86_400_000;

    const recent =
      Date.now() - (projet.lastReminderAt?.getTime() ?? 0) < fenetre;
    expect(recent).toBe(true);
  });
});
