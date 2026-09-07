import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { progressOf, PROJECT_STATUS_LABEL } from "@/lib/progress";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { AddStepForm } from "./add-step-form";
import { ClientsPanel } from "./clients-panel";
import { ProjectHeader } from "./project-header";
import { StepRow } from "./step-row";

export const metadata = { title: "Projet · Onbo" };

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ctx = await requireTenant();

  // findFirst + agencyId : un projet d'une autre agence est un 404.
  const project = await prisma.project.findFirst({
    where: { id: projectId, agencyId: ctx.agencyId },
    include: {
      steps: { orderBy: { position: "asc" } },
      clients: { include: { client: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) notFound();

  const progress = progressOf(project.steps);

  return (
    <>
      <ProjectHeader
        project={{
          id: project.id,
          name: project.name,
          status: project.status,
          statusLabel: PROJECT_STATUS_LABEL[project.status],
        }}
      />

      <div className="mb-8">
        <ProgressBar value={progress} />
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {progress}% complété · {project.steps.length} étape(s)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Checklist d&apos;onboarding</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {project.steps.length === 0 ? (
              <p className="p-4 text-sm text-[var(--color-muted)]">
                Aucune étape. Ajoutez-en une ci-dessous.
              </p>
            ) : (
              <ul>
                {project.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={{
                      id: step.id,
                      title: step.title,
                      description: step.description,
                      kind: step.kind,
                      status: step.status,
                    }}
                  />
                ))}
              </ul>
            )}
            <div className="border-t border-[var(--color-line)] p-4">
              <AddStepForm projectId={project.id} />
            </div>
          </CardContent>
        </Card>

        <ClientsPanel
          projectId={project.id}
          links={project.clients.map((link) => ({
            id: link.id,
            email: link.client.email,
            name: link.client.name,
            company: link.client.company,
          }))}
        />
      </div>
    </>
  );
}
