# Corrección de producción

Codex implementa; Claude Code revisa mediante `npm run ai`.
Sigue [docs/ai/revision-claude.md](docs/ai/revision-claude.md).
Tarea: `elasticity-lab`, base `4a882f934c424b8d83ad861b36e1460ef3104a63`,
rama `hotfix/produccion`. Ampliar elasticidad de oferta y demanda con ejemplos
editables, ingresos, demanda lineal y desplazamientos de trigo/petróleo.
Las explicaciones deben ocupar espacio propio sin tapar tarjetas.

Actualizar descriptor y evidencia; ejecutar `npm run ai -- test elasticity-lab`,
crear commit y ejecutar `npm run ai -- review elasticity-lab`. Leer el JSON local.
Corregir dentro del alcance, probar y repetir con un máximo de tres correcciones
después de la revisión inicial. Un bloqueo nunca equivale a aprobación.
Un solo implementador; no modificar archivos ni Git durante la revisión.

Preservar cambios y datos existentes. No push, merge, despliegue, reescritura de
historial, credenciales ni modificaciones en otros proyectos. Trabajar solo en
este worktree; conservar la aplicación colaborativa y sus servicios actuales.
No migraciones, resets ni operaciones de base de datos para este hotfix.
Solo datos sintéticos en pruebas y revisión; los artefactos privados quedan en
`.local`. Claude no recibe herramientas operativas ni se omiten sus permisos.
