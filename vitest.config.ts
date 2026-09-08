import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Tests unitaires et d'integration (issue #36).
 *
 * Les tests d'integration ont besoin d'un Postgres : ils se sautent tout
 * seuls quand TEST_DATABASE_URL n'est pas renseigne, plutot que d'echouer
 * sur une machine sans base.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    testTimeout: 20_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
