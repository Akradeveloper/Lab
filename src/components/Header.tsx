"use client";

import Link from "next/link";
import { LogoutButton } from "@/app/dashboard/logout-button";

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold text-foreground transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          QA Lab
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
