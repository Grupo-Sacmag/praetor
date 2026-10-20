"use client";

import { useRef, useState } from "react";
import { classifyFile, type FileCategory } from "@/lib/config";

type ClassifiedItem = {
  file: File;
  name: string;
  size: number;
  tipo: FileCategory;
};

export default function TarifasIndicesUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ClassifiedItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"tarifas" | "indices">("tarifas");

  function processFiles(fileList: FileList | File[]) {
    const list = Array.from(fileList);
    const classified: ClassifiedItem[] = list.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      tipo: classifyFile(f.name),
    }));
    setItems(classified);
    setResult(null);

    // Seleccionar la pestaña con más archivos
    const numTarifas = classified.filter((i) => i.tipo === "tarifa").length;
    const numIndices = classified.filter((i) => i.tipo === "indice").length;
    if (numIndices > numTarifas) setActiveTab("indices");
    else setActiveTab("tarifas");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }

  // Soporte para Drag & Drop (tanto archivos sueltos como carpetas)
  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);

    const droppedFiles: File[] = [];
    const itemsList = e.dataTransfer.items;

    if (itemsList && itemsList.length > 0) {
      const queue: FileSystemEntry[] = [];
      for (let i = 0; i < itemsList.length; i++) {
        const entry = itemsList[i].webkitGetAsEntry?.();
        if (entry) queue.push(entry);
        else {
          const file = itemsList[i].getAsFile();
          if (file) droppedFiles.push(file);
        }
      }

      async function readEntry(entry: FileSystemEntry): Promise<void> {
        if (entry.isFile) {
          return new Promise((resolve) => {
            (entry as FileSystemFileEntry).file((f) => {
              droppedFiles.push(f);
              resolve();
            }, () => resolve());
          });
        } else if (entry.isDirectory) {
          const reader = (entry as FileSystemDirectoryEntry).createReader();
          return new Promise((resolve) => {
            reader.readEntries(async (entries) => {
              for (const child of entries) {
                await readEntry(child);
              }
              resolve();
            }, () => resolve());
          });
        }
      }

      for (const entry of queue) {
        await readEntry(entry);
      }
    } else if (e.dataTransfer.files) {
      droppedFiles.push(...Array.from(e.dataTransfer.files));
    }

    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  const tarifas = items.filter((i) => i.tipo === "tarifa");
  const indices = items.filter((i) => i.tipo === "indice");
  const desconocidos = items.filter((i) => i.tipo === "desconocido");

  function handleUpload() {
    if (items.length === 0) return;
    setBusy(true);
    setPct(0);
    setResult(null);

    const fd = new FormData();
    items.forEach((item) => {
      fd.append("files", item.file);
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/tarifa");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setPct(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* no json */ }
      if (xhr.status === 401) { window.location.href = "/login"; return; }
      setResult(data ?? { ok: false, message: `Error del servidor (${xhr.status}).` });
      if (data?.ok) {
        setItems([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (folderInputRef.current) folderInputRef.current.value = "";
        window.dispatchEvent(new Event("portal:refresh"));
      }
      setBusy(false);
    };
    xhr.onerror = () => {
      setResult({ ok: false, message: "No se pudo conectar con el servidor." });
      setBusy(false);
    };
    xhr.send(fd);
  }

  return (
    <div className="upload-container">
      {/* Botones de selección y Zona Drag & Drop */}
      <div
        className={`dropzone ${dragOver ? "dragover" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="drop-actions">
          <button
            type="button"
            className="btn-select"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            📄 Elegir archivos
          </button>
          <span className="or-text">o</span>
          <button
            type="button"
            className="btn-select"
            onClick={() => folderInputRef.current?.click()}
            disabled={busy}
          >
            📁 Elegir carpeta completa
          </button>
        </div>
        <p className="drop-hint">O arrastra y suelta aquí archivos o una carpeta completa</p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory es estándar para subir carpetas
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* Visualizador previo de archivos detectados */}
      {items.length > 0 && (
        <div className="preview-box">
          <div className="preview-header">
            <h4>Archivos listos para subir ({items.length})</h4>
            <button type="button" className="btn-clear" onClick={() => setItems([])} disabled={busy}>
              Quitar todos
            </button>
          </div>

          <div className="preview-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === "tarifas" ? "active" : ""}`}
              onClick={() => setActiveTab("tarifas")}
            >
              Tarifas ({tarifas.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "indices" ? "active" : ""}`}
              onClick={() => setActiveTab("indices")}
            >
              Índices ({indices.length})
            </button>
            {desconocidos.length > 0 && (
              <span className="tab-warning">⚠️ {desconocidos.length} no reconocidos</span>
            )}
          </div>

          <div className="preview-list">
            {(activeTab === "tarifas" ? tarifas : indices).length === 0 ? (
              <p className="empty-preview">No hay archivos clasificados como {activeTab} en la selección.</p>
            ) : (
              <ul>
                {(activeTab === "tarifas" ? tarifas : indices).map((item, idx) => (
                  <li key={idx}>
                    <span className="file-name">{item.name}</span>
                    <span className="file-size">{formatSize(item.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="btn-upload-all"
            onClick={handleUpload}
            disabled={busy || (tarifas.length === 0 && indices.length === 0)}
          >
            {busy ? `Subiendo a servidor… ${pct}%` : `Guardar en servidor físico (${tarifas.length + indices.length} archivos)`}
          </button>
        </div>
      )}

      {busy && (
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
      )}

      {result && (
        <p className={`status ${result.ok ? "ok" : "err"}`} role="status">
          {result.message}
        </p>
      )}
    </div>
  );
}
