import path from "node:path";
import { NextResponse } from "next/server";
import { APPS, APP_NAMES, VERSION_RE, env, type AppName } from "@/lib/config";
import { compareVersions, saveFileAtomic } from "@/lib/files";
import { getDb } from "@/lib/mongo";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 600;

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

export async function POST(req: Request) {
  if (!(await getSession())) return fail("Sesión expirada. Vuelve a iniciar sesión.", 401);

  const form = await req.formData();
  const app = String(form.get("app") ?? "") as AppName;
  const version = String(form.get("version") ?? "").trim().replace(/^v/i, "");
  const force = form.get("force") === "on";
  const file = form.get("file");

  if (!APP_NAMES.includes(app)) return fail("Aplicación no válida.");
  if (!VERSION_RE.test(version)) return fail("La versión debe tener el formato 1.2.5.");
  if (!(file instanceof File) || file.size === 0) return fail("Adjunta el ejecutable.");
  if (!file.name.toLowerCase().endsWith(".exe")) return fail("El archivo debe ser un .exe.");

  const { folder, exe } = APPS[app];
  const db = await getDb();
  const versions = db.collection(env.versionsCol);

  const current = await versions.findOne<{ Version: string }>({ Nombre: app });
  if (current && !force && compareVersions(version, current.Version) <= 0) {
    return fail(`La versión actual es ${current.Version}. Sube una mayor o marca "Permitir versión igual o menor".`, 409);
  }

  // 1) Archivo físico (siempre con el nombre exacto del ejecutable).
  await saveFileAtomic(file, path.join(env.appsDir, folder), exe);

  // 2) Registro que alimenta /api/versions/{app}.
  await versions.updateOne(
    { Nombre: app },
    {
      $set: { Version: version, folder, exe, UltModif: new Date() },
      $setOnInsert: { __v: 0 },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true, message: `${app} actualizado a la versión ${version} (${exe}).` });
}
