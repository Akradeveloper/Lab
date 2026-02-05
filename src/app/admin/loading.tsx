import { Spinner } from "@/components/Spinner";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-16">
        <Spinner className="h-8 w-8 text-muted" />
        <p className="mt-4 text-sm text-muted">Cargando panel…</p>
      </div>
    </div>
  );
}
