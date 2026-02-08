"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="rounded text-lg font-semibold text-foreground transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          QA Lab
        </Link>

        {/* Navegación desktop */}
        <nav className="hidden items-center gap-4 md:flex">
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
              Admin
            </Link>
          )}
          <ThemeToggle />
          <LogoutButton />
        </nav>

        {/* Botones móvil */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            className="rounded p-1.5 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <nav className="flex flex-col gap-2 border-t border-border bg-surface px-4 pb-4 pt-2 md:hidden">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`${linkClass} block py-1.5 ${
                isActive(href) ? "text-foreground" : "text-muted"
              }`}
            >
              {label}
            </Link>
          ))}
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className={`${linkClass} block py-1.5 ${
                pathname.startsWith("/admin") ? "text-foreground" : "text-muted"
              }`}
            >
              Admin
            </Link>
          )}
          <div className="mt-2">
            <LogoutButton />
          </div>
        </nav>
      )}
    </header>
  );
}
