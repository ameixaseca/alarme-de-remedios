import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { savePushSubscription, removePushSubscription } from "@/services/notification.service";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string(),
  auth:     z.string(),
});

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const body = subscribeSchema.parse(await req.json());
    await savePushSubscription(user.userId, body);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { endpoint } = await req.json();
    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
