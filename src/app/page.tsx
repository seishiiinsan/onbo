import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Vous créez le projet",
    body: "Checklist prête à l'emploi : assets, accès, brief, contenus.",
  },
  {
    title: "Vous envoyez un lien",
    body: "Le client ouvre son portail à vos couleurs. Aucun compte à créer.",
  },
  {
    title: "Vous suivez l'avancement",
    body: "Chaque étape passe au vert. Les relances partent toutes seules.",
  },
];

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
        <Link href="/login">
          <Button variant="outline" size="sm">
            Se connecter
          </Button>
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10 md:pt-20">
        <p className="mb-4 inline-flex rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-medium text-[var(--color-brand-ink)]">
          Pour les agences web
        </p>
        <h1 className="max-w-3xl font-display text-5xl leading-[1.05] md:text-7xl">
          La collecte client,
          <br />
          en un seul lien.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-muted)]">
          Fini le brief éclaté entre mail, WhatsApp et Drive. Onbo réunit les
          assets, les accès et le contenu dans un portail à vos couleurs — et
          relance le client à votre place.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/login">
            <Button variant="accent" size="lg">
              Créer mon espace
            </Button>
          </Link>
          <span className="text-sm text-[var(--color-muted)]">
            Sans mot de passe · Données hébergées en France
          </span>
        </div>

        <ol className="mt-20 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="bg-[var(--color-surface)] p-6">
              <span className="font-display text-3xl text-[var(--color-brand)]">
                {index + 1}
              </span>
              <p className="mt-3 font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
