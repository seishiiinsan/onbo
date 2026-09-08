import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Export, suppression et retention (issue #45).
 *
 * « RGPD-clean » est l'argument de vente central : il doit etre vrai avant le
 * premier euro encaisse. Trois mecaniques ici :
 * - export complet, cote agence comme cote client ;
 * - suppression sur demande, effective et non differee ;
 * - purge automatique passe la duree de conservation.
 *
 * Les secrets du coffre ne sont jamais dechiffres dans un export : on exporte
 * leur existence, pas leur contenu.
 */
export async function exportAgency(agencyId: string) {
  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: agencyId },
    include: {
      memberships: { include: { user: true } },
      projects: {
        include: {
          clients: { include: { client: true } },
          members: { include: { user: true } },
          steps: {
            include: {
              comments: true,
              assets: true,
              credentials: {
                select: {
                  id: true,
                  label: true,
                  kind: true,
                  username: true,
                  url: true,
                  notes: true,
                  createdAt: true,
                },
              },
            },
          },
          portalLinks: true,
          activities: true,
          invites: true,
        },
      },
    },
  });

  const emails = await prisma.emailMessage.findMany({
    where: { agencyId },
    select: {
      id: true,
      to: true,
      subject: true,
      category: true,
      status: true,
      sentAt: true,
      createdAt: true,
    },
  });

  return {
    genereLe: new Date().toISOString(),
    format: "onbo-export-agence-v1",
    avertissement:
      "Les secrets du coffre ne figurent pas dans cet export : seule leur existence est exportée.",
    agence: agency,
    emails,
  };
}

/** Export des donnees d'un client, tous projets de ce client confondus. */
export async function exportClient(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: {
      projects: {
        include: {
          project: {
            include: {
              agency: { select: { name: true } },
              steps: {
                include: {
                  comments: { where: { internal: false } },
                  assets: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const emails = await prisma.emailMessage.findMany({
    where: { to: client.email },
    select: {
      subject: true,
      category: true,
      status: true,
      sentAt: true,
      createdAt: true,
    },
  });

  return {
    genereLe: new Date().toISOString(),
    format: "onbo-export-client-v1",
    client: {
      email: client.email,
      name: client.name,
      company: client.company,
      createdAt: client.createdAt,
    },
    projets: client.projects.map(({ project }) => project),
    emails,
  };
}

/**
 * Suppression d'un espace agence.
 *
 * Les cascades Prisma emportent projets, etapes, fichiers, coffre et journal ;
 * restent les tables sans cle etrangere, traitees explicitement.
 */
export async function deleteAgency(agencyId: string) {
  const assets = await prisma.asset.findMany({
    where: { step: { project: { agencyId } } },
    select: { storageKey: true },
  });

  await prisma.$transaction([
    prisma.emailMessage.deleteMany({ where: { agencyId } }),
    prisma.notification.deleteMany({ where: { agencyId } }),
    prisma.agency.delete({ where: { id: agencyId } }),
  ]);

  logger.info("espace agence supprimé", {
    agencyId,
    fichiers: assets.length,
  });

  // Les binaires vivent hors base : au retour, plus rien ne les reference.
  return assets.map((asset) => asset.storageKey);
}

/**
 * Suppression d'un client : identite, rattachements, et ses messages.
 *
 * Les fichiers deposes appartiennent au projet de l'agence, qui en est
 * responsable de traitement : ils ne sont pas emportes ici. C'est la
 * suppression du projet, ou la retention, qui s'en charge.
 */
export async function deleteClient(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
  });

  await prisma.$transaction([
    prisma.emailMessage.deleteMany({ where: { to: client.email } }),
    prisma.portalInvite.deleteMany({ where: { clientId } }),
    prisma.client.delete({ where: { id: clientId } }),
  ]);

  logger.info("client supprimé", { clientId });
  return client.email;
}

/** Durees de conservation, en mois pour les projets, en jours pour les journaux. */
export function retention() {
  return {
    projetsMois: Number(process.env.RETENTION_PROJECT_MONTHS ?? 12),
    journauxJours: Number(process.env.RETENTION_LOG_DAYS ?? 365),
    emailsJours: Number(process.env.RETENTION_EMAIL_DAYS ?? 180),
    abusJours: Number(process.env.RETENTION_ABUSE_DAYS ?? 90),
  };
}

/**
 * Purge automatique (issue #45).
 *
 * Passe la duree de conservation, les fichiers et les accès d'un projet
 * clos sont supprimes ; le projet lui-meme reste, vide de donnees
 * personnelles, pour que l'agence garde la trace de la prestation.
 */
export async function purgeRetention(now = new Date()) {
  const rules = retention();
  const projectLimit = new Date(now);
  projectLimit.setMonth(projectLimit.getMonth() - rules.projetsMois);

  const projects = await prisma.project.findMany({
    where: {
      status: { in: ["COMPLETED", "ARCHIVED"] },
      updatedAt: { lt: projectLimit },
    },
    select: { id: true },
  });

  const projectIds = projects.map((project) => project.id);

  const assets = projectIds.length
    ? await prisma.asset.findMany({
        where: { step: { projectId: { in: projectIds } } },
        select: { id: true, storageKey: true },
      })
    : [];

  const [credentials, deletedAssets, activities, emails, abuse] =
    await prisma.$transaction([
      prisma.credential.deleteMany({
        where: { step: { projectId: { in: projectIds } } },
      }),
      prisma.asset.deleteMany({
        where: { step: { projectId: { in: projectIds } } },
      }),
      prisma.activity.deleteMany({
        where: {
          createdAt: {
            lt: new Date(now.getTime() - rules.journauxJours * 86_400_000),
          },
        },
      }),
      prisma.emailMessage.deleteMany({
        where: {
          createdAt: {
            lt: new Date(now.getTime() - rules.emailsJours * 86_400_000),
          },
        },
      }),
      prisma.abuseEvent.deleteMany({
        where: {
          createdAt: {
            lt: new Date(now.getTime() - rules.abusJours * 86_400_000),
          },
        },
      }),
    ]);

  const result = {
    projets: projectIds.length,
    acces: credentials.count,
    fichiers: deletedAssets.count,
    journaux: activities.count,
    emails: emails.count,
    refus: abuse.count,
  };

  logger.info("purge de rétention", result);

  // Les binaires sont supprimes par l'appelant, qui connait le stockage.
  return { ...result, storageKeys: assets.map((asset) => asset.storageKey) };
}
