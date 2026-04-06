import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { removeMember } from "@/services/group.service";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id, userId } = await params;
    await removeMember(id, user.userId, userId);
    return NextResponse.json({ message: "Member removed" });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
