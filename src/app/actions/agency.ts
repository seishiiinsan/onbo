"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireTenant, requireUser, slugify } from "@/lib/tenant";

export type AgencyState = { error?: string };

/** Cree l'espace agence et rend le createur OWNER. */
export async function createAgency(
  _prev: AgencyState,
  formData: FormData,
): Promise<AgencyState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) return { error: "Nom d'agence trop court." };

  const base = slugify(name) || "agence";
  let slug = base;
  for (let i = 2; await prisma.agency.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  await prisma.agency.create({
    data: {
      name,
      slug,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  redirect("/app");
}

/** Branding de l'espace : logo et couleur d'accent du portail client. */
export async function updateBranding(
  _prev: AgencyState,
  formData: FormData,
): Promise<AgencyState> {
  const ctx = await requireTenant();
  requireRole(ctx, "ADMIN");

  const name = String(formData.get("name") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const accentColor = String(formData.get("accentColor") ?? "").trim();

  if (name.length < 2) return { error: "Nom d'agence trop court." };
  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    return { error: "Couleur invalide (format #RRGGBB attendu)." };
  }

  await prisma.agency.update({
    where: { id: ctx.agencyId },
    data: { name, accentColor, logoUrl: logoUrl || null },
  });

  revalidatePath("/app/settings");
  return {};
}
