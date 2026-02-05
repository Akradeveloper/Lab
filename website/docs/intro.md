# Introducción

**QA Lab** es una web educativa tipo FreeCodeCamp enfocada en **QA (Quality Assurance)** y testing. El objetivo es que los usuarios aprendan testing y calidad de software paso a paso, con un rol de alumno que sigue cursos y un rol de administrador que gestiona el currículo y ve el progreso de los alumnos.

## Características actuales

- **Autenticación** con dos roles: alumno y admin. Registro e inicio de sesión (NextAuth con email y contraseña).
- **Currículo**: módulos, submódulos y lecciones; cada lección tiene contenido (Markdown) y ejercicios (opción múltiple, verdadero/falso, código). Las lecciones pueden tener un nivel de dificultad (aprendiz, junior, mid, senior, especialista).
- **Dashboard del alumno**: saludo, “camino” visual de lecciones del módulo o submódulo activo (puntos por lección: completada, siguiente, pendiente), siguiente lección a realizar, métricas compactas (lecciones completadas, módulos completados, última actividad) y logro reciente. Enlaces discretos a Mi carrera y Módulos.
- **Mi carrera**: métricas, gráficos de actividad y progreso por módulo, listado de avance por módulo y logros derivados.
- **Perfil**: datos del usuario y resumen de progreso.
- **Módulos y lecciones**: el alumno navega por módulos (y submódulos si existen), abre lecciones, responde ejercicios y marca la lección como completada (cuando responde correctamente los ejercicios, si los hay).
- **Ejercicios de código**: soporte para ejercicios tipo CODE con sandbox (por defecto Piston público; opcionalmente Judge0 self-hosted vía variables de entorno).
- **Admin – currículo**: en cada módulo hay pestañas **Submódulos** y **Lecciones** para elegir qué gestionar; se pueden crear el primer submódulo o lecciones directas del módulo. Crear/editar módulos, submódulos y lecciones (título, contenido, orden, dificultad). “Nueva lección con IA” y “Generar ejercicios con IA” (OpenAI). “Ordenar con IA” para que la IA sugiera un orden de lecciones (de básico a complejo) y aplicar ese orden.
- **Admin – alumnos**: listado de alumnos y detalle por alumno (progreso, intentos en lecciones y ejercicios).
- **Admin – base de datos**: backup (descargar archivo .db) y restauración (subir .db) desde la interfaz.
- **Base de datos**: SQLite con Prisma (Module, Submodule, Lesson, Exercise, Progress, etc.). Scripts `npm run db:backup` y `npm run db:restore` desde terminal.

## Enlaces

- Repositorio del proyecto: en la raíz del repo.
- La aplicación se ejecuta con `npm run dev` en la raíz del proyecto (ver [Getting Started](./getting-started.md)).
- Variables de entorno: ver [Variables de entorno](./environment.md).
