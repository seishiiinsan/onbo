"use client";

import { useActionState, useTransition } from "react";
import {
  openBillingPortal,
  startCheckout,
  type BillingState,
} from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Abonnement et facturation (issue #41). */
export type BillingView = {
  plan: string;
  planLabel: string;
  status: string;
  statusLabel: string;
  trialDaysLeft: number;
  renewsOn: string | null;
  seats: number;
  hasCustomer: boolean;
  configured: boolean;
  plans: { tier: string; nom: string; prix: number; sieges: number }[];
};

const initial: BillingState = {};

export function BillingPanel({
  view,
  isOwner,
}: {
  view: BillingView;
  isOwner: boolean;
}) {
  const [state, action, pending] = useActionState(startCheckout, initial);
  const [opening, startOpening] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          {view.planLabel} — {view.statusLabel}
          {view.status === "TRIALING" && (
            <span className="text-[var(--color-muted)]">
              {" "}
              · {view.trialDaysLeft} jour(s) restant(s)
            </span>
          )}
          {view.renewsOn && (
            <span className="text-[var(--color-muted)]">
              {" "}
              · prochaine échéance le {view.renewsOn}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Facturation au siège : {view.seats} personne(s) dans l&apos;espace.
        </p>

        {!view.configured ? (
          <p className="mt-4 text-xs text-[var(--color-muted)]">
            La facturation n&apos;est pas encore branchée sur cette
            installation.
          </p>
        ) : !isOwner ? (
          <p className="mt-4 text-xs text-[var(--color-muted)]">
            Seul le propriétaire de l&apos;espace gère l&apos;abonnement.
          </p>
        ) : (
          <>
            <form action={action} className="mt-4 grid gap-2 sm:grid-cols-3">
              {view.plans.map((plan) => (
                <button
                  key={plan.tier}
                  type="submit"
                  name="plan"
                  value={plan.tier}
                  disabled={pending}
                  className={cn(
                    "focusable rounded-xl border p-3 text-left transition-colors",
                    plan.tier === view.plan
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                      : "border-[var(--color-line)] hover:border-[var(--color-ink)]",
                  )}
                >
                  <span className="block text-sm font-medium">{plan.nom}</span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {plan.prix} € / mois · {plan.sieges} siège(s)
                  </span>
                </button>
              ))}
            </form>

            {state.error && (
              <p className="mt-2 text-sm text-[var(--color-danger)]">
                {state.error}
              </p>
            )}

            {view.hasCustomer && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={opening}
                onClick={() =>
                  startOpening(async () => {
                    await openBillingPortal();
                  })
                }
              >
                Moyens de paiement et factures
              </Button>
            )}

            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Essai de 14 jours sans carte bancaire. TVA calculée
              automatiquement, factures conformes disponibles dans le portail.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
