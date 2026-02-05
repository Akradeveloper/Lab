import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center">
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          Página no encontrada
        </h1>
        <p className="mb-6 text-muted">
          La ruta que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          className="inline-block rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ir al inicio
        </Link>
        <span className="mx-2 text-muted">|</span>
        <Link
          href="/dashboard"
          className="inline-block rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
