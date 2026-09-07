/**
 * Adaptateur d'envoi d'email.
 *
 * En dev (et tant qu'aucun fournisseur n'est branche), les messages partent
 * dans les logs : le lien magique est directement cliquable depuis la console.
 * Voir l'issue #16 pour le branchement d'un vrai fournisseur EU.
 */
export type Mail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(mail: Mail): Promise<void> {
  console.log(
    [
      "",
      "──────── EMAIL ────────",
      `À       : ${mail.to}`,
      `Sujet   : ${mail.subject}`,
      "",
      mail.text,
      "───────────────────────",
      "",
    ].join("\n"),
  );
}
