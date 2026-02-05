import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";

export const metadata = {
  title: "Inicio - QA Lab",
  description: "Área del alumno",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">
          Área del alumno
        </h1>
        <p className="text-muted">
          Hola,{" "}
          <strong className="text-foreground">{session.user?.name}</strong>.
          Aquí irán tus cursos y tu progreso.
        </p>
        <p className="mt-4 text-sm text-muted">
          <Link
            href="/"
            className="transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  );
}
