"use client";

import { useEffect, useRef, useState } from "react";

type StatItem = {
  label: string;
  value: number;
  suffix?: string;
};

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const start = performance.now();

          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString("es-ES")}
      {suffix}
    </span>
  );
}

export function StatsSection({ stats }: { stats: StatItem[] }) {
  return (
    <section className="border-y border-border bg-surface px-4 py-16">
      <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="mb-1 text-4xl font-extrabold text-accent">
              <AnimatedCounter target={s.value} suffix={s.suffix} />
            </p>
            <p className="text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
