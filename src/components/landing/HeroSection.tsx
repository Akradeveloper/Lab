import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:pb-28 sm:pt-32">
      {/* Fondo decorativo */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Aprende{" "}
          <span className="text-accent">Testing y QA</span>{" "}
          paso a paso
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Domina la calidad de software con lecciones interactivas, ejercicios
          prácticos en 4 lenguajes y seguimiento de progreso. Gratis y en
          español.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all duration-200 hover:shadow-accent/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Empieza gratis
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-colors duration-200 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </section>
  );
}
