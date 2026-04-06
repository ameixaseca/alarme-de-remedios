import { NextResponse } from "next/server";

// Logout is handled client-side by discarding tokens.
// If refresh token storage is added server-side in the future, invalidate here.
export async function POST() {
  return NextResponse.json({ message: "Logged out successfully" });
}
