import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";
import {
  buildExerciseSystemPrompt,
  buildExerciseUserPrompt,
  CODE_LANGUAGES,
  VALID_DIFFICULTY,
} from "@/lib/ai-prompts";
import {
  getOpenAIModel,
  getAppConfigNumber,
  DEFAULT_EXERCISE_COUNT,
} from "@/lib/app-config";

type Params = { params: Promise<{ lessonId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ---------------------------------------------------------------------------
// Tipos y validación de ejercicios generados por la IA
// ---------------------------------------------------------------------------

type GeneratedExerciseMcTf = {
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  question: string;
  options?: string[];
  correctAnswer: number | boolean;
};

type GeneratedExerciseCode = {
  type: "CODE";
  question: string;
  language: string;
  template: string;
  solution?: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
  difficulty?: string;
};

type GeneratedExercise = GeneratedExerciseMcTf | GeneratedExerciseCode;

function isCodeExercise(
  o: Record<string, unknown>,
): o is GeneratedExerciseCode {
  if (o.type !== "CODE") return false;
  if (typeof o.question !== "string" || !o.question.trim()) return false;
  const lang = o.language;
  if (
    typeof lang !== "string" ||
    !CODE_LANGUAGES.includes(lang as (typeof CODE_LANGUAGES)[number])
  )
    return false;
  if (typeof o.template !== "string") return false;
  if (!Array.isArray(o.testCases) || o.testCases.length === 0) return false;
  for (const tc of o.testCases) {
    if (
      !tc ||
      typeof tc !== "object" ||
      typeof (tc as { input?: unknown }).input !== "string" ||
      typeof (tc as { expectedOutput?: unknown }).expectedOutput !== "string"
    )
      return false;
  }
  return true;
}

function isValidGenerated(ex: unknown): ex is GeneratedExercise {
  if (!ex || typeof ex !== "object") return false;
  const o = ex as Record<string, unknown>;
  if (o.type === "CODE") return isCodeExercise(o);
  if (o.type !== "MULTIPLE_CHOICE" && o.type !== "TRUE_FALSE") return false;
  if (typeof o.question !== "string" || !o.question.trim()) return false;
  if (o.type === "MULTIPLE_CHOICE") {
    if (!Array.isArray(o.options) || o.options.length < 2) return false;
    if (!o.options.every((x: unknown) => typeof x === "string")) return false;
    const idx = o.correctAnswer;
    if (
      typeof idx !== "number" ||
      !Number.isInteger(idx) ||
      idx < 0 ||
      idx >= o.options.length
    )
      return false;
  } else {
    if (typeof o.correctAnswer !== "boolean") return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY no configurada. Añádela en .env para usar la generación con IA.",
      },
      { status: 503 },
    );
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido" },
      { status: 400 },
    );
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, title: true, content: true },
    });
    if (!lesson) {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 },
      );
    }

    const defaultCount = await getAppConfigNumber(
      "default_exercise_count",
      DEFAULT_EXERCISE_COUNT
    );
    const ALLOWED_TYPES = ["MULTIPLE_CHOICE", "TRUE_FALSE", "CODE"] as const;
    let count = defaultCount;
    let allowedTypes: string[] = [...ALLOWED_TYPES];
    let codeLanguage: string | undefined;
    let codeDifficulty: string | undefined;

    try {
      const body = await request.json();
      if (
        body != null &&
        typeof body.count === "number" &&
        Number.isInteger(body.count) &&
        body.count >= 1 &&
        body.count <= 15
      ) {
        count = body.count;
      }
      if (
        body != null &&
        Array.isArray(body.types) &&
        body.types.length > 0
      ) {
        const filtered = body.types.filter(
          (t: unknown) =>
            typeof t === "string" &&
            ALLOWED_TYPES.includes(t as (typeof ALLOWED_TYPES)[number]),
        );
        if (filtered.length > 0) allowedTypes = filtered;
      }
      if (
        body != null &&
        typeof body.codeLanguage === "string" &&
        (CODE_LANGUAGES as readonly string[]).includes(body.codeLanguage)
      ) {
        codeLanguage = body.codeLanguage;
      }
      if (
        body != null &&
        typeof body.codeDifficulty === "string" &&
        VALID_DIFFICULTY.includes(
          body.codeDifficulty as (typeof VALID_DIFFICULTY)[number],
        )
      ) {
        codeDifficulty = body.codeDifficulty;
      }
    } catch {
      // body es opcional
    }

    const systemPrompt = buildExerciseSystemPrompt();
    const userPrompt = buildExerciseUserPrompt({
      lessonTitle: lesson.title,
      lessonContent: lesson.content,
      count,
      allowedTypes:
        allowedTypes.length < ALLOWED_TYPES.length
          ? allowedTypes
          : undefined,
      codeLanguage,
      codeDifficulty,
    });

    const model = await getOpenAIModel();
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "La IA no devolvió contenido" },
        { status: 502 },
      );
    }

    let parsed: { exercises?: unknown[] };
    try {
      parsed = JSON.parse(raw) as { exercises?: unknown[] };
    } catch {
      return NextResponse.json(
        { error: "Respuesta de la IA no es JSON válido" },
        { status: 502 },
      );
    }

    const list = Array.isArray(parsed.exercises) ? parsed.exercises : [];
    const valid = list
      .filter(isValidGenerated)
      .filter((ex) => allowedTypes.includes((ex as { type: string }).type));
    if (valid.length === 0) {
      return NextResponse.json(
        {
          error:
            "La IA no generó ejercicios válidos de los tipos solicitados",
        },
        { status: 502 },
      );
    }

    const existingCount = await prisma.exercise.count({
      where: { lessonId },
    });
    const created = [];
    for (let i = 0; i < valid.length; i++) {
      const ex = valid[i];
      let optionsStr: string;
      let correctStr: string;
      let exerciseDifficulty: string | undefined;

      if (ex.type === "CODE") {
        const lang =
          codeLanguage &&
          (CODE_LANGUAGES as readonly string[]).includes(codeLanguage)
            ? codeLanguage
            : ex.language;
        optionsStr = JSON.stringify({
          language: lang,
          template: ex.template,
          testCases: ex.testCases,
        });
        correctStr =
          ex.solution != null && typeof ex.solution === "string"
            ? ex.solution
            : ex.template;

        // Dificultad: priorizar lo que pidió el admin, luego lo que devolvió la IA
        if (
          codeDifficulty &&
          VALID_DIFFICULTY.includes(
            codeDifficulty as (typeof VALID_DIFFICULTY)[number],
          )
        ) {
          exerciseDifficulty = codeDifficulty;
        } else if (
          ex.difficulty &&
          VALID_DIFFICULTY.includes(
            ex.difficulty as (typeof VALID_DIFFICULTY)[number],
          )
        ) {
          exerciseDifficulty = ex.difficulty;
        }
      } else if (
        ex.type === "MULTIPLE_CHOICE" &&
        ex.options &&
        ex.options.length >= 2
      ) {
        optionsStr = JSON.stringify(ex.options.slice(0, 4));
        correctStr = JSON.stringify(
          typeof ex.correctAnswer === "number" &&
            Number.isInteger(ex.correctAnswer)
            ? ex.correctAnswer
            : 0,
        );
      } else {
        optionsStr = JSON.stringify(["Verdadero", "Falso"]);
        correctStr = JSON.stringify(
          ex.type === "TRUE_FALSE" && ex.correctAnswer === true,
        );
      }

      const exercise = await prisma.exercise.create({
        data: {
          lessonId,
          type: ex.type as "MULTIPLE_CHOICE" | "TRUE_FALSE" | "CODE",
          question: ex.question.trim(),
          options: optionsStr,
          correctAnswer: correctStr,
          order: existingCount + i,
          ...(exerciseDifficulty && {
            difficulty: exerciseDifficulty as
              | "APRENDIZ"
              | "JUNIOR"
              | "MID"
              | "SENIOR"
              | "ESPECIALISTA",
          }),
        },
      });
      created.push(exercise);
    }

    return NextResponse.json(created);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al generar ejercicios con IA:", e);
    }
    return NextResponse.json(
      {
        error:
          (e as Error).message?.includes("API key")
            ? "Error de configuración con OpenAI. Revisa OPENAI_API_KEY."
            : "Error al generar los ejercicios con IA.",
      },
      { status: 500 },
    );
  }
}
