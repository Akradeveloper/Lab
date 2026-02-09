import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

/**
 * Breadcrumbs reutilizable con separadores chevron y schema.org BreadcrumbList.
 * Trunca en móvil mostrando solo los 2 últimos niveles.
 */
export function Breadcrumbs({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumbs" className="mb-6">
      {/* Schema.org para SEO. Safe: JSON.stringify escapa datos, no se inyecta HTML crudo. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: items
              .filter((i) => i.href)
              .map((item, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                name: item.label,
                item: item.href,
              })),
          }),
        }}
      />

      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          // En móvil, solo mostrar los 2 últimos
          const hideOnMobile = items.length > 2 && idx < items.length - 2;

          return (
            <li
              key={idx}
              className={`flex items-center gap-1 ${hideOnMobile ? "hidden sm:flex" : "flex"}`}
            >
              {idx > 0 && (
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 shrink-0 text-muted"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {isLast || !item.href ? (
                <span className="rounded-md bg-surface px-2 py-0.5 text-foreground">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-md px-2 py-0.5 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
