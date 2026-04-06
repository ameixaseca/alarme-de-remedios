import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { markNotificationRead } from "@/services/notification.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    await markNotificationRead(user.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
