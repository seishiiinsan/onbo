import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Metriques au format Prometheus (issue #35).
 *
 * Fermee sans METRICS_TOKEN : rien ne doit s'ouvrir par defaut. Les valeurs
 * sont des compteurs agreges, jamais du contenu client.
 */
function line(name: string, help: string, value: number, labels = "") {
  return [
    `# HELP ${name} ${help}`,
    `# TYPE ${name} gauge`,
    `${name}${labels} ${value}`,
  ].join("\n");
}

export async function GET(request: NextRequest) {
  const token = process.env.METRICS_TOKEN;
  if (!token) return new NextResponse(null, { status: 404 });

  const given =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("token") ??
    "";
  if (!safeEqual(given, token)) return new NextResponse(null, { status: 404 });

  const since = new Date(Date.now() - 24 * 3600_000);

  const [emails, uploads, bytes, reminders, denials, projects, pending] =
    await Promise.all([
      prisma.emailMessage.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { createdAt: { gte: since } },
      }),
      prisma.asset.count({ where: { createdAt: { gte: since } } }),
      prisma.asset.aggregate({ _sum: { size: true } }),
      prisma.project.count({
        where: { lastReminderAt: { gte: since } },
      }),
      prisma.abuseEvent.groupBy({
        by: ["kind"],
        _count: { _all: true },
        where: { createdAt: { gte: since } },
      }),
      prisma.project.count({ where: { status: { in: ["DRAFT", "ACTIVE"] } } }),
      prisma.emailMessage.count({ where: { status: "PENDING" } }),
    ]);

  const body = [
    ...emails.map((row) =>
      line(
        "onbo_emails_24h",
        "Emails des 24 dernières heures par statut",
        row._count._all,
        `{status="${row.status}"}`,
      ),
    ),
    line("onbo_email_queue_pending", "Emails en attente d'envoi", pending),
    line("onbo_uploads_24h", "Fichiers déposés sur 24 h", uploads),
    line(
      "onbo_storage_bytes",
      "Volume stocké, en octets",
      bytes._sum.size ?? 0,
    ),
    line("onbo_reminders_24h", "Projets relancés sur 24 h", reminders),
    line("onbo_projects_active", "Projets en cours", projects),
    ...denials.map((row) =>
      line(
        "onbo_abuse_24h",
        "Refus de débit sur 24 h par type",
        row._count._all,
        `{kind="${row.kind}"}`,
      ),
    ),
  ].join("\n");

  return new NextResponse(`${body}\n`, {
    headers: {
      "content-type": "text/plain; version=0.0.4",
      "cache-control": "no-store",
    },
  });
}
