import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { AdminStudentsTable } from "./admin-students-table";
import { LogoutButton } from "../dashboard/logout-button";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Panel de administración</h1>
          <LogoutButton />
        </div>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Progreso de los alumnos
        </p>
        <AdminStudentsTable />
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/" className="hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
