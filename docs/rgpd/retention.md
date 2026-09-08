# Durées de conservation

Issue #45. Appliquées automatiquement par `/api/cron/retention`
(`src/lib/rgpd.ts`), une fois par jour.

| Donnée                                     | Durée                 | Variable                   |
| ------------------------------------------ | --------------------- | -------------------------- |
| Projet clos ou archivé : fichiers et accès | 12 mois après clôture | `RETENTION_PROJECT_MONTHS` |
| Journal d'activité                         | 365 jours             | `RETENTION_LOG_DAYS`       |
| Emails (contenu et statut)                 | 180 jours             | `RETENTION_EMAIL_DAYS`     |
| Journal des refus de débit                 | 90 jours              | `RETENTION_ABUSE_DAYS`     |
| Compteurs de débit                         | 2 fenêtres            | —                          |
| Sessions et liens de connexion             | 30 jours / 15 minutes | —                          |
| Sauvegardes                                | 30 jours              | `BACKUP_RETENTION_DAYS`    |

Le projet lui-même survit à la purge, vidé de ses données personnelles :
l'agence garde la trace de la prestation sans conserver les données de son
client. Une purge est journalisée (`purge de rétention`) avec le décompte de
ce qui a été supprimé.

Une demande de suppression anticipée se traite depuis Réglages → Données
personnelles, sans attendre ces échéances.
