import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { notFound, serverError, unauthorized } from "@/lib/api-responses";
import { getRedis, JOB_PREFIX } from "@/lib/redis";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { jobId } = await params;
  if (!jobId) return notFound("Job no encontrado");

  try {
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Servicio no disponible" },
        { status: 503 }
      );
    }

    const raw = await redis.get(`${JOB_PREFIX}${jobId}`);
    if (!raw) return notFound("Job no encontrado");

    const job = JSON.parse(raw);
    if (job.userId !== session.user.id) return notFound("Job no encontrado");

    const { userId, code, ...rest } = job;
    return NextResponse.json(rest);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : String(e));
  }
}
