/**
 * Rate limit en memoria por IP. Útil para registro y login.
 * En producción con varias instancias, considerar Upstash/Redis.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_REQUESTS = 5;

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() ?? realIp ?? "unknown";
  return ip || "unknown";
}

/**
 * Comprueba si la IP ha superado el límite. Si no, incrementa el contador.
 * @returns null si está dentro del límite, o mensaje de error si ha superado.
 */
export function checkRegisterRateLimit(request: Request): string | null {
  const ip = getClientIp(request);
  const now = Date.now();
  let entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
    return null;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return "Demasiados intentos de registro. Espera unos minutos e inténtalo de nuevo.";
  }
  return null;
}
