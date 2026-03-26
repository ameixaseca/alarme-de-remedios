import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { listPrescriptions, createPrescription } from "@/services/prescription.service";
import { PrescriptionStatus } from "@prisma/client";

const createSchema = z.object({
  patient_id: z.string().uuid(),
  medication_id: z.string().uuid(),
  dose_quantity: z.number().positive(),
  dose_fraction: z.string().optional(),
  dose_unit: z.string().min(1),
  frequency_hours: z.number().positive(),
  duration_days: z.number().int().positive().optional(),
  start_date: z.string().optional(),
  schedule_times: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const patientId = req.nextUrl.searchParams.get("patient_id") ?? undefined;
  const statusParam = req.nextUrl.searchParams.get("status") as PrescriptionStatus | null;
  const prescriptions = await listPrescriptions(user.userId, patientId, statusParam ?? undefined);
  return NextResponse.json({ prescriptions });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const body = createSchema.parse(await req.json());
    const prescription = await createPrescription(user.userId, {
      patientId: body.patient_id,
      medicationId: body.medication_id,
      doseQuantity: body.dose_quantity,
      doseFraction: body.dose_fraction,
      doseUnit: body.dose_unit,
      frequencyHours: body.frequency_hours,
      durationDays: body.duration_days,
      startDate: body.start_date,
      scheduleTimes: body.schedule_times,
    });
    return NextResponse.json(prescription, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}
