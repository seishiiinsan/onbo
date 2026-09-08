# Politique de confidentialité

Issue #45. Texte destiné à la page publique (#46). Les mentions `<...>` sont à
compléter avant mise en ligne.

**Éditeur** : `<raison sociale>`, `<forme juridique>` au capital de
`<capital>`, `<adresse>`, SIREN `<SIREN>`.
**Contact** : `<contact RGPD>`.
**Dernière mise à jour** : `<date>`.

## Qui traite quoi

Onbo est un outil que des agences web utilisent pour collecter les éléments
nécessaires à leurs projets. Deux situations :

- **Vous travaillez dans une agence abonnée** : nous traitons vos données pour
  vous donner accès au service. Nous en sommes responsables de traitement.
- **Vous êtes le client d'une agence** : c'est l'agence qui décide de ce
  qu'elle collecte et pourquoi. Nous n'agissons que sur ses instructions.
  Adressez-lui vos demandes ; nous l'aiderons à y répondre.

## Ce que nous collectons

| Données                               | Pourquoi                                | Conservation                                   |
| ------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| Adresse email, nom                    | Vous identifier, vous envoyer les liens | Durée du compte                                |
| Contenus déposés (fichiers, messages) | La prestation elle-même                 | 12 mois après clôture du projet                |
| Accès techniques                      | Les transmettre à votre agence          | Chiffrés ; supprimés à la purge ou sur demande |
| Journaux de connexion et d'activité   | Sécurité, preuve en cas de litige       | 90 à 365 jours                                 |

Nous ne pratiquons **aucun pistage publicitaire**, ne déposons aucun cookie de
mesure d'audience tierce, et ne revendons aucune donnée.

## Cookies

Un seul cookie, `onbo_session` : il maintient votre session, il est
strictement nécessaire au service et ne demande donc pas de consentement. Il
est `httpOnly`, `Secure`, `SameSite=Lax`, et expire après 30 jours.

Le portail client ne dépose aucun cookie : le lien suffit à vous identifier.

## Où vivent vos données

En Union européenne, chez les prestataires listés dans `sous-traitants.md`.
Aucun transfert hors UE.

## Vos droits

Accès, rectification, effacement, limitation, opposition, portabilité.

- Personnel d'agence : Réglages → Données personnelles. L'export est immédiat,
  la suppression aussi.
- Client d'une agence : demandez à votre agence, ou écrivez à
  `<contact RGPD>` — nous transmettrons.

Réclamation possible auprès de la CNIL (cnil.fr).

## Sécurité

Chiffrement des échanges (HTTPS, HSTS), secrets clients chiffrés en
AES-256-GCM avec clé hors base, cloisonnement entre agences vérifié par des
tests automatisés, limitation de débit, sauvegardes chiffrées et restauration
testée, journalisation sans donnée personnelle en clair.

## Violation de données

En cas de violation, nous notifions les agences concernées sous 48 heures, et
la CNIL sous 72 heures lorsque l'article 33 l'impose.
