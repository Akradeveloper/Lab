import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SANDBOX_URL = process.env.SANDBOX_URL?.trim();
const PROCESS_QUEUE_SECRET = process.env.PROCESS_QUEUE_SECRET?.trim();
const DEFAULT_TIMEOUT_MS = 10000;

export async function POST(request: Request) {
  if (!SANDBOX_URL) {
    return NextResponse.json(
      { error: "Sandbox no configurado (SANDBOX_URL)" },
      { status: 503 }
    );
  }
  if (PROCESS_QUEUE_SECRET) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token !== PROCESS_QUEUE_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const job = await prisma.codeExecutionJob.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) {
    return NextResponse.json({ processed: false, message: "No hay jobs pendientes" });
  }

  await prisma.codeExecutionJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const runUrl = `${SANDBOX_URL.replace(/\/$/, "")}/run`;
  let result: { stdout: string; stderr: string; exitCode: number; timedOut: boolean };
  try {
    const res = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: job.language,
        code: job.code,
        stdin: "",
        timeoutMs: DEFAULT_TIMEOUT_MS,
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS + 5000),
    });
    if (!res.ok) {
      throw new Error(`Sandbox respondió ${res.status}`);
    }
    const data = (await res.json()) as {
      stdout?: string;
      stderr?: string;
      exitCode?: number;
      timedOut?: boolean;
    };
    result = {
      stdout: typeof data.stdout === "string" ? data.stdout : "",
      stderr: typeof data.stderr === "string" ? data.stderr : "",
      exitCode: typeof data.exitCode === "number" ? data.exitCode : 1,
      timedOut: Boolean(data.timedOut),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al llamar al sandbox";
    await prisma.codeExecutionJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        error: message,
        completedAt: new Date(),
      },
    });
    return NextResponse.json({
      processed: true,
      jobId: job.id,
      status: "FAILED",
      error: message,
    });
  }

  await prisma.codeExecutionJob.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED",
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    processed: true,
    jobId: job.id,
    status: "COMPLETED",
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
  });
}
