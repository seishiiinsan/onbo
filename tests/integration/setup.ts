import { PrismaClient } from "@prisma/client";

/**
 * Base de test (issue #36).
 *
 * TEST_DATABASE_URL doit pointer vers une base jetable : les tests la vident
 * entre chaque fichier. Sans cette variable, les tests d'integration se
 * sautent plutot que d'echouer sur une machine sans Postgres.
 */
export const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);

export const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL ?? "postgresql://invalide" },
  },
});

export async function resetDatabase() {
  // L'ordre suit les dependances : les cascades font le reste.
  await prisma.$transaction([
    prisma.emailMessage.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.abuseEvent.deleteMany(),
    prisma.rateCounter.deleteMany(),
    prisma.client.deleteMany(),
    prisma.agency.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/** Deux agences, deux projets, un membre affecte a un seul projet. */
export async function seedTwoAgencies() {
  const [alpha, beta] = await Promise.all([
    prisma.agency.create({ data: { name: "Alpha", slug: "alpha" } }),
    prisma.agency.create({ data: { name: "Beta", slug: "beta" } }),
  ]);

  const [patronne, membre, intruse] = await Promise.all([
    prisma.user.create({ data: { email: "patronne@alpha.fr" } }),
    prisma.user.create({ data: { email: "membre@alpha.fr" } }),
    prisma.user.create({ data: { email: "intruse@beta.fr" } }),
  ]);

  await prisma.membership.createMany({
    data: [
      { userId: patronne.id, agencyId: alpha.id, role: "OWNER" },
      { userId: membre.id, agencyId: alpha.id, role: "MEMBER" },
      { userId: intruse.id, agencyId: beta.id, role: "OWNER" },
    ],
  });

  const affecte = await prisma.project.create({
    data: {
      name: "Projet affecté",
      agencyId: alpha.id,
      members: { create: { userId: membre.id, role: "CONTRIBUTOR" } },
      steps: { create: { title: "Assets", position: 0 } },
    },
  });

  const nonAffecte = await prisma.project.create({
    data: {
      name: "Projet non affecté",
      agencyId: alpha.id,
      steps: { create: { title: "Brief", position: 0 } },
    },
  });

  const chezBeta = await prisma.project.create({
    data: { name: "Projet Beta", agencyId: beta.id },
  });

  return {
    alpha,
    beta,
    patronne,
    membre,
    intruse,
    affecte,
    nonAffecte,
    chezBeta,
  };
}
