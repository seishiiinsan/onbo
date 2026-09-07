import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/tenant";
import { Wordmark } from "@/components/logo";
import { AgencyForm } from "./agency-form";

export const metadata = { title: "Créer votre espace · Onbo" };

export default async function OnboardingPage() {
  const user = await requireUser();

  const existing = await prisma.membership.count({ where: { userId: user.id } });
  if (existing > 0) redirect("/app");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Wordmark />
          <h1 className="mt-6 font-display text-3xl leading-tight">
            Créez votre espace
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Un espace = une agence. Vous inviterez votre équipe ensuite.
          </p>
        </div>
        <AgencyForm />
      </div>
    </main>
  );
}
