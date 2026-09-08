import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { AbuseKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Limitation de debit et protection contre les abus (issue #34).
 *
 * Trois surfaces sont ouvertes sans authentification : l'envoi de liens
 * magiques, le portail client (public par construction) et les uploads.
 * Le compteur vit en base : il survit a un redemarrage et reste juste si
 * l'application tourne en plusieurs exemplaires.
 */
export type Rule = { limit: number; windowMs: number };

const MIN = 60_000;
const HOUR = 60 * MIN;

export const RULES = {
  /** Liens magiques : par IP, puis par adresse visee. */
  loginByIp: { limit: 10, windowMs: 15 * MIN } satisfies Rule,
  loginByEmail: { limit: 5, windowMs: HOUR } satisfies Rule,
  /** Tokens de portail testes en force : 404 repetes depuis la meme IP. */
  portalProbe: { limit: 20, windowMs: HOUR } satisfies Rule,
  /** Actions du client sur son propre portail. */
  portalUpload: { limit: 40, windowMs: HOUR } satisfies Rule,
  portalMessage: { limit: 60, windowMs: HOUR } satisfies Rule,
  portalAction: { limit: 200, windowMs: HOUR } satisfies Rule,
} as const;

/** Quotas de volume, surchargeables par variable d'environnement. */
export function quotas() {
  const gib = 1024 * 1024 * 1024;
  return {
    project: Number(process.env.QUOTA_PROJECT_BYTES ?? 2 * gib),
    agency: Number(process.env.QUOTA_AGENCY_BYTES ?? 20 * gib),
  };
}

/**
 * Adresse de l'appelant. Derriere le reverse proxy, X-Forwarded-For porte la
 * chaine complete : la premiere entree est le client.
 */
export async function callerIp() {
  const jar = await headers();
  const forwarded = jar.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return jar.get("x-real-ip") ?? "inconnue";
}

/** L'IP n'est jamais stockee en clair dans les compteurs. */
export function anonymize(value: string) {
  return createHash("sha256")
    .update(`${value}:${process.env.ONBO_ENCRYPTION_KEY ?? "onbo"}`)
    .digest("hex")
    .slice(0, 24);
}

export type Verdict = {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: Date;
};

/** Incremente le compteur de la fenetre courante et rend le verdict. */
export async function consume(
  bucket: string,
  rule: Rule,
  now = new Date(),
): Promise<Verdict> {
  const start = new Date(
    Math.floor(now.getTime() / rule.windowMs) * rule.windowMs,
  );
  const expiresAt = new Date(start.getTime() + 2 * rule.windowMs);

  const row = await prisma.rateCounter.upsert({
    where: { bucket_windowStart: { bucket, windowStart: start } },
    create: { bucket, windowStart: start, count: 1, expiresAt },
    update: { count: { increment: 1 } },
  });

  return {
    allowed: row.count <= rule.limit,
    count: row.count,
    limit: rule.limit,
    resetAt: new Date(start.getTime() + rule.windowMs),
  };
}

export async function logDenial(input: {
  kind: AbuseKind;
  bucket: string;
  ip?: string | null;
  email?: string | null;
  projectId?: string | null;
  path?: string | null;
  detail?: string | null;
}) {
  // Ecriture « au mieux » : un journal indisponible ne doit pas ouvrir la porte.
  await prisma.abuseEvent
    .create({
      data: {
        kind: input.kind,
        bucket: input.bucket,
        ip: input.ip ?? null,
        email: input.email ?? null,
        projectId: input.projectId ?? null,
        path: input.path ?? null,
        detail: input.detail ?? null,
      },
    })
    .catch(() => undefined);
}

/**
 * Consomme un jeton et journalise le refus. Retourne true si l'appel passe.
 */
export async function guard(input: {
  kind: AbuseKind;
  bucket: string;
  rule: Rule;
  ip?: string | null;
  email?: string | null;
  projectId?: string | null;
  path?: string | null;
}) {
  const verdict = await consume(input.bucket, input.rule);
  if (verdict.allowed) return true;

  await logDenial({
    ...input,
    detail: `${verdict.count}/${verdict.limit} sur la fenêtre`,
  });
  return false;
}

/** Etat du compteur, sans le consommer. */
export async function peek(bucket: string, rule: Rule, now = new Date()) {
  const start = new Date(
    Math.floor(now.getTime() / rule.windowMs) * rule.windowMs,
  );
  const row = await prisma.rateCounter.findUnique({
    where: { bucket_windowStart: { bucket, windowStart: start } },
  });
  return row?.count ?? 0;
}

/**
 * Tokens de portail testes en force (issue #34).
 *
 * Seuls les echecs comptent : un client qui recharge son propre portail ne
 * doit jamais etre limite. Passe le seuil, l'IP est refusee avant meme la
 * requete en base, et chaque tentative est tracee.
 */
export async function portalProbeBlocked(ip: string) {
  return (await peek(`portal:probe:${ip}`, RULES.portalProbe)) >= RULES.portalProbe.limit;
}

export async function notePortalProbe(ip: string, token: string) {
  const verdict = await consume(`portal:probe:${ip}`, RULES.portalProbe);
  if (!verdict.allowed) {
    await logDenial({
      kind: "PORTAL_PROBE",
      bucket: `portal:probe:${ip}`,
      ip,
      path: "/p",
      // Le token teste n'est jamais journalise en clair.
      detail: `${verdict.count}/${verdict.limit} — token ${anonymize(token).slice(0, 8)}`,
    });
  }
  return verdict.allowed;
}

/** Volume deja stocke, pour comparer aux quotas. */
export async function storedBytes(where: {
  projectId?: string;
  agencyId?: string;
}) {
  const aggregate = await prisma.asset.aggregate({
    _sum: { size: true },
    where: {
      step: {
        project: where.projectId
          ? { id: where.projectId }
          : { agencyId: where.agencyId },
      },
    },
  });
  return aggregate._sum.size ?? 0;
}

/** Purge des compteurs expires, appelee par le cron. */
export async function purgeCounters(now = new Date()) {
  const { count } = await prisma.rateCounter.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  return { purged: count };
}
