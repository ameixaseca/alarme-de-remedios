import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { getPendingMedications } from "@/services/dashboard.service";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const tzOffset = parseInt(req.nextUrl.searchParams.get("tz_offset") ?? "0", 10);
    const groupId  = req.nextUrl.searchParams.get("group_id") ?? undefined;
    const result = await getPendingMedications(user.userId, isNaN(tzOffset) ? 0 : tzOffset, groupId);
    return NextResponse.json(result);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
