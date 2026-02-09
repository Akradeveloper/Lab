/**
 * Rate limit en memoria por IP. Útil para registro y login.
 * En producción con varias instancias, considerar Upstash/Redis.
 */

import {
  getAppConfigNumber,
  DEFAULT_RATE_LIMIT_WINDOW_MINUTES,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
} from "@/lib/app-config";

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
export async function checkRegisterRateLimit(
  request: Request
): Promise<string | null> {
  const windowMinutes = await getAppConfigNumber(
    "rate_limit_window_minutes",
    DEFAULT_RATE_LIMIT_WINDOW_MINUTES
  );
  const maxRequests = await getAppConfigNumber(
    "rate_limit_max_requests",
    DEFAULT_RATE_LIMIT_MAX_REQUESTS
  );
  const windowMs = windowMinutes * 60 * 1000;

  const ip = getClientIp(request);
  const now = Date.now();
  let entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(ip, entry);
    return null;
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return "Demasiados intentos de registro. Espera unos minutos e inténtalo de nuevo.";
  }
  return null;
}
