import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/db/backup/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/database-url", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/database-url")>();
  return { ...actual, isMySQL: vi.fn() };
});
vi.mock("@/lib/db-path", () => ({ getDbFilePathOrThrow: vi.fn() }));
vi.mock("@/lib/db-backup-restore", () => ({ exportBackupToJson: vi.fn() }));
vi.mock("fs", () => ({
  default: { readFileSync: vi.fn(() => Buffer.from("sqlite")) },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { isMySQL } = await import("@/lib/database-url");
const { getDbFilePathOrThrow } = await import("@/lib/db-path");
const { exportBackupToJson } = await import("@/lib/db-backup-restore");
const fs = (await import("fs")).default;

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("GET /api/admin/db/backup", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(isMySQL).mockReturnValue(false);
    vi.mocked(getDbFilePathOrThrow).mockReturnValue("/tmp/db.db");
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("sqlite") as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 200 con archivo .db cuando es SQLite", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(false);
    vi.mocked(getDbFilePathOrThrow).mockReturnValue("/tmp/test.db");
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("sqlite") as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("backup-");
    expect(res.headers.get("Content-Disposition")).toContain(".db");
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
  });

  it("devuelve 200 con JSON cuando es MySQL", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(true);
    vi.mocked(exportBackupToJson).mockResolvedValue({ modules: [] } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain(".json");
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const text = await res.text();
    expect(text).toContain("modules");
  });

  it("devuelve 500 cuando ocurre error en el backup", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(false);
    vi.mocked(getDbFilePathOrThrow).mockImplementation(() => {
      throw new Error("No existe el archivo");
    });
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("devuelve 500 cuando readFileSync lanza (catch L42)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(false);
    vi.mocked(getDbFilePathOrThrow).mockReturnValue("/tmp/db.db");
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("EACCES");
    });
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("EACCES");
  });

  it("devuelve 500 cuando exportBackupToJson lanza (MySQL)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(isMySQL).mockReturnValue(true);
    vi.mocked(exportBackupToJson).mockRejectedValue(new Error("DB connection lost"));
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("DB connection lost");
  });
});
