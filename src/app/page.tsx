import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background font-sans">
      <main className="flex max-w-2xl flex-col items-center gap-8 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          QA Lab
        </h1>
        <p className="text-lg text-muted">
          Aprende Testing y QA paso a paso, como FreeCodeCamp pero enfocado en
          calidad.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-border px-6 py-3 font-medium transition-colors duration-200 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Registrarse
          </Link>
        </div>
      </main>
    </div>
  );
}
