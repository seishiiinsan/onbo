import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { runReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Declenchement des relances, appele par le service cron du compose.
 *
 * Protege par CRON_SECRET : sans secret configure, la route reste fermee
 * plutot que d'etre ouverte a tous.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return new NextResponse(null, { status: 404 });
  }

  const result = await runReminders();

  logger.info("relances envoyées", { tache: "relances", ...result });
  return NextResponse.json(result);
}
