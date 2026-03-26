import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { createGroup, getUserGroups } from "@/services/group.service";

const createSchema = z.object({ name: z.string().min(1) });

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const groups = await getUserGroups(user.userId);
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { name } = createSchema.parse(await req.json());
    const group = await createGroup(user.userId, name);
    return NextResponse.json(group, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}
