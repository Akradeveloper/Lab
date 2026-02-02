import { AdminModulesList } from "./admin-modules-list";

export const metadata = {
  title: "Currículo - Panel de administración - QA Lab",
  description: "Gestionar módulos, lecciones y ejercicios",
};

export default function AdminCurriculumPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">Currículo</h1>
      <p className="mb-6 text-muted">
        Módulos, lecciones y ejercicios. Crea y edita el contenido del curso.
      </p>
      <AdminModulesList />
    </>
  );
}
