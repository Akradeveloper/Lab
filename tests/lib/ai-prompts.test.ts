import { describe, it, expect } from "vitest";
import {
  VALID_DIFFICULTY,
  CODE_LANGUAGES,
  LANGUAGE_LABELS,
  MAX_PREV_CONTENT_LENGTH,
  MAX_SUGGEST_CONTENT_LENGTH,
  MAX_PREV_TITLE_LENGTH,
  difficultyFragment,
  buildDescriptionSystemPrompt,
  buildModuleDescriptionUserPrompt,
  buildSubmoduleDescriptionUserPrompt,
  buildLessonSystemPrompt,
  buildLessonUserPrompt,
  buildExerciseSystemPrompt,
  buildExerciseUserPrompt,
  buildSuggestLessonsPrompt,
  buildSuggestExercisesPrompt,
  buildProjectSystemPrompt,
  buildProjectUserPrompt,
} from "@/lib/ai-prompts";

describe("ai-prompts", () => {
  describe("constantes", () => {
    it("VALID_DIFFICULTY contiene los niveles esperados", () => {
      expect(VALID_DIFFICULTY).toContain("APRENDIZ");
      expect(VALID_DIFFICULTY).toContain("SENIOR");
      expect(VALID_DIFFICULTY).toHaveLength(5);
    });

    it("CODE_LANGUAGES contiene los 4 lenguajes", () => {
      expect(CODE_LANGUAGES).toEqual(
        expect.arrayContaining(["javascript", "python", "typescript", "java"])
      );
      expect(CODE_LANGUAGES).toHaveLength(4);
    });

    it("LANGUAGE_LABELS tiene etiquetas legibles", () => {
      expect(LANGUAGE_LABELS.javascript).toBe("JavaScript");
      expect(LANGUAGE_LABELS.python).toBe("Python");
    });

    it("MAX_PREV_CONTENT_LENGTH, MAX_SUGGEST_CONTENT_LENGTH, MAX_PREV_TITLE_LENGTH tienen valores numéricos", () => {
      expect(MAX_PREV_CONTENT_LENGTH).toBe(280);
      expect(MAX_SUGGEST_CONTENT_LENGTH).toBe(2000);
      expect(MAX_PREV_TITLE_LENGTH).toBe(80);
    });
  });

  describe("difficultyFragment", () => {
    it("devuelve fragmento para dificultad conocida", () => {
      const r = difficultyFragment("JUNIOR");
      expect(r).toContain("Nivel de dificultad: JUNIOR");
      expect(r).toContain("nivel junior");
    });

    it("devuelve fragmento genérico para dificultad desconocida", () => {
      const r = difficultyFragment("CUSTOM");
      expect(r).toContain("Nivel de dificultad: CUSTOM");
      expect(r).toContain("Adapta el contenido a este nivel");
    });
  });

  describe("buildDescriptionSystemPrompt", () => {
    it("devuelve string con instrucciones QA y Markdown", () => {
      const r = buildDescriptionSystemPrompt();
      expect(r).toContain("QA");
      expect(r).toContain("Markdown");
      expect(r).toContain("Objetivos");
    });
  });

  describe("buildModuleDescriptionUserPrompt", () => {
    it("incluye el título del módulo trimmeado", () => {
      const r = buildModuleDescriptionUserPrompt("  Módulo de pruebas  ");
      expect(r).toContain("Módulo de pruebas");
    });
  });

  describe("buildSubmoduleDescriptionUserPrompt", () => {
    it("incluye módulo y submódulo", () => {
      const r = buildSubmoduleDescriptionUserPrompt("Mod", "  Sub  ");
      expect(r).toContain('"Mod"');
      expect(r).toContain('"Sub"');
    });
  });

  describe("buildLessonSystemPrompt", () => {
    it("devuelve prompt con JSON y code-tabs", () => {
      const r = buildLessonSystemPrompt();
      expect(r).toContain("code-tabs");
      expect(r).toContain("title");
      expect(r).toContain("content");
    });
  });

  describe("buildLessonUserPrompt", () => {
    it("trunca contenido de lecciones previas según límite", () => {
      const r = buildLessonUserPrompt(
        {
          moduleTitle: "Mod",
          existingLessons: [
            {
              title: "L1",
              order: 1,
              content: "x".repeat(400),
            },
          ],
          topic: "Tema",
        },
        { maxPrevContentLength: 50 }
      );
      expect(r).toContain("x".repeat(50) + "...");
    });

    it("indica primera lección cuando no hay existentes", () => {
      const r = buildLessonUserPrompt({
        moduleTitle: "Mod",
        existingLessons: [],
        topic: "Tema",
      });
      expect(r).toContain("primera lección");
    });

    it("incluye submoduleTitle, submoduleDescription y moduleDescription cuando están definidos", () => {
      const r = buildLessonUserPrompt({
        moduleTitle: "Mod",
        submoduleTitle: "SubMod",
        submoduleDescription: "Desc submódulo",
        moduleDescription: "Desc módulo",
        existingLessons: [{ title: "L1", order: 1, content: "C1" }],
        topic: "Tema",
      });
      expect(r).toContain('Submódulo: "SubMod"');
      expect(r).toContain("Descripción del submódulo: Desc submódulo");
      expect(r).toContain("Descripción del módulo: Desc módulo");
      expect(r).toContain("submódulo");
    });
  });

  describe("buildExerciseSystemPrompt", () => {
    it("menciona tipos MULTIPLE_CHOICE, TRUE_FALSE, CODE", () => {
      const r = buildExerciseSystemPrompt();
      expect(r).toContain("MULTIPLE_CHOICE");
      expect(r).toContain("TRUE_FALSE");
      expect(r).toContain("CODE");
    });
  });

  describe("buildExerciseUserPrompt", () => {
    it("incluye título y contenido de lección", () => {
      const r = buildExerciseUserPrompt({
        lessonTitle: "Lección",
        lessonContent: "Contenido",
        count: 3,
      });
      expect(r).toContain("Lección");
      expect(r).toContain("Contenido");
      expect(r).toContain("3");
    });

    it("añade difficulty cuando codeDifficulty está definido", () => {
      const r = buildExerciseUserPrompt({
        lessonTitle: "L",
        lessonContent: "C",
        count: 1,
        codeDifficulty: "MID",
      });
      expect(r).toContain("MID");
      expect(r).toContain("dificultad");
    });
  });

  describe("buildSuggestLessonsPrompt", () => {
    it("lista lecciones existentes o (ninguna todavía)", () => {
      const r = buildSuggestLessonsPrompt({
        moduleTitle: "Mod",
        existingLessons: [
          { title: "L1", order: 1 },
          { title: "L2", order: 2 },
        ],
      });
      expect(r).toContain("L1");
      expect(r).toContain("L2");
    });

    it("muestra (ninguna todavía) si no hay lecciones", () => {
      const r = buildSuggestLessonsPrompt({
        moduleTitle: "Mod",
        existingLessons: [],
      });
      expect(r).toContain("ninguna todavía");
    });

    it("incluye submoduleTitle, submoduleDescription y moduleDescription y usa 'submódulo' cuando submoduleTitle está definido", () => {
      const r = buildSuggestLessonsPrompt({
        moduleTitle: "Mod",
        submoduleTitle: "Sub",
        submoduleDescription: "Desc sub",
        moduleDescription: "Desc mod",
        existingLessons: [{ title: "L1", order: 1 }],
      });
      expect(r).toContain('Submódulo: "Sub"');
      expect(r).toContain("Descripción del submódulo: Desc sub");
      expect(r).toContain("Descripción del módulo: Desc mod");
      expect(r).toContain("submódulo");
    });
  });

  describe("buildSuggestExercisesPrompt", () => {
    it("trunca contenido de lección según límite", () => {
      const r = buildSuggestExercisesPrompt(
        {
          lessonTitle: "L",
          lessonContent: "y".repeat(3000),
          previousLessons: [],
        },
        { maxSuggestContentLength: 100 }
      );
      expect(r).toContain("y".repeat(100) + "...");
    });

    it("trunca contenido con límite por defecto cuando no se pasa limits", () => {
      const r = buildSuggestExercisesPrompt({
        lessonTitle: "L",
        lessonContent: "z".repeat(2500),
        previousLessons: [],
      });
      expect(r).toContain("z".repeat(2000) + "...");
    });

    it("no trunca cuando lessonContent.length <= maxContent (incluye contenido completo sin ...)", () => {
      const shortContent = "Contenido breve de la lección.";
      const r = buildSuggestExercisesPrompt(
        {
          lessonTitle: "Lección",
          lessonContent: shortContent,
          previousLessons: [],
        },
        { maxSuggestContentLength: 2000 }
      );
      expect(r).toContain(shortContent);
      expect(r).not.toContain(shortContent + "...");
    });

    it("no trunca cuando lessonContent.length es exactamente maxContent (rama else)", () => {
      const exactContent = "x".repeat(2000);
      const r = buildSuggestExercisesPrompt(
        {
          lessonTitle: "Lección",
          lessonContent: exactContent,
          previousLessons: [],
        },
        { maxSuggestContentLength: 2000 }
      );
      expect(r).toContain(exactContent);
      expect(r).not.toContain(exactContent + "...");
    });
  });

  describe("buildProjectSystemPrompt", () => {
    it("menciona JSON y contenido basado en lecciones", () => {
      const r = buildProjectSystemPrompt();
      expect(r).toContain("JSON");
      expect(r).toContain("proyecto");
    });
  });

  describe("buildProjectUserPrompt", () => {
    it("incluye bloque de lecciones y módulo", () => {
      const r = buildProjectUserPrompt({
        moduleTitle: "Mod",
        previousLessons: [
          { title: "Lección 1", order: 1, content: "Contenido 1" },
        ],
      });
      expect(r).toContain("Lección 1");
      expect(r).toContain("Contenido 1");
      expect(r).toContain("Mod");
    });

    it("incluye submoduleTitle, submoduleDescription y moduleDescription cuando están definidos", () => {
      const r = buildProjectUserPrompt({
        moduleTitle: "Mod",
        submoduleTitle: "SubProy",
        submoduleDescription: "Desc sub",
        moduleDescription: "Desc mod",
        previousLessons: [{ title: "L1", order: 1, content: "C1" }],
      });
      expect(r).toContain('Submódulo: "SubProy"');
      expect(r).toContain("Descripción del submódulo: Desc sub");
      expect(r).toContain("Descripción del módulo: Desc mod");
    });
  });
});
