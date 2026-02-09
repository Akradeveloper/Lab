import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRegisterRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/app-config", () => ({
  getAppConfigNumber: vi.fn(),
  DEFAULT_RATE_LIMIT_WINDOW_MINUTES: 15,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS: 5,
}));

const { getAppConfigNumber } = await import("@/lib/app-config");

describe("rate-limit", () => {
  beforeEach(() => {
    vi.mocked(getAppConfigNumber).mockImplementation(async (key: string) => {
      if (key === "rate_limit_window_minutes") return 15;
      if (key === "rate_limit_max_requests") return 2; // bajo para testear límite rápido
      return 0;
    });
  });

  it("devuelve null cuando la IP está dentro del límite", async () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const r1 = await checkRegisterRateLimit(req);
    const r2 = await checkRegisterRateLimit(req);
    expect(r1).toBeNull();
    expect(r2).toBeNull();
  });

  it("devuelve mensaje de error cuando se supera el límite de intentos", async () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    await checkRegisterRateLimit(req);
    await checkRegisterRateLimit(req);
    const third = await checkRegisterRateLimit(req);
    expect(third).toBe(
      "Demasiados intentos de registro. Espera unos minutos e inténtalo de nuevo."
    );
  });

  it("usa x-forwarded-for como IP cuando está presente", async () => {
    const reqA = new Request("https://example.com", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });
    const reqB = new Request("https://example.com", {
      headers: { "x-forwarded-for": "192.168.1.2" },
    });
    await checkRegisterRateLimit(reqA);
    await checkRegisterRateLimit(reqB);
    const a2 = await checkRegisterRateLimit(reqA);
    const b2 = await checkRegisterRateLimit(reqB);
    expect(a2).toBeNull();
    expect(b2).toBeNull();
  });
});
