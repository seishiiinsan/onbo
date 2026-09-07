import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { MembershipRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Contexte tenant : TOUTE requete produit doit passer par ici.
 *
 * L'agencyId vient de la session, jamais de l'URL ou d'un champ client.
 * Voir issue #6 : l'agence A ne doit jamais pouvoir lire les donnees de B,
 * ni deduire leur existence (404, pas 403).
 */
/** Agence active choisie par l'utilisateur (item 2). */
export const AGENCY_COOKIE = "onbo_agency";

export type TenantContext = {
  userId: string;
  email: string;
  agencyId: string;
  agencySlug: string;
  agencyName: string;
  role: MembershipRole;
};

/** Exige une session. Redirige vers /login sinon. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige une session ET une agence.
 * - Pas d'agence du tout -> /onboarding (creation d'espace).
 * - Slug demande hors des agences de l'utilisateur -> 404, sans revelation.
 */
export async function requireTenant(slug?: string): Promise<TenantContext> {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { agency: true },
    orderBy: { joinedAt: "asc" },
  });

  if (memberships.length === 0) redirect("/onboarding");

  // Sans slug explicite : l'agence choisie via le selecteur, sinon la premiere.
  const jar = await cookies();
  const active = jar.get(AGENCY_COOKIE)?.value;

  const membership = slug
    ? memberships.find((m) => m.agency.slug === slug)
    : (memberships.find((m) => m.agencyId === active) ?? memberships[0]);

  if (!membership) notFound();

  return {
    userId: user.id,
    email: user.email,
    agencyId: membership.agencyId,
    agencySlug: membership.agency.slug,
    agencyName: membership.agency.name,
    role: membership.role,
  };
}

/** Agences de l'utilisateur, pour le selecteur d'espace. */
export async function listUserAgencies(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { agency: true },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => m.agency);
}

const ROLE_RANK: Record<MembershipRole, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

export function requireRole(ctx: TenantContext, min: MembershipRole) {
  if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) notFound();
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
