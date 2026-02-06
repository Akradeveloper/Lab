"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Spinner } from "@/components/Spinner";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export default function RegisterPage() {
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot: no debe rellenarse
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getPasswordStrength(pwd: string): "weak" | "medium" | "strong" | null {
    if (!pwd) return null;
    if (pwd.length < 8) return "weak";
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const criteria = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (criteria >= 4 && pwd.length >= 10) return "strong";
    if (criteria >= 3 || pwd.length >= 8) return "medium";
    return "weak";
  }

  const passwordStrength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    const turnstileToken = TURNSTILE_SITE_KEY ? turnstileRef.current?.getResponse() : undefined;
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Completa la verificación de seguridad antes de continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          confirmPassword,
          website,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al registrarse");
        turnstileRef.current?.reset();
        setLoading(false);
        return;
      }
      router.push("/login?registered=1");
      router.refresh();
    } catch {
      setError("Error de conexión");
      turnstileRef.current?.reset();
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
          Crear cuenta
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded bg-error-bg px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          {/* Honeypot: oculto para usuarios, los bots suelen rellenarlo */}
          <div
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
            aria-hidden="true"
          >
            <label htmlFor="register-website">Sitio web</label>
            <input
              id="register-website"
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <label htmlFor="register-name" className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Nombre</span>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoComplete="name"
            />
          </label>
          <label htmlFor="register-email" className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoComplete="email"
            />
          </label>
          <label htmlFor="register-password" className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Contraseña
            </span>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoComplete="new-password"
            />
            <span className="text-xs text-muted">
              Mín. 8 caracteres, una mayúscula, una minúscula y un número
            </span>
            {passwordStrength && (
              <span
                className={`text-xs ${
                  passwordStrength === "weak"
                    ? "text-error"
                    : passwordStrength === "medium"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-green-600 dark:text-green-400"
                }`}
              >
                Fortaleza:{" "}
                {passwordStrength === "weak"
                  ? "Débil"
                  : passwordStrength === "medium"
                    ? "Media"
                    : "Fuerte"}
              </span>
            )}
          </label>
          <label htmlFor="register-confirm-password" className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Repetir contraseña
            </span>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoComplete="new-password"
            />
          </label>
          {TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                options={{ theme: "auto", size: "normal" }}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent py-2 font-medium text-accent-foreground transition-colors duration-200 hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {loading ? (
              <>
                <Spinner className="h-4 w-4" />
                Registrando…
              </>
            ) : (
              "Registrarse"
            )}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            Inicia sesión
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
