import Link from "next/link";
import { Check, KeyRound, Link2, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Vous créez le projet",
    body: "La checklist assets, accès, brief et contenus est déjà prête. Vous ajustez en deux minutes.",
  },
  {
    title: "Vous envoyez un lien",
    body: "Le client ouvre un portail à vos couleurs. Pas de compte, pas de mot de passe, pas d'excuse.",
  },
  {
    title: "Vous suivez, Onbo relance",
    body: "Chaque étape passe au vert. Si ça bloque, la relance part sans que vous y pensiez.",
  },
];

const ARGUMENTS = [
  {
    icon: KeyRound,
    title: "Coffre d'accès natif",
    body: "Les identifiants hébergeur, CMS et réseaux arrivent chiffrés, pas dans un fil WhatsApp. Chaque lecture est tracée.",
  },
  {
    icon: ShieldCheck,
    title: "Français, RGPD-clean",
    body: "Données hébergées en France, sous-traitance documentée, export et suppression sur demande.",
  },
  {
    icon: Link2,
    title: "Zéro friction client",
    body: "Un lien suffit. Vos clients ne créent rien, n'installent rien, et retrouvent leur espace quand ils veulent.",
  },
];

/** Aperçu du portail client, en dur : vend le produit sans capture d'écran. */
function PortalPreview() {
  const rows = [
    { label: "Logo et charte", state: "Validé", done: true },
    { label: "Accès hébergeur", state: "Transmis", done: true },
    { label: "Textes des pages", state: "En cours", done: false },
    { label: "Photos produits", state: "À faire", done: false },
  ];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[0_20px_60px_-30px_rgba(20,22,26,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-display text-lg">Refonte site Dupont</span>
        <span className="text-xs text-[var(--color-muted)]">62 %</span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
        <div className="h-full w-[62%] rounded-full bg-[var(--color-brand)]" />
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-canvas)] px-3 py-2.5 text-sm"
          >
            <span className="flex items-center gap-2">
              <span
                className={
                  row.done
                    ? "grid h-4 w-4 place-items-center rounded-full bg-[var(--color-validated)] text-white"
                    : "h-4 w-4 rounded-full border border-[var(--color-line-strong)]"
                }
              >
                {row.done && <Check size={11} strokeWidth={3} />}
              </span>
              {row.label}
            </span>
            <span className="text-xs text-[var(--color-muted)]">{row.state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 text-[var(--color-brand)]">
          <LogoMark size={24} />
          <span className="font-display text-xl text-[var(--color-ink)]">
            Onbo
          </span>
        </span>
        <Link href="/login" className="focusable rounded-full">
          <Button variant="outline" size="sm">
            Se connecter
          </Button>
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-6 pb-24 pt-8 md:grid-cols-[1.1fr_1fr] md:pt-16">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-medium text-[var(--color-brand-ink)]">
              Pour les agences web et studios
            </p>
            <h1 className="font-display text-5xl leading-[1.05] md:text-6xl">
              La collecte client,
              <br />
              en un seul lien.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--color-muted)]">
              Le brief éclaté entre mail, WhatsApp et Drive vous coûte cinq à
              dix heures par client. Onbo réunit assets, accès et contenus dans
              un portail à vos couleurs — et relance à votre place.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="focusable rounded-full">
                <Button variant="accent" size="lg">
                  Créer mon espace
                </Button>
              </Link>
              <span className="text-sm text-[var(--color-muted)]">
                Sans carte bancaire · Sans mot de passe
              </span>
            </div>
          </div>

          <PortalPreview />
        </section>

        <section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="font-display text-3xl">Trois étapes, puis plus rien à faire</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="font-display text-3xl text-[var(--color-brand)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 font-medium">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-3xl">
            Ce que les outils américains ne font pas
          </h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
            {ARGUMENTS.map((argument) => {
              const Icon = argument.icon;
              return (
                <article
                  key={argument.title}
                  className="bg-[var(--color-surface)] p-6"
                >
                  <Icon size={20} className="text-[var(--color-brand)]" />
                  <p className="mt-3 font-medium">{argument.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                    {argument.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="rounded-[var(--radius-card)] bg-[var(--color-ink)] px-8 py-14 text-center text-white">
            <h2 className="font-display text-3xl text-white">
              Votre prochain client mérite mieux qu&apos;un mail de relance.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
              Créez votre espace en une minute. Vous n&apos;avez besoin que
              d&apos;une adresse email.
            </p>
            <Link href="/login" className="focusable mt-6 inline-block rounded-full">
              <Button variant="accent" size="lg">
                Commencer
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-[var(--color-muted)]">
          <span className="flex items-center gap-2">
            <LogoMark size={16} />
            Onbo — portail d&apos;onboarding client
          </span>
          <span>Données hébergées en France</span>
        </div>
      </footer>
    </div>
  );
}
