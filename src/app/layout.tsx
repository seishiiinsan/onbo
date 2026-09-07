import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onbo",
  description: "Portail d'onboarding client pour agences web",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
