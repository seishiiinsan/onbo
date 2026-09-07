import { NextResponse, type NextRequest } from "next/server";
import { consumeLoginToken, sessionCookie } from "@/lib/auth";

/**
 * Consommation du lien magique.
 *
 * Route Handler et pas page : Next n'autorise l'ecriture de cookies que
 * depuis un Route Handler ou une Server Action.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const session = token ? await consumeLoginToken(token) : null;

  // En standalone, nextUrl.origin vaut l'adresse d'ecoute (0.0.0.0) : on prend
  // l'URL publique configuree, sinon l'en-tete Host de la requete.
  const host = request.headers.get("host");
  const base =
    process.env.APP_URL ?? (host ? `http://${host}` : request.nextUrl.origin);

  if (!session) {
    return NextResponse.redirect(new URL("/login?error=link", base));
  }

  // Le cookie est pose sur cette reponse : une mutation via cookies() serait
  // perdue sur une redirection.
  const response = NextResponse.redirect(new URL("/app", base));
  response.cookies.set(sessionCookie(session.token, session.expiresAt));
  return response;
}
