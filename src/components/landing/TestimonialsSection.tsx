import { AnimateOnScroll } from "@/components/animate-on-scroll";

const testimonials = [
  {
    name: "María López",
    role: "QA Engineer en Fintech",
    text: "Gracias a QA Lab pude pasar de testing manual a automatización en pocas semanas. Los ejercicios prácticos hacen la diferencia.",
  },
  {
    name: "Carlos Ruiz",
    role: "Desarrollador Full-Stack",
    text: "Siempre quise entender testing pero los cursos eran muy teóricos. Aquí practicas desde el primer día con código real.",
  },
  {
    name: "Ana Martínez",
    role: "Estudiante de Ingeniería",
    text: "El progreso visual y los certificados me motivan a seguir aprendiendo. Además, poder elegir mi lenguaje favorito es genial.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="border-t border-border bg-surface px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <AnimateOnScroll>
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Lo que dicen nuestros alumnos
          </h2>
        </AnimateOnScroll>

        <div className="grid gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <AnimateOnScroll key={t.name} delay={i * 120}>
              <blockquote className="flex h-full flex-col rounded-xl border border-border bg-background p-6">
                <p className="flex-1 text-sm leading-relaxed text-muted">
                  &ldquo;{t.text}&rdquo;
                </p>
                <footer className="mt-4 flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {t.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </footer>
              </blockquote>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
