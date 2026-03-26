import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { getGroupById, updateGroup } from "@/services/group.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const group = await getGroupById(id, user.userId);
    return NextResponse.json(group);
  } catch (err: any) {
    return badRequest(err.message);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  photo_url: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const group = await updateGroup(id, user.userId, { name: body.name, photoUrl: body.photo_url });
    return NextResponse.json(group);
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}
