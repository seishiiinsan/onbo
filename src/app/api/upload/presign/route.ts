import { NextResponse, type NextRequest } from "next/server";
import { clearUpload } from "@/lib/upload-guard";
import { presignUpload } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * URL presignee pour un depot direct vers le stockage objet (issue #32).
 *
 * Repond 501 quand seul le volume disque est configure : l'appelant retombe
 * alors sur /api/upload, sans rien casser.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    stepId?: string;
    token?: string;
    mimeType?: string;
    size?: number;
  };

  const clearance = await clearUpload({
    stepId: String(body.stepId ?? ""),
    token: String(body.token ?? ""),
    size: Number(body.size ?? 0),
    mimeType: String(body.mimeType ?? ""),
  });
  if (!clearance.ok) {
    return NextResponse.json(
      { error: clearance.error },
      { status: clearance.status },
    );
  }

  const presigned = presignUpload(String(body.mimeType));
  if (!presigned) {
    return NextResponse.json(
      { error: "Stockage objet non configuré." },
      { status: 501 },
    );
  }

  return NextResponse.json(presigned);
}
