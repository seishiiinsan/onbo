import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion · Onbo" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/app");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Onbo</h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Connectez-vous à votre espace agence.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
