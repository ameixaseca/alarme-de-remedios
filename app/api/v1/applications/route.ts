import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { listApplications, createApplication } from "@/services/application.service";

const createSchema = z.object({
  prescription_id: z.string().uuid(),
  applied_at: z.string(),
  scheduled_at: z.string().optional(),
  dose_applied: z.number().positive(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const prescriptionId = req.nextUrl.searchParams.get("prescription_id") ?? undefined;
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const applications = await listApplications(user.userId, prescriptionId, date);
  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const body = createSchema.parse(await req.json());
    const result = await createApplication(user.userId, {
      prescriptionId: body.prescription_id,
      appliedAt: body.applied_at,
      scheduledAt: body.scheduled_at,
      doseApplied: body.dose_applied,
      notes: body.notes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}
