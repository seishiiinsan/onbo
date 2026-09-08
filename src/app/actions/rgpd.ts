"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { deleteAgency, deleteClient } from "@/lib/rgpd";
import { removeFile } from "@/lib/storage";

export type RgpdState = { error?: string; done?: string };

/**
 * Suppression d'un espace agence sur demande (issue #45).
 *
 * Reservee au proprietaire, confirmee en recopiant le nom de l'agence :
 * l'action est definitive et n'a pas de corbeille.
 */
export async function deleteAgencySpace(
  _prev: RgpdState,
  formData: FormData,
): Promise<RgpdState> {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER") {
    return { error: "Seul le propriétaire de l'espace peut le supprimer." };
  }

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: ctx.agencyId },
    select: { name: true },
  });

  if (String(formData.get("confirmation") ?? "").trim() !== agency.name) {
    return { error: "Recopiez exactement le nom de l'agence pour confirmer." };
  }

  const storageKeys = await deleteAgency(ctx.agencyId);
  for (const key of storageKeys) await removeFile(key);

  redirect("/onboarding");
}

/** Suppression d'un contact client, a sa demande ou a celle de l'agence. */
export async function deleteClientData(
  _prev: RgpdState,
  formData: FormData,
): Promise<RgpdState> {
  const ctx = await requireTenant();
  if (ctx.role === "MEMBER") {
    return { error: "Action réservée aux directeurs de projet." };
  }

  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();

  // Le contact doit etre rattache a un projet de l'agence : on ne supprime
  // pas un client d'une autre agence depuis ici.
  const rattachement = await prisma.clientProject.findFirst({
    where: { client: { email }, project: { agencyId: ctx.agencyId } },
    select: { clientId: true },
  });
  if (!rattachement) return { error: "Contact inconnu dans cet espace." };

  const autresAgences = await prisma.clientProject.count({
    where: {
      clientId: rattachement.clientId,
      project: { agencyId: { not: ctx.agencyId } },
    },
  });
  if (autresAgences > 0) {
    return {
      error:
        "Ce contact travaille aussi avec une autre agence : la demande doit lui être adressée directement.",
    };
  }

  await deleteClient(rattachement.clientId);
  revalidatePath("/app/settings");
  return { done: `Données de ${email} supprimées.` };
}
