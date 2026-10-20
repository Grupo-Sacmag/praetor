"use client";

import { useEffect, useState } from "react";

export type StoredFile = {
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType?: string;
  userId?: string;
  uploadTime?: string;
  tipo?: "tarifa" | "indice";
};

export default function TarifasIndicesViewer({
  initialFiles = [],
}: {
  initialFiles: StoredFile[];
}) {
  const [files, setFiles] = useState<StoredFile[]>(initialFiles);
  const [activeTab, setActiveTab] = useState<"tarifa" | "indice">("tarifa");
  const [search, setSearch] = useState("");

  // Escuchar el evento 'portal:refresh' para actualizar en tiempo real cuando se sube algo
  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch("/api/files");
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files ?? []);
        }
      } catch {
        /* ignore */
      }
    }

    const handler = () => refresh();
    window.addEventListener("portal:refresh", handler);
    return () => window.removeEventListener("portal:refresh", handler);
  }, []);

  function formatSize(bytes?: number) {
    if (!bytes || isNaN(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatDate(d?: string) {
    if (!d) return "—";
    try {
      return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Mexico_City",
      }).format(new Date(d));
    } catch {
      return d;
    }
  }

  const filtered = files.filter((f) => {
    const isTipo = f.tipo === activeTab;
    if (!isTipo) return false;
    if (!search.trim()) return true;
    return f.fileName.toLowerCase().includes(search.toLowerCase());
  });

  const countTarifas = files.filter((f) => f.tipo === "tarifa").length;
  const countIndices = files.filter((f) => f.tipo === "indice").length;

  return (
    <section className="panel files-viewer-panel">
      <header className="viewer-header">
        <div>
          <h2>Visualizador de Tarifas e Índices en Servidor</h2>
          <p className="muted">Archivos almacenados físicamente en el servidor y registrados en la base de datos.</p>
        </div>

        <div className="viewer-controls">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Buscar archivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="viewer-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "tarifa" ? "active" : ""}`}
          onClick={() => setActiveTab("tarifa")}
        >
          📂 Tarifas en Servidor ({countTarifas})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "indice" ? "active" : ""}`}
          onClick={() => setActiveTab("indice")}
        >
          📂 Índices en Servidor ({countIndices})
        </button>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Nombre de Archivo</th>
              <th>Ruta Física Servidor</th>
              <th>Tamaño</th>
              <th>Fecha de Subida</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-row">
                  {search
                    ? `No se encontraron ${activeTab === "tarifa" ? "tarifas" : "índices"} que coincidan con "${search}".`
                    : `No hay ${activeTab === "tarifa" ? "tarifas" : "índices"} registrados actualmente.`}
                </td>
              </tr>
            ) : (
              filtered.map((f, i) => (
                <tr key={i}>
                  <td className="mono fw-600">{f.fileName}</td>
                  <td className="mono muted-text" title={f.filePath}>
                    {f.filePath}
                  </td>
                  <td>{formatSize(f.fileSize)}</td>
                  <td>{formatDate(f.uploadTime)}</td>
                  <td>{f.userId ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
