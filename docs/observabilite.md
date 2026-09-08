# Observabilité

Issue #35. Objectif : ne plus découvrir un incident en lisant
`docker compose logs`.

## Logs structurés

`src/lib/logger.ts` écrit une ligne JSON par événement — horodatage, niveau,
message, champs. Deux règles tenues par le code, pas par la discipline :

- les clés sensibles (`password`, `secret`, `token`, `authorization`,
  `cookie`, `key`) sortent en `[masqué]` ;
- toute chaîne contenant `@` est réduite à `#<empreinte>@<domaine>` : on peut
  suivre un utilisateur d'une ligne à l'autre sans stocker son adresse.

`LOG_LEVEL` (`debug`, `info`, `warn`, `error`) filtre à l'émission. La
rotation est faite par Docker (`json-file`, 10 Mo × 5).

## Suivi d'erreurs

`SENTRY_DSN` — instance auto-hébergée ou région UE. L'envoi utilise le
protocole d'ingestion directement (`src/lib/sentry.ts`), sans SDK : rien à
mettre à jour côté dépendances. Sans DSN, l'erreur reste dans les logs.

Les erreurs du navigateur remontent par `/api/telemetry/error`, limité en
débit : une page qui boucle n'inonde pas le collecteur. Seuls le message,
l'empreinte Next (`digest`) et le chemin sont acceptés.

## Sonde de disponibilité

`/api/health` interroge la base : une application qui répond « ok » sans base
ne sert à rien. 200 tant que le service est utilisable, 503 sinon.

Le service `probe` du compose interroge les URL de `PROBE_URLS` toutes les 60
secondes et poste sur `ALERT_WEBHOOK_URL` après **deux** échecs consécutifs —
soit une alerte en moins de deux minutes. Surveiller aussi un vrai lien de
portail, pas seulement l'API :

```
PROBE_URLS="http://app:3000/api/health https://<domaine>/p/<token de test>"
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Le webhook doit pointer vers un canal réellement consulté. Une alerte qui
arrive dans une boîte que personne n'ouvre ne vaut pas mieux que pas d'alerte.

## Métriques

`/api/metrics` au format Prometheus, fermé sans `METRICS_TOKEN` (jeton en
`Authorization: Bearer` ou `?token=`) :

| Métrique                                 | Ce qu'elle dit                 |
| ---------------------------------------- | ------------------------------ |
| `onbo_emails_24h{status}`                | envois, échecs, rebonds        |
| `onbo_email_queue_pending`               | file bloquée si ça monte       |
| `onbo_uploads_24h`, `onbo_storage_bytes` | dépôts et volume               |
| `onbo_reminders_24h`                     | relances effectivement parties |
| `onbo_abuse_24h{kind}`                   | refus de débit                 |
| `onbo_projects_active`                   | activité produit               |

## Vérifier

Provoquer une erreur 500 : elle doit apparaître dans le collecteur avec sa
référence, et la même référence doit être affichée à l'utilisateur. Arrêter le
conteneur `app` : l'alerte doit arriver en moins de deux minutes.
