import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

/**
 * Regles d'acces aux projets (issue #29).
 *
 * - OWNER / ADMIN (directeur de projet) : tout l'espace de l'agence.
 * - MEMBER (dev, redacteur...) : uniquement les projets ou il est affecte.
 * - Le coffre d'acces se decide affectation par affectation : etre sur le
 *   projet ne donne pas le droit de lire les mots de passe du client.
 *
 * Tout passe par ce module : aucune requete produit ne doit reconstruire ces
 * conditions a la main.
 */
export function isAgencyWide(ctx: TenantContext) {
  return ctx.role === "OWNER" || ctx.role === "ADMIN";
}

/** Clause a appliquer a toute lecture de projets. */
export function projectScope(ctx: TenantContext): Prisma.ProjectWhereInput {
  if (isAgencyWide(ctx)) return { agencyId: ctx.agencyId };

  return {
    agencyId: ctx.agencyId,
    members: { some: { userId: ctx.userId } },
  };
}

export type ProjectAccess = {
  projectId: string;
  /** Droit de modifier la structure du projet (etapes, statut, portail). */
  canEdit: boolean;
  /** Droit de lire les secrets du coffre. */
  canViewCredentials: boolean;
  /** Droit de gerer l'equipe affectee. */
  canManageTeam: boolean;
};

/**
 * Verifie l'acces a un projet et retourne les droits associes.
 * Hors perimetre -> 404, jamais 403 : on ne revele pas l'existence du projet.
 */
export async function requireProjectAccess(
  ctx: TenantContext,
  projectId: string,
): Promise<ProjectAccess> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectScope(ctx) },
    select: {
      id: true,
      members: { where: { userId: ctx.userId }, take: 1 },
    },
  });

  if (!project) notFound();

  if (isAgencyWide(ctx)) {
    return {
      projectId: project.id,
      canEdit: true,
      canViewCredentials: true,
      canManageTeam: true,
    };
  }

  const assignment = project.members[0];

  return {
    projectId: project.id,
    canEdit: assignment?.role !== "VIEWER",
    canViewCredentials: assignment?.canViewCredentials ?? false,
    canManageTeam: false,
  };
}

/** Variante pour les actions d'ecriture : refuse aussi les VIEWER. */
export async function requireProjectEdit(
  ctx: TenantContext,
  projectId: string,
): Promise<ProjectAccess> {
  const access = await requireProjectAccess(ctx, projectId);
  if (!access.canEdit) notFound();
  return access;
}

/** Resout le projet auquel appartient une etape, puis applique les memes regles. */
export async function requireStepAccess(ctx: TenantContext, stepId: string) {
  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, project: projectScope(ctx) },
    select: { id: true, projectId: true },
  });
  if (!step) notFound();

  const access = await requireProjectAccess(ctx, step.projectId);
  return { step, access };
}

export const PROJECT_ROLE_LABEL = {
  LEAD: "Responsable",
  CONTRIBUTOR: "Contributeur",
  VIEWER: "Lecture seule",
} as const;

export const AGENCY_ROLE_LABEL = {
  OWNER: "Propriétaire",
  ADMIN: "Directeur de projet",
  MEMBER: "Membre",
} as const;
