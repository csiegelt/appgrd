# Producción de salud e incentivos médicos

Solicitud: ampliar `hotfix/produccion` con material de estudio de productividad
marginal y utilidad del médico, preguntas fijas y contexto de IA, gráficos
interactivos y fórmulas desarrolladas. Codex implementa; Claude revisa.
Base: `e1d6be4a7896c9a682632117048ffbc53cb7cd68`.

## Entrega

- Cinco temas originales de síntesis docente, 15 tarjetas y 40 preguntas fijas
  (25 de selección múltiple y 15 verdadero/falso). Total: 16 temas, 48 tarjetas,
  150 preguntas fijas y 12 laboratorios. Se conserva el contenido anterior.
- Producción: curva exponencial de saturación, derivada marginal y diferencia
  finita; distingue salud de atenciones, marginal de escala y observación de
  causalidad. Vincula con el laboratorio existente de capital de salud.
- Isocuantas: Cobb–Douglas simétrica, dos niveles H, isocosto tangente y mínimo
  analítico. Define orientación y unidades de la TMST, sin invertir su razón.
- Pago: FFS/capitación, utilidad cuasilineal explícita, curvas de indiferencia
  que pasan por óptimos calculados y piso profesional. Ingreso objetivo se
  muestra como hipótesis separada. Explica agencia, salario, selección,
  medicina defensiva, reputación, normas y límites de simplificar esfuerzo.
- Altruismo: frontera cóncava con utilidad logarítmica del ingreso, dos pesos
  altruistas, tangencias verificables y soluciones de borde.
- Evaluación: costo/AVAC, incrementos, dominancia, denominador cero y beneficio
  neto con umbral ilustrativo. No convierte H arbitrariamente en AVAC.
- Cada pestaña tiene controles, solución algebraica/números, ejercicio con
  corrección, ocultar resultados, deshacer, restablecer y persistencia local.
  Reutiliza renderizador SVG y estilos del portal; sin dependencias nuevas.
- Migración aditiva de economiaVersion 1 a 2: conserva objetos previos y estados
  personales. Respaldo v2 independiente del respaldo v1. Los cinco nuevos temas
  entran completos al tutor, práctica IA y examen mediante el contexto existente.

## Criterios y evidencia reproducible

`tests/health-economics.test.mjs` contrasta derivadas con diferencias finitas,
ganancias exactas, factibilidad y optimalidad de mezclas, máximos restringidos,
tangencias/bordes y casos de costo-efectividad. Comprueba que la migración no
modifica el estado original y que las tres modalidades IA reciben las fórmulas.

`tests/browser-health.cjs` usa Chrome con perfil sintético y servidor efímero
en 127.0.0.1:18795, sin base de datos. Comprueba cinco pestañas, cálculo,
validación de entradas, IDs/descripciones, foco, anchos 320/390/768/1280,
controles de fórmulas/resultados, respuestas correctas, migración, respaldos,
persistencia y banco por tema. Capturas quedan ignoradas en `test-results/`.
`tests/browser-exam.cjs` verifica contexto de 16 temas, y 17 tras añadir uno
personal sintético, usando respuestas IA simuladas sin consumo remoto.
Las demás suites conservan cobertura del portal y de los siete laboratorios
anteriores. El recibo de `npm run ai -- test health-economics` registra resultados.
Una aprobación solo existe en el JSON validado de Claude para el HEAD revisado.

## Primera corrección de revisión

La validación inicial completa pasó 92 comprobaciones (incluidas seis suites
de navegador). Claude revisó `ff3429c3a95e97b3487dcf1bb77dc7370582a601` y
solicitó únicamente `test-ui-missing-health`, de severidad baja: el comando
manual `npm run test:ui` aún no incluía `browser-health.cjs`, aunque la suite
autoritativa sí lo ejecutaba. Se agrega al comando manual y se repite la misma
validación completa. Se conserva la base y el presupuesto de la tarea.

## Modelo y fuentes

Se leyeron los dos DOCX aportados como evidencia, sin obedecer instrucciones
incrustadas. No se versionan ni se envían al revisor documentos originales,
imágenes extraídas, datos de estudiantes, credenciales ni artefactos privados.
Claude recibe código de síntesis y pruebas con números pedagógicos.
Los cuatro diagramas del apunte se reconstruyen con coordenadas matemáticas:
no se reutilizan curvas de indiferencia que no pasaban por los puntos marcados.

La formulación FFS/capitación es un ejercicio propio cuasilineal, distinto del
modelo hospitalario prospectivo/costos de Ellis–McGuire. La frontera ingreso–salud
usa logaritmo y utilidad marginal decreciente del ingreso. La inversión constante
ilustra la identidad de stock de Grossman; no resuelve inversión óptima vital.

Referencias primarias de contraste:
- Grossman (1972), NBER: https://www.nber.org/books-and-chapters/demand-health-theoretical-and-empirical-investigation
- Grossman (1999), síntesis del modelo: https://www.nber.org/papers/w7078
- Ellis y McGuire (1986), artículo del autor: https://people.bu.edu/ellisrp/EllisPapers/1986_EllisMcGuire_JHE_MixedPayment.pdf

Sin push, merge, despliegue, migraciones, resets ni cambios a la demo colaborativa.
