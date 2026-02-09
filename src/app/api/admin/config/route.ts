import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CONFIG_KEYS,
  getConfigValue,
  getOpenAIModel,
  getAppConfigNumber,
  DEFAULT_MIN_LESSONS_TESTIMONIAL,
  DEFAULT_TESTIMONIAL_MAX_TEXT,
  DEFAULT_TESTIMONIAL_MAX_ROLE_LENGTH,
  DEFAULT_MAX_PREV_CONTENT_LENGTH,
  DEFAULT_MAX_SUGGEST_CONTENT_LENGTH,
  DEFAULT_MAX_PREV_TITLE_LENGTH,
  DEFAULT_EXERCISE_COUNT,
  DEFAULT_RATE_LIMIT_WINDOW_MINUTES,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_PROJECT_SUBMISSION_COOLDOWN_HOURS,
} from "@/lib/app-config";

const ALLOWED_OPENAI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4o-turbo",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
] as const;

/** Máximo de caracteres de contexto recomendado por modelo (~4 chars/token). */
const MODEL_MAX_CONTEXT_CHARS: Record<string, number> = {
  "gpt-4o-mini": 500_000,
  "gpt-4o": 500_000,
  "gpt-4o-turbo": 500_000,
  "gpt-4-turbo": 500_000,
  "gpt-4": 500_000,
  "gpt-3.5-turbo": 60_000,
};

type LimitRanges = {
  max_prev_content_length: { min: number; max: number };
  max_suggest_content_length: { min: number; max: number };
  max_prev_title_length: { min: number; max: number };
};

/** Rangos de los tres límites de contenido según el modelo. */
const MODEL_LIMIT_RANGES: Record<string, LimitRanges> = {
  "gpt-4o-mini": {
    max_prev_content_length: { min: 100, max: 10_000 },
    max_suggest_content_length: { min: 500, max: 100_000 },
    max_prev_title_length: { min: 20, max: 500 },
  },
  "gpt-4o": {
    max_prev_content_length: { min: 100, max: 10_000 },
    max_suggest_content_length: { min: 500, max: 100_000 },
    max_prev_title_length: { min: 20, max: 500 },
  },
  "gpt-4o-turbo": {
    max_prev_content_length: { min: 100, max: 10_000 },
    max_suggest_content_length: { min: 500, max: 100_000 },
    max_prev_title_length: { min: 20, max: 500 },
  },
  "gpt-4-turbo": {
    max_prev_content_length: { min: 100, max: 10_000 },
    max_suggest_content_length: { min: 500, max: 100_000 },
    max_prev_title_length: { min: 20, max: 500 },
  },
  "gpt-4": {
    max_prev_content_length: { min: 100, max: 10_000 },
    max_suggest_content_length: { min: 500, max: 100_000 },
    max_prev_title_length: { min: 20, max: 500 },
  },
  "gpt-3.5-turbo": {
    max_prev_content_length: { min: 100, max: 5_000 },
    max_suggest_content_length: { min: 500, max: 40_000 },
    max_prev_title_length: { min: 20, max: 200 },
  },
};

const NUMERIC_RANGES: Record<
  string,
  { min: number; max: number; default: number }
> = {
  min_lessons_testimonial: { min: 1, max: 50, default: DEFAULT_MIN_LESSONS_TESTIMONIAL },
  testimonial_max_text: { min: 100, max: 2000, default: DEFAULT_TESTIMONIAL_MAX_TEXT },
  testimonial_max_role_length: {
    min: 50,
    max: 300,
    default: DEFAULT_TESTIMONIAL_MAX_ROLE_LENGTH,
  },
  max_prev_content_length: {
    min: 100,
    max: 2000,
    default: DEFAULT_MAX_PREV_CONTENT_LENGTH,
  },
  max_suggest_content_length: {
    min: 500,
    max: 10000,
    default: DEFAULT_MAX_SUGGEST_CONTENT_LENGTH,
  },
  max_prev_title_length: { min: 20, max: 200, default: DEFAULT_MAX_PREV_TITLE_LENGTH },
  default_exercise_count: { min: 1, max: 20, default: DEFAULT_EXERCISE_COUNT },
  rate_limit_window_minutes: {
    min: 1,
    max: 60,
    default: DEFAULT_RATE_LIMIT_WINDOW_MINUTES,
  },
  rate_limit_max_requests: {
    min: 1,
    max: 20,
    default: DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  },
  project_submission_cooldown_hours: {
    min: 1,
    max: 168,
    default: DEFAULT_PROJECT_SUBMISSION_COOLDOWN_HOURS,
  },
};

function isAdmin(session: unknown): boolean {
  const user = (session as { user?: { role?: string } })?.user;
  return user?.role === "ADMIN";
}

