import { prisma } from "@/lib/prisma";

/**
 * Devuelve los IDs de lecciones del módulo en orden: si tiene submódulos,
 * por (submodule.order, lesson.order); si no, por lesson.order de lecciones directas.
 */
export async function getOrderedLessonIdsInModule(
  moduleId: string
): Promise<string[]> {
  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      submodules: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" }, select: { id: true } },
        },
      },
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true },
      },
    },
  });

  if (!module_) return [];

  const orderedIds: string[] = [];
  if (module_.submodules.length > 0) {
    for (const sub of module_.submodules) {
      for (const les of sub.lessons) {
        orderedIds.push(les.id);
      }
    }
  } else {
    for (const les of module_.lessons) {
      orderedIds.push(les.id);
    }
  }
  return orderedIds;
}

/**
 * Devuelve los IDs de lecciones que van antes que la lección dada en el orden
 * del módulo. Orden: si el módulo tiene submódulos, por (submodule.order, lesson.order);
 * si no, por lesson.order de las lecciones directas del módulo.
 * Si la lección no está en el módulo, devuelve todos los IDs del módulo para bloquear acceso.
 */
export async function getPreviousLessonIdsInModule(
  moduleId: string,
  lessonId: string
): Promise<string[]> {
  const orderedIds = await getOrderedLessonIdsInModule(moduleId);
  const index = orderedIds.indexOf(lessonId);
  if (index <= 0) return [];
  if (index === -1) return orderedIds;
  return orderedIds.slice(0, index);
}
