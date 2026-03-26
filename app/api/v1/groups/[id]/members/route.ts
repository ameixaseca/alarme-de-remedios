import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { getGroupMembers } from "@/services/group.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const members = await getGroupMembers(id, user.userId);
    return NextResponse.json({ members });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
