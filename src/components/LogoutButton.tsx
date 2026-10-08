"use client";

export default function LogoutButton() {
  return (
    <button
      className="ghost"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      Cerrar sesión
    </button>
  );
}
