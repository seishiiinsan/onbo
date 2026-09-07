"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { CredentialKind } from "@prisma/client";
import { projectScope, requireStepAccess } from "@/lib/access";
import { open, seal, MissingEncryptionKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { removeFile } from "@/lib/storage";
import { requireTenant } from "@/lib/tenant";

export type FormState = { error?: string };

/** Etape accessible en ecriture par la session, sinon 404 (issues #6 et #29). */
async function scopedStep(stepId: string) {
  const ctx = await requireTenant();
  const { step, access } = await requireStepAccess(ctx, stepId);
  if (!access.canEdit) notFound();
  return { ctx, step, access };
}

export async function addAgencyComment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { ctx, step } = await scopedStep(String(formData.get("stepId")));
  const body = String(formData.get("body") ?? "").trim();
  const internal = formData.get("internal") === "on";

  if (body.length === 0) return { error: "Message vide." };

  await prisma.comment.create({
    data: {
      body,
      internal,
      author: "AGENCY",
      authorName: ctx.email,
      stepId: step.id,
    },
  });

  revalidatePath(`/app/projects/${step.projectId}`);
  return {};
}

export async function deleteComment(commentId: string) {
  const ctx = await requireTenant();
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, step: { project: projectScope(ctx) } },
    select: { id: true, stepId: true, step: { select: { projectId: true } } },
  });
  if (!comment) notFound();
  await scopedStep(comment.stepId);

  await prisma.comment.delete({ where: { id: comment.id } });
  revalidatePath(`/app/projects/${comment.step.projectId}`);
}

export async function addCredential(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { step } = await scopedStep(String(formData.get("stepId")));
  const label = String(formData.get("label") ?? "").trim();
  const secret = String(formData.get("secret") ?? "");

  if (label.length < 2) return { error: "Libellé trop court." };
  if (secret.length === 0) return { error: "Secret vide." };

  try {
    const sealed = seal(secret);
    await prisma.credential.create({
      data: {
        label,
        kind: String(formData.get("kind") ?? "OTHER") as CredentialKind,
        username: String(formData.get("username") ?? "").trim() || null,
        url: String(formData.get("url") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
        secretCipher: sealed.cipher,
        secretIv: sealed.iv,
        secretTag: sealed.tag,
        stepId: step.id,
      },
    });
  } catch (error) {
    if (error instanceof MissingEncryptionKey) return { error: error.message };
    throw error;
  }

  revalidatePath(`/app/projects/${step.projectId}`);
  return {};
}

/**
 * Revele un secret, une entree a la fois, et journalise l'acces.
 * Le secret n'est jamais inclus dans le rendu d'une liste.
 */
export async function revealCredential(credentialId: string) {
  const ctx = await requireTenant();
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, step: { project: projectScope(ctx) } },
  });
  if (!credential) notFound();

  // Etre sur le projet ne suffit pas : le coffre est un droit distinct.
  const { access } = await requireStepAccess(ctx, credential.stepId);
  if (!access.canViewCredentials) notFound();

  await prisma.credentialAccess.create({
    data: { credentialId: credential.id, userId: ctx.userId },
  });

  return open({
    cipher: credential.secretCipher,
    iv: credential.secretIv,
    tag: credential.secretTag,
  });
}

export async function deleteCredential(credentialId: string) {
  const ctx = await requireTenant();
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, step: { project: projectScope(ctx) } },
    select: { id: true, stepId: true, step: { select: { projectId: true } } },
  });
  if (!credential) notFound();

  const { access } = await requireStepAccess(ctx, credential.stepId);
  if (!access.canViewCredentials) notFound();

  await prisma.credential.delete({ where: { id: credential.id } });
  revalidatePath(`/app/projects/${credential.step.projectId}`);
}

export async function deleteAsset(assetId: string) {
  const ctx = await requireTenant();
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, step: { project: projectScope(ctx) } },
    select: {
      id: true,
      stepId: true,
      storageKey: true,
      step: { select: { projectId: true } },
    },
  });
  if (!asset) notFound();
  await scopedStep(asset.stepId);

  await prisma.asset.delete({ where: { id: asset.id } });
  await removeFile(asset.storageKey);
  revalidatePath(`/app/projects/${asset.step.projectId}`);
}
