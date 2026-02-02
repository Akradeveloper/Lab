"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al registrarse");
        setLoading(false);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold">Crear cuenta</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              autoComplete="name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Contraseña (mín. 6)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              autoComplete="new-password"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Registrando…" : "Registrarse"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 dark:text-zinc-100"
          >
            Inicia sesión
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
