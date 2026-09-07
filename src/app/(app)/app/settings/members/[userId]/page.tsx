import Link from "next/link";
import { notFound } from "next/navigation";
import { AGENCY_ROLE_LABEL, PROJECT_ROLE_LABEL } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireRole, requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Membre" };

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** Fiche d'un membre : ses projets, ses droits, sa derniere connexion (item 42). */
export default async function MemberPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const ctx = await requireTenant();
  requireRole(ctx, "ADMIN");

  const membership = await prisma.membership.findUnique({
    where: { userId_agencyId: { userId, agencyId: ctx.agencyId } },
    include: {
      user: {
        include: {
          sessions: { orderBy: { createdAt: "desc" }, take: 1 },
          projectMembers: {
            where: { project: { agencyId: ctx.agencyId } },
            include: { project: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!membership) notFound();

  const { user } = membership;
  const lastSession = user.sessions[0];
  const agencyWide = membership.role !== "MEMBER";

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-2 text-xs text-[var(--color-muted)]">
        <Link href="/app/settings" className="focusable rounded underline-offset-2 hover:underline">
          Réglages
        </Link>
        <span aria-hidden> / </span>
        <span className="text-[var(--color-ink)]">{user.email}</span>
      </nav>

      <h1 className="font-display text-3xl leading-tight">{user.email}</h1>
      <p className="mt-1 mb-7 text-sm text-[var(--color-muted)]">
        {AGENCY_ROLE_LABEL[membership.role]} · arrivé le{" "}
        {membership.joinedAt.toLocaleDateString("fr-FR")}
        {lastSession
          ? ` · dernière connexion le ${dateTime.format(lastSession.createdAt)}`
          : " · jamais connecté"}
      </p>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Accès aux projets</CardTitle>
        </CardHeader>
        <CardContent>
          {agencyWide ? (
            <p className="text-sm text-[var(--color-muted)]">
              Ce rôle donne accès à tous les projets de l&apos;agence, y compris
              aux coffres d&apos;accès.
            </p>
          ) : user.projectMembers.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              Aucune affectation : cette personne ne voit aucun projet. Affectez-la
              depuis la page d&apos;un projet.
            </p>
          ) : (
            <ul className="space-y-2">
              {user.projectMembers.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-canvas)] px-3 py-2"
                >
                  <Link
                    href={`/app/projects/${assignment.projectId}`}
                    className="focusable min-w-0 flex-1 truncate rounded text-sm hover:underline"
                  >
                    {assignment.project.name}
                  </Link>
                  <span className="shrink-0 text-xs text-[var(--color-muted)]">
                    {PROJECT_ROLE_LABEL[assignment.role]}
                    {assignment.canViewCredentials ? " · coffre" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
