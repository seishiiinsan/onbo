# Recette manuelle — préproduction

À jouer sur https://onbo-git-develop-seishin-studio.vercel.app après chaque
déploiement notable. Coche, note ce qui casse, ouvre une issue par écart.

## Avant de commencer

- `GET /api/health` doit rendre `"database": "ok"`. Le reste du champ dit dans
  quelle configuration tu testes :
  - `"email": "console"` → **aucun mail ne part**, les liens se lisent dans
    Vercel → Logs (chercher `EMAIL`) ;
  - `"storage": "disque"` → **les dépôts de fichiers échoueront** : le disque
    est en lecture seule sur Vercel, il faut les variables `S3_*` ;
  - Stripe non configuré → l'écran Abonnement l'annonce, c'est normal.
- Prévois deux navigateurs (ou un profil privé) : côté agence et côté client
  en même temps.

## 1. Connexion et espace

| #   | Test                                     | Attendu                                             |
| --- | ---------------------------------------- | --------------------------------------------------- |
| 1.1 | Demander un lien avec une adresse valide | Message « lien envoyé », lien visible dans les logs |
| 1.2 | Ouvrir le lien                           | Connecté, arrivée sur `/onboarding` ou `/app`       |
| 1.3 | Rouvrir **le même** lien                 | Refusé : usage unique                               |
| 1.4 | Demander un lien avec `pasunemail`       | « Adresse email invalide », rien dans les logs      |
| 1.5 | Créer l'espace agence                    | Redirection vers `/app`, nom affiché dans le rail   |
| 1.6 | Se déconnecter puis revenir sur `/app`   | Renvoyé vers `/login`                               |
| 1.7 | Recharger après connexion                | Session conservée (cookie `Secure` accepté)         |

## 2. Projet et checklist

| #   | Test                                                        | Attendu                                                 |
| --- | ----------------------------------------------------------- | ------------------------------------------------------- |
| 2.1 | Créer un projet avec la checklist par défaut                | 4 étapes créées                                         |
| 2.2 | Créer un projet **avec** email client + « envoyer le lien » | Contact rattaché, mail de portail visible dans les logs |
| 2.3 | Ajouter, renommer, réordonner une étape                     | Ordre conservé après rechargement                       |
| 2.4 | Passer une étape en optionnelle                             | L'avancement remonte : elle ne compte plus              |
| 2.5 | Signaler un blocage sur une étape                           | Motif visible côté agence **et** côté portail           |
| 2.6 | Régler une échéance, changer le statut du projet            | Valeurs conservées                                      |
| 2.7 | Dupliquer un projet                                         | Étapes copiées, sans les fichiers ni les contacts       |

## 3. Portail client

| #   | Test                                           | Attendu                                             |
| --- | ---------------------------------------------- | --------------------------------------------------- |
| 3.1 | Ouvrir le lien de portail en navigation privée | Portail aux couleurs de l'agence, sans compte       |
| 3.2 | Écrire un message côté client                  | Visible côté agence dans le fil                     |
| 3.3 | Marquer une étape « complète » côté client     | Passe en « Soumis », l'agence est notifiée          |
| 3.4 | Valider l'étape côté agence                    | Le client la voit validée, ne peut plus la modifier |
| 3.5 | Note interne côté agence                       | **Jamais** visible sur le portail                   |
| 3.6 | Révoquer le lien puis le rouvrir               | 404                                                 |
| 3.7 | Régénérer le lien                              | Nouveau lien fonctionnel, ancien mort               |
| 3.8 | Token bidon (`/p/nimportequoi`)                | 404, sans fuite d'information                       |
| 3.9 | Basculer `?lang=en`                            | Portail en anglais                                  |

## 4. Envoi du lien et emails

| #   | Test                                              | Attendu                                                  |
| --- | ------------------------------------------------- | -------------------------------------------------------- |
| 4.1 | « Envoyer le lien » à un contact                  | Mail dans les logs, « Lien envoyé le … » sous le contact |
| 4.2 | Renvoyer à deux contacts d'un coup                | Deux envois, deux traces                                 |
| 4.3 | Personnaliser le message avant envoi              | Le texte saisi part, le lien est ajouté automatiquement  |
| 4.4 | Onglet Journal du projet                          | Ligne « Lien du portail envoyé » avec les destinataires  |
| 4.5 | Avec un vrai fournisseur (`EMAIL_PROVIDER=brevo`) | Mail reçu en moins de 30 s, HTML lisible                 |

## 5. Coffre d'accès

| #   | Test                               | Attendu                                                       |
| --- | ---------------------------------- | ------------------------------------------------------------- |
| 5.1 | Déposer un accès depuis le portail | Enregistré ; le secret n'est **jamais** réaffiché côté client |
| 5.2 | Révéler le secret côté agence      | Affiché une fois, ligne ajoutée au journal d'accès            |
| 5.3 | Membre sans droit coffre           | Le secret n'est pas révélable                                 |
| 5.4 | Supprimer un accès                 | Disparaît des deux côtés                                      |

## 6. Fichiers

