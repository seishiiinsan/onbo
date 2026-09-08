import { NextResponse, type NextRequest } from "next/server";
import { captureError } from "@/lib/sentry";
import { anonymize, callerIp, guard, RULES } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Remontee des erreurs cote navigateur (issue #35).
 *
 * Limitee comme le reste : une page qui boucle ne doit pas inonder le
 * collecteur. Seuls le message, l'empreinte et le chemin sont acceptes.
 */
export async function POST(request: NextRequest) {
  const ip = anonymize(await callerIp());
  const allowed = await guard({
    kind: "PORTAL_ACTION",
    bucket: `telemetry:${ip}`,
    rule: RULES.portalMessage,
    ip,
    path: "/api/telemetry/error",
  });
  if (!allowed) return new NextResponse(null, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    digest?: string;
    path?: string;
  };

  captureError(new Error(String(body.message ?? "erreur navigateur")), {
    source: "client",
    digest: body.digest ?? null,
    path: body.path ?? null,
  });

  return new NextResponse(null, { status: 204 });
}
