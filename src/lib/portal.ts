import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Revoque les liens existants et en emet un nouveau. Retourne le token brut. */
export async function issuePortalLink(projectId: string) {
  const token = randomBytes(32).toString("base64url");

  await prisma.$transaction([
    prisma.portalLink.updateMany({
      where: { projectId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.portalLink.create({
      data: { token, projectId },
    }),
  ]);

  return token;
}

export async function revokePortalLinks(projectId: string) {
  await prisma.portalLink.updateMany({
    where: { projectId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Resout un token de portail vers son projet, avec le branding de l'agence.
 * Retourne null si le lien est inconnu ou revoque.
 */
export async function resolvePortalToken(token: string) {
  const link = await prisma.portalLink.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          agency: true,
          steps: { orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (!link || link.revokedAt) return null;
  return link;
}

export async function touchPortalLink(id: string) {
  await prisma.portalLink.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}

/**
 * URL du portail client.
 *
 * PORTAL_URL permet de servir les portails depuis un sous-domaine dedie
 * (issue #30) : le proxy y reecrit `/<token>` vers `/p/<token>`. Sans cette
 * variable, on reste sur le domaine principal.
 */
export function portalUrl(token: string, host?: string | null) {
  const portalBase = process.env.PORTAL_URL?.replace(/\/+$/, "");
  if (portalBase) return `${portalBase}/${token}`;

  const base =
    process.env.APP_URL ?? (host ? `https://${host}` : "http://localhost:3000");
  return `${base}/p/${token}`;
}
