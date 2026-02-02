"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/alumnos", label: "Alumnos" },
  { href: "/admin/curriculum", label: "Currículo" },
] as const;

const baseClass =
  "px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded border-b-2 border-transparent";

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="border-b border-border bg-surface/80"
      aria-label="Apartados del panel de administración"
    >
      <div className="mx-auto max-w-4xl px-4">
        <ul className="flex flex-wrap gap-1">
          {links.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`${baseClass} ${
                    active
                      ? "border-accent text-accent font-medium"
                      : "text-muted hover:text-foreground hover:border-border"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
