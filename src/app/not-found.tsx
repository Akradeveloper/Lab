import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg text-center">
        {/* Ilustración SVG: Bug/bicho de QA */}
        <div className="mx-auto mb-8 w-40">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
            {/* Cuerpo del bicho */}
            <ellipse cx="100" cy="120" rx="45" ry="50" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="3" />
            {/* Cabeza */}
            <circle cx="100" cy="65" r="25" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="3" />
            {/* Ojos */}
            <circle cx="90" cy="60" r="5" fill="currentColor" />
            <circle cx="110" cy="60" r="5" fill="currentColor" />
            {/* Antenas */}
            <path d="M85 45 L70 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="70" cy="25" r="4" fill="currentColor" />
            <path d="M115 45 L130 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="130" cy="25" r="4" fill="currentColor" />
            {/* Patas izquierda */}
            <path d="M60 100 L35 85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M58 120 L30 120" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M60 140 L35 155" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            {/* Patas derecha */}
            <path d="M140 100 L165 85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M142 120 L170 120" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M140 140 L165 155" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            {/* Boca triste */}
            <path d="M90 72 Q100 66 110 72" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Lupa */}
            <circle cx="155" cy="160" r="18" stroke="currentColor" strokeWidth="3" fill="currentColor" opacity="0.05" />
            <path d="M167 172 L185 190" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            {/* Signo ? dentro de la lupa */}
            <text x="149" y="166" fontSize="18" fontWeight="bold" fill="currentColor" fontFamily="system-ui">?</text>
          </svg>
        </div>

        <h1 className="mb-2 text-5xl font-extrabold text-foreground">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Página no encontrada
        </h2>
        <p className="mb-8 text-muted">
          Parece que este bug se ha escapado del testing. La página que buscas
          no existe o ha sido movida.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ir al inicio
          </Link>
          <Link
            href="/modulos"
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ver módulos
          </Link>
        </div>
      </div>
    </div>
  );
}
