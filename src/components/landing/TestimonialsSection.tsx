import { AnimateOnScroll } from "@/components/animate-on-scroll";

export type TestimonialItem = {
  id: string;
  userName: string;
  roleOrTitle: string | null;
  text: string;
  createdAt: string;
};

type Props = {
  testimonials: TestimonialItem[];
};

export function TestimonialsSection({ testimonials }: Props) {
  return (
    <section className="border-t border-border bg-surface px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <AnimateOnScroll>
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Lo que dicen nuestros alumnos
          </h2>
        </AnimateOnScroll>

        {testimonials.length === 0 ? (
          <p className="text-center text-muted">
            Completa al menos 5 lecciones y deja tu opinión desde tu perfil.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <AnimateOnScroll key={t.id} delay={i * 120}>
                <blockquote className="flex h-full flex-col rounded-xl border border-border bg-background p-6">
                  <p className="flex-1 text-sm leading-relaxed text-muted">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <footer className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                      {t.userName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t.userName}
                      </p>
                      {t.roleOrTitle && (
                        <p className="text-xs text-muted">{t.roleOrTitle}</p>
                      )}
                    </div>
                  </footer>
                </blockquote>
              </AnimateOnScroll>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
