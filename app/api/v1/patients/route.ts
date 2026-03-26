import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";
import { listPatients, createPatient } from "@/services/patient.service";

const createSchema = z.object({
  group_id: z.string().uuid(),
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  photo_url: z.string().url().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const groupId = req.nextUrl.searchParams.get("group_id") ?? undefined;
  const patients = await listPatients(user.userId, groupId);
  return NextResponse.json({ patients });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  try {
    const body = createSchema.parse(await req.json());
    const patient = await createPatient(user.userId, body.group_id, {
      name: body.name,
      species: body.species,
      breed: body.breed,
      birthDate: body.birth_date,
      gender: body.gender,
      weightKg: body.weight_kg,
      photoUrl: body.photo_url,
      notes: body.notes,
    });
    return NextResponse.json(patient, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return badRequest(JSON.stringify(err.issues));
    return badRequest(err.message);
  }
}
