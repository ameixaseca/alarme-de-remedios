import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtPayload } from "@/lib/auth";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function registerUser(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already in use");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  const payload: JwtPayload = { userId: user.id, email: user.email };
  return {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials");

  const payload: JwtPayload = { userId: user.id, email: user.email };
  return {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error("User not found");

  const newPayload: JwtPayload = { userId: user.id, email: user.email };
  return {
    accessToken: signAccessToken(newPayload),
    refreshToken: signRefreshToken(newPayload),
  };
}
