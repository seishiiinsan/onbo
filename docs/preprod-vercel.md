# Préproduction sur Vercel

`develop` est déployé sur Vercel en guise de préproduction, en attendant le
retour d'un VPS pour la production. Le déploiement Docker reste la cible de
production : rien n'a été retiré, `docker compose` fonctionne à l'identique.

## Ce qui change entre les deux

| Sujet              | VPS (production)                     | Vercel (préprod)                                                                 |
| ------------------ | ------------------------------------ | -------------------------------------------------------------------------------- |
| Base               | Postgres du compose                  | Supabase `onbo-preprod` (eu-west-3)                                              |
| Migrations         | `docker-entrypoint.sh` au démarrage  | `scripts/vercel-build.mjs` avant la compilation                                  |
| Connexion Prisma   | directe                              | pooler pour l'app, connexion directe pour les migrations (`DIRECT_DATABASE_URL`) |
| Fichiers           | volume `uploads`                     | **stockage objet obligatoire** — le système de fichiers y est en lecture seule   |
| Tâches planifiées  | service `cron`, plusieurs fréquences | un cron Vercel quotidien : `/api/cron/daily`                                     |
| TLS et en-têtes    | Caddy                                | Vercel, plus les en-têtes de `next.config.ts`                                    |
| Sauvegardes, sonde | services du compose                  | non déployés — c'est une préprod                                                 |

## Branches

`vercel.json` coupe les déploiements sur `main` et les active sur `develop` :
la préprod suit la branche de développement, et `main` (production Docker) ne
déclenche rien.

## Variables à renseigner dans Vercel

Settings → Environment Variables, pour l'environnement **Production** du
projet Vercel (qui correspond ici à `develop`).

**Obligatoires**

```
DATABASE_URL=postgresql://postgres.<ref>:<mot de passe>@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_DATABASE_URL=postgresql://postgres:<mot de passe>@db.<ref>.supabase.co:5432/postgres
ONBO_ENCRYPTION_KEY=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -hex 24>
APP_URL=https://<domaine du projet Vercel>
```

Le mot de passe de la base se récupère (ou se réinitialise) dans Supabase →
Project Settings → Database. La chaîne poolée figure au même endroit, section
Connection pooling.

**Recommandées pour une préprod utile**

```
EMAIL_PROVIDER=console        # ou brevo/postmark/scaleway avec ses clés
S3_ENDPOINT=https://<ref>.storage.supabase.co/storage/v1/s3
S3_REGION=eu-west-3
S3_BUCKET=onbo-preprod
S3_ACCESS_KEY_ID=...          # Supabase → Storage → S3 access keys
S3_SECRET_ACCESS_KEY=...
LOG_LEVEL=info
```

Sans variables `S3_*`, tout dépôt de fichier échoue avec un message explicite :
sur Vercel le disque n'est pas inscriptible, et échouer clairement vaut mieux
qu'échouer plus tard.

Stripe et Sentry restent facultatifs ; sans clé, l'écran d'abonnement indique
simplement que la facturation n'est pas branchée.

## Tâches planifiées

Vercel limite le nombre de crons : `/api/cron/daily` enchaîne en un passage la
file d'emails, les relances, le résumé quotidien, la relance d'essai, la purge
des compteurs et la rétention. Chaque tâche est indépendante — l'échec de
l'une n'empêche pas les suivantes.

L'authentification accepte les deux formes : `Authorization: Bearer` (envoyé
par Vercel Cron) et `x-cron-secret` (utilisé par le compose). Sans
`CRON_SECRET`, la route répond 404.

Conséquence à connaître : en préprod, un email en échec n'est réessayé qu'une
fois par jour. La première tentative, elle, reste immédiate.

## Vérifier

1. `https://<domaine>/api/health` répond `200` avec `"database": "ok"` ;
2. demander un lien de connexion, le lire dans les logs Vercel
   (`EMAIL_PROVIDER=console`) et se connecter ;
3. créer un projet, envoyer le lien de portail, l'ouvrir ;
4. déposer un fichier — c'est ce qui prouve que le stockage objet est bien
   branché.

## Revenir sur un VPS

Rien à défaire côté code : remettre `DOMAIN`, `ACME_EMAIL` et les variables du
`.env`, lancer `docker compose up -d`, restaurer une sauvegarde. Le projet
Vercel peut rester comme préprod, ou être mis en pause.
