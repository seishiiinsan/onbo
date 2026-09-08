import { Suspense } from "react";
import { AGENCY_ROLE_LABEL, projectScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { listNotifications, unreadCount } from "@/lib/notifications";
import { CommandPalette } from "./command-palette";
import { NotificationsBell } from "./notifications-bell";
import { Sidebar } from "./sidebar";

/**
 * Coquille de l'application.
 *
 * Le rail ne depend que du contexte tenant, deja resolu et memoise : il
 * s'affiche sans attendre. Le compteur d'etapes a valider et le centre de
 * notifications arrivent en differe (Suspense), pour ne pas retenir la page
 * entiere le temps de deux requetes.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenant();

  return (
    // La couleur de l'agence devient la couleur d'accent de toute
    // l'application : le staff travaille dans son propre univers, pas dans le
    // notre.
    <div
      className="flex min-h-screen flex-col md:flex-row"
      style={{ ["--color-brand" as string]: ctx.agency.accentColor }}
    >
      <Sidebar
        agencyName={ctx.agencyName}
        logoUrl={ctx.agency.logoUrl}
        accentColor={ctx.agency.accentColor}
        email={ctx.email}
        userName={ctx.userName ?? ctx.email.split("@")[0]}
        roleLabel={AGENCY_ROLE_LABEL[ctx.role]}
        awaitingSlot={
          <Suspense fallback={null}>
            <AwaitingBadge />
          </Suspense>
        }
        notificationsSlot={
          <Suspense fallback={<NotificationsBell items={[]} unread={0} />}>
            <NotificationsPanel />
          </Suspense>
        }
        agencies={ctx.agencies.map((agency) => ({
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

/** Etapes en attente de validation, tous projets visibles confondus. */
async function AwaitingBadge() {
  const ctx = await requireTenant();
  const count = await prisma.onboardingStep.count({
    where: { status: "SUBMITTED", project: projectScope(ctx) },
  });

  if (count === 0) return null;
  return <>{count}</>;
}

async function NotificationsPanel() {
  const ctx = await requireTenant();
  const [items, unread] = await Promise.all([
    listNotifications(ctx.userId, ctx.agencyId),
    unreadCount(ctx.userId, ctx.agencyId),
  ]);

  const dateTime = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <NotificationsBell
      unread={unread}
      items={items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        url: item.url,
        at: dateTime.format(item.createdAt),
        read: item.readAt !== null,
      }))}
    />
  );
}
