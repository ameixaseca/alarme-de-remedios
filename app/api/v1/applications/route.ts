import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { listApplications, createApplication } from "@/services/application.service";
import { prisma } from "@/lib/prisma";
import { notifyGroupMembers } from "@/services/notification.service";

const createSchema = z.object({
  prescription_id: z.string().uuid(),
  applied_at: z.string(),
  scheduled_at: z.string().optional(),
  dose_applied: z.number().positive(),
  notes: z.string().optional(),
  offline_sync: z.boolean().optional(),
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

    if (body.offline_sync) {
      // Application was queued offline and is now being synced — notify group members
      const prescription = await prisma.prescription.findUnique({
        where: { id: body.prescription_id },
        include: {
          patient:    { select: { id: true, name: true, groupId: true } },
          medication: { select: { id: true, name: true } },
        },
      });
      if (prescription) {
        notifyGroupMembers(
          prescription.patient.groupId,
          "OFFLINE_APPLICATION",
          "Aplicação offline sincronizada",
          `${prescription.medication.name} para ${prescription.patient.name} foi registrada offline e sincronizada`,
          { data: { prescriptionId: prescription.id, patientId: prescription.patient.id } }
        ).catch(() => {});
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}
