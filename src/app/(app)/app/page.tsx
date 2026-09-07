import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { progressOf, PROJECT_STATUS_LABEL } from "@/lib/progress";
import { requireTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";

export const metadata = { title: "Projets · Onbo" };

export default async function DashboardPage() {
  const ctx = await requireTenant();

  // Toute lecture produit est filtree par agencyId (issue #6).
  const projects = await prisma.project.findMany({
    where: { agencyId: ctx.agencyId, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    include: {
      steps: { select: { status: true } },
      _count: { select: { clients: true } },
    },
  });

  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projets</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Un projet = un onboarding client.
          </p>
        </div>
        <Link href="/app/projects/new">
          <Button variant="accent">Nouveau projet</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium">Aucun projet pour l&apos;instant.</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Créez-en un : la checklist par défaut est prête.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const progress = progressOf(project.steps);
            return (
              <Link key={project.id} href={`/app/projects/${project.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent>
                    <div className="mb-2 flex items-baseline justify-between gap-4">
                      <span className="font-medium">{project.name}</span>
                      <span className="shrink-0 text-xs text-[var(--color-muted)]">
                        {PROJECT_STATUS_LABEL[project.status]} ·{" "}
                        {project._count.clients} contact(s)
                      </span>
                    </div>
                    <ProgressBar value={progress} />
                    <p className="mt-2 text-xs text-[var(--color-muted)]">
                      {progress}% · {project.steps.length} étape(s)
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
