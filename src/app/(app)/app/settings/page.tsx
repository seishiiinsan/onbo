import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/page-header";
import { BrandingForm } from "./branding-form";
import { TeamPanel } from "./team-panel";

export const metadata = { title: "Réglages · Onbo" };

export default async function SettingsPage() {
  const ctx = await requireTenant();

  const [agency, memberships] = await Promise.all([
    prisma.agency.findUniqueOrThrow({ where: { id: ctx.agencyId } }),
    prisma.membership.findMany({
      where: { agencyId: ctx.agencyId },
      orderBy: { joinedAt: "asc" },
      include: {
        user: {
          include: {
            _count: {
              select: {
                projectMembers: { where: { project: { agencyId: ctx.agencyId } } },
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Réglages"
        subtitle="Identité de l'agence et personnes qui y travaillent."
      />
      <div className="space-y-6">
        <BrandingForm
        canEdit={ctx.role !== "MEMBER"}
        agency={{
          name: agency.name,
          slug: agency.slug,
          logoUrl: agency.logoUrl ?? "",
          accentColor: agency.accentColor,
          }}
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
