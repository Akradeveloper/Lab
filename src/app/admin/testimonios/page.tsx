import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminTestimonialsList } from "./admin-testimonials-list";

export const metadata = {
  title: "Testimonios - Admin - QA Lab",
  description: "Aprobar o rechazar testimonios de alumnos",
};

export default async function AdminTestimoniosPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Testimonios
      </h1>
      <p className="mb-6 text-muted">
        Los alumnos pueden enviar su opinión desde el perfil (tras completar 5
        lecciones). Aquí puedes aprobar o rechazar para que aparezcan en la
        landing.
      </p>
      <AdminTestimonialsList />
    </div>
  );
}
