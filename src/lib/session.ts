import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./config";

const COOKIE = "actualitodo_admin";
const MAX_AGE = 60 * 60 * 8; // 8 horas

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 24) throw new Error("SESSION_SECRET no definido o demasiado corto");
  return new TextEncoder().encode(s);
}

export async function createSession(username: string) {
  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: env.cookieSecure,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Devuelve el usuario logueado o null. */
export async function getSession(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
