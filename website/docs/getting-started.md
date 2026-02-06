# Getting Started

## Requisitos

- **Node.js** 18 o superior
- **npm** (o yarn/pnpm)

## Instalación

1. Clona el repositorio y entra en la carpeta del proyecto.

2. Instala dependencias:

```bash
npm install
```

3. Crea el archivo de entorno `.env` en la raíz (puedes copiar de `.env.example` si existe). Variables necesarias:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="cambiar-en-produccion"
NEXTAUTH_URL="http://localhost:3000"
```

(Ajusta `NEXTAUTH_URL` al puerto que uses, por ejemplo `http://localhost:3001` si el 3000 está ocupado.)

Opcional, para funcionalidades con IA (Nueva lección con IA, Generar ejercicios con IA, Ordenar con IA):

```env
OPENAI_API_KEY="sk-..."
```

Opcional, para ejercicios de código: por defecto se usa el sandbox Piston público. Si quieres self-hosted, ver [Variables de entorno](./environment.md) (PISTON_URL, SANDBOX_PROVIDER, Judge0).

4. Crea la base de datos y aplica migraciones:

```bash
npx prisma migrate dev
```

5. (Opcional) Seed de currículo de ejemplo (módulo, lecciones, ejercicios):

```bash
npx prisma db seed
```

El seed **no** crea usuarios admin. Para el primer administrador, ver más abajo.

6. Arranca el servidor de desarrollo:

```bash
npm run dev
```

Abre en el navegador la URL que indique Next.js (por ejemplo `http://localhost:3000` o `http://localhost:3001`).

## Backup y restauración de la base de datos

- **Desde el panel admin**: en Admin → Base de datos puedes descargar un backup (archivo .db) y subir un archivo .db para restaurar.
- **Desde terminal**: `npm run db:backup` crea un archivo en `backups/`. Para restaurar: `npm run db:restore -- backups/backup-YYYY-MM-DDTHH-mm-ss.db` (o sin argumento para usar el más reciente). Ver README en la raíz del proyecto.

## Primer administrador

El seed no crea usuarios admin (por seguridad). Para tener un administrador:

1. Regístrate como usuario normal en `/register`.
2. En la base de datos, asigna el rol ADMIN:  
   `UPDATE user SET role = 'ADMIN' WHERE email = 'tu@email.com';`  
   (o usa Prisma Studio u otro cliente SQL).

Solo los usuarios con rol ADMIN pueden acceder a `/admin`. Los nuevos registros desde la app tienen rol ALUMNO.
