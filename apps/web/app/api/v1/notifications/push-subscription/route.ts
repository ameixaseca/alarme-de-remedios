import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { savePushSubscription, saveExpoPushToken, removePushSubscription } from "@/services/notification.service";

const webSubscribeSchema = z.object({
  type: z.literal("web").optional(),
  endpoint: z.string().url(),
  p256dh:   z.string(),
  auth:     z.string(),
});

const expoSubscribeSchema = z.object({
  type: z.literal("expo"),
  token: z.string().min(1),
});

const subscribeSchema = z.discriminatedUnion("type", [
  webSubscribeSchema.required({ type: true }),
  expoSubscribeSchema,
]).or(webSubscribeSchema);

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const body = await req.json();

    // Handle expo type explicitly
    if (body?.type === "expo") {
      const parsed = expoSubscribeSchema.parse(body);
      await saveExpoPushToken(user.userId, parsed.token);
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Default to web push subscription
    const parsed = webSubscribeSchema.parse(body);
    await savePushSubscription(user.userId, parsed);
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
    const body = await req.json();
    if (body?.type === "expo" && body?.token) {
      await removePushSubscription(undefined, body.token);
    } else {
      await removePushSubscription(body.endpoint);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
