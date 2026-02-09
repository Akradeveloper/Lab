import { Skeleton } from "@/components/skeleton";

export default function MiCarreraLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border bg-surface" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-8 h-8 w-48" />
        {/* Métricas */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4">
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        {/* Gráficos */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </main>
    </div>
  );
}
