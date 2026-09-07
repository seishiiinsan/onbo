/**
 * Copie dans le presse-papier, avec repli hors contexte securise (HTTP) et
 * effacement automatique pour les secrets (item 45).
 */
export async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  document.body.removeChild(field);
}

/** Copie un secret et vide le presse-papier apres un delai. */
export async function copyWithExpiry(value: string, delayMs = 30_000) {
  await copyText(value);

  setTimeout(async () => {
    try {
      // On n'efface que si le contenu copie est toujours le notre.
      if (navigator.clipboard && window.isSecureContext) {
        const current = await navigator.clipboard.readText().catch(() => "");
        if (current && current !== value) return;
      }
      await copyText(" ");
    } catch {
      // Presse-papier inaccessible : rien de plus a faire.
    }
  }, delayMs);
}
