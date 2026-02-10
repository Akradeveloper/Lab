import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { jobId } = await params;
  if (!jobId) return notFound("Job no encontrado");

  try {
    const job = await prisma.codeExecutionJob.findUnique({
      where: { id: jobId },
    });
    if (!job || job.userId !== session.user.id) {
      return notFound("Job no encontrado");
    }

    let position: number | null = null;
    if (job.status === "PENDING") {
      const pendingBefore = await prisma.codeExecutionJob.count({
        where: {
          status: "PENDING",
          createdAt: { lt: job.createdAt },
        },
      });
      position = pendingBefore + 1;
    }

    const payload: {
      status: string;
      position?: number;
      stdout?: string | null;
      stderr?: string | null;
      exitCode?: number | null;
      timedOut?: boolean | null;
      error?: string | null;
    } = {
      status: job.status,
    };
    if (position !== null) payload.position = position;
    if (job.stdout !== undefined) payload.stdout = job.stdout;
    if (job.stderr !== undefined) payload.stderr = job.stderr;
    if (job.exitCode !== undefined) payload.exitCode = job.exitCode;
    if (job.timedOut !== undefined) payload.timedOut = job.timedOut;
    if (job.error !== undefined) payload.error = job.error;

    return NextResponse.json(payload);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al obtener estado del job:", e);
    }
    return serverError("Error al obtener el estado del job");
  }
}
