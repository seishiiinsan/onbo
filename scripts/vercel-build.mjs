#!/usr/bin/env node
/**
 * Build de preproduction (Vercel).
 *
 * Applique les migrations avant de compiler, mais ne fait pas echouer le
 * build quand la base n'est pas encore branchee : sur un projet fraichement
 * cree, la premiere compilation doit pouvoir aboutir pour qu'on puisse
 * ensuite renseigner les variables d'environnement.
 */
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  return result.status ?? 1;
}

if (process.env.DATABASE_URL) {
  console.log("> migrations Prisma");
  const status = run("npx", ["prisma", "migrate", "deploy"]);

  if (status !== 0) {
    // Migration en echec : on s'arrete. Deployer un code qui attend un
    // schema absent ne ferait que deplacer la panne en production.
    console.error("! migrations en échec, build interrompu");
    process.exit(status);
  }
} else {
  console.warn("! DATABASE_URL absente : migrations sautées");
}

process.exit(run("npx", ["next", "build"]));
