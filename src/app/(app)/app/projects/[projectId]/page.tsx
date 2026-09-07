import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { progressOf } from "@/lib/progress";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { AddStepForm } from "./add-step-form";
import { ClientsPanel } from "./clients-panel";
import { PortalPanel } from "./portal-panel";
import { ProjectHeader } from "./project-header";
import { RemindersPanel } from "./reminders-panel";
import { ProjectTeamPanel } from "./team-panel";
import { StepCard } from "./step-card";

export const metadata = { title: "Projet · Onbo" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ctx = await requireTenant();
  // Projet hors agence, ou membre non affecte : 404 dans les deux cas.
  const access = await requireProjectAccess(ctx, projectId);

  const project = await prisma.project.findFirst({
    where: { id: projectId },
    include: {
      steps: {
        orderBy: { position: "asc" },
        include: {
          assets: { orderBy: { createdAt: "asc" } },
          comments: { orderBy: { createdAt: "asc" } },
          credentials: {
            orderBy: { createdAt: "asc" },
            include: {
              accessLog: { orderBy: { at: "desc" }, take: 1 },
            },
          },
        },
      },
      clients: { include: { client: true }, orderBy: { createdAt: "asc" } },
      members: { include: { user: true }, orderBy: { createdAt: "asc" } },
      portalLinks: {
        where: { revokedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!project) notFound();

  const progress = progressOf(project.steps);
  const activeLink = project.portalLinks[0] ?? null;
  const awaiting = project.steps.filter(
    (step) => step.status === "SUBMITTED",
  ).length;

  // Membres de l'agence affectables : ceux qui ne sont pas deja sur le projet.
  const assignable = access.canManageTeam
    ? (
        await prisma.membership.findMany({
          where: {
            agencyId: ctx.agencyId,
            user: { projectMembers: { none: { projectId: project.id } } },
          },
          include: { user: true },
          orderBy: { joinedAt: "asc" },
        })
      ).map((membership) => ({
        userId: membership.userId,
        email: membership.user.email,
      }))
    : [];

  return (
    <>
      <ProjectHeader
        project={{ id: project.id, name: project.name, status: project.status }}
        canEdit={access.canEdit}
      />

      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="min-w-52 flex-1">
          <ProgressBar value={progress} />
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-ink)]">
            {progress}%
          </span>{" "}
          · {project.steps.length} étape(s)
          {awaiting > 0 && (
            <>
              {" · "}
              <span className="text-[var(--color-submitted)]">
                {awaiting} en attente de validation
              </span>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <ul className="grid gap-2.5">
            {project.steps.map((step) => (
              <StepCard
                key={step.id}
                step={{
                  id: step.id,
                  title: step.title,
                  description: step.description,
                  kind: step.kind,
                  status: step.status,
                  assets: step.assets.map((asset) => ({
                    id: asset.id,
                    filename: asset.filename,
                    size: asset.size,
                    uploadedByClient: asset.uploadedByClient,
                  })),
                  canEdit: access.canEdit,
                  canViewCredentials: access.canViewCredentials,
                  credentials: step.credentials.map((credential) => ({
                    id: credential.id,
                    label: credential.label,
                    kind: credential.kind,
                    username: credential.username,
                    url: credential.url,
                    lastAccess: credential.accessLog[0]
                      ? dateFormat.format(credential.accessLog[0].at)
                      : null,
                  })),
                  comments: step.comments.map((comment) => ({
                    id: comment.id,
                    body: comment.body,
                    author: comment.author,
                    authorName: comment.authorName,
                    internal: comment.internal,
                    at: dateFormat.format(comment.createdAt),
                  })),
                }}
              />
            ))}
          </ul>

          {access.canEdit && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Ajouter une étape</CardTitle>
              </CardHeader>
              <CardContent>
                <AddStepForm projectId={project.id} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {access.canManageTeam && (
            <ProjectTeamPanel
              projectId={project.id}
              assignable={assignable}
              assignments={project.members.map((member) => ({
                id: member.id,
                userId: member.userId,
                email: member.user.email,
                role: member.role,
                canViewCredentials: member.canViewCredentials,
              }))}
            />
          )}
          <PortalPanel
            projectId={project.id}
            hasActiveLink={Boolean(activeLink)}
            activeUrl={activeLink ? `/p/${activeLink.token}` : null}
            lastUsedAt={
              activeLink?.lastUsedAt
                ? dateFormat.format(activeLink.lastUsedAt)
                : null
            }
          />
          <RemindersPanel
            projectId={project.id}
            enabled={project.remindersEnabled}
            days={project.reminderDays}
            lastReminderAt={
              project.lastReminderAt
                ? dateFormat.format(project.lastReminderAt)
                : null
            }
          />
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
      </div>
    </>
  );
}
