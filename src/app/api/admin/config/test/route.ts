import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import { getOpenAIModel } from "@/lib/app-config";

/**
 * POST /api/admin/config/test
 * Body: { model?: string }
 * Prueba la conexión con OpenAI usando el modelo indicado (o el guardado en config).
 * No persiste nada. Solo ADMIN.
 */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY no configurada" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const model =
      typeof body?.model === "string" && body.model.trim()
        ? body.model.trim()
        : await getOpenAIModel();

    const openai = new OpenAI({ apiKey });
    await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Di OK" }],
      max_tokens: 5,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al conectar con OpenAI";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
