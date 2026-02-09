import Link from "next/link";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

type ModulePreview = {
  id: string;
  title: string;
  description: string | null;
  _count: { lessons: number };
};

export function CurriculumPreview({ modules }: { modules: ModulePreview[] }) {
  if (modules.length === 0) return null;

  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <AnimateOnScroll>
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            Currículo
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted">
            Módulos diseñados para llevarte de cero a profesional. Accede sin
            necesidad de registrarte.
          </p>
        </AnimateOnScroll>

        <div className="space-y-4">
          {modules.map((m, i) => (
            <AnimateOnScroll key={m.id} delay={i * 80}>
              <div className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5 transition-all duration-300 hover:border-accent/40 hover:shadow-md">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{m.title}</h3>
                  {m.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {m.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    {m._count.lessons}{" "}
                    {m._count.lessons === 1 ? "lección" : "lecciones"}
                  </p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-block rounded-lg border border-accent px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Ver todos los módulos
          </Link>
        </div>
      </div>
    </section>
  );
}
