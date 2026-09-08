# Facturation

Issue #41. Sans facturation, il n'y a pas de SaaS.

## Unité de facturation : le siège

Deux options étaient sur la table : le siège (une personne de l'agence) ou le
client actif. **Le siège est retenu.**

- Le nombre de clients actifs varie d'un mois sur l'autre : une facture qui
  bouge sans prévenir se conteste, et pénalise une agence qui réussit.
- Le nombre de personnes qui travaillent dans l'outil est stable, connu à
  l'achat, et se compare immédiatement aux autres outils de l'agence.
- C'est aussi la seule des deux unités que l'agence contrôle directement.

Les formules affichées sur la landing sont confirmées :

| Formule | Prix         | Sièges inclus |
| ------- | ------------ | ------------- |
| Solo    | 29 € / mois  | 1             |
| Studio  | 99 € / mois  | 5             |
| Agence  | 149 € / mois | 15            |

Les limites associées (projets, clients) sont appliquées par l'issue #42 : ce
lot-ci encaisse, l'autre contraint.

## Essai

14 jours, sans carte bancaire. L'abonnement est créé en `TRIALING` dès
l'ouverture de l'espace. Relance automatique à J-3, une seule fois
(`trialReminderAt`), envoyée au propriétaire de l'espace.

À l'expiration sans abonnement, l'espace n'est plus utilisable
(`isUsable()`) ; rien n'est supprimé — les données restent 30 jours, cf.
`docs/rgpd/retention.md`.

## Configuration

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SOLO=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_AGENCE=price_...
```

Côté tableau de bord Stripe : trois prix récurrents mensuels en euros,
**Stripe Tax activé** (TVA France et UE, factures conformes), collecte du
numéro de TVA intracommunautaire activée sur le Checkout, et le portail client
configuré pour autoriser le changement de moyen de paiement, l'accès aux
factures et la résiliation.

Sans `STRIPE_SECRET_KEY`, l'application fonctionne et l'écran d'abonnement
indique simplement que la facturation n'est pas branchée.

## Webhooks

Endpoint : `POST /api/webhooks/stripe`, signature vérifiée (schéma `v1`,
tolérance 5 minutes). Une signature non vérifiée reviendrait à laisser
n'importe qui déclarer un paiement réussi.

| Événement                                       | Effet                                             |
| ----------------------------------------------- | ------------------------------------------------- |
| `checkout.session.completed`                    | rattache le client Stripe à l'agence, synchronise |
| `customer.subscription.created/updated/deleted` | recopie statut, formule, sièges, échéance         |
| `invoice.payment_failed`                        | passe en `PAST_DUE`                               |
| `invoice.paid`                                  | ressort de `PAST_DUE`                             |

Stripe reste la source de vérité des montants : la base ne recopie que ce dont
l'application a besoin pour décider ce qui est ouvert.

## Vérifier

1. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Souscrire avec la carte de test `4242 4242 4242 4242`
3. L'écran Réglages doit passer en « abonnement actif » avec la bonne échéance
4. Rejouer `invoice.payment_failed` : l'espace passe en « paiement en attente »
