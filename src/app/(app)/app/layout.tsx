import { AGENCY_ROLE_LABEL, projectScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { listUserAgencies, requireTenant } from "@/lib/tenant";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenant();

  const [agencies, awaitingCount] = await Promise.all([
    listUserAgencies(ctx.userId),
    prisma.onboardingStep.count({
      where: { status: "SUBMITTED", project: projectScope(ctx) },
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        agencyName={ctx.agencyName}
        email={ctx.email}
        roleLabel={AGENCY_ROLE_LABEL[ctx.role]}
        awaitingCount={awaitingCount}
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
