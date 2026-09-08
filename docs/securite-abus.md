# Limitation de débit et abus

Issue #34. Trois surfaces sont ouvertes sans authentification : l'envoi de
liens magiques, le portail client et les uploads. Chacune a sa limite, et
chaque refus laisse une trace.

## Limites

| Surface | Clé | Limite |
|---------|-----|--------|
| `/login` | IP (hachée) | 10 / 15 min |
| `/login` | adresse visée | 5 / heure |
| Portail — token inconnu | IP (hachée) | 20 / heure, puis 404 immédiat |
| Portail — dépôt de fichier | token | 40 / heure |
| Portail — message | token | 60 / heure |
| Portail — autres actions | token | 200 / heure |

Le compteur vit en base (`RateCounter`) plutôt qu'en mémoire : il survit à un
redémarrage et reste juste si l'application tourne en plusieurs exemplaires.
Les fenêtres expirées sont purgées par le cron quotidien.

## Quotas de volume

`QUOTA_PROJECT_BYTES` (2 Gio par défaut) et `QUOTA_AGENCY_BYTES` (20 Gio) sont
vérifiés **avant** d'écrire le binaire. Dépassement : HTTP 507 et une ligne
`QUOTA_PROJECT` / `QUOTA_AGENCY` dans le journal.

## Journal des refus

Table `AbuseEvent` : type, seau, IP hachée, adresse, projet, chemin, détail,
horodatage. Ce qui n'y figure jamais : une IP en clair, un token de portail en
clair, un secret.

```sql
-- Qui a martelé /login ces dernières 24 h ?
SELECT "ip", count(*) FROM "AbuseEvent"
WHERE "kind" IN ('LOGIN_IP', 'LOGIN_EMAIL')
  AND "createdAt" > now() - interval '24 hours'
GROUP BY "ip" ORDER BY 2 DESC;
```

## Vérifier

Marteler `/login` depuis la même IP : au onzième essai en quinze minutes, la
réponse devient « Trop de demandes de connexion » et une ligne `LOGIN_IP`
apparaît. Même chose en enchaînant des tokens de portail au hasard : passé
vingt échecs, le 404 tombe sans même interroger la base.
