# Elasticidad editable en el laboratorio original

Base aprobada: `4a882f934c424b8d83ad861b36e1460ef3104a63`.
Solicitud: ampliar los gráficos con elasticidad de oferta y demanda, los ejemplos
aportados de ingresos, demanda lineal, trigo y petróleo; evitar etiquetas sobre tarjetas.

## Uso y comportamiento

Economía de la Salud → Laboratorio de gráficos → Elasticidad → Qué quieres explorar.
Seis vistas: Demanda, Oferta, Ingresos: comparar, Demanda lineal, Trigo y petróleo,
Ingreso y elasticidad cruzada. Se conserva el diseño del portal y sus controles
de fórmulas, ocultar resultados, deshacer, restablecer y guardar en el navegador.
Los ejemplos son numéricos e ilustrativos, editables sin IA ni red.

Demanda/oferta incluyen los cinco casos extremos e intermedios, dos observaciones
editables y deslizadores. La curva une los puntos; la cifra informada es elasticidad
arco por punto medio. La pendiente visual depende de unidades/escala. El signo
atípico genera una explicación, sin atribuir causalidad a dos observaciones.
Las curvas se acotan antes de crear el SVG para que una extrapolación muy grande
no haga desaparecer el trazo en Chrome. Los ejemplos independientes se conservan
al cambiar de vista y los ejercicios guardados con el esquema anterior se amplían.

Se elimina la tarjeta flotante: mouse, foco y toque actualizan un panel propio
debajo del gráfico. Cada gráfico tiene IDs y descripciones independientes.
Las etiquetas de puntos buscan espacio libre dentro del gráfico; las coincidentes
se agrupan y siempre existen controles con nombres y coordenadas debajo.
Escape elimina el resaltado, manteniendo el texto para poder leerlo.

## Cálculos y evidencia sintética

- P 4→5, Q 100→90: E=−9/19, ingresos 400→450; gana 90 por precio y pierde 40 por cantidad.
- P 4→5, Q 100→70: E=−27/17, ingresos 400→350; gana 70 y pierde 120.
- Las áreas rojas rayadas y verdes no se superponen. Si P sube, ΔIT=ΔP×Q₂+P₁×ΔQ;
  si P baja, ΔIT=ΔP×Q₁+P₂×ΔQ. Así invertir los estados invierte exactamente cada efecto.
  Ingreso no equivale a utilidad; no se han descontado costos.
- Oferta P 4→5, Q inicial 100 y final 100/110/125/200: E=0, 3/7, 1, 3.
  Dos cantidades distintas a P=4 muestran el caso horizontal ideal infinito.
  Dos estados idénticos y promedios cero quedan indefinidos, no como E=0.
- Demanda P=7−0,5Q: ingresos por filas 0,12,20,24,24,20,12,0;
  magnitudes arco 13,11/3,9/5,1,5/9,3/11,1/13. El máximo exacto es 24,5
  en P=3,5/Q=7, separado de los puntos muestreados. Elasticidad puntual
  P/(bQ), no definida en Q=0 con límite infinito desde Q positivo.
- Trigo: P₀=3, Q₀=100, sensibilidades iniciales 0,3/0,3, oferta +20 unidades
  a cada precio: P₂=2, Q₂=110, ingresos 300→220.
- Petróleo: P₀=50, Q₀=100, oferta −10 unidades a cada precio. Corto plazo
  sensibilidades 0,2/0,2 da P₂=62,5; largo 1/1 da P₂=52,5. Ejes compartidos.
  Modelos lineales locales: elasticidades especificadas en el equilibrio inicial,
  no constantes en toda la recta. Un equilibrio no positivo recibe feedback,
  sin recortar valores y fingir un equilibrio. Los horizontes son editables.
- Ingreso/cross conservan signo: normal/inferior y sustitutos/complementos.
  E ingreso=1 se distingue como respuesta proporcional. Las explicaciones incluyen
  determinantes, tiempo, sustitutos, aplicación sanitaria e incidencia tributaria.

`tests/elasticity.test.mjs` verifica identidades, extremos, simetría, tabla,
equilibrios y preservación entre editores. `tests/browser-elasticity.cjs` usa
Chrome real: presets, edición, sliders, curvas acotadas, tabla, escenarios,
foco/táctil, descripciones fuera de tarjetas, etiquetas sin colisiones, IDs,
resultados ocultos, persistencia y migración; anchos 320/390/768/1280.
Las cinco pruebas de navegador también cubren todas las regresiones anteriores.
Capturas sintéticas de comparación, demanda, recta y petróleo quedan en
`test-results` (ignorado); se inspeccionaron comparación y petróleo móvil.

El recibo de `npm run ai -- test elasticity-lab` es la evidencia ejecutable completa.
La revisión solo se considera aprobada si lo indica el JSON privado de Claude.
Sin push, despliegue, migraciones ni acceso a información privada de alumnos.

## Fuentes conceptuales

Texto y dibujos propios, basados en las figuras del usuario y estas referencias:

- https://openstax.org/books/principles-economics-3e/pages/5-1-price-elasticity-of-demand-and-price-elasticity-of-supply
- https://openstax.org/books/principles-economics-3e/pages/5-2-polar-cases-of-elasticity-and-constant-elasticity
- https://openstax.org/books/principles-economics-3e/pages/5-3-elasticity-and-pricing
- https://openstax.org/books/principles-economics-3e/pages/5-4-elasticity-in-areas-other-than-price
