import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { AdminStudentsTable } from "./admin-students-table";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          Panel de administración
        </h1>
        <p className="mb-6 text-muted">Progreso de los alumnos</p>
        <AdminStudentsTable />
        <p className="mt-6 text-sm text-muted">
          <Link
            href="/"
            className="transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
