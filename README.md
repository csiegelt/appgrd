# appGRD · Análisis de costos de egreso por GRD (Chile)

**Herramienta docente para alumnos del Magíster · Sistema de Salud · Universidad de los Andes (UANDES).**

Aplicación de estudio por asignaturas y análisis de egresos hospitalarios bajo el mecanismo de pago por **Grupos Relacionados por el Diagnóstico (IR-GRD)** usado por MINSAL y FONASA. La biblioteca y los cálculos funcionan con HTML, CSS y JavaScript; el tutor IA utiliza **la API de OpenAI mediante un servidor Node.js**, en local o en un hosting. Configura la clave en `.env` siguiendo los pasos de abajo.

```
Pago del egreso = Precio base × Peso relativo del GRD
Resultado       = Pago − Costo total asignado
```

## Uso

La app abre en **Asignaturas**, con tarjetas para entrar a cada materia o agregar otra. Cada asignatura muestra primero sus contenidos; las herramientas se abren dentro del contenido elegido.

```text
Inicio · Asignaturas
└─ Sistemas de Salud
   ├─ Estudio para la prueba
   │  └─ Temas, guías, tarjetas, autoevaluación, casos prácticos y tutor IA
   └─ GRD
      └─ Resumen, distribución, egresos, simulador, licitaciones y demás herramientas
```

Las nuevas asignaturas tienen su propio espacio de **Estudio para la prueba**. GRD pertenece a **Sistemas de Salud** y sus pestañas aparecen solo al entrar en ese contenido. Usa la ruta de navegación para volver a la asignatura y **Inicio** para ver todas las materias. Los apuntes y avances existentes se conservan.

### Estudiar por asignaturas

La prueba de Economía toma el contenido actual de los temas, incluidos los ingresados por el usuario. Cada generación solicita preguntas variadas, evita los enunciados del intento anterior y mezcla al azar el orden de preguntas y alternativas, conservando la correspondencia con la solución. Recargar conserva el mismo orden del intento en curso.

- **Panel de Economía de la Salud:** al entrar al ramo se abre un único panel con tu avance (temas leídos, tarjetas dominadas y última nota), el botón para continuar con el siguiente tema y cuatro accesos: **Laboratorio de gráficos**, **Banco de preguntas**, **Prueba con IA y nota** y **Tutor IA**. Tarjetas, autoevaluación, práctica IA y casos quedan en **Más práctica**. Cada tema de la lista abre su lectura y, cuando corresponde, su gráfico o sus preguntas del banco. Dentro de un tema puedes pasar al anterior o al siguiente sin volver al listado.

- **Banco de preguntas (sin IA):** 110 preguntas fijas sobre los 11 temas del ramo, de selección múltiple y de verdadero o falso. Cada práctica sortea entre 10 y 20 preguntas, recorre la mayor cantidad posible de temas, mezcla ambos formatos y ordena al azar preguntas y alternativas. Después de cada respuesta se muestra la corrección con su explicación. Al terminar ves el puntaje, una nota de referencia con exigencia de 60 % y la lista de errores, que puedes repasar de inmediato. También puedes practicar un solo tema desde el selector o desde el botón **Preguntas** de la lista. No consume tokens. El resultado se agrega al historial; la sesión en curso se descarta al recargar.

- **Prueba con nota en Economía de la Salud:** entra en **Economía de la Salud → Prueba con IA y nota**, elige **10 o 15 preguntas** (10 por defecto; la app recuerda tu última elección) y pulsa **Generar prueba**. Al entregar, **Generar otra prueba con IA** aparece justo debajo de la nota, con la misma elección de 10 o 15. Durante una prueba, el desplegable **Generar otra prueba con IA** la reemplaza sin nota cuando llega la nueva; si la generación falla, conservas la prueba en curso. Los intentos guardados de 20 o 30 preguntas de la versión anterior se siguen abriendo y calificando. La IA crea preguntas nuevas con cuatro alternativas y sus soluciones. Si hay tantas preguntas como temas o más, cubre todos los temas (hasta 30 temas distintos); si hay menos, cada pregunta proviene de un tema distinto. Crear la prueba requiere la API configurada: una consulta genera el borrador y otra revisa sus respuestas, cálculos y coherencia con el material antes de mostrarlo. Ambos consumos se registran; responder y calcular la nota no usa IA. Esta revisión reduce errores, pero no garantiza que la IA sea infalible. Puedes navegar, omitir, cambiar respuestas y continuar tras recargar. Las soluciones aparecen solo después de confirmar la entrega. La escala es de 1,0 a 7,0 con un decimal y exigencia inicial de 60 %: 6 de 10 o 9 de 15 correctas dan un 4,0. Antes de generar puedes elegir 50 %, 60 % o 70 %; la exigencia queda fija para ese intento. Cero aciertos da 1,0 y todos correctos da 7,0; la escala tiene un tramo lineal hasta 4,0 y otro desde 4,0 a 7,0. Errores y omisiones valen cero puntos. El resultado incluye explicación de cada respuesta, temas para repasar e historial de notas. El último intento y sus respuestas se guardan en `grd-estudio-v1` y están incluidos en el respaldo general; no se incorporan a las tarjetas ni al exportado individual de la asignatura. Generar otra prueba reemplaza el intento anterior solo cuando llega una respuesta válida; conserva la nota anterior en el historial. Es una evaluación formativa generada con IA, no una calificación oficial del curso.

