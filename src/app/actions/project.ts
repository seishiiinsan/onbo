"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { ProjectStatus, StepKind, StepStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { projectScope, requireProjectEdit } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { issuePortalLink, revokePortalLinks } from "@/lib/portal";
import { requireTenant, type TenantContext } from "@/lib/tenant";

export type FormState = { error?: string };

/**
 * Charge un projet en verifiant les droits d'ecriture de la session : agence
 * proprietaire, et affectation pour un simple membre (issues #6 et #29).
 */
async function scopedProject(projectId: string) {
  const ctx = await requireTenant();
  const access = await requireProjectEdit(ctx, projectId);
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: access.projectId },
  });
  return { ctx, project, access };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Etape accessible en ecriture par la session. */
async function requireStepEdit(ctx: TenantContext, stepId: string) {
  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, project: projectScope(ctx) },
    select: { id: true, projectId: true },
  });
  if (!step) notFound();

  await requireProjectEdit(ctx, step.projectId);
  return { step };
}

/** Etapes creees par defaut : les 4 familles du brief. */
const DEFAULT_STEPS: { title: string; kind: StepKind; description: string }[] = [
  {
    title: "Assets de marque",
    kind: "ASSETS",
    description: "Logo (vectoriel si possible), charte, photos, polices.",
  },
  {
    title: "Accès techniques",
    kind: "ACCESS",
    description: "Hébergeur, nom de domaine, CMS, réseaux sociaux.",
  },
  {
    title: "Brief projet",
    kind: "BRIEF",
    description: "Objectifs, cible, concurrents, exemples de sites appréciés.",
  },
  {
    title: "Contenus",
    kind: "CONTENT",
    description: "Textes des pages, mentions légales, coordonnées.",
  },
];

export async function createProject(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireTenant();
  const name = String(formData.get("name") ?? "").trim();
  const withDefaults = formData.get("withDefaults") === "on";

  if (name.length < 2) return { error: "Nom de projet trop court." };

  const project = await prisma.project.create({
    data: {
      name,
      agencyId: ctx.agencyId,
      status: "ACTIVE",
      // Le createur est affecte responsable, sinon un MEMBER perdrait
      // l'acces au projet qu'il vient de creer.
      members: {
        create: {
          userId: ctx.userId,
          role: "LEAD",
          canViewCredentials: true,
        },
      },
      steps: withDefaults
        ? {
            create: DEFAULT_STEPS.map((step, index) => ({
              ...step,
              position: index,
            })),
          }
        : undefined,
    },
  });

  redirect(`/app/projects/${project.id}`);
}

export async function renameProject(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { project } = await scopedProject(String(formData.get("projectId")));
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) return { error: "Nom de projet trop court." };

  await prisma.project.update({ where: { id: project.id }, data: { name } });
  revalidatePath(`/app/projects/${project.id}`);
  return {};
}

export async function setProjectStatus(projectId: string, status: ProjectStatus) {
  const { project } = await scopedProject(projectId);
  await prisma.project.update({ where: { id: project.id }, data: { status } });
  revalidatePath(`/app/projects/${project.id}`);
  revalidatePath("/app");
}

export async function addStep(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { project } = await scopedProject(String(formData.get("projectId")));
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "OTHER") as StepKind;

  if (title.length < 2) return { error: "Titre d'étape trop court." };

  const last = await prisma.onboardingStep.findFirst({
    where: { projectId: project.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.onboardingStep.create({
    data: {
      title,
      kind,
      projectId: project.id,
      position: (last?.position ?? -1) + 1,
      description: String(formData.get("description") ?? "").trim() || null,
    },
  });

  revalidatePath(`/app/projects/${project.id}`);
  return {};
}

export async function setStepStatus(stepId: string, status: StepStatus) {
  const ctx = await requireTenant();
  const { step } = await requireStepEdit(ctx, stepId);

  const updated = await prisma.onboardingStep.update({
    where: { id: step.id },
    data: { status },
  });

  await logActivity({
    projectId: step.projectId,
    actor: "AGENCY",
    actorName: ctx.email,
    action:
      status === "VALIDATED" ? "a validé une étape" : "a changé le statut d'une étape",
    detail: updated.title,
  });
  revalidatePath(`/app/projects/${step.projectId}`);
  revalidatePath("/app");
}

export async function deleteStep(stepId: string) {
  const ctx = await requireTenant();
  const { step } = await requireStepEdit(ctx, stepId);

  await prisma.onboardingStep.delete({ where: { id: step.id } });
  revalidatePath(`/app/projects/${step.projectId}`);
}

/**
 * Rattache un contact client au projet.
 *
 * Le Client a un email unique global (identite portable) : s'il existe deja,
 * on le reutilise sans jamais indiquer a l'agence qu'il etait connu (issue #9).
 */
export async function attachClient(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { project } = await scopedProject(String(formData.get("projectId")));
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();

  if (!EMAIL_RE.test(email)) return { error: "Adresse email invalide." };

  const client = await prisma.client.upsert({
    where: { email },
    update: {},
    create: { email, name: name || null, company: company || null },
  });

  const already = await prisma.clientProject.findUnique({
    where: { clientId_projectId: { clientId: client.id, projectId: project.id } },
  });
  if (already) return { error: "Ce contact est déjà sur le projet." };

  await prisma.clientProject.create({
    data: { clientId: client.id, projectId: project.id },
  });

  revalidatePath(`/app/projects/${project.id}`);
  return {};
}

export async function detachClient(clientProjectId: string) {
  const ctx = await requireTenant();
  const link = await prisma.clientProject.findFirst({
    where: { id: clientProjectId, project: projectScope(ctx) },
    select: { id: true, projectId: true },
  });
  if (!link) notFound();
  await requireProjectEdit(ctx, link.projectId);

  await prisma.clientProject.delete({ where: { id: link.id } });
  revalidatePath(`/app/projects/${link.projectId}`);
}

/** Emet (ou renouvelle) le lien de portail du projet. */
export async function regeneratePortalLink(projectId: string) {
  const { project } = await scopedProject(projectId);
  const token = await issuePortalLink(project.id);
  revalidatePath(`/app/projects/${project.id}`);
  return token;
}

export async function revokePortalLink(projectId: string) {
  const { project } = await scopedProject(projectId);
  await revokePortalLinks(project.id);
  revalidatePath(`/app/projects/${project.id}`);
}

/** Reglage des relances automatiques du projet (issue #16). */
export async function updateReminders(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { project } = await scopedProject(String(formData.get("projectId")));
  const days = Number(formData.get("reminderDays"));

  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return { error: "Délai attendu entre 1 et 30 jours." };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      remindersEnabled: formData.get("remindersEnabled") === "on",
      reminderDays: days,
    },
  });

  revalidatePath(`/app/projects/${project.id}`);
  return {};
}

