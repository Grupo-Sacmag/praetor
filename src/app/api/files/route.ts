import { NextResponse } from "next/server";
import { classifyFile, env, getHostFilePath } from "@/lib/config";
import { getDb } from "@/lib/mongo";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection(env.filesCol)
      .find({})
      .sort({ uploadTime: -1 })
      .toArray();

    const files = docs.map((d) => {
      // Si el documento ya tiene 'tipo' registrado usarlo, sino clasificarlo en tiempo de ejecución
      const tipo = d.tipo || classifyFile(d.fileName as string);
      return {
        fileName: d.fileName,
        filePath: getHostFilePath(d.fileName as string, tipo),
        fileSize: typeof d.fileSize?.toNumber === "function" ? d.fileSize.toNumber() : Number(d.fileSize ?? 0),
        contentType: d.contentType,
        userId: d.userId,
        uploadTime: d.uploadTime ? new Date(d.uploadTime).toISOString() : null,
        tipo,
      };
    });

    return NextResponse.json({ ok: true, files });
  } catch (error) {
    return NextResponse.json({ ok: false, message: String(error) }, { status: 500 });
  }
}
