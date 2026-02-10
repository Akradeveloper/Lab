import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/project-submissions/[submissionId]/download/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { projectSubmission: { findUnique: vi.fn() } },
}));
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(() => Buffer.from("content")),
  },
}));
vi.mock("path", () => {
  const join = vi.fn((...args: string[]) => args.join("/"));
  const basename = vi.fn((p: string) => p.split("/").pop() ?? "file.zip");
  return {
    default: { join, basename },
    join,
    basename,
  };
});

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");
const fs = (await import("fs")).default;

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("GET /api/admin/project-submissions/[submissionId]/download", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("content") as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta submissionId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de entrega requerido");
  });

  it("devuelve 404 si la entrega no existe o no es archivo", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Entrega no encontrada o no es un archivo");
  });

  it("devuelve 404 si submissionType no es FILE o no tiene filePath", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      submissionType: "URL",
      filePath: null,
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(404);
  });

  it("devuelve 404 si el archivo ya no existe en disco", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      submissionType: "FILE",
      filePath: "uploads/gone.zip",
    } as never);
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("El archivo ya no está disponible");
  });

  it("devuelve 200 con headers de adjunto cuando el archivo existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      submissionType: "FILE",
      filePath: "uploads/submission.zip",
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain("submission.zip");
  });

  it("devuelve 500 cuando readFileSync lanza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      submissionType: "FILE",
      filePath: "uploads/submission.zip",
    } as never);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al descargar");
  });

  it("L41: ejecuta console.error en catch cuando readFileSync falla y NODE_ENV no production", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      submissionType: "FILE",
      filePath: "uploads/submission.zip",
    } as never);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET(new Request("https://x.com"), {
        params: Promise.resolve({ submissionId: "s1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith("Error al descargar archivo:", expect.any(Error));
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      submissionType: "FILE",
      filePath: "uploads/submission.zip",
    } as never);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET(new Request("https://x.com"), {
        params: Promise.resolve({ submissionId: "s1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
