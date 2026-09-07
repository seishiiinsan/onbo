import Link from "next/link";
import { projectScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isStale, progressOf, STALE_DAYS } from "@/lib/progress";
import { requireTenant } from "@/lib/tenant";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ProjectBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { DashboardControls } from "./dashboard-controls";

export const metadata = { title: "Projets" };

const PAGE_SIZE = 25;

type Search = {
  f?: string;
  q?: string;
  s?: string;
  g?: string;
  v?: string;
  p?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const ctx = await requireTenant();
  const params = await searchParams;

  const filter = params.f ?? "actifs";
  const search = (params.q ?? "").trim().toLowerCase();
  const sort = params.s ?? "activity";
  const group = params.g ?? "none";
  const page = Math.max(1, Number(params.p ?? 1) || 1);

  // Toute lecture produit est bornee au perimetre de la session (issues #6, #29).
  const projects = await prisma.project.findMany({
    where: projectScope(ctx),
    orderBy: { updatedAt: "desc" },
    include: {
      steps: { select: { status: true, updatedAt: true, required: true } },
      clients: { include: { client: true } },
      _count: { select: { clients: true } },
    },
  });

  const now = Date.now();

  const enriched = projects.map((project) => {
    const progress = progressOf(project.steps);
    const awaiting = project.steps.filter(
      (step) => step.status === "SUBMITTED",
    ).length;
    const stale = project.steps.some(isStale);
    const overdue =
      project.dueDate !== null &&
      project.dueDate.getTime() < now &&
      project.status !== "COMPLETED";
    const clientLabel =
      project.clients[0]?.client.company ??
      project.clients[0]?.client.name ??
      project.clients[0]?.client.email ??
      "Sans client";

    return { ...project, progress, awaiting, stale, overdue, clientLabel };
  });

  const counts = {
    actifs: enriched.filter(
      (p) => p.status !== "COMPLETED" && p.status !== "ARCHIVED",
    ).length,
    attente: enriched.filter((p) => p.awaiting > 0 && p.status !== "ARCHIVED")
      .length,
    bloques: enriched.filter(
      (p) => (p.stale || p.overdue) && p.status !== "ARCHIVED" && p.status !== "COMPLETED",
    ).length,
    termines: enriched.filter((p) => p.status === "COMPLETED").length,
    archives: enriched.filter((p) => p.status === "ARCHIVED").length,
  };

  const matchesFilter = (project: (typeof enriched)[number]) => {
    if (filter === "archives") return project.status === "ARCHIVED";
    if (project.status === "ARCHIVED") return false;
    if (filter === "termines") return project.status === "COMPLETED";
    if (filter === "attente") return project.awaiting > 0;
    if (filter === "bloques")
      return (project.stale || project.overdue) && project.status !== "COMPLETED";
    return project.status !== "COMPLETED";
  };

  const filtered = enriched
    .filter(matchesFilter)
    .filter((project) =>
      search ? project.name.toLowerCase().includes(search) : true,
    )
    .sort((a, b) => {
      if (sort === "progress") return b.progress - a.progress;
      if (sort === "name") return a.name.localeCompare(b.name, "fr");
      if (sort === "due") {
        const left = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const right = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
        return left - right;
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalAwaiting = enriched.reduce(
    (sum, project) => sum + project.awaiting,
    0,
  );
  const blocked = counts.bloques;

  return (
    <>
      <PageHeader
        title="Projets"
        subtitle="Un projet = un onboarding client."
        action={
          <Link href="/app/projects/new" className="focusable rounded-full">
            <Button variant="accent">Nouveau projet</Button>
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="Rien à collecter pour l'instant."
          hint="Créez un projet : la checklist assets, accès, brief et contenus est déjà prête."
          action={
            <Link href="/app/projects/new" className="focusable rounded-full">
              <Button variant="accent">Créer mon premier projet</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Bandeau du jour (item 12) */}
          {(totalAwaiting > 0 || blocked > 0) && (
            <p className="mb-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm">
              {totalAwaiting > 0 && (
                <>
                  <span className="font-medium">{totalAwaiting}</span> étape(s)
                  attendent votre validation
                </>
              )}
              {totalAwaiting > 0 && blocked > 0 && " · "}
              {blocked > 0 && (
                <>
                  <span className="font-medium">{blocked}</span> projet(s) sans
                  mouvement ou en retard
                </>
              )}
              .
            </p>
          )}

          <DashboardControls counts={counts} />

          {visible.length === 0 ? (
            <EmptyState
              title="Aucun projet dans cette vue."
              hint="Changez de filtre ou videz la recherche."
            />
          ) : group === "client" ? (
            <GroupedTables projects={visible} />
          ) : (
            <ProjectTable projects={visible} />
          )}

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
              {Array.from({ length: pages }, (_, index) => index + 1).map(
                (number) => {
                  const next = new URLSearchParams(
                    Object.entries(params).filter(([, value]) =>
                      Boolean(value),
                    ) as [string, string][],
                  );
                  next.set("p", String(number));

                  return (
                    <Link
                      key={number}
                      href={`/app?${next.toString()}`}
                      className={`focusable rounded-lg px-3 py-1.5 ${
                        number === page
                          ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
                          : "text-[var(--color-muted)] hover:bg-black/[0.04]"
                      }`}
                    >
                      {number}
                    </Link>
                  );
                },
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}

type Enriched = {
  id: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  progress: number;
  awaiting: number;
  stale: boolean;
  overdue: boolean;
  dueDate: Date | null;
  clientLabel: string;
  steps: unknown[];
  _count: { clients: number };
};

function Flags({ project }: { project: Enriched }) {
  return (
    <>
      {project.awaiting > 0 && (
        <span className="rounded-full bg-[var(--color-submitted-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-submitted)]">
          {project.awaiting} à valider
        </span>
      )}
      {project.overdue && (
        <span className="rounded-full bg-[var(--color-danger)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-danger)]">
          En retard
        </span>
      )}
      {project.stale && !project.overdue && (
        <span className="rounded-full bg-[var(--color-progress-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-progress)]">
          Sans activité depuis {STALE_DAYS} j
        </span>
      )}
    </>
  );
}

function GroupedTables({ projects }: { projects: Enriched[] }) {
  const groups = new Map<string, Enriched[]>();
  for (const project of projects) {
    const list = groups.get(project.clientLabel) ?? [];
    list.push(project);
    groups.set(project.clientLabel, list);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([client, list]) => (
        <section key={client}>
          <h2 className="section-label mb-2">{client}</h2>
          <ProjectTable projects={list} />
        </section>
      ))}
    </div>
  );
}

function ProjectTable({ projects }: { projects: Enriched[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-line)]">
      <table className="w-full min-w-[44rem] border-collapse bg-[var(--color-surface)] text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left">
            <th className="px-4 py-2.5 font-medium">Projet</th>
            <th className="px-4 py-2.5 font-medium">Client</th>
            <th className="px-4 py-2.5 font-medium">Statut</th>
            <th className="px-4 py-2.5 font-medium">Échéance</th>
            <th className="w-40 px-4 py-2.5 font-medium">Avancement</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              className="border-b border-[var(--color-line)] last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/app/projects/${project.id}`}
                  className="focusable rounded font-medium hover:underline"
                >
                  {project.name}
                </Link>
                <span className="ml-2 inline-flex gap-1 align-middle">
                  <Flags project={project} />
                </span>
              </td>
              <td className="px-4 py-2.5 text-[var(--color-muted)]">
                {project.clientLabel}
              </td>
              <td className="px-4 py-2.5">
                <ProjectBadge status={project.status} />
              </td>
              <td className="px-4 py-2.5 text-[var(--color-muted)]">
                {project.dueDate
                  ? project.dueDate.toLocaleDateString("fr-FR")
                  : "—"}
              </td>
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <ProgressBar value={project.progress} className="w-24" />
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums text-[var(--color-muted)]">
                    {project.progress} %
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
