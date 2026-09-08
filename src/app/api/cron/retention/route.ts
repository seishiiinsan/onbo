import { NextResponse, type NextRequest } from "next/server";
import { purgeRetention } from "@/lib/rgpd";
import { removeFile } from "@/lib/storage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Purge de rétention (issue #45), une fois par jour. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return new NextResponse(null, { status: 404 });
  }

  const { storageKeys, ...result } = await purgeRetention();

  // Les binaires ne sont pas en base : ils se suppriment un a un.
  for (const key of storageKeys) await removeFile(key);

  logger.info("rétention appliquée", { ...result, binaires: storageKeys.length });
  return NextResponse.json({ ...result, binaires: storageKeys.length });
}
