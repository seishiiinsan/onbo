import Link from "next/link";
import { redirect } from "next/navigation";
import { consumeLoginToken } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Connexion · Onbo" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (token) {
    const session = await consumeLoginToken(token);
    if (session) redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="text-sm">
          <p className="font-medium">Lien invalide ou expiré.</p>
          <p className="mt-1 text-[var(--color-muted)]">
            Les liens sont à usage unique et valables 15 minutes.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block text-[var(--color-accent)] underline"
          >
            Demander un nouveau lien
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
