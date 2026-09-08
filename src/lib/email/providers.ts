import type { EmailProvider, Mail, SendResult } from "@/lib/email/types";
import { fromAddress, parseAddress } from "@/lib/email/types";

/**
 * Fournisseurs d'envoi (issue #29).
 *
 * Trois adaptateurs HTTP, tous hebergeables en UE : Brevo (FR), Postmark EU
 * et Scaleway TEM (FR). Le mode "console" reste le defaut en developpement :
 * le lien magique est cliquable depuis les logs, sans compte fournisseur.
 */

class ConsoleProvider implements EmailProvider {
  readonly name = "console";

  async send(mail: Mail): Promise<SendResult> {
    console.log(
      [
        "",
        "──────── EMAIL ────────",
        `À       : ${mail.to}`,
        `Sujet   : ${mail.subject}`,
        "",
        mail.text,
        "───────────────────────",
        "",
      ].join("\n"),
    );
    return { providerId: null };
  }
}

/** Erreur d'envoi : `retryable` distingue une panne passagere d'un rejet definitif. */
export class SendError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

async function post(url: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    // Reseau injoignable : ca repartira au prochain passage de la file.
    throw new SendError(`fournisseur injoignable : ${String(error)}`, true);
  }

  const body = await response.text();
  if (!response.ok) {
    // 4xx = message ou configuration invalide, inutile de reessayer.
    const retryable = response.status === 429 || response.status >= 500;
    throw new SendError(
      `HTTP ${response.status} — ${body.slice(0, 300)}`,
      retryable,
    );
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new SendError(`variable ${name} manquante`, false);
  }
  return value;
}

class BrevoProvider implements EmailProvider {
  readonly name = "brevo";

  async send(mail: Mail): Promise<SendResult> {
    const sender = parseAddress(fromAddress());
    const payload = await post("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": requiredEnv("BREVO_API_KEY"),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: sender.email, name: sender.name ?? undefined },
        to: [{ email: mail.to }],
        subject: mail.subject,
        textContent: mail.text,
        htmlContent: mail.html,
        replyTo: mail.replyTo ? { email: mail.replyTo } : undefined,
        tags: mail.category ? [mail.category] : undefined,
      }),
    });

    return { providerId: (payload.messageId as string | undefined) ?? null };
  }
}

class PostmarkProvider implements EmailProvider {
  readonly name = "postmark";

  async send(mail: Mail): Promise<SendResult> {
    // Compte europeen : api-eu.postmarkapp.com. Surchargeable si besoin.
    const base =
      process.env.POSTMARK_API_URL ?? "https://api-eu.postmarkapp.com";
    const payload = await post(`${base}/email`, {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": requiredEnv("POSTMARK_TOKEN"),
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        From: fromAddress(),
        To: mail.to,
        Subject: mail.subject,
        TextBody: mail.text,
        HtmlBody: mail.html,
        ReplyTo: mail.replyTo ?? undefined,
        MessageStream: process.env.POSTMARK_STREAM ?? "outbound",
        Tag: mail.category,
      }),
    });

    return { providerId: (payload.MessageID as string | undefined) ?? null };
  }
}

class ScalewayProvider implements EmailProvider {
  readonly name = "scaleway";

  async send(mail: Mail): Promise<SendResult> {
    const region = process.env.SCALEWAY_REGION ?? "fr-par";
    const sender = parseAddress(fromAddress());
    const payload = await post(
      `https://api.scaleway.com/transactional-email/v1alpha1/regions/${region}/emails`,
      {
        method: "POST",
        headers: {
          "X-Auth-Token": requiredEnv("SCALEWAY_SECRET_KEY"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          project_id: requiredEnv("SCALEWAY_PROJECT_ID"),
          from: { email: sender.email, name: sender.name ?? undefined },
          to: [{ email: mail.to }],
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        }),
      },
    );

    const emails = payload.emails as Array<{ id?: string }> | undefined;
    return { providerId: emails?.[0]?.id ?? null };
  }
}

const PROVIDERS: Record<string, () => EmailProvider> = {
  console: () => new ConsoleProvider(),
  brevo: () => new BrevoProvider(),
  postmark: () => new PostmarkProvider(),
  scaleway: () => new ScalewayProvider(),
};

export function emailProvider(): EmailProvider {
  const name = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();
  const factory = PROVIDERS[name];
  if (!factory) {
    throw new SendError(`fournisseur d'email inconnu : ${name}`, false);
  }
  return factory();
}

/** Vrai des qu'un vrai fournisseur est branche (sert aux ecrans de diagnostic). */
export function hasRealProvider() {
  return (process.env.EMAIL_PROVIDER ?? "console").toLowerCase() !== "console";
}
