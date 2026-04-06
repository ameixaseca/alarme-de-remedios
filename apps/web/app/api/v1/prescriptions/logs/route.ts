import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized } from "@/lib/api-helpers";
import { listPrescriptionLogs } from "@/services/prescription.service";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();

  const { searchParams } = req.nextUrl;
  const patientId = searchParams.get("patient_id") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const result = await listPrescriptionLogs(user.userId, { patientId, limit, offset });
  return NextResponse.json(result);
}
