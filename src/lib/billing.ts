import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripeCall, stripeConfigured } from "@/lib/stripe";
import { enqueueMail } from "@/lib/email/queue";
import { notificationEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

/**
 * Facturation (issue #41).
 *
 * Unite de facturation : **le siege**, c'est-a-dire un membre de l'agence.
 * Le nombre de clients actifs varie d'un mois a l'autre et se pilote mal ; le
 * nombre de personnes qui travaillent dans l'outil est stable, comprehensible
 * a l'achat, et ne punit pas une agence qui reussit. Les limites par formule
 * (projets, clients) sont appliquees par l'issue #42.
 */
export const TRIAL_DAYS = 14;

export type Plan = {
  tier: PlanTier;
  nom: string;
  prixMensuelEuros: number;
  siegesInclus: number;
  /** Identifiant du prix Stripe, cote tableau de bord. */
  priceEnv: string;
};

export const PLANS: Plan[] = [
  {
    tier: "SOLO",
    nom: "Solo",
    prixMensuelEuros: 29,
    siegesInclus: 1,
    priceEnv: "STRIPE_PRICE_SOLO",
  },
  {
    tier: "STUDIO",
    nom: "Studio",
    prixMensuelEuros: 99,
    siegesInclus: 5,
    priceEnv: "STRIPE_PRICE_STUDIO",
  },
  {
    tier: "AGENCE",
    nom: "Agence",
    prixMensuelEuros: 149,
    siegesInclus: 15,
    priceEnv: "STRIPE_PRICE_AGENCE",
  },
];

export function planOf(tier: PlanTier) {
  return PLANS.find((plan) => plan.tier === tier) ?? PLANS[0];
}

/** Abonnement de l'agence, cree en essai s'il n'existe pas encore. */
export async function subscriptionOf(agencyId: string) {
  const existing = await prisma.subscription.findUnique({ where: { agencyId } });
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      agencyId,
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
    },
  });
}

/** L'espace est-il utilisable ? Essai en cours ou abonnement paye. */
export function isUsable(subscription: {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}) {
  const now = Date.now();

  if (subscription.status === "ACTIVE") return true;
  if (subscription.status === "TRIALING") {
    return (subscription.trialEndsAt?.getTime() ?? 0) > now;
  }
  // Impaye : on laisse la porte ouverte jusqu'a la fin de la periode payee,
  // le temps que l'agence mette a jour sa carte.
  if (subscription.status === "PAST_DUE") {
    return (subscription.currentPeriodEnd?.getTime() ?? 0) > now;
  }
  return false;
}

export function daysLeftOfTrial(trialEndsAt: Date | null, now = new Date()) {
  if (!trialEndsAt) return 0;
  return Math.max(
    0,
    Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000),
  );
}

const STATUS: Record<string, SubscriptionStatus> = {
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  unpaid: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "CANCELED",
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  trial_end?: number | null;
  items?: { data?: { price?: { id?: string }; quantity?: number }[] };
};

function tierForPrice(priceId?: string): PlanTier | null {
  for (const plan of PLANS) {
    if (priceId && process.env[plan.priceEnv] === priceId) return plan.tier;
  }
  return null;
}

/** Recopie l'etat Stripe dans notre base : Stripe reste la source de verite. */
export async function syncSubscription(remote: StripeSubscription) {
  const item = remote.items?.data?.[0];
  const tier = tierForPrice(item?.price?.id);

  const data = {
    status: STATUS[remote.status] ?? "INCOMPLETE",
    cancelAtPeriodEnd: Boolean(remote.cancel_at_period_end),
    currentPeriodEnd: remote.current_period_end
      ? new Date(remote.current_period_end * 1000)
      : null,
    trialEndsAt: remote.trial_end ? new Date(remote.trial_end * 1000) : null,
    seats: item?.quantity ?? 1,
    stripeSubscriptionId: remote.id,
    ...(tier ? { plan: tier } : {}),
  };

  const updated = await prisma.subscription.updateMany({
    where: {
      OR: [
        { stripeSubscriptionId: remote.id },
        { stripeCustomerId: remote.customer },
      ],
    },
    data,
  });

  logger.info("abonnement synchronisé", {
    subscription: remote.id,
    status: data.status,
    lignes: updated.count,
  });

  return updated.count;
}

