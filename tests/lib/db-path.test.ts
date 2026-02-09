import path from "path";
import { describe, it, expect, vi, afterEach } from "vitest";

const existsSyncMock = vi.fn();
vi.mock("fs", () => ({
  default: {
    existsSync: (...args: unknown[]) => existsSyncMock(...args),
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  existsSyncMock.mockReset();
});

describe("db-path", () => {
  describe("getDbFilePath", () => {
    it("devuelve ruta absoluta cuando DATABASE_URL es file: relativa", async () => {
      vi.stubEnv("DATABASE_URL", "file:./prisma/dev.db");
      vi.resetModules();
      const { getDbFilePath } = await import("@/lib/db-path");
      const result = getDbFilePath();
      expect(result).toMatch(/prisma[/\\]dev\.db$/);
      expect(result).not.toContain("file:");
    });

    it("devuelve la misma ruta cuando DATABASE_URL es file: absoluta", async () => {
      vi.stubEnv("DATABASE_URL", "file:/abs/path/db.sqlite");
      vi.resetModules();
      const { getDbFilePath } = await import("@/lib/db-path");
      const result = getDbFilePath();
      expect(result).toBe("/abs/path/db.sqlite");
    });

    it("devuelve path.resolve cuando la ruta es relativa (no absoluta)", async () => {
      vi.stubEnv("DATABASE_URL", "file:relative/path.db");
      vi.resetModules();
      const { getDbFilePath } = await import("@/lib/db-path");
      const result = getDbFilePath();
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toBe(path.resolve(process.cwd(), "relative/path.db"));
    });

    it("lanza si DATABASE_URL no empieza por file:", async () => {
      vi.stubEnv("DATABASE_URL", "mysql://localhost/db");
      vi.resetModules();
      const { getDbFilePath } = await import("@/lib/db-path");
      expect(() => getDbFilePath()).toThrow(
        "backup/restore por archivo solo está disponible con SQLite"
      );
    });

    it("lanza si DATABASE_URL es file: sin path (regex no captura)", async () => {
      vi.stubEnv("DATABASE_URL", "file:");
      vi.resetModules();
      const { getDbFilePath } = await import("@/lib/db-path");
      expect(() => getDbFilePath()).toThrow("DATABASE_URL debe ser una URL file:");
    });
  });

  describe("getDbFilePathOrThrow", () => {
    it("lanza si no es file:", async () => {
      vi.stubEnv("DATABASE_URL", "mysql://x/db");
      vi.resetModules();
      const { getDbFilePathOrThrow } = await import("@/lib/db-path");
      expect(() => getDbFilePathOrThrow()).toThrow("SQLite");
    });

    it("lanza si el archivo no existe", async () => {
      vi.stubEnv("DATABASE_URL", "file:./prisma/nonexistent.db");
      existsSyncMock.mockReturnValue(false);
      vi.resetModules();
      const { getDbFilePathOrThrow } = await import("@/lib/db-path");
      expect(() => getDbFilePathOrThrow()).toThrow("No existe el archivo");
    });

    it("devuelve la ruta si el archivo existe", async () => {
      vi.stubEnv("DATABASE_URL", "file:./prisma/dev.db");
      existsSyncMock.mockReturnValue(true);
      vi.resetModules();
      const { getDbFilePathOrThrow } = await import("@/lib/db-path");
      const result = getDbFilePathOrThrow();
      expect(result).toMatch(/dev\.db$/);
    });
  });
});
