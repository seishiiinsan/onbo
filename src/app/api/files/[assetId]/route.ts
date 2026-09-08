import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolvePortalToken } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { openFileStream } from "@/lib/storage";

export const runtime = "nodejs";

/** Telechargement d'un fichier : reserve a l'agence proprietaire ou au porteur du lien. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { step: { select: { projectId: true } } },
  });
  if (!asset) return new NextResponse(null, { status: 404 });

  if (!(await canRead(asset.step.projectId, token))) {
    return new NextResponse(null, { status: 404 });
  }

  const stream = await openFileStream(asset.storageKey);

  // Les images peuvent s'afficher dans la page (apercu, item 21) ; tout le
  // reste est force en telechargement.
  const inline =
    request.nextUrl.searchParams.get("inline") === "1" &&
    asset.mimeType.startsWith("image/") &&
    asset.mimeType !== "image/svg+xml";

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asset.filename}"`,
      // Contenu client : jamais mis en cache par un intermediaire.
      "Cache-Control": "private, no-store",
    },
  });
}

async function canRead(projectId: string, token: string | null) {
  if (token) {
    const link = await resolvePortalToken(token);
    return Boolean(link && link.projectId === projectId);
  }

  const user = await getCurrentUser();
  if (!user) return false;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        {
          agency: {
            memberships: {
              some: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } },
            },
          },
        },
        { members: { some: { userId: user.id } } },
      ],
    },
    select: { id: true },
  });
  return Boolean(project);
}
