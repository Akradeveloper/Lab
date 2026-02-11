# Variables de entorno

El proyecto usa un archivo `.env` en la raíz. Puedes copiar `.env.example` como base. A continuación se listan todas las variables soportadas.

## Obligatorias

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de la base de datos. El proyecto usa **MySQL**; formato típico: `mysql://usuario:contraseña@host:3306/nombre_bd`. Opcionalmente se pueden usar las variables `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`, `DB_USER` para construir la URL (ver `src/lib/database-url.ts`). |
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

**Sandbox propio (Redis + cola):** Si usas el sandbox incluido en el repo (carpeta `sandbox/`, servidor Node que expone `POST /run`), necesitas **Redis** y la URL del sandbox:

| Variable | Descripción |
|----------|-------------|
| `REDIS_URL` | URL de Redis (ej. `redis://localhost:6379`). |
| `SANDBOX_URL` | URL base del servidor sandbox (ej. `http://localhost:3001`). La cola (process-queue) enviará los jobs a `${SANDBOX_URL}/run`. |

Para que la ejecución de ejercicios y el sandbox de admin no tengan errores por módulos o dependencias faltantes (Java, Cypress, Node, Python), el sandbox debe ejecutarse **dentro del contenedor Docker** (donde existen `/app`, JARs de Selenium, binario de Cypress, etc.). Ver [sandbox/README.md](../../sandbox/README.md) en el repo.

## Configuración desde el panel Admin

Parte de la configuración no se define en variables de entorno sino en la base de datos (tabla AppConfig), y se gestiona desde **Admin → Configuración**: modelo de IA, límites de testimonios, rate limit de registro, **tiempo de espera para reenviar proyecto tras rechazo** (por defecto 72 horas), logros (hitos de lecciones), etc. El tiempo de espera para reenviar proyectos se configura en la pestaña "Entregas de proyectos".

## Primer administrador

No hay variables de entorno para crear el usuario admin. El primer administrador se crea registrándose en `/register` y luego asignando el rol `ADMIN` en la base de datos. Detalle en [Getting Started](./getting-started.md#primer-administrador).
