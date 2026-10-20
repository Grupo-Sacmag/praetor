import path from "node:path";
import { Long } from "mongodb";
import { NextResponse } from "next/server";
import { CONTENT_TYPE, classifyFile, env } from "@/lib/config";
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

  // Validar y clasificar cada archivo
  const classifiedFiles: { file: File; name: string; tipo: "tarifa" | "indice" }[] = [];

  for (const f of files) {
    const name = path.basename(f.name);
    if (!SAFE_NAME.test(name)) {
      return NextResponse.json(
        { ok: false, message: `"${f.name}" tiene caracteres no permitidos en su nombre.` },
        { status: 400 },
      );
    }
    const tipo = classifyFile(name);
    if (tipo === "desconocido") {
      return NextResponse.json(
        { ok: false, message: `"${f.name}" no fue reconocido como Tarifa ni como Índice válido.` },
        { status: 400 },
      );
    }
    classifiedFiles.push({ file: f, name, tipo });
  }

  const col = (await getDb()).collection(env.filesCol);
  const savedTarifas: string[] = [];
  const savedIndices: string[] = [];

  for (const item of classifiedFiles) {
    const { file, name, tipo } = item;
    // Directorio físico interno del contenedor
    const targetDir = tipo === "tarifa" ? env.tarifasDir : env.indicesDir;
    // Ruta en el host que se guarda en la BD
    const hostDir = tipo === "tarifa" ? env.hostTarifasDir : env.hostIndicesDir;
    const hostFilePath = `${hostDir.replace(/\/+$/, "")}/${name}`;

    // 1. Guardar físicamente en disco
    await saveFileAtomic(file, targetDir, name);

    // 2. Registrar/actualizar en MongoDB (files_metadata)
    await col.updateOne(
      { fileName: name },
      {
        $set: {
          filePath: hostFilePath,
          fileSize: Long.fromNumber(file.size),
          contentType: CONTENT_TYPE,
          userId: user,
          uploadTime: new Date(),
          tipo,
        },
      },
      { upsert: true },
    );

    if (tipo === "tarifa") savedTarifas.push(name);
    else savedIndices.push(name);
  }

  const parts: string[] = [];
  if (savedTarifas.length > 0) parts.push(`${savedTarifas.length} tarifa(s)`);
  if (savedIndices.length > 0) parts.push(`${savedIndices.length} índice(s)`);

  return NextResponse.json({
    ok: true,
    message: `Guardado en servidor físico: ${parts.join(" y ")} (${savedTarifas.concat(savedIndices).join(", ")}).`,
    tarifas: savedTarifas,
    indices: savedIndices,
  });
}
