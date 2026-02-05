# Variables de entorno

El proyecto usa un archivo `.env` en la raíz. Puedes copiar `.env.example` como base. A continuación se listan todas las variables soportadas.

## Obligatorias

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de la base de datos. Para SQLite local: `file:./prisma/dev.db`. |
| `NEXTAUTH_SECRET` | Secreto para firmar los JWT de NextAuth. Debe ser un valor seguro y distinto en producción. |
| `NEXTAUTH_URL` | URL base de la aplicación (ej. `http://localhost:3000`). Debe coincidir con la URL donde corre la app. |

## Opcionales

### IA (OpenAI)

| Variable | Descripción |
|----------|-------------|
| `OPENAI_API_KEY` | API key de OpenAI. Necesaria para: **Nueva lección con IA** (admin, currículo), **Generar ejercicios con IA** (admin, al gestionar ejercicios de una lección) y **Ordenar con IA** (sugerir orden de lecciones de básico a complejo). Si no está configurada, esos botones devolverán un aviso para añadirla en `.env`. |

### Ejercicios de código (sandbox)

Por defecto los ejercicios de tipo CODE se ejecutan con **Piston** (servicio público en emkc.org). No hace falta configurar nada para usarlo.

Si quieres usar un Piston self-hosted:

| Variable | Descripción |
|----------|-------------|
| `PISTON_URL` | URL del endpoint de Piston (ej. `http://localhost:2000/api/v2/execute`). |

Para usar **Judge0** self-hosted en lugar de Piston:

| Variable | Descripción |
|----------|-------------|
| `SANDBOX_PROVIDER` | Valor `judge0` para activar Judge0. |
| `JUDGE0_URL` | URL de la API Judge0 (ej. `http://localhost:2358`). |
| `JUDGE0_AUTH_TOKEN` | Token de autenticación de Judge0 si tu instancia lo requiere. |

Los pasos para montar Judge0 (p. ej. con Docker) suelen estar en el README del proyecto o en la carpeta `judge0-docker/` si existe en el repo.
