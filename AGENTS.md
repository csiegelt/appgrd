# Corrección de producción

Codex implementa; Claude Code revisa mediante `npm run ai`.
Sigue [docs/ai/revision-claude.md](docs/ai/revision-claude.md).
Tarea: `economics-graphs`, base `3ab7dd8b24163bf4a365f6dafadaede3a2570547`,
rama `hotfix/produccion`. Mejorar guías a los ejes, etiquetas y explicaciones
interactivas de economía, excedentes y pérdidas; revisar resultados de escala.

Actualizar descriptor y evidencia; ejecutar `npm run ai -- test economics-graphs`,
crear commit y ejecutar `npm run ai -- review economics-graphs`. Leer el JSON local.
Corregir dentro del alcance, probar y repetir con un máximo de tres correcciones
después de la revisión inicial. Un bloqueo nunca equivale a aprobación.
Un solo implementador; no modificar archivos ni Git durante la revisión.

Preservar cambios y datos existentes. No push, merge, despliegue, reescritura de
historial, credenciales ni modificaciones en otros proyectos. Trabajar solo en
este worktree; conservar la aplicación colaborativa y sus servicios actuales.
No migraciones, resets ni operaciones de base de datos para este hotfix.
Solo datos sintéticos en pruebas y revisión; los artefactos privados quedan en
`.local`. Claude no recibe herramientas operativas ni se omiten sus permisos.
