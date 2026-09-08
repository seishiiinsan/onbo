import { describe, expect, it } from "vitest";
import { daysLeftOfTrial, isUsable, planOf, PLANS } from "@/lib/billing";
import { encodeForm, verifyWebhook } from "@/lib/stripe";
import { createHmac } from "node:crypto";

describe("abonnement", () => {
  const dans = (jours: number) => new Date(Date.now() + jours * 86_400_000);

  it("laisse l'espace ouvert pendant l'essai, fermé après", () => {
    expect(
      isUsable({
        status: "TRIALING",
        trialEndsAt: dans(3),
        currentPeriodEnd: null,
      }),
    ).toBe(true);
    expect(
      isUsable({
        status: "TRIALING",
        trialEndsAt: dans(-1),
        currentPeriodEnd: null,
      }),
    ).toBe(false);
  });

  it("laisse un impayé travailler jusqu'à la fin de la période payée", () => {
    expect(
      isUsable({
        status: "PAST_DUE",
        trialEndsAt: null,
        currentPeriodEnd: dans(5),
      }),
    ).toBe(true);
    expect(
      isUsable({
        status: "PAST_DUE",
        trialEndsAt: null,
        currentPeriodEnd: dans(-5),
      }),
    ).toBe(false);
  });

  it("ferme un abonnement résilié", () => {
    expect(
      isUsable({
        status: "CANCELED",
        trialEndsAt: dans(9),
        currentPeriodEnd: dans(9),
      }),
    ).toBe(false);
  });

  it("expose les trois formules de la landing", () => {
    expect(PLANS.map((plan) => plan.prixMensuelEuros)).toEqual([29, 99, 149]);
    expect(planOf("STUDIO").siegesInclus).toBe(5);
  });

  it("compte les jours d'essai restants", () => {
    expect(daysLeftOfTrial(dans(2.5))).toBe(3);
    expect(daysLeftOfTrial(null)).toBe(0);
    expect(daysLeftOfTrial(dans(-2))).toBe(0);
  });
});

describe("webhook Stripe", () => {
  const secret = "whsec_test";
  const payload = '{"id":"evt_1"}';

  const entete = (timestamp: number, corps = payload) =>
    `t=${timestamp},v1=${createHmac("sha256", secret)
      .update(`${timestamp}.${corps}`)
      .digest("hex")}`;

  it("accepte une signature valide", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(verifyWebhook(payload, entete(now), secret)).toBe(true);
  });

  it("refuse une signature absente, fausse ou périmée", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(verifyWebhook(payload, null, secret)).toBe(false);
    expect(verifyWebhook(payload, `t=${now},v1=0000`, secret)).toBe(false);
    expect(verifyWebhook(payload, entete(now - 3600), secret)).toBe(false);
    // Corps modifié après signature : c'est tout l'intérêt de la vérification.
    expect(verifyWebhook('{"id":"evt_2"}', entete(now), secret)).toBe(false);
  });

  it("encode les objets imbriqués au format Stripe", () => {
    const parts = encodeForm({
      mode: "subscription",
      line_items: [{ price: "price_1", quantity: 2 }],
      automatic_tax: { enabled: true },
    });

    expect(parts).toContain("mode=subscription");
    expect(parts).toContain("line_items%5B0%5D%5Bprice%5D=price_1");
    expect(parts).toContain("automatic_tax%5Benabled%5D=true");
  });
});
