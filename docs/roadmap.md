# Feuille de route

Issue #89. Où en est le produit, et dans quel ordre avancer.

Mise à jour : 8 septembre 2026, après le passage du lot 1.

## Livré

**Produit** : authentification staff par lien magique, cloisonnement
multi-tenant et affectations par projet, projets et checklist, portail client
brandé, dépôt de fichiers, coffre d'accès chiffré avec journal, validation et
échanges, relances automatiques, tableau de bord filtrable, journal
d'activité, thème sombre, français/anglais côté portail.

**Lot 1 — rendre vendable**

| Issue                             | État                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| #29 emails transactionnels UE     | ✅ adaptateurs Brevo / Postmark EU / Scaleway, gabarits, file avec reprise, rebonds                           |
| #30 HTTPS, domaine, reverse proxy | ✅ Caddy, sous-domaine des portails, en-têtes, cookie `Secure` inconditionnel                                 |
| #31 sauvegardes chiffrées         | ✅ scripts de sauvegarde et de restauration, rétention, alertes — **exercice de restauration à chronométrer** |
| #32 stockage objet UE             | ✅ adaptateur S3 sans SDK, URL présignée, migration de l'existant, antivirus optionnel                        |
| #33 rotation de la clé du coffre  | ✅ trousseau multi-clés, `keyId` par secret, commande de re-chiffrement                                       |
| #34 limitation de débit           | ✅ compteurs en base, `/login`, portail, quotas de volume, journal des refus                                  |
| #35 observabilité                 | ✅ logs JSON sans donnée personnelle, suivi d'erreurs, `/api/health`, `/api/metrics`, sonde et alerte         |
| #36 tests et CI                   | ✅ unitaires, intégration multi-tenant, e2e, lint et format bloquants                                         |
| #38 envoi du lien depuis l'app    | ✅ choix des contacts, message pré-rédigé, trace d'envoi                                                      |
| #39 notifications agence          | ✅ soumission, message, accès déposé, blocage, résumé quotidien, centre de notifications                      |
| #45 RGPD                          | ✅ registre, DPA, politique, CGU, export et suppression, purge de rétention                                   |
| #41 facturation Stripe            | ✅ formules confirmées, essai 14 jours, portail client, webhooks signés, TVA                                  |
| #85 file de tâches de fond        | ⏳ P1 — la file d'emails couvre le besoin immédiat                                                            |

**Ce qui reste à faire à la main sur le lot 1**, et que le code ne peut pas
faire : publier SPF/DKIM/DMARC sur le domaine d'envoi, pointer les
enregistrements DNS, créer les prix Stripe et activer Stripe Tax, rejouer une
restauration complète et la chronométrer, activer la protection de branche,
compléter les mentions `<...>` des documents légaux.

## Ordre suivant

**Lot 2 — encaisser** : #42 limites de plan (dépend de #41, déjà en place) ·
#43 emails de cycle de vie · #44 prise en main guidée · #46 pages légales
publiques (les textes existent déjà dans `docs/rgpd/`) · **#82 pilotes**.

**Lot 3 — retenir** : #47 templates · #48 champs structurés · #50
assignation · #51 échéances · #52 vue consolidée · #58 espace client
permanent · #59 coffre étendu.

**Lot 4 — élargir** : #53 livrables · #56 passation · #57 demandes
récurrentes · #62 compte client · #69 API · #70 webhooks · #72 marque
blanche.

## Le risque n'a pas bougé

Aucune agence n'a encore utilisé Onbo en conditions réelles (#82). Le lot 1
rend le produit vendable ; il ne dit toujours pas s'il est voulu. L'ordre des
lots 3 et 4 reste une hypothèse tant que trois agences n'ont pas fait passer
un vrai client — et le protocole les attend dans `docs/pilotes.md`.

Conséquence pratique : ne pas attaquer le lot 3 avant d'avoir lancé les
pilotes. Le lot 2 se justifie sans eux (on ne peut pas encaisser sans
facturation ni pages légales) ; le lot 3 non.

## Où lire quoi

| Sujet           | Document                |
| --------------- | ----------------------- |
| Emails          | `docs/emails.md`        |
| HTTPS et proxy  | `docs/https.md`         |
| Sauvegardes     | `docs/sauvegardes.md`   |
| Stockage        | `docs/stockage.md`      |
| Rotation de clé | `docs/rotation-cle.md`  |
| Abus et débit   | `docs/securite-abus.md` |
| Observabilité   | `docs/observabilite.md` |
| Facturation     | `docs/facturation.md`   |
| RGPD            | `docs/rgpd/`            |
| Tests et CI     | `docs/tests.md`         |
| Pilotes         | `docs/pilotes.md`       |
