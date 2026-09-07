import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { NewProjectForm } from "./new-project-form";

export const metadata = { title: "Nouveau projet · Onbo" };

export default async function NewProjectPage() {
  await requireTenant();

  return (
    <>
      <Link
        href="/app"
        className="focusable rounded text-xs text-[var(--color-muted)] underline-offset-2 hover:underline"
      >
        ← Tous les projets
      </Link>

      <h1 className="mt-2 font-display text-3xl leading-tight">
        Nouveau projet
      </h1>
      <p className="mt-1 mb-7 text-sm text-[var(--color-muted)]">
        Un projet correspond à un onboarding client : un site, une refonte, une
        campagne.
      </p>

      <NewProjectForm />
    </>
  );
}