- **Economía de la Salud:** 11 temas, 33 tarjetas y 3 casos guiados basados en `RESUMEN ECONOMIA CLAUDE.docx`. Siete laboratorios nativos, a los que se entra desde **Laboratorio de gráficos**, reconstruyen sus seis gráficos y añaden ejercicios de elasticidad, costos/escala, seguros y capital de salud. Las tablas compactas, deslizadores y el punto de precio arrastrable recalculan los resultados; puedes ocultar fórmulas o resultados, comprobar respuestas, consultar soluciones, deshacer y descargar los datos. Cada laboratorio indica qué se practica y tiene **Leer el tema** para ir a su lectura. El recuadro **Fórmula del modelo** muestra la fórmula general y, debajo, **Con tus datos**: la misma fórmula con tus valores reemplazados y destacados, y su resultado, que se recalcula al cambiar cualquier dato. Con **Ocultar resultados para practicar** los valores se mantienen y el resultado aparece como «?». En el celular las pestañas se deslizan en una fila y la tabla de oferta y demanda se pliega para que el gráfico aparezca antes. La práctica se guarda en `grd-economia-practica-v1`, separada del respaldo general de la biblioteca. Si ya existe el ramo con el nombre Economía de la Salud, se amplía conservando su ID y contenido personal; el estado previo queda en `grd-estudio-antes-economia-v1`. Se corrigen los cruces imprecisos de los dibujos, se contextualizan los índices ilustrativos de productividad y se distinguen costos de corto plazo de economías de escala de largo plazo. Incluye referencias de RAND y OpenStax en las ayudas. No requiere IA para los contenidos o cálculos incluidos.

- **Herramientas Cuantitativas:** cuatro temas de regresión, chi cuadrado, búsquedas y Erlang C, con 16 tarjetas y dos casos guiados de salud. En los laboratorios nativos puedes editar X/Y, arrastrar puntos, cambiar entre dispersión, líneas y barras, mostrar u ocultar la recta y comparar una fórmula propia con los datos. Escribe, por ejemplo, `=2*X+5`, `=m*X+b` o `=Y*1,1`; puedes previsualizarla, reemplazar Y o generar de 2 a 1000 puntos con inicio y paso elegidos. Las fórmulas admiten aritmética, potencias, paréntesis y funciones como RAIZ, LN, EXP, MIN, MAX y PROMEDIO; los argumentos se separan con `;`. Los errores muestran qué revisar y conservan los datos. Chi cuadrado, aranceles y Erlang incluyen una calculadora de fórmulas con las variables del ejemplo. **Necesito ayuda** explica pasos y propone un reto con solución. **Deshacer** recupera hasta 30 cambios y **Guardar práctica** conserva datos, fórmulas y configuración en este navegador (independiente del respaldo general de la biblioteca). También puedes exportar CSV/SVG o descargar el Excel con 16 hojas y 12 gráficos editables y la guía PDF. El diseño se adapta a celulares y no requiere consumir API para practicar. La guía documenta la discrepancia entre los registros individuales y la tabla guardada de chi cuadrado. Los ejemplos nuevos de salud son simulados.

