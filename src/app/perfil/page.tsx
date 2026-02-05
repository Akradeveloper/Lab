import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import {
  getProgressByModule,
  type ModuleForProfile,
} from "@/lib/profile-stats";

export const metadata = {
  title: "Perfil - QA Lab",
  description: "Tu cuenta y datos personales",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMemberSince(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role: string): string {
  return role === "ADMIN" ? "Administrador" : "Alumno";
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, progress, modules] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.progress.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      select: { courseId: true, lessonId: true, completedAt: true },
    }),
    prisma.module.findMany({
      orderBy: { order: "asc" },
      include: {
        submodules: {
          orderBy: { order: "asc" },
          include: {
            lessons: { orderBy: { order: "asc" }, select: { id: true } },
          },
        },
        lessons: {
          orderBy: { order: "asc" },
          select: { id: true },
        },
      },
    }),
  ]);

  const modulesForProfile: ModuleForProfile[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    order: m.order,
    submodules: m.submodules.map((s) => ({
      id: s.id,
      lessons: s.lessons,
    })),
    lessons: m.lessons,
  }));

  const progressByModule = getProgressByModule(progress, modulesForProfile);
  const modulesCompleted = progressByModule.filter(
    (p) => p.totalCount > 0 && p.completedCount === p.totalCount
  ).length;

  const lessonsCompletedCount = progress.length;
  const lastActivity = progress.length > 0 ? progress[0].completedAt : null;
  const role = user?.role ?? session.user?.role ?? "ALUMNO";
  const displayName = user?.name ?? session.user?.name ?? "—";
  const displayEmail = user?.email ?? session.user?.email ?? "—";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-semibold text-foreground">Perfil</h1>

        {/* Cabecera de perfil */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="perfil-cabecera-heading"
        >
          <h2 id="perfil-cabecera-heading" className="sr-only">
            Cabecera del perfil
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold text-foreground sm:text-3xl">
              {displayName}
            </span>
            <span
              className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent"
              aria-label={`Rol: ${roleLabel(role)}`}
            >
              {roleLabel(role)}
            </span>
          </div>
          {user?.createdAt && (
            <p className="mt-2 text-sm text-muted">
              Miembro desde {formatMemberSince(user.createdAt)}
            </p>
          )}
          <p className="mt-1 text-sm text-muted">
            Tu cuenta y resumen de actividad en QA Lab.
          </p>
        </section>

        {/* Información de contacto */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="perfil-contacto-heading"
        >
          <h2
            id="perfil-contacto-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Información de contacto
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted">Nombre</dt>
              <dd className="font-medium text-foreground">{displayName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Correo electrónico</dt>
              <dd className="font-medium text-foreground">{displayEmail}</dd>
            </div>
          </dl>
        </section>

        {/* Resumen de aprendizaje */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="perfil-resumen-heading"
        >
          <h2
            id="perfil-resumen-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Resumen de aprendizaje
          </h2>
          <ul className="mb-6 grid gap-4 sm:grid-cols-3">
            <li className="rounded border border-border bg-background p-4">
              <p className="text-2xl font-semibold text-accent">
                {lessonsCompletedCount}
              </p>
              <p className="text-sm text-muted">Lecciones completadas</p>
            </li>
            <li className="rounded border border-border bg-background p-4">
              <p className="text-2xl font-semibold text-accent">
                {modulesCompleted}
              </p>
              <p className="text-sm text-muted">Módulos completados</p>
            </li>
            <li className="rounded border border-border bg-background p-4">
              <p className="text-sm font-medium text-foreground">
                {lastActivity
                  ? formatDateTime(lastActivity)
                  : "Sin actividad aún"}
              </p>
              <p className="text-sm text-muted">Última actividad</p>
            </li>
          </ul>
          <Link
            href="/mi-carrera"
            className="inline-block rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ver mi carrera
          </Link>
        </section>

        {/* Detalles de cuenta */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="perfil-cuenta-heading"
        >
          <h2
            id="perfil-cuenta-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Detalles de cuenta
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted">Rol</dt>
              <dd className="font-medium text-foreground">{roleLabel(role)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">ID de cuenta</dt>
              <dd>
                <code
                  className="text-xs text-foreground"
                  title="Útil para soporte"
                >
                  {user?.id ? truncateId(user.id) : truncateId(userId)}
                </code>
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">
            La edición del perfil estará disponible próximamente.
          </p>
        </section>
      </main>
    </div>
  );
}
