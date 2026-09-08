"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Depot de fichiers : glisser-deposer (item 29), envoi multiple avec
 * progression par fichier (item 30).
 *
 * XMLHttpRequest plutot que fetch : c'est le seul moyen d'obtenir la
 * progression d'envoi.
 *
 * Deux chemins (issue #32) : avec un stockage objet configure, le navigateur
 * televerse directement vers l'URL presignee et l'application ne fait que
 * confirmer ; sinon, envoi classique vers /api/upload.
 */
type Upload = { name: string; percent: number; error?: string };

export function Uploader({
  stepId,
  token,
  label = "Ajouter des fichiers",
}: {
  stepId: string;
  token?: string;
  label?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);

  const progress = (file: File, percent: number) =>
    setUploads((current) =>
      current.map((upload) =>
        upload.name === file.name ? { ...upload, percent } : upload,
      ),
    );

  const fail = (file: File, message: string) => {
    setUploads((current) =>
      current.map((upload) =>
        upload.name === file.name ? { ...upload, error: message } : upload,
      ),
    );
    toast({ message: `${file.name} : ${message}`, tone: "error" });
  };

  const done = (file: File) =>
    setUploads((current) =>
      current.filter((upload) => upload.name !== file.name),
    );

  /** Envoi vers une URL quelconque, avec progression. */
  const put = (file: File, url: string, headers: Record<string, string>) =>
    new Promise<number>((resolve) => {
      const request = new XMLHttpRequest();
      request.open("PUT", url);
      for (const [name, value] of Object.entries(headers)) {
        request.setRequestHeader(name, value);
      }
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          progress(file, Math.round((event.loaded / event.total) * 100));
        }
      };
      request.onload = () => resolve(request.status);
      request.onerror = () => resolve(0);
      request.send(file);
    });

  /**
   * Depot direct : URL presignee, envoi vers le stockage, confirmation.
   * Retourne false quand le stockage objet n'est pas configure (501).
   */
  const sendDirect = async (file: File) => {
    const ask = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stepId,
        token,
        mimeType: file.type,
        size: file.size,
      }),
    });

    if (ask.status === 501) return false;
    if (!ask.ok) {
      const payload = await ask.json().catch(() => ({}));
      fail(file, payload.error ?? "Envoi refusé.");
      return true;
    }

    const presigned = (await ask.json()) as {
      storageKey: string;
      url: string;
      headers: Record<string, string>;
    };

    const status = await put(file, presigned.url, presigned.headers);
    if (status < 200 || status >= 300) {
      fail(file, "Envoi interrompu.");
      return true;
    }

    const confirm = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stepId,
        token,
        storageKey: presigned.storageKey,
        filename: file.name,
        mimeType: file.type,
      }),
    });

    if (!confirm.ok) {
      const payload = await confirm.json().catch(() => ({}));
      fail(file, payload.error ?? "Envoi refusé.");
      return true;
    }

    done(file);
    return true;
  };

  const sendThroughApp = (file: File) =>
    new Promise<void>((resolve) => {
      const body = new FormData();
      body.set("file", file);
      body.set("stepId", stepId);
      if (token) body.set("token", token);

      const request = new XMLHttpRequest();
      request.open("POST", "/api/upload");

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          progress(file, Math.round((event.loaded / event.total) * 100));
        }
      };

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          done(file);
        } else {
          let message = "Envoi refusé.";
          try {
            message = JSON.parse(request.responseText).error ?? message;
          } catch {}
          fail(file, message);
        }
        resolve();
      };

      request.onerror = () => {
        fail(file, "Envoi interrompu.");
        resolve();
      };

      request.send(body);
    });

  const send = async (files: File[]) => {
    if (files.length === 0) return;

    setUploads((current) => [
      ...current,
      ...files.map((file) => ({ name: file.name, percent: 0 })),
    ]);

    for (const file of files) {
      // Le depot direct n'est tente qu'une fois : si le stockage objet n'est
      // pas configure, on bascule sur l'envoi classique.
      if (!(await sendDirect(file))) await sendThroughApp(file);
    }

    if (inputRef.current) inputRef.current.value = "";
    toast({
      message:
        files.length === 1
          ? "Fichier envoyé."
          : `${files.length} fichiers envoyés.`,
    });
    router.refresh();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => void send(Array.from(event.target.files ?? []))}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void send(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "focusable flex w-full flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-5 text-sm transition-colors",
          dragging
            ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
            : "border-[var(--color-line-strong)] text-[var(--color-muted)] hover:border-[var(--color-ink)]",
        )}
      >
        <UploadCloud size={18} />
        <span>{label}</span>
        <span className="text-xs">
          Glissez-déposez, ou cliquez. 25 Mo par fichier.
        </span>
      </button>

      {uploads.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {uploads.map((upload) => (
            <li key={upload.name} className="text-xs">
              <div className="flex justify-between gap-2">
                <span className="truncate">{upload.name}</span>
                <span className="text-[var(--color-muted)]">
                  {upload.error ?? `${upload.percent} %`}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    upload.error
                      ? "bg-[var(--color-danger)]"
                      : "bg-[var(--color-brand)]",
                  )}
                  style={{ width: `${upload.error ? 100 : upload.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/** Vignette cliquable pour les images, icone sinon (item 21). */
export function AssetThumb({
  asset,
  token,
}: {
  asset: { id: string; filename: string; mimeType: string };
  token?: string;
}) {
  const isImage =
    asset.mimeType.startsWith("image/") && asset.mimeType !== "image/svg+xml";
  const query = token ? `?token=${token}&inline=1` : "?inline=1";

  if (!isImage) {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-black/[0.05] text-[10px] uppercase text-[var(--color-muted)]">
        {asset.filename.split(".").pop()?.slice(0, 4)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/files/${asset.id}${query}`}
      alt={asset.filename}
      loading="lazy"
      className="h-9 w-9 shrink-0 rounded-md object-cover"
    />
  );
}
