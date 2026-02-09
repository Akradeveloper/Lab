"use client";

import Link from "next/link";
import { useState } from "react";

/* ---------- Tipos ---------- */

export type SidebarLesson = {
  id: string;
  title: string;
  order: number;
};

export type SidebarSubmodule = {
  id: string;
  title: string;
  lessons: SidebarLesson[];
};

export type SidebarModule = {
  id: string;
  title: string;
  submodules: SidebarSubmodule[];
  lessons: SidebarLesson[];
};

type Props = {
  module: SidebarModule;
  completedLessonIds: Set<string>;
  currentLessonId: string;
  moduleId: string;
};

/* ---------- Componente ---------- */

export function CurriculumSidebar({
  module: mod,
  completedLessonIds,
  currentLessonId,
  moduleId,
}: Props) {
  const [open, setOpen] = useState(false);

  const content = (
    <nav className="flex h-full flex-col overflow-y-auto p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
        {mod.title}
      </p>

      {/* Lecciones directas del módulo */}
      {mod.lessons.length > 0 && (
        <LessonList
          lessons={mod.lessons}
          completedLessonIds={completedLessonIds}
          currentLessonId={currentLessonId}
          buildHref={(lid) => `/modulos/${moduleId}/lecciones/${lid}`}
        />
      )}

      {/* Submódulos */}
      {mod.submodules.map((sub) => (
        <SubmoduleGroup
          key={sub.id}
          submodule={sub}
          completedLessonIds={completedLessonIds}
          currentLessonId={currentLessonId}
          moduleId={moduleId}
        />
      ))}
    </nav>
  );

  return (
    <>
      {/* Botón flotante móvil */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú del currículo" : "Abrir menú del currículo"}
        className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg lg:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Overlay móvil */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 cursor-default border-0 bg-black/50 p-0 lg:hidden"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-72 border-r border-border bg-surface transition-transform duration-300 lg:relative lg:top-0 lg:z-auto lg:h-auto lg:translate-x-0 lg:border-r lg:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </aside>
    </>
  );
}

/* ---------- Sub-componentes ---------- */

function SubmoduleGroup({
  submodule,
  completedLessonIds,
  currentLessonId,
  moduleId,
}: {
  submodule: SidebarSubmodule;
  completedLessonIds: Set<string>;
  currentLessonId: string;
  moduleId: string;
}) {
  const hasCurrentLesson = submodule.lessons.some(
    (l) => l.id === currentLessonId,
  );
  const [expanded, setExpanded] = useState(hasCurrentLesson);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-background"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
        <span className="truncate">{submodule.title}</span>
      </button>
      {expanded && (
        <LessonList
          lessons={submodule.lessons}
          completedLessonIds={completedLessonIds}
          currentLessonId={currentLessonId}
          buildHref={(lid) =>
            `/modulos/${moduleId}/submodulos/${submodule.id}/lecciones/${lid}`
          }
          indent
        />
      )}
    </div>
  );
}

function LessonList({
  lessons,
  completedLessonIds,
  currentLessonId,
  buildHref,
  indent = false,
}: {
  lessons: SidebarLesson[];
  completedLessonIds: Set<string>;
  currentLessonId: string;
  buildHref: (lessonId: string) => string;
  indent?: boolean;
}) {
  return (
    <ul className={`mb-2 space-y-0.5 ${indent ? "pl-5" : ""}`}>
      {lessons.map((l) => {
        const isCurrent = l.id === currentLessonId;
        const isCompleted = completedLessonIds.has(l.id);

        return (
          <li key={l.id}>
            <Link
              href={buildHref(l.id)}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                isCurrent
                  ? "border border-accent/40 bg-accent/10 font-medium text-accent"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {isCompleted ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-green-500">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted">
                  {l.order + 1}
                </span>
              )}
              <span className="truncate">{l.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
