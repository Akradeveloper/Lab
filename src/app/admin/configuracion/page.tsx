"use client";

import { useState, useEffect, useCallback } from "react";
import { ConfigForm } from "./config-form";

export type ConfigState = {
  openai_model: string;
  min_lessons_testimonial: number;
  testimonial_max_text: number;
  testimonial_max_role_length: number;
  max_prev_content_length: number;
  max_suggest_content_length: number;
  max_prev_title_length: number;
  default_exercise_count: number;
  rate_limit_window_minutes: number;
  rate_limit_max_requests: number;
  project_submission_cooldown_hours: number;
  achievement_milestones: number[];
};

const TABS = [
  { id: "ia", label: "IA" },
  { id: "testimonios", label: "Testimonios" },
  { id: "limites", label: "Límites de contenido" },
  { id: "rate-limit", label: "Rate limit (registro)" },
  { id: "proyectos", label: "Entregas de proyectos" },
  { id: "logros", label: "Logros" },
] as const;

export default function AdminConfiguracionPage() {
  const [config, setConfigState] = useState<ConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("ia");

  const setConfig = useCallback(
    (action: React.SetStateAction<ConfigState>) => {
      setConfigState((prev) => {
        if (prev === null) return null;
        return typeof action === "function" ? action(prev) : action;
      });
    },
    []
  );

  useEffect(() => {
    fetch("/api/admin/config", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar la configuración");
        return r.json();
      })
      .then((data) => {
        setConfigState({
          openai_model: String(data.openai_model ?? "gpt-4o-mini"),
          min_lessons_testimonial: Number(data.min_lessons_testimonial ?? 5),
          testimonial_max_text: Number(data.testimonial_max_text ?? 500),
          testimonial_max_role_length: Number(
            data.testimonial_max_role_length ?? 200
          ),
          max_prev_content_length: Number(data.max_prev_content_length ?? 280),
          max_suggest_content_length: Number(
            data.max_suggest_content_length ?? 2000
          ),
          max_prev_title_length: Number(data.max_prev_title_length ?? 80),
          default_exercise_count: Number(data.default_exercise_count ?? 5),
          rate_limit_window_minutes: Number(
            data.rate_limit_window_minutes ?? 15
          ),
          rate_limit_max_requests: Number(data.rate_limit_max_requests ?? 5),
          project_submission_cooldown_hours: Number(
            data.project_submission_cooldown_hours ?? 72
          ),
          achievement_milestones: Array.isArray(data.achievement_milestones)
            ? data.achievement_milestones.map(Number).filter(Number.isFinite)
            : [1, 5, 10, 25, 50],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="text-muted" aria-busy="true">
        Cargando configuración…
      </p>
    );
  }

  if (error || !config) {
    return (
      <p className="text-destructive">
        {error ?? "No se pudo cargar la configuración"}
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">
        Configuración
      </h1>

      <div className="flex flex-wrap gap-2 border-b border-border mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === id
                ? "bg-surface border border-b-0 border-border -mb-px text-accent"
                : "text-muted hover:text-foreground"
            }`}
            aria-selected={activeTab === id}
          >
            {label}
          </button>
        ))}
      </div>

      <ConfigForm
        config={config}
        setConfig={setConfig}
        activeTab={activeTab}
      />
    </div>
  );
}
