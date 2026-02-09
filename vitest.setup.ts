/**
 * Configuración global de Vitest.
 * Restaura mocks después de cada test.
 * Variables de entorno mínimas para que @/lib/env no falle al cargar (p. ej. en rutas que usan auth).
 */
import { afterEach, vi } from "vitest";

if (!process.env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = "test-secret";
if (!process.env.NEXTAUTH_URL) process.env.NEXTAUTH_URL = "http://localhost:3000";
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "mysql://u:p@localhost:3306/test";

afterEach(() => {
  vi.restoreAllMocks();
});
