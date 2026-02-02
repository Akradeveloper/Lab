import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { AdminLessonsList } from "./admin-lessons-list";

type Props = { params: Promise<{ moduleId: string }> };

export async function generateMetadata({ params }: Props) {
  const { moduleId } = await params;
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { title: true },
  });
  return {
    title: mod ? `${mod.title} - Currículo - QA Lab` : "Currículo - QA Lab",
  };
}

export default async function AdminModuleLessonsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { moduleId } = await params;
  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { id: true, title: true },
  });

  if (!module_) notFound();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-6 text-sm text-muted">
          <Link
            href="/admin/curriculum"
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            ← Currículo
          </Link>
        </nav>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {module_.title}
        </h1>
        <p className="mb-6 text-muted">Lecciones del módulo</p>
        <AdminLessonsList moduleId={moduleId} moduleTitle={module_.title} />
      </main>
    </div>
  );
}
