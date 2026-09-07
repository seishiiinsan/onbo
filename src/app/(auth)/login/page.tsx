import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AsideQuote, AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion · Onbo" };

/**
 * Connexion et creation de compte au meme endroit : le lien magique cree le
 * compte s'il n'existe pas, il n'y a donc rien a choisir a l'avance.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/app");

  const { error } = await searchParams;

  return (
    <AuthShell
      title="Connexion à votre espace"
      subtitle="Nouveau sur Onbo ? La même adresse crée votre espace. Rien d'autre à remplir."
      aside={
        <AsideQuote
          quote="Un lien envoyé, et la collecte se fait toute seule."
          points={[
            "Portail client à vos couleurs, sans compte à créer",
            "Accès hébergeur et CMS reçus chiffrés",
            "Relances automatiques quand ça traîne",
          ]}
        />
      }
    >
      {error === "link" && (
        <p className="mb-4 rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)]">
          Ce lien n&apos;est plus valable. Ils durent 15 minutes et ne servent
          qu&apos;une fois — demandez-en un nouveau.
        </p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
