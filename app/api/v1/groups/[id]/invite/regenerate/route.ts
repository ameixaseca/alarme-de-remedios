import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { regenerateInviteCode } from "@/services/group.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const group = await regenerateInviteCode(id, user.userId);
    return NextResponse.json({ invite_code: group.inviteCode });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
