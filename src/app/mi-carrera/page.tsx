import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";

export default async function MiCarreraPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">
          Mi carrera
        </h1>
        <p className="mb-6 text-muted">
          Seguimiento y logros por módulo. Tu progreso se mostrará aquí cuando
          existan módulos y logros.
        </p>
        <section>
          <h2 className="mb-3 text-lg font-medium text-foreground">
            Tus logros por módulo
          </h2>
          <p className="text-sm text-muted">
            (Lista vacía por ahora; se conectará con Progress y logros más
            adelante.)
          </p>
        </section>
      </main>
    </div>
  );
}
