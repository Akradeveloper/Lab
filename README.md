# QA Lab

Web tipo FreeCodeCamp enfocada en QA: autenticación con roles **alumno** y **admin**. El admin puede ver el progreso de los alumnos.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Prisma + MySQL
- NextAuth.js (Credentials + JWT)

## Cómo arrancar

Necesitas un servidor MySQL en marcha y `DATABASE_URL` en `.env` con formato `mysql://usuario:contraseña@host:3306/nombre_bd`. Crea la base si no existe (ej. `CREATE DATABASE qalab;`).

1. Instalar dependencias: `npm install`
2. Crear tablas: `npx prisma migrate dev` (genera la migración inicial si es la primera vez con MySQL)
3. (Opcional) Seed de currículo de ejemplo: `npx prisma db seed`
4. Servidor de desarrollo: `npm run dev`

Abre [http://localhost:3000](http://localhost:3000) (o el puerto que indique Next.js).

### Variables de entorno opcionales

- **OPENAI_API_KEY**: para usar **Nueva lección con IA** (admin → currículo → módulo → Nueva lección con IA) y **Generar ejercicios con IA** (en la gestión de ejercicios de una lección). Sin esta variable, esos botones devolverán un aviso para configurarla en `.env`.
- **NEXT_PUBLIC_TURNSTILE_SITE_KEY** y **TURNSTILE_SECRET_KEY**: para activar Cloudflare Turnstile en el formulario de registro (anti-bots). Las claves se crean en el dashboard de Cloudflare (Turnstile, modo "Managed"). Si no se configuran, el registro funciona sin CAPTCHA (útil en desarrollo).

## Primer administrador

El seed **no** crea usuarios admin (por seguridad, sin credenciales en código). Para tener un administrador:

1. Regístrate como usuario normal en `/register`.
2. En la base de datos, asigna el rol ADMIN a ese usuario. Con MySQL:  
   `UPDATE user SET role = 'ADMIN' WHERE email = 'tu@email.com';`  
   (o usa Prisma Studio / otro cliente SQL).

Los nuevos registros son **alumnos**. Solo el admin puede entrar en `/admin` y ver el listado de alumnos y su progreso.

## Backup de la base de datos

Con **MySQL**, el panel **Admin → Base de datos** permite descargar un backup (archivo .json) y restaurar subiendo un .json. Los scripts `npm run db:backup` y `npm run db:restore` también soportan MySQL (generan y restauran archivos .json). Para backups externos o producción puedes usar las herramientas del servidor, por ejemplo:

- **Backup:** `mysqldump -u usuario -p nombre_bd > backup.sql`
- **Restaurar:** `mysql -u usuario -p nombre_bd < backup.sql`

En producción (Render, VPS, etc.), programa dumps periódicos o usa las opciones de backup que ofrezca tu proveedor de MySQL.

## Tests y calidad

Los tests están en la carpeta **`tests/`** en la raíz del proyecto (estructura que replica `src/` para localizarlos fácilmente).

- **Ejecutar tests:** `npm test` (modo watch) o `npm run test:run` (una sola vez).
- **Cobertura:** `npm run test:coverage` (genera el informe en `coverage/` y `coverage/lcov.info` para SonarQube).

El CI (GitHub Actions) ejecuta `npm run lint` y `npm run test:coverage` en cada push y en los PR a `develop`/`master`. Si tienes un servidor **SonarQube**, configura en el repositorio los secrets `SONAR_HOST_URL` (URL del servidor) y `SONAR_TOKEN` (token de análisis). El workflow `.github/workflows/ci.yml` enviará las métricas y la cobertura al analizar. Para ejecutar el scanner en local: instala [SonarScanner](https://docs.sonarqube.org/latest/analyzing-source-code/scanners/sonarscanner/) y ejecuta el análisis con `SONAR_HOST_URL` y `SONAR_TOKEN` en el entorno; el proyecto usa `sonar-project.properties` en la raíz.

**SonarQube en Docker:** Si arrancas el stack con `docker compose up` (o `docker-compose up`), se levanta también **SonarQube** en [http://localhost:9001](http://localhost:9001). Para ejecutar el análisis desde tu máquina sin instalar Java: `npm run test:coverage` (generar cobertura) y luego `npm run sonar`. El script lanza un contenedor del scanner que se elimina al terminar (`--rm`) y se comunica con tu SonarQube (p. ej. en Portainer). Configura en `.env`: `SONAR_HOST_URL` (URL del servidor, p. ej. `http://192.168.2.2:9001`) y `SONAR_TOKEN` (token generado en SonarQube). Primer acceso a SonarQube: usuario `admin`, contraseña `admin` (te pedirá cambiarla).

## Documentación

La documentación del proyecto (getting started, arquitectura, contribución) está en **Docusaurus** dentro de la carpeta `website/`:

- Instalar: `cd website && npm install`
- Ver en local: `cd website && npm run start`
- Build: `cd website && npm run build`

## Ramas (flujo de desarrollo)

- **master**: código estable / producción.
- **develop**: integración; las features se fusionan aquí.
- **feature/***: nuevas funcionalidades (crear desde `develop`, PR a `develop`).
- **fix/***: correcciones de bugs (desde `develop`, PR a `develop`).

Los Pull Request se abren contra `develop` y se usa la plantilla en `.github/PULL_REQUEST_TEMPLATE.md`. Detalles en [website/docs/contributing.md](website/docs/contributing.md).
