import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Perfil</h1>
        <div className="space-y-2 text-muted">
          <p>
            <span className="font-medium text-foreground">Nombre:</span>{" "}
            {session.user?.name ?? "—"}
          </p>
          <p>
            <span className="font-medium text-foreground">Email:</span>{" "}
            {session.user?.email ?? "—"}
          </p>
        </div>
        <p className="mt-6 text-sm text-muted">
          La edición de perfil estará disponible próximamente.
        </p>
      </main>
    </div>
  );
}