/** Session de paiement Stripe Checkout, essai de 14 jours sans carte inclus. */
export async function createCheckout(input: {
  agencyId: string;
  agencyName: string;
  email: string;
  plan: PlanTier;
  seats: number;
}) {
  if (!stripeConfigured()) throw new Error("Facturation non configurée.");

  const plan = planOf(input.plan);
  const priceId = process.env[plan.priceEnv];
  if (!priceId) throw new Error(`Prix Stripe manquant (${plan.priceEnv}).`);

  const subscription = await subscriptionOf(input.agencyId);
  const base = process.env.APP_URL ?? "http://localhost:3000";

  const session = await stripeCall<{ id: string; url: string }>(
    "/checkout/sessions",
    {
      mode: "subscription",
      customer: subscription.stripeCustomerId ?? undefined,
      customer_email: subscription.stripeCustomerId ? undefined : input.email,
      client_reference_id: input.agencyId,
      line_items: [{ price: priceId, quantity: Math.max(1, input.seats) }],
      // TVA France et UE calculee par Stripe Tax, factures conformes.
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      customer_update: subscription.stripeCustomerId
        ? { name: "auto", address: "auto" }
        : undefined,
      subscription_data: {
        metadata: { agencyId: input.agencyId, agence: input.agencyName },
      },
      metadata: { agencyId: input.agencyId },
      success_url: `${base}/app/settings?facturation=ok`,
      cancel_url: `${base}/app/settings?facturation=annule`,
    },
  );

  return session.url;
}

/** Portail Stripe : moyens de paiement, factures, resiliation. */
export async function createBillingPortal(agencyId: string) {
  const subscription = await subscriptionOf(agencyId);
  if (!subscription.stripeCustomerId) return null;

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const session = await stripeCall<{ url: string }>(
    "/billing_portal/sessions",
    {
      customer: subscription.stripeCustomerId,
      return_url: `${base}/app/settings`,
    },
  );

  return session.url;
}

/**
 * Relance a J-3 de la fin d'essai (issue #41).
 *
 * Une seule fois par essai : trialReminderAt sert de garde-fou.
 */
export async function remindExpiringTrials(now = new Date()) {
  const limit = new Date(now.getTime() + 3 * 86_400_000);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "TRIALING",
      trialReminderAt: null,
      trialEndsAt: { gt: now, lte: limit },
    },
    include: {
      agency: {
        include: {
          memberships: {
            where: { role: "OWNER" },
            include: { user: true },
          },
        },
      },
    },
  });

  let sent = 0;
  const base = process.env.APP_URL ?? "http://localhost:3000";

  for (const subscription of subscriptions) {
    const jours = daysLeftOfTrial(subscription.trialEndsAt, now);

    for (const membership of subscription.agency.memberships) {
      const template = notificationEmail({
        branding: {
          agencyName: subscription.agency.name,
          accentColor: subscription.agency.accentColor,
          logoUrl: subscription.agency.logoUrl,
        },
        title: `Votre essai Onbo se termine dans ${jours} jour(s)`,
        lines: [
          `Bonjour${membership.user.name ? ` ${membership.user.name}` : ""},`,
          `L'essai de ${subscription.agency.name} se termine dans ${jours} jour(s).`,
          "Vos projets, fichiers et accès restent en place : il suffit de choisir une formule pour continuer.",
        ],
        url: `${base}/app/settings`,
        linkLabel: "Choisir une formule",
      });

      await enqueueMail({
        to: membership.user.email,
        agencyId: subscription.agencyId,
        ...template,
      });
      sent += 1;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { trialReminderAt: now },
    });
  }

  return { relances: sent };
}
