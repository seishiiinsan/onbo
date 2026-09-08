import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usingObjectStorage } from "@/lib/storage";
import { hasRealProvider } from "@/lib/email/providers";

export const dynamic = "force-dynamic";

/**
 * Sonde de disponibilite (issue #35).
 *
 * La base fait partie du verdict : une application qui repond « ok » sans
 * base ne sert a rien. 200 tant que le service est utilisable, 503 sinon.
 */
export async function GET() {
  const started = Date.now();
  let database = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = error instanceof Error ? error.name : "erreur";
  }

  const healthy = database === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      ts: new Date().toISOString(),
      database,
      latencyMs: Date.now() - started,
      release: process.env.APP_RELEASE ?? null,
      storage: usingObjectStorage() ? "objet" : "disque",
      email: hasRealProvider() ? "fournisseur" : "console",
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
