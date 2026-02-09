/**
 * Configuración editable desde el panel Admin (AppConfig en BD).
 * Todas las claves tienen fallback a estos valores por defecto si no existen en BD.
 */

import { prisma } from "@/lib/prisma";

// Valores por defecto (mismos que en el plan)
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_MIN_LESSONS_TESTIMONIAL = 5;
export const DEFAULT_TESTIMONIAL_MAX_TEXT = 500;
export const DEFAULT_TESTIMONIAL_MAX_ROLE_LENGTH = 200;
export const DEFAULT_MAX_PREV_CONTENT_LENGTH = 280;
export const DEFAULT_MAX_SUGGEST_CONTENT_LENGTH = 2000;
export const DEFAULT_MAX_PREV_TITLE_LENGTH = 80;
export const DEFAULT_EXERCISE_COUNT = 5;
export const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 15;
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 5;
export const DEFAULT_PROJECT_SUBMISSION_COOLDOWN_HOURS = 72;
export const DEFAULT_ACHIEVEMENT_MILESTONES = [1, 5, 10, 25, 50] as number[];

/** Claves conocidas para GET /api/admin/config */
export const CONFIG_KEYS = [
  "openai_model",
  "min_lessons_testimonial",
  "testimonial_max_text",
  "testimonial_max_role_length",
  "max_prev_content_length",
  "max_suggest_content_length",
  "max_prev_title_length",
  "default_exercise_count",
  "rate_limit_window_minutes",
  "rate_limit_max_requests",
  "project_submission_cooldown_hours",
  "achievement_milestones",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

const FALLBACK_MAP: Record<string, string> = {
  openai_model: DEFAULT_OPENAI_MODEL,
  min_lessons_testimonial: String(DEFAULT_MIN_LESSONS_TESTIMONIAL),
  testimonial_max_text: String(DEFAULT_TESTIMONIAL_MAX_TEXT),
  testimonial_max_role_length: String(DEFAULT_TESTIMONIAL_MAX_ROLE_LENGTH),
  max_prev_content_length: String(DEFAULT_MAX_PREV_CONTENT_LENGTH),
  max_suggest_content_length: String(DEFAULT_MAX_SUGGEST_CONTENT_LENGTH),
  max_prev_title_length: String(DEFAULT_MAX_PREV_TITLE_LENGTH),
  default_exercise_count: String(DEFAULT_EXERCISE_COUNT),
  rate_limit_window_minutes: String(DEFAULT_RATE_LIMIT_WINDOW_MINUTES),
  rate_limit_max_requests: String(DEFAULT_RATE_LIMIT_MAX_REQUESTS),
  project_submission_cooldown_hours: String(DEFAULT_PROJECT_SUBMISSION_COOLDOWN_HOURS),
  achievement_milestones: JSON.stringify(DEFAULT_ACHIEVEMENT_MILESTONES),
};

/**
 * Lee un valor de AppConfig por clave. Devuelve null si no existe.
 */
export async function getAppConfig(key: string): Promise<string | null> {
  const row = await prisma.appConfig.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value ?? null;
}

/**
 * Lee un valor numérico con fallback.
 */
export async function getAppConfigNumber(
  key: string,
  fallback: number
): Promise<number> {
  const raw = await getAppConfig(key);
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Lee un valor JSON con fallback.
 */
export async function getAppConfigJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await getAppConfig(key);
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Modelo OpenAI para generación: BD > env OPENAI_MODEL > "gpt-4o-mini".
 */
export async function getOpenAIModel(): Promise<string> {
  const fromDb = await getAppConfig("openai_model");
  if (fromDb != null && fromDb.trim() !== "") return fromDb.trim();
  const fromEnv = process.env.OPENAI_MODEL?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_OPENAI_MODEL;
}

/**
 * Devuelve el valor actual para una clave (BD o fallback). Usado por GET /api/admin/config.
 */
export async function getConfigValue(
  key: string
): Promise<string | number | number[]> {
  if (key === "achievement_milestones") {
    return getAppConfigJson(
      "achievement_milestones",
      DEFAULT_ACHIEVEMENT_MILESTONES
    );
  }
  if (key === "openai_model") {
    return getOpenAIModel();
  }
  const fallback = FALLBACK_MAP[key];
  if (fallback == null) return "";
  const numKeys = [
    "min_lessons_testimonial",
    "testimonial_max_text",
    "testimonial_max_role_length",
    "max_prev_content_length",
    "max_suggest_content_length",
    "max_prev_title_length",
    "default_exercise_count",
    "rate_limit_window_minutes",
    "rate_limit_max_requests",
    "project_submission_cooldown_hours",
  ];
  if (numKeys.includes(key)) {
    return getAppConfigNumber(key, Number(fallback));
  }
  const raw = await getAppConfig(key);
  return raw ?? fallback;
}
