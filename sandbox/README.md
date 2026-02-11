# Sandbox de ejecución de código

Servidor que ejecuta código (Python, JavaScript, TypeScript, Java, Cypress) en un entorno aislado. Lo usan tanto el **sandbox de admin** como la **ejecución de ejercicios** de los alumnos (vía cola Redis y `POST /run`).

## Ejecución en producción y ejercicios

**Para que los ejercicios y el sandbox de admin funcionen correctamente (sin errores por módulos o dependencias faltantes), el sandbox debe ejecutarse dentro del contenedor Docker.**

En Docker están disponibles:

- `/app` como directorio de trabajo (y raíz para Java/Cypress)
- `/app/node_modules` (playwright, selenium-webdriver, cypress, tsx)
- `/app/selenium/*` (JARs de Selenium para Java)
- `/app/.cache/Cypress` (binario de Cypress)
- Python con selenium y playwright instalados vía pip
- Chromium del sistema para Selenium/Java y navegadores de Playwright/Cypress

Si el servidor se arranca fuera del contenedor (p. ej. `node server.mjs` en local), solo Node (JavaScript/TypeScript) y Python tendrán las rutas correctas; **Java y Cypress fallarán** porque usan rutas bajo `/app`. Para desarrollo local con todos los runtimes se puede usar la variable `SANDBOX_APP_DIR` (ver más abajo).

## Uso

El servicio expone `POST /run` con body JSON: `{ "language", "code", "stdin?" }`.

Lenguajes soportados: `python`, `javascript`, `typescript`, `java`, `cypress-js`, `cypress-ts`.

## Desarrollo local (opcional)

Si quieres ejecutar el servidor fuera de Docker y que Java y Cypress también funcionen:

1. Define la variable de entorno `SANDBOX_APP_DIR` apuntando al directorio del sandbox (donde está `server.mjs`, `node_modules`, etc.).
2. Coloca los JARs de Selenium en `<SANDBOX_APP_DIR>/selenium/`.
3. Ejecuta `npx cypress install` en ese directorio para que el binario quede en `<SANDBOX_APP_DIR>/.cache/Cypress`.

En Docker no hace falta definir `SANDBOX_APP_DIR`; se usa el directorio de trabajo `/app` por defecto.
