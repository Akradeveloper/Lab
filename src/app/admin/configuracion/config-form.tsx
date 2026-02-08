"use client";

import { useState, useEffect } from "react";
import type { ConfigState } from "./page";

const ALLOWED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4o-turbo",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
] as const;

/** Ventana de contexto por modelo (tokens) y aproximación en caracteres (~4 chars/token). */
const MODEL_CONTEXT_INFO: Record<
  string,
  { contextWindowTokens: number; contextWindowCharsApprox: number }
> = {
  "gpt-4o-mini": { contextWindowTokens: 128_000, contextWindowCharsApprox: 512_000 },
  "gpt-4o": { contextWindowTokens: 128_000, contextWindowCharsApprox: 512_000 },
  "gpt-4o-turbo": { contextWindowTokens: 128_000, contextWindowCharsApprox: 512_000 },
  "gpt-4-turbo": { contextWindowTokens: 128_000, contextWindowCharsApprox: 512_000 },
  "gpt-4": { contextWindowTokens: 128_000, contextWindowCharsApprox: 512_000 },
  "gpt-3.5-turbo": { contextWindowTokens: 16_000, contextWindowCharsApprox: 64_000 },
};

type LimitRanges = {
  max_prev_content_length: { min: number; max: number };
  max_suggest_content_length: { min: number; max: number };
  max_prev_title_length: { min: number; max: number };
};

/** Rangos de los tres límites de contenido según el modelo (ventana de contexto). */
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

const DEFAULT_LIMIT_RANGES: LimitRanges = MODEL_LIMIT_RANGES["gpt-4o-mini"];

type TabId = "ia" | "testimonios" | "limites" | "rate-limit" | "logros";

type Props = {
  config: ConfigState;
  setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
  activeTab: TabId;
};

