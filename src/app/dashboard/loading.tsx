import { Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border bg-surface" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Saludo */}
        <div className="mb-8">
          <Skeleton className="mb-2 h-8 w-60" />
          <Skeleton className="h-4 w-80" />
        </div>
        {/* Bloque principal */}
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <Skeleton className="mb-6 h-6 w-48" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
        {/* Resumen */}
        <div className="mb-8 rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-4 w-full" />
        </div>
      </main>
    </div>
  );
}
