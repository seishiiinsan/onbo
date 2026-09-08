# RGPD

Issue #45. « RGPD-clean » est l'argument de vente central : il doit être vrai
avant le premier euro encaissé.

| Document                       | Ce qu'il couvre                                 |
| ------------------------------ | ----------------------------------------------- |
| `registre-traitements.md`      | Registre du sous-traitant (art. 30.2)           |
| `politique-confidentialite.md` | Texte de la page publique                       |
| `cgu.md`                       | Conditions générales d'utilisation et de vente  |
| `mentions-legales.md`          | Éditeur, hébergeur, contacts                    |
| `dpa.md`                       | Accord de sous-traitance à signer avec l'agence |
| `sous-traitants.md`            | Prestataires et régions                         |
| `retention.md`                 | Durées de conservation et purge automatique     |

## Ce que le produit sait faire

| Demande                  | Où                                                         | Effet                               |
| ------------------------ | ---------------------------------------------------------- | ----------------------------------- |
| Export d'une agence      | Réglages → Données personnelles, ou `GET /api/rgpd/export` | JSON complet, secrets exclus        |
| Export d'un client       | `GET /api/rgpd/portal-export?token=…&email=…`              | JSON de ses données                 |
| Suppression d'un contact | Réglages → Données personnelles                            | Identité, rattachements, emails     |
| Suppression d'un espace  | Réglages, réservé au propriétaire                          | Tout, immédiatement, sans corbeille |
| Purge automatique        | `/api/cron/retention`, une fois par jour                   | Cf. `retention.md`                  |

Les secrets du coffre ne sont jamais déchiffrés dans un export : on exporte
leur existence, pas leur contenu. Un export qui recracherait les mots de passe
du client serait une fuite de données emballée en fonctionnalité.

## Traiter une demande de suppression de bout en bout

1. La demande arrive (email, ou l'agence la relaie).
2. Vérifier l'identité du demandeur — pour un client, l'agence le connaît.
3. Proposer l'export avant la suppression : c'est irréversible.
4. Réglages → Données personnelles → supprimer le contact, ou l'espace.
5. Confirmer par écrit au demandeur, sous un mois (art. 12.3).
6. La sauvegarde la plus ancienne contenant encore la donnée disparaît au bout
   de 30 jours (`BACKUP_RETENTION_DAYS`) : le dire dans la réponse.
