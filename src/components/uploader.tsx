"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Depot de fichier. Passe par /api/upload plutot que par une server action :
 * le flux binaire ne transite pas par la serialisation React.
 */
export function Uploader({
  stepId,
  token,
  label = "Ajouter un fichier",
}: {
  stepId: string;
  token?: string;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (file: File) => {
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.set("file", file);
    body.set("stepId", stepId);
    if (token) body.set("token", token);

    const response = await fetch("/api/upload", { method: "POST", body });
    setBusy(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Échec de l'envoi.");
      return;
    }

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send(file);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Envoi…" : label}
      </Button>
      {error && (
        <p className="mt-1.5 text-xs text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
