import { notFound } from "next/navigation";
import { progressOf } from "@/lib/progress";
import { resolvePortalToken, touchPortalLink } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { ProgressBar } from "@/components/ui/progress";
import { PortalStep } from "./portal-step";

export const metadata = { title: "Votre espace projet" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

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

  // Le portail ne sert jamais les notes internes ni les secrets deposes.
  const steps = await prisma.onboardingStep.findMany({
    where: { projectId: project.id },
    orderBy: { position: "asc" },
    include: {
      assets: { orderBy: { createdAt: "asc" } },
      comments: {
        where: { internal: false },
        orderBy: { createdAt: "asc" },
      },
      credentials: {
        orderBy: { createdAt: "asc" },
        select: { id: true, label: true, kind: true, createdAt: true },
      },
    },
  });

  const progress = progressOf(steps);
  const remaining = steps.filter((step) => step.status !== "VALIDATED").length;

  return (
    <div
      className="min-h-screen"
      style={{ ["--color-brand" as string]: agency.accentColor }}
    >
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-5">
          {agency.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agency.logoUrl} alt={agency.name} className="h-8 w-auto" />
          ) : (
            <span className="font-display text-xl">{agency.name}</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-display text-4xl leading-tight">{project.name}</h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          {agency.name} a besoin des éléments ci-dessous pour démarrer. Déposez
          vos fichiers, transmettez vos accès en sécurité, et cochez au fur et à
          mesure. Vous pouvez revenir quand vous voulez.
        </p>

        <div className="mt-8 mb-10 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-display text-2xl">{progress}%</span>
            <span className="text-sm text-[var(--color-muted)]">
              {remaining === 0
                ? "Tout est transmis, merci !"
                : `${remaining} point(s) restant(s)`}
            </span>
          </div>
          <ProgressBar value={progress} />
        </div>

        {steps.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Aucune étape pour l&apos;instant. {agency.name} vous préviendra.
          </p>
        ) : (
          <ul className="grid gap-3">
            {steps.map((step) => (
              <PortalStep
                key={step.id}
                token={token}
                agencyName={agency.name}
                step={{
                  id: step.id,
                  title: step.title,
                  description: step.description,
                  kind: step.kind,
                  status: step.status,
                  assets: step.assets.map((asset) => ({
                    id: asset.id,
                    filename: asset.filename,
                    size: asset.size,
                  })),
                  credentials: step.credentials.map((credential) => ({
                    id: credential.id,
                    label: credential.label,
                  })),
                  comments: step.comments.map((comment) => ({
                    id: comment.id,
                    body: comment.body,
                    author: comment.author,
                    at: dateFormat.format(comment.createdAt),
                  })),
                }}
              />
            ))}
          </ul>
        )}

        <footer className="mt-14 border-t border-[var(--color-line)] pt-6 text-center">
          <p className="text-xs leading-relaxed text-[var(--color-muted)]">
            Vos fichiers et vos accès ne sont visibles que par {agency.name}.
            Les mots de passe transmis ici sont chiffrés et ne circulent jamais
            par email.
          </p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Espace fourni par {agency.name} · propulsé par Onbo
          </p>
        </footer>
      </main>
    </div>
  );
}
