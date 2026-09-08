# Sous-traitants ultérieurs

Issue #45. Liste à jour des prestataires susceptibles de traiter des données
pour le compte des agences clientes. Toute évolution est notifiée aux agences
avec un préavis de 30 jours, qui peuvent s'y opposer (art. 28.2).

| Rôle                           | Prestataire                        | Région               | Données concernées                         |
| ------------------------------ | ---------------------------------- | -------------------- | ------------------------------------------ |
| Hébergement applicatif et base | `<hébergeur>`                      | France / UE          | L'ensemble                                 |
| Stockage objet des fichiers    | Scaleway ou OVH                    | France (fr-par, gra) | Fichiers déposés                           |
| Envoi d'emails                 | Brevo, Postmark EU ou Scaleway TEM | France / UE          | Adresse, objet, contenu                    |
| Sauvegardes                    | `<stockage objet UE>`              | UE                   | Sauvegardes chiffrées                      |
| Suivi d'erreurs                | Sentry auto-hébergé ou région UE   | UE                   | Traces techniques, sans donnée personnelle |
| Paiement                       | Stripe Payments Europe (Irlande)   | UE                   | Données de facturation de l'agence         |

**Aucun transfert hors Union européenne.** Le choix des fournisseurs est
contraint par cette règle : c'est l'argument de vente, il doit rester vrai.

Stripe ne traite que les données de l'agence abonnée, jamais celles de ses
clients.
