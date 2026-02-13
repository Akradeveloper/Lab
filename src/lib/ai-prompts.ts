/**
 * Módulo centralizado de prompts para la generación de contenido con IA.
 *
 * Todas las API routes de generación (lecciones, ejercicios, descripciones,
 * sugerencias) importan sus prompts desde aquí para evitar duplicación.
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const VALID_DIFFICULTY = [
  "APRENDIZ",
  "JUNIOR",
  "MID",
  "SENIOR",
  "ESPECIALISTA",
] as const;

export const CODE_LANGUAGES = [
  "javascript",
  "python",
  "typescript",
  "java",
] as const;

/** Etiquetas legibles para los tabs de código en la teoría. */
export const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  typescript: "TypeScript",
  java: "Java",
};

/** Máximo de caracteres de contenido previo enviados como contexto (fallback si no hay config). */
export const MAX_PREV_CONTENT_LENGTH = 280;

/** Máximo de contenido enviado al sugerir ejercicios (fallback). */
export const MAX_SUGGEST_CONTENT_LENGTH = 2000;

/** Máximo de caracteres de título de lección anterior en sugerencias (fallback). */
export const MAX_PREV_TITLE_LENGTH = 80;

// ---------------------------------------------------------------------------
// Fragmentos reutilizables
// ---------------------------------------------------------------------------

const DIFFICULTY_DESCRIPTIONS: Record<string, string> = {
  APRENDIZ:
    "introductorio: sin asumir experiencia previa, conceptos muy básicos.",
  JUNIOR: "nivel junior: conceptos básicos aplicados, ejemplos sencillos.",
  MID: "nivel intermedio: asume conocimientos previos, mayor profundidad.",
  SENIOR:
    "nivel senior: contenido avanzado, mejores prácticas y casos reales.",
  ESPECIALISTA:
    "nivel especialista: experto, temas complejos y optimización.",
};

/**
 * Devuelve un fragmento de prompt que describe el nivel de dificultad.
 * Se usa para ejercicios CODE.
 */
export function difficultyFragment(difficulty: string): string {
  const desc =
    DIFFICULTY_DESCRIPTIONS[difficulty] ??
    "Adapta el contenido a este nivel.";
  return `Nivel de dificultad: ${difficulty}. ${desc} El contenido debe ajustarse a esta profundidad.`;
}

// ---------------------------------------------------------------------------
// Prompts para DESCRIPCIONES de módulos / submódulos
// ---------------------------------------------------------------------------

export function buildDescriptionSystemPrompt(): string {
  return `Eres un creador de contenido para un curso profesional de QA (Quality Assurance / testing). Respondes en español con tono formal y didáctico, sin coloquialismos y con términos técnicos precisos.

La descripción debe tener estructura en Markdown, sin usar ## (no uses encabezados de nivel 2). Usa **negritas** para las etiquetas y listas con guión (-).
- **Objetivos** (o "Qué aprenderás"): lista con 2-4 ítems usando guiones (-).
- **Contenido**: 1-2 frases que presenten el módulo/submódulo y su relevancia en QA.
- Opcional: una frase de cierre.

Responde únicamente con el Markdown de la descripción, sin JSON ni texto extra.`;
}

export function buildModuleDescriptionUserPrompt(title: string): string {
  return `Genera la descripción para el siguiente módulo de un curso de QA: "${title.trim()}". Sigue la estructura indicada (Objetivos con lista, Contenido breve, cierre opcional).`;
}

export function buildSubmoduleDescriptionUserPrompt(
  moduleTitle: string,
  submoduleTitle: string,
): string {
  return `Genera la descripción para el siguiente submódulo de un curso de QA. Módulo: "${moduleTitle}". Submódulo: "${submoduleTitle.trim()}". Sigue la estructura indicada (Objetivos con lista, Contenido breve, cierre opcional).`;
}

// ---------------------------------------------------------------------------
// Prompts para LECCIONES
// ---------------------------------------------------------------------------