/** Edition d'une etape existante, sans passer par suppression/recreation (item 19). */
export async function updateStep(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireTenant();
  const { step } = await requireStepEdit(ctx, String(formData.get("stepId")));

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return { error: "Titre d'étape trop court." };

  await prisma.onboardingStep.update({
    where: { id: step.id },
    data: {
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      kind: String(formData.get("kind") ?? "OTHER") as StepKind,
      required: formData.get("required") === "on",
    },
  });

  revalidatePath(`/app/projects/${step.projectId}`);
  return {};
}

/**
 * Marque une etape comme bloquee, avec un motif visible du client (item 24).
 * Un motif vide leve le blocage.
 */
export async function setStepBlocked(stepId: string, note: string) {
  const ctx = await requireTenant();
  const { step } = await requireStepEdit(ctx, stepId);
  const trimmed = note.trim();

  const updated = await prisma.onboardingStep.update({
    where: { id: step.id },
    data: { blockedNote: trimmed || null },
  });

  await logActivity({
    projectId: step.projectId,
    actor: "AGENCY",
    actorName: ctx.email,
    action: trimmed ? "a signalé un blocage" : "a levé un blocage",
    detail: updated.title,
  });

  revalidatePath(`/app/projects/${step.projectId}`);
}

/** Reordonne les etapes d'un projet (item 16). */
export async function reorderSteps(projectId: string, orderedIds: string[]) {
  const ctx = await requireTenant();
  const { project } = await scopedProject(projectId);

  // On ne reordonne que des etapes appartenant reellement au projet.
  const owned = await prisma.onboardingStep.findMany({
    where: { projectId: project.id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((step) => step.id));
  const valid = orderedIds.filter((id) => ownedIds.has(id));

  await prisma.$transaction(
    valid.map((id, index) =>
      prisma.onboardingStep.update({ where: { id }, data: { position: index } }),
    ),
  );

  await logActivity({
    projectId: project.id,
    actor: "AGENCY",
    actorName: ctx.email,
    action: "a réordonné la checklist",
  });

  revalidatePath(`/app/projects/${project.id}`);
}

/** Valide d'un coup toutes les etapes soumises (item 17). */
export async function validateAllSubmitted(projectId: string) {
  const ctx = await requireTenant();
  const { project } = await scopedProject(projectId);

  const { count } = await prisma.onboardingStep.updateMany({
    where: { projectId: project.id, status: "SUBMITTED" },
    data: { status: "VALIDATED" },
  });

  if (count > 0) {
    await logActivity({
      projectId: project.id,
      actor: "AGENCY",
      actorName: ctx.email,
      action: `a validé ${count} étape(s) d'un coup`,
    });
  }

  revalidatePath(`/app/projects/${project.id}`);
  revalidatePath("/app");
  return count;
}

/** Duplique un projet : structure des etapes, sans les donnees client (item 20). */
export async function duplicateProject(projectId: string) {
  const ctx = await requireTenant();
  const { project } = await scopedProject(projectId);

  const steps = await prisma.onboardingStep.findMany({
    where: { projectId: project.id },
    orderBy: { position: "asc" },
  });

  const copy = await prisma.project.create({
    data: {
      name: `${project.name} (copie)`,
      agencyId: ctx.agencyId,
      status: "DRAFT",
      reminderDays: project.reminderDays,
      remindersEnabled: project.remindersEnabled,
      members: {
        create: { userId: ctx.userId, role: "LEAD", canViewCredentials: true },
      },
      steps: {
        create: steps.map((step) => ({
          title: step.title,
          description: step.description,
          kind: step.kind,
          position: step.position,
          required: step.required,
        })),
      },
    },
  });

  redirect(`/app/projects/${copy.id}`);
}

/** Echeance annoncee au client (item 10). */
export async function setDueDate(projectId: string, value: string) {
  const ctx = await requireTenant();
  const { project } = await scopedProject(projectId);

  const dueDate = value ? new Date(value) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return;

  await prisma.project.update({
    where: { id: project.id },
    data: { dueDate },
  });

  await logActivity({
    projectId: project.id,
    actor: "AGENCY",
    actorName: ctx.email,
    action: dueDate ? "a fixé une échéance" : "a retiré l'échéance",
    detail: dueDate?.toLocaleDateString("fr-FR"),
  });

  revalidatePath(`/app/projects/${project.id}`);
  revalidatePath("/app");
}
