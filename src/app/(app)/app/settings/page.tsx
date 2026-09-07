import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/page-header";
import { BrandingForm } from "./branding-form";

export const metadata = { title: "Réglages · Onbo" };

export default async function SettingsPage() {
  const ctx = await requireTenant();

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: ctx.agencyId },
  });

  return (
    <>
      <PageHeader
        title="Réglages"
        subtitle="Ce branding s'applique au portail que vos clients ouvrent."
      />
      <BrandingForm
        canEdit={ctx.role !== "MEMBER"}
        agency={{
          name: agency.name,
          slug: agency.slug,
          logoUrl: agency.logoUrl ?? "",
          accentColor: agency.accentColor,
        }}
      />
    </>
  );
}
