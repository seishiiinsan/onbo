import { prisma } from "@/lib/prisma";
import { enqueueMail } from "@/lib/email/queue";
import { portalLinkEmail } from "@/lib/email/templates";
import { issuePortalLink, portalUrl } from "@/lib/portal";
import { logActivity } from "@/lib/activity";

/**
 * Envoi du lien de portail depuis l'application (issue #38).
 *
 * L'agence ne copie plus rien : elle choisit des contacts, ajuste le message
 * et le lien part aux couleurs de l'agence. Chaque envoi laisse une trace
 * (PortalInvite) reliee a la ligne EmailMessage, qui porte le statut.
 */
export async function sendPortalInvites(input: {
  projectId: string;
  /// Contacts vises. Un contact sans email valide est ignore silencieusement.
  recipients: { clientId?: string | null; email: string; name?: string | null }[];
  message?: string | null;
  sentByUserId?: string | null;
  actorName?: string | null;
}) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: input.projectId },
    include: {
      agency: true,
      portalLinks: {
        where: { revokedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Envoyer un lien revoque n'aurait aucun sens : on en emet un au besoin.
  let link = project.portalLinks[0] ?? null;
  if (!link) {
    const token = await issuePortalLink(project.id);
    link = await prisma.portalLink.findUniqueOrThrow({ where: { token } });
  }

  const url = portalUrl(link.token);
  const branding = {
    agencyName: project.agency.name,
    accentColor: project.agency.accentColor,
    logoUrl: project.agency.logoUrl,
  };

  const sent: string[] = [];

  for (const recipient of input.recipients) {
    const email = recipient.email.toLowerCase().trim();
    if (!email) continue;

    const template = portalLinkEmail({
      branding,
      projectName: project.name,
      clientName: recipient.name,
      url,
      message: input.message,
    });

    const emailMessageId = await enqueueMail({
      to: email,
      agencyId: project.agencyId,
      projectId: project.id,
      ...template,
    });

    await prisma.portalInvite.create({
      data: {
        projectId: project.id,
        clientId: recipient.clientId ?? null,
        email,
        portalLinkId: link.id,
        message: input.message?.trim() || null,
        emailMessageId,
        sentByUserId: input.sentByUserId ?? null,
      },
    });

    sent.push(email);
  }

  if (sent.length > 0) {
    await logActivity({
      projectId: project.id,
      actor: "AGENCY",
      actorName: input.actorName ?? null,
      action: "Lien du portail envoyé",
      detail: sent.join(", "),
    });
  }

  return { sent, token: link.token };
}

/** Dernier envoi par adresse, pour afficher « envoyé le … » cote agence. */
export async function lastInvitesByEmail(projectId: string) {
  const invites = await prisma.portalInvite.findMany({
    where: { projectId },
    orderBy: { sentAt: "desc" },
  });

  const byEmail = new Map<string, (typeof invites)[number]>();
  for (const invite of invites) {
    if (!byEmail.has(invite.email)) byEmail.set(invite.email, invite);
  }
  return byEmail;
}
