# Arquitectura

## Stack

- **Next.js 16** (App Router) con TypeScript
- **Tailwind CSS** para estilos
- **Prisma 7** como ORM con **SQLite** (adaptador better-sqlite3)
- **NextAuth** con proveedor Credentials y estrategia JWT (sin adapter de BD de NextAuth)

## Roles

- **ALUMNO**: Accede a `/dashboard`, `/perfil`, `/mi-carrera`, `/modulos` y las lecciones. Ve el camino de lecciones, métricas y puede marcar lecciones completadas.
- **ADMIN**: Accede a `/admin` (currículo, alumnos, base de datos). El middleware restringe `/admin` y sus subrutas solo a sesiones con rol ADMIN.

## Rutas

### Públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Home con enlaces a Login y Registro |
| `/login` | Formulario de inicio de sesión |
| `/register` | Formulario de registro (rol ALUMNO) |

### Protegidas (sesión; alumno o admin)

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Área del alumno: saludo, camino de lecciones, siguiente lección, métricas |
| `/perfil` | Datos del usuario y resumen de progreso |
| `/mi-carrera` | Métricas, gráficos y listado de avance por módulo |
| `/modulos` | Listado de módulos |
| `/modulos/[moduleId]` | Detalle del módulo (submódulos o lecciones directas) |
| `/modulos/[moduleId]/lecciones/[lessonId]` | Lección directa del módulo |
| `/modulos/[moduleId]/submodulos/[submoduleId]` | Lecciones del submódulo |
| `/modulos/[moduleId]/submodulos/[submoduleId]/lecciones/[lessonId]` | Lección dentro del submódulo |

### Protegidas (sesión + rol ADMIN)

| Ruta | Descripción |
|------|-------------|
| `/admin` | Panel de administración (enlaces a Currículo, Alumnos, Base de datos) |
| `/admin/curriculum` | Listado de módulos |
| `/admin/curriculum/[moduleId]` | Módulo con pestañas Submódulos y Lecciones |
| `/admin/curriculum/[moduleId]/lessons/[lessonId]` | Gestión de ejercicios de una lección directa del módulo |
| `/admin/curriculum/[moduleId]/submodules/[submoduleId]` | Submódulo y sus lecciones |
| `/admin/curriculum/[moduleId]/submodules/[submoduleId]/lessons/[lessonId]` | Gestión de ejercicios de una lección del submódulo |
| `/admin/alumnos` | Listado de alumnos |
| `/admin/alumnos/[studentId]` | Detalle de un alumno (progreso, intentos) |
| `/admin/base-de-datos` | Backup y restauración de la BD |

## APIs

### Auth

- `POST /api/auth/register`: Registro (email, password, name). Crea usuario con rol ALUMNO.
- NextAuth: `GET/POST /api/auth/[...nextauth]`: Login, sesión, signOut.

### Curriculum (lectura y progreso; sesión alumno o admin)

- `GET /api/curriculum/modules`: Listado de módulos.
- `GET /api/curriculum/modules/[moduleId]`: Detalle del módulo (con submódulos y lecciones).
- `GET /api/curriculum/lessons/[lessonId]`: Contenido y ejercicios de una lección.
- `POST /api/curriculum/lessons/[lessonId]/check`: Comprobar respuestas de ejercicios (devuelve correcto/incorrecto).
- `POST /api/curriculum/lessons/[lessonId]/complete`: Marcar lección como completada (registra Progress). Requiere haber respondido correctamente los ejercicios si los hay.

### Admin (requieren sesión con rol ADMIN)

