"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
];

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("onbo-theme") as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    localStorage.setItem("onbo-theme", next);
    applyTheme(next);
  };

  return (
    <div
      role="group"
      aria-label="Thème"
      className="flex w-full gap-0.5 rounded-lg border border-[var(--color-line)] p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={theme === option.value}
            title={option.label}
            onClick={() => choose(option.value)}
            className={cn(
              "focusable flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors",
              theme === option.value
                ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            <Icon size={13} />
            <span className="hidden lg:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
