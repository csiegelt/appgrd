# appGRD · Análisis de costos de egreso por GRD (Chile)

Aplicación web local (HTML + CSS + JavaScript, sin dependencias) para analizar egresos hospitalarios bajo el mecanismo de pago por **Grupos Relacionados por el Diagnóstico (IR-GRD)** usado por MINSAL y FONASA.

```
Pago del egreso = Precio base × Peso relativo del GRD
Resultado       = Pago − Costo total asignado
```

## Uso

Abrir `index.html` en Chrome o Edge. No requiere servidor ni conexión a internet. Los datos se guardan sólo en el navegador (localStorage); use *Parámetros → Descargar respaldo* para exportarlos.

## Funcionalidades

| Pestaña | Contenido |
|---|---|
| Resumen | KPIs (índice casuístico, pago, costo, resultado, costo por unidad de peso, EM, IEMA, outliers), dispersión costo vs. pago, resultado por CDM, tabla por severidad y GRD con mayor pérdida |
| Distribución | Histograma + curva de densidad, bandas P25–P75 / P10–P90, curva de referencia editable, posición y percentil de la institución, evaluación de un valor, detalle por rango y box-plots por CDM / severidad / servicio / GRD |
| Egresos | Registro, edición, búsqueda, importación y exportación CSV |
| Simulador | Cálculo de un caso, precio base y peso de equilibrio, tabla de sensibilidad |
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
js/app.js           estado, persistencia y render de pestañas
plantillas/         plantilla CSV de importación
```
