import { NextResponse } from "next/server";
import { exportAgency } from "@/lib/rgpd";
import { requireTenant } from "@/lib/tenant";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export complet d'un espace agence (issue #45).
 *
 * Reserve aux OWNER et ADMIN : un simple membre ne voit qu'une partie des
 * projets, il n'a rien a exporter globalement.
 */
export async function GET() {
  const ctx = await requireTenant();
  if (ctx.role === "MEMBER") return new NextResponse(null, { status: 404 });

  const payload = await exportAgency(ctx.agencyId);
  logger.info("export RGPD agence", { agencyId: ctx.agencyId });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="onbo-export-${ctx.agencySlug}.json"`,
      "cache-control": "no-store",
    },
  });
}
