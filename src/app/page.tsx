import Link from "next/link";
import {
  Bell,
  Check,
  Clock,
  FileStack,
  KeyRound,
  Link2,
  ListChecks,
  Lock,
  MessagesSquare,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Vous créez le projet",
    body: "La checklist assets, accès, brief et contenus est déjà prête. Vous ajustez en deux minutes, vous fixez une échéance.",
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

const FEATURES = [
  {
    icon: Link2,
    title: "Portail client brandé",
    body: "Votre logo, votre couleur, votre nom. Un lien révocable, aucun compte à créer côté client.",
  },
  {
    icon: ListChecks,
    title: "Checklist par étapes",
    body: "Assets, accès, brief, contenus. Étapes obligatoires ou optionnelles, réordonnables, avec motif de blocage visible du client.",
  },
  {
    icon: KeyRound,
    title: "Coffre d'accès chiffré",
    body: "Hébergeur, CMS, réseaux : le client dépose, c'est chiffré à la réception. Révélation une par une, chaque lecture tracée.",
  },
  {
    icon: FileStack,
    title: "Dépôt de fichiers",
    body: "Glisser-déposer, envois multiples, aperçu des images, téléchargement groupé en ZIP.",
  },
  {
    icon: Bell,
    title: "Relances automatiques",
    body: "Délai réglable par projet, garde-fou anti-spam, désactivable en un clic.",
  },
  {
    icon: Users,
    title: "Rôles et affectations",
    body: "Directeurs de projet sur tout l'espace, membres sur leurs projets seulement. L'accès au coffre se décide personne par personne.",
  },
  {
    icon: MessagesSquare,
    title: "Échanges par étape",
    body: "Les questions restent au bon endroit. Vos notes internes ne sortent jamais côté client.",
  },
  {
    icon: ScrollText,
    title: "Journal d'activité",
    body: "Qui a déposé quoi, qui a validé, qui a consulté quel accès. Utile en suivi, décisif en litige.",
  },
];

const ROADMAP = [
  "Templates d'onboarding réutilisables",
  "Signature de devis dans le portail",
  "Alertes d'expiration sur les accès et les domaines",
  "Intégrations Slack, Notion, Drive",
];

const PLANS = [
  {
    name: "Solo",
    price: "29 €",
    detail: "par mois",
    pitch: "Freelance ou studio d'une personne.",
    features: [
      "5 projets actifs",
      "Portail brandé illimité",
      "Coffre d'accès chiffré",
      "Relances automatiques",
    ],
  },
  {
    name: "Studio",
    price: "99 €",
    detail: "par mois",
    pitch: "L'équipe de 3 à 15 personnes. Le plus choisi.",
    features: [
      "Projets illimités",
      "Rôles et affectations par projet",
      "Journal d'activité complet",
      "Support prioritaire",
    ],
    featured: true,
  },
  {
    name: "Agence",
    price: "149 €",
    detail: "par mois",
    pitch: "Plusieurs pôles, gros volume de clients.",
    features: [
      "Tout le plan Studio",
      "Espaces multiples",
      "Export et rétention sur mesure",
      "Accompagnement à la mise en place",
    ],
  },
];

const FAQ = [
  {
    question: "Mes clients doivent-ils créer un compte ?",
    answer:
      "Non. Vous envoyez un lien, ils l'ouvrent, ils déposent. Le lien est révocable et régénérable à tout moment depuis le projet.",
  },
  {
    question: "Où sont hébergées les données ?",
    answer:
      "En France, sur une infrastructure que nous opérons. La base n'est pas exposée sur Internet, et les sauvegardes restent dans l'Union européenne.",
  },
  {
    question: "Comment sont protégés les accès transmis par le client ?",
    answer:
      "Chaque secret est chiffré en AES-256-GCM avec une clé stockée hors base. Il n'est jamais réaffiché en clair dans une liste : la révélation se fait une entrée à la fois, et chaque lecture est journalisée.",
  },
  {
    question: "Un développeur peut-il voir les mots de passe du client ?",
    answer:
      "Seulement si vous le décidez. L'accès au coffre est un droit distinct, accordé projet par projet et personne par personne.",
  },
  {
    question: "Que se passe-t-il si j'arrête mon abonnement ?",
    answer:
      "Vous exportez vos données et vos fichiers, puis nous les supprimons. Aucune rétention silencieuse.",
  },
  {
    question: "Onbo remplace-t-il mon outil de gestion de projet ?",
    answer:
      "Non, et c'est volontaire. Onbo tient la frontière entre vous et le client. Vos tâches internes restent où elles sont.",
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
            <span className="text-xs text-[var(--color-muted)]">
              {row.state}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="section-label mb-2 text-[var(--color-brand)]">{eyebrow}</p>
      <h2 className="font-display text-4xl leading-tight">{title}</h2>
      {lead && (
        <p className="mt-3 leading-relaxed text-[var(--color-muted)]">{lead}</p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-[var(--color-brand)]">
            <LogoMark size={24} />
            <span className="font-display text-xl text-[var(--color-ink)]">
              Onbo
            </span>
          </span>

          <nav className="hidden items-center gap-6 text-sm text-[var(--color-muted)] md:flex">
            <a
              href="#fonctionnalites"
              className="focusable rounded hover:text-[var(--color-ink)]"
            >
              Fonctionnalités
            </a>
            <a
              href="#securite"
              className="focusable rounded hover:text-[var(--color-ink)]"
            >
              Sécurité
            </a>
            <a
              href="#tarifs"
              className="focusable rounded hover:text-[var(--color-ink)]"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              className="focusable rounded hover:text-[var(--color-ink)]"
            >
              FAQ
            </a>
          </nav>

          <Link href="/login" className="focusable rounded-full">
            <Button variant="outline" size="sm">
              Se connecter
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
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
                14 jours d&apos;essai · sans carte bancaire
              </span>
            </div>

            <p className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-muted)]">
              <span className="flex items-center gap-1.5">
                <Lock size={13} /> Accès chiffrés
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} /> Hébergé en France
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} /> Prêt en 2 minutes
              </span>
            </p>
          </div>

          <PortalPreview />
        </section>

        {/* Avant / apres */}
        <section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <SectionTitle
              eyebrow="Le problème"
              title="La collecte, c'est 5 à 10 h perdues par client."
            />

            <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-2">
              <div className="bg-[var(--color-canvas)] p-6">
                <p className="mb-4 font-medium">Sans Onbo</p>
                <ul className="space-y-2.5 text-sm text-[var(--color-muted)]">
                  {[
                    "Le brief est éclaté entre mail, WhatsApp et Drive",
                    "Les accès arrivent en clair dans une conversation",
                    "Vous relancez trois fois, à la main",
                    "Personne ne sait ce qui manque encore",
                    "Le projet démarre avec deux semaines de retard",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-muted)]" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[var(--color-surface)] p-6">
                <p className="mb-4 font-medium">Avec Onbo</p>
                <ul className="space-y-2.5 text-sm">
                  {[
                    "Un lien unique, un portail à vos couleurs",
                    "Les accès arrivent chiffrés, jamais par email",
                    "Les relances partent toutes seules",
                    "L'avancement est lisible des deux côtés",
                    "Vous démarrez avec un dossier complet",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5">
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0 text-[var(--color-validated)]"
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Etapes */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <SectionTitle
            eyebrow="Comment ça marche"
            title="Trois étapes, puis plus rien à faire"
          />
          <ol className="grid gap-8 md:grid-cols-3">
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
        </section>

        {/* Fonctionnalites */}
        <section
          id="fonctionnalites"
          className="border-y border-[var(--color-line)] bg-[var(--color-surface)]"
        >
          <div className="mx-auto max-w-5xl px-6 py-16">
            <SectionTitle
              eyebrow="Fonctionnalités"
              title="Tout ce qu'il faut pour ne plus courir après un client"
              lead="Pas un outil de gestion de projet de plus : Onbo tient uniquement la frontière entre votre agence et vos clients."
            />

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title}>
                    <Icon size={20} className="text-[var(--color-brand)]" />
                    <p className="mt-3 font-medium">{feature.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                      {feature.body}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-12 rounded-[var(--radius-card)] border border-dashed border-[var(--color-line-strong)] p-6">
              <p className="flex items-center gap-2 font-medium">
                <Sparkles size={16} className="text-[var(--color-brand)]" />
                En cours de construction
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--color-muted)]">
                {ROADMAP.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Securite */}
        <section id="securite" className="mx-auto max-w-5xl px-6 py-16">
          <SectionTitle
            eyebrow="Sécurité et conformité"
            title="Vous manipulez les clés de la maison de vos clients."
            lead="Récupérer des accès proprement est la partie la plus sensible de l'onboarding. C'est celle que nous avons traitée en premier."
          />

          <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
            {[
              {
                title: "Chiffrement des secrets",
                body: "AES-256-GCM, clé conservée hors base. Un secret n'apparaît jamais dans une liste : il se révèle une entrée à la fois.",
              },
              {
                title: "Cloisonnement strict",
                body: "Chaque requête est bornée à votre agence. Un projet hors périmètre répond « introuvable », sans révéler son existence.",
              },
              {
                title: "Traçabilité",
                body: "Dépôts, validations, révélations de secrets : tout est horodaté et attribué, côté agence comme côté client.",
              },
            ].map((block) => (
              <article
                key={block.title}
                className="bg-[var(--color-surface)] p-6"
              >
                <p className="font-medium">{block.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                  {block.body}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-6 text-sm text-[var(--color-muted)]">
            Hébergement en France, base non exposée sur Internet, export et
            suppression des données sur demande.
          </p>
        </section>

        {/* Tarifs */}
        <section
          id="tarifs"
          className="border-y border-[var(--color-line)] bg-[var(--color-surface)]"
        >
          <div className="mx-auto max-w-5xl px-6 py-16">
            <SectionTitle
              eyebrow="Tarifs"
              title="Moins cher qu'une heure de chef de projet"
              lead="Facturé au mois, sans engagement. 14 jours d'essai, sans carte bancaire."
            />

            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-[var(--radius-card)] border p-6 ${
                    plan.featured
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                      : "border-[var(--color-line)] bg-[var(--color-canvas)]"
                  }`}
                >
                  <p className="font-medium">{plan.name}</p>
                  <p className="mt-3 font-display text-4xl">
                    {plan.price}
                    <span className="ml-1 text-sm text-[var(--color-muted)]">
                      {plan.detail}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {plan.pitch}
                  </p>

                  <ul className="mt-5 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check
                          size={15}
                          className="mt-0.5 shrink-0 text-[var(--color-validated)]"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/login"
                    className="focusable mt-6 block rounded-full"
                  >
                    <Button
                      variant={plan.featured ? "accent" : "outline"}
                      className="w-full"
                    >
                      Commencer l&apos;essai
                    </Button>
                  </Link>
                </article>
              ))}
            </div>

            <p className="mt-6 text-xs text-[var(--color-muted)]">
              Tarifs hors taxes. Les plans évolueront avec le produit : les
              premiers inscrits gardent leur tarif d&apos;entrée.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-5xl px-6 py-16">
          <SectionTitle
            eyebrow="Questions"
            title="Ce qu'on nous demande le plus"
          />

          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            {FAQ.map((entry) => (
              <article key={entry.question}>
                <p className="font-medium">{entry.question}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                  {entry.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="rounded-[var(--radius-card)] bg-[var(--color-ink)] px-8 py-14 text-center">
            <h2 className="font-display text-3xl text-white">
              Votre prochain client mérite mieux qu&apos;un mail de relance.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
              Créez votre espace en une minute. Vous n&apos;avez besoin que
              d&apos;une adresse email.
            </p>
            <Link
              href="/login"
              className="focusable mt-6 inline-block rounded-full"
            >
              <Button variant="accent" size="lg">
                Commencer
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 sm:grid-cols-3">
          <div>
            <span className="flex items-center gap-2 text-[var(--color-brand)]">
              <LogoMark size={18} />
              <span className="font-display text-lg text-[var(--color-ink)]">
                Onbo
              </span>
            </span>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
              Le portail d&apos;onboarding client des agences web. Données
              hébergées en France.
            </p>
          </div>

          <div className="text-sm">
            <p className="section-label mb-2">Produit</p>
            <ul className="space-y-1.5 text-[var(--color-muted)]">
              <li>
                <a
                  href="#fonctionnalites"
                  className="focusable rounded hover:text-[var(--color-ink)]"
                >
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a
                  href="#tarifs"
                  className="focusable rounded hover:text-[var(--color-ink)]"
                >
                  Tarifs
                </a>
              </li>
              <li>
                <a
                  href="#securite"
                  className="focusable rounded hover:text-[var(--color-ink)]"
                >
                  Sécurité
                </a>
              </li>
            </ul>
          </div>

          <div className="text-sm">
            <p className="section-label mb-2">Accès</p>
            <ul className="space-y-1.5 text-[var(--color-muted)]">
              <li>
                <Link
                  href="/login"
                  className="focusable rounded hover:text-[var(--color-ink)]"
                >
                  Connexion
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="focusable rounded hover:text-[var(--color-ink)]"
                >
                  Créer un espace
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="border-t border-[var(--color-line)] px-6 py-5 text-center text-xs text-[var(--color-muted)]">
          © {new Date().getFullYear()} Onbo
        </p>
      </footer>
    </div>
  );
}
