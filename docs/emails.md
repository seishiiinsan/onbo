# Emails transactionnels

Issue #29. Tout part de `sendMail()` (`src/lib/mailer.ts`) : les appelants ne
connaissent que ce point d'entrée, le reste vit dans `src/lib/email/`.

```
sendMail()  ->  file EmailMessage  ->  fournisseur HTTP  ->  rebonds (webhook)
                    ^                        |
                    +---- /api/cron/emails --+
```

## Choisir un fournisseur

`EMAIL_PROVIDER` accepte quatre valeurs :

| Valeur     | Hébergement | Variables requises |
|------------|-------------|--------------------|
| `console`  | —           | aucune (défaut, écrit dans les logs) |
| `brevo`    | France      | `BREVO_API_KEY` |
| `postmark` | UE (compte EU) | `POSTMARK_TOKEN`, éventuellement `POSTMARK_STREAM` |
| `scaleway` | France (fr-par) | `SCALEWAY_SECRET_KEY`, `SCALEWAY_PROJECT_ID` |

Commun à tous : `EMAIL_FROM` (`Onbo <bonjour@exemple.fr>`) et
`EMAIL_WEBHOOK_SECRET` pour les rebonds.

Le mode `console` reste le défaut : sans compte fournisseur, l'application
fonctionne et le lien magique est cliquable depuis `docker compose logs`.

## Authentification du domaine

Sans ces trois enregistrements, les messages partent en spam.

- **SPF** : `v=spf1 include:<domaine du fournisseur> -all`
- **DKIM** : clé publique fournie par le fournisseur, à publier sur
  `<sélecteur>._domainkey.<domaine>`
- **DMARC** : `v=DMARC1; p=quarantine; rua=mailto:dmarc@<domaine>; pct=100`

Passer `p=quarantine` puis `p=reject` une fois les rapports propres.

## File et reprise sur échec

Chaque message est écrit en base (`EmailMessage`) puis tenté immédiatement :
un lien magique n'attend pas le cron. En cas d'échec réseau ou de 5xx, la ligne
reste `PENDING` et repart avec un intervalle croissant — 1, 5, 15, 60 puis
240 minutes, cinq tentatives au total. Une erreur 4xx (message ou
configuration invalide) passe directement en `FAILED` : la réessayer ne sert à
rien.

Le service `cron` du compose appelle `/api/cron/emails` toutes les minutes,
protégé par `CRON_SECRET`.

## Rebonds

Le fournisseur poste sur `/api/webhooks/email/<fournisseur>`, avec le secret
partagé dans l'en-tête `x-webhook-secret` ou en paramètre `?secret=`. Le
message passe en `BOUNCED` et, s'il était rattaché à un projet, une ligne
apparaît dans le journal d'activité : le rebond est visible côté agence, sans
avoir à lire la base.

## Vérifier

1. `EMAIL_PROVIDER=brevo` + clé + `EMAIL_FROM` sur un domaine authentifié
2. Demander un lien de connexion, vérifier l'arrivée en moins de 30 secondes
3. Envoyer vers une adresse invalide, vérifier que la ligne passe `BOUNCED`
   et que le projet affiche « Email non distribué »
