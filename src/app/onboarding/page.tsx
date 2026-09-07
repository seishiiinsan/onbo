import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/tenant";
import { AsideQuote, AuthShell } from "@/components/auth-shell";
import { AgencyForm } from "./agency-form";

export const metadata = { title: "Créer votre espace · Onbo" };

export default async function OnboardingPage() {
  const user = await requireUser();

  const existing = await prisma.membership.count({ where: { userId: user.id } });
  if (existing > 0) redirect("/app");

  return (
    <AuthShell
      title="Créez votre espace"
      subtitle="Un espace correspond à une agence. Vous inviterez votre équipe juste après."
      aside={
        <AsideQuote
          quote="Votre nom, vos couleurs. Vos clients ne verront jamais le nôtre."
          points={[
            "Logo et couleur appliqués au portail client",
            "Directeurs de projet et membres, avec droits distincts",
            "Chaque projet reste cloisonné",
          ]}
        />
      }
    >
      <AgencyForm />
    </AuthShell>
  );
}
