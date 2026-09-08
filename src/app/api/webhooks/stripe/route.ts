import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripeCall, verifyWebhook } from "@/lib/stripe";
import { syncSubscription } from "@/lib/billing";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhooks Stripe (issue #41) : paiement echoue, abonnement annule, reprise.
 *
 * La signature est verifiee avant toute lecture : sans preuve, on ne croit
 * personne sur parole quand il declare un paiement reussi.
 */
type Event = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new NextResponse(null, { status: 404 });

  const payload = await request.text();
  if (
    !verifyWebhook(payload, request.headers.get("stripe-signature"), secret)
  ) {
    logger.warn("webhook Stripe refusé : signature invalide");
    return new NextResponse(null, { status: 400 });
  }

  const event = JSON.parse(payload) as Event;
  const object = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const agencyId = String(
        object.client_reference_id ??
          (object.metadata as Record<string, string> | undefined)?.agencyId ??
          "",
      );
      const customer = object.customer ? String(object.customer) : null;
      const subscriptionId = object.subscription
        ? String(object.subscription)
        : null;

      if (agencyId && customer) {
        await prisma.subscription.updateMany({
          where: { agencyId },
          data: {
            stripeCustomerId: customer,
            stripeSubscriptionId: subscriptionId,
          },
        });
      }

      if (subscriptionId) {
        const remote = await stripeCall(
          `/subscriptions/${subscriptionId}`,
          undefined,
          "GET",
        );
        await syncSubscription(remote as never);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(object as never);
      break;

    case "invoice.payment_failed": {
      const customer = object.customer ? String(object.customer) : null;
      if (customer) {
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customer },
          data: { status: "PAST_DUE" },
        });
      }
      logger.warn("paiement échoué", { event: event.id });
      break;
    }

    case "invoice.paid": {
      const customer = object.customer ? String(object.customer) : null;
      if (customer) {
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customer, status: "PAST_DUE" },
          data: { status: "ACTIVE" },
        });
      }
      break;
    }

    default:
      // Les autres evenements ne nous concernent pas : accuser reception
      // suffit, Stripe cesse alors de les rejouer.
      break;
  }

  return NextResponse.json({ received: true });
}
