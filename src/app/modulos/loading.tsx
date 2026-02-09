import { ModuleCardSkeleton } from "@/components/skeleton";

export default function ModulosLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Placeholder del header */}
      <div className="h-14 border-b border-border bg-surface" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 h-8 w-40 animate-pulse-skeleton rounded bg-border" />
        <div className="mb-6 h-4 w-3/4 animate-pulse-skeleton rounded bg-border" />
        <div className="space-y-4">
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
        </div>
      </main>
    </div>
  );
}
