import { enqueueMail } from "@/lib/email/queue";
import type { Mail } from "@/lib/email/types";

/**
 * Point d'entree unique pour l'envoi d'email (issue #29).
 *
 * Les appelants ne connaissent que sendMail() : le choix du fournisseur, les
 * gabarits, la file et les rebonds vivent dans src/lib/email.
 */
export type { Mail } from "@/lib/email/types";

export async function sendMail(mail: Mail): Promise<void> {
  await enqueueMail(mail);
}
