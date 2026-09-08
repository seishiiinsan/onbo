import { AGENCY_ROLE_LABEL, projectScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { listUserAgencies, requireTenant } from "@/lib/tenant";
import { listNotifications, unreadCount } from "@/lib/notifications";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenant();

  const [agency, user, agencies, awaitingCount, notifications, unread] =
    await Promise.all([
    prisma.agency.findUniqueOrThrow({ where: { id: ctx.agencyId } }),
    prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } }),
    listUserAgencies(ctx.userId),
    prisma.onboardingStep.count({
      where: { status: "SUBMITTED", project: projectScope(ctx) },
    }),
    listNotifications(ctx.userId, ctx.agencyId),
    unreadCount(ctx.userId, ctx.agencyId),
    ]);

  const dateTime = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    // La couleur de l'agence devient la couleur d'accent de toute
    // l'application : le staff travaille dans son propre univers, pas dans le
    // notre.
    <div
      className="flex min-h-screen flex-col md:flex-row"
      style={{ ["--color-brand" as string]: agency.accentColor }}
    >
      <Sidebar
        agencyName={ctx.agencyName}
        logoUrl={agency.logoUrl}
        accentColor={agency.accentColor}
        email={ctx.email}
        userName={user.name ?? ctx.email.split("@")[0]}
        roleLabel={AGENCY_ROLE_LABEL[ctx.role]}
        awaitingCount={awaitingCount}
        notifications={notifications.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          url: item.url,
          at: dateTime.format(item.createdAt),
          read: item.readAt !== null,
        }))}
        unreadNotifications={unread}
        agencies={agencies.map((agency) => ({
          id: agency.id,
          name: agency.name,
          active: agency.id === ctx.agencyId,
        }))}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 md:px-10 md:py-12">
        {children}
      </main>

      <CommandPalette />
    </div>
  );
}
