# Guía del alumno

Esta guía describe el flujo típico de un usuario con rol **alumno** en QA Lab.

## Acceso e inicio de sesión

Tras registrarte o iniciar sesión, serás redirigido al **dashboard** (área de inicio del alumno). Desde el encabezado puedes ir a Inicio (dashboard), Mi carrera, Módulos y Perfil, o cerrar sesión.

## Dashboard (Inicio)

En la página de inicio verás:

- Un **saludo** con tu nombre y una línea motivacional según tu estado (por ejemplo "Tu primera lección te espera" o "Continúa donde lo dejaste").
- **Camino de lecciones**: si tienes un módulo o submódulo "activo" (donde te queda la siguiente lección), se muestra una lista visual en forma de camino: cada punto es una lección (completada, siguiente o pendiente). La **siguiente lección** aparece destacada con un botón "Ir a la lección" para continuar.
- Si no hay siguiente lección (todo completado o aún no hay contenido), verás un mensaje acorde.
- **Resumen compacto**: número de lecciones completadas, módulos completados y última actividad.
- **Logro reciente**: si tienes algún logro derivado (por ejemplo "Primera lección completada"), se muestra el más reciente.
- Enlaces discretos a **Mi carrera** y **Módulos**.

## Mi carrera

En Mi carrera puedes ver:

- **Métricas**: lecciones completadas, módulos completados, última actividad.
- **Gráficos**: actividad en el tiempo y progreso por módulo.
- **Completitud global** (porcentaje del currículo completado).
- **Listado de avance por módulo** con enlaces a cada módulo.
- **Logros** y **actividad reciente** (últimas lecciones completadas).

## Módulos y lecciones

Desde **Módulos** accedes al listado de módulos del currículo. Al entrar en un módulo:

- Si el módulo tiene **submódulos**, verás la lista de submódulos; entra en uno para ver sus lecciones.
- Si el módulo no tiene submódulos, verás directamente la lista de **lecciones** del módulo.

Cada lección tiene:

- **Contenido** en Markdown (texto, listas, código, etc.).
- **Ejercicios** al final (opción múltiple, verdadero/falso o código). Debes responderlos; si hay ejercicios, tendrás que responder correctamente para poder marcar la lección como completada.
- Un botón para **marcar la lección como completada**. Solo se registrará como completada si has respondido bien todos los ejercicios (o si la lección no tiene ejercicios).

El progreso (lecciones completadas) se usa en el dashboard para mostrar tu siguiente lección y en Mi carrera para las métricas y gráficos.

## Perfil

En Perfil puedes ver tus datos (nombre, email, rol, fecha de alta) y un resumen de tu progreso (métricas y avance por módulo). Es una vista de consulta; el registro y la gestión de cuenta se hacen con la misma sesión (NextAuth).
