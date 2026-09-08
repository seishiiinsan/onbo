import { prisma } from "@/lib/prisma";
import { emailProvider, SendError } from "@/lib/email/providers";
import { logger } from "@/lib/logger";
import { captureError } from "@/lib/sentry";
import type { Mail } from "@/lib/email/types";

/**
 * File d'envoi avec reprise sur echec (issue #29).
 *
 * Tout email est d'abord ecrit en base, puis tente immediatement. Si le
 * fournisseur est injoignable, la ligne reste PENDING et repart au prochain
 * passage de /api/cron/emails, avec un intervalle croissant.
 */
const MAX_ATTEMPTS = 5;

/** Minutes avant la n-ieme nouvelle tentative. */
const BACKOFF_MIN = [1, 5, 15, 60, 240];

function nextAttempt(attempts: number, from = new Date()) {
  const minutes = BACKOFF_MIN[Math.min(attempts, BACKOFF_MIN.length - 1)];
  return new Date(from.getTime() + minutes * 60_000);
}

export async function enqueueMail(mail: Mail) {
  const record = await prisma.emailMessage.create({
    data: {
      to: mail.to.toLowerCase().trim(),
      subject: mail.subject,
      text: mail.text,
      html: mail.html ?? null,
      replyTo: mail.replyTo ?? null,
      category: mail.category ?? "OTHER",
      agencyId: mail.agencyId ?? null,
      projectId: mail.projectId ?? null,
    },
  });

  // Tentative immediate : un lien magique ne doit pas attendre le cron.
  await deliver(record.id).catch(() => undefined);
  return record.id;
}

type Deliverable = {
  id: string;
  to: string;
  subject: string;
  text: string;
  html: string | null;
  replyTo: string | null;
  category: string;
  agencyId: string | null;
  projectId: string | null;
  attempts: number;
};

async function deliverRecord(record: Deliverable) {
  const provider = emailProvider();

  try {
    const result = await provider.send({
      to: record.to,
      subject: record.subject,
      text: record.text,
      html: record.html ?? undefined,
      replyTo: record.replyTo,
      category: record.category as Mail["category"],
      agencyId: record.agencyId,
      projectId: record.projectId,
    });

    await prisma.emailMessage.update({
      where: { id: record.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        attempts: record.attempts + 1,
        provider: provider.name,
        providerId: result.providerId ?? null,
        lastError: null,
      },
    });

    logger.info("email envoyé", {
      id: record.id,
      to: record.to,
      category: record.category,
      provider: provider.name,
    });
    return true;
  } catch (error) {
    const attempts = record.attempts + 1;
    const retryable = error instanceof SendError ? error.retryable : true;
    const exhausted = !retryable || attempts >= MAX_ATTEMPTS;

    await prisma.emailMessage.update({
      where: { id: record.id },
      data: {
        attempts,
        provider: provider.name,
        status: exhausted ? "FAILED" : "PENDING",
        lastError: String(error instanceof Error ? error.message : error).slice(
          0,
          500,
        ),
        nextAttemptAt: exhausted ? null : nextAttempt(attempts),
      },
    });

    if (exhausted) {
      captureError(error, {
        source: "email",
        id: record.id,
        category: record.category,
        attempts,
      });
    } else {
      logger.warn("email en échec, nouvelle tentative programmée", {
        id: record.id,
        attempts,
      });
    }

    return false;
  }
}

export async function deliver(id: string) {
  const record = await prisma.emailMessage.findUnique({ where: { id } });
  if (!record || record.status !== "PENDING") return false;
  return deliverRecord(record);
}

/** Rejoue les messages en attente. Appele par le cron. */
export async function flushEmailQueue(now = new Date(), limit = 50) {
  const pending = await prisma.emailMessage.findMany({
    where: {
      status: "PENDING",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  for (const record of pending) {
    if (await deliverRecord(record)) sent += 1;
  }

  return { picked: pending.length, sent, failed: pending.length - sent };
}

/**
 * Enregistre un rebond signale par le fournisseur. On retrouve le message par
 * son identifiant fournisseur, sinon par le dernier envoi a cette adresse.
 */
export async function markBounced(input: {
  providerId?: string | null;
  email?: string | null;
  reason?: string | null;
}) {
  const record = input.providerId
    ? await prisma.emailMessage.findFirst({
        where: { providerId: input.providerId },
      })
    : input.email
      ? await prisma.emailMessage.findFirst({
          where: { to: input.email.toLowerCase().trim() },
          orderBy: { createdAt: "desc" },
        })
      : null;

  if (!record) return null;

  await prisma.emailMessage.update({
    where: { id: record.id },
    data: {
      status: "BOUNCED",
      bouncedAt: new Date(),
      bounceReason: (input.reason ?? "rebond signalé par le fournisseur").slice(
        0,
        500,
      ),
    },
  });

  logger.warn("email non distribué", { id: record.id, to: record.to });

  // Le rebond doit se voir cote agence : il atterrit dans le fil du projet.
  if (record.projectId) {
    await prisma.activity
      .create({
        data: {
          projectId: record.projectId,
          actor: "SYSTEM",
          action: "Email non distribué",
          detail: `${record.to} — ${input.reason ?? "rebond"}`,
        },
      })
      .catch(() => undefined);
  }

  return record.id;
}
