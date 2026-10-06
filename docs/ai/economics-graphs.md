# Gráficos y resultados de Economía

Base aprobada y publicada: `3ab7dd8b24163bf4a365f6dafadaede3a2570547`.
Solicitud: guías punteadas a los ejes, etiquetas y explicación al pasar el mouse,
resaltar ganancias/pérdidas y revisar resultados de economías de escala.

## Comportamiento

Los seis gráficos de curvas proyectan cada punto visible a ambos ejes. Los
valores próximos comparten espacio; las tarjetas de puntos conservan todas las
coordenadas legibles. Oferta y demanda también señala Qs cuando difiere de Qd.
Las curvas y puntos tienen explicación mediante mouse, foco de teclado y clic
(táctil); las etiquetas son controles alternativos de mayor tamaño. Una tarjeta
flotante respeta el viewport y se cierra con Escape, al salir o al desplazar.
La explicación también queda en texto debajo del gráfico.

Monopolio diferencia tres áreas numeradas: excedente del consumidor (azul),
excedente del productor (verde) y pérdida social (rojo rayado). Explica que el
excedente del productor descuenta costos variables; los fijos faltarían para
calcular utilidad neta. Compara con competencia: pérdida de consumidores menos
ganancia del productor equivale a pérdida social. No confunde transferencia con
destrucción de bienestar. Las áreas inexistentes se omiten cuando no hay comercio.
Ocultar resultados elimina nuevos valores exactos de etiquetas, tooltips y saldo
de bienestar; conserva explicaciones conceptuales.

## Cálculos de escala verificados

Se mantienen las funciones correctas del modelo: corto plazo CT=F+vQ+kQ²,
CMe=CT/Q, CMg=v+2kQ; largo plazo CT=C₀(Q/Q₀)^α, CMe=CT/Q y CMg=αCT/Q.
La variación usa (CMeB/CMeA−1)×100; no está definida si CMeA=0.
El resultado ahora incluye CMg junto a CT y CMe, con unidades explícitas y una
explicación de la variación. Se distingue igual volumen y reducción del volumen.

Ejemplo inicial: F=1000000, v=5000, k=0; A=100, B=200.
CT: 1500000 → 2000000; CMe: 15000 → 10000; CMg: 5000 → 5000;
variación CMe: −33,333… %. B cuesta 5000 menos por examen, aunque aumenta CT.
Con k=10: CT 1600000 → 2400000, CMe 16000 → 12000, CMg 7000 → 9000,
variación −25 %. No se presenta dilución de costo fijo como prueba de economías
de escala de largo plazo.

## Evidencia y límites

Pruebas matemáticas: identidades de costos, derivada por diferencias finitas,
α menor/igual/mayor que 1, volumen invertido/igual y costos cero. Bienestar:
excedentes y pérdida social conciliados con CMg constante y creciente; sin comercio.
Chrome real: tabla calculada, mouse, foco, Escape, clic móvil, resaltado vinculado,
modo resultados ocultos, persistencia, arrastre del precio y anchos 320–1280.
Capturas sintéticas locales de monopolio y escala inspeccionadas visualmente.

No nuevas dependencias, servicios, migraciones ni llamadas de IA de contenido.
El recibo de `npm run ai -- test economics-graphs` registra los resultados exactos.
La aprobación se obtiene del JSON privado de Claude, no de esta nota.
