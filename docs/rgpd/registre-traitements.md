# Registre des traitements

Issue #45. Onbo est **sous-traitant** au sens de l'article 28 du RGPD :
l'agence cliente est responsable de traitement pour les données de ses propres
clients. Ce registre est celui du sous-traitant (article 30.2).

À compléter avant mise en ligne : `<raison sociale>`, `<SIREN>`, `<adresse>`,
`<contact RGPD>`.

## 1. Gestion des comptes du personnel des agences

|                      |                                                              |
| -------------------- | ------------------------------------------------------------ |
| Finalité             | Authentifier le personnel de l'agence, gérer ses droits      |
| Base légale          | Exécution du contrat (art. 6.1.b)                            |
| Personnes concernées | Salariés et associés des agences clientes                    |
| Données              | Adresse email, nom, rôle, horodatages de connexion, sessions |
| Destinataires        | L'agence elle-même ; hébergeur, service d'envoi d'email      |
| Conservation         | Durée du contrat, puis 12 mois — cf. `retention.md`          |
| Transferts hors UE   | Aucun                                                        |

## 2. Suivi d'onboarding client

|                      |                                                                |
| -------------------- | -------------------------------------------------------------- |
| Finalité             | Collecter et suivre les éléments attendus d'un client d'agence |
| Base légale          | Intérêt légitime de l'agence responsable de traitement         |
| Personnes concernées | Contacts clients des agences                                   |
| Données              | Email, nom, société, messages, fichiers déposés, avancement    |
| Destinataires        | L'agence propriétaire du projet, exclusivement                 |
| Conservation         | 12 mois après clôture du projet, purge automatique             |
| Transferts hors UE   | Aucun                                                          |

## 3. Coffre d'accès

|              |                                                                               |
| ------------ | ----------------------------------------------------------------------------- |
| Finalité     | Transmettre à l'agence les accès techniques du client                         |
| Base légale  | Exécution du contrat entre l'agence et son client                             |
| Données      | Libellé, identifiant, URL, secret **chiffré** (AES-256-GCM)                   |
| Mesures      | Clé hors base, droit d'accès distinct du projet, journal de chaque révélation |
| Conservation | Supprimé à la purge du projet, ou sur demande                                 |

## 4. Envoi d'emails transactionnels

|                         |                                                               |
| ----------------------- | ------------------------------------------------------------- |
| Finalité                | Liens de connexion, liens de portail, relances, notifications |
| Base légale             | Exécution du contrat                                          |
| Données                 | Adresse destinataire, objet, contenu, statut de distribution  |
| Sous-traitant ultérieur | Fournisseur d'email (UE) — cf. `sous-traitants.md`            |
| Conservation            | 180 jours                                                     |

## 5. Journalisation et sécurité

|              |                                                                       |
| ------------ | --------------------------------------------------------------------- |
| Finalité     | Traçabilité, détection d'abus, preuve en cas de litige                |
| Base légale  | Intérêt légitime (sécurité du service)                                |
| Données      | Journal d'activité projet, journal des refus de débit (IP **hachée**) |
| Conservation | Journal d'activité 365 jours, journal des refus 90 jours              |

## Mesures de sécurité communes

Chiffrement en transit (TLS, HSTS), secrets chiffrés au repos et clé hors
base avec rotation documentée (#33), cloisonnement multi-tenant vérifié par
des tests (#36), limitation de débit (#34), sauvegardes chiffrées avec
restauration testée (#31), journalisation sans donnée personnelle en clair
(#35).
