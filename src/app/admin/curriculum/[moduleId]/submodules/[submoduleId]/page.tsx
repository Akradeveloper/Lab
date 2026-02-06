import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { DescriptionMarkdown } from "@/components/description-markdown";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { AdminLessonsList } from "../../admin-lessons-list";

type Props = { params: Promise<{ moduleId: string; submoduleId: string }> };

export async function generateMetadata({ params }: Props) {
  const { submoduleId } = await params;
  const sub = await prisma.submodule.findUnique({
    where: { id: submoduleId },
    select: { title: true },
  });
  return {
    title: sub ? `${sub.title} - Currículo - QA Lab` : "Currículo - QA Lab",
  };
}

export default async function AdminSubmodulePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { moduleId, submoduleId } = await params;
  const submodule = await prisma.submodule.findUnique({
    where: { id: submoduleId },
    include: { module: { select: { id: true, title: true } } },
  });

  if (!submodule || submodule.moduleId !== moduleId) notFound();

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
          <span className="mx-2">/</span>
          <Link
            href={`/admin/curriculum/${moduleId}`}
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            {submodule.module.title}
          </Link>
        </nav>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {submodule.title}
        </h1>
        {submodule.description && (
          <DescriptionMarkdown
            content={submodule.description}
            className="mb-4"
          />
        )}
        <p className="mb-6 text-muted">Lecciones del submódulo</p>
        <AdminLessonsList
          moduleId={moduleId}
          submoduleId={submoduleId}
          moduleTitle={submodule.module.title}
          submoduleTitle={submodule.title}
        />
      </main>
    </div>
  );
}
