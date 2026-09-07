# Onbo

Portail d'onboarding client pour agences web. SaaS B2B.

L'agence envoie **un lien**. Le client remplit, depose ses fichiers, valide.
L'agence suit l'avancement en temps reel.

## Stack

| Couche     | Choix                                                |
| ---------- | ---------------------------------------------------- |
| Front/API  | Next.js 15 (App Router, TypeScript, standalone)      |
| ORM        | Prisma                                               |
| BDD        | PostgreSQL 16 — dans Docker, interne, non exposee    |
| Conteneurs | Docker Compose (app + db)                            |
| CI/CD      | GitHub Actions → SSH deploy sur push `main`          |
| Prod       | `http://<vps-ip>:3000` (port reglable via `APP_PORT`) |

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
cp .env.example .env         # renseigner POSTGRES_PASSWORD et APP_PORT
docker compose up -d --build
```

Le conteneur `app` lance `prisma migrate deploy` au boot, puis demarre Next.

## Deploiement automatique

Merge sur `main` → GitHub Actions se connecte en SSH au VPS →
`git reset --hard origin/main` → `docker compose up -d --build` → migrations → Next.

Secrets GitHub requis : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_APP_PATH`,
`VPS_PORT` (optionnel).

## Modele de donnees

`Agency` (tenant payant) · `User` + `Membership` (staff agence, roles) ·
`Client` (identite portable, email unique global) · `Project` (un onboarding) ·
`ClientProject` (pivot) · `OnboardingStep` (checklist).

Voir `prisma/schema.prisma`.

## Branches

`feature/*` → `develop` → `main`.
