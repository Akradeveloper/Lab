import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/database-url", () => ({ getDatabaseUrl: vi.fn(() => "file:./prisma/dev.db") }));
vi.mock("next/constants", () => ({ PHASE_PRODUCTION_BUILD: "phase-production-build" }));

describe("env", () => {
  const origEnv = process.env;
  const origPhase = process.env.NEXT_PHASE;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
    if (origPhase !== undefined) process.env.NEXT_PHASE = origPhase;
  });

  it("exporta env con NEXTAUTH_SECRET, NEXTAUTH_URL y DATABASE_URL cuando están definidas", async () => {
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.DATABASE_URL = "file:./dev.db";
    const { env } = await import("@/lib/env");
    expect(env.NEXTAUTH_SECRET).toBe("secret");
    expect(env.NEXTAUTH_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toBe("file:./prisma/dev.db");
  });

  it("en fase de build devuelve valores dummy si faltan variables", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;
    delete process.env.DATABASE_URL;
    const { env } = await import("@/lib/env");
    expect(env.NEXTAUTH_SECRET).toBe("build");
    expect(env.NEXTAUTH_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toBe("file:./prisma/dev.db");
  });
});