- **Alumnos**: `GET /api/admin/students` (listado con progreso).
- **Módulos**: `GET/POST /api/admin/modules`, `PUT /api/admin/modules/[moduleId]`; `GET/POST /api/admin/modules/[moduleId]/submodules`; `GET/POST /api/admin/modules/[moduleId]/lessons`, `PATCH /api/admin/modules/[moduleId]/lessons/reorder`; `GET /api/admin/modules/[moduleId]/suggest-lessons`, `POST /api/admin/modules/[moduleId]/suggest-lessons-order`, `POST /api/admin/modules/[moduleId]/generate-lesson`.
- **Submódulos**: `PUT /api/admin/submodules/[submoduleId]`, `DELETE`; `GET/POST /api/admin/submodules/[submoduleId]/lessons`, `PATCH .../lessons/reorder`; `GET suggest-lessons`, `POST suggest-lessons-order`, `POST generate-lesson`.
- **Lecciones**: `GET/PUT/DELETE /api/admin/lessons/[lessonId]` (incluye campo `difficulty`).
- **Ejercicios**: `GET/POST /api/admin/lessons/[lessonId]/exercises`, `PUT/DELETE /api/admin/exercises/[id]`; `GET suggest-exercises`, `POST generate-exercises`.
- **Base de datos**: `GET /api/admin/db/backup` (descarga .db), `POST /api/admin/db/restore` (sube .db).

## Modelo de datos (Prisma)

- **User**: `id`, `email` (único), `passwordHash`, `name`, `role` (enum ALUMNO | ADMIN), `createdAt`. Relaciones: Progress, LessonCheckAttempt, ExerciseAttempt.
- **Progress**: `id`, `userId`, `courseId` (identificador del módulo), `lessonId`, `completedAt`. Representa una lección completada por un alumno.
- **Module**: `id`, `title`, `description`, `order`, `createdAt`. Tiene Submodules y Lessons (lecciones directas del módulo cuando no hay submódulos).
- **Submodule**: `id`, `moduleId`, `title`, `description`, `order`, `createdAt`. Tiene Lessons.
- **Lesson**: `id`, `moduleId` (opcional), `submoduleId` (opcional), `title`, `content`, `order`, `difficulty` (enum opcional: APRENDIZ, JUNIOR, MID, SENIOR, ESPECIALISTA), `createdAt`. Pertenece a un módulo (lección directa) o a un submódulo. Tiene Exercises.
- **Exercise**: `id`, `lessonId`, `type` (enum MULTIPLE_CHOICE, TRUE_FALSE, CODE), `question`, `options` (JSON), `correctAnswer` (JSON), `order`, `createdAt`.
- **LessonCheckAttempt**: `id`, `userId`, `lessonId`, `allCorrect`, `createdAt`. Registro de intento de comprobación de ejercicios de una lección.
- **ExerciseAttempt**: `id`, `userId`, `exerciseId`, `lessonId`, `correct`, `createdAt`.

Enums: **Role** (ALUMNO, ADMIN), **ExerciseType** (MULTIPLE_CHOICE, TRUE_FALSE, CODE), **DifficultyLevel** (APRENDIZ, JUNIOR, MID, SENIOR, ESPECIALISTA).

La base de datos SQLite se encuentra en `prisma/dev.db` (ruta configurada por `DATABASE_URL`).

## Autenticación

NextAuth usa **Credentials** (email + contraseña). En `authorize` se busca el usuario por email en la BD y se verifica la contraseña con bcrypt. Los callbacks JWT y session añaden `id` y `role` a la sesión. La opción `secret: process.env.NEXTAUTH_SECRET` es obligatoria para cifrar el JWT. Un **middleware** protege las rutas que requieren sesión y restringe `/admin` a usuarios con rol ADMIN.

## Ejercicios de código (sandbox)

Los ejercicios de tipo CODE se ejecutan en un sandbox externo. Por defecto se usa **Piston** (servicio público emkc.org). Opcionalmente se puede configurar **Judge0** self-hosted mediante las variables de entorno `SANDBOX_PROVIDER=judge0`, `JUDGE0_URL` y `JUDGE0_AUTH_TOKEN`. Ver [Variables de entorno](./environment.md).
