"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LogoutButton } from "@/app/dashboard/logout-button";

const navLinks = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/modulos", label: "Módulos" },
  { href: "/mi-carrera", label: "Mi carrera" },
  { href: "/perfil", label: "Perfil" },
] as const;

const linkClass =
  "text-sm transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded";

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-4xl flex-wrap items-center justify-between gap-2 px-4">
        <Link
          href="/dashboard"
          className="text-lg font-semibold text-foreground transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          QA Lab
        </Link>
        <nav className="flex flex-wrap items-center gap-4">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${linkClass} ${
                isActive(href) ? "text-foreground" : "text-muted"
              }`}
            >
              {label}
            </Link>
          ))}
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`${linkClass} ${
                pathname.startsWith("/admin") ? "text-foreground" : "text-muted"
              }`}
            >
              Panel de administración
            </Link>
          )}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