/**
 * Prompt de sistema para generar lecciones.
 * Incluye instrucciones de estructura Markdown y tabs multi-lenguaje.
 */
export function buildLessonSystemPrompt(): string {
  return `Eres un creador de contenido para un curso profesional de QA (Quality Assurance / testing).
Genera lecciones en español con tono formal y didáctico, sin coloquialismos. Usa términos técnicos con precisión.

Estructura obligatoria del contenido en Markdown:
1) **Objetivos de aprendizaje**: lista breve (3-5 ítems) al inicio con lo que el alumno logrará.
2) **Desarrollo**: secciones con ## (por ejemplo "Conceptos clave", "Teoría", "Ejemplos"). Párrafos cortos, listas cuando ayude.
3) **Resumen o Puntos clave**: cierre breve al final.

REGLA DE CÓDIGO MULTI-LENGUAJE:
Cuando el contenido incluya ejemplos de código, genera SIEMPRE bloques para los 4 lenguajes (JavaScript, Python, TypeScript y Java) agrupados dentro de delimitadores HTML:
<!-- code-tabs -->
\`\`\`javascript
// código JavaScript
\`\`\`
\`\`\`python
# código Python
\`\`\`
\`\`\`typescript
// código TypeScript
\`\`\`
\`\`\`java
// código Java
\`\`\`
<!-- /code-tabs -->

Si el tema es específico de una herramienta (por ejemplo Jest), muestra el equivalente en cada lenguaje (Pytest para Python, JUnit para Java, etc.).
Nunca generes bloques de código sueltos fuera de <!-- code-tabs --> salvo que sean fragmentos de configuración o pseudocódigo.

Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra:
{"title": "Título de la lección", "content": "Contenido en Markdown siguiendo la estructura anterior"}`;
}

type LessonContext = {
  moduleTitle: string;
  moduleDescription?: string | null;
  submoduleTitle?: string | null;
  submoduleDescription?: string | null;
  existingLessons: Array<{ title: string; order: number; content: string }>;
  topic: string;
};

export type LessonPromptLimits = {
  maxPrevContentLength?: number;
};

/**
 * Prompt de usuario para generar una lección.
 * Ya no acepta un lenguaje concreto; los ejemplos siempre son multi-lenguaje.
 */
