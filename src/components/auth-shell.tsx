import Link from "next/link";
import { LogoMark } from "@/components/logo";

/**
 * Cadre commun aux pages hors application : connexion et creation d'espace.
 * Colonne de gauche pour l'action, colonne de droite pour la marque.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  aside,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 md:px-14">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="focusable inline-flex items-center gap-2 rounded-lg text-[var(--color-brand)]"
          >
            <LogoMark size={22} />
            <span className="font-display text-lg text-[var(--color-ink)]">
              Onbo
            </span>
          </Link>

          <h1 className="mt-10 font-display text-3xl leading-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">{subtitle}</p>

          <div className="mt-7">{children}</div>
        </div>
      </div>

      <div className="hidden bg-[var(--color-ink)] px-14 py-12 md:flex md:flex-col md:justify-center">
        {aside}
      </div>
    </div>
  );
}

export function AsideQuote({
  quote,
  points,
}: {
  quote: string;
  points: string[];
}) {
  return (
    <div className="max-w-sm">
      <p className="font-display text-3xl leading-snug text-white">{quote}</p>
      <ul className="mt-8 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5 text-sm text-white/70">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/40" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
