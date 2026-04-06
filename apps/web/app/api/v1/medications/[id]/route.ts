import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { getMedication, updateMedication, deleteMedication } from "@/services/medication.service";
import { ApplicationMethod } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const medication = await getMedication(id, user.userId);
    return NextResponse.json(medication);
  } catch (err: any) {
    return badRequest(err.message);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  manufacturer: z.string().optional(),
  active_ingredient: z.string().optional(),
  application_method: z.nativeEnum(ApplicationMethod).optional(),
  dose_unit: z.string().optional(),
  stock_quantity: z.number().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const medication = await updateMedication(id, user.userId, {
      name: body.name,
      manufacturer: body.manufacturer,
      activeIngredient: body.active_ingredient,
      applicationMethod: body.application_method,
      doseUnit: body.dose_unit,
      stockQuantity: body.stock_quantity,
    });
    return NextResponse.json(medication);
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
    await deleteMedication(id, user.userId);
    return NextResponse.json({ message: "Medication deleted" });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
