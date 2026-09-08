import { NextResponse, type NextRequest } from "next/server";
import { markBounced } from "@/lib/email/queue";
import { safeEqual } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rebonds et plaintes signales par le fournisseur (issue #29).
 *
 * Le secret partage passe par l'URL (?secret=) ou l'en-tete x-webhook-secret,
 * selon ce que le fournisseur sait envoyer. Sans EMAIL_WEBHOOK_SECRET
 * configure, la route repond 404 : rien d'ouvert par defaut.
 */
type Payload = Record<string, unknown>;

function pick(payload: Payload, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

/** Chaque fournisseur nomme differemment l'evenement, le message et l'adresse. */
function normalize(provider: string, payload: Payload) {
  const event = (
    pick(payload, ["event", "RecordType", "type", "Type"]) ?? ""
  ).toLowerCase();

  const bounced = [
    "bounce",
    "spam",
    "complaint",
    "blocked",
    "invalid",
    "rejected",
    "error",
  ].some((needle) => event.includes(needle));

  return {
    provider,
    bounced,
    email: pick(payload, ["email", "Email", "Recipient", "recipient", "to"]),
    providerId: pick(payload, [
      "message-id",
      "messageId",
      "MessageID",
      "message_id",
      "email_id",
    ]),
    reason: pick(payload, ["reason", "Description", "Details", "error"]),
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) return new NextResponse(null, { status: 404 });

  const given =
    request.headers.get("x-webhook-secret") ??
    request.nextUrl.searchParams.get("secret") ??
    "";
  if (!safeEqual(given, secret)) return new NextResponse(null, { status: 404 });

  const { provider } = await context.params;
  const payload = (await request.json().catch(() => ({}))) as Payload;

  // Brevo poste un objet, Postmark un objet, Scaleway un tableau d'evenements.
  const events = Array.isArray(payload) ? (payload as Payload[]) : [payload];

  let handled = 0;
  for (const raw of events) {
    const event = normalize(provider, raw);
    if (!event.bounced) continue;

    const id = await markBounced({
      providerId: event.providerId,
      email: event.email,
      reason: event.reason,
    });
    if (id) handled += 1;
  }

  return NextResponse.json({ received: events.length, handled });
}
