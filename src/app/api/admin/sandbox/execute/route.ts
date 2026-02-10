import { getAdminSession } from "@/lib/api-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-responses";
import {
  getRedis,
  QUEUE_ADMIN,
  JOB_PREFIX,
  JOB_TTL_SEC,
} from "@/lib/redis";
import { randomUUID } from "crypto";

const VALID_LANGS = ["python", "javascript", "java", "typescript"];

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session?.user?.id) return unauthorized();

  try {
    const body = await request.json();
    const { code, language, stdin } = body ?? {};

    if (typeof code !== "string") {
      return badRequest("Falta code");
    }
    if (!VALID_LANGS.includes(language)) {
      return badRequest(
        "language debe ser python, javascript, java o typescript"
      );
    }

    const redis = getRedis();
    if (!redis) {
      return Response.json(
        { error: "Cola no disponible" },
        { status: 503 }
      );
    }

    const jobId = randomUUID();
    const jobKey = `${JOB_PREFIX}${jobId}`;
    const position = await redis.rpush(QUEUE_ADMIN, jobId);

    const jobState = {
      status: "PENDING",
      userId: session.user.id,
      code,
      language,
      source: "admin",
      stdin: typeof stdin === "string" ? stdin : "",
      position,
      createdAt: Date.now(),
    };
    await redis.set(jobKey, JSON.stringify(jobState), "EX", JOB_TTL_SEC);

    return Response.json({ jobId, position });
  } catch (e) {
    return serverError(e instanceof Error ? e.message : String(e));
  }
}
