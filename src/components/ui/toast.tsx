"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Retours d'action (item 36) avec annulation optionnelle (item 39).
 *
 * Une action destructive appelle toast({ tone: "info", undo }) : la
 * suppression n'est jouee qu'a l'expiration du delai, ce qui evite d'avoir a
 * restaurer quoi que ce soit en base.
 */
type Tone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: Tone;
  undo?: () => void;
};

type ToastInput = {
  message: string;
  tone?: Tone;
  /** Affiche « Annuler » et appelle cette fonction si l'utilisateur clique. */
  undo?: () => void;
  durationMs?: number;
};

const ToastContext = createContext<(input: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = { success: Check, error: TriangleAlert, info: Info };

const TONES: Record<Tone, string> = {
  success: "border-[var(--color-validated)]/30 text-[var(--color-validated)]",
  error: "border-[var(--color-danger)]/30 text-[var(--color-danger)]",
  info: "border-[var(--color-line-strong)] text-[var(--color-muted)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    ({ message, tone = "success", undo, durationMs = 5000 }: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone, undo }]);
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border bg-[var(--color-surface)] px-4 py-3 text-sm shadow-lg",
                TONES[toast.tone],
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1 text-[var(--color-ink)]">
                {toast.message}
              </span>

              {toast.undo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.undo?.();
                    dismiss(toast.id);
                  }}
                  className="focusable rounded px-1 font-medium text-[var(--color-brand)] underline-offset-2 hover:underline"
                >
                  Annuler
                </button>
              )}

              <button
                type="button"
                aria-label="Fermer"
                onClick={() => dismiss(toast.id)}
                className="focusable rounded text-[var(--color-muted)]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
