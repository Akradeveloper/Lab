import { AdminStudentsTable } from "../admin-students-table";

export const metadata = {
  title: "Alumnos - Panel de administración - QA Lab",
  description: "Gestión de alumnos y progreso",
};

export default function AdminAlumnosPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">Alumnos</h1>
      <p className="mb-6 text-muted">
        Listado de alumnos registrados y su progreso en lecciones.
      </p>
      <AdminStudentsTable />
    </>
  );
}
