import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/tenant";
import { AgencyForm } from "./agency-form";

export const metadata = { title: "Créer votre espace · Onbo" };

export default async function OnboardingPage() {
  const user = await requireUser();

  const existing = await prisma.membership.count({ where: { userId: user.id } });
  if (existing > 0) redirect("/app");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          Créez votre espace
        </h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Un espace = une agence. Vous pourrez inviter votre équipe ensuite.
        </p>
        <AgencyForm />
      </div>
    </main>
  );
}
