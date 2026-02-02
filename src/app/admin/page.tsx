import Link from "next/link";

export const metadata = {
  title: "Panel de administración - QA Lab",
  description: "Gestión de alumnos y currículo",
};

export default function AdminPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Panel de administración
      </h1>
      <p className="mb-8 text-muted">
        Elige un apartado para gestionar alumnos o el currículo del curso.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <section
          className="rounded-lg border border-border bg-surface p-6"
          aria-labelledby="admin-alumnos-heading"
        >
          <h2
            id="admin-alumnos-heading"
            className="mb-2 text-xl font-semibold text-foreground"
          >
            Alumnos
          </h2>
          <p className="mb-6 text-muted">
            Gestiona alumnos y revisa su progreso en lecciones y módulos.
          </p>
          <Link
            href="/admin/alumnos"
            className="inline-block rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ver alumnos
          </Link>
        </section>

        <section
          className="rounded-lg border border-border bg-surface p-6"
          aria-labelledby="admin-curriculum-heading"
        >
          <h2
            id="admin-curriculum-heading"
            className="mb-2 text-xl font-semibold text-foreground"
          >
            Currículo
          </h2>
          <p className="mb-6 text-muted">
            Módulos, lecciones y ejercicios. Crea y edita el contenido del
            curso.
          </p>
          <Link
            href="/admin/curriculum"
            className="inline-block rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Gestionar currículo
          </Link>
        </section>
      </div>
    </>
  );
}
