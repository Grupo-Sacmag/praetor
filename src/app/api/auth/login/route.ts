import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { getDb } from "@/lib/mongo";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

// Límite simple en memoria: 5 intentos fallidos por IP cada 15 min.
const attempts = new Map<string, { n: number; until: number }>();
const DUMMY = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5pK0n0mHqg0s9bYlQqkXv3Xf4oGx8yS";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rec = attempts.get(ip);
  if (rec && rec.n >= 5 && rec.until > Date.now()) {
    return NextResponse.json({ ok: false, message: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  if (!username || !password) {
    return NextResponse.json({ ok: false, message: "Captura usuario y contraseña." }, { status: 400 });
  }

  const db = await getDb();
  const admin = await db.collection(env.adminsCol).findOne<{ username: string; passwordHash: string }>({ username });
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY);

  if (!admin || !valid) {
    attempts.set(ip, { n: (rec?.n ?? 0) + 1, until: Date.now() + 15 * 60_000 });
    return NextResponse.json({ ok: false, message: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  attempts.delete(ip);
  await createSession(admin.username);
  return NextResponse.json({ ok: true });
}
