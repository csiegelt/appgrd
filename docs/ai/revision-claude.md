# Revisión del hotfix

Se reutilizan los scripts de revisión aprobados del checkout colaborativo
`6e612d3e2a994350d0906149e97db1788b5a416d`; cambia la rama exigida a
`hotfix/produccion` y se permite la ruta pública exacta `api/[...path].mjs` como
contexto (los puntos del nombre no son navegación de directorios). Las demás
rutas con `..` siguen rechazadas. No se incorpora el runtime colaborativo.

1. Actualizar `docs/ai/tasks/hotfix-exams.json` y la evidencia pública sintética.
2. `npm run ai -- test hotfix-exams`.
3. Crear commit con todos los cambios autorizados.
4. `npm run ai -- review hotfix-exams` y leer el JSON guardado en `.local`.
5. Corregir, probar y crear otro commit; hasta tres correcciones después de la
   revisión inicial. Bloqueos o presupuesto agotado se entregan como pendientes.

El recibo de pruebas precede al commit: `content` identifica todos los bytes del
árbol no ignorado, incluidos archivos nuevos, independientemente de HEAD.
`tested_head` identifica el padre; la revisión exige el mismo contenido, árbol
limpio, base ancestro y rama esperada. No editar mientras Claude está activo.

Claude usa su CLI oficial con `--tools ""`, permisos `dontAsk`, sin hooks, MCP,
plugins ni sesiones persistentes. Las políticas administradas bloquean el inicio;
no se omiten permisos. No leer ni copiar credenciales. El paquete incluye solo
código versionado autorizado, diff íntegro, descriptor y recibos sintéticos;
máximo 500000 bytes. Nunca `.local`, archivos de alumnos, respaldos o secretos.
El resultado debe validar esquema, hashes y ausencia de herramientas operativas.
Revisión: diez minutos. Los fallos nunca aprueban. No push ni despliegue.
