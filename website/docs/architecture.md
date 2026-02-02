# Arquitectura

## Stack

- **Next.js 16** (App Router) con TypeScript
- **Tailwind CSS** para estilos
- **Prisma 7** como ORM con **SQLite** (adaptador better-sqlite3)
- **NextAuth** con proveedor Credentials y estrategia JWT (sin adapter de BD de NextAuth)

## Roles

- **ALUMNO**: Puede acceder a `/dashboard`. En el futuro verá cursos y marcará lecciones completadas.
- **ADMIN**: Puede acceder a `/admin` y ver el listado de alumnos con su progreso (lecciones completadas, última actividad). El middleware restringe `/admin` solo a sesiones con rol ADMIN.

## Rutas

| Ruta | Pública/Protegida | Descripción |
|------|-------------------|-------------|
| `/` | Pública | Home con enlaces a Login y Registro |
| `/login` | Pública | Formulario de inicio de sesión |
| `/register` | Pública | Formulario de registro (rol ALUMNO) |
| `/dashboard` | Protegida (sesión) | Área del alumno |
| `/admin` | Protegida (sesión + ADMIN) | Panel de administración |

## APIs

- `POST /api/auth/register`: Registro (email, password, name). Crea usuario con rol ALUMNO.
- NextAuth: `GET/POST /api/auth/[...nextauth]`: Login, sesión, signOut.
- `GET /api/admin/students`: Listado de alumnos con progreso. Requiere sesión con rol ADMIN.

## Modelo de datos (Prisma)

- **User**: `id`, `email` (único), `passwordHash`, `name`, `role` (enum ALUMNO | ADMIN), `createdAt`. Relación 1-N con Progress.
- **Progress**: `id`, `userId`, `courseId`, `lessonId`, `completedAt`. Cada registro representa una lección completada por un alumno. Por ahora los identificadores de curso/lección son strings; el contenido se añadirá más adelante.

La base de datos SQLite se encuentra en `prisma/dev.db` (ruta configurada por `DATABASE_URL`).

## Autenticación

NextAuth usa **Credentials** (email + contraseña). En `authorize` se busca el usuario por email en la BD y se verifica la contraseña con bcrypt. Los callbacks JWT y session añaden `id` y `role` a la sesión. La opción `secret: process.env.NEXTAUTH_SECRET` es obligatoria para cifrar el JWT. Las rutas protegidas usan middleware que comprueba el token y el rol para `/admin`.
