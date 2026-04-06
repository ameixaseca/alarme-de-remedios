import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized } from "@/lib/api-helpers";
import { getNotifications, markAllNotificationsRead } from "@/services/notification.service";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const result = await getNotifications(user.userId);
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  await markAllNotificationsRead(user.userId);
  return NextResponse.json({ ok: true });
}
