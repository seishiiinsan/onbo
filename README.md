# Onbo

Portail d'onboarding client pour agences web. SaaS B2B.

L'agence envoie **un lien**. Le client remplit, depose ses fichiers, valide.
L'agence suit l'avancement en temps reel.

## Stack

| Couche     | Choix                                                  |
| ---------- | ------------------------------------------------------ |
| Front/API  | Next.js 15 (App Router, TypeScript, standalone)        |
| ORM        | Prisma                                                 |
| BDD        | PostgreSQL 16 — dans Docker, interne, non exposee      |
| Conteneurs | Docker Compose (app + db + proxy + cron + sonde)       |
| CI/CD      | GitHub Actions → SSH deploy sur push `main`            |
| Prod       | `https://<domaine>` — Caddy, Let's Encrypt automatique |

## Dev local

```bash
cp .env.example .env
npm install
docker compose up -d db      # postgres seul
npx prisma migrate dev
npm run dev                  # http://localhost:3000
```

## Prod (VPS)

```bash
cp .env.example .env
# renseigner : POSTGRES_PASSWORD, DOMAIN, ACME_EMAIL, APP_URL,
# puis generer les deux secrets
openssl rand -base64 32   # -> ONBO_ENCRYPTION_KEY (chiffrement des acces client)
openssl rand -hex 24      # -> CRON_SECRET (declenchement des relances)

docker compose up -d --build
```

Le port applicatif n'est plus publie : tout passe par le proxy, qui obtient et
renouvelle les certificats seul (cf. `docs/https.md`).

`ONBO_ENCRYPTION_KEY` est obligatoire : sans elle le conteneur refuse de
demarrer, plutot que de stocker des acces client en clair. **La perdre rend
les secrets deja enregistres illisibles** — sauvegardez-la avec le reste.

Le conteneur `app` lance `prisma migrate deploy` au boot, puis demarre Next.

## Deploiement automatique

Merge sur `main` → GitHub Actions se connecte en SSH au VPS →
`git reset --hard origin/main` → `docker compose up -d --build` → migrations → Next.

Secrets GitHub requis : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_APP_PATH`,
`VPS_PORT` (optionnel).

## Ce que fait l'application

**Cote agence** (`/app`) : projets avec avancement, filtres (a valider,
bloques), checklist par etapes, fichiers, coffre d'acces chiffre, echanges avec
le client et notes internes, lien de portail revocable, reglage des relances.

**Cote client** (`/p/<token>`) : portail aux couleurs de l'agence, sans compte.
Depot de fichiers, transmission d'acces chiffree, messages, avancement des
etapes. Le client soumet, l'agence valide.

## Modele de donnees

`Agency` (tenant payant) · `User` + `Membership` (staff agence, roles) ·
`Client` (identite portable, email unique global) · `Project` (un onboarding) ·
`ClientProject` (pivot) · `OnboardingStep` (checklist) · `PortalLink` (acces
client) · `Asset` (fichiers) · `Credential` + `CredentialAccess` (coffre et
journal) · `Comment` (echanges).

Voir `prisma/schema.prisma`.

## Securite

- Isolation multi-tenant : `agencyId` derive de la session, jamais de l'URL.
  Hors perimetre -> 404, sans revelation d'existence.
- Secrets clients chiffres en AES-256-GCM, cle hors base, revelation
  journalisee (qui, quoi, quand).
- Fichiers servis derriere un controle d'acces, jamais en URL publique.
- Sessions staff : cookie httpOnly, `Secure` des que `APP_URL` est en HTTPS.

## Branches

`feature/*` → `develop` → `main`.
