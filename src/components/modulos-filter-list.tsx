"use client";

import { useState } from "react";
import Link from "next/link";
import { DescriptionMarkdown } from "@/components/description-markdown";
import { ProgressBar } from "@/components/progress-bar";

export type ModuleWithStatus = {
  id: string;
  title: string;
  description: string | null;
  completedCount: number;
  totalCount: number;
  status: "completed" | "in_progress" | "not_started";
};

type Props = {
  modules: ModuleWithStatus[];
};

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "completed", label: "Completados" },
  { value: "in_progress", label: "En curso" },
  { value: "not_started", label: "No empezados" },
] as const;

export function ModulosFilterList({ modules }: Props) {
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress" | "not_started">("all");

  const filtered =
    filter === "all"
      ? modules
      : modules.filter((m) => m.status === filter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">Ver:</span>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              filter === f.value
                ? "bg-accent text-accent-foreground"
                : "bg-surface text-muted hover:bg-border hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded border border-border bg-surface p-6 text-center text-muted">
          No hay módulos en esta categoría.
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((mod) => (
            <li key={mod.id}>
              <Link
                href={`/modulos/${mod.id}`}
                className="card-hover block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <h2 className="font-semibold text-foreground">{mod.title}</h2>
                {mod.description && (
                  <DescriptionMarkdown
                    content={mod.description}
                    className="mt-1 text-sm"
                  />
                )}
                <p className="mt-2 text-sm text-accent">
                  {mod.completedCount}/{mod.totalCount} lecciones completadas
                </p>
                <div className="mt-2">
                  <ProgressBar
                    completed={mod.completedCount}
                    total={mod.totalCount}
                    size="sm"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
