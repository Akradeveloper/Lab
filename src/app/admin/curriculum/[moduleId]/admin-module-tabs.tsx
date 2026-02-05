"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminSubmodulesList } from "./admin-submodules-list";
import { AdminLessonsList } from "./admin-lessons-list";

type Props = {
  moduleId: string;
  moduleTitle: string;
  hasSubmodules: boolean;
  submodules: { id: string; title: string }[];
};

type Tab = "submodules" | "lessons";

const tabBase =
  "px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded border-b-2 border-transparent";

export function AdminModuleTabs({
  moduleId,
  moduleTitle,
  hasSubmodules,
  submodules,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("submodules");

  return (
    <div className="space-y-6">
      <nav
        className="flex gap-1 border-b border-border"
        aria-label="Gestionar módulo"
      >
        <button
          type="button"
          onClick={() => setActiveTab("submodules")}
          className={
            activeTab === "submodules"
              ? `${tabBase} border-accent text-accent font-medium`
              : `${tabBase} text-muted hover:text-foreground hover:border-border`
          }
        >
          Submódulos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lessons")}
          className={
            activeTab === "lessons"
              ? `${tabBase} border-accent text-accent font-medium`
              : `${tabBase} text-muted hover:text-foreground hover:border-border`
          }
        >
          Lecciones
        </button>
      </nav>

      {activeTab === "submodules" && (
        <AdminSubmodulesList moduleId={moduleId} moduleTitle={moduleTitle} />
      )}

      {activeTab === "lessons" && (
        <>
          {hasSubmodules ? (
            <div className="rounded-lg border border-border bg-surface p-6">
              <p className="mb-4 text-muted">
                Este módulo usa submódulos. Gestiona las lecciones dentro de
                cada submódulo.
              </p>
              <ul className="space-y-2">
                {submodules.map((sub) => (
                  <li key={sub.id}>
                    <Link
                      href={`/admin/curriculum/${moduleId}/submodules/${sub.id}`}
                      className="text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      {sub.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <AdminLessonsList
              moduleId={moduleId}
              moduleTitle={moduleTitle}
              submoduleId={null}
              submoduleTitle={null}
            />
          )}
        </>
      )}
    </div>
  );
}
