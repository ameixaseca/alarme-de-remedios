import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { listMedications, createMedication } from "@/services/medication.service";
import { ApplicationMethod } from "@prisma/client";

const createSchema = z.object({
  group_id: z.string().uuid(),
  name: z.string().min(1),
  manufacturer: z.string().optional(),
  active_ingredient: z.string().optional(),
  application_method: z.nativeEnum(ApplicationMethod).optional(),
  dose_unit: z.string().min(1),
  stock_quantity: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const groupId = req.nextUrl.searchParams.get("group_id") ?? undefined;
  const medications = await listMedications(user.userId, groupId);
  return NextResponse.json({ medications });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const body = createSchema.parse(await req.json());
    const medication = await createMedication(user.userId, body.group_id, {
      name: body.name,
      manufacturer: body.manufacturer,
      activeIngredient: body.active_ingredient,
      applicationMethod: body.application_method,
      doseUnit: body.dose_unit,
      stockQuantity: body.stock_quantity,
    });
    return NextResponse.json(medication, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}
