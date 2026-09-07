import Link from "next/link";
import { projectScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { progressOf, STALE_DAYS, isStale } from "@/lib/progress";
import { requireTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { ProjectBadge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress";
import { EmptyState, PageHeader } from "@/components/page-header";
import { FilterTabs } from "./filter-tabs";

export const metadata = { title: "Projets · Onbo" };

type Filter = "actifs" | "bloques" | "attente" | "termines";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const ctx = await requireTenant();
  const { f } = await searchParams;
  const filter: Filter = (["actifs", "bloques", "attente", "termines"].includes(
    f ?? "",
  )
    ? f
    : "actifs") as Filter;

  // Toute lecture produit est bornee a l'agencyId de la session (issue #6).
  const projects = await prisma.project.findMany({
    where: { ...projectScope(ctx), status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    include: {
      steps: { select: { status: true, updatedAt: true } },
      _count: { select: { clients: true } },
    },
  });

  const enriched = projects.map((project) => {
    const progress = progressOf(project.steps);
    const awaiting = project.steps.filter(
      (step) => step.status === "SUBMITTED",
    ).length;
    const stale = project.steps.some(isStale);
    return { ...project, progress, awaiting, stale };
  });

  const counts = {
    actifs: enriched.filter((p) => p.status !== "COMPLETED").length,
    bloques: enriched.filter((p) => p.stale && p.status !== "COMPLETED").length,
    attente: enriched.filter((p) => p.awaiting > 0).length,
    termines: enriched.filter((p) => p.status === "COMPLETED").length,
  };

  const visible = enriched.filter((project) => {
    if (filter === "bloques") return project.stale && project.status !== "COMPLETED";
    if (filter === "attente") return project.awaiting > 0;
    if (filter === "termines") return project.status === "COMPLETED";
    return project.status !== "COMPLETED";
  });

  return (
    <>
      <PageHeader
        title="Projets"
        subtitle="Un projet = un onboarding client."
        action={
          <Link href="/app/projects/new">
            <Button variant="accent">Nouveau projet</Button>
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="Rien à collecter pour l'instant."
          hint="Créez un projet : la checklist assets, accès, brief et contenus est déjà prête."
          action={
            <Link href="/app/projects/new">
              <Button variant="accent">Créer mon premier projet</Button>
            </Link>
          }
        />
      ) : (
        <>
          <FilterTabs current={filter} counts={counts} />

          {visible.length === 0 ? (
            <EmptyState title="Aucun projet dans cette vue." />
          ) : (
            <ul className="grid gap-2.5">
              {visible.map((project) => (
                <li key={project.id}>
                  <Link href={`/app/projects/${project.id}`} className="block">
                    <article className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-line-strong)]">
                      <ProgressRing value={project.progress} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">
                            {project.name}
                          </span>
                          <ProjectBadge status={project.status} />
                          {project.awaiting > 0 && (
                            <span className="rounded-full bg-[var(--color-submitted-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-submitted)]">
                              {project.awaiting} à valider
                            </span>
                          )}
                          {project.stale && (
                            <span className="rounded-full bg-[var(--color-progress-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-progress)]">
                              Sans activité depuis {STALE_DAYS} j
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {project.steps.length} étape(s) ·{" "}
                          {project._count.clients} contact(s)
                        </p>
                      </div>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
