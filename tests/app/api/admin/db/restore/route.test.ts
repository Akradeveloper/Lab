import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/db/restore/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/database-url", () => ({ isMySQL: vi.fn() }));
vi.mock("@/lib/db-path", () => ({ getDbFilePath: vi.fn(() => "/tmp/db.db") }));
vi.mock("@/lib/db-backup-restore", () => ({ restoreFromJson: vi.fn() }));
vi.mock("fs", () => ({ default: { writeFileSync: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $disconnect: vi.fn() },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { isMySQL } = await import("@/lib/database-url");
const { restoreFromJson } = await import("@/lib/db-backup-restore");
const fs = await import("fs");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("POST /api/admin/db/restore", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(isMySQL).mockReturnValue(false);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const form = new FormData();
    form.append("file", new Blob(["SQLite format 3\0"]), "backup.db");
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando no se puede leer el formulario", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = {
      formData: () => Promise.reject(new Error("formData fail")),
    } as unknown as Request;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("No se pudo leer el formulario");
  });

  it("devuelve 400 si no se envía file", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const form = new FormData();
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Selecciona un archivo válido (.db o .json)");
  });

  it("devuelve 200 y restaura con archivo SQLite válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(false);
    const sqliteHeader = Buffer.alloc(16);
    Buffer.from("SQLite format 3\0", "utf8").copy(sqliteHeader);
    const form = new FormData();
    form.append("file", new Blob([sqliteHeader]), "backup.db");
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("restaurada");
  });

  it("devuelve 400 si el archivo no parece SQLite válida", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(false);
    const form = new FormData();
    form.append("file", new Blob([Buffer.from("x")]), "backup.db");
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("SQLite válida");
  });

  it("devuelve 200 con MySQL y archivo .json válido (restoreFromJson)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(true);
    vi.mocked(restoreFromJson).mockResolvedValue(undefined);
    const json = JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), data: { User: [], Module: [], Submodule: [], Lesson: [], Exercise: [], Progress: [], LessonCheckAttempt: [], ExerciseAttempt: [] } });
    const form = new FormData();
    form.append("file", new File([json], "backup.json", { type: "application/json" }));
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("restaurada");
    expect(restoreFromJson).toHaveBeenCalled();
  });

  it("devuelve 400 con MySQL si el archivo .json no es JSON válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(true);
    const form = new FormData();
    form.append("file", new File(["not json at all"], "backup.json", { type: "application/json" }));
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("JSON válido");
  });

  it("L42 rama name.endsWith(.json): acepta archivo .json con contenido válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(true);
    vi.mocked(restoreFromJson).mockResolvedValue(undefined);
    const json = JSON.stringify({ schemaVersion: 1, data: { User: [] } });
    const form = new FormData();
    form.append("file", new File([json], "backup.json", { type: "application/json" }));
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(restoreFromJson).toHaveBeenCalled();
  });

  it("acepta archivo con contenido JSON y nombre sin .json (MySQL, cubre L42 isJson)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(true);
    vi.mocked(restoreFromJson).mockResolvedValue(undefined);
    const json = JSON.stringify({ schemaVersion: 1, data: {} });
    const form = new FormData();
    form.append("file", new File([json], "backup.txt", { type: "application/octet-stream" }));
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(restoreFromJson).toHaveBeenCalled();
  });

  it("devuelve 500 cuando falla restoreFromJson o writeFileSync", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(true);
    vi.mocked(restoreFromJson).mockRejectedValue(new Error("restore error"));
    const json = JSON.stringify({ data: {} });
    const form = new FormData();
    form.append("file", new File([json], "backup.json", { type: "application/json" }));
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("restore error");
  });

  it("devuelve 500 cuando falla writeFileSync (SQLite)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(false);
    vi.mocked(fs.default.writeFileSync).mockImplementation(() => {
      throw new Error("write failed");
    });
    const sqliteHeader = Buffer.alloc(16);
    Buffer.from("SQLite format 3\0", "utf8").copy(sqliteHeader);
    const form = new FormData();
    form.append("file", new Blob([sqliteHeader]), "backup.db");
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("write failed");
  });

  it("devuelve 500 cuando el catch recibe valor no Error (SQLite path)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(false);
    vi.mocked(fs.default.writeFileSync).mockImplementation(() => {
      throw "string error";
    });
    const sqliteHeader = Buffer.alloc(16);
    Buffer.from("SQLite format 3\0", "utf8").copy(sqliteHeader);
    const form = new FormData();
    form.append("file", new Blob([sqliteHeader]), "backup.db");
    const req = new Request("https://x.com", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al restaurar la BD");
  });
});
