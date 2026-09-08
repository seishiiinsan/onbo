import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { flushEmailQueue } from "@/lib/email/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reprise de la file d'emails (issue #29).
 *
 * Meme protection que les relances : sans CRON_SECRET, la route reste fermee.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return new NextResponse(null, { status: 404 });
  }

  const result = await flushEmailQueue();
  if (result.picked > 0) {
    logger.info("file email rejouée", { tache: "file email", ...result });
  }
  return NextResponse.json(result);
}
