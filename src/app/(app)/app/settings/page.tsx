import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { BrandingForm } from "./branding-form";

export const metadata = { title: "Réglages · Onbo" };

export default async function SettingsPage() {
  const ctx = await requireTenant();

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: ctx.agencyId },
  });

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Réglages</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Branding appliqué au portail que vos clients verront.
      </p>
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
