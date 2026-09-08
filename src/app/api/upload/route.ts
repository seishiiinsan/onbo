import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/activity";
import { scanBuffer } from "@/lib/antivirus";
import { prisma } from "@/lib/prisma";
import { clearUpload } from "@/lib/upload-guard";
import { safeFilename, storeFile } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Depot d'un fichier par l'application.
 *
 * Chemin conserve pour le stockage disque et comme repli : avec un stockage
 * objet configure, le navigateur passe par /api/upload/presign et le binaire
 * ne transite plus ici (issue #32).
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const stepId = String(form.get("stepId") ?? "");
  const token = String(form.get("token") ?? "");
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  const clearance = await clearUpload({
    stepId,
    token,
    size: file.size,
    mimeType: file.type,
  });
  if (!clearance.ok) {
    return NextResponse.json(
      { error: clearance.error },
      { status: clearance.status },
    );
  }

  const data = Buffer.from(await file.arrayBuffer());

  const scan = await scanBuffer(data, file.name);
  if (!scan.clean) {
    return NextResponse.json(
      { error: `Fichier refusé par l'analyse antivirus (${scan.signature}).` },
      { status: 422 },
    );
  }

  const storageKey = await storeFile(data, file.type);

  const asset = await prisma.asset.create({
    data: {
      filename: safeFilename(file.name),
      mimeType: file.type,
      size: file.size,
      storageKey,
      uploadedByClient: Boolean(token),
      stepId: clearance.step.id,
    },
  });

  await logActivity({
    projectId: clearance.step.projectId,
    actor: token ? "CLIENT" : "AGENCY",
    action: "a déposé un fichier",
    detail: asset.filename,
  });

  return NextResponse.json({ id: asset.id, filename: asset.filename });
}
