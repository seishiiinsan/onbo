import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Client Stripe minimal (issue #41).
 *
 * L'API Stripe est en `application/x-www-form-urlencoded` : trois appels
 * suffisent (session de paiement, portail client, lecture d'abonnement), le
 * SDK n'apporterait rien de plus qu'une dependance a suivre.
 */
const API = "https://api.stripe.com/v1";

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante.");
  return key;
}

/** Encode un objet imbrique au format attendu par Stripe (a[b][c]=v). */
export function encodeForm(
  input: Record<string, unknown>,
  prefix = "",
): string[] {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object") {
          parts.push(
            ...encodeForm(item as Record<string, unknown>, `${name}[${index}]`),
          );
        } else {
          parts.push(
            `${encodeURIComponent(`${name}[${index}]`)}=${encodeURIComponent(String(item))}`,
          );
        }
      });
    } else if (typeof value === "object") {
      parts.push(...encodeForm(value as Record<string, unknown>, name));
    } else {
      parts.push(
        `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`,
      );
    }
  }

  return parts;
}

export async function stripeCall<T = Record<string, unknown>>(
  path: string,
  body?: Record<string, unknown>,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secretKey()}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": "2024-06-20",
    },
    body: body ? encodeForm(body).join("&") : undefined,
  });

  const payload = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      `Stripe ${path} : ${payload.error?.message ?? response.status}`,
    );
  }
  return payload;
}

/**
 * Verifie la signature d'un webhook (schema v1 de Stripe).
 *
 * Une signature non verifiee revient a laisser n'importe qui declarer un
 * paiement reussi : la route refuse tout ce qu'elle ne peut pas prouver.
 */
export function verifyWebhook(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
) {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key.trim(), rest.join("=")];
    }),
  );

  const timestamp = Number(parts.t);
  if (
    !timestamp ||
    Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const given = parts.v1 ?? "";
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
