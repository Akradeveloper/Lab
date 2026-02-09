import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getDatabaseUrl,
  isMySQL,
  getPrismaAdapterConfig,
} from "@/lib/database-url";

describe("database-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getDatabaseUrl", () => {
    it("devuelve DATABASE_URL si está definida", () => {
      vi.stubEnv("DATABASE_URL", "mysql://u:p@localhost:3306/db");
      expect(getDatabaseUrl()).toBe("mysql://u:p@localhost:3306/db");
    });

    it("construye la URL desde DB_* cuando DATABASE_URL no está definida", () => {
      vi.stubEnv("DATABASE_URL", "");
      vi.stubEnv("DB_HOST", "host");
      vi.stubEnv("DB_NAME", "mydb");
      vi.stubEnv("DB_PASSWORD", "secret");
      vi.stubEnv("DB_PORT", "3306");
      vi.stubEnv("DB_USER", "user");
      expect(getDatabaseUrl()).toBe(
        "mysql://user:secret@host:3306/mydb?ssl=true"
      );
    });

    it("no añade ?ssl=true cuando DB_SSL es false", () => {
      vi.stubEnv("DATABASE_URL", "");
      vi.stubEnv("DB_HOST", "h");
      vi.stubEnv("DB_NAME", "d");
      vi.stubEnv("DB_PASSWORD", "p");
      vi.stubEnv("DB_PORT", "3306");
      vi.stubEnv("DB_USER", "u");
      vi.stubEnv("DB_SSL", "false");
      expect(getDatabaseUrl()).toBe("mysql://u:p@h:3306/d");
    });

    it("lanza si faltan variables DB_* y no hay DATABASE_URL", () => {
      vi.stubEnv("DATABASE_URL", "");
      vi.stubEnv("DB_HOST", "h");
      // faltan DB_NAME, DB_PASSWORD, DB_PORT, DB_USER
      expect(() => getDatabaseUrl()).toThrow("Faltan variables de BD");
    });
  });

  describe("isMySQL", () => {
    it("devuelve true si DATABASE_URL empieza por mysql", () => {
      vi.stubEnv("DATABASE_URL", "mysql://localhost/db");
      expect(isMySQL()).toBe(true);
    });

    it("devuelve true si están definidas todas las DB_*", () => {
      vi.stubEnv("DATABASE_URL", "");
      vi.stubEnv("DB_HOST", "h");
      vi.stubEnv("DB_NAME", "d");
      vi.stubEnv("DB_PASSWORD", "p");
      vi.stubEnv("DB_PORT", "3306");
      vi.stubEnv("DB_USER", "u");
      expect(isMySQL()).toBe(true);
    });

    it("devuelve false si falta alguna DB_*", () => {
      vi.stubEnv("DATABASE_URL", "");
      vi.stubEnv("DB_HOST", "h");
      vi.stubEnv("DB_NAME", "d");
      // falta DB_PASSWORD
      expect(isMySQL()).toBe(false);
    });
  });

  describe("getPrismaAdapterConfig", () => {
    it("devuelve string (getDatabaseUrl) cuando DB_SSL_CA no está definida", () => {
      vi.stubEnv("DATABASE_URL", "mysql://x:y@h:3306/db");
      vi.stubEnv("DB_SSL_CA", "");
      const result = getPrismaAdapterConfig();
      expect(typeof result).toBe("string");
      expect(result).toBe("mysql://x:y@h:3306/db");
    });

    it("devuelve objeto con ssl.ca cuando DB_SSL_CA está definida", () => {
      vi.stubEnv("DB_SSL_CA", "cert-content");
      vi.stubEnv("DB_HOST", "host");
      vi.stubEnv("DB_NAME", "db");
      vi.stubEnv("DB_PASSWORD", "pass");
      vi.stubEnv("DB_PORT", "3306");
      vi.stubEnv("DB_USER", "usr");
      const result = getPrismaAdapterConfig();
      expect(result).toEqual({
        host: "host",
        port: 3306,
        user: "usr",
        password: "pass",
        database: "db",
        ssl: { ca: "cert-content" },
      });
    });

    it("reemplaza \\n por newline en el certificado", () => {
      vi.stubEnv("DB_SSL_CA", "line1\\nline2");
      vi.stubEnv("DB_HOST", "h");
      vi.stubEnv("DB_NAME", "d");
      vi.stubEnv("DB_PASSWORD", "p");
      vi.stubEnv("DB_PORT", "3306");
      vi.stubEnv("DB_USER", "u");
      const result = getPrismaAdapterConfig();
      expect(typeof result).toBe("object");
      expect((result as { ssl: { ca: string } }).ssl.ca).toBe("line1\nline2");
    });

    it("lanza si DB_SSL_CA está definida pero falta alguna DB_*", () => {
      vi.stubEnv("DB_SSL_CA", "cert");
      vi.stubEnv("DB_HOST", "h");
      // faltan DB_NAME, etc.
      expect(() => getPrismaAdapterConfig()).toThrow(
        "DB_SSL_CA está definida; faltan variables de BD"
      );
    });
  });
});
