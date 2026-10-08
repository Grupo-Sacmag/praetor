import path from "node:path";
import { Long } from "mongodb";
import { NextResponse } from "next/server";
import { ALL_EXT, CONTENT_TYPE, env } from "@/lib/config";
import { saveFileAtomic } from "@/lib/files";
import { getDb } from "@/lib/mongo";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 600;

const SAFE_NAME = /^[\w.\- ()]+$/;

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ ok: false, message: "Sesión expirada. Vuelve a iniciar sesión." }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ ok: false, message: "Adjunta al menos un archivo." }, { status: 400 });

  // Validar todo antes de escribir nada.
  for (const f of files) {
    const name = path.basename(f.name);
    const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
    if (!SAFE_NAME.test(name) || !ALL_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, message: `"${f.name}" no es válido. Extensiones permitidas: ${ALL_EXT.map((e) => "." + e).join(", ")}.` },
        { status: 400 },
      );
    }
  }

  const col = (await getDb()).collection(env.filesCol);
  const saved: string[] = [];

  for (const f of files) {
    const fileName = path.basename(f.name);
    await saveFileAtomic(f, env.tarifasDir, fileName);
    const filePath = path.join(env.tarifasDbPath || env.tarifasDir, fileName);

    await col.updateOne(
      { fileName },
      {
        $set: {
          filePath,
          fileSize: Long.fromNumber(f.size),
          contentType: CONTENT_TYPE,
          userId: user,
          uploadTime: new Date(),
        },
      },
      { upsert: true },
    );
    saved.push(fileName);
  }

  return NextResponse.json({ ok: true, message: `Publicado: ${saved.join(", ")}.` });
}