export function ConfigForm({ config, setConfig, activeTab }: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
  } | null>(null);

  const limitRanges = MODEL_LIMIT_RANGES[config.openai_model] ?? DEFAULT_LIMIT_RANGES;

  useEffect(() => {
    if (activeTab !== "limites") return;
    const r = MODEL_LIMIT_RANGES[config.openai_model] ?? DEFAULT_LIMIT_RANGES;
    const prev = Math.min(r.max_prev_content_length.max, Math.max(r.max_prev_content_length.min, config.max_prev_content_length));
    const suggest = Math.min(r.max_suggest_content_length.max, Math.max(r.max_suggest_content_length.min, config.max_suggest_content_length));
    const title = Math.min(r.max_prev_title_length.max, Math.max(r.max_prev_title_length.min, config.max_prev_title_length));
    if (prev !== config.max_prev_content_length || suggest !== config.max_suggest_content_length || title !== config.max_prev_title_length) {
      setConfig((c) => ({
        ...c,
        max_prev_content_length: prev,
        max_suggest_content_length: suggest,
        max_prev_title_length: title,
      }));
    }
  }, [activeTab, config.openai_model, config.max_prev_content_length, config.max_suggest_content_length, config.max_prev_title_length, setConfig]);

  async function handleTestConnection() {
    setTestResult(null);
    setTesting(true);
    try {
      const res = await fetch("/api/admin/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.openai_model }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      setTestResult({
        ok: data.ok === true,
        error: data.error ?? (res.ok ? undefined : "Error al probar"),
      });
    } catch (e) {
      setTestResult({
        ok: false,
        error: e instanceof Error ? e.message : "Error de conexión",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveIA() {
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: { openai_model: config.openai_model },
          testFirst: true,
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "success", text: "Modelo guardado correctamente" });
        setTestResult(null);
      } else {
        setMessage({
          type: "error",
          text: data.error ?? data.detail ?? `Error ${res.status}`,
        });
      }
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSection(updates: Partial<ConfigState>) {
    setMessage(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) body[k] = v;
      }
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: body }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "success", text: "Configuración guardada" });
        setConfig((prev) => ({ ...prev, ...updates }));
      } else {
        setMessage({
          type: "error",
          text: data.error ?? `Error ${res.status}`,
        });
      }
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  }

  if (activeTab === "ia") {
    return (
      <section className="space-y-4" aria-labelledby="tab-ia">
        <h2 id="tab-ia" className="sr-only">
          Configuración de IA
        </h2>
        <div>
          <label htmlFor="openai_model" className="block text-sm font-medium text-foreground mb-1">
            Modelo OpenAI
          </label>
          <select
            id="openai_model"
            value={config.openai_model}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                openai_model: e.target.value,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-accent"
          >
            {ALLOWED_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 text-sm font-medium rounded bg-surface border border-border text-foreground hover:bg-muted/50 focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            {testing ? "Probando…" : "Probar conexión"}
          </button>
          <button
            type="button"
            onClick={handleSaveIA}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {testResult != null && (
          <p
            className={`text-sm ${testResult.ok ? "text-green-600" : "text-destructive"}`}
          >
            {testResult.ok ? "Conexión correcta." : testResult.error}
          </p>
        )}
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
          >
            {message.text}
          </p>
        )}
      </section>
    );
  }

  if (activeTab === "testimonios") {
    return (
      <section className="space-y-4" aria-labelledby="tab-testimonios">
        <h2 id="tab-testimonios" className="sr-only">
          Testimonios
        </h2>
        <div>
          <label htmlFor="min_lessons_testimonial" className="block text-sm font-medium text-foreground mb-1">
            Mínimo de lecciones para enviar testimonio (1–50)
          </label>
          <input
            id="min_lessons_testimonial"
            type="number"
            min={1}
            max={50}
            value={config.min_lessons_testimonial}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                min_lessons_testimonial: Number(e.target.value) || 5,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <div>
          <label htmlFor="testimonial_max_text" className="block text-sm font-medium text-foreground mb-1">
            Máximo caracteres del texto del testimonio (100–2000)
          </label>
          <input
            id="testimonial_max_text"
            type="number"
            min={100}
            max={2000}
            value={config.testimonial_max_text}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                testimonial_max_text: Number(e.target.value) || 500,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <div>
          <label htmlFor="testimonial_max_role_length" className="block text-sm font-medium text-foreground mb-1">
            Máximo caracteres del rol/título (50–300)
          </label>
          <input
            id="testimonial_max_role_length"
            type="number"
            min={50}
            max={300}
            value={config.testimonial_max_role_length}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                testimonial_max_role_length: Number(e.target.value) || 200,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            handleSaveSection({
              min_lessons_testimonial: config.min_lessons_testimonial,
              testimonial_max_text: config.testimonial_max_text,
              testimonial_max_role_length: config.testimonial_max_role_length,
            })
          }
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 focus:ring-2 focus:ring-accent disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
          >
            {message.text}
          </p>
        )}
      </section>
    );
  }

  if (activeTab === "limites") {
    const contextInfo = MODEL_CONTEXT_INFO[config.openai_model];
    return (
      <section className="space-y-4" aria-labelledby="tab-limites">
        <h2 id="tab-limites" className="sr-only">
          Límites de contenido (IA)
        </h2>
        <div className="rounded-lg border border-border bg-surface/50 p-4 text-sm">
          <p className="font-medium text-foreground">
            Modelo actual: {config.openai_model}
          </p>
          {contextInfo ? (
            <p className="mt-1 text-muted">
              Ventana de contexto: {contextInfo.contextWindowTokens.toLocaleString("es")} tokens
              (aprox. {contextInfo.contextWindowCharsApprox.toLocaleString("es")} caracteres).
            </p>
          ) : (
            <p className="mt-1 text-muted">Ventana no definida para este modelo.</p>
          )}
          <p className="mt-2 text-muted">
            Estos límites controlan cuánto contenido se envía en cada petición. No conviene que la
            suma del contenido supere la ventana del modelo.
          </p>
        </div>
        <div>
          <label htmlFor="max_prev_content_length" className="block text-sm font-medium text-foreground mb-1">
            Máximo caracteres de contenido previo enviado a IA (
            {limitRanges.max_prev_content_length.min}–
            {limitRanges.max_prev_content_length.max.toLocaleString("es")})
          </label>
          <input
            id="max_prev_content_length"
            type="number"
            min={limitRanges.max_prev_content_length.min}
            max={limitRanges.max_prev_content_length.max}
            value={config.max_prev_content_length}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                max_prev_content_length: Number(e.target.value) || limitRanges.max_prev_content_length.min,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <div>
          <label htmlFor="max_suggest_content_length" className="block text-sm font-medium text-foreground mb-1">
            Máximo contenido al sugerir ejercicios (
            {limitRanges.max_suggest_content_length.min}–
            {limitRanges.max_suggest_content_length.max.toLocaleString("es")})
          </label>
          <input
            id="max_suggest_content_length"
            type="number"
            min={limitRanges.max_suggest_content_length.min}
            max={limitRanges.max_suggest_content_length.max}
            value={config.max_suggest_content_length}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                max_suggest_content_length: Number(e.target.value) || limitRanges.max_suggest_content_length.min,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <div>
          <label htmlFor="max_prev_title_length" className="block text-sm font-medium text-foreground mb-1">
            Máximo caracteres de título en sugerencias (
            {limitRanges.max_prev_title_length.min}–
            {limitRanges.max_prev_title_length.max})
          </label>
          <input
            id="max_prev_title_length"
            type="number"
            min={limitRanges.max_prev_title_length.min}
            max={limitRanges.max_prev_title_length.max}
            value={config.max_prev_title_length}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                max_prev_title_length: Number(e.target.value) || limitRanges.max_prev_title_length.min,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <div>
          <label htmlFor="default_exercise_count" className="block text-sm font-medium text-foreground mb-1">
            Número de ejercicios a generar por defecto (1–20)
          </label>
          <input
            id="default_exercise_count"
            type="number"
            min={1}
            max={20}
            value={config.default_exercise_count}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                default_exercise_count: Number(e.target.value) || 5,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            handleSaveSection({
              max_prev_content_length: config.max_prev_content_length,
              max_suggest_content_length: config.max_suggest_content_length,
              max_prev_title_length: config.max_prev_title_length,
              default_exercise_count: config.default_exercise_count,
            })
          }
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 focus:ring-2 focus:ring-accent disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
          >
            {message.text}
          </p>
        )}
      </section>
    );
  }

  if (activeTab === "rate-limit") {
    return (
      <section className="space-y-4" aria-labelledby="tab-rate-limit">
        <h2 id="tab-rate-limit" className="sr-only">
          Rate limit de registro
        </h2>
        <div>
          <label htmlFor="rate_limit_window_minutes" className="block text-sm font-medium text-foreground mb-1">
            Ventana en minutos (1–60)
          </label>
          <input
            id="rate_limit_window_minutes"
            type="number"
            min={1}
            max={60}
            value={config.rate_limit_window_minutes}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                rate_limit_window_minutes: Number(e.target.value) || 15,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <div>
          <label htmlFor="rate_limit_max_requests" className="block text-sm font-medium text-foreground mb-1">
            Máximo intentos de registro por IP en la ventana (1–20)
          </label>
          <input
            id="rate_limit_max_requests"
            type="number"
            min={1}
            max={20}
            value={config.rate_limit_max_requests}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                rate_limit_max_requests: Number(e.target.value) || 5,
              }))
            }
            className="w-full max-w-xs px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <p className="text-sm text-muted">
          Intentos máximos de registro por IP en la ventana de tiempo.
        </p>
        <button
          type="button"
          onClick={() =>
            handleSaveSection({
              rate_limit_window_minutes: config.rate_limit_window_minutes,
              rate_limit_max_requests: config.rate_limit_max_requests,
            })
          }
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 focus:ring-2 focus:ring-accent disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
          >
            {message.text}
          </p>
        )}
      </section>
    );
  }

  if (activeTab === "logros") {
    const milestonesStr = config.achievement_milestones.join(", ");
    return (
      <section className="space-y-4" aria-labelledby="tab-logros">
        <h2 id="tab-logros" className="sr-only">
          Logros
        </h2>
        <div>
          <label htmlFor="achievement_milestones" className="block text-sm font-medium text-foreground mb-1">
            Números de lecciones que desbloquean logros (array JSON, p. ej. [1, 5, 10, 25, 50])
          </label>
          <input
            id="achievement_milestones"
            type="text"
            value={milestonesStr}
            onChange={(e) => {
              const raw = e.target.value.trim();
              const arr = raw
                ? raw
                    .split(/[\s,]+/)
                    .map((x) => Number(x))
                    .filter(Number.isFinite)
                : [];
              setConfig((prev) => ({
                ...prev,
                achievement_milestones: arr.length > 0 ? arr : [1, 5, 10, 25, 50],
              }));
            }}
            placeholder="1, 5, 10, 25, 50"
            className="w-full max-w-md px-3 py-2 border border-border rounded bg-background text-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            handleSaveSection({
              achievement_milestones: config.achievement_milestones,
            })
          }
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 focus:ring-2 focus:ring-accent disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
          >
            {message.text}
          </p>
        )}
      </section>
    );
  }

  return null;
}
