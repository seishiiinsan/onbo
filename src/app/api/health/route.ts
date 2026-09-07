export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", ts: new Date().toISOString() });
}
