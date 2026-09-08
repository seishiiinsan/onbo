"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/billing";
import {
  AGENCY_COOKIE,
  requireRole,
  requireTenant,
  requireUser,
  slugify,
} from "@/lib/tenant";

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
      // Essai de 14 jours ouvert des la creation, sans carte (issue #41).
      subscription: {
        create: {
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
        },
      },
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

/** Bascule l'espace actif (item 2). */
export async function switchAgency(agencyId: string) {
  const user = await requireUser();

  // On ne bascule que vers une agence dont l'utilisateur est membre.
  const membership = await prisma.membership.findUnique({
    where: { userId_agencyId: { userId: user.id, agencyId } },
  });
  if (!membership) return;

  const jar = await cookies();
  jar.set(AGENCY_COOKIE, agencyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/app");
  redirect("/app");
}

/** Nom affiche de la personne connectee, utilise dans le menu du rail. */
export async function updateProfile(
  _prev: AgencyState,
  formData: FormData,
): Promise<AgencyState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length > 80) return { error: "Nom trop long." };

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name || null },
  });

  revalidatePath("/app/settings");
  return {};
}
