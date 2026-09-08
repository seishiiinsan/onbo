import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Parcours complet (issue #36).
 *
 * On ne passe pas par la boite mail : le lien magique est cree directement en
 * base, comme le fait requestLoginLink. Ce qui est teste ici, c'est le
 * parcours produit, pas la distribution des emails (couverte par #29).
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
    },
  },
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("agence, lien, portail client, dépôt, validation", async ({
  page,
  request,
}) => {
  const suffixe = Math.random().toString(36).slice(2, 8);
  const email = `patronne-${suffixe}@exemple.fr`;

  // 1. Connexion staff par lien magique.
  const { createHash, randomBytes } = await import("node:crypto");
  const token = randomBytes(32).toString("base64url");
  await prisma.loginToken.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      email,
      expiresAt: new Date(Date.now() + 900_000),
    },
  });

  await page.goto(`/verify?token=${token}`);

  // 2. Creation de l'espace agence puis d'un projet.
  await page.waitForURL(/\/(onboarding|app)/);
  if (page.url().includes("/onboarding")) {
    await page.getByLabel(/nom/i).first().fill(`Agence ${suffixe}`);
    await page.getByRole("button", { name: /cr[ée]er/i }).click();
  }

  await page.goto("/app/projects/new");
  await page.getByLabel(/nom du projet/i).fill(`Refonte ${suffixe}`);
  await page.getByRole("button", { name: /cr[ée]er le projet/i }).click();
  await page.waitForURL(/\/app\/projects\//);

  const projectId = page.url().split("/app/projects/")[1].split("?")[0];

  // 3. Emission du lien de portail.
  await page.goto(`/app/projects/${projectId}?tab=client`);
  const bouton = page.getByRole("button", { name: /g[ée]n[ée]rer le lien/i });
  if (await bouton.isVisible().catch(() => false)) await bouton.click();

  const lien = await prisma.portalLink.findFirst({
    where: { projectId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  expect(lien).not.toBeNull();

  // 4. Cote client : le portail s'ouvre sans compte.
  await page.goto(`/p/${lien!.token}`);
  await expect(
    page.getByText(new RegExp(`Refonte ${suffixe}`, "i")),
  ).toBeVisible();

  // 5. Depot d'un fichier par le client, via l'API que le portail appelle.
  const step = await prisma.onboardingStep.findFirstOrThrow({
    where: { projectId },
  });

  const depot = await request.post("/api/upload", {
    multipart: {
      stepId: step.id,
      token: lien!.token,
      file: {
        name: "brief.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("contenu de test"),
      },
    },
  });
  expect(depot.ok()).toBe(true);

  // 6. Validation par l'agence.
  await prisma.onboardingStep.update({
    where: { id: step.id },
    data: { status: "SUBMITTED" },
  });

  await page.goto(`/app/projects/${projectId}`);
  await expect(page.getByText("brief.txt")).toBeVisible();

  const valide = page.getByRole("button", { name: /valider/i }).first();
  await valide.click();

  await expect
    .poll(async () => {
      const relu = await prisma.onboardingStep.findUniqueOrThrow({
        where: { id: step.id },
      });
      return relu.status;
    })
    .toBe("VALIDATED");
});
