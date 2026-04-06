import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { createAdHocApplication } from "@/services/application.service";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const body = await req.json();
    const { patient_id, medication_id, dose_applied, notes } = body;
    if (!patient_id || !medication_id || dose_applied == null) {
      return badRequest("patient_id, medication_id and dose_applied are required");
    }
    const result = await createAdHocApplication(user.userId, {
      patientId:    patient_id,
      medicationId: medication_id,
      doseApplied:  Number(dose_applied),
      notes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
