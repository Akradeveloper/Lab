import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted">
          © {year} QA Lab. Todos los derechos reservados.
        </p>
        <nav className="flex gap-6 text-sm">
          <Link href="/login" className="text-muted transition-colors hover:text-foreground">
            Iniciar sesión
          </Link>
          <Link href="/register" className="text-muted transition-colors hover:text-foreground">
            Registro
          </Link>
          <Link href="/modulos" className="text-muted transition-colors hover:text-foreground">
            Módulos
          </Link>
        </nav>
      </div>
    </footer>
  );
}
