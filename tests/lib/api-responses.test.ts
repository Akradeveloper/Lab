import { describe, it, expect } from "vitest";
import {
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api-responses";

describe("api-responses", () => {
  it("unauthorized devuelve 403 con error No autorizado", async () => {
    const res = unauthorized();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data).toEqual({ error: "No autorizado" });
  });

  it("badRequest devuelve 400 con el mensaje dado", async () => {
    const res = badRequest("ID requerido");
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "ID requerido" });
  });

  it("notFound devuelve 404 con el mensaje dado", async () => {
    const res = notFound("Recurso no encontrado");
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toEqual({ error: "Recurso no encontrado" });
  });

  it("serverError sin argumento devuelve 500 con mensaje por defecto", async () => {
    const res = serverError();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error interno del servidor");
  });

  it("serverError con mensaje devuelve 500 con ese mensaje", async () => {
    const res = serverError("Error al guardar");
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ error: "Error al guardar" });
  });
});
