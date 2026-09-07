import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/page-header";
import { NewProjectForm } from "./new-project-form";

export const metadata = { title: "Nouveau projet · Onbo" };

export default async function NewProjectPage() {
  await requireTenant();

  return (
    <>
      <PageHeader
        title="Nouveau projet"
        subtitle="Un projet correspond à un onboarding client."
      />
      <NewProjectForm />
    </>
  );
}
