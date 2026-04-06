import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, JwtPayload } from "./auth";

export type AuthedRequest = NextRequest & { user: JwtPayload };

type RouteHandler = (req: AuthedRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
      return handler(req, ctx);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
  };
}

export function extractUser(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return verifyAccessToken(authHeader.slice(7));
  } catch {
    return null;
  }
}
