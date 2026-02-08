type SkeletonProps = {
  className?: string;
};

/** Bloque rectangular animado tipo skeleton. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse-skeleton rounded bg-border ${className}`}
      aria-hidden
    />
  );
}

/** Skeleton para una tarjeta de módulo. */
export function ModuleCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Skeleton className="mb-3 h-5 w-3/4" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="mb-3 h-3 w-2/3" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

/** Skeleton para contenido de lección. */
export function LessonContentSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="mt-4 h-32 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

/** Skeleton para sidebar del currículo. */
export function SidebarSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="ml-4 h-5 w-5/6" />
      <Skeleton className="ml-4 h-5 w-4/6" />
      <Skeleton className="ml-4 h-5 w-5/6" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="ml-4 h-5 w-5/6" />
      <Skeleton className="ml-4 h-5 w-3/6" />
    </div>
  );
}
