"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/session";
import { markAllRead, markRead } from "@/server/services/notifications";

export async function markReadAction(id: string) {
  const u = await getCurrentUser();
  if (!u) return;
  await markRead(u.id, String(id));
  revalidatePath("/", "layout");
}

export async function markAllReadAction() {
  const u = await getCurrentUser();
  if (!u) return;
  await markAllRead(u.id);
  revalidatePath("/", "layout");
}
