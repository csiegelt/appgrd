# Corrección de producción

Codex implementa; Claude Code revisa mediante `npm run ai`.
Sigue [docs/ai/revision-claude.md](docs/ai/revision-claude.md).
Tarea: `hotfix-exams`, base `6009b4bf4dc5dba3e9dbfc010b8d60228fa8c346`,
rama `hotfix/produccion`. Corregir generación y recuperación de pruebas IA.

Actualizar descriptor y evidencia; ejecutar `npm run ai -- test hotfix-exams`,
crear commit y ejecutar `npm run ai -- review hotfix-exams`. Leer el JSON local.
Corregir dentro del alcance, probar y repetir con un máximo de tres correcciones
después de la revisión inicial. Un bloqueo nunca equivale a aprobación.
Un solo implementador; no modificar archivos ni Git durante la revisión.

Preservar cambios y datos existentes. No push, merge, despliegue, reescritura de
historial, credenciales ni modificaciones en otros proyectos. Trabajar solo en
este worktree; conservar la aplicación colaborativa y sus servicios actuales.
No migraciones, resets ni operaciones de base de datos para este hotfix.
Solo datos sintéticos en pruebas y revisión; los artefactos privados quedan en
`.local`. Claude no recibe herramientas operativas ni se omiten sus permisos.
