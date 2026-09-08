"use server";

import { redirect } from "next/navigation";
import { createLoginToken, destroySession } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { loginLinkEmail } from "@/lib/email/templates";
import { anonymize, callerIp, guard, RULES } from "@/lib/rate-limit";

const LOGIN_LINK_TTL_MIN = 15;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginState = { error?: string; sent?: boolean };

export async function requestLoginLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();

  if (!EMAIL_RE.test(email)) return { error: "Adresse email invalide." };

  // Limitation par IP puis par adresse visee (issue #34). Le message reste
  // le meme dans les deux cas : rien ne dit si l'adresse existe.
  const ip = await callerIp();
  const tooMany =
    !(await guard({
      kind: "LOGIN_IP",
      bucket: `login:ip:${anonymize(ip)}`,
      rule: RULES.loginByIp,
      ip: anonymize(ip),
      path: "/login",
    })) ||
    !(await guard({
      kind: "LOGIN_EMAIL",
      bucket: `login:email:${email}`,
      rule: RULES.loginByEmail,
      ip: anonymize(ip),
      email,
      path: "/login",
    }));

  if (tooMany) {
    return {
      error: "Trop de demandes de connexion. Réessayez dans quelques minutes.",
    };
  }

  const token = await createLoginToken(email);
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${base}/verify?token=${token}`;

  const template = loginLinkEmail(link, LOGIN_LINK_TTL_MIN);
  await sendMail({ to: email, ...template });

  return { sent: true };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
