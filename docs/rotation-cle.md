# Rotation de la clé du coffre

Issue #33. Une clé compromise ne doit pas obliger à tout réécrire à la main,
et l'on doit toujours savoir quelle clé a chiffré quoi.

## Trousseau

```
ONBO_ENCRYPTION_KEYS="k0:<base64 32 octets>,k1:<base64 32 octets>"
ONBO_ENCRYPTION_KEY_ID=k1     # clé d'écriture ; par défaut, la dernière déclarée
```

`ONBO_ENCRYPTION_KEY` (clé unique historique) reste acceptée seule : elle prend
l'identifiant `k0`, et un déploiement existant continue de fonctionner sans
rien changer. Chaque secret porte dans `Credential.keyId` l'identifiant de la
clé qui l'a chiffré : on déchiffre avec l'ancienne, on chiffre avec la
nouvelle.

Générer une clé :

```sh
openssl rand -base64 32
```

## Procédure

1. **Sauvegarder** le trousseau actuel, hors du serveur (cf. #31 : sans la
   clé, une base restaurée est illisible).
2. **Ajouter** la nouvelle clé au trousseau, sans retirer l'ancienne, et
   désigner la nouvelle comme clé d'écriture :
   `ONBO_ENCRYPTION_KEYS="k0:…,k1:…"` puis `ONBO_ENCRYPTION_KEY_ID=k1`.
3. **Redémarrer** l'application. Les nouveaux secrets partent en `k1`, les
   anciens restent lisibles : aucune interruption.
4. **Inventorier** : `npm run rekey -- --dry-run` liste le nombre de secrets
   par clé.
5. **Re-chiffrer** : `npm run rekey`. Traitement par lots, relançable ;
   une exécution interrompue reprend où elle s'était arrêtée.
6. **Vérifier** que `--dry-run` ne montre plus que `k1`, révéler un accès
   depuis l'application.
7. **Retirer** l'ancienne clé du trousseau, une fois et seulement une fois
   l'étape 6 vérifiée. Retirer une clé encore utilisée rend les secrets
   correspondants définitivement illisibles — l'application le signale
   explicitement (`UnknownKeyId`) plutôt que d'échouer en silence.

En conteneur :

```sh
docker compose exec app node scripts/rekey.mjs --dry-run
docker compose exec app node scripts/rekey.mjs
```

## À répéter en préproduction d'abord

La procédure se teste sur une copie de la base avant d'être jouée en
production. Une rotation complète, chronométrée, est le seul moyen de savoir
combien de temps elle prend sur le volume réel.
