import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolvePortalToken } from "@/lib/portal";
import {
  anonymize,
  callerIp,
  guard,
  logDenial,
  quotas,
  RULES,
  storedBytes,
} from "@/lib/rate-limit";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES } from "@/lib/storage";

/**
 * Controles partages par les trois chemins de depot (issues #12, #32, #34) :
 * envoi direct par l'application, URL presignee, et confirmation d'un depot
 * presigne. Un seul endroit ou vivent les regles.
 */
export type Refusal = { ok: false; status: number; error: string };
export type Clearance = {
  ok: true;
  step: { id: string; projectId: string; agencyId: string };
};

/** Le projet et son agence servent aux quotas de volume. */
const STEP_SELECT = {
  id: true,
  projectId: true,
  project: { select: { agencyId: true } },
} as const;

async function authorizeStep(stepId: string, token: string) {
  if (token) {
    const link = await resolvePortalToken(token);
    if (!link) return null;
    return prisma.onboardingStep.findFirst({
      where: { id: stepId, projectId: link.projectId },
      select: STEP_SELECT,
    });
  }

  const user = await getCurrentUser();
  if (!user) return null;

  // Meme regle que dans l'app : acces agence pour OWNER/ADMIN, projets
  // affectes pour un MEMBER (issue #6).
  return prisma.onboardingStep.findFirst({
    where: {
      id: stepId,
      project: {
        OR: [
          {
            agency: {
              memberships: {
                some: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } },
              },
            },
          },
          { members: { some: { userId: user.id, role: { not: "VIEWER" } } } },
        ],
      },
    },
    select: STEP_SELECT,
  });
}

export async function clearUpload(input: {
  stepId: string;
  token: string;
  size: number;
  mimeType: string;
}): Promise<Clearance | Refusal> {
  if (input.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 413,
      error: "Fichier trop volumineux (25 Mo maximum).",
    };
  }
  if (!ALLOWED_MIME.has(input.mimeType)) {
    return { ok: false, status: 415, error: "Type de fichier non accepté." };
  }

  const found = await authorizeStep(input.stepId, input.token);
  if (!found) return { ok: false, status: 404, error: "Étape introuvable." };

  const step = {
    id: found.id,
    projectId: found.projectId,
    agencyId: found.project.agencyId,
  };
  const ip = anonymize(await callerIp());

  // Cadence : par token de portail cote client, par IP cote staff.
  const allowed = await guard({
    kind: "PORTAL_UPLOAD",
    bucket: input.token ? `upload:token:${input.token}` : `upload:ip:${ip}`,
    rule: RULES.portalUpload,
    ip,
    projectId: step.projectId,
    path: "/api/upload",
  });
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      error: "Trop de dépôts en peu de temps. Réessayez plus tard.",
    };
  }

  // Volume : quota par projet puis par agence, avant d'ecrire le binaire.
  const limits = quotas();
  const [projectBytes, agencyBytes] = await Promise.all([
    storedBytes({ projectId: step.projectId }),
    storedBytes({ agencyId: step.agencyId }),
  ]);

  if (projectBytes + input.size > limits.project) {
    await logDenial({
      kind: "QUOTA_PROJECT",
      bucket: `quota:project:${step.projectId}`,
      ip,
      projectId: step.projectId,
      path: "/api/upload",
      detail: `${projectBytes} + ${input.size} > ${limits.project}`,
    });
    return {
      ok: false,
      status: 507,
      error: "Espace de stockage du projet atteint.",
    };
  }

  if (agencyBytes + input.size > limits.agency) {
    await logDenial({
      kind: "QUOTA_AGENCY",
      bucket: `quota:agency:${step.agencyId}`,
      ip,
      projectId: step.projectId,
      path: "/api/upload",
      detail: `${agencyBytes} + ${input.size} > ${limits.agency}`,
    });
    return {
      ok: false,
      status: 507,
      error: "Espace de stockage de l'agence atteint.",
    };
  }

  return { ok: true, step };
}