- **Sistemas de Salud:** texto de los 14 capítulos del guion de las clases 1 a 6, guías con objetivos e ideas clave, 37 preguntas con explicación y 11 casos guiados. Ocho casos nuevos te sitúan como director/a de hospital; sus escenarios son ficticios y aplican los conceptos del guion. Las cifras del documento conservan su contexto histórico.
- **Tarjetas:** revelar respuestas, marcar lo aprendido y filtrar lo pendiente.
- **Autoevaluación:** preguntas y alternativas en orden aleatorio, corrección inmediata, explicación, repaso de errores e historial. Las tarjetas con preguntas abiertas se autoevalúan contra su respuesta elaborada y su explicación.
- **Práctica IA:** crea seis preguntas nuevas desde la asignatura o el tema seleccionado, con dificultad básica, intermedia o avanzada. Puedes elegir **Conceptos y aplicación** o **Casos: director/a de hospital**. En los casos, una situación ficticia plantea restricciones y decisiones; la explicación justifica la prioridad, compara alternativas y aborda responsables, recursos, indicadores y riesgos. Se responde una pregunta por pantalla, con explicación y opción de repetir los errores. La generación requiere una clave de API configurada en el servidor; si falta, se muestran instrucciones para habilitarla.
- **Casos prácticos:** elige una situación o pide un caso al azar. Escribe tu plan por etapas, contrástalo con una solución razonada y usa **Llevar mi plan al tutor** para preparar una conversación sobre tus decisiones. La selección y las respuestas quedan guardadas. Los casos abarcan primeros 30 días de dirección, listas de espera y pabellones, déficit GRD, comparación de hospitales, reingresos, ausentismo, medicamentos y evaluación de una tecnología. Se reconocen alternativas justificadas; las respuestas orientadoras no son protocolos clínicos ni atribuciones legales nuevas.
- **Casos nuevos con IA:** dentro de **Casos prácticos**, pulsa **Generar caso nuevo con IA**. Elige un tema o déjalo al azar y selecciona dificultad básica, intermedia o avanzada. Se crea un escenario ficticio con rol, restricciones y tres etapas: diagnóstico, decisión y seguimiento. Cada etapa permite escribir una respuesta y abrir su orientación. En Sistemas de Salud se practica como director/a de hospital; en otras asignaturas el rol se adapta al material. La opción **Sortear caso incluido** sigue disponible para los casos originales, sin consumir API.
- **Sesión de casos IA:** los casos generados se consultan en una lista separada y se mantienen al navegar por la página. Sus respuestas son temporales: no se guardan en localStorage, respaldos, exportaciones ni en el servidor de la app; se descartan al recargar o cerrar la página. Puedes llevar el caso y tu plan al tutor para conversar. Los casos incluidos conservan su guardado local habitual. No se añaden automáticamente casos de IA al material común.
- **Tutor:** conversación con contexto de los apuntes, pistas, ejemplos y preguntas una a una. Puede usar búsqueda web con citas cuando el modelo y los permisos de la cuenta lo permiten. También permite guardar preguntas generadas dentro de la misma asignatura, como contenido personal de este navegador, sin crear otra tarjeta.
- **Más asignaturas:** desde **Inicio → Agregar asignatura**, pegar texto o cargar `.txt`/`.md`. **Guardar y generar con IA** conserva primero el texto y después genera un objetivo, de dos a seis ideas explicadas y de tres a ocho tarjetas con preguntas concretas, respuestas breves y explicaciones. **Guardar solo texto** permite hacerlo sin consumir API. Si falta acceso, saldo o conexión, el tema queda pendiente y se puede reintentar desde su guía. Ya no se fabrican tarjetas recortando párrafos. También puedes agregar temas a una asignatura existente e importar o exportar asignaturas JSON.
- **Mejorar tarjetas antiguas:** abre un tema o **Tarjetas** y pulsa **Generar guía y tarjetas con IA**; en Tarjetas puedes elegir el tema. Los recortes de versiones anteriores se ocultan de la práctica y se reemplazan al completar la generación. El botón reemplaza sus propias tarjetas anteriores sin duplicarlas; conserva el texto, los apuntes y las preguntas incorporadas por otras vías. Si la generación o el guardado falla, el material anterior permanece. Las guías y tarjetas nuevas se guardan en el navegador y se incluyen en respaldos y exportaciones. El avance de las tarjetas sustituidas no se asigna a las preguntas nuevas.
- **Fundamento de las tarjetas:** al revelar una tarjeta de IA, puedes abrir **Ver fundamento en el texto**. El servidor comprueba que la cita sea un fragmento literal de los apuntes y rechaza fuentes inexistentes, preguntas duplicadas o material incompleto. Esta comprobación ayuda a revisar el contenido, pero no garantiza por sí sola la corrección de todas las interpretaciones: contrasta la explicación con el tema. La generación trabaja un tema completo por solicitud, sin búsqueda web, y se registra en el contador de tokens.
- **Respaldo:** Sistemas de Salud → GRD → Parámetros → Descargar respaldo incluye asignaturas, apuntes, avances e historial. Los datos son locales a cada navegador; no se sincronizan entre el computador y el celular. La conversación con el tutor es temporal y no se incluye en el respaldo.

**Una tarjeta por asignatura:** agregar temas o guardar preguntas de IA mantiene la tarjeta original de Sistemas de Salud y su acceso a GRD. Las copias automáticas antiguas «Sistemas de Salud · Mi práctica IA» y «Sistemas de Salud · Mis apuntes» se reúnen al cargar la app, conservando sus preguntas, temas, respuestas de casos, apuntes, progreso e historial. Si hay dos apuntes distintos para un tema, se mantienen ambos en el texto. Antes de unificar se guarda el estado anterior en la clave local `grd-estudio-antes-unificar-v1`; si no se puede escribir el respaldo o el estado nuevo, las copias anteriores permanecen. Las asignaturas creadas o importadas de forma independiente no se fusionan solo por tener un nombre parecido.

### Activar el tutor con la API de OpenAI

