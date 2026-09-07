import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const title = "Onbo — la collecte client en un seul lien";
const description =
  "Le portail d'onboarding des agences web : assets, accès et contenus réunis, relances automatiques, coffre d'accès chiffré.";

export const metadata: Metadata = {
  title: { default: title, template: "%s · Onbo" },
  description,
  applicationName: "Onbo",
  openGraph: {
    title,
    description,
    type: "website",
    locale: "fr_FR",
    siteName: "Onbo",
  },
  twitter: { card: "summary", title, description },
};

/**
 * Applique le theme avant le premier rendu : sans ce script, une preference
 * sombre provoquerait un flash clair au chargement.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem('onbo-theme');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
