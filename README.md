# QA Lab

Web tipo FreeCodeCamp enfocada en QA: autenticación con roles **alumno** y **admin**. El admin puede ver el progreso de los alumnos.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Prisma + SQLite
- NextAuth.js (Credentials + JWT)

## Cómo arrancar

1. Instalar dependencias: `npm install`
2. Crear BD y tablas: `npx prisma migrate dev`
3. (Opcional) Crear admin de prueba: `npx prisma db seed`
4. Servidor de desarrollo: `npm run dev`

Abre [http://localhost:3000](http://localhost:3000) (o el puerto que indique Next.js).

### Variables de entorno opcionales

- **OPENAI_API_KEY**: para usar **Nueva lección con IA** (admin → currículo → módulo → Nueva lección con IA) y **Generar ejercicios con IA** (en la gestión de ejercicios de una lección). Sin esta variable, esos botones devolverán un aviso para configurarla en `.env`.

## Usuario admin de prueba (tras `db seed`)

- **Email:** admin@qalab.dev  
- **Contraseña:** admin123  

Los nuevos registros son **alumnos**. Solo el admin puede entrar en `/admin` y ver el listado de alumnos y su progreso.

## Backup de la base de datos

Puedes hacer backup y restaurar de dos formas:

- **Desde el panel admin**: en **Admin → Base de datos** puedes descargar un backup (archivo .db) y subir un archivo .db para restaurar, sin usar la terminal.
- **Con scripts**: antes de desplegar (o periódicamente), ejecuta `npm run db:backup`. Se creará un archivo en `backups/` con fecha y hora. Para restaurar (con la aplicación parada): `npm run db:restore -- backups/backup-YYYY-MM-DDTHH-mm-ss.db` (o sin argumento para usar el backup más reciente).

Guarda el archivo de backup en un lugar persistente (copia en tu máquina, artefacto de CI, almacenamiento en la nube) si el servidor de despliegue tiene disco efímero.

En entornos donde el disco se borra en cada despliegue (por ejemplo muchos PaaS), tendrás que ejecutar la restauración después de cada despliegue desde ese archivo guardado, o valorar un servicio de base de datos persistente (por ejemplo Turso para SQLite en la nube).

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
