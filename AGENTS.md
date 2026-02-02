# Guía para agentes (Cursor y otros)

Este documento orienta a asistentes de código que trabajan en el repositorio QA Lab.

## Flujo de ramas

- **develop**: rama de integración. Base para todo trabajo nuevo.
- **feature/\***: nuevas funcionalidades. Crear desde `develop`, abrir PR hacia `develop`.
- **fix/\***: corrección de bugs. Crear desde `develop`, abrir PR hacia `develop`.
- **master**: código estable/producción. No hacer commits directos ni PR desde feature/fix hacia master.

## Comportamiento obligatorio antes de implementar

Antes de **implementar cambios de código** (editar archivos, crear páginas, etc.):

1. Comprobar en qué rama se está trabajando (p. ej. `git branch --show-current`).
2. Si la rama **no** es `feature/*` ni `fix/*` (estás en `main`, `master`, `develop`, etc.):
   - **No editar todavía.**
   - Informar al usuario: "Estás en la rama X. Según las reglas del proyecto, el desarrollo debe hacerse en una rama `feature/nombre` o `fix/nombre` creada desde `develop`. ¿Quieres que te indique los comandos para crear la rama y que luego implemente los cambios ahí?"
3. Si el usuario confirma o ya estás en `feature/*` o `fix/*`, proceder con la implementación.

Para más detalle del flujo (comandos, PR, release), ver [website/docs/contributing.md](website/docs/contributing.md).
