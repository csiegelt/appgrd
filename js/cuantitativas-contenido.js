/* Material incluido del ramo; no requiere importar archivos ni consumir API. */
const CUANTITATIVAS_ASIGNATURA = {
  "id": "herramientas-cuantitativas",
  "name": "Herramientas Cuantitativas",
  "source": "MAGS 2026 · Regresiones, Chi cuadrado, Búsquedas y Erlang. Datos de los cuatro archivos proporcionados; ejemplos nuevos de salud simulados.",
  "lessons": [
    {
      "id": "cuant-regresion",
      "title": "Correlación y regresión lineal",
      "objective": "Distinguir r de R², ajustar una recta y explicar sus predicciones y límites en salud.",
      "summary": [
        "Pearson r describe dirección e intensidad lineal; R² describe el ajuste.",
        "La pendiente tiene unidades de Y por unidad de X; predicción no significa causalidad.",
        "Practica con Intro, países, temperaturas y dotación sanitaria simulada."
      ],
      "text": "1 · Correlación y regresión lineal\n\nIdea central: la correlación describe la dirección e intensidad de una relación lineal; la regresión estima cuánto cambia Y por unidad de X y permite obtener una predicción.\n\nConcepto\tSignificado\tEjemplo en salud\nX independiente o explicativa\tVariable que usas para explicar o predecir.\tNúmero de administrativos en recepción.\nY dependiente o respuesta\tResultado que modelas.\tEspera promedio, en minutos.\nr de Pearson\tDe −1 a +1. El signo indica dirección; su magnitud indica asociación lineal.\tr negativo: mayor dotación se asocia con menor espera.\nŷ = b + mX\tm es pendiente; b es intercepto; ŷ es el valor estimado.\tm tiene unidades de minutos por administrativo.\nR²\tFracción de variabilidad de Y explicada por el ajuste dentro de la muestra.\tNo es la probabilidad de acertar la espera de un paciente.\nResiduo\te = Y − ŷ. Es la diferencia entre observado y estimado.\tSi Y=60 y ŷ=55, el residuo es +5 minutos.\nm = Σ[(Xi − promedio X)(Yi − promedio Y)] / Σ[(Xi − promedio X)²]\nb = promedio Y − m × promedio X\nr = Σ[(Xi − promedio X)(Yi − promedio Y)] / √[Σ(Xi − promedio X)² × Σ(Yi − promedio Y)²]\nR² = 1 − Σ(Yi − ŷi)² / Σ(Yi − promedio Y)²\n\nEn regresión lineal simple con intercepto, R² = r². Por eso una relación inversa muy fuerte puede tener r negativo y R² cercano a 1. r=0 no descarta una relación curva. El buen ajuste dentro de la muestra no asegura buen desempeño con nuevos datos.\n\nCaso resuelto del archivo: “Intro”\n\nLas parejas son (2,15), (5,10), (15,3), (18,4). Usa X horizontal y Y vertical.\n\nŷ=14,9101 − 0,6910X · r=-0,9509 · R²=0,9042 · ŷ(10)=8,0000\n\nInterpretación: al aumentar X una unidad, Y disminuye en promedio unas 0,691 unidades según la recta. El intercepto corresponde a X=0, fuera del rango observado; tiene una función matemática, pero su sentido práctico debe justificarse.\n\nOtros ejercicios de tus archivos\n\n“pais esp vida”: X es ingreso per cápita PPP, Y es esperanza de vida. El encabezado “IPC PPP” se refiere al ingreso per cápita en este ejercicio, no al índice de precios al consumidor. “Preguntas” incluye temperaturas de 0 a 19 °C y ventas por hora de gaseosas y cigarrillos. “Correl financiera” tiene 20 semanas, con variaciones expresadas como decimales: 0,025 representa 2,5%.\n\nEjercicio\tn\tr\tm\tb\tR²\nPaíses: ingreso → esperanza de vida\t226\t0,5372\t0,000344\t63,5753\t0,2886\nTemperatura → gaseosas\t20\t0,9691\t1,967669\t0,5571\t0,9391\nTemperatura → cigarrillos\t20\t-0,8760\t-0,357895\t8,9000\t0,7674\nAcción → S&P\t20\t0,8902\t0,708824\t-0,0048\t0,7925\nAcción → dólar\t20\t-0,1609\t-39,679584\t700,1902\t0,0259\nDólar → Risk\t20\t0,2646\t0,000833\t-0,5867\t0,0700\nS&P → Risk\t20\t-0,9985\t-0,974166\t-0,0003\t0,9969\nLectura sanitaria de ingreso y esperanza de vida: la unidad observada es el país. Una asociación entre países no demuestra que aumentar el ingreso de una persona produzca el mismo aumento de años de vida. Pueden intervenir educación, acceso sanitario y otras variables. Los datos se reproducen como material de clase, sin presentarlos como indicadores actuales.\nEjemplo nuevo de salud: dotación y espera\n\nSeis observaciones simuladas: dotación 1,2,3,4,5,6 y espera 72,65,61,53,49,41 minutos. Calcula la recta; predice para X=4 y explica la pendiente. No interpretes esta pequeña muestra como evidencia causal: la demanda diaria también puede afectar la espera.\n\nCómo reproducirlo en Excel\nColoca X en A2:A7 y Y en B2:B7.\nCalcula correlación, pendiente, intercepto y R².\nEn C2 escribe =$H$3*A2+$H$4 si H3 tiene m y H4 tiene b; copia hacia abajo.\nInserta un gráfico de dispersión XY. Agrega tendencia lineal y activa “Mostrar ecuación” y “Mostrar R cuadrado”.\nCalcula residuos =B2-C2. Busca curvaturas, valores extremos o cambios de dispersión.\n=COEF.DE.CORREL(A2:A7;B2:B7)       [inglés: CORREL]\n=PENDIENTE(B2:B7;A2:A7)            [SLOPE]\n=INTERSECCION.EJE(B2:B7;A2:A7)      [INTERCEPT]\n=COEFICIENTE.R2(B2:B7;A2:A7)        [RSQ]\n\nLos separadores dependen de la configuración regional: puede ser necesario cambiar “;” por “,”. Para inferencias con regresión revisa independencia, linealidad, variabilidad residual y, cuando corresponda, supuestos sobre los errores.\n\nEjercita y comprueba\nCon “Intro”, estima Y cuando X=10.\nCon el caso de salud, estima la espera con cuatro administrativos e interpreta la pendiente.\nCambia la espera del sexto punto de 41 a 90. Explica cómo ese valor afecta la recta y r.\nEn países, compara la predicción para un ingreso de 20.000 con la de 200.000. ¿Cuál exige extrapolación?\nVer respuestas y criterios",
      "source": "Archivo de clase y guía de estudio corregida.",
      "materialStatus": "provided",
      "questions": [
        {
          "id": "cuant-regresion-q1",
          "prompt": "¿Qué diferencia hay entre r y R²?",
          "answer": "r indica dirección e intensidad lineal; R² mide proporción de variabilidad explicada.",
          "explanation": "R²=r² solo en regresión lineal simple con intercepto."
        },
        {
          "id": "cuant-regresion-q2",
          "prompt": "En Intro, ¿cuánto vale Y estimada para X=10?",
          "answer": "Aproximadamente 8.",
          "explanation": "ŷ=14,9101−0,6910×10≈8."
        },
        {
          "id": "cuant-regresion-q3",
          "prompt": "En el ejemplo de dotación y espera, ¿qué significa m≈−6,0286?",
          "answer": "Una persona activa adicional se asocia con unos 6,03 minutos menos de espera.",
          "explanation": "Son datos simulados; la asociación no establece causalidad."
        },
        {
          "id": "cuant-regresion-q4",
          "prompt": "¿Qué predicción supone extrapolación?",
          "answer": "La que usa un X fuera del rango observado.",
          "explanation": "El ajuste dentro de la muestra no valida una predicción fuera de ella."
        }
      ]
    },
    {
      "id": "cuant-chi",
      "title": "Chi cuadrado de independencia",
      "objective": "Construir observados y esperados, calcular χ² e interpretar el valor p verificando la fuente.",
      "summary": [
        "χ² compara conteos observados con los esperados bajo independencia.",
        "La base Muestra y la tabla guardada Análisis (3) discrepan: dan conclusiones distintas.",
        "Significación no mide importancia clínica ni demuestra causalidad."
      ],
      "text": "2 · Chi cuadrado de independencia\n\nPregunta: ¿la distribución de resultados clínicos está asociada al grupo de tratamiento? Ambas variables son categóricas. Se trabaja con conteos, no con promedios ni con porcentajes aislados.\n\nH₀: grupo y resultado son independientes. H₁: existe asociación. Fija α=0,05 antes de evaluar el resultado.\n\nEsperado Eij = total de fila i × total de columna j / total general\nχ² = Σ[(Oij − Eij)² / Eij]\ngl = (número de filas − 1) × (número de columnas − 1)\n\nEl valor p es la probabilidad, bajo H₀ y los supuestos de la prueba, de obtener una discrepancia al menos tan grande como la observada. No es la probabilidad de que H₀ sea verdadera.\n\nRegistros individuales de “Muestra”: tratamiento versus placebo\nGrupo\tEmpeoramiento\tMejoría\tSin cambio\tTotal\nPlacebo\t2\t9\t16\t27\nTratamiento\t51\t88\t81\t220\nN=247 · χ²=6,1449 · gl=2 · p=0,046308 · V=0,1577\n\nEn los registros individuales, placebo tiene 2 empeoramientos, 9 mejorías y 16 sin cambio. E(placebo–empeoramiento)=27×53/247≈5,7935. χ²≈6,1449 y p≈0,04631: se rechaza H₀ al 5%. Es evidencia de asociación, sin demostrar causalidad ni superioridad clínica.\n\nCorrección de “Análisis (3)”: son 247 participantes totales: 220 con tratamiento y 27 con placebo. El valor de la fórmula CHITEST en A18 es ≈0,6890. El texto lateral que dice p=0,032 y concluye significación no corresponde a esa tabla. Con esa tabla guardada, a α=0,05 no se rechaza H₀. Sin embargo, su fila placebo (6,13,8) difiere de “Muestra” (2,9,16). Los registros individuales dan p≈0,04631 y sí rechazan H₀. Actualiza el resumen desde la base antes de emitir una conclusión. La diferencia de fuentes es material.\nComparación de los tres tratamientos A, B y C\nGrupo\tEmpeoramiento\tMejoría\tSin cambio\tTotal\nA\t9\t36\t29\t74\nB\t21\t23\t30\t74\nC\t21\t29\t22\t72\nN=220 · χ²=9,8661 · gl=4 · p=0,042745 · V=0,1497\n\nSe excluye placebo: n=220, tabla 3×3, gl=4. p≈0,04275 permite rechazar H₀ al 5%. Concluye que existe asociación entre tipo de tratamiento y distribución de resultados. La prueba global no identifica por sí sola qué parejas difieren ni demuestra que A sea superior para todos los resultados. Comparaciones posteriores requieren controlar multiplicidad.\n\nSupuestos y lectura responsable\nCada persona contribuye a una sola celda; observaciones independientes.\nCategorías mutuamente excluyentes. Comprueba totales y datos faltantes.\nRevisa frecuencias esperadas. Como regla práctica, evita esperadas menores que 1 y procura que al menos 80% sean ≥5; en los casos originales de esta guía todas son ≥5.\nCon conteos pequeños, valora métodos exactos o simulación; no juntes categorías sin justificación.\nSignificación estadística no mide importancia clínica. Añade proporciones y una medida como V de Cramér.\nV de Cramér = √[χ² / (N × mínimo(filas−1; columnas−1))]\nExcel: =PRUEBA.CHICUAD(B2:D3;B7:D8) [inglés: CHISQ.TEST]\nEsperados: =$E2*B$4/$E$4   (ajusta los rangos a tu tabla)\nEjemplo nuevo de salud\n\nDos circuitos de alta y tres estados de seguimiento, con datos simulados. Circuito habitual: 20 con deterioro, 40 con mejoría y 40 sin cambio; circuito con seguimiento: 10,65,25. Evalúa asociación y calcula el porcentaje de mejoría por grupo. Una asociación no elimina sesgos ni diferencias basales.\n\nEjercita\nCalcula el esperado de A–Mejoría y su contribución a χ².\n¿Cambiaría la conclusión de A/B/C con α=0,01?\n¿Por qué el gráfico compara porcentajes dentro de cada grupo?\nDuplica todos los conteos. Compara χ², p y V de Cramér.\nVer respuestas",
      "source": "Archivo de clase y guía de estudio corregida.",
      "materialStatus": "provided",
      "questions": [
        {
          "id": "cuant-chi-q1",
          "prompt": "¿Cómo se calcula el conteo esperado de una celda?",
          "answer": "Total fila × total columna / total general.",
          "explanation": "Representa el conteo esperado bajo independencia, no un porcentaje."
        },
        {
          "id": "cuant-chi-q2",
          "prompt": "¿Qué resultado da placebo versus tratamiento al recalcular desde Muestra?",
          "answer": "p≈0,04631; se rechaza H₀ al 5%.",
          "explanation": "Los conteos de placebo son 2/9/16; no coinciden con Análisis (3)."
        },
        {
          "id": "cuant-chi-q3",
          "prompt": "¿Qué resultado da la tabla guardada de Análisis (3)?",
          "answer": "p≈0,68903; no se rechaza H₀ al 5%.",
          "explanation": "Usa placebo 6/13/8. El texto p=0,032 es inconsistente con la tabla."
        },
        {
          "id": "cuant-chi-q4",
          "prompt": "¿Qué permite concluir p≈0,04275 en A/B/C?",
          "answer": "Existe asociación global al 5%, pero no al 1%.",
          "explanation": "No identifica por sí sola las parejas diferentes ni demuestra superioridad clínica."
        }
      ]
    },
    {
      "id": "cuant-busquedas",
      "title": "Búsquedas y tablas dinámicas",
      "objective": "Recuperar datos con coincidencia correcta y resumir bases sanitarias con controles verificables.",
      "summary": [
        "Usa coincidencia exacta para códigos e identificadores, aunque sean números.",
        "BUSCARV cuenta la columna dentro del rango; BUSCARX separa búsqueda y resultado.",
        "Tablas dinámicas: recuento para volumen, suma para costo y promedio para duración."
      ],
      "text": "3 · Búsquedas, tablas dinámicas y validación\n\nIdea central: una búsqueda recupera el atributo de un registro; una tabla dinámica resume muchos registros. Las búsquedas no prueban asociaciones estadísticas.\n\nHerramienta\tQué hace\tControl esencial\nBUSCARV\tBusca en la primera columna y devuelve una columna a su derecha.\tEl índice de columna se cuenta dentro del rango; fija el rango con $.\nBUSCARH\tBusca en la primera fila y devuelve una fila inferior.\tUsa coincidencia exacta para un año o categoría identificada.\nBUSCARX\tRelaciona un vector de búsqueda con uno de resultado.\tRangos del mismo tamaño; especifica qué hacer si no existe.\nINDICE + COINCIDIR\tLocaliza fila y columna en una matriz.\tUsa COINCIDIR(...;0) para una coincidencia exacta.\nDESREF\tDesplaza una referencia cierta cantidad de filas/columnas.\tLos desplazamientos se cuentan desde el origen; valida fecha y año.\nTabla dinámica\tAgrupa registros y resume conteo, suma, promedio, mínimo o máximo.\tActualizar al cambiar datos; verificar el tipo de resumen.\nCaso original: edad y estudios de una persona\n\nEn “Ejemplo busqueda”, los datos están en C15:G22. Juana tiene 34 años y estudios básicos; Pedro tiene 56 años y estudios superiores.\n\n=BUSCARV(\"Pedro\";$C$15:$G$22;2;FALSO) → 56\n=BUSCARV(\"Pedro\";$C$15:$G$22;5;FALSO) → Superiores\n=BUSCARX(\"Pedro\";$C$15:$C$22;$G$15:$G$22;\"No encontrado\";0)\nExacta versus aproximada\n\nUn código de prestación, un identificador o un año requiere coincidencia exacta, aunque sea numérico. Para tramos se puede usar aproximada: con límites inferiores ordenados, BUSCARV(...;VERDADERO) devuelve el último límite menor o igual al valor consultado. Un número también puede necesitar coincidencia exacta: el tipo de dato no determina la elección.\n\nEn el ejercicio de ingresos, 1.500.000 cae en el tramo C3. Para BUSCARX con límite inferior usa modo -1: exacta o siguiente menor. BUSCARX devuelve coincidencia exacta por defecto. No confundas su cuarto argumento (“si no se encuentra”) con el quinto (“modo de coincidencia”).\n\nCaso original de salud: valorizador FNS\n\n“Arancel FNS” contiene código, denominación y tres niveles. C, E y G son valores totales; D, F y H son aportes del beneficiario. No son magnitudes intercambiables. El laboratorio incorpora una selección de prestaciones tal como aparecen en el archivo, con valores históricos para práctica.\n\nCon código escrito en B3 y datos de Arancel FNS en A:B:\n=BUSCARX(B3;'Arancel FNS'!A:A;'Arancel FNS'!B:B;\"Código no encontrado\";0)\nAlternativa: =SI.ERROR(BUSCARV(B3;'Arancel FNS'!A:H;2;FALSO);\"Código no encontrado\")\nValor total nivel 1: =BUSCARV(B3;'Arancel FNS'!A:H;3;FALSO)\nValor total nivel 2: =BUSCARV(B3;'Arancel FNS'!A:H;5;FALSO)\nValor total nivel 3: =BUSCARV(B3;'Arancel FNS'!A:H;7;FALSO)\n\nGuarda códigos como texto en ambas tablas si pueden tener ceros iniciales. Comprueba duplicados: una búsqueda usualmente devuelve la primera coincidencia. Si el nombre se repite, consulta por código.\n\nTablas dinámicas: países y salud\n\nPara “Ejemplo 1 Tablas din”, selecciona A1:D227 del archivo, inserta tabla dinámica, pon Continente en Filas y Esperanza de vida en Valores con Promedio. Agrega IPC/PPP con Máximo. Para contar países, usa Country con Recuento; no sumes nombres. Verifica que el rango incluya los 226 registros de clase.\n\nContinente\tRegistros\tEsperanza promedio (años)\tIngreso PPP promedio\tIngreso PPP máximo\nAsia\t51\t70,97\t15.341,18\t103.500\nEuropa\t49\t76,93\t30.069,39\t118.000\nAfrica\t56\t54,16\t3.916,07\t31.400\nOceanía\t23\t71,35\t8.782,61\t38.100\nNorte América\t35\t74,03\t17.160,00\t69.900\nSur América\t12\t73,13\t9.266,67\t14.900\n\nEl promedio de esperanzas de vida es un promedio simple por país; no está ponderado por población. La tabla de clase incluye territorios. En un caso sanitario, podrías agrupar egresos por servicio: recuento de ID para volumen, suma de costo para gasto y promedio de estadía para duración.\n\nMatriz de doble entrada, validación y fechas\n\n“US states population” cruza estado y año 2010–2018. Puedes usar dos coincidencias: una para la fila de estado y otra para la columna de año.\n\n=INDICE($B$6:$J$56;COINCIDIR(N17;$A$6:$A$56;0);COINCIDIR(P17;$B$4:$J$4;0))\nBUSCARH para Alabama en la tabla B4:J6: =BUSCARH(2018;$B$4:$J$6;3;FALSO)\n\nLa última fila depende de la hoja elegida: revisa que tu rango abarque todos los estados y Puerto Rico. Usa Datos → Validación de datos → Lista, con una lista de estados y otra de años. La validación facilita la entrada; acompáñala con controles de error y calidad.\n\nLa hoja “Valor UF res” contiene tablas de 2019 y 2020. La fórmula basada en HOY puede devolver un valor de esos años aunque la fecha actual sea de 2026. Para practicar, selecciona una fecha dentro del año de la tabla y verifica AÑO, MES y DIA. Los aranceles FNS y tramos tributarios del archivo tampoco deben tratarse como vigentes.\n\nEjercita\nBusca los estudios de Julia en el ejemplo de personas.\n¿Qué sucede si BUSCARV omite FALSO al consultar un código inexistente?\nEn el ejercicio tributario, resuelve qué renta paga exactamente 18% usando el último tramo de la tabla: factor 0,35, rebaja 1.148.020,28.\nDiseña una tabla dinámica de seis egresos ficticios de dos servicios con ID, servicio, días y costo. Explica por qué el promedio total no es necesariamente el promedio de los promedios por servicio.\nVer respuestas",
      "source": "Archivo de clase y guía de estudio corregida.",
      "materialStatus": "provided",
      "questions": [
        {
          "id": "cuant-busquedas-q1",
          "prompt": "¿Qué coincidencia necesitas para un código de prestación?",
          "answer": "Exacta.",
          "explanation": "El código identifica una prestación; aproximada podría devolver otra."
        },
        {
          "id": "cuant-busquedas-q2",
          "prompt": "En C15:G22, ¿qué devuelve BUSCARV(\"Pedro\";C15:G22;2;FALSO)?",
          "answer": "56 años.",
          "explanation": "La columna 2 dentro del rango es D, donde está la edad."
        },
        {
          "id": "cuant-busquedas-q3",
          "prompt": "¿Cómo resumir costo total por servicio en una tabla dinámica?",
          "answer": "Servicio en Filas y Costo en Valores con Suma.",
          "explanation": "Recuento mide registros; promedio mide costo medio; suma mide costo total."
        },
        {
          "id": "cuant-busquedas-q4",
          "prompt": "¿Por qué la UF de la hoja no debe consultarse como vigente mediante HOY?",
          "answer": "Las tablas corresponden a 2019 y 2020.",
          "explanation": "La fecha de hoy no convierte una tabla histórica en una fuente actual."
        }
      ]
    },
    {
      "id": "cuant-erlang",
      "title": "Erlang C y planificación de dotación",
      "objective": "Calcular carga y dotación mínima por bloque para una meta de espera, distinguiendo activos de programados.",
      "summary": [
        "Carga A=llegadas×tiempo de servicio/duración del período; estabilidad exige c>A.",
        "El caso original usa 5 minutos de servicio, 10 de espera y meta 80%.",
        "Activos simultáneos, programados y contratos semanales son cantidades distintas."
      ],
      "text": "4 · Erlang C y dotación en recepción\n\nIdea central: una dotación capaz de procesar la demanda promedio puede ser insuficiente para cumplir una espera objetivo. Erlang C incorpora la posibilidad de que varias personas lleguen mientras todos los funcionarios están ocupados.\n\nVariable\tInterpretación\nλ\tTasa de llegada en pacientes por minuto.\nh\tTiempo medio de servicio en minutos por paciente, incluido trabajo administrativo posterior.\nA = λh\tCarga ofrecida, en erlangs; equivale a cuántos servidores estarían ocupados en promedio.\nc\tFuncionarios simultáneamente disponibles para atender.\nρ = A/c\tOcupación promedio. La estabilidad requiere c>A.\nP(espera)\tProbabilidad de no encontrar un funcionario libre al llegar.\nSL(t)\tProbabilidad de iniciar atención dentro de t minutos de espera.\nWq\tEspera promedio en cola, incluidos quienes no esperan.\nA = pacientes del período × h / duración del período\nP(espera) = [A^c / (c! × (1−A/c))] / [Σ(k=0 a c−1) A^k/k! + A^c / (c! × (1−A/c))]\nSL(t) = 1 − P(espera) × exp[−(c−A) × t / h]\nWq = P(espera) × h / (c−A)\n\nEste nivel de servicio se refiere al tiempo hasta comenzar la atención. Si el objetivo incluyera terminar el trámite en diez minutos, necesitarías modelar también su duración. Tiempo de manejo h y nivel de servicio SL son conceptos distintos.\n\nCaso original: Consultorio Salud Viva\n\nLa hoja “Erlang” indica bloques de una hora, atención de 5 minutos y meta de 80% con espera menor de 10 minutos. Llegadas de 08:00–17:00: 18,30,42,36,24,15,20,28,22 pacientes por hora.\n\nPara la hora de 42 pacientes: λ=42/60=0,7; A=0,7×5=3,5. Con c=3 el sistema es inestable. Con c=4: ocupación=87,5%, P(espera)≈73,79%, SL(10)≈72,85%. Con c=5: ocupación=70%, P(espera)≈37,78%, SL(10)≈98,12%. El mínimo para esta meta es 5 funcionarios activos.\n\nInicio\tLlegadas/h\tCarga A\tActivos mínimos\tOcupación\tSL (10 min)\n8:00\t18\t1,50\t3\t50,0%\t98,82%\n9:00\t30\t2,50\t4\t62,5%\t98,41%\n10:00\t42\t3,50\t5\t70,0%\t98,12%\n11:00\t36\t3,00\t4\t75,0%\t93,11%\n12:00\t24\t2,00\t3\t66,7%\t93,99%\n13:00\t15\t1,25\t2\t62,5%\t89,27%\n14:00\t20\t1,67\t3\t55,6%\t97,92%\n15:00\t28\t2,33\t3\t77,8%\t83,88%\n16:00\t22\t1,83\t3\t61,1%\t96,42%\nNo mezcles los parámetros. “AgentCalculator (2)” usa atención de 3 minutos y espera de 2 minutos. Sus dotaciones no son las del caso 5/10. Cambia ambos parámetros en el laboratorio para observar la diferencia. La ocupación máxima del calculador es una restricción adicional, no la definición de estabilidad.\nAusencias y turnos\n\nSi necesitas c=5 personas activas y estimas 20% de tiempo no disponible, una aproximación es techo(5/(1−0,20))=7 personas programadas para ese bloque. Eso no implica siete contratos para toda la semana. Debes construir una cobertura por hora, incorporar colación y descanso y después calcular turnos compatibles con disponibilidad y jornada. Las condiciones de jornada de la planilla se tratan como supuestos del ejercicio.\n\nCuándo funciona el modelo\n\nErlang C supone llegadas Poisson con tasa aproximadamente constante por bloque, tiempos de servicio exponenciales, servidores equivalentes, una cola sin abandono y régimen estable. En recepción puede ser una aproximación útil. En urgencias con prioridades de triage, abandono, horarios muy variables o atenciones de duraciones distintas, estos supuestos pueden no representar el proceso y se requiere validación o simulación.\n\nLa explicación sanitaria aplica el modelo como ejercicio de gestión, sin establecer un estándar clínico de espera.\n\nEjercita\nCon 30 pacientes/hora y h=5, calcula A y la dotación mínima para 80% en 10 minutos.\nEn 42 pacientes/hora, agrega una restricción de ocupación máxima de 65%. ¿Cuántas personas necesitas?\nCon c=5 activas y 20% no disponible, calcula programadas. ¿Por qué dividir y no multiplicar por 1,20?\nReduce h de 5 a 3 y t de 10 a 2. ¿Es necesariamente menor la dotación en todos los bloques?\nVer respuestas",
      "source": "Archivo de clase y guía de estudio corregida.",
      "materialStatus": "provided",
      "questions": [
        {
          "id": "cuant-erlang-q1",
          "prompt": "Con 42 pacientes/hora y 5 minutos de servicio, ¿cuánto es A?",
          "answer": "3,5 erlangs.",
          "explanation": "A=42×5/60=3,5; se requiere más de 3,5 personas para estabilidad."
        },
        {
          "id": "cuant-erlang-q2",
          "prompt": "¿Cuántos activos requiere ese bloque para 80% en 10 minutos?",
          "answer": "5 funcionarios activos.",
          "explanation": "Con 4 el SL≈72,85%; con 5 el SL≈98,12%."
        },
        {
          "id": "cuant-erlang-q3",
          "prompt": "Si se requieren 5 activos y hay 20% no disponible, ¿cuántos programarías?",
          "answer": "7 personas para ese bloque.",
          "explanation": "Se redondea hacia arriba 5/(1−0,20)=6,25."
        },
        {
          "id": "cuant-erlang-q4",
          "prompt": "¿Es estable c=3 cuando A=3?",
          "answer": "No.",
          "explanation": "ρ=1; el modelo no tiene un régimen estacionario estable."
        }
      ]
    }
  ],
  "cases": [
    {
      "id": "cuant-caso-recepcion",
      "title": "Dotación del mesón de recepción",
      "role": "Responsable de gestión del consultorio",
      "fictional": true,
      "lesson": "cuant-erlang",
      "text": "En el bloque de mayor demanda llegan 42 pacientes/hora. La atención tarda 5 minutos y quieres iniciar el 80% de las atenciones antes de 10 minutos. Hay cuatro personas disponibles y 20% de tiempo no disponible en la programación.",
      "steps": [
        [
          "Carga y estabilidad",
          "¿Cuánto es A y son estables cuatro personas?",
          "A=3,5; c=4 es estable porque c>A, pero eso no garantiza la meta."
        ],
        [
          "Nivel de servicio",
          "¿Qué dotación activa necesitas?",
          "Con 4: SL≈72,85%; con 5: SL≈98,12%. Necesitas 5 activas para esta meta."
        ],
        [
          "Programación",
          "¿Cuántas personas programarías y qué revisarías?",
          "Techo(5/0,8)=7 para ese bloque. Después debes construir turnos y validar tiempos, demanda y supuestos del modelo."
        ]
      ]
    },
    {
      "id": "cuant-caso-datos",
      "title": "Dos conclusiones para un mismo tratamiento",
      "role": "Analista de calidad hospitalaria",
      "fictional": true,
      "lesson": "cuant-chi",
      "text": "Un informe afirma que p=0,032. La tabla guardada da p≈0,689 y la base individual da p≈0,04631. Debes presentar el análisis a la dirección.",
      "steps": [
        [
          "Reconciliar fuentes",
          "¿Qué comprobarías primero?",
          "Recuento por grupo y resultado desde los registros individuales, filtros, duplicados y fecha de actualización del resumen."
        ],
        [
          "Interpretación",
          "¿Cómo presentarías la discrepancia?",
          "Análisis (3) tiene placebo 6/13/8; Muestra tiene 2/9/16. Con la base individual se rechaza independencia al 5%; con la tabla guardada no. El texto 0,032 es inconsistente."
        ],
        [
          "Decisión",
          "¿Basta para cambiar el protocolo clínico?",
          "No: hay que reconciliar la fuente y evaluar diseño, sesgos, magnitud, seguridad y relevancia clínica. Una prueba global no demuestra causalidad ni superioridad."
        ]
      ]
    }
  ]
};
