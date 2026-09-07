"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { StepStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePortalToken } from "@/lib/portal";

/**
 * Mise a jour d'une etape depuis le portail client.
 *
 * Le client peut faire avancer une etape mais jamais la valider : la
 * validation reste une decision de l'agence (issue #14).
 */
export async function clientSetStepStatus(
  token: string,
  stepId: string,
  status: Exclude<StepStatus, "VALIDATED">,
) {
  const link = await resolvePortalToken(token);
  if (!link) notFound();

  // L'etape doit appartenir au projet du lien : pas de saut lateral.
  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, projectId: link.projectId },
    select: { id: true, status: true },
  });
  if (!step) notFound();

  // Une etape deja validee par l'agence n'est plus modifiable par le client.
  if (step.status === "VALIDATED") return;

  await prisma.onboardingStep.update({
    where: { id: step.id },
    data: { status },
  });

  revalidatePath(`/p/${token}`);
  revalidatePath(`/app/projects/${link.projectId}`);
}
