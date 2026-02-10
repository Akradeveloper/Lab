import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 3 });
  }
  return client;
}

export const QUEUE_ALUMNOS = "sandbox:queue:alumnos";
export const QUEUE_ADMIN = "sandbox:queue:admin";
export const JOB_PREFIX = "sandbox:job:";
export const JOB_TTL_SEC = 3600;
