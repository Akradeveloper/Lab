type Props = {
  completed: number;
  total: number;
  /** Mostrar etiqueta "X/Y (Z%)" junto a la barra. */
  showLabel?: boolean;
  size?: "sm" | "md";
};

/**
 * Barra de progreso horizontal con transición animada.
 */
export function ProgressBar({
  completed,
  total,
  showLabel = false,
  size = "md",
}: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const h = size === "sm" ? "h-1" : "h-2";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${h} flex-1 overflow-hidden rounded-full bg-border`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${h} rounded-full bg-accent transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {completed}/{total} ({pct}%)
        </span>
      )}
    </div>
  );
}
