"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

/** Centre de notifications : etat lu / non lu, par personne (issue #39). */
export async function markNotificationRead(id: string) {
  const ctx = await requireTenant();
  await prisma.notification.updateMany({
    where: { id, userId: ctx.userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/app");
}

export async function markAllNotificationsRead() {
  const ctx = await requireTenant();
  await prisma.notification.updateMany({
    where: { userId: ctx.userId, agencyId: ctx.agencyId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/app");
}
