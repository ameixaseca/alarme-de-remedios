import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { getStockDashboard } from "@/services/dashboard.service";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const groupId = req.nextUrl.searchParams.get("group_id") ?? undefined;
    const result = await getStockDashboard(user.userId, groupId);
    return NextResponse.json(result);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
