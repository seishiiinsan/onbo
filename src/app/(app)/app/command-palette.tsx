"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Result = { kind: string; label: string; hint: string; href: string };

/**
 * Recherche globale (item 3) et raccourcis clavier (item 4).
 *
 * ⌘K / Ctrl+K ouvre la palette, « n » cree un projet, « / » ouvre la
 * recherche. Les raccourcis a touche simple sont ignores pendant la saisie.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === "Escape") setOpen(false);
      if (typing) return;

      if (event.key === "/") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        router.push("/app/projects/new");
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
    else {
      setQuery("");
      setResults([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
      ).catch(() => null);
      if (!response?.ok) return;
      const payload = await response.json();
      setResults(payload.results ?? []);
      setActive(0);
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  const go = (result: Result) => {
    setOpen(false);
    router.push(result.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
      <button
        type="button"
        aria-label="Fermer la recherche"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/30"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        className="relative w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-3">
          <Search size={16} className="text-[var(--color-muted)]" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, results.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              }
              if (event.key === "Enter" && results[active]) go(results[active]);
            }}
            placeholder="Rechercher un projet, une étape, un contact…"
            className="h-12 border-0 focus-visible:ring-0"
          />
        </div>

        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {results.map((result, index) => (
              <li key={`${result.href}-${result.label}-${index}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(result)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    index === active ? "bg-[var(--color-brand-soft)]" : ""
                  }`}
                >
                  <span className="min-w-0 truncate">{result.label}</span>
                  <span className="shrink-0 text-xs text-[var(--color-muted)]">
                    {result.kind}
                    {result.hint && ` · ${result.hint}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-[var(--color-muted)]">
            {query.length < 2
              ? "Tapez au moins deux caractères. ⌘K pour ouvrir, N pour un nouveau projet."
              : "Aucun résultat."}
          </p>
        )}
      </div>
    </div>
  );
}
