import type { NextConfig } from "next";

/**
 * En-tetes de securite (issue #30).
 *
 * HSTS est pose par le proxy comme par l'application : si l'un des deux
 * saute, l'autre tient. La CSP autorise les images distantes (logos d'agence
 * heberges ailleurs) et les styles en ligne, dont Next a besoin.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // standalone sert au conteneur Docker ; sur Vercel, la plateforme fait sa
  // propre mise en paquet et le mode standalone n'a pas lieu d'etre.
  output: process.env.VERCEL ? undefined : "standalone",
  poweredByHeader: false,
  // Reduit le JS envoye : seules les icones reellement utilisees partent.
  experimental: { optimizePackageImports: ["lucide-react"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
