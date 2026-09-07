import { notFound } from "next/navigation";
import { progressOf, KIND_LABEL, STATUS_LABEL } from "@/lib/progress";
import { resolvePortalToken, touchPortalLink } from "@/lib/portal";
import { ProgressBar } from "@/components/progress-bar";
import { PortalStep } from "./portal-step";

export const metadata = { title: "Votre espace projet" };

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await resolvePortalToken(token);

  if (!link) notFound();
  await touchPortalLink(link.id);

  const { project } = link;
  const agency = project.agency;
  const progress = progressOf(project.steps);

  return (
    <div
      className="min-h-screen"
      style={{ ["--color-accent" as string]: agency.accentColor }}
    >
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-6">
          {agency.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agency.logoUrl}
              alt={agency.name}
              className="h-8 w-auto"
            />
          ) : (
            <span className="font-semibold tracking-tight">{agency.name}</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Voici ce dont {agency.name} a besoin pour démarrer. Marquez chaque
          point au fur et à mesure — vous pouvez revenir quand vous voulez.
        </p>

        <div className="mt-6 mb-8">
          <ProgressBar value={progress} />
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {progress}% complété
          </p>
        </div>

        {project.steps.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Aucune étape pour l&apos;instant. {agency.name} vous préviendra.
          </p>
        ) : (
          <ul className="space-y-3">
            {project.steps.map((step) => (
              <PortalStep
                key={step.id}
                token={token}
                step={{
                  id: step.id,
                  title: step.title,
                  description: step.description,
                  kindLabel: KIND_LABEL[step.kind],
                  status: step.status,
                  statusLabel: STATUS_LABEL[step.status],
                }}
              />
            ))}
          </ul>
        )}

        <p className="mt-10 text-xs text-[var(--color-muted)]">
          Le dépôt de fichiers et la transmission sécurisée de vos accès
          arrivent prochainement.
        </p>
      </main>
    </div>
  );
}
