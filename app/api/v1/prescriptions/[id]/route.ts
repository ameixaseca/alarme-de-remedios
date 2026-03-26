import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { getPrescription, updatePrescription, deletePrescription } from "@/services/prescription.service";
import { PrescriptionStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const prescription = await getPrescription(id, user.userId);
    return NextResponse.json(prescription);
  } catch (err: any) {
    return badRequest(err.message);
  }
}

const updateSchema = z.object({
  schedule_times: z.array(z.string()).optional(),
  status: z.nativeEnum(PrescriptionStatus).optional(),
  dose_quantity: z.number().positive().optional(),
  dose_fraction: z.string().optional(),
  frequency_hours: z.number().positive().optional(),
  duration_days: z.number().int().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const prescription = await updatePrescription(id, user.userId, {
      scheduleTimes: body.schedule_times,
      status: body.status,
      doseQuantity: body.dose_quantity,
      doseFraction: body.dose_fraction,
      frequencyHours: body.frequency_hours,
      durationDays: body.duration_days,
    });
    return NextResponse.json(prescription);
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    await deletePrescription(id, user.userId);
    return NextResponse.json({ message: "Prescription deleted" });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
