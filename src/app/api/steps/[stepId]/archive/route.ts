import { ZipArchive } from "archiver";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolvePortalToken } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { openFileStream } from "@/lib/storage";

export const runtime = "nodejs";

/** Telechargement groupe des fichiers d'une etape, en ZIP (item 22). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stepId: string }> },
) {
  const { stepId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  const step = await prisma.onboardingStep.findUnique({
    where: { id: stepId },
    include: { assets: true },
  });
  if (!step) return new NextResponse(null, { status: 404 });

  if (!(await canRead(step.projectId, token))) {
    return new NextResponse(null, { status: 404 });
  }
  if (step.assets.length === 0) {
    return NextResponse.json({ error: "Aucun fichier." }, { status: 404 });
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });

  for (const asset of step.assets) {
    archive.append(await openFileStream(asset.storageKey), {
      name: asset.filename,
    });
  }
  void archive.finalize();

  const filename = `${step.title.replace(/[^\w.\- ]+/g, "_")}.zip`;

  return new NextResponse(archive as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
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
