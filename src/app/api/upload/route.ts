import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolvePortalToken } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
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
  });

  return NextResponse.json({ id: asset.id, filename: asset.filename });
}

async function authorizeStep(stepId: string, token: string) {
  if (token) {
    const link = await resolvePortalToken(token);
    if (!link) return null;
    return prisma.onboardingStep.findFirst({
      where: { id: stepId, projectId: link.projectId },
      select: { id: true },
    });
  }

  const user = await getCurrentUser();
  if (!user) return null;

  return prisma.onboardingStep.findFirst({
    where: {
      id: stepId,
      project: { agency: { memberships: { some: { userId: user.id } } } },
    },
    select: { id: true },
  });
}
