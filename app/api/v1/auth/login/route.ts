import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginUser } from "@/services/auth.service";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await loginUser(body.email, body.password);
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    if (err.message === "Invalid credentials")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
