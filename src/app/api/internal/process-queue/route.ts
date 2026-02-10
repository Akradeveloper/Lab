import { NextResponse } from "next/server";
import {
  getRedis,
  QUEUE_ALUMNOS,
  QUEUE_ADMIN,
  JOB_PREFIX,
  JOB_TTL_SEC,
} from "@/lib/redis";

export async function POST() {
  const redis = getRedis();
  const sandboxUrl = process.env.SANDBOX_URL?.replace(/\/$/, "");

  if (!redis || !sandboxUrl) {
    return NextResponse.json(
      { processed: false, reason: "Redis o sandbox no configurados" },
      { status: 503 }
    );
  }

  // BRPOP: admin primero, luego alumnos (timeout 1s para no bloquear)
  const result = await redis.brpop(QUEUE_ADMIN, QUEUE_ALUMNOS, 1);
  if (!result) {
    return NextResponse.json({ processed: false, reason: "cola vacía" });
  }

  const [, jobId] = result;
  const jobKey = `${JOB_PREFIX}${jobId}`;
  const raw = await redis.get(jobKey);
  if (!raw) {
    return NextResponse.json({ processed: false, reason: "job expirado o inexistente" });
  }

  const job = JSON.parse(raw);
  if (job.status !== "PENDING") {
    return NextResponse.json({ processed: false, reason: "job ya procesado" });
  }

  job.status = "RUNNING";
  job.startedAt = Date.now();
  await redis.set(jobKey, JSON.stringify(job), "EX", JOB_TTL_SEC);

  try {
    const res = await fetch(`${sandboxUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: job.language,
        code: job.code,
        stdin: job.stdin ?? "",
      }),
    });
    const data = await res.json().catch(() => ({}));

    job.status = res.ok ? "COMPLETED" : "FAILED";
    job.completedAt = Date.now();
    job.stdout = data.stdout ?? "";
    job.stderr = data.stderr ?? "";
    job.exitCode = data.exitCode ?? (res.ok ? 0 : 1);
    job.timedOut = data.timedOut ?? false;
    if (!res.ok && data.error) job.stderr = (job.stderr || data.error) + "\n";
  } catch (e) {
    job.status = "FAILED";
    job.completedAt = Date.now();
    job.stderr = e instanceof Error ? e.message : String(e);
    job.exitCode = 1;
    job.timedOut = false;
  }

  await redis.set(jobKey, JSON.stringify(job), "EX", JOB_TTL_SEC);
  return NextResponse.json({ processed: true, jobId });
}
