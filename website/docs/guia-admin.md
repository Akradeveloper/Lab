# Guía del administrador

Esta guía describe el flujo típico de un usuario con rol **admin** en QA Lab. Solo los usuarios con rol ADMIN pueden acceder a `/admin`.

## Acceso al panel

Tras iniciar sesión como admin, entra en **Admin** (enlace en el encabezado o ruta `/admin`). Verás un panel con enlaces a:

- **Currículo**: gestión de módulos, submódulos y lecciones.
- **Alumnos**: listado y detalle de alumnos con su progreso.
- **Base de datos**: backup y restauración de la BD.

## Currículo

### Listado de módulos

En **Admin → Currículo** se muestra la lista de módulos. Puedes crear un nuevo módulo, editar o eliminar los existentes. Cada módulo tiene un orden que define su posición en el currículo.

### Dentro de un módulo: pestañas Submódulos y Lecciones

Al entrar en un módulo verás **dos pestañas**: **Submódulos** y **Lecciones**. Debes elegir qué quieres gestionar.

- **Pestaña Submódulos**: Siempre visible. Aquí puedes crear el **primer submódulo** o añadir más. Cada submódulo tiene título, descripción y orden. Si creas submódulos, las lecciones de ese módulo se gestionan dentro de cada submódulo (no como lecciones directas del módulo).
- **Pestaña Lecciones**:  
  - Si el módulo **no tiene** submódulos: aquí creas y editas las **lecciones directas** del módulo (título, contenido Markdown, orden, dificultad).  
  - Si el módulo **sí tiene** submódulos: en esta pestaña verás un mensaje indicando que las lecciones se gestionan dentro de cada submódulo y enlaces a cada submódulo para entrar a gestionar sus lecciones.

Así puedes decidir si un módulo tendrá lecciones directas (sin submódulos) o submódulos con sus propias lecciones, sin quedar obligado a crear lecciones cuando lo que quieres es crear submódulos.

### Crear y editar lecciones

En la lista de lecciones (del módulo o de un submódulo) puedes:

- **Nueva lección**: formulario con título, contenido (Markdown), orden y **dificultad** (Sin asignar, Aprendiz, Junior, Mid, Senior, Especialista).
- **Nueva lección con IA**: si está configurada `OPENAI_API_KEY`, puedes indicar un tema y la IA generará el contenido de la lección (y opcionalmente ejercicios). También hay sugerencia de temas.
- **Ordenar con IA**: botón que pide a la IA un orden de lecciones (de más básico a más complejo), muestra una vista previa y te permite **aplicar** ese orden para actualizar el orden de las lecciones.
- **Editar** una lección (título, contenido, orden, dificultad) o **eliminarla**.

### Ejercicios de una lección

Desde una lección (en la lista de lecciones del módulo o submódulo) puedes entrar a **Gestionar ejercicios**. Ahí puedes:

- Añadir ejercicios (opción múltiple, verdadero/falso, código).
- **Sugerir ejercicios con IA** o **Generar ejercicios con IA** (requiere `OPENAI_API_KEY`).
- Editar o eliminar ejercicios.

## Alumnos

En **Admin → Alumnos** se muestra la lista de alumnos (nombre, email, progreso resumido). Al entrar en un alumno verás su detalle: lecciones completadas, última actividad, intentos en lecciones y ejercicios, etc.

## Base de datos

En **Admin → Base de datos** puedes:

- **Descargar un backup** de la base de datos (archivo .db) para guardarlo en un lugar seguro.
- **Restaurar** subiendo un archivo .db (por ejemplo un backup anterior). La restauración reemplaza la BD actual; úsala con cuidado.

Además, desde la terminal del proyecto puedes usar `npm run db:backup` y `npm run db:restore` (ver README en la raíz).
