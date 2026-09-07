"use client";

import { useEffect, useState } from "react";

/**
 * Brouillon persistant (item 26).
 * Local au navigateur : un message a moitie ecrit ne doit pas disparaitre
 * parce qu'on a change d'onglet ou recharge la page.
 */
export function useDraft(key: string) {
  const storageKey = `onbo-draft:${key}`;
  const [value, setValue] = useState("");

  useEffect(() => {
    try {
      setValue(localStorage.getItem(storageKey) ?? "");
    } catch {
      // Stockage indisponible : le brouillon reste en memoire.
    }
  }, [storageKey]);

  const set = (next: string) => {
    setValue(next);
    try {
      if (next) localStorage.setItem(storageKey, next);
      else localStorage.removeItem(storageKey);
    } catch {}
  };

  return { value, set, clear: () => set("") };
}
