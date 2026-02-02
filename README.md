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

## Usuario admin de prueba (tras `db seed`)

- **Email:** admin@qalab.dev  
- **Contraseña:** admin123  

Los nuevos registros son **alumnos**. Solo el admin puede entrar en `/admin` y ver el listado de alumnos y su progreso.

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
