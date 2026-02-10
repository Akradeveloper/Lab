import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";

const SANDBOX_URL = process.env.SANDBOX_URL?.trim();
const DEFAULT_TIMEOUT_MS = 10000;

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  if (!SANDBOX_URL) {
    return NextResponse.json(
      { error: "Sandbox no configurado (SANDBOX_URL)" },
      { status: 503 }
    );
  }

  let body: { language?: string; code?: string; stdin?: string; timeoutMs?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const language = typeof body.language === "string" ? body.language : "javascript";
  const code = typeof body.code === "string" ? body.code : "";
  const stdin = typeof body.stdin === "string" ? body.stdin : "";
  const timeoutMs =
    typeof body.timeoutMs === "number" && body.timeoutMs > 0
      ? Math.min(body.timeoutMs, 30000)
      : DEFAULT_TIMEOUT_MS;

  const runUrl = `${SANDBOX_URL.replace(/\/$/, "")}/run`;
  try {
    const res = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code, stdin, timeoutMs }),
      signal: AbortSignal.timeout(timeoutMs + 5000),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Sandbox respondió ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al llamar al sandbox";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
