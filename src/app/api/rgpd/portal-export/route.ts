import { NextResponse, type NextRequest } from "next/server";
import { exportClient } from "@/lib/rgpd";
import { prisma } from "@/lib/prisma";
import { resolvePortalToken } from "@/lib/portal";
import { anonymize, callerIp, guard, RULES } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export des donnees d'un client depuis son portail (issue #45).
 *
 * Le lien de portail vaut identification : c'est deja lui qui donne acces au
 * projet. On exporte les donnees du contact demande, a condition qu'il soit
 * rattache au projet du lien.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const email = (request.nextUrl.searchParams.get("email") ?? "")
    .toLowerCase()
    .trim();

  const link = await resolvePortalToken(token);
  if (!link) return new NextResponse(null, { status: 404 });

  const ip = anonymize(await callerIp());
  const allowed = await guard({
    kind: "PORTAL_ACTION",
    bucket: `rgpd:export:${token}`,
    rule: RULES.portalMessage,
    ip,
    projectId: link.projectId,
    path: "/api/rgpd/portal-export",
  });
  if (!allowed) return new NextResponse(null, { status: 429 });

  const rattachement = await prisma.clientProject.findFirst({
    where: { projectId: link.projectId, client: { email } },
    select: { clientId: true },
  });
  if (!rattachement) return new NextResponse(null, { status: 404 });

  const payload = await exportClient(rattachement.clientId);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="mes-donnees-onbo.json"',
      "cache-control": "no-store",
    },
  });
}
