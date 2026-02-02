import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Área del alumno</h1>
          <LogoutButton />
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">
          Hola, <strong>{session.user?.name}</strong>. Aquí irán tus cursos y tu
          progreso.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/" className="hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
