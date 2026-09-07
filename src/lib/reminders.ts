import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { portalUrl } from "@/lib/portal";

/**
 * Relances automatiques (issue #16).
 *
 * Un projet est relance quand :
 * - les relances sont actives et le projet n'est ni termine ni archive ;
 * - il reste au moins une etape non validee ;
 * - rien n'a bouge depuis reminderDays jours ;
 * - aucune relance n'a ete envoyee dans la meme fenetre (anti-spam) ;
 * - un lien de portail actif et au moins un contact existent.
 */
export async function runReminders(now = new Date()) {
  const projects = await prisma.project.findMany({
    where: {
      remindersEnabled: true,
      status: { in: ["DRAFT", "ACTIVE"] },
      steps: { some: { status: { not: "VALIDATED" } } },
    },
    include: {
      agency: true,
      clients: { include: { client: true } },
      steps: { where: { status: { not: "VALIDATED" } } },
      portalLinks: {
        where: { revokedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const sent: string[] = [];

  for (const project of projects) {
    const window = project.reminderDays * 86_400_000;
    const link = project.portalLinks[0];
    if (!link || project.clients.length === 0) continue;

    const lastMove = Math.max(
      project.updatedAt.getTime(),
      ...project.steps.map((step) => step.updatedAt.getTime()),
    );
    if (now.getTime() - lastMove < window) continue;

    if (
      project.lastReminderAt &&
      now.getTime() - project.lastReminderAt.getTime() < window
    ) {
      continue;
    }

    const pending = project.steps.map((step) => `· ${step.title}`).join("\n");
    const url = portalUrl(link.token);

    for (const { client } of project.clients) {
      await sendMail({
        to: client.email,
        subject: `${project.name} — il manque encore quelques éléments`,
        text: [
          `Bonjour${client.name ? ` ${client.name}` : ""},`,
          "",
          `${project.agency.name} attend encore ces éléments pour avancer sur ${project.name} :`,
          "",
          pending,
          "",
          `Tout se dépose ici : ${url}`,
          "",
          "Merci !",
        ].join("\n"),
      });
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { lastReminderAt: now },
    });

    sent.push(project.id);
  }

  return { checked: projects.length, sent: sent.length, projectIds: sent };
}
