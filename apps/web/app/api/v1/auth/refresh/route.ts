import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { refreshTokens } from "@/services/auth.service";

const schema = z.object({ refreshToken: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = schema.parse(await req.json());
    const result = await refreshTokens(refreshToken);
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }
}
