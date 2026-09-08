"use server";

import { redirect } from "next/navigation";
import type { PlanTier } from "@prisma/client";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createBillingPortal, createCheckout } from "@/lib/billing";

export type BillingState = { error?: string };

/** Ouvre une session de paiement pour la formule choisie (issue #41). */
export async function startCheckout(
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") {
    return { error: "Seul le propriétaire de l'espace gère l'abonnement." };
  }

  const plan = String(formData.get("plan") ?? "SOLO") as PlanTier;
  const seats = await prisma.membership.count({
    where: { agencyId: ctx.agencyId },
  });

  let url: string | null = null;
  try {
    url = await createCheckout({
      agencyId: ctx.agencyId,
      agencyName: ctx.agencyName,
      email: ctx.email,
      plan,
      seats,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Échec Stripe." };
  }

  if (!url) return { error: "Session de paiement indisponible." };
  redirect(url);
}

/** Portail Stripe : moyens de paiement, factures, resiliation. */
export async function openBillingPortal(): Promise<void> {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") return;

  const url = await createBillingPortal(ctx.agencyId);
  if (url) redirect(url);
}
