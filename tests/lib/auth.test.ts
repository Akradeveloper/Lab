import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXTAUTH_SECRET: "test-secret", NEXTAUTH_URL: "http://test" },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

const { authOptions } = await import("@/lib/auth");
const { prisma } = await import("@/lib/prisma");
const bcrypt = (await import("bcryptjs")).default;

type CredentialsProvider = {
  options?: { authorize?: (credentials: unknown, req: unknown) => Promise<unknown> };
};
const credentialsProvider = authOptions.providers?.[0] as CredentialsProvider | undefined;
const authorize = credentialsProvider?.options?.authorize?.bind(credentialsProvider?.options);

describe("authOptions", () => {
  describe("CredentialsProvider.authorize", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    });

    it("devuelve null cuando no hay email", async () => {
      const result = await authorize?.({ password: "x" }, {});
      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("devuelve null cuando no hay password", async () => {
      const result = await authorize?.({ email: "a@b.com" }, {});
      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("devuelve null cuando el usuario no existe", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const result = await authorize?.(
        { email: "a@b.com", password: "p" },
        {}
      );
      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "a@b.com" },
      });
    });

    it("devuelve null cuando la contraseña es incorrecta", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        name: "User",
        role: "ALUMNO",
        passwordHash: "hash",
        createdAt: new Date(),
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      const result = await authorize?.(
        { email: "a@b.com", password: "p" },
        {}
      );
      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith("p", "hash");
    });

    it("devuelve usuario sin passwordHash cuando email y contraseña son correctos", async () => {
      const userFromDb = {
        id: "u1",
        email: "a@b.com",
        name: "User",
        role: "ADMIN" as const,
        passwordHash: "hash",
        createdAt: new Date(),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(userFromDb as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      const result = await authorize?.(
        { email: "a@b.com", password: "p" },
        {}
      );
      expect(result).toEqual({
        id: "u1",
        email: "a@b.com",
        name: "User",
        role: "ADMIN",
      });
      expect(result && "passwordHash" in result).toBe(false);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "a@b.com" },
      });
    });
  });

  describe("callbacks.jwt", () => {
    it("añade id y role al token cuando hay user", async () => {
      const token: Record<string, unknown> = {};
      const user = { id: "u1", role: "ADMIN" as const };
      const result = await authOptions.callbacks?.jwt?.({
        token,
        user,
        account: null,
        profile: null,
        trigger: "signIn",
        session: null,
        isNewUser: false,
      });
      expect(result?.id).toBe("u1");
      expect(result?.role).toBe("ADMIN");
    });

    it("devuelve el token sin cambios cuando no hay user", async () => {
      const token = { sub: "x" };
      const result = await authOptions.callbacks?.jwt?.({
        token,
        user: undefined,
        account: null,
        profile: null,
        trigger: "signIn",
        session: null,
        isNewUser: false,
      });
      expect(result).toBe(token);
      expect(result).toEqual({ sub: "x" });
    });
  });

  describe("callbacks.session", () => {
    it("rellena session.user.id y session.user.role desde el token", async () => {
      const session = {
        user: { email: "a@b.com", name: "Test" },
        expires: "",
      };
      const token = { id: "u1", role: "ADMIN" as const };
      const result = await authOptions.callbacks?.session?.({
        session,
        token,
        user: { id: "u1", email: "a@b.com", name: "Test", role: "ADMIN" },
        newSession: undefined,
        trigger: "getSession",
      });
      expect(result?.user?.id).toBe("u1");
      expect(result?.user?.role).toBe("ADMIN");
      expect(result?.user?.email).toBe("a@b.com");
      expect(result?.user?.name).toBe("Test");
    });
  });
});
