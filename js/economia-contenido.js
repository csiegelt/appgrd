/* Síntesis docente del documento aportado. Los ejemplos numéricos nuevos son simulados. */
const ECONOMIA_ASIGNATURA = (() => {
  const source = 'RESUMEN ECONOMIA CLAUDE.docx · guía organizada desde el documento, con precisiones conceptuales y ejercicios simulados de salud. Economías de escala: complemento solicitado.';
  const lesson = (id, title, objective, summary, text, qa, lab) => ({ id: 'econ-' + id, title, objective, summary, text, source, materialStatus: 'provided', lab,
    questions: qa.map(([prompt, answer, explanation], i) => ({ id: `econ-${id}-q${i + 1}`, prompt, answer, explanation })) });
  const lessons = [
    lesson('incentivos', 'Personas, incentivos y decisiones', 'Distinguir motivaciones e incentivos y explicar una decisión sanitaria.', [
      'La escasez obliga a elegir. El costo de oportunidad es la mejor alternativa que se deja de realizar.',
      'La motivación es interna; el incentivo es una condición externa que puede influir en la conducta.',
      'La clase distingue motivación intrínseca, extrínseca y trascendente. Una persona puede combinar las tres.'
    ], `Secciones 1 y 14 del documento
La economía estudia cómo se asignan recursos escasos y cómo responden las personas a restricciones e incentivos. El interés propio es una herramienta de análisis; no implica que todas las personas sean egoístas ni que el dinero sea su única motivación.
Intrínseca: satisfacción de aprender y realizar bien una tarea. Extrínseca: sueldo, reconocimiento o condiciones laborales. Trascendente: efecto del trabajo en otras personas, como mejorar la experiencia de un paciente.
Ejemplo de salud
Una enfermera puede disfrutar de enseñar (intrínseca), recibir un bono de capacitación (extrínseca) y valorar que la familia pueda cuidar mejor al paciente (trascendente). El bono es un incentivo externo; la motivación depende de la persona y del contexto.
Un bono por número de consultas puede aumentar el volumen, pero también acortar la atención. Para evaluar su diseño, observa acceso, calidad, esfuerzo y posibles conductas no deseadas.
Necesidad, demanda y equidad
Necesitar una prestación no garantiza poder pagarla. La demanda efectiva incorpora disposición y capacidad de pago. Por eso la asignación exclusivamente por precios puede dejar necesidades sin atención.
El documento expone una perspectiva de clase sobre propiedad, libertad, lucro y bien común. Son argumentos normativos que se deben distinguir de identidades matemáticas o resultados empíricos. La pobreza y los resultados de salud tienen múltiples determinantes.
Ejercicio resuelto
Si una hora de pabellón se usa para la cirugía A, el costo de oportunidad incluye el beneficio de la mejor cirugía alternativa viable que no se realiza. No se reduce al dinero pagado por esa hora.`, [
      ['¿Cómo distinguir motivación de incentivo en un hospital?', 'La motivación es interna; un bono, una regla o una evaluación son incentivos externos.', 'Un mismo incentivo puede producir respuestas distintas según los objetivos de cada profesional.'],
      ['¿Cuáles son los tres tipos de motivación de la clase?', 'Intrínseca: la actividad; extrínseca: sus recompensas; trascendente: su efecto en otros.', 'Aprender, recibir un bono y mejorar el bienestar del paciente son ejemplos respectivos.'],
      ['¿Cuál es el costo de oportunidad de asignar un pabellón?', 'El valor de la mejor alternativa viable que se sacrifica.', 'Los recursos escasos tienen usos alternativos, incluso si no hay un pago adicional.']
    ]),
    lesson('flujo', 'Flujo circular, eficiencia y equidad', 'Relacionar recursos, ingresos y prestaciones, distinguiendo eficiencia de equidad.', [
      'Los hogares aportan factores y reciben ingresos; compran bienes y servicios a las organizaciones.',
      'Eficiencia productiva: producir el resultado con el menor uso de recursos para una calidad definida.',
      'Equidad considera necesidades y distribución. Eficiencia y equidad son criterios distintos que deben discutirse juntos.'
    ], `Secciones 2 y 4 del documento
El circuito real lleva trabajo y otros factores desde hogares a empresas, y bienes y servicios en sentido inverso. El circuito monetario lleva remuneraciones a hogares y gasto a las empresas. El Estado recauda, redistribuye, regula y también presta servicios.
Ejemplo sanitario
Un hogar aporta horas de trabajo de una tecnóloga médica; el laboratorio paga remuneraciones. El laboratorio compra insumos y presta exámenes, financiados por pacientes o aseguradores. El gasto de una parte es ingreso de otra, pero ingreso no equivale a utilidad: aún hay costos.
Qué, cómo, para quién y cuánto producir
El mercado considera precios, costos y demanda efectiva. La política sanitaria agrega necesidad, carga de enfermedad, protección financiera y equidad. Los sistemas reales combinan instituciones y criterios; la tabla mercado/Estado del apunte es una simplificación didáctica.
Eficacia significa cumplir el objetivo. Eficiencia significa relacionar resultados y recursos. Comparar dos centros exige ajustar calidad, complejidad de pacientes y productos; atender más pacientes por sí solo no demuestra mayor eficiencia.
Igualdad y equidad
Entregar la misma cantidad de recursos a todas las personas puede ser insuficiente si sus necesidades son diferentes. La equidad puede justificar más apoyo a quienes enfrentan mayor riesgo o barreras de acceso.
Gasto y resultados
Un gráfico de gasto sanitario describe recursos, no prueba calidad ni causalidad. Las comparaciones monetarias del apunte mezclan referencias temporales; no se presentan aquí como cifras actuales. Educación, entorno, condiciones sociales, conductas y atención sanitaria contribuyen a los resultados de salud.`, [
      ['¿Qué reciben los hogares por aportar factores de producción?', 'Remuneraciones y otras rentas del trabajo, tierra y capital.', 'En un esquema simplificado, los ingresos permiten comprar bienes y servicios; gasto e ingreso son dos caras del circuito.'],
      ['¿Más consultas por hora siempre significa mayor eficiencia?', 'No: hay que comparar recursos, calidad, complejidad y resultados.', 'Reducir el tiempo a costa de la calidad puede aumentar el volumen sin mejorar el desempeño.'],
      ['¿Por qué igualdad no garantiza equidad?', 'Porque las personas pueden tener necesidades y barreras distintas.', 'Asignar recursos según necesidad puede requerir montos diferentes.']
    ]),
    lesson('fallas', 'Particularidades de los mercados de salud', 'Reconocer incertidumbre, asimetría, externalidades y bienes públicos.', [
      'El apunte organiza ocho particularidades siguiendo a Phelps: riesgo, seguros, información, instituciones sin fines de lucro, entrada regulada, equidad, intervención pública y externalidades.',
      'Bien público puro: no rivalidad y no exclusión. Financiar una prestación con impuestos no cambia automáticamente su naturaleza económica.',
      'Una externalidad afecta a terceros fuera de la transacción; un beneficio privado y uno social pueden diferir.'
    ], `Secciones 3, 4 y 13 del documento
La enfermedad y la respuesta a tratamientos son inciertas. El profesional y el paciente poseen información distinta; esta diferencia no requiere que alguno mienta. Los seguros protegen frente a gastos inciertos, pero alteran incentivos.
Ocho particularidades para recordar
1. Incertidumbre y riesgo. 2. Importancia de los seguros. 3. Información asimétrica. 4. Entidades sin fines de lucro. 5. Restricciones a la entrada. 6. Equidad, necesidad y solidaridad. 7. Subsidios y provisión pública. 8. Externalidades.
Bien público o privado
Una cama hospitalaria es rival: no puede ser ocupada simultáneamente por dos pacientes en el mismo sentido. Es posible restringir su acceso. Por eso es un bien privado en la clasificación económica, aunque su financiamiento sea público. Un bien público puro combina no rivalidad y no exclusión; el polizón se beneficia sin contribuir.
Externalidades en salud
Una intervención que reduce transmisión puede beneficiar a terceros. La contaminación puede imponer costos de salud a personas ajenas a la producción. Para analizar una política, separa beneficios y costos privados de los sociales.
Precisiones al apunte
Ser una entidad sin fines de lucro se refiere a restricciones a la distribución de excedentes; no garantiza por sí solo precios bajos ni una exención tributaria universal. Las reglas tributarias y de cobertura dependen de la jurisdicción y del contrato. La información asimétrica no equivale automáticamente a fraude.`, [
      ['¿Una cama financiada por el Estado es un bien público puro?', 'No. Su consumo es rival y puede excluirse el acceso.', 'Financiamiento público y naturaleza económica del bien son dimensiones diferentes.'],
      ['Nombra cinco particularidades de las prestaciones de salud.', 'Por ejemplo: incertidumbre, seguros, información asimétrica, equidad y externalidades.', 'El documento añade instituciones sin fines de lucro, entrada regulada y provisión o subsidios públicos.'],
      ['¿Qué diferencia una externalidad positiva de un beneficio privado?', 'La externalidad beneficia a un tercero ajeno a la transacción.', 'La protección de otras personas frente a transmisión es distinta del beneficio directo que obtiene quien recibe la intervención.']
    ]),
    lesson('agencia', 'Principal, agente y mecanismos de pago', 'Anticipar incentivos y riesgos de distintos pagos a prestadores.', [
      'El principal delega; el agente decide o actúa con información que el principal no observa completamente.',
      'Pago por servicio, salario, capitación y pago por caso generan incentivos diferentes.',
      'Ningún pago garantiza calidad: se necesitan medición, ajuste de riesgo y seguimiento de resultados.'
    ], `Secciones 5, 9.5, 9.6 y 11 del documento
El paciente delega decisiones en un profesional; un directorio delega gestión en una dirección hospitalaria. El problema de agencia surge si los objetivos difieren y resulta difícil observar decisiones, esfuerzo o calidad.
La función U = f(Y, L, P, Q) del apunte representa la utilidad del médico: valora su ingreso, ocio, prestigio profesional y el bienestar del paciente. La letra Q aquí significa calidad/bienestar, no cantidad de mercado. Es una representación de preferencias, no una fórmula numérica universal.
Pagos e incentivos
Pago por servicio: el ingreso aumenta con prestaciones; existe riesgo de sobreprestación. Salario: facilita estabilidad; puede debilitar el incentivo al volumen. Capitación: monto por persona adscrita; incentiva controlar costos, con riesgo de subprestación y selección. Pago por desempeño: orienta hacia metas, con riesgo de descuidar lo no medido. Pago por caso/GRD: relaciona financiamiento con grupos de episodios y complejidad; puede incentivar controlar costos dentro del caso.
Estos son riesgos posibles, no conductas inevitables. Mezclar mecanismos, ajustar por complejidad y medir calidad ayuda a equilibrarlos. Un reingreso no queda automáticamente sin pago en todo sistema GRD: depende de las reglas concretas.
Caso resuelto
Si un hospital reduce estancia tras adoptar pago por caso, evalúa reingresos, resultados, complejidad y acceso antes de concluir que mejoró. Una estancia menor con más reingresos evitables puede indicar una falsa economía.
La creación de valor del apunte sigue cuatro pasos: crear, comunicar, capturar/compartir y sostener mediante innovación. En salud, el valor para el paciente requiere considerar resultados y experiencia, además de disposición a pagar.`, [
      ['En el vínculo directorio–dirección de un hospital, ¿quién delega?', 'El directorio es el principal y la dirección actúa como agente.', 'La relación de agencia no se limita al médico y al paciente.'],
      ['¿Qué riesgos contrasta pago por servicio frente a capitación?', 'Sobreprestación frente a subprestación o selección, respectivamente.', 'Son incentivos potenciales que deben acompañarse de calidad y ajuste de riesgo.'],
      ['¿Qué significa U = f(Y, L, P, Q) en el apunte?', 'La utilidad del médico depende de ingreso, ocio, prestigio y bienestar del paciente.', 'No supone que solo maximice dinero; Q tiene un significado distinto de la cantidad de un gráfico de mercado.']
    ]),
    lesson('grossman', 'Grossman: salud como capital', 'Calcular cómo cambian el stock de salud, su depreciación y la inversión.', [
      'La salud brinda bienestar directo y permite realizar actividades. Los servicios médicos son un insumo para producirla.',
      'H(t+1) = H(t) × (1 − δ) + I(t): stock anterior, menos depreciación, más inversión.',
      'El modelo ayuda a pensar mecanismos; sus parámetros no son medidas clínicas ni predicciones individuales.'
    ], `Sección 6 del documento
En el modelo de capital de salud, las personas valoran salud por sus beneficios de consumo e inversión. Atención médica, tiempo, educación y otros insumos participan en su producción: H = f(M, T, E).
La depreciación δ representa la fracción del stock que se pierde en un período. I(t) es inversión neta agregada al stock en las mismas unidades de H, no simplemente pesos gastados.
Ejemplo simulado
Con H inicial = 80, δ = 10% e I = 12 por período, el siguiente stock es 80 × 0,90 + 12 = 84. Sin inversión sería 72. Para mantener 80 en ese período se requiere I = δ × H = 8.
Predicciones y condiciones
El apunte relaciona envejecimiento con mayor depreciación y educación con eficiencia en producir salud. No son leyes deterministas para cada persona. No se debe confundir asociación con causalidad ni asumir que cualquier gasto tiene el mismo rendimiento.
En el laboratorio puedes comparar el stock con inversión constante y sin inversión durante varios períodos. El índice es abstracto y no tiene un techo clínico de 100.`, [
      ['Según Grossman, ¿se demanda salud o únicamente atención médica?', 'Se valora la salud; la atención médica es uno de sus insumos.', 'Tiempo, educación y otros factores también intervienen en la producción de salud.'],
      ['Si H=80, δ=10% e I=12, ¿cuánto vale el siguiente stock?', '84 unidades de salud del modelo.', '80 × (1 − 0,10) + 12 = 84. La inversión compensa 8 unidades depreciadas y agrega 4 netas.'],
      ['¿Cuánta inversión mantiene constante H en un período?', 'I = δ × H.', 'La inversión debe compensar exactamente la depreciación de ese período.']
    ], 'grossman'),
    lesson('productividad', 'Productividad marginal y capacidad', 'Distinguir beneficio total, beneficio marginal y restricciones de capacidad.', [
      'Marginal significa el cambio al agregar una unidad; decreciente no significa necesariamente negativo.',
      'La figura del documento usa 95, 80, 45 y −5. Se conservan como valores ilustrativos, sin tratarlos como eficacias clínicas.',
      'Aumentar un factor manteniendo otros fijos es distinto de ampliar todos los recursos a largo plazo.'
    ], `Secciones 7 y 14; gráfico 1 del documento
La productividad marginal de atención es ΔH/ΔM: cuánto cambia el resultado de salud al agregar atención y mantener constantes otros factores. Si la ganancia pasa de 8 a 4 unidades, sigue siendo positiva pero disminuye. Si es cero, el total deja de aumentar en ese margen; si es negativa, el total cae.
La figura del apunte compara APS/vacunación, urgencias, seguimiento y exámenes redundantes con valores 95, 80, 45 y −5. No especifica población, denominador ni estimación. Por ello se presentan como un índice ilustrativo editable, no como porcentajes de eficacia ni una prioridad clínica generalizable. Tampoco son necesariamente cuatro etapas del mismo paciente.
Iatrogenia es daño causado por la atención. Puede existir aun cuando el beneficio neto de una intervención sea positivo; no aparece exclusivamente después de una supuesta cantidad óptima universal.
Capacidad instalada
Si agregas cirujanos sin ampliar pabellones ni equipos, puede haber un factor limitante. Eso ilustra rendimiento marginal de un insumo en el corto plazo. Las economías de escala preguntan qué sucede al ampliar la organización y ajustar todos los factores.
Actividad
Cambia una barra negativa a positiva. Describe la diferencia entre daño neto, ganancia pequeña y ganancia grande. Evita interpretar los valores ilustrativos como decisiones para un paciente.`, [
      ['¿Productividad marginal decreciente significa que la salud total cae?', 'No. Puede seguir aumentando, pero cada unidad agrega menos.', 'El total cae en el tramo donde el cambio marginal es negativo.'],
      ['¿Qué representa el −5 del gráfico del apunte en este laboratorio?', 'Un valor ilustrativo de aporte marginal negativo.', 'No hay una base empírica documentada para tratarlo como un porcentaje clínico universal.'],
      ['¿Agregar médicos sin ampliar pabellones estudia economías de escala?', 'No directamente: cambia un factor manteniendo otro fijo.', 'Escala de largo plazo permite ajustar todos los insumos; productividad marginal analiza un insumo adicional.']
    ], 'productivity'),
    lesson('mercado', 'Oferta, demanda y equilibrio', 'Leer los ejes y distinguir movimientos de desplazamientos.', [
      'En estos gráficos Q va horizontal y P vertical. Conceptualmente puedes expresar Q como función de P, o usar la función inversa.',
      'Cambiar el precio propio mueve sobre las curvas; cambiar ingreso, preferencias, costos o tecnología puede desplazarlas.',
      'El equilibrio requiere Qd = Qs al mismo precio. Necesidad sanitaria y demanda efectiva son conceptos distintos.'
    ], `Sección 8.1–8.5; gráficos 2 a 5 del documento
La demanda relaciona precios y cantidades que se desean y pueden comprar, manteniendo constantes otros determinantes. La oferta relaciona precios y cantidades dispuestas a producir. El modelo competitivo es una herramienta; no representa automáticamente mercados con listas de espera, tarifas administradas, barreras de acceso o poder de mercado.
Ejemplo de la bebida
Q=1,2,3,4 y P=1.100,900,700,500. La recta inversa es P=1.300−200Q. A P=700 se demandan 3 unidades. Este ejemplo de demanda no tiene el mismo equilibrio que el dibujo posterior.
Ejemplo de equilibrio del documento
Se reconstruye una tabla coherente: a P=900, Qd=Qs=3; a P=1.500, Qd=1 y Qs=5; a P=500, Qd=5 y Qs=1. Entre filas se interpola. El punto de equilibrio se calcula en el cruce, corrigiendo la ubicación imprecisa del dibujo original.
Moverse o desplazar
Un precio mayor reduce la cantidad demandada sobre la misma curva. Más ingreso puede desplazar la demanda a la derecha si el bien es normal; para un bien inferior, la dirección puede ser contraria. Menores costos pueden aumentar oferta. Un sustituto satisface una necesidad parecida; un complemento se usa conjuntamente.
En el simulador, subir el precio de demanda de cada Q desplaza demanda hacia arriba/derecha. Subir los costos de oferta de cada Q desplaza oferta hacia arriba/izquierda. Modifica primero un factor, observa el resultado y luego combina ambos.
En competencia con precios flexibles, excesos pueden generar presión de ajuste. No se presupone ajuste inmediato ni que toda lista de espera sea explicable solo por precios.`, [
      ['¿Dónde van P y Q en el gráfico económico convencional?', 'P en el eje vertical y Q en el horizontal.', 'La posición no convierte a Q en causa: puedes expresar Q(P) o su función inversa P(Q).'],
      ['¿Qué cambia si sube el precio propio? ¿Y si sube el ingreso?', 'El precio mueve sobre la curva; el ingreso puede desplazarla.', 'La dirección del efecto ingreso depende de si el bien es normal o inferior.'],
      ['Con Qd=1 y Qs=5 a P=1.500, ¿qué exceso existe?', 'Exceso de oferta de 4 unidades.', 'Oferta menos demanda: 5−1=4. No es el punto de equilibrio.']
    ], 'market'),
    lesson('elasticidad', 'Elasticidad y gasto total', 'Calcular elasticidad arco y explicar su relación con el ingreso total.', [
      'Elasticidad = cambio porcentual en cantidad / cambio porcentual en precio; no tiene unidades.',
      'El método del punto medio usa el promedio de los dos valores como base, por lo que funciona igual en ambos sentidos.',
      'Una necesidad con pocos sustitutos puede tener menor sensibilidad, pero el acceso y el ingreso también limitan la demanda.'
    ], `Sección 8.8 del documento; desarrollo numérico de práctica
E = [(Q₂−Q₁)/((Q₁+Q₂)/2)] ÷ [(P₂−P₁)/((P₁+P₂)/2)]. En una demanda decreciente el signo es negativo. La clasificación usa |E|: menor que 1 inelástica, igual a 1 unitaria, mayor que 1 elástica.
Ejemplo sanitario simulado
El precio de consultas cambia de $20.000 a $25.000 y la cantidad de 100 a 90. ΔQ/promedio Q = −10/95 = −10,53%; ΔP/promedio P = 5.000/22.500 = 22,22%. E = −0,474. El gasto total pasa de $2.000.000 a $2.250.000.
Ingreso total = P × Q. Con demanda inelástica, un alza de precio aumenta ingreso total entre esos puntos. Con demanda elástica lo reduce. Ingreso total del prestador no significa utilidad: aún deben restarse costos.
Precauciones al leer una pendiente
Una curva más empinada no basta para comparar elasticidades si cambian unidades, escalas o el punto observado. La elasticidad puede variar a lo largo de una demanda lineal. Dos observaciones no identifican un efecto causal si también cambiaron ingreso, calidad u otros factores.
Oferta y casos extremos
Es usa los mismos porcentajes del punto medio sobre la cantidad ofrecida. Para P de 4 a 5 y Q inicial 100: Q final 100 da Es=0; 110 da Es≈0,429; 125 da Es=1; 200 da Es=3. Una curva vertical representa cantidad fija; una horizontal, el caso ideal perfectamente elástico. Dos observaciones idénticas no permiten calcular elasticidad. La oferta responde según capacidad, inventarios, movilidad de insumos y tiempo disponible.
Demanda lineal y máximo ingreso
En P=7−0,5Q, la elasticidad puntual en magnitud es P/(0,5Q). Supera 1 en la mitad superior y es menor que 1 en la inferior. En Q=7 y P=3,5 vale 1 y el ingreso máximo es 24,5. Una tabla que salta de Q=6 a Q=8 muestra ingresos 24 en ambos puntos, pero no incluye ese máximo. El laboratorio distingue la elasticidad puntual de la elasticidad arco entre dos filas.
Desplazamientos de oferta
Trigo: más oferta puede llevar de P=3, Q=100 a P=2, Q=110 sobre la misma demanda inelástica; el ingreso baja de 300 a 220. Petróleo: una misma reducción horizontal de oferta genera un aumento mayor de precio cuando oferta y demanda responden poco. El laboratorio permite editar las sensibilidades de corto y largo plazo; los resultados no son pronósticos.
Ingreso, sustitutos y complementos
Elasticidad ingreso negativa caracteriza un bien inferior; positiva, uno normal. Entre 0 y 1 se habla de necesidad, por encima de 1 de lujo y en 1 de respuesta proporcional. Son respuestas al ingreso, no juicios sobre calidad. Elasticidad cruzada positiva es compatible con sustitutos; negativa con complementos, manteniendo lo demás constante. Una prestación de una clínica puede tener más sustitutos que el tratamiento necesario en general.
Práctica editable
Abre el laboratorio de Elasticidad: elige Demanda, Oferta, Ingresos: comparar, Demanda lineal, Trigo y petróleo o Ingreso y elasticidad cruzada. Cambia los valores o deslizadores; toca los puntos, curvas y áreas para leer sus explicaciones debajo del gráfico.`, [
      ['¿Cómo se clasifica una elasticidad precio de −0,47?', 'Inelástica, porque su magnitud es menor que 1.', 'El signo indica dirección; el valor absoluto se usa para clasificar sensibilidad.'],
      ['¿Por qué utilizar el método del punto medio?', 'Usa una base simétrica y obtiene la misma elasticidad al invertir los puntos.', 'Ambas variaciones porcentuales se dividen por el promedio correspondiente.'],
      ['¿Una curva empinada siempre prueba demanda inelástica?', 'No: la elasticidad depende de porcentajes y del punto observado.', 'Cambiar las unidades del gráfico cambia su apariencia sin cambiar la elasticidad.']
    ], 'elasticity'),
    lesson('monopolio', 'Monopolio, ingreso marginal y pérdida social', 'Comparar competencia y monopolio con la misma demanda y costos.', [
      'Demanda lineal: P=a−bQ. Ingreso marginal: IMg=a−2bQ, por debajo del precio.',
      'El monopolista de precio único maximiza beneficios en IMg=CMg cuando hay solución interior.',
      'La pérdida social corresponde a intercambios con beneficio mayor que costo que dejan de ocurrir.'
    ], `Secciones 8.6 y 8.7; gráfico 6 del documento
En competencia, una empresa tomadora de precios enfrenta IMg=P. Un monopolista de precio único enfrenta toda la demanda: para vender más debe reducir el precio, afectando también las unidades anteriores.
Modelo del laboratorio
P=a−bQ, IMg=a−2bQ y CMg=c+dQ. La competencia de referencia cumple P=CMg: Qc=(a−c)/(b+d). El monopolio cumple IMg=CMg: Qm=(a−c)/(2b+d). Luego Pm se lee en la demanda, no en IMg.
Ejemplo simulado
a=1.500, b=200, c=300, d=200. Qc=3 y Pc=900; Qm=2 y Pm=1.100. La pérdida social es ½×(3−2)×(1.100−700)=200 unidades monetarias por período. El gráfico ubica el triángulo entre demanda y costo marginal, de Qm a Qc.
Condiciones
Se mantiene la misma demanda y tecnología para ambas estructuras; no hay discriminación de precios ni externalidades y las cantidades son continuas. Si a≤c, este modelo no tiene producción positiva rentable. Los costos fijos no están incluidos y podrían afectar la decisión de operar.
Los precios comparativos de medicamentos del apunte son referencias de clase, no cotizaciones actuales. Monopolio significa un vendedor; monopsonio significa un comprador y requiere un análisis distinto.`, [
      ['¿Por qué IMg es menor que P en monopolio de precio único?', 'Vender más exige bajar el precio también de las unidades anteriores.', 'Para P=a−bQ, el ingreso total es aQ−bQ² y su derivada es a−2bQ.'],
      ['¿En qué curva se lee el precio del monopolista?', 'En la demanda, a la cantidad donde IMg=CMg.', 'Usar la altura del cruce IMg–CMg como precio es un error frecuente.'],
      ['¿Qué representa la pérdida social del monopolio?', 'Intercambios no realizados cuyo beneficio marginal supera el costo marginal.', 'No es simplemente la transferencia de ingreso del comprador al vendedor.']
    ], 'monopoly'),
    lesson('seguros', 'Seguros, copagos y experimento RAND', 'Distinguir protección financiera, selección adversa y riesgo moral.', [
      'El seguro agrupa riesgos. Riesgo moral: cambios de conducta tras cobertura; selección adversa: información que afecta quién contrata.',
      'El precio de bolsillo puede ser menor que el precio total. Reducir copago puede elevar uso y gasto del asegurador.',
      'Mayor utilización no demuestra inutilidad. Los copagos pueden reducir atención efectiva y menos efectiva.'
    ], `Secciones 9 y 10 del documento
El seguro reparte costos inciertos entre muchas personas. La prima actuarial esperada depende de probabilidades y costos; los recargos pueden cubrir administración, reservas y margen. Agrupar riesgos no elimina toda incertidumbre ni riesgos correlacionados.
Corrección aritmética del ejemplo
Con probabilidad anual de 1% y costo por evento de $1.000.000, el costo esperado anual es $10.000 por persona. Dividido entre 12 da $833,33 mensuales antes de recargos, no exactamente $900. Ahorrar $1.000.000 en 36 meses requiere $27.777,78 al mes. Son mecanismos diferentes de protección y liquidez.
En el laboratorio
Se fija el precio del prestador y se cambia el porcentaje de copago. Precio de bolsillo = precio × copago. Q = máximo(0, A−B×precio de bolsillo). Gasto total = precio × Q. El total se reparte entre paciente y asegurador; no desaparece cuando el copago es cero. El modelo omite primas, deducibles, topes, oferta limitada y cambios de calidad.
Selección adversa y selección de riesgos
La primera describe diferencias de información que influyen en la contratación de cobertura. La selección de riesgos describe estrategias del asegurador para atraer personas de menor costo. Un ajuste de riesgo busca compensar diferencias de costos esperados.
RAND: cómo interpretar el resultado
El experimento se realizó entre 1974 y 1982. Encontró menor utilización con participación del paciente en el costo. Esa reducción alcanzó atención muy efectiva y menos efectiva. Los promedios de salud no permiten concluir que toda atención evitada fuera innecesaria; algunos grupos vulnerables se beneficiaron de atención gratuita.
Fuente primaria: RAND, The Health Insurance Experiment, https://www.rand.org/pubs/research_briefs/RB9174.html
El simulador ilustra un mecanismo económico; sus números no reproducen estimaciones del experimento ni recomiendan un copago para pacientes reales.`, [
      ['¿Qué distingue selección adversa de riesgo moral?', 'Información que afecta la contratación frente a conducta que cambia tras tener cobertura.', 'No son sinónimos de enfermedad, deshonestidad ni uso innecesario.'],
      ['Si P=$20.000 y el copago es 25%, ¿cuánto paga el paciente por atención?', '$5.000; los otros $15.000 corresponden al asegurador en este modelo.', 'El precio total no baja a $5.000: cambia quién financia cada parte.'],
      ['¿RAND demuestra que toda atención reducida por copagos era innecesaria?', 'No: disminuyeron servicios efectivos y menos efectivos.', 'La interpretación debe considerar resultados, subgrupos vulnerables y límites del experimento.']
    ], 'insurance'),
    lesson('escala', 'Costos y economías de escala', 'Comparar dos volúmenes y explicar costo total, medio y marginal.', [
      'Costo medio = costo total/Q; costo marginal = costo de una unidad adicional. Son medidas distintas.',
      'Economías de escala: el costo medio de largo plazo cae al ampliar producción, ajustando todos los insumos.',
      'Diluir costos fijos a corto plazo no demuestra por sí solo economías de escala de largo plazo.'
    ], `Complemento práctico solicitado; conexión con capacidad y productividad de las secciones 7, 8 y 14
Dos perspectivas
Corto plazo: CT=F+vQ+kQ², CMe=F/Q+v+kQ, CMg=v+2kQ. F es costo fijo por período, v costo variable inicial y k representa congestión. La capacidad no se ajusta libremente. Con k=0, aumentar Q distribuye el mismo costo fijo entre más atenciones.
Largo plazo: se permite adaptar todos los recursos. El modelo ilustrativo usa CT=C₀×(Q/Q₀)^α. C₀ es el costo total a la escala de referencia Q₀. CMe=CT/Q y CMg=α×CT/Q. Con α<1 hay economías de escala; α=1 mantiene costo medio; α>1 produce deseconomías. El modelo describe un tramo y no implica que crecer indefinidamente sea óptimo.
Ejercicio resuelto de corto plazo
Un laboratorio tiene F=$1.000.000 por mes, v=$5.000 por examen y k=0. Con 100 exámenes, CT=$1.500.000 y CMe=$15.000. Con 200, CT=$2.000.000 y CMe=$10.000. El costo total crece 33,33%, pero el costo por examen cae 33,33%. Esto muestra dilución del costo fijo.
Ejercicio de largo plazo
Si al adaptar todas las instalaciones y equipos la producción se duplica y el costo total crece menos del doble, el costo medio disminuye. Si ambos se duplican, permanece constante. Compara establecimientos con calidad y complejidad equivalentes; centralizar también puede aumentar costos de acceso para pacientes.
En el formulario
Configura el modelo, Q de A y Q de B. Oculta resultados, calcula ambos costos medios y el cambio porcentual (CMeB/CMeA−1)×100. Comprueba y consulta la solución paso a paso. Los datos son simulados y no representan presupuestos de hospitales reales.
Referencia conceptual: OpenStax, Costs in the Long Run, https://openstax.org/books/principles-microeconomics-3e/pages/7-5-costs-in-the-long-run`, [
      ['¿Costo medio y marginal son iguales?', 'No. Medio=CT/Q; marginal=cambio del costo total por una unidad adicional.', 'En el modelo de corto plazo CMe=F/Q+v+kQ y CMg=v+2kQ.'],
      ['Si todos los insumos son ajustables y duplicar Q aumenta CT menos del doble, ¿qué ocurre?', 'Disminuye el costo medio: hay economías de escala en ese tramo.', 'Se analiza largo plazo con productos y calidad comparables.'],
      ['Con F=$1.000.000, v=$5.000, k=0 y Q=200, ¿cuál es el costo medio?', '$10.000 por examen.', 'CT=1.000.000+5.000×200=2.000.000; dividir por 200 da 10.000.']
    ], 'scale')
  ];
  const cases = [
    { id: 'econ-caso-escala', lesson: 'econ-escala', title: 'Ampliar un laboratorio municipal', role: 'Director/a de hospital', fictional: true, text: 'Un laboratorio procesa 100 exámenes al mes. Tiene un costo fijo de $1.000.000 y un costo variable de $5.000 por examen. Puede llegar a 200 sin ampliar equipos. Debes evaluar la propuesta.', steps: [
      ['Calcular', '¿Cuánto cuestan en total y por examen los escenarios de 100 y 200?', '100: total $1.500.000 y medio $15.000. 200: total $2.000.000 y medio $10.000.'],
      ['Interpretar', '¿Esto demuestra economías de escala de largo plazo?', 'Demuestra dilución del costo fijo a corto plazo. Para hablar de largo plazo hay que evaluar el ajuste de todos los insumos.'],
      ['Decidir', '¿Qué comprobarías antes de ampliar el volumen?', 'Demanda real, calidad, personal, insumos, capacidad, tiempos y acceso; también el presupuesto total, que aumenta.']
    ] },
    { id: 'econ-caso-copago', lesson: 'econ-seguros', title: 'Reducir el copago de consultas', role: 'Gestor/a de una red de salud', fictional: true, text: 'Una red estudia reducir el copago de consultas de 50% a 25%. El precio total es $20.000 y la demanda simulada es Q=150−0,005×precio de bolsillo.', steps: [
      ['Calcular', '¿Qué sucede con el precio de bolsillo y la demanda?', 'El precio de bolsillo baja de $10.000 a $5.000; la demanda aumenta de 100 a 125 consultas.'],
      ['Financiar', '¿Cómo cambia el gasto del asegurador?', 'Antes: 100×$10.000=$1.000.000. Después: 125×$15.000=$1.875.000.'],
      ['Evaluar', '¿Las 25 consultas adicionales son necesariamente innecesarias?', 'No. Hay que evaluar necesidad, resultados, acceso y equidad. El modelo de demanda no clasifica el valor clínico.']
    ] },
    { id: 'econ-caso-agencia', lesson: 'econ-agencia', title: 'Más producción, ¿mejor atención?', role: 'Director/a de hospital', fictional: true, text: 'Después de un bono por volumen aumentan 20% las consultas, pero también las reclamaciones y reconsultas. El directorio solicita una evaluación.', steps: [
      ['Diagnosticar', 'Identifica principal, agente y posible incentivo no deseado.', 'El directorio delega en la dirección y los equipos. Un bono de volumen puede desplazar esfuerzo desde calidad hacia cantidad.'],
      ['Medir', '¿Qué información permite interpretar el aumento de producción?', 'Complejidad, duración, resolutividad, reconsultas, satisfacción y acceso. Comparar períodos y causas alternativas.'],
      ['Proponer', '¿Cómo modificarías el incentivo?', 'Combinar acceso y volumen con calidad, ajuste de riesgo, auditoría y seguimiento; evitar premiar solo una cifra.']
    ] }
  ];
  return { id: 'economia-salud', name: 'Economía de la Salud', source, lessons, cases };
})();

/* Amplía el ramo existente conservando su ID, temas, notas, preguntas y avances. */
const EconomiaIntegracion = (() => {
  const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const find = state => state.subjects.find(s => s.id === 'economia-salud') || state.subjects.find(s => ['economia de la salud', 'economia salud'].includes(normalized(s.name)));
  function enhance(state) {
    const existing = find(state);
    if (!existing || existing.economiaVersion === 1) return null;
    const next = structuredClone(state), s = next.subjects.find(s => s.id === existing.id);
    // Existing lesson and case objects are kept exactly as saved; only new IDs are appended.
    for (const l of ECONOMIA_ASIGNATURA.lessons) if (!s.lessons.some(old => old.id === l.id)) s.lessons.push(structuredClone(l));
    s.cases ||= [];
    for (const c of ECONOMIA_ASIGNATURA.cases) if (!s.cases.some(old => old.id === c.id)) s.cases.push(structuredClone(c));
    s.economiaVersion = 1;
    return next;
  }
  return { find, enhance };
})();