export function buildLessonUserPrompt(
  ctx: LessonContext,
  limits?: LessonPromptLimits
): string {
  const maxPrev = limits?.maxPrevContentLength ?? MAX_PREV_CONTENT_LENGTH;
  const previousContext = ctx.existingLessons
    .map((l, i) => {
      const summary =
        l.content.length > maxPrev
          ? l.content.slice(0, maxPrev) + "..."
          : l.content;
      return `Lección ${i + 1} (orden ${l.order}): "${l.title}". Contenido: ${summary}`;
    })
    .join("\n\n");

  const parts: string[] = [];

  parts.push(`Módulo: "${ctx.moduleTitle}".`);
  if (ctx.submoduleTitle) {
    parts.push(`Submódulo: "${ctx.submoduleTitle}".`);
  }
  if (ctx.submoduleDescription) {
    parts.push(`Descripción del submódulo: ${ctx.submoduleDescription}`);
  }
  if (ctx.moduleDescription) {
    parts.push(`Descripción del módulo: ${ctx.moduleDescription}`);
  }

  if (previousContext) {
    const label = ctx.submoduleTitle ? "submódulo" : "módulo";
    parts.push(
      `Lecciones ya existentes en este ${label} (para que la nueva sea un poco más avanzada):\n${previousContext}`,
    );
  } else {
    const label = ctx.submoduleTitle ? "submódulo" : "módulo";
    parts.push(`Es la primera lección del ${label}.`);
  }

  parts.push(
    `Genera la siguiente lección sobre este tema: "${ctx.topic}".`,
    "El contenido debe ser un poco más avanzado que las lecciones anteriores si las hay.",
    "Si el tema es orientado a código (p. ej. Jest, Selenium, scripts, APIs), la sección de ejemplos debe incluir código real dentro de <!-- code-tabs --> con los 4 lenguajes y explicación paso a paso.",
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Prompts para EJERCICIOS
// ---------------------------------------------------------------------------

/**
 * Prompt de sistema para generar ejercicios.
 * Los ejercicios MULTIPLE_CHOICE y TRUE_FALSE no tienen dificultad.
 * Los ejercicios CODE sí incluyen un campo difficulty.
 */
export function buildExerciseSystemPrompt(): string {
  return `Eres un creador de ejercicios de evaluación para un curso de QA.
Genera ejercicios en español basados en el contenido de la lección.

Tipos permitidos:
- MULTIPLE_CHOICE: 4 opciones, una correcta. Sin campo de dificultad.
- TRUE_FALSE: verdadero o falso. Sin campo de dificultad.
- CODE: ejercicio de programación con ejecución de código. Incluye campo "difficulty".
- DESARROLLO: ejercicio de código que el alumno completa y ejecuta; se evalúa por ejecución sin error (exit code 0). Sin testCases ni solution. Genera como máximo 2 ejercicios DESARROLLO por lección. El enunciado debe estar claramente ligado al tema de la lección.

Formato JSON para cada tipo:

MULTIPLE_CHOICE:
{ "type": "MULTIPLE_CHOICE", "question": "enunciado", "options": ["op1","op2","op3","op4"], "correctAnswer": 0 }
(correctAnswer es el índice 0-3 de la opción correcta)

TRUE_FALSE:
{ "type": "TRUE_FALSE", "question": "enunciado", "correctAnswer": true }
(correctAnswer es true o false)

CODE:
{ "type": "CODE", "question": "enunciado", "language": "javascript"|"python"|"typescript"|"java", "template": "código inicial para el alumno (con huecos o pocos cambios)", "solution": "código correcto completo que debe coincidir con la respuesta del alumno", "testCases": [ { "input": "entrada por stdin", "expectedOutput": "salida esperada" } ], "difficulty": "APRENDIZ"|"JUNIOR"|"MID"|"SENIOR"|"ESPECIALISTA" }
Incluir al menos un test case. El campo "solution" es el código solución. El campo "difficulty" es obligatorio para CODE.

DESARROLLO:
{ "type": "DESARROLLO", "question": "enunciado", "language": "javascript"|"python"|"typescript"|"java", "immutablePrefix": "código que ve el alumno antes (opcional, puede ser cadena vacía)", "immutableSuffix": "código que ve el alumno después (opcional)", "editableTemplate": "código que el alumno debe completar o modificar" }
immutablePrefix e immutableSuffix son opcionales (pueden omitirse o ser ""). editableTemplate es obligatorio. No incluir testCases ni solution.

Responde ÚNICAMENTE con un JSON: { "exercises": [ ... ] }.
Mezcla tipos. Las preguntas evalúan comprensión del contenido.`;
}

type ExerciseContext = {
  lessonTitle: string;
  lessonContent: string;
  count: number;
  allowedTypes?: string[];
  codeLanguage?: string;
  codeDifficulty?: string;
  lessonDifficulty?: string;
};

export function buildExerciseUserPrompt(ctx: ExerciseContext): string {
  const parts: string[] = [];

  parts.push(`Lección: "${ctx.lessonTitle}"\n\nContenido:\n${ctx.lessonContent}`);
  parts.push(
    "Los enunciados de todos los ejercicios, en particular los de tipo DESARROLLO, deben ser coherentes con el título y el contenido de la lección.",
  );

  if (ctx.lessonDifficulty) {
    parts.push(
      `La lección tiene nivel de dificultad ${ctx.lessonDifficulty}. Todos los ejercicios (incluidos CODE y DESARROLLO) deben ser acordes a este nivel. ${difficultyFragment(ctx.lessonDifficulty)}`,
    );
  }

  if (ctx.allowedTypes && ctx.allowedTypes.length > 0) {
    parts.push(
      `Genera SOLO ejercicios de estos tipos: ${ctx.allowedTypes.join(", ")}. No incluyas otros tipos.`,
    );
  }

  if (ctx.codeLanguage) {
    const typesDesc = ctx.allowedTypes?.includes("DESARROLLO")
      ? "CODE y DESARROLLO"
      : "CODE";
    parts.push(
      `Para todos los ejercicios de tipo ${typesDesc}, usa únicamente el lenguaje ${ctx.codeLanguage}. El campo "language" debe ser "${ctx.codeLanguage}" y template/solution (o editableTemplate en DESARROLLO) deben estar escritos en ese lenguaje.`,
    );
  }

  if (ctx.codeDifficulty) {
    parts.push(
      `Para todos los ejercicios de tipo CODE, el campo "difficulty" debe ser "${ctx.codeDifficulty}". ${difficultyFragment(ctx.codeDifficulty)}`,
    );
  }

  if (ctx.allowedTypes?.includes("DESARROLLO")) {
    parts.push(
      'Si generas ejercicios de tipo DESARROLLO: usa solo lenguajes soportados por el sandbox (Python, JavaScript, TypeScript, Java con Selenium o Playwright). Las plantillas de código deben ser ejecutables en ese entorno. Incluye como máximo 2 ejercicios de tipo DESARROLLO. El resto deben ser de los otros tipos indicados.',
    );
  }

  parts.push(
    `Genera exactamente ${ctx.count} ejercicios. Responde con JSON: { "exercises": [ ... ] }`,
  );

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Prompts para SUGERENCIAS de lecciones
// ---------------------------------------------------------------------------

type SuggestLessonsContext = {
  moduleTitle: string;
  moduleDescription?: string | null;
  submoduleTitle?: string | null;
  submoduleDescription?: string | null;
  existingLessons: Array<{ title: string; order: number }>;
};

export function buildSuggestLessonsPrompt(
  ctx: SuggestLessonsContext,
): string {
  const lessonsList =
    ctx.existingLessons.map((l, i) => `${i + 1}. ${l.title}`).join("\n") ||
    "(ninguna todavía)";

  const parts: string[] = [
    "Eres un experto en diseño de currículo para cursos de QA (Quality Assurance / testing).",
  ];

  parts.push(`Módulo: "${ctx.moduleTitle}".`);
  if (ctx.submoduleTitle) {
    parts.push(`Submódulo: "${ctx.submoduleTitle}".`);
  }
  if (ctx.submoduleDescription) {
    parts.push(`Descripción del submódulo: ${ctx.submoduleDescription}`);
  }
  if (ctx.moduleDescription) {
    parts.push(`Descripción del módulo: ${ctx.moduleDescription}`);
  }

  parts.push(
    `Lecciones ya creadas en este ${ctx.submoduleTitle ? "submódulo" : "módulo"} (no repitas estos temas):\n${lessonsList}`,
    "Sugiere entre 3 y 5 temas concretos para las siguientes lecciones, sin repetir los existentes, en orden de dificultad creciente.",
    'Responde ÚNICAMENTE con un JSON válido: { "suggestions": [ "tema 1", "tema 2", ... ] }.',
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Prompts para SUGERENCIAS de ejercicios
// ---------------------------------------------------------------------------

type SuggestExercisesContext = {
  lessonTitle: string;
  lessonContent: string;
  previousLessons: Array<{ title: string; order: number }>;
};

export type SuggestExercisesLimits = {
  maxPrevTitleLength?: number;
  maxSuggestContentLength?: number;
};

export function buildSuggestExercisesPrompt(
  ctx: SuggestExercisesContext,
  limits?: SuggestExercisesLimits
): string {
  const maxTitle = limits?.maxPrevTitleLength ?? MAX_PREV_TITLE_LENGTH;
  const maxContent = limits?.maxSuggestContentLength ?? MAX_SUGGEST_CONTENT_LENGTH;
  const previousIndex =
    ctx.previousLessons
      .map((l, i) => `${i + 1}. ${l.title.slice(0, maxTitle)}`)
      .join("\n") || "(ninguna)";

  const contentSnippet =
    ctx.lessonContent.length > maxContent
      ? ctx.lessonContent.slice(0, maxContent) + "..."
      : ctx.lessonContent;

  return `Eres un experto en diseño de ejercicios para cursos de QA.
Índice del módulo (lecciones anteriores a la actual):
${previousIndex}

Lección actual: "${ctx.lessonTitle}"

Contenido de la lección:
${contentSnippet}

Sugiere entre 4 y 6 ideas de ejercicios (pueden ser de tipo test, verdadero/falso o código si el contenido es adecuado). Los ejercicios pueden requerir recordar conceptos de lecciones anteriores.
Responde ÚNICAMENTE con un JSON válido: { "suggestions": [ { "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "CODE", "description": "enunciado o idea breve del ejercicio" }, ... ] }.`;
}

// ---------------------------------------------------------------------------
// Prompts para PROYECTO de fin de módulo/submódulo
// ---------------------------------------------------------------------------

/**
 * Prompt de sistema para generar el enunciado de un proyecto.
 * Regla crítica: el proyecto debe basarse ÚNICAMENTE en el contenido proporcionado.
 */
export function buildProjectSystemPrompt(): string {
  return `Eres un creador de enunciados de proyectos para un curso de QA (Quality Assurance / testing).

Tu tarea es generar el enunciado de un proyecto de fin de módulo o submódulo que el alumno debe realizar.

REGLA OBLIGATORIA: El proyecto debe basarse ÚNICAMENTE en los conceptos, herramientas y temas que aparecen en el contenido de lecciones que se te proporciona. No inventes herramientas, frameworks, tecnologías ni requisitos que no estén mencionados o explicados en ese contenido. Si algo no aparece en el texto proporcionado, no debe formar parte del proyecto. Solo puedes usar lo que está explícitamente en el material dado.

El enunciado debe incluir en Markdown:
- Objetivo del proyecto (qué debe lograr el alumno).
- Contexto breve (basado en las lecciones vistas).
- Requisitos o criterios de entrega (todos derivados del contenido de las lecciones).
- Opcional: sugerencia de estructura o entregables.

Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra:
{"title": "Título del proyecto", "content": "Enunciado completo en Markdown"}`;
}

export type ProjectContext = {
  moduleTitle: string;
  moduleDescription?: string | null;
  submoduleTitle?: string | null;
  submoduleDescription?: string | null;
  previousLessons: Array< { title: string; order: number; content: string } >;
};

/**
 * Construye el prompt de usuario para generar el proyecto.
 * Incluye el contenido real de las lecciones anteriores (ya truncado por el llamador).
 */
export function buildProjectUserPrompt(ctx: ProjectContext): string {
  const lessonsBlock = ctx.previousLessons
    .map(
      (l, i) =>
        `--- Lección ${i + 1} (orden ${l.order}): "${l.title}" ---\n${l.content}`
    )
    .join("\n\n");

  const parts: string[] = [
    "A continuación está el contenido de las lecciones que el alumno ya ha visto. Solo este contenido existe; no hay más material.",
    "",
    lessonsBlock,
    "",
    "---",
    "",
    `Módulo: "${ctx.moduleTitle}".`,
  ];
  if (ctx.submoduleTitle) {
    parts.push(`Submódulo: "${ctx.submoduleTitle}".`);
  }
  if (ctx.submoduleDescription) {
    parts.push(`Descripción del submódulo: ${ctx.submoduleDescription}`);
  }
  if (ctx.moduleDescription) {
    parts.push(`Descripción del módulo: ${ctx.moduleDescription}`);
  }
  parts.push(
    "",
    "Genera el enunciado del proyecto usando SOLO los temas y conceptos que aparecen en el contenido anterior. No añadas nada que no esté en ese contenido. El proyecto debe ser realizable con lo que se ha visto en esas lecciones."
  );

  return parts.join("\n");
}
