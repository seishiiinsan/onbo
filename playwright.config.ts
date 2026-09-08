import { defineConfig } from "@playwright/test";

/**
 * Parcours de bout en bout (issue #36) : agence -> lien -> portail client ->
 * depot -> validation.
 *
 * Le serveur est lance par Playwright lui-meme, en mode production, sur une
 * base de test. Le mode console du mailer sert de boite mail : le lien
 * magique se lit dans la sortie du serveur.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://127.0.0.1:3000/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
      },
});
