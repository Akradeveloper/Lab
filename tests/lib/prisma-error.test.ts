import { describe, it, expect, vi, beforeEach } from "vitest";
import { handlePrismaError } from "@/lib/prisma-error";

describe("handlePrismaError", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  it("devuelve 404 con el mensaje dado cuando el error es P2025", async () => {
    const res = handlePrismaError(
      { code: "P2025" },
      { notFoundMessage: "Módulo no encontrado" }
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toEqual({ error: "Módulo no encontrado" });
  });

  it("devuelve 500 cuando el error no es P2025", async () => {
    const res = handlePrismaError(
      new Error("Connection refused"),
      { notFoundMessage: "No encontrado" }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("devuelve 500 para error sin code", async () => {
    const res = handlePrismaError(
      { message: "Unknown" },
      { notFoundMessage: "No encontrado" }
    );
    expect(res.status).toBe(500);
  });
});
