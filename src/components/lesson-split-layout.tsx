"use client";

import { type ReactNode } from "react";

type Props = {
  /** Panel izquierdo: teoría + ejercicios no-CODE */
  left: ReactNode;
  /** Panel derecho: ejercicios CODE (Monaco + tests) */
  right: ReactNode;
};

/**
 * Layout dividido en dos paneles para lecciones que contienen ejercicios de código.
 * En móvil se apila verticalmente. En desktop, split 50/50.
 */
export function LessonSplitLayout({ left, right }: Props) {
  return (
    <div className="flex flex-col lg:flex-row lg:gap-0">
      {/* Panel izquierdo: teoría */}
      <div className="min-w-0 flex-1 overflow-y-auto border-border px-4 py-6 lg:border-r lg:px-6 lg:py-8">
        {left}
      </div>
      {/* Panel derecho: editor/código */}
      <div className="min-w-0 flex-1 overflow-y-auto border-t border-border bg-surface/50 px-4 py-6 lg:border-t-0 lg:px-6 lg:py-8">
        {right}
      </div>
    </div>
  );
}
