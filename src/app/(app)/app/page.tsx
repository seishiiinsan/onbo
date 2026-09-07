import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Projets · Onbo" };

export default async function DashboardPage() {
  const ctx = await requireTenant();

  // Toute lecture produit est filtree par agencyId (issue #6).
  const projects = await prisma.project.findMany({
    where: { agencyId: ctx.agencyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { steps: true, clients: true } } },
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
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium">Aucun projet pour l&apos;instant.</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              La création de projets arrive avec l&apos;issue #8.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>{project.name}</CardTitle>
                <span className="text-xs text-[var(--color-muted)]">
                  {project.status}
                </span>
              </CardHeader>
              <CardContent className="text-sm text-[var(--color-muted)]">
                {project._count.steps} étape(s) · {project._count.clients}{" "}
                client(s)
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
