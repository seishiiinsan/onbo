import { NextResponse, type NextRequest } from "next/server";
import { runDailyDigest } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resume quotidien (issue #39), declenche une fois par jour par le compose. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return new NextResponse(null, { status: 404 });
  }

  const result = await runDailyDigest();
  console.log(`> résumé quotidien : ${result.sent} destinataire(s)`);
  return NextResponse.json(result);
}
