import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Onbo</h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Connectez-vous à votre espace agence.
        </p>
        {error === "link" && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Lien invalide ou expiré. Les liens sont à usage unique et valables
            15 minutes.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
