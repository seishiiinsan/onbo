import { prisma } from "@/lib/prisma";
import { daysLeftOfTrial, planOf, PLANS, subscriptionOf } from "@/lib/billing";
import { stripeConfigured } from "@/lib/stripe";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/page-header";
import { BrandingForm } from "./branding-form";
import { BillingPanel } from "./billing-panel";
import { PrivacyPanel } from "./privacy-panel";
import { ProfileForm } from "./profile-form";
import { TeamPanel } from "./team-panel";

export const metadata = { title: "Réglages · Onbo" };

export default async function SettingsPage() {
  const ctx = await requireTenant();

  const [agency, user, memberships, subscription] = await Promise.all([
    prisma.agency.findUniqueOrThrow({ where: { id: ctx.agencyId } }),
    prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } }),
    prisma.membership.findMany({
      where: { agencyId: ctx.agencyId },
      orderBy: { joinedAt: "asc" },
      include: {
        user: {
          include: {
            _count: {
              select: {
                projectMembers: {
                  where: { project: { agencyId: ctx.agencyId } },
                },
              },
            },
          },
        },
      },
    }),
    subscriptionOf(ctx.agencyId),
  ]);

  const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
  const STATUT: Record<string, string> = {
    TRIALING: "essai en cours",
    ACTIVE: "abonnement actif",
    PAST_DUE: "paiement en attente",
    CANCELED: "abonnement résilié",
    INCOMPLETE: "abonnement incomplet",
  };

  return (
    <>
      <PageHeader
        title="Réglages"
        subtitle="Identité de l'agence et personnes qui y travaillent."
      />
      <div className="max-w-2xl space-y-6">
        <ProfileForm name={user.name ?? ""} email={user.email} />

        <BrandingForm
          canEdit={ctx.role !== "MEMBER"}
          agency={{
            name: agency.name,
            slug: agency.slug,
            logoUrl: agency.logoUrl ?? "",
            accentColor: agency.accentColor,
          }}
        />

        <BillingPanel
          isOwner={ctx.role === "OWNER"}
          view={{
            plan: subscription.plan,
            planLabel: `Formule ${planOf(subscription.plan).nom}`,
            status: subscription.status,
            statusLabel: STATUT[subscription.status] ?? subscription.status,
            trialDaysLeft: daysLeftOfTrial(subscription.trialEndsAt),
            renewsOn: subscription.currentPeriodEnd
              ? dayFormat.format(subscription.currentPeriodEnd)
              : null,
            seats: memberships.length,
            hasCustomer: Boolean(subscription.stripeCustomerId),
            configured: stripeConfigured(),
            plans: PLANS.map((plan) => ({
              tier: plan.tier,
              nom: plan.nom,
              prix: plan.prixMensuelEuros,
              sieges: plan.siegesInclus,
            })),
          }}
        />

        <PrivacyPanel
          canManage={ctx.role !== "MEMBER"}
          isOwner={ctx.role === "OWNER"}
          agencyName={agency.name}
        />

        <TeamPanel
          canManage={ctx.role !== "MEMBER"}
          isOwner={ctx.role === "OWNER"}
          members={memberships.map((membership) => ({
            userId: membership.userId,
            email: membership.user.email,
            role: membership.role,
            projectCount: membership.user._count.projectMembers,
            isSelf: membership.userId === ctx.userId,
          }))}
        />
      </div>
    </>
  );
}
