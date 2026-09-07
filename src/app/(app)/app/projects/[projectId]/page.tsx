import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { progressOf } from "@/lib/progress";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { ActivityFeed } from "./activity-feed";
import { AddStepForm } from "./add-step-form";
import { ClientsPanel } from "./clients-panel";
import { PortalPanel } from "./portal-panel";
import { ProjectHeader } from "./project-header";
import { ProjectToolbar } from "./project-toolbar";
import { RemindersPanel } from "./reminders-panel";
import { StepList } from "./step-list";
import { ProjectTabs, type TabKey } from "./tabs";
import { ProjectTeamPanel } from "./team-panel";

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ctx = await requireTenant();
  await requireProjectAccess(ctx, projectId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  return { title: project?.name ?? "Projet" };
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { projectId } = await params;
  const { t } = await searchParams;

  const tab: TabKey = (
    ["general", "equipe", "client", "logs", "reglages"].includes(t ?? "")
      ? t
      : "general"
  ) as TabKey;
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
              _count: { select: { accessLog: true } },
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
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!project) notFound();

  const progress = progressOf(project.steps);
  const activeLink = project.portalLinks[0] ?? null;
  const submitted = project.steps.filter(
    (step) => step.status === "SUBMITTED",
  ).length;
  const optional = project.steps.filter((step) => !step.required).length;

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

  const now = Date.now();
  const activities = project.activities;

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-2 text-xs text-[var(--color-muted)]">
        <Link href="/app" className="focusable rounded underline-offset-2 hover:underline">
          Projets
        </Link>
        <span aria-hidden> / </span>
        <span className="text-[var(--color-ink)]">{project.name}</span>
      </nav>

      <ProjectHeader
        project={{ id: project.id, name: project.name, status: project.status }}
        canEdit={access.canEdit}
      />

      <ProjectToolbar
        projectId={project.id}
        submittedCount={submitted}
        dueDate={project.dueDate ? project.dueDate.toISOString().slice(0, 10) : ""}
        canEdit={access.canEdit}
      />

      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="min-w-52 flex-1">
          <ProgressBar value={progress} />
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-ink)]">{progress}%</span>{" "}
          · {project.steps.length} étape(s)
          {optional > 0 && ` (dont ${optional} optionnelle(s))`}
          {submitted > 0 && (
            <>
              {" · "}
              <span className="text-[var(--color-submitted)]">
                {submitted} en attente de validation
              </span>
            </>
          )}
        </p>
      </div>

      <ProjectTabs
        current={tab}
        showTeam={access.canManageTeam}
        counts={{
          equipe: project.members.length,
          client: project.clients.length,
        }}
      />

      {tab === "general" && (
        <>
          <StepList
            projectId={project.id}
            canEdit={access.canEdit}
            steps={project.steps.map((step) => ({
              id: step.id,
              projectId: project.id,
              title: step.title,
              description: step.description,
              kind: step.kind,
              status: step.status,
              required: step.required,
              blockedNote: step.blockedNote,
              canEdit: access.canEdit,
              canViewCredentials: access.canViewCredentials,
              assets: step.assets.map((asset) => ({
                id: asset.id,
                filename: asset.filename,
                mimeType: asset.mimeType,
                size: asset.size,
                uploadedByClient: asset.uploadedByClient,
              })),
              credentials: step.credentials.map((credential) => ({
                id: credential.id,
                label: credential.label,
                kind: credential.kind,
                username: credential.username,
                url: credential.url,
                accessCount: credential._count.accessLog,
                lastAccess: credential.accessLog[0]
                  ? dateTime.format(credential.accessLog[0].at)
                  : null,
                ageDays: Math.floor(
                  (now - credential.createdAt.getTime()) / 86_400_000,
                ),
              })),
              comments: step.comments.map((comment) => ({
                id: comment.id,
                body: comment.body,
                author: comment.author,
                authorName: comment.authorName,
                internal: comment.internal,
                at: dateTime.format(comment.createdAt),
              })),
            }))}
          />

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
        </>
      )}

      {tab === "equipe" && access.canManageTeam && (
        <div className="max-w-lg">
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
        </div>
      )}

      {tab === "client" && (
        <div className="grid gap-6 md:grid-cols-2">
          <PortalPanel
            projectId={project.id}
            hasActiveLink={Boolean(activeLink)}
            activeUrl={activeLink ? `/p/${activeLink.token}` : null}
            lastUsedAt={
              activeLink?.lastUsedAt ? dateTime.format(activeLink.lastUsedAt) : null
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
      )}

      {tab === "logs" && (
        <div className="max-w-2xl">
          <ActivityFeed
            entries={activities.map((activity) => ({
              id: activity.id,
              actor: activity.actor,
              actorName: activity.actorName,
              action: activity.action,
              detail: activity.detail,
              at: dateTime.format(activity.createdAt),
            }))}
          />
        </div>
      )}

      {tab === "reglages" && (
        <div className="max-w-lg">
          <RemindersPanel
            projectId={project.id}
            enabled={project.remindersEnabled}
            days={project.reminderDays}
            lastReminderAt={
              project.lastReminderAt ? dateTime.format(project.lastReminderAt) : null
            }
          />
        </div>
      )}

    </>
  );
}
