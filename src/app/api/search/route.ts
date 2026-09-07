import { NextResponse, type NextRequest } from "next/server";
import { projectScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recherche globale (item 3) : projets, contacts, etapes. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  const ctx = await requireTenant();
  const scope = projectScope(ctx);

  const [projects, steps, clients] = await Promise.all([
    prisma.project.findMany({
      where: { ...scope, name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.onboardingStep.findMany({
      where: {
        project: scope,
        title: { contains: query, mode: "insensitive" },
      },
      select: { id: true, title: true, project: { select: { id: true, name: true } } },
      take: 5,
    }),
    prisma.clientProject.findMany({
      where: {
        project: scope,
        client: {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
            { company: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      select: {
        client: { select: { email: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    results: [
      ...projects.map((project) => ({
        kind: "Projet",
        label: project.name,
        hint: "",
        href: `/app/projects/${project.id}`,
      })),
      ...steps.map((step) => ({
        kind: "Étape",
        label: step.title,
        hint: step.project.name,
        href: `/app/projects/${step.project.id}`,
      })),
      ...clients.map((link) => ({
        kind: "Contact",
        label: link.client.name ?? link.client.email,
        hint: link.project.name,
        href: `/app/projects/${link.project.id}`,
      })),
    ],
  });
}
