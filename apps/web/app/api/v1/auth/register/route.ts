import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/services/auth.service";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await registerUser(body.name, body.email, body.password);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
