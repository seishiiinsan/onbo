# Sauvegardes et restauration

Issue #31. La base contient les accès clients chiffrés, le volume `uploads`
leurs fichiers. Sans sauvegarde **testée**, une panne disque détruit le
travail de plusieurs agences.

## Ce qui est sauvegardé

| Quoi     | Comment                                        | Où                                |
| -------- | ---------------------------------------------- | --------------------------------- |
| Base     | `pg_dump` → gzip → AES-256-GCM                 | `db/<horodatage>.sql.gz.enc`      |
| Fichiers | `tar` du volume `uploads` → gzip → AES-256-GCM | `uploads/<horodatage>.tar.gz.enc` |

Le chiffrement se fait **avant** l'envoi : le stockage de destination ne voit
jamais de données lisibles. Format du fichier chiffré : `[iv 12][tag 16][données]`.

## Configuration

```
BACKUP_KEY=                      # openssl rand -base64 32
BACKUP_S3_ENDPOINT=https://s3.fr-par.scw.cloud
BACKUP_S3_REGION=fr-par
BACKUP_S3_BUCKET=onbo-sauvegardes
BACKUP_S3_ACCESS_KEY_ID=...
BACKUP_S3_SECRET_ACCESS_KEY=...
BACKUP_RETENTION_DAYS=30
ALERT_WEBHOOK_URL=...
```

Le bucket de sauvegarde est **distinct** de celui des fichiers (#32) et hors
du serveur : une panne disque ne doit pas emporter les sauvegardes avec elle.

Le service `backup` du compose exécute `scripts/backup.mjs` une fois par jour.

## Les trois clés à ne pas confondre

| Clé                                            | Sans elle                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `ONBO_ENCRYPTION_KEY` / `ONBO_ENCRYPTION_KEYS` | la base restaurée est illisible : les accès clients restent chiffrés |
| `BACKUP_KEY`                                   | les sauvegardes sont illisibles                                      |
| `POSTGRES_PASSWORD`                            | rien de perdu, il se change                                          |

Les deux premières se sauvegardent **ailleurs que sur le serveur et ailleurs
que dans le bucket de sauvegarde** — gestionnaire de secrets, coffre-fort de
l'entreprise. Une sauvegarde chiffrée dont la clé a disparu avec le serveur ne
vaut rien.

## Restauration

```sh
node scripts/restore.mjs --list
node scripts/restore.mjs --db db/2026-09-08T02-00-00-000Z.sql.gz.enc
node scripts/restore.mjs --files uploads/2026-09-08T02-00-00-000Z.tar.gz.enc
```

Procédure complète, à rejouer sur un environnement **vierge** :

1. Machine neuve, dépôt cloné, `.env` reconstitué depuis le coffre.
2. `docker compose up -d db`
3. `npx prisma migrate deploy`
4. `node scripts/restore.mjs --db <clé>` puis `--files <clé>`
5. `docker compose up -d`
6. Se connecter, ouvrir un projet, **révéler un accès client** : c'est ce qui
   prouve que `ONBO_ENCRYPTION_KEY` a été restaurée correctement.
7. Ouvrir un lien de portail et télécharger un fichier déposé.

**Chronométrer** l'exercice et noter le temps obtenu ici :

| Date de l'exercice | Volume | Durée | Par |
| ------------------ | ------ | ----- | --- |
| _à remplir_        |        |       |     |

Un exercice non fait est une sauvegarde non testée.

## Alertes

`scripts/backup.mjs` poste sur `ALERT_WEBHOOK_URL` :

- à chaque échec (dump, chiffrement, envoi, configuration incomplète) ;
- quand la sauvegarde la plus récente date de plus de `BACKUP_STALE_HOURS`
  (48 h par défaut) — c'est le cas qui rattrape un service arrêté sans que
  personne ne s'en aperçoive.
