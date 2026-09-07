import type { ActivityActor } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Journal d'activite (item 18).
 *
 * Volontairement en ecriture « au mieux » : une trace manquante ne doit
 * jamais faire echouer l'action metier qu'elle decrit.
 */
export async function logActivity(input: {
  projectId: string;
  actor: ActivityActor;
  actorName?: string | null;
  action: string;
  detail?: string | null;
}) {
  await prisma.activity
    .create({
      data: {
        projectId: input.projectId,
        actor: input.actor,
        actorName: input.actorName ?? null,
        action: input.action,
        detail: input.detail ?? null,
      },
    })
    .catch(() => undefined);
}
