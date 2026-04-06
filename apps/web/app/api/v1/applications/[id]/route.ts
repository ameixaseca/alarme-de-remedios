import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { getApplication, updateApplication, deleteApplication } from "@/services/application.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const application = await getApplication(id, user.userId);
    return NextResponse.json(application);
  } catch (err: any) {
    return badRequest(err.message);
  }
}

const updateSchema = z.object({
  applied_at: z.string().optional(),
  dose_applied: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const application = await updateApplication(id, user.userId, {
      appliedAt: body.applied_at,
      doseApplied: body.dose_applied,
      notes: body.notes,
    });
    return NextResponse.json(application);
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
    await deleteApplication(id, user.userId);
    return NextResponse.json({ message: "Application deleted" });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
