# Corrección de producción

Codex implementa; Claude Code revisa mediante `npm run ai`.
Sigue [docs/ai/revision-claude.md](docs/ai/revision-claude.md).
Tarea: `health-economics`, base `e1d6be4a7896c9a682632117048ffbc53cb7cd68`,
rama `hotfix/produccion`. Integrar los apuntes de productividad marginal y utilidad
del médico del 10 sep 2026 en temas, banco fijo, contexto IA y gráficos interactivos
con fórmulas desarrolladas. Preservar diseño, material y avances existentes.

Actualizar descriptor y evidencia; ejecutar `npm run ai -- test health-economics`,
crear commit y ejecutar `npm run ai -- review health-economics`. Leer el JSON local.
Corregir dentro del alcance, probar y repetir con un máximo de tres correcciones
después de la revisión inicial. Un bloqueo nunca equivale a aprobación.
Un solo implementador; no modificar archivos ni Git durante la revisión.

Preservar cambios y datos existentes. No push, merge, despliegue, reescritura de
historial, credenciales ni modificaciones en otros proyectos. Trabajar solo en
este worktree; conservar la aplicación colaborativa y sus servicios actuales.
No migraciones, resets ni operaciones de base de datos para este hotfix.
Solo datos sintéticos en pruebas y revisión; los artefactos privados quedan en
`.local`. Claude no recibe herramientas operativas ni se omiten sus permisos.