À faire seulement une fois les variables `S3_*` posées.

| #   | Test                                    | Attendu                                                      |
| --- | --------------------------------------- | ------------------------------------------------------------ |
| 6.1 | Déposer un PDF côté client              | Visible côté agence, téléchargeable                          |
| 6.2 | Déposer une image                       | Vignette affichée                                            |
| 6.3 | Déposer un `.exe` ou un fichier > 25 Mo | Refusé avec un message clair                                 |
| 6.4 | Télécharger le zip d'une étape          | Archive contenant les fichiers                               |
| 6.5 | Sans `S3_*`                             | Message « Stockage objet non configuré », pas une erreur 500 |

## 7. Équipe et cloisonnement

| #   | Test                                              | Attendu                                      |
| --- | ------------------------------------------------- | -------------------------------------------- |
| 7.1 | Inviter un second compte, rôle MEMBER             | Il ne voit que les projets où il est affecté |
| 7.2 | L'affecter à un projet                            | Le projet apparaît chez lui                  |
| 7.3 | Rôle VIEWER                                       | Lecture seule : pas de modification d'étape  |
| 7.4 | Créer une **seconde agence** avec un autre compte | Aucun projet de la première n'est visible    |
| 7.5 | Coller l'URL d'un projet de l'autre agence        | 404, jamais 403                              |

## 8. Notifications

| #   | Test                             | Attendu                                            |
| --- | -------------------------------- | -------------------------------------------------- |
| 8.1 | Soumission d'étape par le client | Cloche incrémentée côté agence, mail dans les logs |
| 8.2 | Message client                   | Notification avec l'extrait du message             |
| 8.3 | Dépôt d'accès                    | Notification qui ne contient **pas** le secret     |
| 8.4 | « Tout marquer comme lu »        | Compteur à zéro, persistant après rechargement     |
| 8.5 | Agir soi-même sur une étape      | Pas d'auto-notification                            |

## 9. Tâches planifiées

Déclenchement manuel, `CRON_SECRET` étant celui posé dans Vercel :

```sh
curl -i -X POST -H "x-cron-secret: <CRON_SECRET>" \
  https://onbo-git-develop-seishin-studio.vercel.app/api/cron/daily
```

| #   | Test                                          | Attendu                                      |
| --- | --------------------------------------------- | -------------------------------------------- |
| 9.1 | Appel avec le bon secret                      | 200 + JSON récapitulant chaque tâche         |
| 9.2 | Appel sans secret, ou avec un mauvais         | 404                                          |
| 9.3 | Projet immobile depuis plus de `reminderDays` | Relance dans les logs                        |
| 9.4 | Second appel dans la foulée                   | Pas de seconde relance (garde-fou anti-spam) |

## 10. Limitation de débit

| #    | Test                                      | Attendu                           |
| ---- | ----------------------------------------- | --------------------------------- |
| 10.1 | Onze demandes de lien en quinze minutes   | « Trop de demandes de connexion » |
| 10.2 | Enchaîner des tokens de portail au hasard | 404 immédiats passé le seuil      |
| 10.3 | Après le blocage, attendre la fenêtre     | Fonctionnement normal rétabli     |

## 11. RGPD

| #    | Test                                           | Attendu                                       |
| ---- | ---------------------------------------------- | --------------------------------------------- |
| 11.1 | Réglages → Exporter mes données                | JSON complet, **sans aucun secret en clair**  |
| 11.2 | Supprimer un contact                           | Contact et ses emails disparus, projet intact |
| 11.3 | Contact travaillant avec deux agences          | Suppression refusée, message explicite        |
| 11.4 | Suppression de l'espace, mauvaise confirmation | Refusée                                       |
| 11.5 | Suppression de l'espace, bonne confirmation    | Espace effacé, retour à `/onboarding`         |

À faire sur un espace jetable, évidemment.

## 12. Abonnement

| #    | Test                  | Attendu                                                               |
| ---- | --------------------- | --------------------------------------------------------------------- |
| 12.1 | Sans Stripe configuré | « La facturation n'est pas branchée », aucune erreur                  |
| 12.2 | Avec Stripe en test   | Checkout, carte `4242 4242 4242 4242`, retour en « abonnement actif » |
| 12.3 | Compte MEMBER         | Ne peut pas gérer l'abonnement                                        |

## 13. Interface

| #    | Test                        | Attendu                         |
| ---- | --------------------------- | ------------------------------- |
| 13.1 | Mobile (ou fenêtre étroite) | Rail en tiroir, rien ne déborde |
| 13.2 | Thème sombre                | Contrastes corrects partout     |
| 13.3 | Navigation au clavier seul  | Focus visible, tout atteignable |
| 13.4 | Rail replié                 | Icônes et compteurs lisibles    |
| 13.5 | Page inconnue               | 404 maison                      |

## Ce qui ne se teste pas ici

Sauvegardes et restauration, sonde de disponibilité, rotation de clé, HTTPS et
en-têtes du proxy : ces mécaniques appartiennent au déploiement Docker et se
recettent sur le serveur, pas sur Vercel.
