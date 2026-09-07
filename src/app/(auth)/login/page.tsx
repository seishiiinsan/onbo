import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion · Onbo" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/app");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Wordmark />
          <h1 className="mt-6 font-display text-3xl leading-tight">
            Votre espace agence
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Pas de mot de passe : un lien de connexion à usage unique.
          </p>
        </div>

        {error === "link" && (
          <p className="mb-4 rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)]">
            Lien invalide ou expiré. Les liens valent 15 minutes et ne servent
            qu\'une fois.
          </p>
        )}

        <LoginForm />
      </div>
    </main>
  );
}
