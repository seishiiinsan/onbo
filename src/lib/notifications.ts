import type { NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueMail } from "@/lib/email/queue";
import { notificationEmail } from "@/lib/email/templates";

/**
 * Notifications agence (issue #39).
 *
 * Le client depose, l'agence est prevenue : dans l'application (centre de
 * notifications, etat lu / non lu par personne) et par email. Les
 * destinataires sont les membres affectes au projet, plus les directeurs de
 * projet (OWNER et ADMIN) qui voient tout l'espace.
 */
function appUrl(path: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

export async function projectRecipients(projectId: string, exclude?: string | null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      agencyId: true,
      agency: { select: { name: true, accentColor: true, logoUrl: true } },
      members: { select: { userId: true } },
    },
  });
  if (!project) return null;

  const supervisors = await prisma.membership.findMany({
    where: { agencyId: project.agencyId, role: { in: ["OWNER", "ADMIN"] } },
    select: { userId: true },
  });

  const ids = new Set<string>();
  for (const member of project.members) ids.add(member.userId);
  for (const supervisor of supervisors) ids.add(supervisor.userId);
  if (exclude) ids.delete(exclude);

  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, email: true, name: true },
  });

  return { project, users };
}

export async function notifyProject(input: {
  projectId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  /** Auteur de l'action : on ne se notifie pas soi-meme. */
  excludeUserId?: string | null;
  /** Doubler d'un email. Faux pour les evenements a faible valeur. */
  email?: boolean;
}) {
  const target = await projectRecipients(input.projectId, input.excludeUserId);
  if (!target || target.users.length === 0) return { notified: 0 };

  const { project, users } = target;
  const path = `/app/projects/${project.id}`;

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      agencyId: project.agencyId,
      projectId: project.id,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      url: path,
    })),
  });

  if (input.email !== false) {
    const branding = {
      agencyName: project.agency.name,
      accentColor: project.agency.accentColor,
      logoUrl: project.agency.logoUrl,
    };

    for (const user of users) {
      const template = notificationEmail({
        branding,
        title: input.title,
        lines: [
          `Bonjour${user.name ? ` ${user.name}` : ""},`,
          input.body ?? "",
          `Projet : ${project.name}`,
        ].filter(Boolean),
        url: appUrl(path),
        linkLabel: "Ouvrir le projet",
      });

      await enqueueMail({
        to: user.email,
        agencyId: project.agencyId,
        projectId: project.id,
        ...template,
      });
    }
  }

  return { notified: users.length };
}

export async function unreadCount(userId: string, agencyId: string) {
  return prisma.notification.count({
    where: { userId, agencyId, readAt: null },
  });
}

export async function listNotifications(
  userId: string,
  agencyId: string,
  take = 20,
) {
  return prisma.notification.findMany({
    where: { userId, agencyId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * Resume quotidien : ce qui attend une validation, ce qui bloque.
 *
 * Une notification par personne et par agence, uniquement s'il y a quelque
 * chose a dire — un digest vide est du bruit.
 */
export async function runDailyDigest(now = new Date()) {
  const memberships = await prisma.membership.findMany({
    include: { user: true, agency: true },
  });

  let sent = 0;

  for (const membership of memberships) {
    // Meme regle de visibilite que l'application : un MEMBER ne voit que
    // les projets ou il est affecte.
    const scope =
      membership.role === "MEMBER"
        ? {
            agencyId: membership.agencyId,
            members: { some: { userId: membership.userId } },
          }
        : { agencyId: membership.agencyId };

    const [awaiting, blocked] = await Promise.all([
      prisma.onboardingStep.findMany({
        where: {
          status: "SUBMITTED",
          project: { ...scope, status: { in: ["DRAFT", "ACTIVE"] } },
        },
        select: { title: true, project: { select: { name: true } } },
        take: 20,
      }),
      prisma.onboardingStep.findMany({
        where: {
          blockedNote: { not: null },
          project: { ...scope, status: { in: ["DRAFT", "ACTIVE"] } },
        },
        select: { title: true, blockedNote: true, project: { select: { name: true } } },
        take: 20,
      }),
    ]);

    if (awaiting.length === 0 && blocked.length === 0) continue;

    const lines = [
      `Bonjour${membership.user.name ? ` ${membership.user.name}` : ""},`,
      awaiting.length > 0
        ? `${awaiting.length} étape(s) attendent votre validation : ${awaiting
            .map((step) => `${step.project.name} — ${step.title}`)
            .join(" ; ")}`
        : "Rien n'attend de validation.",
      blocked.length > 0
        ? `${blocked.length} blocage(s) en cours : ${blocked
            .map((step) => `${step.project.name} — ${step.title}`)
            .join(" ; ")}`
        : "Aucun blocage signalé.",
    ];

    const title = `Onbo — ${awaiting.length} validation(s), ${blocked.length} blocage(s)`;

    await prisma.notification.create({
      data: {
        userId: membership.userId,
        agencyId: membership.agencyId,
        kind: "DAILY_DIGEST",
        title,
        body: lines.slice(1).join("\n"),
        url: "/app",
      },
    });

    const template = notificationEmail({
      branding: {
        agencyName: membership.agency.name,
        accentColor: membership.agency.accentColor,
        logoUrl: membership.agency.logoUrl,
      },
      title: "Votre résumé du jour",
      lines,
      url: appUrl("/app"),
      linkLabel: "Ouvrir Onbo",
    });

    await enqueueMail({
      to: membership.user.email,
      agencyId: membership.agencyId,
      ...template,
    });

    sent += 1;
  }

  return { at: now.toISOString(), sent };
}
