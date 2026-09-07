"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { CredentialKind } from "@prisma/client";
import { open, seal, MissingEncryptionKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { removeFile } from "@/lib/storage";
import { requireTenant } from "@/lib/tenant";

export type FormState = { error?: string };

/** Etape appartenant a l'agence de la session, sinon 404 (issue #6). */
async function scopedStep(stepId: string) {
  const ctx = await requireTenant();
  const step = await prisma.onboardingStep.findFirst({
    where: { id: stepId, project: { agencyId: ctx.agencyId } },
    select: { id: true, projectId: true },
  });
  if (!step) notFound();
  return { ctx, step };
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
    where: { id: commentId, step: { project: { agencyId: ctx.agencyId } } },
    select: { id: true, step: { select: { projectId: true } } },
  });
  if (!comment) notFound();

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
    where: { id: credentialId, step: { project: { agencyId: ctx.agencyId } } },
  });
  if (!credential) notFound();

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
    where: { id: credentialId, step: { project: { agencyId: ctx.agencyId } } },
    select: { id: true, step: { select: { projectId: true } } },
  });
  if (!credential) notFound();

  await prisma.credential.delete({ where: { id: credential.id } });
  revalidatePath(`/app/projects/${credential.step.projectId}`);
}

export async function deleteAsset(assetId: string) {
  const ctx = await requireTenant();
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, step: { project: { agencyId: ctx.agencyId } } },
    select: { id: true, storageKey: true, step: { select: { projectId: true } } },
  });
  if (!asset) notFound();

  await prisma.asset.delete({ where: { id: asset.id } });
  await removeFile(asset.storageKey);
  revalidatePath(`/app/projects/${asset.step.projectId}`);
}
