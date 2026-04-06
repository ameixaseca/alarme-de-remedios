import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized } from "@/lib/api-helpers";
import { listApplicationLog } from "@/services/application.service";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();

  const p = req.nextUrl.searchParams;
  const take = Math.min(parseInt(p.get("limit") ?? "50"), 100);
  const skip = parseInt(p.get("offset") ?? "0");

  const result = await listApplicationLog(user.userId, {
    patientId:    p.get("patient_id")  ?? undefined,
    medicationId: p.get("medication_id") ?? undefined,
    from:         p.get("from")        ?? undefined,
    to:           p.get("to")          ?? undefined,
    groupId:      p.get("group_id")    ?? undefined,
    take,
    skip,
  });

  return NextResponse.json(result);
}
