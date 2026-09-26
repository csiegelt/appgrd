// Modo alumno: ejercicios de cálculo GRD con corrección automática, pistas y solución paso a paso.
// Usa utilidades globales de app.js ($, esc, toast, download, catMap) en tiempo de ejecución.

const Alumno = (() => {
  const LS_KEY = 'grd-alumno-v1';
  const clp = GRD.clp, num = GRD.num;
  const fmtN = v => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(v);
  const fmtPeso = v => new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v);
  const clpDec = v => '$' + num(v, 2);

  const NIVELES = {
    1: { nombre: 'Pago y resultado', desc: 'Calcule el pago GRD (precio base × peso) y el resultado del episodio (pago − costo), como en el ejercicio de clase.' },
    2: { nombre: 'Indicadores del episodio', desc: 'Además del pago y el resultado: % de recuperación, costo por unidad de peso y peso de equilibrio.' },
    3: { nombre: 'Estancia y outliers', desc: 'Clasifique la estancia con los puntos de corte (PCI/PCS) y calcule el pago adicional por outlier superior.' },
    4: { nombre: 'Casuística de varios egresos', desc: 'Con varios egresos: suma de pesos, índice casuístico, pago y costo totales, costo por unidad de peso e IEMA.' }
  };

  let st = { hist: [], actual: null, nombre: '', modo: 'caso' };
  let borrarArmado = false;
  let uidNivel = null;

  // ---------- persistencia ----------
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s) st = { hist: s.hist || [], actual: s.actual || null, nombre: s.nombre || '', modo: s.modo || 'caso' };
    } catch (e) { /* sin storage */ }
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) { /* sin storage */ }
  }

  // ---------- números ----------
  // Interpreta lo que escribe el alumno en formato chileno: "7.020.000", "$ -1.520.000", "2,34", "93,5 %".
  function parseEntrada(s, tipo) {
    if (s == null) return null;
    let t = String(s).trim().replace(/[\s$%]/g, '').replace(/[−–—]/g, '-');
    if (!t) return null;
    if (tipo === 'money' || tipo === 'int') {
      // Puntos como separador de miles sólo si agrupan de a 3 ("7.020.000"); un punto suelto es decimal ("501428.57").
      if ((t.match(/,/g) || []).length > 1) t = t.replace(/,/g, '');
      else if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
      else if (/^[-+]?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    } else if (t.includes(',')) {
      t = t.replace(/\./g, '').replace(',', '.');
    } else if ((t.match(/\./g) || []).length > 1) {
      t = t.replace(/\./g, '');
    }
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    return Number(t);
  }

  function tolerancia(p) {
    if (p.tol != null) return p.tol;
    if (p.tipo === 'money') return Math.max(2, Math.abs(p.resp) * (p.rel ?? 0.001));
    if (p.tipo === 'percent') return 0.1;
    if (p.tipo === 'int') return 0;
    return 0.005;
  }
  function esCorrecta(p, raw) {
    if (p.tipo === 'choice') return raw === p.resp;
    const v = parseEntrada(raw, p.tipo);
    return v != null && Math.abs(v - p.resp) <= tolerancia(p) + 1e-9;
  }
  function mensajeError(p, raw) {
    if (raw == null || String(raw).trim() === '') return 'Sin respuesta.';
    if (p.tipo === 'choice') return 'Opción incorrecta.';
    const v = parseEntrada(raw, p.tipo);
    if (v == null) return 'No se pudo leer el número. Use el formato 7.020.000 o 2,34.';
    const e = (p.errores || []).find(e => Math.abs(v - e.v) <= (e.tol ?? tolerancia(p)) + 1e-9);
    return e ? e.msg : 'Incorrecto. Revise el cálculo o pida una pista.';
  }
  function fmtRespuesta(p, v) {
    if (p.tipo === 'choice') return v;
    if (v == null) return '—';
    if (p.tipo === 'money') return clp(v);
    if (p.tipo === 'percent') return num(v, 1) + ' %';
    if (p.tipo === 'int') return num(v, 0);
    return fmtN(v);
  }
  // Nota chilena, escala 1,0–7,0 con 60 % de exigencia.
  const nota = p => p < 0.6 ? 1 + 3 * p / 0.6 : 4 + 3 * (p - 0.6) / 0.4;
  // Aprueba con 4,0 o más, comparando la nota tal como se muestra (1 decimal).
  const aprueba = n => Math.round(n * 10) / 10 >= 4;

  // ---------- generación de casos (reproducible por código) ----------
  function mulberry32(a) {
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function generarCaso(nivel, seed) {
    const r = mulberry32(seed);
    const entre = (a, b) => a + r() * (b - a);
    const elegir = arr => arr[Math.floor(r() * arr.length)];
    const redondear = (v, m) => Math.round(v / m) * m;
    const pb = redondear(entre(2000000, 3800000), 50000);

    if (nivel <= 2) {
      const peso = Math.round(entre(0.4, 4.2) * 100) / 100;
      const costo = redondear(pb * peso * entre(0.7, 1.3), 10000);
      return { pb, peso, costo };
    }
    if (nivel === 3) {
      const g = elegir(CATALOGO_EJEMPLO);
      const u = r();
      let dias;
      if (u < 0.5) dias = g.pcs + 1 + Math.floor(r() * (g.p50 + 10));          // outlier superior
      else if (u < 0.7 && g.pci >= 2) dias = Math.floor(r() * g.pci);           // outlier inferior
      else dias = g.pci + Math.floor(r() * (g.pcs - g.pci + 1));                // inlier
      const costo = redondear(pb * g.peso * entre(0.75, 1.15) * Math.pow(Math.max(dias, 1) / g.em, 0.6), 10000);
      return { pb, grd: g.codigo, desc: g.descripcion, peso: g.peso, dias, em: g.em, pci: g.pci, pcs: g.pcs, p50: g.p50, costo };
    }
    const n = 4 + Math.floor(r() * 2);
    const egresos = [];
    for (let i = 0; i < n; i++) {
      const g = elegir(CATALOGO_EJEMPLO);
      egresos.push({
        grd: g.codigo, desc: g.descripcion, peso: g.peso, em: g.em,
        dias: Math.max(1, Math.round(g.em * entre(0.6, 1.6))),
        costo: redondear(pb * g.peso * entre(0.75, 1.25), 10000)
      });
    }
    return { pb, egresos };
  }

  // ---------- resolución: preguntas + desarrollo ----------
  const signo = v => v !== 0 ? [{ v: -v, msg: 'Revise el signo: resultado = pago − costo (es negativo cuando el costo supera al pago).' }] : [];

  function resolver(nivel, c) {
    const Q = [], S = [];
    const q = o => Q.push(o);
    const paso = (t, f, calc, res) => S.push({ t, f, c: calc, r: res });

    if (nivel === 4) return resolverCasuistica(c);

    const pagoBase = c.pb * c.peso;
    const aj = c.ajusteTec > 0 ? c.ajusteTec : 0;      // ajuste por tecnología (bases 2018), sólo en casos creados desde el análisis

    if (nivel === 3) {
      const sup = c.dias > c.pcs, inf = c.dias < c.pci;
      const tipo = sup ? 'Outlier superior' : inf ? 'Outlier inferior' : 'Inlier';
      // sinOutlier: caso creado desde un análisis en que el convenio no paga outlier
      const pagaOut = sup && !c.sinOutlier;
      const diasAd = pagaOut ? Math.max(0, c.dias - c.pcs - c.p50) : 0;
      const valorDia = c.em > 0 ? pagoBase / c.em : 0;
      const adicional = diasAd * valorDia;
      const pagoTotal = pagoBase + adicional + aj;
      const resultado = Math.round((pagoTotal - c.costo) * 100) / 100 + 0;
      const sev = /^\d{6}$/.test(c.grd || '') ? c.grd[5] : null;
      const SEV = { 1: '1 · Menor', 2: '2 · Moderada', 3: '3 · Mayor' };

      if (SEV[sev]) {
        q({ id: 'sev', texto: `Nivel de severidad del GRD ${c.grd}`, tipo: 'choice', opciones: Object.values(SEV), resp: SEV[sev],
          pista: 'El código IR-GRD tiene 6 dígitos: CDM (2) + tipo (1) + GRD (2) + severidad (1). Mire el último dígito.' });
        paso('Severidad', '6° dígito del código IR-GRD', c.grd, SEV[sev]);
      }
      q({ id: 'pagobase', texto: 'Pago base (precio base × peso)', tipo: 'money', resp: pagoBase,
        pista: 'Multiplique el precio base por el peso del GRD.' });
      paso('Pago base', 'Precio base × peso', `${clp(c.pb)} × ${fmtPeso(c.peso)}`, clp(pagoBase));

      q({ id: 'tipo', texto: 'Tipo de estancia', tipo: 'choice', opciones: ['Inlier', 'Outlier superior', 'Outlier inferior'], resp: tipo,
        pista: 'Compare los días de estada con los puntos de corte: menos que el PCI = outlier inferior; más que el PCS = outlier superior; entre ambos (inclusive) = inlier.' });
      paso('Tipo de estancia', 'PCI ≤ días ≤ PCS → inlier', `PCI ${c.pci} · días ${c.dias} · PCS ${c.pcs}`, tipo);

      q({ id: 'diasad', texto: 'Días adicionales a pagar', tipo: 'int', resp: diasAd,
        pista: 'Sólo un outlier superior tiene días adicionales: días − PCS − P50 (período de carencia). Si da negativo, o no es outlier superior, es 0.',
        errores: [
          ...(pagaOut && c.dias - c.pcs !== diasAd ? [{ v: c.dias - c.pcs, msg: 'Le faltó descontar el período de carencia (P50 del GRD).' }] : []),
          ...(pagaOut && c.dias - c.pcs - c.p50 < 0 ? [{ v: c.dias - c.pcs - c.p50, msg: 'Si el cálculo da negativo, los días adicionales son 0.' }] : []),
          ...(sup && c.sinOutlier ? [{ v: Math.max(0, c.dias - c.pcs - c.p50), msg: 'En este caso el convenio no paga outlier: los días adicionales son 0.' }] : [])
        ] });
      paso('Días adicionales', sup && c.sinOutlier ? 'El convenio no paga outlier → 0' : sup ? 'máx(0; días − PCS − P50)' : 'No es outlier superior → 0',
        pagaOut ? `${c.dias} − ${c.pcs} − ${c.p50} = ${c.dias - c.pcs - c.p50}` : '—', num(diasAd, 0));

      if (pagaOut) {
        q({ id: 'valordia', texto: 'Valor día adicional (pago base ÷ EM norma)', tipo: 'money', rel: 0.005, resp: valorDia,
          pista: 'Divida el pago base por la estancia media (EM) de la norma del GRD.',
          errores: [{ v: c.pb / c.em, msg: 'Use el pago base (precio base × peso), no sólo el precio base.' }] });
        paso('Valor día adicional', 'Pago base ÷ EM norma', `${clp(pagoBase)} ÷ ${fmtN(c.em)}`, clpDec(valorDia));
      }
      q({ id: 'adicional', texto: 'Pago adicional por outlier', tipo: 'money', rel: 0.005, resp: adicional,
        pista: 'Días adicionales × valor día. Si no hay días adicionales, el pago adicional es 0.' });
      paso('Pago adicional', 'Días adicionales × valor día', pagaOut ? `${diasAd} × ${clpDec(valorDia)}` : '—', clp(adicional));

      q({ id: 'pagototal', texto: aj ? 'Pago total del episodio (incluye el ajuste por tecnología)' : 'Pago total del episodio', tipo: 'money', resp: pagoTotal,
        pista: aj ? 'Pago base + pago adicional por outlier + ajuste por tecnología.' : 'Pago base + pago adicional.',
        errores: [
          ...(adicional > 0 ? [{ v: pagoBase + aj, msg: 'Le faltó sumar el pago adicional por outlier superior.' }] : []),
          ...(aj ? [{ v: pagoBase + adicional, msg: 'Le faltó sumar el ajuste por tecnología.' }] : [])
        ] });
      paso('Pago total', aj ? 'Pago base + adicional + ajuste por tecnología' : 'Pago base + pago adicional',
        `${clp(pagoBase)} + ${clp(adicional)}${aj ? ` + ${clp(aj)}` : ''}`, clp(pagoTotal));

      // Tolerancia extra: quien redondea el valor día a pesos acumula hasta ½ peso por día adicional.
      q({ id: 'resultado', texto: 'Resultado del episodio (pago total − costo)', tipo: 'money', resp: resultado,
        tol: Math.max(2, Math.abs(resultado) * 0.001, diasAd / 2 + 1),
        pista: 'Reste el costo total asignado al pago total. Si es negativo, anteponga el signo menos.',
        errores: [...signo(resultado), ...(adicional > 0 || aj ? [{ v: pagoBase - c.costo, msg: 'Use el pago total (incluye los pagos adicionales), no sólo el pago base.' }] : [])] });
      paso('Resultado', 'Pago total − costo', `${clp(pagoTotal)} − ${clp(c.costo)}`, clp(resultado));
      return { preguntas: Q, pasos: S };
    }

    // niveles 1 y 2
    const pagoTot = pagoBase + aj;
    const resultado = Math.round((pagoTot - c.costo) * 100) / 100 + 0;
    q({ id: 'pago', texto: 'Pago GRD del episodio', tipo: 'money', resp: pagoBase,
      pista: 'Multiplique el precio base por el peso del GRD.',
      errores: [{ v: c.pb + c.peso, msg: 'El pago es una multiplicación, no una suma.' }] });
    paso('Pago GRD', 'Precio base × peso', `${clp(c.pb)} × ${fmtPeso(c.peso)}`, clp(pagoBase));
    if (aj) {
      q({ id: 'pagotec', texto: 'Pago total (pago GRD + ajuste por tecnología)', tipo: 'money', resp: pagoTot,
        pista: 'Sume al pago GRD el ajuste por tecnología que pagan las bases.' });
      paso('Pago total', 'Pago GRD + ajuste por tecnología', `${clp(pagoBase)} + ${clp(aj)}`, clp(pagoTot));
    }
    q({ id: 'resultado', texto: aj ? 'Resultado del episodio (pago total − costo)' : 'Resultado del episodio (pago − costo)', tipo: 'money', resp: resultado,
      pista: `Reste el costo total asignado al ${aj ? 'pago total' : 'pago GRD'}. Si es negativo, anteponga el signo menos.`,
      errores: [...signo(resultado), ...(aj ? [{ v: pagoBase - c.costo, msg: 'Use el pago total, que incluye el ajuste por tecnología.' }] : [])] });
    paso('Resultado', 'Pago − costo', `${clp(pagoTot)} − ${clp(c.costo)}`, clp(resultado));

    if (nivel === 2) {
      const rec = c.costo > 0 ? pagoTot / c.costo * 100 : 0;
      q({ id: 'recup', texto: '% de recuperación (pago ÷ costo × 100, con 1 decimal)', tipo: 'percent', resp: rec,
        pista: 'Divida el pago por el costo y multiplique por 100; redondee a 1 decimal. Sobre 100 % el pago cubre el costo.',
        errores: [
          { v: Math.round(rec), tol: 0.001, msg: 'Va bien: responda con 1 decimal (ej. 127,6).' },
          { v: rec / 100, msg: 'Exprese el resultado como porcentaje (multiplique por 100).' },
          ...(pagoTot > 0 ? [{ v: c.costo / pagoTot * 100, msg: 'Invirtió la división: es pago ÷ costo.' }] : [])
        ] });
      paso('% de recuperación', 'Pago ÷ costo × 100', `${clp(pagoTot)} ÷ ${clp(c.costo)} × 100`, num(rec, 1) + ' %');

      const cup = c.costo / c.peso;
      q({ id: 'cup', texto: 'Costo por unidad de peso (costo ÷ peso)', tipo: 'money', rel: 0.005, resp: cup,
        pista: 'Divida el costo por el peso. Si el resultado es mayor que el precio base, el episodio pierde.',
        errores: [{ v: c.peso / c.costo, tol: c.peso / c.costo / 2, msg: 'Invirtió la división: es costo ÷ peso.' }] });
      paso('Costo por unidad de peso', 'Costo ÷ peso', `${clp(c.costo)} ÷ ${fmtPeso(c.peso)}`,
        clp(cup) + (aj ? ' — con ajuste por tecnología, compare el resultado total' : cup > c.pb ? ' — mayor que el precio base → pérdida' : ' — no supera el precio base → sin pérdida'));

      const pesoEq = Math.max(0, c.costo - aj) / c.pb;
      q({ id: 'pesoeq', texto: aj ? 'Peso mínimo del GRD para no tener pérdida ((costo − ajuste) ÷ precio base)' : 'Peso mínimo del GRD para no tener pérdida (costo ÷ precio base)',
        tipo: 'decimal', tol: 0.005, resp: pesoEq,
        pista: aj ? '¿Con qué peso el pago total igualaría al costo? Peso = (costo − ajuste por tecnología) ÷ precio base. Redondee a 2 decimales.'
                  : '¿Con qué peso el pago sería igual al costo? Despeje: peso = costo ÷ precio base. Redondee a 2 decimales.',
        errores: [{ v: c.pb / c.costo, msg: 'Invirtió la división: es costo ÷ precio base.' }, ...(aj ? [{ v: c.costo / c.pb, msg: 'Descuente primero el ajuste por tecnología del costo.' }] : [])] });
      paso('Peso de equilibrio', aj ? '(Costo − ajuste) ÷ precio base' : 'Costo ÷ precio base',
        aj ? `(${clp(c.costo)} − ${clp(aj)}) ÷ ${clp(c.pb)}` : `${clp(c.costo)} ÷ ${clp(c.pb)}`, num(pesoEq, 4));

      const gp = resultado > 0 ? 'Ganancia' : resultado < 0 ? 'Pérdida' : 'Equilibrio';
      q({ id: 'gp', texto: '¿El episodio genera ganancia o pérdida?', tipo: 'choice', opciones: ['Ganancia', 'Pérdida', 'Equilibrio'], resp: gp,
        pista: 'Mire el signo del resultado, o compare el costo por unidad de peso con el precio base.' });
      paso('Conclusión', 'Signo del resultado', clp(resultado), gp);
    }
    return { preguntas: Q, pasos: S };
  }

  function resolverCasuistica(c) {
    const Q = [], S = [];
    const q = o => Q.push(o);
    const paso = (t, f, calc, res) => S.push({ t, f, c: calc, r: res });
    const E = c.egresos, n = E.length;
    const sumPeso = E.reduce((a, e) => a + e.peso, 0);
    const icm = sumPeso / n;
    const pago = c.pb * sumPeso;
    const costo = E.reduce((a, e) => a + e.costo, 0);
    const resultado = pago - costo;
    const cup = costo / sumPeso;
    const sumDias = E.reduce((a, e) => a + e.dias, 0), sumEm = E.reduce((a, e) => a + e.em, 0);
    const emObs = sumDias / n, emEsp = sumEm / n, iema = emObs / emEsp;

    q({ id: 'sumpeso', texto: 'Suma de pesos de los egresos', tipo: 'decimal', tol: 0.005, resp: sumPeso,
      pista: 'Sume el peso de todos los egresos.' });
    paso('Suma de pesos', 'Σ pesos', E.map(e => fmtPeso(e.peso)).join(' + '), fmtN(sumPeso));

    q({ id: 'icm', texto: 'Índice casuístico (peso medio)', tipo: 'decimal', tol: 0.005, resp: icm,
      pista: 'Suma de pesos ÷ número de egresos. Mayor que 1 = casuística más compleja que el promedio.',
      errores: [{ v: sumPeso, msg: 'Falta dividir la suma de pesos por el número de egresos.' }] });
    paso('Índice casuístico', 'Σ pesos ÷ n', `${fmtN(sumPeso)} ÷ ${n}`, num(icm, 4));

    q({ id: 'pagotot', texto: 'Pago GRD total (precio base × suma de pesos)', tipo: 'money', resp: pago,
      pista: 'Multiplique el precio base por la suma de pesos (equivale a sumar el pago de cada egreso).',
      errores: [{ v: c.pb * icm, msg: 'Use la suma de pesos, no el peso medio.' }] });
    paso('Pago total', 'Precio base × Σ pesos', `${clp(c.pb)} × ${fmtN(sumPeso)}`, clp(pago));

    q({ id: 'costotot', texto: 'Costo total', tipo: 'money', resp: costo, pista: 'Sume el costo de todos los egresos.' });
    paso('Costo total', 'Σ costos', E.map(e => clp(e.costo)).join(' + '), clp(costo));

    q({ id: 'restot', texto: 'Resultado total (pago − costo)', tipo: 'money', resp: resultado,
      pista: 'Pago total − costo total. Si es negativo, anteponga el signo menos.', errores: signo(resultado) });
    paso('Resultado total', 'Pago total − costo total', `${clp(pago)} − ${clp(costo)}`, clp(resultado));

    q({ id: 'cup', texto: 'Costo por unidad de peso (costo total ÷ suma de pesos)', tipo: 'money', rel: 0.005, resp: cup,
      pista: 'Divida el costo total por la suma de pesos y compárelo con el precio base.',
      errores: [{ v: costo / n, msg: 'Ese es el costo medio por egreso; divida por la suma de pesos.' }] });
    paso('Costo por unidad de peso', 'Costo total ÷ Σ pesos', `${clp(costo)} ÷ ${fmtN(sumPeso)}`,
      clp(cup) + (cup > c.pb ? ' — mayor que el precio base' : ' — no supera el precio base'));

    q({ id: 'iema', texto: 'IEMA (EM observada ÷ EM esperada)', tipo: 'decimal', tol: 0.01, resp: iema,
      pista: 'EM observada = Σ días ÷ n. EM esperada = Σ EM norma ÷ n. IEMA = observada ÷ esperada.',
      errores: [{ v: emEsp / emObs, msg: 'Invirtió la división: IEMA = EM observada ÷ EM esperada.' }] });
    paso('EM observada', 'Σ días ÷ n', `${sumDias} ÷ ${n}`, fmtN(emObs));
    paso('EM esperada', 'Σ EM norma ÷ n', `${fmtN(sumEm)} ÷ ${n}`, fmtN(emEsp));
    paso('IEMA', 'EM observada ÷ EM esperada', `${fmtN(emObs)} ÷ ${fmtN(emEsp)}`, num(iema, 3));

    // Redondeo: la suma flotante de EM con decimales puede dar 1,0000000000000002 en un IEMA exacto de 1.
    const efi = Math.round(iema * 1e6) / 1e6 > 1 ? 'Mayores que la norma (IEMA > 1)' : 'Iguales o menores que la norma (IEMA ≤ 1)';
    q({ id: 'efi', texto: '¿Las estancias del grupo son mayores o menores que la norma?', tipo: 'choice',
      opciones: ['Mayores que la norma (IEMA > 1)', 'Iguales o menores que la norma (IEMA ≤ 1)'], resp: efi,
      pista: 'Compare el IEMA con 1,0.' });
    return { preguntas: Q, pasos: S };
  }

  function crearEjercicio(nivel, caso, codigo) {
    const { preguntas, pasos } = resolver(nivel, caso);
    return {
      uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      nivel, caso, codigo, preguntas, pasos,
      resp: {}, estado: {}, pistas: {}, intentos: 0, vioSolucion: false, mostrarSol: false, registrado: false
    };
  }

  // ---------- render ----------
  function render() {
    const modo = st.modo === 'practica' ? 'practica' : 'caso';
    document.querySelectorAll('#a-subtabs button').forEach(b => b.classList.toggle('active', b.dataset.modo === modo));
    $('a-modo-caso').hidden = modo !== 'caso';
    $('a-modo-practica').hidden = modo !== 'practica';
    if (modo === 'caso') Caso.render(); else renderPractica();
  }
  function setModo(modo) { st.modo = modo; save(); render(); }

  // Crea un ejercicio de práctica con los datos de un caso analizado.
  function practicar(nivel, caso) {
    st.actual = crearEjercicio(nivel, caso, 'propio');
    $('a-nivel').value = String(nivel);
    $('a-propio-card').hidden = true;
    st.modo = 'practica';
    save(); render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`Ejercicio de nivel ${nivel} creado con los datos del caso`);
  }

  function renderPractica() {
    $('a-nombre').value = document.activeElement === $('a-nombre') ? $('a-nombre').value : st.nombre;
    const ej = st.actual;
    // El selector toma el nivel del ejercicio sólo cuando cambia el ejercicio (no pisa la elección del alumno).
    if (ej && ej.uid !== uidNivel) { $('a-nivel').value = String(ej.nivel); uidNivel = ej.uid; }
    const nv = +$('a-nivel').value;
    $('a-nivel-desc').textContent = NIVELES[nv].desc;
    renderScore();
    $('a-vacio').hidden = !!ej;
    $('a-trabajo').hidden = !ej;
    if (ej) { renderEnunciado(ej); renderPreguntas(ej); renderFeedback(ej); renderSolucion(ej); }
    else $('a-solucion').hidden = true;
    renderHist();
  }

  function renderEnunciado(ej) {
    const c = ej.caso;
    const fila = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    let tabla, reglas = '', pie;
    const filaTec = c.ajusteTec > 0 ? fila('Ajuste por tecnología (bases 2018)', clp(c.ajusteTec) + (c.tecDetalle ? `<br><small>${esc(c.tecDetalle)}</small>` : '')) : '';
    if (ej.nivel <= 2) {
      tabla = `<table class="caso"><thead><tr><th>Variable</th><th>Monto</th></tr></thead><tbody>
        ${fila('Precio base pactado', clp(c.pb))}${fila('Peso del episodio', fmtPeso(c.peso))}${filaTec}${fila('Costo total asignado', clp(c.costo))}</tbody></table>`;
      pie = c.ajusteTec > 0
        ? 'Ejercicio: pago total = precio base × peso + ajuste por tecnología (bases 2018, pagado una vez por egreso). Resultado antes de otros conceptos no incluidos en el costeo.'
        : 'Ejercicio: pago = precio base × peso. Sin ajustes adicionales. Resultado antes de otros conceptos no incluidos en el costeo.';
    } else if (ej.nivel === 3) {
      tabla = `<table class="caso"><thead><tr><th>Variable</th><th>Valor</th></tr></thead><tbody>
        ${c.grd ? fila('Código IR-GRD', esc(c.grd) + (c.desc ? `<br><small>${esc(c.desc)}</small>` : '')) : ''}
        ${fila('Precio base pactado', clp(c.pb))}${fila('Peso del GRD', fmtPeso(c.peso))}
        ${fila('Días de estada', num(c.dias, 0))}${fila('EM norma del GRD', fmtN(c.em) + ' días')}
        ${fila('Punto de corte inferior (PCI)', num(c.pci, 0) + ' días')}${fila('Punto de corte superior (PCS)', num(c.pcs, 0) + ' días')}
        ${fila('P50 del GRD (carencia)', num(c.p50, 0) + ' días')}${filaTec}${fila('Costo total asignado', clp(c.costo))}</tbody></table>`;
      reglas = `<div class="reglas"><b>Reglas de este ejercicio</b><ul>
        <li><b>Inlier</b> (PCI ≤ días ≤ PCS): pago = precio base × peso.</li>
        <li><b>Outlier superior</b> (días &gt; PCS): ${c.sinOutlier ? 'en este caso el convenio <b>no paga adicional por outlier</b>: días adicionales = 0 y pago = precio base × peso.' : `pago base + días adicionales × valor día.<br>
          Días adicionales = días − PCS − P50 (mínimo 0). Valor día = pago base ÷ EM norma.`}</li>
        <li><b>Outlier inferior</b> (días &lt; PCI): pago = precio base × peso (sin ajuste).</li>
        ${c.ajusteTec > 0 ? '<li><b>Ajuste por tecnología</b>: se suma al pago total, una vez por egreso.</li>' : ''}</ul></div>`;
      pie = 'Ejercicio con reglas simplificadas de outlier. Las reglas reales dependen de la norma técnica y del convenio vigente.';
    } else {
      tabla = `<p>Precio base pactado: <b>${clp(c.pb)}</b></p>
        <div class="table-wrap"><table class="caso"><thead><tr><th>#</th><th>GRD</th><th class="num">Peso</th><th class="num">Días</th><th class="num">EM norma</th><th class="num">Costo</th></tr></thead><tbody>
        ${c.egresos.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.grd || '—')}${e.desc ? `<br><small>${esc(e.desc)}</small>` : ''}</td>
          <td class="num">${fmtPeso(e.peso)}</td><td class="num">${num(e.dias, 0)}</td><td class="num">${fmtN(e.em)}</td><td class="num">${clp(e.costo)}</td></tr>`).join('')}
        </tbody></table></div>`;
      pie = 'Ejercicio: pago de cada egreso = precio base × peso, sin ajustes por outlier.';
    }
    const codigo = ej.codigo === 'propio'
      ? 'Caso con datos ingresados por el alumno'
      : `Código del ejercicio: <b>${esc(ej.codigo)}</b> · compártalo para que otros resuelvan el mismo caso`;
    $('a-enunciado').innerHTML = `
      <div class="caso-titulo">Caso GRD · Nivel ${ej.nivel}: ${NIVELES[ej.nivel].nombre}</div>
      ${tabla}${reglas}
      <p class="hint">${pie}</p>
      <p class="hint">${codigo}</p>`;
  }

  const PLACEHOLDER = { money: '$  ej. 7.020.000', percent: '%  ej. 93,5', decimal: 'ej. 1,83', int: 'días' };

  function renderPreguntas(ej) {
    $('a-preguntas').innerHTML = ej.preguntas.map((p, i) => {
      const val = ej.resp[p.id] ?? '';
      const est = ej.estado[p.id];
      const campo = p.tipo === 'choice'
        ? `<select data-q="${p.id}"><option value="">Seleccione…</option>${p.opciones.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        : `<input data-q="${p.id}" value="${esc(val)}" inputmode="decimal" autocomplete="off" placeholder="${PLACEHOLDER[p.tipo]}">`;
      const solucion = ej.mostrarSol ? `<div class="q-sol">Respuesta correcta: <b>${esc(fmtRespuesta(p, p.resp))}</b></div>` : '';
      return `<div class="q ${est ? (est.ok ? 'ok' : 'bad') : ''}" data-id="${p.id}">
        <div class="q-head"><span class="q-num">${i + 1}</span><span class="q-text">${esc(p.texto)}</span><span class="q-status">${est ? (est.ok ? '✔' : '✘') : ''}</span></div>
        <div class="q-body">${campo}<button class="btn ghost sm" type="button" data-pista="${p.id}">Pista</button></div>
        <div class="q-echo">${echo(p, val)}</div>
        ${ej.pistas[p.id] ? `<div class="q-pista">💡 ${esc(p.pista)}</div>` : ''}
        ${est && !est.ok ? `<div class="q-msg">${esc(est.msg)}</div>` : ''}
        ${solucion}
      </div>`;
    }).join('');
  }
  function echo(p, val) {
    if (p.tipo === 'choice' || val === '' || val == null) return '';
    const v = parseEntrada(val, p.tipo);
    return v == null ? '<span class="neg">No se reconoce el número</span>' : 'Se leerá como: ' + esc(fmtRespuesta(p, v));
  }

  function renderFeedback(ej) {
    if (!ej.intentos || !Object.keys(ej.estado).length) { $('a-feedback').innerHTML = ''; return; }
    const total = ej.preguntas.length;
    const ok = ej.preguntas.filter(p => ej.estado[p.id]?.ok).length;
    const pct = ok / total;
    $('a-feedback').innerHTML = `<div class="feedback ${ok === total ? 'good' : ''}">
      <b>${ok} de ${total} correctas</b> (${num(pct * 100, 0)} %) · Nota <b>${num(nota(pct), 1)}</b> · Intento ${ej.intentos}
      ${ok === total ? '<br>¡Excelente! Todas las respuestas son correctas.' : '<br>Corrija las respuestas marcadas con ✘ y vuelva a revisar.'}
      ${ej.vioSolucion ? '<br><small>Se consultó la solución en este ejercicio.</small>' : ''}</div>`;
  }

  function renderSolucion(ej) {
    const box = $('a-solucion');
    box.hidden = !ej.mostrarSol;
    if (!ej.mostrarSol) return;
    box.innerHTML = `<h3>Desarrollo paso a paso</h3>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Paso</th><th>Fórmula</th><th>Cálculo</th><th>Resultado</th></tr></thead>
      <tbody>${ej.pasos.map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(s.t)}</b></td><td>${esc(s.f)}</td><td>${esc(s.c)}</td><td><b>${esc(s.r)}</b></td></tr>`).join('')}</tbody></table></div>`;
  }

  function registrosAlumno() {
    const n = st.nombre.trim().toLowerCase();
    return n ? st.hist.filter(h => (h.alumno || '').trim().toLowerCase() === n) : st.hist;
  }
  function renderScore() {
    const hs = registrosAlumno();
    const quien = st.nombre.trim() ? esc(st.nombre.trim()) : 'todos los alumnos de este equipo';
    if (!hs.length) { $('a-score').innerHTML = `<p class="hint">Aún no hay ejercicios revisados para ${quien}.</p>`; return; }
    const prom = hs.reduce((a, h) => a + h.correctas / h.total, 0) / hs.length;
    const notaProm = hs.reduce((a, h) => a + nota(h.correctas / h.total), 0) / hs.length;
    const perfectos = hs.filter(h => h.correctas === h.total).length;
    $('a-score').innerHTML = [
      kpi('Ejercicios revisados', num(hs.length, 0), quien),
      kpi('Promedio de aciertos', num(prom * 100, 0) + ' %', ''),
      kpi('Nota promedio', num(notaProm, 1), 'Escala 1,0–7,0 · 60 %', aprueba(notaProm) ? 'pos' : 'neg'),
      kpi('Ejercicios perfectos', num(perfectos, 0), 'Todas las respuestas correctas')
    ].join('');
  }

  function renderHist() {
    $('a-nhist').textContent = st.hist.length;
    const rows = [...st.hist].reverse();
    $('a-hist').innerHTML = `<thead><tr><th>Fecha</th><th>Alumno</th><th>Código</th><th>Nivel</th><th class="num">Correctas</th><th class="num">%</th><th class="num">Nota</th><th class="num">Intentos</th><th>Vio solución</th></tr></thead>
      <tbody>${rows.map(h => `<tr><td>${esc(h.fecha)}</td><td>${esc(h.alumno || '—')}</td><td>${esc(h.codigo)}</td><td>${h.nivel}</td>
        <td class="num">${h.correctas}/${h.total}</td><td class="num">${num(h.correctas / h.total * 100, 0)} %</td>
        <td class="num ${aprueba(nota(h.correctas / h.total)) ? 'pos' : 'neg'}">${num(nota(h.correctas / h.total), 1)}</td>
        <td class="num">${h.intentos}</td><td>${h.vioSolucion ? 'Sí' : 'No'}</td></tr>`).join('')
      || '<tr><td colspan="9" class="hint">Sin ejercicios revisados</td></tr>'}</tbody>`;
  }

  // ---------- acciones ----------
  function fechaLocal() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // La nota registrada es la del PRIMER intento; los intentos posteriores y el uso de la solución quedan anotados.
  function registrar(ej) {
    const correctas = ej.preguntas.filter(p => esCorrecta(p, ej.resp[p.id])).length;
    let h = st.hist.find(x => x.uid === ej.uid);
    if (!h) {
      h = { uid: ej.uid, fecha: fechaLocal(), alumno: st.nombre.trim(), codigo: ej.codigo, nivel: ej.nivel,
            correctas, total: ej.preguntas.length, intentos: 0, vioSolucion: false };
      st.hist.push(h);
    }
    h.intentos = ej.intentos;
    h.vioSolucion = ej.vioSolucion;
    if (!h.alumno && st.nombre.trim()) h.alumno = st.nombre.trim();
  }

  function revisar() {
    const ej = st.actual;
    if (!ej) return;
    ej.intentos++;
    ej.preguntas.forEach(p => {
      const raw = ej.resp[p.id];
      const ok = esCorrecta(p, raw);
      ej.estado[p.id] = { ok, msg: ok ? '' : mensajeError(p, raw) };
    });
    registrar(ej);
    save(); render();
    $('a-feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function verSolucion() {
    const ej = st.actual;
    if (!ej) return;
    ej.mostrarSol = true;
    ej.vioSolucion = true;
    if (!ej.intentos) {
      // se registra como intento sin revisión previa, para que el docente lo vea
      ej.intentos = 1;
      ej.preguntas.forEach(p => { const ok = esCorrecta(p, ej.resp[p.id]); ej.estado[p.id] = { ok, msg: ok ? '' : mensajeError(p, ej.resp[p.id]) }; });
    }
    registrar(ej);
    save(); render();
    $('a-solucion').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function nuevo(nivel, seed) {
    st.actual = crearEjercicio(nivel, generarCaso(nivel, seed), `N${nivel}-${seed}`);
    $('a-propio-card').hidden = true;
    save(); render();
  }

  function cargarCodigo() {
    const m = $('a-codigo').value.trim().toUpperCase().match(/^N?([1-4])-(\d{1,9})$/);
    if (!m) { toast('Código inválido. Formato: N1-12345'); return; }
    $('a-nivel').value = m[1];
    nuevo(+m[1], +m[2]);
    toast('Ejercicio ' + `N${m[1]}-${+m[2]}` + ' cargado');
  }

  // ---------- caso propio ----------
  const CAMPOS = {
    1: [['pb', 'Precio base ($)', 'money'], ['peso', 'Peso del GRD', 'decimal'], ['costo', 'Costo total asignado ($)', 'money']],
    3: [['pb', 'Precio base ($)', 'money'], ['grd', 'Código IR-GRD (opcional)', 'text'], ['peso', 'Peso del GRD', 'decimal'],
        ['dias', 'Días de estada', 'int'], ['em', 'EM norma (días)', 'decimal'], ['pci', 'PCI (días)', 'int'],
        ['pcs', 'PCS (días)', 'int'], ['p50', 'P50 (días)', 'int'], ['costo', 'Costo total asignado ($)', 'money']],
    4: [['grd', 'GRD (opc.)', 'text'], ['peso', 'Peso', 'decimal'], ['dias', 'Días', 'int'], ['em', 'EM norma', 'decimal'], ['costo', 'Costo ($)', 'money']]
  };
  CAMPOS[2] = CAMPOS[1];

  function abrirPropio() {
    const nv = +$('a-nivel').value;
    $('a-propio-error').textContent = '';
    let html;
    if (nv < 4) {
      html = `<div class="form-grid">${CAMPOS[nv].map(([k, l, t]) =>
        `<label>${l}<input data-campo="${k}" data-tipo="${t}" ${k === 'grd' ? 'list="grd-list" maxlength="6"' : 'inputmode="decimal"'} autocomplete="off"></label>`).join('')}</div>
        ${nv === 3 ? '<p class="hint">Si el código está en el Catálogo GRD, el peso, la EM y los puntos de corte se completan solos.</p>' : ''}`;
    } else {
      html = `<div class="form-grid"><label>Precio base ($)<input data-campo="pb" data-tipo="money" inputmode="decimal" autocomplete="off"></label></div>
        <div class="table-wrap" style="margin-top:10px"><table id="a-propio-filas"><thead><tr><th>#</th>${CAMPOS[4].map(([, l]) => `<th>${l}</th>`).join('')}<th></th></tr></thead><tbody></tbody></table></div>
        <button class="btn ghost sm" type="button" id="a-add-fila" style="margin-top:8px">+ Agregar egreso</button>
        <p class="hint">Mínimo 2 egresos. Si el GRD está en el catálogo, el peso y la EM se completan solos.</p>`;
    }
    $('a-propio-form').innerHTML = html;
    $('a-propio-form').dataset.nivel = nv;   // el nivel queda fijado al del formulario abierto
    if (nv === 4) { for (let i = 0; i < 3; i++) agregarFila(); $('a-add-fila').onclick = agregarFila; }
    $('a-propio-card').hidden = false;
    $('a-propio-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function agregarFila() {
    const tb = document.querySelector('#a-propio-filas tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="n"></td>${CAMPOS[4].map(([k, , t]) =>
      `<td><input data-campo="${k}" data-tipo="${t}" ${k === 'grd' ? 'list="grd-list" maxlength="6" size="7"' : 'inputmode="decimal" size="10"'} autocomplete="off"></td>`).join('')}
      <td><button class="btn danger sm" type="button" data-quitar>✕</button></td>`;
    tb.appendChild(tr);
    numerarFilas();
  }
  function numerarFilas() {
    document.querySelectorAll('#a-propio-filas tbody tr').forEach((tr, i) => tr.querySelector('.n').textContent = i + 1);
  }
  // Autocompleta desde el catálogo al escribir un código GRD.
  function autocompletar(input) {
    const cat = catMap.get(input.value.trim());
    if (!cat) return;
    const scope = input.closest('tr') || $('a-propio-form');
    const set = (k, v) => { const el = scope.querySelector(`[data-campo="${k}"]`); if (el) el.value = fmtN(v); };
    set('peso', cat.peso); set('em', cat.em); set('pci', cat.pci); set('pcs', cat.pcs); set('p50', cat.p50);
  }
  function leerCampos(scope) {
    const o = {};
    scope.querySelectorAll('[data-campo]').forEach(el => {
      o[el.dataset.campo] = el.dataset.tipo === 'text' ? el.value.trim() : parseEntrada(el.value, el.dataset.tipo);
    });
    return o;
  }
  function crearPropio() {
    const nv = +$('a-propio-form').dataset.nivel || +$('a-nivel').value;
    const err = m => { $('a-propio-error').textContent = m; };
    let caso;
    if (nv < 4) {
      caso = leerCampos($('a-propio-form'));
      if (!(caso.pb > 0)) return err('Ingrese un precio base mayor a 0.');
      if (!(caso.peso > 0)) return err('Ingrese un peso mayor a 0.');
      if (!(caso.costo > 0)) return err('Ingrese el costo total (mayor a 0).');
      if (nv === 3) {
        for (const k of ['dias', 'pci', 'pcs', 'p50']) if (caso[k] == null || caso[k] < 0 || !Number.isInteger(caso[k])) return err('Días, PCI, PCS y P50 deben ser números enteros de 0 o más.');
        if (!(caso.em > 0)) return err('Ingrese la EM norma (mayor a 0).');
        if (caso.pcs < caso.pci) return err('El PCS debe ser mayor o igual al PCI.');
        const cat = catMap.get(caso.grd);
        if (cat) caso.desc = cat.descripcion;
      }
    } else {
      const pb = parseEntrada($('a-propio-form').querySelector('[data-campo="pb"]').value, 'money');
      if (!(pb > 0)) return err('Ingrese un precio base mayor a 0.');
      const egresos = [];
      for (const [i, tr] of [...document.querySelectorAll('#a-propio-filas tbody tr')].entries()) {
        const e = leerCampos(tr);
        const vacia = e.peso == null && e.dias == null && e.em == null && e.costo == null && !e.grd;
        if (vacia) continue;
        if (!(e.peso > 0) || e.dias == null || e.dias < 0 || !Number.isInteger(e.dias) || !(e.em > 0) || !(e.costo > 0))
          return err(`Revise el egreso ${i + 1}: peso, EM y costo mayores a 0, y días enteros.`);
        const cat = catMap.get(e.grd);
        if (cat) e.desc = cat.descripcion;
        egresos.push(e);
      }
      if (egresos.length < 2) return err('Ingrese al menos 2 egresos completos.');
      caso = { pb, egresos };
    }
    st.actual = crearEjercicio(nv, caso, 'propio');
    $('a-propio-card').hidden = true;
    save(); render();
    toast('Ejercicio creado con sus datos');
  }

  // ---------- eventos ----------
  function init() {
    load();
    $('a-subtabs').addEventListener('click', e => { if (e.target.dataset.modo) setModo(e.target.dataset.modo); });
    $('a-nombre').addEventListener('input', e => { st.nombre = e.target.value; save(); renderScore(); });
    $('a-nivel').addEventListener('change', () => {
      $('a-nivel-desc').textContent = NIVELES[+$('a-nivel').value].desc;
      if (!$('a-propio-card').hidden) abrirPropio();
    });
    $('a-nuevo').onclick = () => nuevo(+$('a-nivel').value, 10000 + Math.floor(Math.random() * 90000));
    $('a-propio').onclick = abrirPropio;
    $('a-propio-cerrar').onclick = () => { $('a-propio-card').hidden = true; };
    $('a-propio-crear').onclick = crearPropio;
    $('a-cargar').onclick = cargarCodigo;
    $('a-codigo').addEventListener('keydown', e => { if (e.key === 'Enter') cargarCodigo(); });
    $('a-propio-form').addEventListener('input', e => {
      if (e.target.dataset.campo === 'grd') autocompletar(e.target);
    });
    $('a-propio-form').addEventListener('click', e => {
      if (e.target.dataset.quitar != null && e.target.dataset.quitar !== undefined && e.target.hasAttribute('data-quitar')) {
        e.target.closest('tr').remove(); numerarFilas();
      }
    });

    const onResp = e => {
      const id = e.target.dataset.q;
      if (!id || !st.actual) return;
      st.actual.resp[id] = e.target.value;
      const p = st.actual.preguntas.find(x => x.id === id);
      const box = e.target.closest('.q');
      box.querySelector('.q-echo').innerHTML = echo(p, e.target.value);
      save();
    };
    $('a-preguntas').addEventListener('input', onResp);
    $('a-preguntas').addEventListener('change', onResp);
    $('a-preguntas').addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.dataset.q) return;
      const campos = [...$('a-preguntas').querySelectorAll('[data-q]')];
      const i = campos.indexOf(e.target);
      if (i < campos.length - 1) campos[i + 1].focus(); else revisar();
    });
    $('a-preguntas').addEventListener('click', e => {
      const id = e.target.dataset.pista;
      if (!id || !st.actual) return;
      st.actual.pistas[id] = !st.actual.pistas[id];
      save(); renderPreguntas(st.actual);
    });
    $('a-revisar').onclick = revisar;
    $('a-ver').onclick = verSolucion;
    $('a-limpiar').onclick = () => {
      if (!st.actual) return;
      st.actual.resp = {}; st.actual.estado = {}; st.actual.pistas = {};
      save(); render();
    };
    $('a-exp').onclick = () => download(`resultados_alumnos_${fechaLocal().slice(0, 10)}.csv`, GRD.toCSV(
      ['fecha', 'alumno', 'codigo', 'nivel', 'correctas', 'total', 'porcentaje', 'nota', 'intentos', 'vio_solucion'],
      st.hist.map(h => [h.fecha, h.alumno, h.codigo, h.nivel, h.correctas, h.total,
        num(h.correctas / h.total * 100, 1), num(nota(h.correctas / h.total), 1), h.intentos, h.vioSolucion ? 'si' : 'no'])
    ), 'text/csv;charset=utf-8');
    $('a-borrar-hist').onclick = () => {
      const b = $('a-borrar-hist');
      if (!borrarArmado) {
        borrarArmado = true; b.textContent = '¿Confirmar? Clic de nuevo';
        setTimeout(() => { borrarArmado = false; b.textContent = 'Borrar historial'; }, 3000);
        return;
      }
      borrarArmado = false; b.textContent = 'Borrar historial';
      st.hist = []; save(); render(); toast('Historial borrado');
    };
  }

  // expuesto para pruebas
  return { init, render, practicar, parseEntrada, generarCaso, resolver, esCorrecta, mensajeError, nota, _st: () => st };
})();
