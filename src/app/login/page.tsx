"use client";

import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }),
    });
    const data = await res.json().catch(() => ({ message: "Error del servidor." }));
    if (res.ok) window.location.href = "/";
    else { setError(data.message); setBusy(false); }
  }

  return (
    <main className="login">
      <section className="panel">
        <h1>Actualitodo</h1>
        <p className="muted">Acceso para administradores</p>
        <form onSubmit={onSubmit}>
          <label>Usuario<input type="text" name="username" autoComplete="username" required autoFocus /></label>
          <label>Contraseña<input type="password" name="password" autoComplete="current-password" required /></label>
          {error && <p className="status err" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Entrando…" : "Iniciar sesión"}</button>
        </form>
      </section>
    </main>
  );
}
