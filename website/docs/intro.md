# Introducción

**QA Lab** es una web educativa tipo FreeCodeCamp enfocada en **QA (Quality Assurance)** y testing. El objetivo es que los usuarios aprendan testing y calidad de software paso a paso, con un rol de alumno que sigue cursos y un rol de administrador que puede ver el progreso de los alumnos.

## Características actuales

- Autenticación con **dos roles**: alumno y admin.
- Registro e inicio de sesión (NextAuth con email y contraseña).
- Dashboard para alumnos (área personal).
- Panel de administración donde el admin ve el listado de alumnos y su progreso (lecciones completadas, última actividad).
- Base de datos SQLite con Prisma; preparado para ampliar con cursos y lecciones en el futuro.

## Enlaces

- Repositorio del proyecto: en la raíz del repo.
- La aplicación se ejecuta con `npm run dev` en la raíz del proyecto (ver [Getting Started](./getting-started.md)).
