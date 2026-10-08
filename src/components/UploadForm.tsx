"use client";

import { useRef, useState } from "react";

type Result = { ok: boolean; message: string } | null;

/** Envía el formulario con XMLHttpRequest para mostrar el avance de subida (los EXE pueden pesar varios MB). */
export default function UploadForm({
  action,
  submitLabel,
  children,
}: {
  action: string;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState<Result>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setPct(0);
    setResult(null);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", action);
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setPct(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      let data: Result = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* respuesta no JSON */ }
      if (xhr.status === 401) { window.location.href = "/login"; return; }
      setResult(data ?? { ok: false, message: `Error del servidor (${xhr.status}).` });
      if (data?.ok) { formRef.current?.reset(); router_refresh(); }
      setBusy(false);
    };
    xhr.onerror = () => { setResult({ ok: false, message: "No se pudo conectar con el servidor." }); setBusy(false); };
    xhr.send(new FormData(e.currentTarget));
  }

  // Recarga los datos del servidor (tabla de versiones) sin perder el mensaje de éxito.
  function router_refresh() {
    setTimeout(() => window.dispatchEvent(new Event("portal:refresh")), 0);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      {children}
      {busy && <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>}
      {result && <p className={`status ${result.ok ? "ok" : "err"}`} role="status">{result.message}</p>}
      <button type="submit" disabled={busy}>{busy ? `Subiendo… ${pct}%` : submitLabel}</button>
    </form>
  );
}
