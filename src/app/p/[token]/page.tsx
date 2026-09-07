import Link from "next/link";
import { notFound } from "next/navigation";
import { dictionary, parseLocale } from "@/lib/portal-i18n";
import { resolvePortalToken, touchPortalLink } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { progressOf } from "@/lib/progress";
import { PortalHeader } from "./portal-header";
import { PortalStep } from "./portal-step";
import { QuestionBox } from "./question-box";

export const metadata = { title: "Votre espace projet" };

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { token } = await params;
  const { lang } = await searchParams;
  const locale = parseLocale(lang);
  const t = dictionary(locale);

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
      comments: { where: { internal: false }, orderBy: { createdAt: "asc" } },
      credentials: {
        orderBy: { createdAt: "asc" },
        select: { id: true, label: true },
      },
    },
  });

  const dateFormat = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const dayFormat = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "long",
  });

  const progress = progressOf(steps);
  const pending = steps.filter((step) => step.status !== "VALIDATED");
  // Item 28 : une seule action mise en avant, la premiere qui attend le client.
  const nextStep =
    pending.find((step) => step.status === "PENDING") ??
    pending.find((step) => step.status === "IN_PROGRESS") ??
    null;

  const overdue =
    project.dueDate !== null && project.dueDate.getTime() < Date.now();

  return (
    <div
      className="min-h-screen"
      style={{ ["--color-brand" as string]: agency.accentColor }}
    >
      <PortalHeader
        agencyName={agency.name}
        logoUrl={agency.logoUrl}
        progress={progress}
        locale={locale}
        token={token}
        summary={
          pending.length === 0 ? t.allDone : t.remaining(pending.length)
        }
      />

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-display text-4xl leading-tight">{project.name}</h1>
        <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-muted)]">
          {t.intro(agency.name)}
        </p>

        {project.dueDate && (
          <p
            className={`mt-3 text-sm ${
              overdue
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-muted)]"
            }`}
          >
            {overdue
              ? t.overdue(dayFormat.format(project.dueDate))
              : t.dueOn(dayFormat.format(project.dueDate))}
          </p>
        )}

        {/* Fin de parcours (item 31) */}
        {steps.length > 0 && pending.length === 0 && (
          <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-validated)]/30 bg-[var(--color-validated-soft)] p-6">
            <p className="font-display text-2xl text-[var(--color-validated)]">
              {t.completedTitle}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink)]">
              {t.completedBody(agency.name)}
            </p>
          </div>
        )}

        {/* Prochaine action (item 28) */}
        {nextStep && (
          <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-4 py-3">
            <p className="section-label text-[var(--color-brand-ink)]">
              {t.nextUp}
            </p>
            <p className="mt-1 font-medium">{nextStep.title}</p>
            {nextStep.description && (
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                {nextStep.description}
              </p>
            )}
          </div>
        )}

        {steps.length === 0 ? (
          <p className="mt-8 text-sm text-[var(--color-muted)]">{t.noSteps}</p>
        ) : (
          <ul className="mt-8 grid gap-3">
            {steps.map((step) => (
              <PortalStep
                key={step.id}
                token={token}
                agencyName={agency.name}
                t={t}
                highlighted={step.id === nextStep?.id}
                step={{
                  id: step.id,
                  title: step.title,
                  description: step.description,
                  kind: step.kind,
                  status: step.status,
                  required: step.required,
                  blockedNote: step.blockedNote,
                  assets: step.assets.map((asset) => ({
                    id: asset.id,
                    filename: asset.filename,
                    mimeType: asset.mimeType,
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

        {/* Question globale (item 35) */}
        {steps.length > 0 && (
          <QuestionBox
            token={token}
            stepId={(nextStep ?? steps[0]).id}
            label={t.askQuestion}
            placeholder={t.questionPlaceholder}
            sendLabel={t.send}
          />
        )}

        <footer className="mt-14 border-t border-[var(--color-line)] pt-6 text-center">
          <p className="text-xs leading-relaxed text-[var(--color-muted)]">
            {t.footerSecurity(agency.name)}
          </p>
          <div className="no-print mt-3 flex items-center justify-center gap-4 text-xs text-[var(--color-muted)]">
            <Link
              href={`/p/${token}?lang=${locale === "fr" ? "en" : "fr"}`}
              className="focusable rounded underline-offset-2 hover:underline"
            >
              {locale === "fr" ? "English" : "Français"}
            </Link>
            <span aria-hidden>·</span>
            <span>{t.footerBy(agency.name)}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export const dynamic = "force-dynamic";
