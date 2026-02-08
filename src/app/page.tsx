import { prisma } from "@/lib/prisma";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { CurriculumPreview } from "@/components/landing/CurriculumPreview";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { Footer } from "@/components/landing/Footer";

export default async function Home() {
  // Consultas de datos para estadísticas y preview del currículo.
  // Envueltas en try/catch para que la landing se muestre siempre,
  // incluso si la BD no está disponible.
  let alumnosCount = 0;
  let lessonsCount = 0;
  let exercisesCount = 0;
  let modules: {
    id: string;
    title: string;
    description: string | null;
    _count: { lessons: number };
  }[] = [];

  try {
    [alumnosCount, lessonsCount, exercisesCount, modules] = await Promise.all([
      prisma.user.count({ where: { role: "ALUMNO" } }),
      prisma.lesson.count(),
      prisma.exercise.count(),
      prisma.module.findMany({
        orderBy: { order: "asc" },
        take: 6,
        select: {
          id: true,
          title: true,
          description: true,
          _count: { select: { lessons: true } },
        },
      }),
    ]);
  } catch {
    // Si la BD no está disponible, la landing se muestra con valores por defecto
  }

  const stats = [
    { label: "Alumnos registrados", value: alumnosCount || 1, suffix: "+" },
    { label: "Lecciones disponibles", value: lessonsCount || 1 },
    { label: "Ejercicios prácticos", value: exercisesCount || 1 },
  ];

  return (
    <div className="min-h-screen bg-background font-sans">
      <HeroSection />
      <FeaturesSection />
      <StatsSection stats={stats} />
      <CurriculumPreview modules={modules} />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}
