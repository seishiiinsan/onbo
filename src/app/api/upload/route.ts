import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/activity";
import { getCurrentUser } from "@/lib/auth";
import { resolvePortalToken } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import {
  anonymize,
  callerIp,
  guard,
  logDenial,
  quotas,
  RULES,
  storedBytes,
} from "@/lib/rate-limit";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  safeFilename,
  storeFile,
} from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Depot d'un fichier sur une etape.
 *
 * Deux appelants possibles, verifies differemment :
 * - le client, via son token de portail (l'etape doit etre celle du lien) ;
 * - le staff, via sa session (l'etape doit appartenir a son agence).
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const stepId = String(form.get("stepId") ?? "");
  const token = String(form.get("token") ?? "");
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (25 Mo maximum)." },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non accepté." },
      { status: 415 },
    );
  }

  const step = await authorizeStep(stepId, token);
  if (!step) {
    return NextResponse.json({ error: "Étape introuvable." }, { status: 404 });
  }

  const ip = anonymize(await callerIp());

  // Cadence : par token de portail cote client, par IP cote staff (issue #34).
  const allowed = await guard({
    kind: "PORTAL_UPLOAD",
    bucket: token ? `upload:token:${token}` : `upload:ip:${ip}`,
    rule: RULES.portalUpload,
    ip,
    projectId: step.projectId,
    path: "/api/upload",
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de dépôts en peu de temps. Réessayez plus tard." },
      { status: 429 },
    );
  }

  // Volume : quota par projet puis par agence, avant d'ecrire le binaire.
  const limits = quotas();
  const [projectBytes, agencyBytes] = await Promise.all([
    storedBytes({ projectId: step.projectId }),
    storedBytes({ agencyId: step.project.agencyId }),
  ]);

  if (projectBytes + file.size > limits.project) {
    await logDenial({
      kind: "QUOTA_PROJECT",
      bucket: `quota:project:${step.projectId}`,
      ip,
      projectId: step.projectId,
      path: "/api/upload",
      detail: `${projectBytes} + ${file.size} > ${limits.project}`,
    });
    return NextResponse.json(
      { error: "Espace de stockage du projet atteint." },
      { status: 507 },
    );
  }

  if (agencyBytes + file.size > limits.agency) {
    await logDenial({
      kind: "QUOTA_AGENCY",
      bucket: `quota:agency:${step.project.agencyId}`,
      ip,
      projectId: step.projectId,
      path: "/api/upload",
      detail: `${agencyBytes} + ${file.size} > ${limits.agency}`,
    });
    return NextResponse.json(
      { error: "Espace de stockage de l'agence atteint." },
      { status: 507 },
    );
  }

  const storageKey = await storeFile(
    Buffer.from(await file.arrayBuffer()),
  );

  const asset = await prisma.asset.create({
    data: {
      filename: safeFilename(file.name),
      mimeType: file.type,
      size: file.size,
      storageKey,
      uploadedByClient: Boolean(token),
      stepId: step.id,
    },
    include: { step: { select: { projectId: true } } },
  });

  await logActivity({
    projectId: asset.step.projectId,
    actor: token ? "CLIENT" : "AGENCY",
    action: "a déposé un fichier",
    detail: asset.filename,
  });

  return NextResponse.json({ id: asset.id, filename: asset.filename });
}

/** Le projet et son agence servent aux quotas de volume (issue #34). */
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
  // affectes pour un MEMBER (issue #29).
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
