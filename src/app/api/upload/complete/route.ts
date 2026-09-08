import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/activity";
import { scanBuffer } from "@/lib/antivirus";
import { prisma } from "@/lib/prisma";
import { clearUpload } from "@/lib/upload-guard";
import {
  openFileStream,
  removeFile,
  safeFilename,
  statFile,
} from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Confirmation d'un depot presigne (issue #32).
 *
 * On ne croit pas le navigateur sur parole : l'objet doit exister, sa taille
 * est relue depuis le stockage, et l'analyse antivirus se fait ici puisque le
 * binaire n'est jamais passe par l'application.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    stepId?: string;
    token?: string;
    storageKey?: string;
    filename?: string;
    mimeType?: string;
  };

  const storageKey = String(body.storageKey ?? "");
  // La cle est generee par nos soins : hexadecimal, rien d'autre.
  if (!/^[0-9a-f]{48}$/.test(storageKey)) {
    return NextResponse.json({ error: "Dépôt inconnu." }, { status: 400 });
  }

  const stat = await statFile(storageKey);
  if (!stat) {
    return NextResponse.json({ error: "Dépôt introuvable." }, { status: 404 });
  }

  const clearance = await clearUpload({
    stepId: String(body.stepId ?? ""),
    token: String(body.token ?? ""),
    size: stat.size,
    mimeType: String(body.mimeType ?? ""),
  });
  if (!clearance.ok) {
    await removeFile(storageKey);
    return NextResponse.json(
      { error: clearance.error },
      { status: clearance.status },
    );
  }

  if (process.env.ANTIVIRUS_URL) {
    const stream = await openFileStream(storageKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));

    const scan = await scanBuffer(
      Buffer.concat(chunks),
      String(body.filename ?? "fichier"),
    );
    if (!scan.clean) {
      await removeFile(storageKey);
      return NextResponse.json(
        {
          error: `Fichier refusé par l'analyse antivirus (${scan.signature}).`,
        },
        { status: 422 },
      );
    }
  }

  const token = String(body.token ?? "");
  const asset = await prisma.asset.create({
    data: {
      filename: safeFilename(String(body.filename ?? "fichier")),
      mimeType: String(body.mimeType ?? "application/octet-stream"),
      size: stat.size,
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
