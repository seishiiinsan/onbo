import { logger } from "@/lib/logger";

/**
 * Suivi d'erreurs (issue #35).
 *
 * Envoi direct au protocole d'ingestion Sentry (« envelope »), sans SDK :
 * SENTRY_DSN peut pointer vers une instance auto-hebergee ou vers la region
 * UE de Sentry. Sans DSN, l'erreur reste dans les logs structures.
 */
type Dsn = { url: string; key: string };

function parseDsn(raw: string): Dsn | null {
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\//, "");
    if (!projectId || !url.username) return null;
    return {
      url: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      key: url.username,
    };
  } catch {
    return null;
  }
}

export function captureError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(message, { ...context, stack });

  const raw = process.env.SENTRY_DSN;
  if (!raw) return;

  const dsn = parseDsn(raw);
  if (!dsn) {
    logger.warn("SENTRY_DSN illisible, erreur non transmise");
    return;
  }

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const sentAt = new Date().toISOString();

  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: sentAt, dsn: raw }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({
      event_id: eventId,
      timestamp: sentAt,
      platform: "node",
      level: "error",
      environment: process.env.NODE_ENV ?? "development",
      release: process.env.APP_RELEASE ?? undefined,
      server_name: undefined,
      // Contexte deja nettoye par l'appelant : ni secret, ni donnee personnelle.
      extra: context,
      exception: {
        values: [
          {
            type: error instanceof Error ? error.name : "Error",
            value: message,
            stacktrace: stack
              ? { frames: [{ filename: stack.split("\n")[1] ?? "" }] }
              : undefined,
          },
        ],
      },
    }),
  ].join("\n");

  // Envoi « au mieux » : un collecteur injoignable ne casse pas la requete.
  void fetch(dsn.url, {
    method: "POST",
    headers: {
      "content-type": "application/x-sentry-envelope",
      "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=onbo/1`,
    },
    body: envelope,
  }).catch(() => undefined);
}
