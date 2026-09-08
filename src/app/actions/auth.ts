"use server";

import { redirect } from "next/navigation";
import { createLoginToken, destroySession } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { loginLinkEmail } from "@/lib/email/templates";

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
