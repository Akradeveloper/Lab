/**
 * Helpers para calcular métricas, progreso por módulo y logros derivados
 * a partir de Progress y la estructura de módulos/lecciones.
 */

export type ProgressItem = {
  courseId: string;
  lessonId: string;
  completedAt: Date;
};

export type ModuleForProfile = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  submodules: {
    id: string;
    lessons: { id: string }[];
  }[];
  lessons: { id: string }[];
};

export type ProgressByModule = {
  moduleId: string;
  moduleTitle: string;
  description: string | null;
  completedCount: number;
  totalCount: number;
};

export type DerivedAchievement = {
  id: string;
  label: string;
  achievedAt: Date;
};

export type RecentActivityItem = {
  lessonId: string;
  lessonTitle: string;
  url: string;
  completedAt: Date;
};

function getAllLessonIdsForModule(mod: ModuleForProfile): string[] {
  if (mod.submodules.length > 0) {
    return mod.submodules.flatMap((s) => s.lessons.map((l) => l.id));
  }
  return mod.lessons.map((l) => l.id);
}

export function getProgressByModule(
  progress: { courseId: string; lessonId: string }[],
  modules: ModuleForProfile[]
): ProgressByModule[] {
  const completedSet = new Set(
    progress.map((p) => `${p.courseId}:${p.lessonId}`)
  );

  return modules.map((mod) => {
    const allLessonIds = getAllLessonIdsForModule(mod);
    const completedCount = allLessonIds.filter((id) =>
      completedSet.has(`${mod.id}:${id}`)
    ).length;
    return {
      moduleId: mod.id,
      moduleTitle: mod.title,
      description: mod.description,
      completedCount,
      totalCount: allLessonIds.length,
    };
  });
}

const ACHIEVEMENT_MILESTONES = [1, 5, 10, 25, 50] as const;

export function getDerivedAchievements(
  progress: ProgressItem[],
  modules: ModuleForProfile[]
): DerivedAchievement[] {
  const achievements: DerivedAchievement[] = [];
  const total = progress.length;

  if (total >= 1) {
    const first = progress.reduce(
      (min, p) => (p.completedAt < min ? p.completedAt : min),
      progress[0].completedAt
    );
    achievements.push({
      id: "primera-leccion",
      label: "Primera lección completada",
      achievedAt: first,
    });
  }

  for (const n of ACHIEVEMENT_MILESTONES) {
    if (total >= n && n > 1) {
      const byDateAsc = [...progress].sort(
        (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
      );
      const nth = byDateAsc[n - 1];
      if (nth) {
        achievements.push({
          id: `lecciones-${n}`,
          label: `${n} lecciones completadas`,
          achievedAt: nth.completedAt,
        });
      }
    }
  }

  for (const mod of modules) {
    const allLessonIds = getAllLessonIdsForModule(mod);
    if (allLessonIds.length === 0) continue;
    const completedInModule = progress.filter(
      (p) => p.courseId === mod.id && allLessonIds.includes(p.lessonId)
    );
    if (completedInModule.length === allLessonIds.length) {
      const lastCompleted = completedInModule.sort(
        (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
      )[0];
      if (lastCompleted) {
        achievements.push({
          id: `modulo-${mod.id}`,
          label: `Módulo completado: ${mod.title}`,
          achievedAt: lastCompleted.completedAt,
        });
      }
    }
  }

  return achievements.sort(
    (a, b) => b.achievedAt.getTime() - a.achievedAt.getTime()
  );
}

export function buildLessonUrl(
  moduleId: string,
  submoduleId: string | null,
  lessonId: string
): string {
  if (submoduleId) {
    return `/modulos/${moduleId}/submodulos/${submoduleId}/lecciones/${lessonId}`;
  }
  return `/modulos/${moduleId}/lecciones/${lessonId}`;
}

export type LessonInfoForActivity = {
  id: string;
  title: string;
  moduleId: string | null;
  submoduleId: string | null;
};

export type TimeSeriesPoint = {
  date: string;
  count: number;
};

export function getProgressTimeSeries(
  progress: ProgressItem[],
  options?: { groupBy?: "day" | "week"; lastDays?: number }
): TimeSeriesPoint[] {
  const groupBy = options?.groupBy ?? "day";
  const lastDays = options?.lastDays;

  const map = new Map<string, number>();
  for (const p of progress) {
    const d = new Date(p.completedAt);
    const key =
      groupBy === "week"
        ? getWeekKey(d)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  let entries = Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (lastDays != null && lastDays > 0) {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - lastDays);
    const filled: TimeSeriesPoint[] = [];
    for (let i = 0; i <= lastDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      filled.push({
        date: dateKey,
        count: map.get(dateKey) ?? 0,
      });
    }
    entries = filled;
  }

  return entries;
}

function getWeekKey(d: Date): string {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getRecentActivityItems(
  progressSlice: { lessonId: string; completedAt: Date }[],
  lessonMap: Map<string, LessonInfoForActivity>
): RecentActivityItem[] {
  return progressSlice
    .map((p) => {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson || !lesson.moduleId) return null;
      const url = buildLessonUrl(
        lesson.moduleId,
        lesson.submoduleId,
        lesson.id
      );
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        url,
        completedAt: p.completedAt,
      };
    })
    .filter((x): x is RecentActivityItem => x !== null);
}
