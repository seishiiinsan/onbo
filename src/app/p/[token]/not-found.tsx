import { LogoMark } from "@/components/logo";

export default function PortalNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark size={28} />
      <h1 className="font-display text-4xl">Ce lien n&apos;est plus actif</h1>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
        Votre agence l&apos;a peut-être renouvelé pour des raisons de sécurité.
        Demandez-lui le lien à jour : votre espace et vos documents sont
        intacts.
      </p>
    </main>
  );
}