/**
 * GET /api/admin/config
 * Devuelve todas las claves conocidas con su valor actual (BD o fallback). Solo ADMIN.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const result: Record<string, string | number | number[]> = {};
    for (const key of CONFIG_KEYS) {
      result[key] = await getConfigValue(key);
    }
    return NextResponse.json(result);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error leyendo config:", e);
    }
    return NextResponse.json(
      { error: "Error al leer la configuración" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/config
 * Body: { updates: { key: value, ... }, testFirst?: boolean }
 * Para openai_model: si testFirst es true, se prueba antes de guardar; si no, se exige probar desde el cliente.
 * Solo ADMIN.
 */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updates = body?.updates;
    const testFirst = body?.testFirst === true;

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Se requiere body.updates (objeto)" },
        { status: 400 }
      );
    }

    if (Object.keys(updates).includes("openai_model") && !testFirst) {
      return NextResponse.json(
        { error: "Para cambiar el modelo de IA debe probarse primero", needTest: true },
        { status: 400 }
      );
    }

    for (const key of Object.keys(updates)) {
      if (!CONFIG_KEYS.includes(key as (typeof CONFIG_KEYS)[number])) {
        return NextResponse.json(
          { error: `Clave no permitida: ${key}` },
          { status: 400 }
        );
      }
    }

    // openai_model: lista blanca
    if (updates.openai_model != null) {
      const model = String(updates.openai_model).trim();
      if (!ALLOWED_OPENAI_MODELS.includes(model as (typeof ALLOWED_OPENAI_MODELS)[number])) {
        return NextResponse.json(
          { error: `Modelo no permitido. Permitidos: ${ALLOWED_OPENAI_MODELS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // testFirst: probar modelo antes de guardar
    if (updates.openai_model != null && testFirst) {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY no configurada" },
          { status: 400 }
        );
      }
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey });
      const model = String(updates.openai_model).trim();
      try {
        await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: "OK" }],
          max_tokens: 5,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al probar el modelo";
        return NextResponse.json(
          { error: "La prueba del modelo falló. No se guardó.", detail: msg },
          { status: 400 }
        );
      }
    }

    const limitKeysByModel = [
      "max_prev_content_length",
      "max_suggest_content_length",
      "max_prev_title_length",
    ] as const;
    const effectiveModel =
      typeof updates.openai_model === "string" && updates.openai_model.trim()
        ? updates.openai_model.trim()
        : await getOpenAIModel();
    const modelLimitRanges = MODEL_LIMIT_RANGES[effectiveModel];

    // Validar rangos numéricos
    for (const [key, value] of Object.entries(updates)) {
      const range =
        modelLimitRanges && limitKeysByModel.includes(key as (typeof limitKeysByModel)[number])
          ? modelLimitRanges[key as keyof LimitRanges]
          : NUMERIC_RANGES[key];
      if (range != null) {
        const n = Number(value);
        if (!Number.isFinite(n) || n < range.min || n > range.max) {
          return NextResponse.json(
            {
              error: `${key} debe ser un número entre ${range.min} y ${range.max}`,
            },
            { status: 400 }
          );
        }
      }

      if (key === "achievement_milestones") {
        const arr = Array.isArray(value) ? value : null;
        if (!arr || !arr.every((x) => typeof x === "number" && Number.isFinite(x))) {
          return NextResponse.json(
            { error: "achievement_milestones debe ser un array de números" },
            { status: 400 }
          );
        }
      }
    }

    // Validar límites de contenido según el modelo actual (suma no puede superar ventana)
    const limitKeys = [
      "max_prev_content_length",
      "max_suggest_content_length",
      "max_prev_title_length",
    ] as const;
    const hasLimitUpdate = limitKeys.some((k) => updates[k] != null);
    if (hasLimitUpdate) {
      const maxChars = MODEL_MAX_CONTEXT_CHARS[effectiveModel];
      if (maxChars != null) {
        const [prev, suggest, title] = await Promise.all([
          getAppConfigNumber(
            "max_prev_content_length",
            DEFAULT_MAX_PREV_CONTENT_LENGTH
          ),
          getAppConfigNumber(
            "max_suggest_content_length",
            DEFAULT_MAX_SUGGEST_CONTENT_LENGTH
          ),
          getAppConfigNumber(
            "max_prev_title_length",
            DEFAULT_MAX_PREV_TITLE_LENGTH
          ),
        ]);
        const effectivePrev =
          updates.max_prev_content_length != null
            ? Number(updates.max_prev_content_length)
            : prev;
        const effectiveSuggest =
          updates.max_suggest_content_length != null
            ? Number(updates.max_suggest_content_length)
            : suggest;
        const effectiveTitle =
          updates.max_prev_title_length != null
            ? Number(updates.max_prev_title_length)
            : title;
        const sum =
          effectivePrev + effectiveSuggest + effectiveTitle;
        if (sum > maxChars) {
          return NextResponse.json(
            {
              error: `Los límites de contenido (suma: ${sum.toLocaleString("es")} caracteres) superan la capacidad recomendada para el modelo ${effectiveModel} (aprox. ${maxChars.toLocaleString("es")} caracteres).`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Upsert en BD
    for (const [key, value] of Object.entries(updates)) {
      const serialized =
        key === "achievement_milestones"
          ? JSON.stringify(value)
          : String(value);
      await prisma.appConfig.upsert({
        where: { key },
        create: { key, value: serialized },
        update: { value: serialized },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error actualizando config:", e);
    }
    return NextResponse.json(
      { error: "Error al guardar la configuración" },
      { status: 500 }
    );
  }
}
