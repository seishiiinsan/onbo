/**
 * Analyse antivirus a l'upload (issue #32).
 *
 * Le service d'analyse est externe et optionnel : ANTIVIRUS_URL recoit le
 * binaire en POST et repond `{"infected": bool, "signature": string}`
 * (contrat de clamav-rest et equivalents). Sans service configure, le depot
 * passe : mieux vaut un produit qui fonctionne qu'un blocage silencieux.
 */
export type ScanResult = { clean: boolean; signature?: string | null };

export async function scanBuffer(
  data: Buffer,
  filename: string,
): Promise<ScanResult> {
  const url = process.env.ANTIVIRUS_URL;
  if (!url) return { clean: true };

  try {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(data)]), filename);

    const response = await fetch(url, { method: "POST", body: form });
    if (!response.ok) {
      // Analyse indisponible : on trace et on laisse passer, plutot que de
      // bloquer tous les depots sur une panne de dependance.
      console.warn(`> antivirus indisponible (HTTP ${response.status})`);
      return { clean: true };
    }

    const payload = (await response.json()) as {
      infected?: boolean;
      signature?: string;
    };
    return { clean: !payload.infected, signature: payload.signature ?? null };
  } catch (error) {
    console.warn(`> antivirus injoignable : ${String(error)}`);
    return { clean: true };
  }
}
