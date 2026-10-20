import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import RefreshListener from "@/components/RefreshListener";
import TarifasIndicesUpload from "@/components/TarifasIndicesUpload";
import TarifasIndicesViewer, { type StoredFile } from "@/components/TarifasIndicesViewer";
import UploadForm from "@/components/UploadForm";
import { APP_NAMES, APPS, classifyFile, env } from "@/lib/config";
import { getDb } from "@/lib/mongo";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const fmt = (d?: Date) =>
  d ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(d) : "—";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  const db = await getDb();
  const rows = await db.collection(env.versionsCol).find({}, { projection: { Nombre: 1, Version: 1, exe: 1, UltModif: 1 } }).toArray();
  const byName = new Map(rows.map((r) => [r.Nombre as string, r]));

  // Obtener archivos de tarifas e índices para el visualizador
  const fileDocs = await db.collection(env.filesCol).find({}).sort({ uploadTime: -1 }).toArray();
  const initialFiles: StoredFile[] = fileDocs.map((d) => ({
    fileName: d.fileName as string,
    filePath: (d.filePath as string) ?? "",
    fileSize: typeof d.fileSize?.toNumber === "function" ? d.fileSize.toNumber() : Number(d.fileSize ?? 0),
    contentType: d.contentType as string,
    userId: d.userId as string,
    uploadTime: d.uploadTime ? new Date(d.uploadTime).toISOString() : undefined,
    tipo: (d.tipo as "tarifa" | "indice") || classifyFile(d.fileName as string),
  }));

  return (
    <main className="shell">
      <RefreshListener />
      <div className="topbar">
        <h1>Publicar actualizaciones</h1>
        <div className="who"><span>{user}</span><LogoutButton /></div>
      </div>

      <div className="grid">
        <section className="panel">
          <header>
            <h2>Aplicación (.exe)</h2>
            <p>El archivo se guarda en la carpeta correspondiente dentro de <code>archivosACT/aplicaciones</code>.</p>
          </header>
          <UploadForm action="/api/upload/app" submitLabel="Publicar versión">
            <label>Aplicación
              <select name="app" required defaultValue="">
                <option value="" disabled>Elige una aplicación</option>
                {APP_NAMES.map((n) => <option key={n} value={n}>{n} ({APPS[n].exe})</option>)}
              </select>
            </label>
            <label>Número de versión<small>Formato 1.2.5, sin la letra v</small>
              <input type="text" name="version" inputMode="numeric" placeholder="1.2.5" pattern="v?\d+\.\d+\.\d+" required />
            </label>
            <label>Ejecutable<input type="file" name="file" accept=".exe" required /></label>
            <label className="check"><input type="checkbox" name="force" /> Permitir versión igual o menor a la actual</label>
          </UploadForm>
        </section>

        <section className="panel">
          <header>
            <h2>Tarifas e índices</h2>
            <p>
              Sube por archivos sueltos o por carpeta completa. El sistema clasifica automáticamente cada archivo y lo guarda físicamente en <code>archivosACT/tarifas</code> o <code>archivosACT/INDICES</code>.
            </p>
          </header>
          <TarifasIndicesUpload />
        </section>
      </div>

      {/* Visualizador de Tarifas e Índices en Servidor */}
      <TarifasIndicesViewer initialFiles={initialFiles} />

      <section className="panel versions">
        <header><h2>Versiones publicadas de aplicaciones</h2></header>
        <table>
          <thead><tr><th>Aplicación</th><th>Versión</th><th>Ejecutable</th><th>Última modificación</th></tr></thead>
          <tbody>
            {APP_NAMES.map((n) => {
              const r = byName.get(n);
              return (
                <tr key={n}>
                  <td>{n}</td>
                  <td className="mono">{r?.Version ?? "—"}</td>
                  <td className="mono">{r?.exe ?? APPS[n].exe}</td>
                  <td>{fmt(r?.UltModif)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
