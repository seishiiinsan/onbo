/** Contrat commun a tous les fournisseurs d'email (issue #29). */
export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Categorie fonctionnelle, utile pour le journal et les statistiques. */
  category?: EmailCategory;
  /** Rattachements facultatifs, pour retrouver un envoi depuis un projet. */
  agencyId?: string | null;
  projectId?: string | null;
  replyTo?: string | null;
};

export type EmailCategory =
  | "LOGIN"
  | "PORTAL"
  | "REMINDER"
  | "NOTIFICATION"
  | "OTHER";

export type SendResult = { providerId?: string | null };

export interface EmailProvider {
  readonly name: string;
  send(mail: Mail): Promise<SendResult>;
}

export function fromAddress() {
  return process.env.EMAIL_FROM ?? "Onbo <onboarding@localhost>";
}

/** Decoupe "Nom <adresse@exemple.fr>" en ses deux parties. */
export function parseAddress(value: string) {
  const match = value.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (!match) return { name: null as string | null, email: value.trim() };
  return { name: match[1] || null, email: match[2] };
}
