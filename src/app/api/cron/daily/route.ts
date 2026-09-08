import { NextResponse, type NextRequest } from "next/server";
import { remindExpiringTrials } from "@/lib/billing";
import { flushEmailQueue } from "@/lib/email/queue";
import { logger } from "@/lib/logger";
import { runDailyDigest } from "@/lib/notifications";
import { purgeCounters } from "@/lib/rate-limit";
import { runReminders } from "@/lib/reminders";
import { purgeRetention } from "@/lib/rgpd";
import { removeFile } from "@/lib/storage";
import { safeEqual } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Toutes les taches planifiees en un seul passage (preproduction Vercel).
 *
 * Le compose a un declencheur par tache, avec ses propres frequences. Vercel
 * limite le nombre de crons : cette route les enchaine une fois par jour.
 * Chaque tache reste independante — l'echec de l'une n'empeche pas les
 * suivantes.
 */
function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Vercel Cron signe avec Authorization: Bearer ; le compose utilise
  // l'en-tete maison. Les deux sont acceptes.
  const bearer =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const maison = request.headers.get("x-cron-secret") ?? "";

  return safeEqual(bearer, secret) || safeEqual(maison, secret);
}

async function run() {
  const resultats: Record<string, unknown> = {};

  for (const [nom, tache] of [
    ["emails", () => flushEmailQueue()],
    ["relances", () => runReminders()],
    ["resume", () => runDailyDigest()],
    ["essais", () => remindExpiringTrials()],
    ["compteurs", () => purgeCounters()],
    [
      "retention",
      async () => {
        const { storageKeys, ...reste } = await purgeRetention();
        for (const key of storageKeys) await removeFile(key);
        return { ...reste, binaires: storageKeys.length };
      },
    ],
  ] as const) {
    try {
      resultats[nom] = await tache();
    } catch (error) {
      resultats[nom] = { erreur: String(error) };
      logger.error("tâche planifiée en échec", { tache: nom });
    }
  }

  logger.info("passage quotidien terminé", resultats);
  return resultats;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 });
  return NextResponse.json(await run());
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 });
  return NextResponse.json(await run());
}
