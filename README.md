# appGRD · Análisis de costos de egreso por GRD (Chile)

**Herramienta docente para alumnos del Magíster · Sistema de Salud · Universidad de los Andes (UANDES).**

Aplicación web local (HTML + CSS + JavaScript, sin dependencias) para analizar egresos hospitalarios bajo el mecanismo de pago por **Grupos Relacionados por el Diagnóstico (IR-GRD)** usado por MINSAL y FONASA.

```
Pago del egreso = Precio base × Peso relativo del GRD
Resultado       = Pago − Costo total asignado
```

## Uso

**Manual de ayuda:** [manual/index.html](manual/index.html) — guía paso a paso de cada módulo, con capturas y datos de ejemplo. También se abre desde la pestaña *Manual de ayuda* de la aplicación.

Abrir `index.html` en Chrome o Edge. No requiere servidor ni conexión a internet. Los datos se guardan sólo en el navegador (localStorage); use *Parámetros → Descargar respaldo* para exportarlos.

## Funcionalidades

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
plantillas/         plantilla CSV de importación
manual/             manual de ayuda (index.html), capturas (img/) y script que las genera
```

### Regenerar las capturas del manual

Si cambia la aplicación, las capturas se regeneran con los datos de ejemplo (requiere Node.js y Google Chrome):

```
npm install puppeteer-core
node manual/capturas.js
```
