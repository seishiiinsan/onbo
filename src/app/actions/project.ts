"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { ProjectStatus, StepKind, StepStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export type FormState = { error?: string };

/**
 * Charge un projet en verifiant qu'il appartient bien a l'agence de la
 * session. Hors perimetre -> 404, sans revelation d'existence (issue #6).
 */
async function scopedProject(projectId: string) {
  const ctx = await requireTenant();
  const project = await prisma.project.findFirst({
    where: { id: projectId, agencyId: ctx.agencyId },
  });
  if (!project) notFound();
  return { ctx, project };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // La jointure sur agencyId empeche d'agir sur l'etape d'une autre agence.
  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, project: { agencyId: ctx.agencyId } },
    select: { id: true, projectId: true },
  });
  if (!step) notFound();

  await prisma.onboardingStep.update({ where: { id: step.id }, data: { status } });
  revalidatePath(`/app/projects/${step.projectId}`);
  revalidatePath("/app");
}

export async function deleteStep(stepId: string) {
  const ctx = await requireTenant();
  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, project: { agencyId: ctx.agencyId } },
    select: { id: true, projectId: true },
  });
  if (!step) notFound();

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
    where: { id: clientProjectId, project: { agencyId: ctx.agencyId } },
    select: { id: true, projectId: true },
  });
  if (!link) notFound();

  await prisma.clientProject.delete({ where: { id: link.id } });
  revalidatePath(`/app/projects/${link.projectId}`);
}
