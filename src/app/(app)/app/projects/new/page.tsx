import { requireTenant } from "@/lib/tenant";
import { NewProjectForm } from "./new-project-form";

export const metadata = { title: "Nouveau projet · Onbo" };

export default async function NewProjectPage() {
  await requireTenant();

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">
        Nouveau projet
      </h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Un projet correspond à un onboarding client.
      </p>
      <NewProjectForm />
    </>
  );
}
