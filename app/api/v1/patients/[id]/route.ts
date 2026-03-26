import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { getPatient, updatePatient, archivePatient } from "@/services/patient.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const patient = await getPatient(id, user.userId);
    return NextResponse.json(patient);
  } catch (err: any) {
    return badRequest(err.message);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  species: z.string().optional(),
  breed: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  photo_url: z.string().url().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const patient = await updatePatient(id, user.userId, {
      name: body.name,
      species: body.species,
      breed: body.breed,
      birthDate: body.birth_date,
      gender: body.gender,
      weightKg: body.weight_kg,
      photoUrl: body.photo_url,
      notes: body.notes,
    });
    return NextResponse.json(patient);
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
    await archivePatient(id, user.userId);
    return NextResponse.json({ message: "Patient archived" });
  } catch (err: any) {
    return badRequest(err.message);
  }
}
