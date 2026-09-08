# Stockage des fichiers

Issue #32. Deux adaptateurs derrière la même interface (`src/lib/storage.ts`) :
volume disque, et objet S3-compatible en UE. Le choix se fait sur la présence
des variables `S3_*` — rien d'autre dans le code ne connaît la différence.

## Configuration

```
S3_ENDPOINT=https://s3.fr-par.scw.cloud
S3_REGION=fr-par
S3_BUCKET=onbo-prod
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true        # false pour un bucket en sous-domaine
ANTIVIRUS_URL=                  # optionnel, voir plus bas
```

Scaleway Object Storage (fr-par) et OVH Object Storage (gra, sbg) sont tous
deux compatibles. Le client S3 est écrit à la main (signature V4, `src/lib/s3.ts`) :
pas de SDK, trois verbes suffisent.

## Dépôt direct par URL présignée

Le navigateur demande une URL à `/api/upload/presign`, téléverse **directement**
vers le stockage, puis appelle `/api/upload/complete`. Le binaire ne transite
plus par l'application. Les contrôles (droits, cadence, quotas) sont faits
avant la signature et rejoués à la confirmation, où la taille est relue depuis
le stockage plutôt que crue sur parole.

Sans stockage objet, `/api/upload/presign` répond 501 et le navigateur retombe
sur `/api/upload` : le mode disque continue de fonctionner tel quel.

## Migration de l'existant

```sh
docker compose exec app node scripts/migrate-storage.mjs --dry-run
docker compose exec app node scripts/migrate-storage.mjs
# vérifier qu'un fichier ancien se télécharge bien depuis l'objet, puis :
docker compose exec app node scripts/migrate-storage.mjs --delete-local
```

Sans coupure : les objets sont copiés sous la même clé, l'application peut
continuer à servir depuis le disque tant que les variables `S3_*` ne sont pas
renseignées.

## Chiffrement au repos, cycle de vie, suppression

Ces trois points se règlent côté bucket, pas dans le code :

- **chiffrement au repos** : activer le chiffrement côté serveur (SSE-S3) sur
  le bucket ;
- **accès** : bucket strictement privé, aucune lecture publique — tout passe
  par `/api/files/<id>`, qui vérifie les droits ;
- **cycle de vie** : règle d'expiration alignée sur la politique de rétention
  (#45) ;
- **suppression** : `removeFile()` supprime l'objet ; le versioning du bucket,
  s'il est activé, doit avoir une règle d'expiration des versions.

## Antivirus

`ANTIVIRUS_URL` reçoit le binaire en POST et répond
`{"infected": bool, "signature": "..."}` — contrat de `clamav-rest` et
équivalents. Un fichier infecté est refusé (HTTP 422) et l'objet supprimé.
Service indisponible : le dépôt passe et l'incident est tracé dans les logs,
plutôt que de bloquer tous les dépôts sur une panne de dépendance.

## Vérifier

Déposer un fichier, vérifier qu'il apparaît dans le bucket et que le volume
`uploads` ne bouge plus, puis le retélécharger depuis l'application.
