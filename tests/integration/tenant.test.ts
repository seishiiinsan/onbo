import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { projectScope } from "@/lib/access";
import type { TenantContext } from "@/lib/tenant";
import { hasDatabase, prisma, resetDatabase, seedTwoAgencies } from "./setup";

/**
 * Cloisonnement multi-tenant (issue #36).
 *
 * Ces tests sont la garantie annoncee : retirer le filtre agencyId de
 * projectScope, ou l'affectation pour un MEMBER, les fait echouer.
 */
describe.skipIf(!hasDatabase)("cloisonnement", () => {
  let data: Awaited<ReturnType<typeof seedTwoAgencies>>;

  const ctx = (
    userId: string,
    agencyId: string,
    role: TenantContext["role"],
  ): TenantContext => ({
    userId,
    email: "test@exemple.fr",
    agencyId,
    agencySlug: "slug",
    agencyName: "Agence",
    role,
  });

  beforeAll(async () => {
    await resetDatabase();
    data = await seedTwoAgencies();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("une agence ne lit jamais les projets d'une autre", async () => {
    const vus = await prisma.project.findMany({
      where: projectScope(ctx(data.intruse.id, data.beta.id, "OWNER")),
      select: { id: true },
    });

    expect(vus.map((projet) => projet.id)).toEqual([data.chezBeta.id]);
  });

  it("un membre non affecté ne voit rien du projet", async () => {
    const vus = await prisma.project.findMany({
      where: projectScope(ctx(data.membre.id, data.alpha.id, "MEMBER")),
      select: { id: true },
    });

    expect(vus.map((projet) => projet.id)).toEqual([data.affecte.id]);
    expect(vus.map((projet) => projet.id)).not.toContain(data.nonAffecte.id);
  });

  it("un directeur de projet voit tout l'espace, et rien de plus", async () => {
    const vus = await prisma.project.findMany({
      where: projectScope(ctx(data.patronne.id, data.alpha.id, "OWNER")),
      select: { id: true },
    });

    expect(vus).toHaveLength(2);
    expect(vus.map((projet) => projet.id)).not.toContain(data.chezBeta.id);
  });

  it("une étape reste inatteignable depuis une autre agence", async () => {
    const etape = await prisma.onboardingStep.findFirst({
      where: {
        project: projectScope(ctx(data.intruse.id, data.beta.id, "OWNER")),
        projectId: data.affecte.id,
      },
    });

    expect(etape).toBeNull();
  });
});
