import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { joinGroup } from "@/services/group.service";

const schema = z.object({ invite_code: z.string().length(8) });

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { invite_code } = schema.parse(await req.json());
    const group = await joinGroup(user.userId, invite_code);
    return NextResponse.json(group);
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}
