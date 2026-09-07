"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { MembershipRole, ProjectRole } from "@prisma/client";
import { isAgencyWide, requireProjectAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireRole, requireTenant } from "@/lib/tenant";

export type FormState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Ajoute une personne a l'agence (issue #28).
 *
 * Pas d'invitation par email pour l'instant : le compte est cree, la personne
 * se connecte par lien magique avec cette adresse.
 */
export async function addTeamMember(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireTenant();
  requireRole(ctx, "ADMIN");

  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const role = String(formData.get("role") ?? "MEMBER") as MembershipRole;

  if (!EMAIL_RE.test(email)) return { error: "Adresse email invalide." };
  if (role === "OWNER" && ctx.role !== "OWNER") {
    return { error: "Seul un propriétaire peut nommer un propriétaire." };
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const existing = await prisma.membership.findUnique({
    where: { userId_agencyId: { userId: user.id, agencyId: ctx.agencyId } },
  });
  if (existing) return { error: "Cette personne fait déjà partie de l'équipe." };

  await prisma.membership.create({
    data: { userId: user.id, agencyId: ctx.agencyId, role },
  });

  revalidatePath("/app/settings");
  return {};
}

export async function setTeamRole(userId: string, role: MembershipRole) {
  const ctx = await requireTenant();
  requireRole(ctx, "ADMIN");

  if (role === "OWNER" && ctx.role !== "OWNER") notFound();

  const membership = await prisma.membership.findUnique({
    where: { userId_agencyId: { userId, agencyId: ctx.agencyId } },
  });
  if (!membership) notFound();

  // Ne jamais laisser une agence sans proprietaire.
  if (membership.role === "OWNER" && role !== "OWNER") {
    const owners = await prisma.membership.count({
      where: { agencyId: ctx.agencyId, role: "OWNER" },
    });
    if (owners <= 1) return;
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { role },
  });

  revalidatePath("/app/settings");
}

export async function removeTeamMember(userId: string) {
  const ctx = await requireTenant();
  requireRole(ctx, "ADMIN");

  const membership = await prisma.membership.findUnique({
    where: { userId_agencyId: { userId, agencyId: ctx.agencyId } },
  });
  if (!membership) notFound();

  if (membership.role === "OWNER") {
    const owners = await prisma.membership.count({
      where: { agencyId: ctx.agencyId, role: "OWNER" },
    });
    if (owners <= 1) return;
  }

  await prisma.$transaction([
    prisma.projectMember.deleteMany({
      where: { userId, project: { agencyId: ctx.agencyId } },
    }),
    prisma.membership.delete({ where: { id: membership.id } }),
  ]);

  revalidatePath("/app/settings");
}

/** Affecte un membre de l'agence a un projet. */
export async function assignToProject(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireTenant();
  const projectId = String(formData.get("projectId"));
  const access = await requireProjectAccess(ctx, projectId);
  if (!access.canManageTeam) notFound();

  const userId = String(formData.get("userId"));

  // La personne doit deja appartenir a l'agence.
  const membership = await prisma.membership.findUnique({
    where: { userId_agencyId: { userId, agencyId: ctx.agencyId } },
  });
  if (!membership) return { error: "Cette personne n'est pas dans l'équipe." };

  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId, projectId } },
    update: {
      role: String(formData.get("role") ?? "CONTRIBUTOR") as ProjectRole,
      canViewCredentials: formData.get("canViewCredentials") === "on",
    },
    create: {
      userId,
      projectId,
      role: String(formData.get("role") ?? "CONTRIBUTOR") as ProjectRole,
      canViewCredentials: formData.get("canViewCredentials") === "on",
    },
  });

  revalidatePath(`/app/projects/${projectId}`);
  return {};
}

export async function toggleCredentialAccess(
  projectMemberId: string,
  canView: boolean,
) {
  const ctx = await requireTenant();
  const assignment = await prisma.projectMember.findFirst({
    where: { id: projectMemberId, project: { agencyId: ctx.agencyId } },
    select: { id: true, projectId: true },
  });
  if (!assignment || !isAgencyWide(ctx)) notFound();

  await prisma.projectMember.update({
    where: { id: assignment.id },
    data: { canViewCredentials: canView },
  });

  revalidatePath(`/app/projects/${assignment.projectId}`);
}

export async function unassignFromProject(projectMemberId: string) {
  const ctx = await requireTenant();
  const assignment = await prisma.projectMember.findFirst({
    where: { id: projectMemberId, project: { agencyId: ctx.agencyId } },
    select: { id: true, projectId: true },
  });
  if (!assignment || !isAgencyWide(ctx)) notFound();

  await prisma.projectMember.delete({ where: { id: assignment.id } });
  revalidatePath(`/app/projects/${assignment.projectId}`);
}
