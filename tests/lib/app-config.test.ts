import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAppConfig,
  getAppConfigNumber,
  getAppConfigJson,
  CONFIG_KEYS,
  DEFAULT_MIN_LESSONS_TESTIMONIAL,
} from "@/lib/app-config";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");

describe("app-config", () => {
  beforeEach(() => {
    vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(null);
  });

  describe("getAppConfig", () => {
    it("devuelve null si la clave no existe en BD", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(null);
      const result = await getAppConfig("min_lessons_testimonial");
      expect(result).toBeNull();
    });

    it("devuelve el valor si la clave existe", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
        value: "10",
      } as never);
      const result = await getAppConfig("min_lessons_testimonial");
      expect(result).toBe("10");
    });
  });

  describe("getAppConfigNumber", () => {
    it("devuelve fallback cuando la clave no existe", async () => {
      const result = await getAppConfigNumber(
        "min_lessons_testimonial",
        DEFAULT_MIN_LESSONS_TESTIMONIAL
      );
      expect(result).toBe(DEFAULT_MIN_LESSONS_TESTIMONIAL);
    });

    it("devuelve el número de BD cuando existe", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
        value: "7",
      } as never);
      const result = await getAppConfigNumber(
        "min_lessons_testimonial",
        DEFAULT_MIN_LESSONS_TESTIMONIAL
      );
      expect(result).toBe(7);
    });

    it("devuelve fallback cuando el valor no es numérico", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
        value: "not-a-number",
      } as never);
      const result = await getAppConfigNumber(
        "min_lessons_testimonial",
        DEFAULT_MIN_LESSONS_TESTIMONIAL
      );
      expect(result).toBe(DEFAULT_MIN_LESSONS_TESTIMONIAL);
    });
  });

  describe("getAppConfigJson", () => {
    it("devuelve fallback cuando la clave no existe", async () => {
      const fallback = [1, 5, 10];
      const result = await getAppConfigJson(
        "achievement_milestones",
        fallback
      );
      expect(result).toEqual(fallback);
    });

    it("devuelve el JSON parseado cuando existe", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
        value: "[1, 5, 10, 25]",
      } as never);
      const result = await getAppConfigJson(
        "achievement_milestones",
        [1, 5, 10]
      );
      expect(result).toEqual([1, 5, 10, 25]);
    });
  });

  describe("CONFIG_KEYS", () => {
    it("contiene claves esperadas", () => {
      expect(CONFIG_KEYS).toContain("openai_model");
      expect(CONFIG_KEYS).toContain("min_lessons_testimonial");
      expect(CONFIG_KEYS).toContain("achievement_milestones");
    });
  });
});