Requiere Node.js 22 o superior, una [clave de proyecto de OpenAI](https://platform.openai.com/api-keys) y facturación de API habilitada. Las consultas se cobran al proyecto asociado a esa clave, por separado del plan de ChatGPT. Revisa el [consumo](https://platform.openai.com/usage) y los [precios de la API](https://developers.openai.com/api/docs/pricing).

En PowerShell, desde este equipo:

```powershell
cd C:\Users\Galye\Maicho\appgrd\repo
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

En `.env`, completa `OPENAI_API_KEY` con tu clave. El modelo inicial es `gpt-4.1-mini`; puedes cambiar `OPENAI_MODEL` por otro modelo de tu proyecto compatible con Responses, salidas estructuradas y, si la usas, búsqueda web. No compartas la clave ni la pegues en el chat del tutor. El servidor carga `.env` al iniciar; las variables del entorno tienen prioridad. Después de modificarlo, detén el servidor anterior con `Ctrl+C` y ejecuta:

```powershell
npm.cmd start
```

Abre `http://127.0.0.1:8787` y recarga con `Ctrl+F5`. Entra en **Sistemas de Salud → Estudio para la prueba → Tutor IA**. La etiqueta **API configurada** indica que el servidor tiene una clave. Pulsa **Comprobar conexión API** para validar la clave y el acceso al modelo; esa comprobación no genera texto ni verifica saldo. Envía una consulta breve para comprobar la generación real. Ya no se utiliza el botón «Continuar con ChatGPT».

La clave se utiliza solo en el servidor y nunca se entrega al navegador, a localStorage ni a los respaldos. `.env` queda excluido de Git y de las rutas públicas. Se llama a `https://api.openai.com/v1/responses` con `store: false`, historial explícito y un máximo de 8.000 tokens de salida. Las seis preguntas usan un esquema JSON; la búsqueda web está desactivada por defecto y solo se ofrece en conversación cuando la habilitas. La app limita la generación a dos solicitudes simultáneas y 20 por minuto por instancia.

La generación de casos utiliza otro esquema de [salida estructurada, según OpenAI Docs](https://developers.openai.com/api/docs/guides/structured-outputs), con un tema fuente válido y tres etapas completas. Cada solicitud combina variaciones de restricciones y plazos con el tema elegido; en modo aleatorio evita repetir el último tema si hay otros disponibles. Recibe hasta 30 casos anteriores como referencia para evitar repeticiones y rechaza coincidencias exactas con esas referencias, aunque esto no garantiza que nunca se repitan conceptos. No utiliza búsqueda web. Cada generación consume tokens y actualiza el contador; ante errores o falta de saldo se conservan los casos y respuestas anteriores mientras la página siga abierta.

Referencias de OpenAI: [autenticación de API](https://developers.openai.com/api/reference/overview#authentication), [modelo inicial](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [salidas estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs) y [búsqueda web](https://developers.openai.com/api/docs/guides/tools-web-search).

### Compartir con otros alumnos

Cada alumno abre el mismo link desde su propio dispositivo. Sus notas, pruebas, respuestas, apuntes, avances e historial se guardan **solo en su navegador**: la corrección es local y el servidor no recibe ni guarda resultados, así que nadie ve los de otra persona. Los datos no viajan entre dispositivos; para llevarlos a otro equipo se usa **Descargar respaldo**. Si varias personas comparten un mismo navegador, comparten también sus datos.

En una publicación (Vercel o `HOST=0.0.0.0`) la tarjeta **Tokens de la API** se oculta, porque mostraría la actividad de todos. Para verla en el sitio publicado, agrega `APP_SHOW_USAGE=1` en las variables del hosting; en uso local se muestra siempre. Sin `APP_PASSWORD`, cualquiera con el link puede generar con IA, con cargo al saldo de la clave configurada. La app atiende como máximo dos generaciones simultáneas y 20 consultas por minuto por instancia; si se supera, pide esperar y reintentar.

### Contador de tokens y avisos en Inicio

La tarjeta **Tokens de la API** muestra el consumo de entrada y salida registrado por esta app, los tokens de la última consulta y la disponibilidad que OpenAI informó en la última respuesta. Si el hosting protege el tutor con contraseña, debes ingresar al tutor para consultar esos datos.

- **Usados en esta app:** suma los tokens que OpenAI reporta desde la fecha indicada en el detalle. Incluye preguntas generadas, conversaciones y respuestas que consumieron tokens aunque no pudieran mostrarse completas. Las consultas sin datos se señalan como consumo no informado; no se cuentan como cero.
- **Disponibles en la última consulta:** corresponde a los [límites temporales de tokens](https://developers.openai.com/api/docs/guides/rate-limits), que se renuevan. Si también hay un límite del proyecto, se muestra la menor disponibilidad informada. Una lectura cuyo intervalo terminó queda identificada como anterior; la app no inventa un nuevo número disponible. Si no llegaron los encabezados, aparece **Sin lectura**.
- **Saldo y facturación:** la disponibilidad temporal no representa créditos monetarios ni una bolsa total de tokens comprados. El saldo se consulta en OpenAI Platform mediante el enlace de la tarjeta. No se estima dinero a partir de los tokens.
- **Sin saldo o cuota:** si una consulta recibe un error de créditos agotados, cuota insuficiente o límite de gasto, aparece una alerta roja junto al mensaje y en Inicio. La consulta fallida conserva su borrador mientras permanezcas en la app. La alerta se elimina cuando una consulta posterior vuelve a responder; comprobar acceso al modelo no confirma que haya saldo.
- **Límite temporal:** un error de velocidad o de tokens por intervalo pide esperar y reintentar, sin informar que se agotó el saldo. OpenAI documenta estas diferencias en [límites de gasto](https://developers.openai.com/api/docs/guides/spend-limits).

**Actualizar** relee el contador del servidor y no genera llamadas de pago. También se actualiza después de cada consulta y al volver a Inicio. El registro se conserva en `.local/api-usage.json`, excluido de Git y de las rutas públicas; almacena cifras, fechas y estado, sin guardar claves, preguntas ni respuestas. Al cambiar de clave comienza un nuevo registro. No incluye llamadas de otras aplicaciones, consultas anteriores a esta función ni el respaldo de apuntes del navegador. En un hosting con disco efímero, el registro se reinicia al perderse ese archivo; conserva `.local` en almacenamiento persistente para mantenerlo entre despliegues.

| Mensaje | Qué revisar |
|---|---|
| Falta configurar la API | Completa `OPENAI_API_KEY` en `.env` o en el hosting y reinicia el servidor. |
| La clave es inválida o fue revocada | Crea o corrige la clave de proyecto y reinicia. |
| La API no tiene saldo | Revisa la facturación y el límite de gasto del proyecto de API. |
| Modelo no disponible | Revisa `OPENAI_MODEL` y los permisos del proyecto. |
| Límite de solicitudes | Espera un momento antes de volver a enviar. |
| No se encontró el servicio de la API | Abre la URL del servidor Node.js; GitHub Pages y `index.html` directamente no ejecutan el tutor. |
| Sigue apareciendo la conexión anterior | Detén el proceso Node anterior, inicia esta versión y recarga con `Ctrl+F5`. |

### Verificación

```sh
npm test
npm run test:ui
```

Las pruebas del servidor comprueban el envío autenticado a Responses, las preguntas estructuradas, los errores de clave/saldo/modelo, la contraseña de acceso, los límites y la protección de secretos y rutas. También verifican el contador persistente, consumo incompleto, encabezados ausentes o con cero tokens y recuperación tras agotar cuota. Las pruebas de interfaz usan Edge instalado en Windows (o `CHROME_PATH`) a 390 y 1280 píxeles: verifican navegación, conservación de apuntes, configuración pendiente, ingreso al tutor, generación de casos, contador y alerta de saldo. **OpenAI se sustituye por respuestas simuladas en las pruebas**, sin claves reales ni consumo. Las capturas y perfiles quedan en `test-results/`, excluido de Git.

Los casos IA se prueban con autenticación, rechazo de formatos incompletos y fuentes inventadas, consumo contabilizado incluso si el contenido no es válido, recuperación de cuota, cambio de tema, separación por asignatura y descarte al recargar. La interfaz también comprueba que los casos incluidos y sus respuestas se conserven, y que llevar un plan temporal al tutor use el tema correcto.

Las guías y tarjetas se prueban con evidencia literal, formato completo, guardado del texto cuando falta la API, sustitución de recortes antiguos, conservación de apuntes y preguntas propias, regeneración sin duplicados y recuperación tras errores o falta de saldo. El exportado/importado conserva el fundamento y el origen de las tarjetas de IA.

**Manual de ayuda:** [manual/index.html](manual/index.html) — guía paso a paso de las herramientas GRD, con capturas y datos de ejemplo. También se abre desde **Sistemas de Salud → GRD → Manual de ayuda**.

Para usar la biblioteca y los cálculos sin IA, basta abrir `index.html` en Chrome o Edge: esas funciones no requieren servidor ni conexión a internet. Los datos se guardan en el navegador (localStorage); use *Parámetros → Descargar respaldo* para exportarlos. El tutor requiere el servidor Node.js, internet y una clave de API con saldo disponible.

### Cómo probar esta versión

En PowerShell, desde este equipo:

```powershell
cd C:\Users\Galye\Maicho\appgrd\repo
npm.cmd ci
npm.cmd start
```

Abre `http://127.0.0.1:8787`. Si la app ya está abierta y responde, no hace falta iniciar un segundo servidor. Mantén la terminal abierta mientras estudias; `Ctrl+C` detiene el servicio que iniciaste allí. En PowerShell, usa `npm.cmd` si la política de ejecución bloquea `npm.ps1`; también aplica a `npm.cmd test` y `npm.cmd run test:ui`.

1. En **Inicio**, abre **Sistemas de Salud**: verás **Estudio para la prueba** y **GRD**. Entra en **Estudio para la prueba** y abre un tema. Revisa su guía y el texto completo, escribe un apunte y recarga. Vuelve a entrar al tema para comprobar que se conservó.
2. Prueba **Tarjetas** y **Autoevaluación**. Responde una alternativa, lee la explicación y completa la sesión para ver el resultado.
3. Usa **Inicio → Agregar asignatura** para crear otra materia con un título y un texto de al menos 80 caracteres. Comprueba que aparece en el inicio con su propio contenido. Vuelve a **Sistemas de Salud → GRD**, abre el simulador y usa **← Sistemas de Salud** para regresar a los dos contenidos.
4. En **Casos prácticos**, abre **Te nombran director: tus primeros 30 días**, escribe qué harías y compara cada etapa con la solución razonada. Cambia de caso y vuelve para comprobar el guardado. Con la API configurada, abre **Práctica IA**, selecciona dificultad y **Casos: director/a de hospital**, y pulsa **Comenzar práctica con preguntas nuevas**. Deben aparecer seis casos con decisiones y explicación después de cada respuesta. Completa la sesión y revisa los errores.
5. En **Tutor IA**, envía una consulta sobre el texto. Para probar internet, activa **Permitir búsqueda web** y solicita explícitamente verificar un dato actual con fuentes. Si tu cuenta o modelo no admite la búsqueda, la app muestra el error recibido.
6. Para revisar la vista móvil en el computador, abre las herramientas de desarrollo del navegador (`F12`) y activa la vista de dispositivos (`Ctrl+Shift+M`). La dirección `127.0.0.1` corresponde al propio dispositivo: abrirla en el teléfono no conecta con el computador.
7. En **Casos prácticos**, pulsa **Generar caso nuevo con IA**, escribe tu decisión y abre una orientación. Genera otro caso y usa la lista **Casos IA de esta sesión** para volver al anterior. Cambia a **Casos incluidos** para comprobar que siguen disponibles. Al recargar, los casos IA y sus respuestas se descartan; los casos incluidos y sus apuntes permanecen.
8. Crea una asignatura con un texto y pulsa **Guardar y generar con IA**. Revisa la guía, entra en **Practicar tarjetas**, revela una respuesta y consulta su fundamento. Para mejorar una asignatura antigua, abre su tema y usa **Generar guía y tarjetas con IA**. Recarga para comprobar que la guía, las tarjetas y tus apuntes siguen guardados, dentro de la misma asignatura.

Las pruebas automáticas descritas arriba cubren los flujos locales y la integración con respuestas simuladas. Una consulta real después de configurar tu clave permite comprobar el acceso y el saldo de tu proyecto de OpenAI.

### Publicar la biblioteca en GitHub Pages

Este despliegue publica los temas, guías, tarjetas, autoevaluaciones, casos y calculadoras. **No ejecuta el tutor ni genera nuevas preguntas con IA dentro del sitio.** La generación integrada depende del servicio Node.js descrito antes.

Desde la carpeta `repo`, revisa y sube los cambios:

```powershell
git status
git add .gitignore .env.example .nojekyll README.md index.html css js lib package.json package-lock.json server.mjs tests
git commit -m "Agrega estudio por asignaturas y tutor con API de OpenAI"
git push origin main
```

Luego, en [la configuración de Pages del repositorio](https://github.com/csiegelt/appgrd/settings/pages):

1. En **Build and deployment → Source**, selecciona **Deploy from a branch**.
2. Selecciona **main**, carpeta **/(root)**, y pulsa **Save**.
3. Revisa que el despliegue termine correctamente en **Actions**. La URL predeterminada esperada es `https://csiegelt.github.io/appgrd/`; confirma la dirección publicada en **Settings → Pages**.
4. Abre esa dirección desde el celular y comprueba la navegación, las tarjetas y el guardado de apuntes. Los avances locales del computador no se transfieren automáticamente: usa el respaldo si quieres llevarlos al navegador del teléfono.

El archivo `.nojekyll` permite publicar directamente los archivos estáticos. Estos pasos siguen la [documentación de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Las actualizaciones que subas a `main` se volverán a publicar una vez configurada esa rama como fuente.

### Publicar también el tutor IA para celular

#### Vercel

El repositorio incluye `vercel.json`, la función `api/[...path].mjs` y un paso de compilación que publica solamente la interfaz y sus recursos. Las rutas `/api/session`, `/api/login`, `/api/check`, `/api/usage` y `/api/tutor` se ejecutan en una Vercel Function. El servidor local sigue iniciándose con `npm start`.

1. Conecta `csiegelt/appgrd`, rama `main`, con la raíz del repositorio como **Root Directory**. `vercel.json` define **Framework: Other**, el comando `node scripts/build-vercel.mjs` y la salida `.vercel-static`.
2. En **Settings → Environment Variables → Production**, guarda `OPENAI_API_KEY`, `OPENAI_MODEL` y `APP_ORIGIN` (por ejemplo `https://appgrd.vercel.app`). `APP_PASSWORD` es opcional y admite contraseñas cortas: vacía o ausente permite abrir el tutor directamente. Si olvidaste la contraseña, puedes eliminar esa variable para quitarla o editarla para reemplazarla, sin conocer el valor anterior. El modelo predeterminado es `gpt-4.1-mini`. No copies `HOST` ni `PORT` del entorno local. Si omites `APP_ORIGIN`, se usa el dominio que Vercel comunica mediante sus variables de sistema; una dirección explícita fija el dominio canónico.
3. Despliega el nuevo commit. Los cambios de variables necesitan un nuevo despliegue: **Deployments → Redeploy**. El proyecto debe tener **Fluid compute** habilitado para el tiempo de respuesta configurado de 240 segundos.
4. Abre `https://tu-dominio/api/session`: debe devolver JSON con `provider: "openai-api"` y `configured: true`. Sin contraseña, mostrará `authRequired: false`, `protected: false` y `connected: true`; con contraseña, `authRequired: true` antes de entrar. Un 404 significa que todavía falta desplegar la API; no prueba que la clave sea inválida. `setupError` identifica variables de configuración faltantes.
5. Abre el tutor, ingresa **APP_PASSWORD** si la configuraste y pulsa **Comprobar conexión API**. OPENAI_API_KEY permanece en el servidor y no se pega en el formulario de acceso.

Sin APP_PASSWORD, cualquier visitante del portal puede usar el tutor y generar consumo en la cuenta de API configurada. Los límites de solicitudes de la app siguen activos. Para activar o quitar la contraseña en un proyecto existente, edita o elimina únicamente APP_PASSWORD en Production, guarda y vuelve a desplegar; conserva OPENAI_API_KEY y APP_ORIGIN.

En Vercel, cuando configuras contraseña, las sesiones se validan mediante cookies firmadas para que funcionen entre instancias. Duran hasta ocho horas; cerrar acceso borra la cookie del navegador. Cambiar APP_PASSWORD y volver a desplegar invalida las firmas en las nuevas instancias. No hay una base compartida de revocaciones: una copia de un token anterior puede seguir siendo válida en otra instancia hasta su vencimiento. Los contadores de uso y límites de solicitudes son temporales por instancia; el panel lo indica. El consumo completo se consulta en OpenAI. No se escribe en el directorio de despliegue ni se publican archivos `.env`, el servidor o los registros locales.

Referencias: [variables y redespliegue](https://vercel.com/docs/environment-variables/managing-environment-variables), [funciones Node.js](https://vercel.com/docs/functions/runtimes/node-js), [configuración de compilación](https://vercel.com/docs/builds/configure-a-build).

#### Otros servicios Node.js

Publica **el servidor y la interfaz juntos** en un servicio que ejecute Node.js 22 o superior detrás de HTTPS. El repositorio no necesita un paso de compilación. En este equipo el proyecto está en `repo`; en GitHub, `package.json` está en la raíz del repositorio.

1. Conecta el repositorio al servicio Node.js que uses y selecciona su rama.
2. Comando de instalación: `npm ci --omit=dev`. Comando de inicio: `npm start`.
3. Configura estas variables en el panel del hosting (guarda las claves como secretos):

| Variable | Valor |
|---|---|
| `OPENAI_API_KEY` | Tu clave de proyecto de OpenAI. |
| `OPENAI_MODEL` | `gpt-4.1-mini` u otro modelo compatible al que tengas acceso. |
| `HOST` | `0.0.0.0` |
| `APP_ORIGIN` | URL HTTPS exacta del sitio, por ejemplo `https://tu-app.example.com`, sin rutas. |
| `APP_PASSWORD` | Opcional, sin longitud mínima. Vacía o ausente permite acceso público al tutor. Distinta de la clave de API. |
| `PORT` | El valor que asigne el hosting. |

4. El proxy del hosting debe conservar el encabezado `Host` del dominio configurado y permitir solicitudes de hasta tres minutos. Si cambias de dominio, actualiza `APP_ORIGIN` y reinicia. La ruta `/` sirve para comprobar que el servicio está activo.
5. Abre la URL HTTPS desde el celular. Ingresa `APP_PASSWORD` si la configuraste, comprueba la conexión y envía una consulta breve.

La biblioteca permanece accesible; si configuras contraseña, protege los endpoints del tutor que usan la clave. Todos los usuarios autorizados consumen el proyecto de API configurado; sin contraseña, cualquier visitante puede generar consumo. Las sesiones duran ocho horas, usan cookies HttpOnly/SameSite/Secure y se invalidan al cerrar acceso o reiniciar el servidor. Esta modalidad usa una sola instancia Node; no implementa cuentas individuales ni sincronización de apuntes entre dispositivos. El servidor exige HTTPS al escuchar públicamente y la contraseña es opcional.

Las pruebas locales no publican el sitio. El despliegue requiere subir los cambios y configurar las variables en tu hosting; **GitHub Pages por sí solo no ejecuta esta API**.

## Funcionalidades

Herramientas disponibles dentro de **Sistemas de Salud → GRD**:

| Pestaña | Contenido |
|---|---|
| Resumen | KPIs (índice casuístico, pago, costo, resultado, costo por unidad de peso, EM, IEMA, outliers), dispersión costo vs. pago, resultado por CDM, tabla por severidad y GRD con mayor pérdida |
| Distribución | Histograma + curva de densidad, bandas P25–P75 / P10–P90, curva de referencia editable, posición y percentil de la institución, evaluación de un valor, detalle por rango y box-plots por CDM / severidad / servicio / GRD |
| Egresos | Registro, edición, búsqueda, importación y exportación CSV |
| Simulador | Cálculo de un caso, precio base y peso de equilibrio, tabla de sensibilidad |
| Licitación GRD | Análisis de una licitación con precio base por tramo de peso relativo (bases de camas críticas 2018 —caso histórico—, compra a privados 2023 y 2024, o personalizada): admisibilidad de la oferta, precio base de equilibrio y sugerido por tramo, resultado esperado, puntaje económico estimado, curva de pago con saltos de tramo, ajustes por tecnología (bases 2018, punto 9.7), simulador de un egreso y 5 casos de ejemplo con preguntas guía |
| Modo alumno · Analizar un caso clínico | El alumno ingresa los datos de un paciente (GRD, precio base, peso, días, puntos de corte y desglose de costos) y obtiene el veredicto gana/pierde, tabla resumen, explicación paso a paso, gráfico pago vs. costo, curva de resultado según días de estada y según precio base, y la posición del caso frente a los demás egresos. Incluye 5 casos clínicos de ejemplo e impresión del informe |
| Modo alumno · Practicar cálculos | Ejercicios en 4 niveles (pago y resultado; indicadores; estancia y outliers; casuística) con corrección automática, pistas, detección de errores típicos, solución paso a paso, códigos de ejercicio compartibles (ej. `N1-12345`), historial y nota 1,0–7,0 (60 %) exportable a CSV |
| Catálogo GRD | Pesos relativos, EM norma, puntos de corte (PCI/PCS) y P50 por GRD |
| Parámetros | Precio base, reglas de outlier superior/inferior, respaldo y restauración |
| Guía GRD | Explicación del sistema, estructura del código IR-GRD e indicadores |

## Formatos de importación (CSV, separador `;` o `,`)

**Egresos** — ver `plantillas/egresos_plantilla.csv`

```
id;fecha_egreso;grd;servicio;dias_estada;costo;peso
```

`peso` es opcional: si se omite, se toma del catálogo.

**Catálogo (norma IR-GRD)**

```
codigo;descripcion;peso;em_norma;pci;pcs;p50
```

## Importante

El catálogo y los egresos incluidos son **datos de ejemplo ilustrativos**, no la norma oficial. Para análisis real, importe la Norma IR-GRD vigente (MINSAL / FONASA) y ajuste el precio base y las reglas de outliers según su convenio.

## Estructura

```
index.html          interfaz
css/styles.css      estilos
js/data.js          catálogo y egresos de ejemplo, nombres de CDM
js/grd.js           motor de cálculo (pago, outliers, indicadores, CSV)
js/charts.js        gráficos SVG interactivos
js/alumno.js        modo alumno: ejercicios con corrección automática
js/caso.js          modo alumno: análisis explicado de un caso clínico
js/licitacion.js    análisis de licitaciones GRD por tramos de peso
js/app.js           estado, persistencia y render de pestañas
js/estudio.js       asignaturas, estudio y tutor IA
js/estudio-contenido.js  guías, preguntas y casos de Sistemas de Salud
js/estudio-fuente.js texto docente de las clases 1 a 6
server.mjs          servidor web y acceso a la API de OpenAI
lib/                instrucciones del tutor, esquema de preguntas y errores de API
.env.example        plantilla de configuración (la clave real va en .env)
tests/              pruebas del servidor, contenido e interfaz
plantillas/         plantilla CSV de importación
manual/             manual de ayuda (index.html), capturas (img/) y script que las genera
```

### Regenerar las capturas del manual

Si cambia la aplicación, las capturas se regeneran con los datos de ejemplo (requiere Node.js y Google Chrome):

```
npm install puppeteer-core
node manual/capturas.js
```
