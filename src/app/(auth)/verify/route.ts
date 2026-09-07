import { NextResponse, type NextRequest } from "next/server";
import { consumeLoginToken } from "@/lib/auth";

/**
 * Consommation du lien magique.
 *
 * Route Handler et pas page : Next n'autorise l'ecriture de cookies que
 * depuis un Route Handler ou une Server Action.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const session = token ? await consumeLoginToken(token) : null;

  const target = session ? "/app" : "/login?error=link";
  return NextResponse.redirect(new URL(target, request.nextUrl.origin));
}
