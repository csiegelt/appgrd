# Pruebas IA: corrección de producción

Base: `6009b4bf4dc5dba3e9dbfc010b8d60228fa8c346` (`origin/main`).
El usuario reportó generación intermitente y necesidad de borrar caché después de
crear una prueba. No se han recibido URL ni logs de producción; las causas que
siguen se verifican en este checkout y no representan una inspección del hosting.

## Reproducción y cambios

La regresión de Chrome crea una prueba, guarda una respuesta, recarga y retrasa
500 ms la comprobación de sesión. Antes del arreglo, el botón de generar otra
prueba continúa deshabilitado después de recibir una sesión válida. El test
terminó con timeout de 5000 ms y captura sintética local. El manejador solo
repintaba al no existir intento o al haberlo entregado. Ahora repinta también
los intentos en curso, conservando las respuestas.

Las solicitudes del navegador tienen límites de 15 segundos para metadatos y
225 segundos para IA, incluyendo lectura del cuerpo, con caché `no-store`.
Se liberan temporizadores y estado de carga al fallar. La configuración de
archivos estáticos exige revalidación para recibir nuevas versiones; las
respuestas API conservan `no-store`. No se borra localStorage ni cookies.

El servidor valida la revisión antes de devolverla. Si la revisión tiene formato,
cobertura o alternativas inválidas, repite la revisión independiente una sola
vez cuando quedan al menos diez segundos del presupuesto original de 210 s.
Máximo tres llamadas por prueba (borrador, revisión y corrección). La corrección
también consume API y se contabiliza. No se repiten fallos de cuota, autenticación,
transporte ni respuestas interrumpidas; no se publican borradores como fallback.
El bloqueo de sesión se libera antes de devolver éxito al cliente.

Si falla el guardado local, se restaura el intento anterior en memoria y se
informa del error. Se preservan respuestas, notas e historial.

## Evidencia

- Reproducción roja y prueba verde del botón con sesión lenta en Chrome real.
- Pruebas HTTP sintéticas de corrección válida, corrección inválida y límite de
  tiempo restante. Uso contabilizado y nuevos intentos en la misma sesión.
- Errores de cuota, límite temporal, timeout y respuesta incompleta no se
  reintentan automáticamente ni dejan bloqueada la sesión.
- Navegador: espera agotada de IA y de sesión, recuperación sin recarga,
  almacenamiento lleno con restauración del intento, creación repetida de 10/15
  preguntas, historial, persistencia y anchos de 320 a 1280 px.
- El descriptor ejecuta las suites unitarias y los cuatro recorridos originales
  en navegador. El recibo TAP privado registra los resultados exactos para el
  contenido revisado; no se declara aprobación antes del JSON de Claude.

Las generaciones se simulan: no se usaron credenciales ni llamadas de pago.
No se ha desplegado, hecho push, migrado bases ni alterado el servidor colaborativo.
