# Tests et CI

Issue #36. Avant ce lot, la CI se contentait de `prisma validate` et
`next build` : ni le cloisonnement multi-tenant ni le chiffrement n'étaient
couverts.

## Ce qui tourne

| Commande | Ce qu'elle couvre |
|----------|-------------------|
| `npm run format:check` | Prettier, bloquant |
| `npm run lint:check` | ESLint (base Next + TypeScript), bloquant |
| `npm test` | Vitest : unitaires, et intégration si `TEST_DATABASE_URL` |
| `npm run test:e2e` | Playwright : parcours complet |
| `npm run build` | Compilation et vérification des types |

## Unitaires

Sans base, exécutables partout :

- **avancement** : pondération des statuts, étapes optionnelles hors calcul,
  détection d'étape immobile ;
- **coffre** : aller-retour de chiffrement, refus de chiffrer sans clé,
  rotation (ancienne clé lisible, nouvelle clé en écriture), clé retirée trop
  tôt signalée explicitement, contenu falsifié rejeté ;
- **gabarits d'email** : contenu attendu, et échappement du HTML fourni par
  l'utilisateur ;
- **limitation de débit** : IP jamais en clair, limites cohérentes entre
  elles ;
- **URL présignée S3** : paramètres de signature, secret absent de l'URL ;
- **facturation** : ce qui ouvre ou ferme un espace, vérification de
  signature des webhooks Stripe (signature absente, fausse, périmée, corps
  modifié).

## Intégration (Postgres)

`TEST_DATABASE_URL` doit pointer vers une base **jetable** : les tests la
vident. Sans cette variable, ces tests se sautent au lieu d'échouer.

```sh
docker compose up -d db
export TEST_DATABASE_URL="postgresql://onbo:onbo@localhost:5432/onbo_test?schema=public"
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
npm test
```

Le test qui compte : `tests/integration/tenant.test.ts`. **Retirer le filtre
`agencyId` de `projectScope`, ou l'affectation pour un `MEMBER`, le fait
échouer** — c'est exactement la garantie annoncée dans l'issue.

## Bout en bout

`tests/e2e/parcours.spec.ts` : connexion staff par lien magique → création de
l'espace et d'un projet → émission du lien de portail → ouverture du portail
sans compte → dépôt d'un fichier par le client → validation par l'agence.

Playwright démarre lui-même le serveur en mode production. Pour viser une
instance déjà lancée : `E2E_BASE_URL=https://…`.

## Protection de branche

À activer dans les réglages GitHub (Settings → Branches) sur `main` et
`develop`, une fois la CI verte :

- exiger les vérifications `qualite`, `integration` et `e2e` ;
- exiger que la branche soit à jour avant fusion ;
- interdire le push direct, passer par une pull request ;
- exiger au moins une revue.

Ces réglages ne peuvent pas vivre dans le dépôt : ils se posent côté GitHub.
