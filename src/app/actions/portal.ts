"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { CredentialKind, StepStatus } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { MissingEncryptionKey, seal } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { resolvePortalToken } from "@/lib/portal";
import { notifyProject } from "@/lib/notifications";
import { anonymize, callerIp, guard, RULES } from "@/lib/rate-limit";

/**
 * Mise a jour d'une etape depuis le portail client.
 *
 * Le client peut faire avancer une etape mais jamais la valider : la
 * validation reste une decision de l'agence (issue #14).
 */
export type PortalFormState = { error?: string };

export async function clientSetStepStatus(
  token: string,
  stepId: string,
  status: Exclude<StepStatus, "VALIDATED">,
) {
  const link = await resolvePortalToken(token);
  if (!link) notFound();

  // L'etape doit appartenir au projet du lien : pas de saut lateral.
  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, projectId: link.projectId },
    select: { id: true, status: true },
  });
  if (!step) notFound();

  // Une etape deja validee par l'agence n'est plus modifiable par le client.
  if (step.status === "VALIDATED") return;

  if (!(await guardPortal(token, "PORTAL_ACTION", link.projectId))) return;

  const updated = await prisma.onboardingStep.update({
    where: { id: step.id },
    data: { status },
  });

  await logActivity({
    projectId: link.projectId,
    actor: "CLIENT",
    action:
      status === "SUBMITTED"
        ? "a déclaré une étape complète"
        : "a repris une étape",
    detail: updated.title,
  });

  if (status === "SUBMITTED") {
    await notifyProject({
      projectId: link.projectId,
      kind: "STEP_SUBMITTED",
      title: `${link.project.name} — une étape attend votre validation`,
      body: `Le client a déclaré « ${updated.title} » complète.`,
    });
  }

  revalidatePath(`/p/${token}`);
  revalidatePath(`/app/projects/${link.projectId}`);
}

/** Etape appartenant au projet du lien, sinon 404. */
async function stepOfLink(token: string, stepId: string) {
  const link = await resolvePortalToken(token);
  if (!link) notFound();

  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, projectId: link.projectId },
    select: { id: true },
  });
  if (!step) notFound();

  return { link, step };
}

/**
 * Cadence des actions client, par token de portail (issue #34).
 *
 * La limite porte sur le lien, pas sur l'IP : plusieurs personnes chez le
 * client peuvent partager une sortie internet.
 */
async function guardPortal(
  token: string,
  kind: "PORTAL_MESSAGE" | "PORTAL_ACTION",
  projectId: string,
) {
  return guard({
    kind,
    bucket: `portal:${kind}:${token}`,
    rule: kind === "PORTAL_MESSAGE" ? RULES.portalMessage : RULES.portalAction,
    ip: anonymize(await callerIp()),
    projectId,
    path: "/p",
  });
}

export async function clientAddComment(
  _prev: PortalFormState,
  formData: FormData,
): Promise<PortalFormState> {
  const token = String(formData.get("token") ?? "");
  const { link, step } = await stepOfLink(token, String(formData.get("stepId")));
  const body = String(formData.get("body") ?? "").trim();

  if (body.length === 0) return { error: "Message vide." };

  if (!(await guardPortal(token, "PORTAL_MESSAGE", link.projectId))) {
    return { error: "Trop de messages en peu de temps. Réessayez plus tard." };
  }

  await prisma.comment.create({
    data: { body, author: "CLIENT", stepId: step.id, internal: false },
  });

  await logActivity({
    projectId: link.projectId,
    actor: "CLIENT",
    action: "a écrit un message",
  });

  await notifyProject({
    projectId: link.projectId,
    kind: "CLIENT_MESSAGE",
    title: `${link.project.name} — nouveau message du client`,
    body: body.slice(0, 200),
  });

  revalidatePath(`/p/${token}`);
  revalidatePath(`/app/projects/${link.projectId}`);
  return {};
}

/**
 * Depot d'un acces par le client.
 *
 * Le secret est chiffre des sa reception ; il n'est jamais relu cote portail,
 * seule l'agence peut le reveler (issue #13).
 */
export async function clientAddCredential(
  _prev: PortalFormState,
  formData: FormData,
): Promise<PortalFormState> {
  const token = String(formData.get("token") ?? "");
  const { link, step } = await stepOfLink(token, String(formData.get("stepId")));

  const label = String(formData.get("label") ?? "").trim();
  const secret = String(formData.get("secret") ?? "");

  if (!(await guardPortal(token, "PORTAL_ACTION", link.projectId))) {
    return { error: "Trop d'envois en peu de temps. Réessayez plus tard." };
  }

  if (label.length < 2) return { error: "Indiquez de quel accès il s'agit." };
  if (secret.length === 0) return { error: "Mot de passe ou clé manquant." };

  try {
    const sealed = seal(secret);
    await prisma.credential.create({
      data: {
        label,
        kind: String(formData.get("kind") ?? "OTHER") as CredentialKind,
        username: String(formData.get("username") ?? "").trim() || null,
        url: String(formData.get("url") ?? "").trim() || null,
        secretCipher: sealed.cipher,
        secretIv: sealed.iv,
        secretTag: sealed.tag,
        keyId: sealed.keyId,
        stepId: step.id,
      },
    });
  } catch (error) {
    if (error instanceof MissingEncryptionKey) {
      return {
        error:
          "Le dépôt d'accès est momentanément indisponible. Prévenez votre agence plutôt que d'envoyer vos identifiants par email.",
      };
    }
    throw error;
  }

  await logActivity({
    projectId: link.projectId,
    actor: "CLIENT",
    action: "a transmis un accès",
    detail: label,
  });

  await notifyProject({
    projectId: link.projectId,
    kind: "CLIENT_CREDENTIAL",
    title: `${link.project.name} — un accès a été déposé`,
    body: `Nouvel accès : ${label}.`,
    // Le contenu du coffre ne sort jamais par email : seul le libelle.
  });

  revalidatePath(`/p/${token}`);
  revalidatePath(`/app/projects/${link.projectId}`);
  return {};
}
