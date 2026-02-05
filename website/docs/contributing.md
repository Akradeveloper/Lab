# Contribuir

## Estrategia de ramas

Se usa un flujo tipo **Git Flow simplificado**:

| Rama | Uso |
|------|-----|
| `master` | Código estable / producción. Solo se integra desde `develop` o `release/*`. |
| `develop` | Integración. Las nuevas funcionalidades se fusionan aquí antes de ir a `master`. |
| `feature/*` | Nuevas funcionalidades (ej. `feature/cursos`, `feature/lecciones`). Se crean desde `develop` y se fusionan de vuelta a `develop`. |
| `fix/*` | Correcciones de bugs. Se crean desde `develop` y se fusionan en `develop`. |
| `release/*` | (Opcional) Preparación de release (versionado, changelog). De `develop` a `master`. |

## Flujo de trabajo

1. Asegúrate de estar en `develop` y tenerla actualizada: `git checkout develop && git pull`.
2. Crea una rama desde `develop`:
   - Para una nueva funcionalidad: `git checkout -b feature/nombre-descriptivo`
   - Para un bug: `git checkout -b fix/nombre-descriptivo`
3. Desarrolla y haz commit en tu rama.
4. Abre un **Pull Request** hacia `develop` (no hacia `master`). Usa la [plantilla de PR](https://github.com/tu-org/qa-lab/blob/develop/.github/PULL_REQUEST_TEMPLATE.md) que aparece al crear el PR.
5. Tras la revisión y el merge en `develop`, cuando corresponda se hará integración de `develop` en `master` (por ejemplo para una release).

## Documentación del sitio (Docusaurus)

La documentación vive en la carpeta `website/` del repo.

- Instalar dependencias: `cd website && npm install`
- Levantar en local: `cd website && npm run start`
- Build: `cd website && npm run build`

Si cambias la arquitectura, el flujo de ramas o los pasos de instalación, actualiza los documentos en `website/docs/` (y el README si aplica). Al añadir o cambiar funcionalidades relevantes (rutas, roles, variables de entorno, flujos de usuario), actualiza también los documentos en `website/docs/` y el README cuando corresponda.
