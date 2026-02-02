"use client";

import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Spinner } from "@/components/Spinner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const registered = searchParams.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email o contraseña incorrectos");
        setLoading(false);
        return;
      }
      const session = await getSession();
      const destination =
        callbackUrl ||
        (session?.user?.role === "ADMIN" ? "/admin" : "/dashboard");
      router.push(destination);
      router.refresh();
    } catch {
      setError("Error al iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-lg shadow-black/20">
        <h1 className="mb-6 text-xl font-semibold text-foreground">
          Iniciar sesión
        </h1>
        {registered && (
          <p className="mb-4 rounded border border-accent/50 bg-accent/10 px-3 py-2 text-sm text-accent">
            Cuenta creada. Inicia sesión.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded bg-error-bg px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          <label htmlFor="login-email" className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoComplete="email"
            />
          </label>
          <label htmlFor="login-password" className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Contraseña
            </span>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent py-2 font-medium text-accent-foreground transition-colors duration-200 hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {loading ? (
              <>
                <Spinner className="h-4 w-4" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            Regístrate
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link
            href="/"
            className="text-sm text-muted transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main
          id="main-content"
          className="flex min-h-screen flex-col items-center justify-center bg-background px-4"
        >
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center">
            <Spinner className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-4 text-sm text-muted">Cargando…</p>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
