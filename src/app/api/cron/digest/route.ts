import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { runDailyDigest } from "@/lib/notifications";
import { purgeCounters } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resume quotidien (issue #39), declenche une fois par jour par le compose. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return new NextResponse(null, { status: 404 });
  }

  const result = await runDailyDigest();
  // Les compteurs de debit expires n'ont plus d'usage (issue #34).
  const purge = await purgeCounters();
  logger.info("résumé quotidien envoyé", {
    tache: "résumé quotidien",
    ...result,
    ...purge,
  });
  return NextResponse.json({ ...result, ...purge });
}
