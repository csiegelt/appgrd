// Análisis de un caso clínico para el alumno: resumen, curvas de ganancia/pérdida y explicación paso a paso.
// Usa utilidades globales de app.js ($, esc, toast, catMap, computeAll) y Alumno.parseEntrada en tiempo de ejecución.

const Caso = (() => {
  const LS_KEY = 'grd-caso-v1';
  const clp = GRD.clp, num = GRD.num;
  const fmtN = v => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(v);
  const fmtPeso = v => new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v);
  const parse = (s, t) => Alumno.parseEntrada(s, t);
  const nd = n => num(n, 0) + (n === 1 ? ' día' : ' días');
  const pesosDec = v => '$' + num(v, 2);

  // Campos del formulario: clave -> [id, tipo]
  const CAMPOS = {
    nombre: ['k-nombre', 'text'], grd: ['k-grd', 'text'], desc: ['k-desc', 'text'], relato: ['k-relato', 'text'],
    pb: ['k-pb', 'money'], peso: ['k-peso', 'decimal'], dias: ['k-dias', 'int'], em: ['k-em', 'decimal'],
    pci: ['k-pci', 'int'], pcs: ['k-pcs', 'int'], p50: ['k-p50', 'int'],
    diacama: ['k-c-diacama', 'money'], pabellon: ['k-c-pabellon', 'money'], medicamentos: ['k-c-medicamentos', 'money'],
    insumos: ['k-c-insumos', 'money'], examenes: ['k-c-examenes', 'money'], honorarios: ['k-c-honorarios', 'money'],
    otros: ['k-c-otros', 'money'], costoTotal: ['k-costo-total', 'money']
  };
  // Ítems de costo: [clave, nombre, comportamiento frente a los días de estada]
  const ITEMS = [
    ['pabellon', 'Pabellón', 'fijo'], ['medicamentos', 'Medicamentos', 'variable'], ['insumos', 'Insumos y prótesis', 'fijo'],
    ['examenes', 'Exámenes e imágenes', 'variable'], ['honorarios', 'Honorarios médicos', 'fijo'], ['otros', 'Otros', 'fijo']
  ];

  // Casos clínicos de ejemplo (pesos y normas ilustrativos, coherentes con el catálogo de ejemplo).
  const EJEMPLOS = [
    { titulo: 'Caso de la clase: septicemia (gana)', nombre: 'Paciente A · Clínica San José', grd: '184103', desc: 'Septicemia · severidad mayor',
      relato: 'Paciente de 78 años ingresa por urgencia con septicemia. Permanece 12 días hospitalizado, sin cirugía.',
      pb: 3000000, peso: 2.34, dias: 12, em: 14, pci: 3, pcs: 33, p50: 11, outlier: false,
      diacama: 250000, pabellon: 0, medicamentos: 1200000, insumos: 300000, examenes: 600000, honorarios: 400000, otros: 0 },
    { titulo: 'Neumonía que se complica (outlier, pierde)', nombre: 'Paciente B · Clínica del Sur', grd: '044103', desc: 'Neumonía simple · severidad mayor',
      relato: 'Paciente de 82 años con neumonía que se complica con una infección intrahospitalaria. Estuvo 38 días hospitalizado.',
      pb: 3000000, peso: 1.624, dias: 38, em: 11.3, pci: 2, pcs: 26, p50: 9, outlier: true,
      diacama: 260000, pabellon: 0, medicamentos: 1500000, insumos: 200000, examenes: 900000, honorarios: 500000, otros: 0 },
    { titulo: 'Cesárea programada (margen estrecho)', nombre: 'Paciente C · Clínica Santa María', grd: '141301', desc: 'Cesárea · severidad menor',
      relato: 'Paciente de 31 años, cesárea programada sin complicaciones. Alta al tercer día.',
      pb: 3000000, peso: 0.552, dias: 3, em: 3.1, pci: 1, pcs: 7, p50: 3, outlier: false,
      diacama: 180000, pabellon: 450000, medicamentos: 90000, insumos: 120000, examenes: 60000, honorarios: 300000, otros: 0 },
    { titulo: 'Reemplazo de cadera (prótesis cara, pierde)', nombre: 'Paciente D · Clínica Los Andes', grd: '081101', desc: 'Reemplazo de cadera · severidad menor',
      relato: 'Paciente de 70 años con artrosis severa, se instala prótesis total de cadera. Por dolor mal controlado queda 9 días hospitalizado.',
      pb: 2800000, peso: 1.954, dias: 9, em: 5.8, pci: 2, pcs: 14, p50: 5, outlier: false,
      diacama: 230000, pabellon: 1300000, medicamentos: 350000, insumos: 2100000, examenes: 250000, honorarios: 900000, otros: 0 },
    { titulo: 'Apendicectomía sin complicaciones (gana)', nombre: 'Paciente E · Clínica Central', grd: '061101', desc: 'Apendicectomía · severidad menor',
      relato: 'Paciente de 24 años con apendicitis aguda, operado por laparoscopía. Alta al segundo día.',
      pb: 3000000, peso: 0.698, dias: 2, em: 2.9, pci: 1, pcs: 7, p50: 2, outlier: false,
      diacama: 200000, pabellon: 600000, medicamentos: 80000, insumos: 150000, examenes: 70000, honorarios: 350000, otros: 0 },
    { titulo: 'Aneurisma cerebral roto con coils (licitación 2018, tramo 3)', nombre: 'Paciente F · Clínica Metropolitana (camas críticas)', grd: '', desc: 'Hemorragia subaracnoidea por aneurisma roto, embolización con coils (peso ilustrativo)',
      relato: 'Paciente de 55 años derivado por FONASA a cama crítica con hemorragia subaracnoidea por ruptura de aneurisma. Se embolizan coils y permanece 14 días hospitalizado. Se analiza con las bases 2018: precio base del tramo 3 y ajuste por tecnología.',
      pb: 5000000, peso: 3.2, dias: 14, em: 12, pci: 3, pcs: 30, p50: 10, outlier: false, pbtramo: true, bases: 'camas2018', tec: [-1, -1, -1, -1, 0],
      diacama: 650000, pabellon: 2500000, medicamentos: 1800000, insumos: 6500000, examenes: 1500000, honorarios: 2000000, otros: 0 }
  ];

  let tRender = null;

  // ---------- persistencia del formulario ----------
  const tecSel = () => AJUSTES_TECNOLOGIA_2018.map((g, i) => { const v = $('k-tec-' + i).value; return v === '' ? -1 : +v; });
  function setTec(sel) { AJUSTES_TECNOLOGIA_2018.forEach((g, i) => { const v = sel && sel[i] != null && sel[i] >= 0 ? String(sel[i]) : ''; $('k-tec-' + i).value = v; }); }

  function guardarForm() {
    const o = { outlier: $('k-outlier').checked, pbtramo: $('k-pbtramo').checked, tec: tecSel() };
    for (const k in CAMPOS) o[k] = $(CAMPOS[k][0]).value;
    try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) { /* sin storage */ }
  }
  function cargarForm() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { /* sin storage */ }
    if (!o) return false;
    for (const k in CAMPOS) $(CAMPOS[k][0]).value = o[k] ?? '';
    $('k-outlier').checked = !!o.outlier;
    $('k-pbtramo').checked = !!o.pbtramo;
    setTec(o.tec);
    return true;
  }
  const fmtCampo = (k, v) => {
    if (v == null || v === '') return '';
    const t = CAMPOS[k][1];
    if (t === 'text') return v;
    if (t === 'money' || t === 'int') return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(v);
    return fmtN(v);
  };
  function aplicarEjemplo(ej) {
    if (ej.bases && Licitacion._st().preset !== ej.bases) {
      Licitacion.cargarPreset(ej.bases);
      toast('Se cargaron las bases de camas críticas 2018 en la pestaña Licitación GRD');
    }
    for (const k in CAMPOS) $(CAMPOS[k][0]).value = k === 'costoTotal' ? '' : fmtCampo(k, ej[k]);
    $('k-outlier').checked = !!ej.outlier;
    $('k-pbtramo').checked = !!ej.pbtramo;
    setTec(ej.tec);
    guardarForm(); render();
  }

  function leer() {
    const d = { outlier: $('k-outlier').checked, pbtramo: $('k-pbtramo').checked, tec: tecSel() };
    for (const k in CAMPOS) {
      const [id, t] = CAMPOS[k];
      const raw = $(id).value;
      d[k] = t === 'text' ? raw.trim() : parse(raw, t);
    }
    return d;
  }

  // ---------- modelo ----------
  function analizar(d) {
    const faltan = [], avisos = [];
    // Precio base según el tramo de peso de las bases de licitación.
    let tramo = null;
    if (d.pbtramo && d.peso > 0) {
      tramo = Licitacion.pbParaPeso(d.peso);
      if (tramo.pb > 0) d.pb = tramo.pb;
      else { avisos.push(`El ${tramo.nombre} no tiene oferta ni tope en la pestaña Licitación GRD: se usa el precio base ingresado.`); tramo = null; }
    }
    if (!(d.pb > 0)) faltan.push('precio base');
    if (!(d.peso > 0)) faltan.push('peso del GRD');
    // Un desglose con puros ceros no reemplaza al costo total ingresado.
    const hayDesglose = d.diacama > 0 || ITEMS.some(([k]) => d[k] > 0);
    const diasOk = d.dias != null && d.dias >= 0 && Number.isInteger(d.dias);
    if (d.dias != null && !diasOk) faltan.push('días de estada (número entero de 0 o más)');
    [['pci', 'PCI'], ['pcs', 'PCS'], ['p50', 'P50']].forEach(([k, n]) => {
      if (d[k] != null && !(d[k] >= 0 && Number.isInteger(d[k]))) faltan.push(`${n} (número entero de 0 o más)`);
    });
    if (hayDesglose && d.diacama > 0 && !diasOk) faltan.push('días de estada (para calcular el día cama)');
    if (!hayDesglose && d.costoTotal == null) faltan.push('costos (desglose o costo total)');
    if (d.costoTotal != null && d.costoTotal < 0) faltan.push('costo total (0 o más)');
    [['diacama', 'Día cama'], ...ITEMS].forEach(([k, n]) => { if (d[k] != null && d[k] < 0) faltan.push(`${n} (monto de 0 o más)`); });
    if (faltan.length) return { faltan, tramo };

    const dias = diasOk ? d.dias : null;
    const items = [];
    if (hayDesglose) {
      if (d.diacama > 0) items.push({ k: 'diacama', name: 'Día cama', detalle: `${nd(dias)} × ${clp(d.diacama)}`, value: d.diacama * dias, tipo: 'variable' });
      ITEMS.forEach(([k, n, t]) => { if (d[k] != null && d[k] > 0) items.push({ k, name: n, value: d[k], tipo: t }); });
      if (d.costoTotal != null) avisos.push('Se usó el desglose de costos; el "costo total directo" ingresado se ignoró.');
    } else {
      items.push({ k: 'total', name: 'Costo total', value: d.costoTotal, tipo: 'variable' });
    }
    const costo = items.reduce((a, i) => a + i.value, 0);
    if (!(costo > 0)) return { faltan: ['costos mayores a $0'], tramo };
    const pagoBase = d.pb * d.peso;

    const tieneNorma = d.em > 0 && d.pci != null && d.pcs != null && d.pcs >= d.pci;
    if ((d.em != null || d.pci != null || d.pcs != null) && !tieneNorma) avisos.push('Para analizar la estadía complete EM norma, PCI y PCS (con PCS ≥ PCI).');
    const p50 = d.p50 != null && d.p50 >= 0 ? d.p50 : 0;
    const sup = tieneNorma && dias != null && dias > d.pcs;
    const inf = tieneNorma && dias != null && dias < d.pci;
    const tipo = !tieneNorma || dias == null ? null : sup ? 'Outlier superior' : inf ? 'Outlier inferior' : 'Inlier';
    const reglas = !!d.outlier && tieneNorma;
    if (d.outlier && !tieneNorma) avisos.push('La regla de outlier necesita EM norma, PCI, PCS y P50: no se aplicó.');
    if (reglas && d.p50 == null) avisos.push('P50 vacío: la regla de outlier se aplicó sin período de carencia (P50 = 0). Ingrese el P50 del GRD.');
    const umbral = tieneNorma ? d.pcs + p50 : Infinity;
    const valorDia = tieneNorma ? pagoBase / d.em : 0;
    const diasAd = sup ? Math.max(0, dias - d.pcs - p50) : 0;
    const adicional = reglas ? diasAd * valorDia : 0;
    const adicionalPotencial = diasAd * valorDia;
    const tec = ajustesTecnologia(d.tec);
    const ajusteTec = tec.total;
    const pago = pagoBase + adicional + ajusteTec;
    // Redondeo a centavos: evita que el ruido de punto flotante muestre "PIERDE $0" en un equilibrio exacto.
    const resultado = Math.round((pago - costo) * 100) / 100 + 0;
    const recuperacion = costo > 0 ? pago / costo : null;
    const cup = costo / d.peso;
    const pagoPorPeso = pago / d.peso;
    // Precio base de equilibrio: el ajuste por tecnología no depende del precio base.
    const pbEq = Math.max(0, (costo - ajusteTec) / (d.peso * (1 + (reglas ? diasAd / d.em : 0))));

    // Modelo de costo según días: parte fija + parte que crece con cada día.
    let fijo = items.filter(i => i.tipo === 'fijo').reduce((a, i) => a + i.value, 0);
    const variable = costo - fijo;
    let vDia = 0;
    if (dias > 0) vDia = variable / dias; else fijo = costo;
    const pagoEn = x => pagoBase + ajusteTec + (reglas && x > umbral ? (x - umbral) * valorDia : 0);
    const costoEn = x => fijo + vDia * x;

    // Día de equilibrio: desde qué estadía el costo supera al pago.
    let equilibrio;
    if (costoEn(0) > pagoEn(0)) equilibrio = 0;
    else if (!(vDia > 0)) equilibrio = Infinity;
    else {
      const x1 = (pagoBase + ajusteTec - fijo) / vDia;
      if (!reglas || x1 <= umbral) equilibrio = x1;
      else equilibrio = vDia > valorDia ? umbral + (pagoEn(umbral) - costoEn(umbral)) / (vDia - valorDia) : Infinity;
    }
    const diasMax = isFinite(equilibrio) ? Math.floor(equilibrio + 1e-9) : null;
    // Con pago por outlier y un valor día mayor que el costo diario, después de PCS + P50 el pago vuelve a alcanzar al costo.
    let recupera = Infinity;
    if (reglas && isFinite(equilibrio) && equilibrio <= umbral && valorDia > vDia)
      recupera = Math.max(umbral, umbral + (costoEn(umbral) - pagoEn(umbral)) / (valorDia - vDia));

    return {
      d, items, avisos, costo, pagoBase, pago, adicional, tramo, tec, ajusteTec, adicionalPotencial, diasAd, valorDia, resultado, recuperacion,
      cup, pagoPorPeso, pbEq, tieneNorma, tipo, sup, inf, reglas, umbral, p50, dias, fijo, vDia, pagoEn, costoEn, equilibrio, diasMax, recupera
    };
  }

  // ---------- render ----------
  function render() {
    const box = $('k-resultado');
    const d = leer();
    const vacio = Object.keys(CAMPOS).every(k => d[k] == null || d[k] === '');
    $('k-pb').readOnly = false; $('k-pb').classList.remove('auto');
    if (vacio) {
      box.innerHTML = `<div class="card empty-state"><p>Ingrese los datos del caso o elija un <b>caso de ejemplo</b> arriba.<br>
        Mínimo: precio base, peso del GRD y los costos. Con días de estada, EM, PCI y PCS se analiza también la estadía.</p></div>`;
      return;
    }
    const a = analizar(d);
    // Con precio base por tramo, el campo muestra el valor del tramo y no se edita.
    $('k-pb').readOnly = !!a.tramo;
    $('k-pb').classList.toggle('auto', !!a.tramo);
    if (a.tramo && document.activeElement !== $('k-pb')) $('k-pb').value = fmtCampo('pb', a.tramo.pb);
    if (a.faltan) {
      box.innerHTML = `<div class="card empty-state"><p>Para generar el análisis falta: <b>${a.faltan.map(esc).join(', ')}</b>.</p></div>`;
      return;
    }
    const gana = a.resultado > 0, pierde = a.resultado < 0;
    const verbo = gana ? 'GANA' : pierde ? 'PIERDE' : 'QUEDA EN EQUILIBRIO';
    const titulo = esc(d.nombre || 'Caso sin nombre');

    box.innerHTML = `
      <div class="card veredicto ${gana ? 'gana' : pierde ? 'pierde' : ''}">
        <div class="v-caso">${titulo}${d.grd || d.desc ? ` · <span>${d.grd ? 'GRD ' + esc(d.grd) + ' ' : ''}${esc(d.desc || '')}</span>` : ''}</div>
        ${d.relato ? `<p class="v-relato">${esc(d.relato)}</p>` : ''}
        <div class="v-main">La clínica <b>${verbo}</b>${a.resultado !== 0 ? ` <b>${clp(Math.abs(a.resultado))}</b>` : ''} con este paciente</div>
        <div class="v-formula">${clp(d.pb)} × ${fmtPeso(d.peso)} = ${clp(a.pagoBase)}${a.adicional > 0 || a.ajusteTec > 0 ? ` &nbsp;·&nbsp; Pago total = ${clp(a.pagoBase)}${a.adicional > 0 ? ` + ${clp(a.adicional)} (outlier)` : ''}${a.ajusteTec > 0 ? ` + ${clp(a.ajusteTec)} (tecnología)` : ''} = ${clp(a.pago)}` : ''}
          &nbsp;·&nbsp; Costo ${clp(a.costo)} &nbsp;·&nbsp; Recupera ${GRD.pct(a.recuperacion)}</div>
        ${a.avisos.length ? `<div class="v-avisos">${a.avisos.map(x => '⚠ ' + esc(x)).join('<br>')}</div>` : ''}
      </div>

      <div class="grid2">
        <div class="card">
          <div class="caso-titulo">Resumen del caso</div>
          ${tablaResumen(a)}
        </div>
        <div class="card explica">
          <h3>Explicación paso a paso</h3>
          ${explicacion(a)}
        </div>
      </div>

      <div class="card">
        <h3>¿El pago GRD alcanza para cubrir el costo?</h3>
        <div id="k-ch-comp" class="chart"></div>
        <p class="como-leer"><b>Cómo leer este gráfico:</b> la barra verde es lo que paga el asegurador por el GRD; la barra roja es lo que gastó la clínica, separada por tipo de costo (pase el mouse sobre cada parte). La diferencia entre ambas es la ganancia o la pérdida.</p>
      </div>

      <div class="card">
        <h3>Curva: ganancia o pérdida según los días de estada</h3>
        <div id="k-ch-dias" class="chart"></div>
        <p class="como-leer" id="k-leer-dias"></p>
      </div>

      <div class="grid2">
        <div class="card">
          <h3>Curva: resultado según el precio base</h3>
          <div id="k-ch-pb" class="chart"></div>
          <p class="como-leer"><b>Cómo leer este gráfico:</b> muestra cuánto ganaría o perdería la clínica con este mismo paciente si el precio base negociado fuera distinto.
            ${a.pbEq > 0 ? `Donde la línea cruza el cero está el <b>precio base de equilibrio</b> (${clp(a.pbEq)}): con un precio base menor, este caso da pérdida.` : 'Aquí los pagos que no dependen del precio base (ajuste por tecnología) ya cubren todo el costo: el caso gana con cualquier precio base.'}</p>
        </div>
        <div class="card">
          <h3>¿Dónde se ubica este caso frente a los demás egresos?</h3>
          <div id="k-ch-dist" class="chart"></div>
          <p class="como-leer" id="k-leer-dist"></p>
        </div>
      </div>

      <div class="card aprendizaje">
        <h3>Lo que aprendemos de este caso</h3>
        ${aprendizajes(a)}
      </div>`;

    graficos(a);
  }

  function tablaResumen(a) {
    const d = a.d;
    const fila = (v, m, cls = '') => `<tr class="${cls}"><td>${v}</td><td>${m}</td></tr>`;
    const signo = v => `<span class="${v < 0 ? 'neg' : 'pos'}"><b>${clp(v)}</b></span>`;
    return `<table class="caso"><thead><tr><th>Variable</th><th>Monto</th></tr></thead><tbody>
      ${fila(a.tramo ? `Precio base del ${a.tramo.nombre} <small>(${a.tramo.rango} · ${a.tramo.fuente})</small>` : 'Precio base pactado', clp(d.pb))}
      ${fila('Peso del episodio', fmtPeso(d.peso))}
      ${fila('Pago GRD base (precio base × peso)', clp(a.pagoBase))}
      ${a.adicional > 0 ? fila(`Pago adicional outlier (${nd(a.diasAd)} × ${pesosDec(a.valorDia)})`, clp(a.adicional)) : ''}
      ${a.tec.items.map(t => fila(`Ajuste por tecnología: ${esc(t.nombre)}`, clp(t.valor))).join('')}
      ${a.adicional > 0 || a.ajusteTec > 0 ? fila('Pago total', `<b>${clp(a.pago)}</b>`) : ''}
      ${a.items.map(i => fila(`&nbsp;&nbsp;· ${esc(i.name)}${i.detalle ? ` <small>(${esc(i.detalle)})</small>` : ''}`, clp(i.value), 'sub')).join('')}
      ${fila('Costo total asignado', `<b>${clp(a.costo)}</b>`)}
      ${fila('Resultado del episodio', signo(a.resultado), 'total')}
      ${fila('% de recuperación (pago ÷ costo)', GRD.pct(a.recuperacion))}
      ${fila('Costo por unidad de peso (costo ÷ peso)', clp(a.cup))}
      ${a.dias != null ? fila('Días de estada', num(a.dias, 0) + (a.tieneNorma ? ` <small>(EM norma ${fmtN(d.em)} · rango ${d.pci}–${d.pcs})</small>` : '')) : ''}
      ${a.tipo ? fila('Tipo de estancia', `<span class="tag ${a.sup ? 'sup' : a.inf ? 'inf' : 'inlier'}">${a.tipo}</span>`) : ''}
      ${a.diasMax != null && a.vDia > 0 && !(a.dias >= a.recupera)
        ? fila('Días máximos sin pérdida (aprox.)', a.equilibrio === 0 ? 'Ninguno: los costos fijos ya superan el pago' : num(a.diasMax, 0)) : ''}
      ${isFinite(a.recupera) && a.dias >= a.recupera ? fila('Zona de pérdida por estadía (aprox.)', `días ${num(a.equilibrio, 1)} a ${num(a.recupera, 1)} <small>(después el pago por outlier vuelve a superar al costo)</small>`) : ''}
    </tbody></table>`;
  }

  function explicacion(a) {
    const d = a.d, P = [];
    const pctItem = i => num(i.value / a.costo * 100, 0) + ' %';

    // 1. pago
    let t1 = `En el sistema GRD el asegurador no paga cada prestación por separado: paga un <b>monto fijo</b> según el grupo (GRD) del paciente.
      Ese monto es el <b>precio base</b> pactado multiplicado por el <b>peso</b> del GRD, que indica cuántos recursos consume en promedio ese tipo de paciente
      (peso ${fmtPeso(d.peso)}: ${d.peso > 1 ? 'más complejo' : d.peso < 1 ? 'menos complejo' : 'igual'} que el paciente promedio, que pesa 1,0).
      <div class="calc">Pago = ${clp(d.pb)} × ${fmtPeso(d.peso)} = <b>${clp(a.pagoBase)}</b></div>`;
    if (a.tramo)
      t1 = `Según las bases de licitación, el precio base depende del <b>tramo de peso relativo</b>: un peso de ${fmtPeso(d.peso)} cae en el <b>${a.tramo.nombre}</b> (${a.tramo.rango}), con un precio base de ${clp(d.pb)} (${a.tramo.fuente}).<br>` + t1;
    if (a.adicional > 0)
      t1 += `Como el paciente es <b>outlier superior</b>, se ${a.diasAd === 1 ? 'paga 1 día adicional' : `pagan ${a.diasAd} días adicionales`} (días − PCS − P50 = ${a.dias} − ${d.pcs} − ${a.p50}) a ${pesosDec(a.valorDia)}${a.diasAd === 1 ? '' : ' cada uno'} (pago base ÷ EM): ${clp(a.adicional)}.`;
    if (a.ajusteTec > 0)
      t1 += ` Además, por las prestaciones de alto costo realizadas, las bases pagan un <b>ajuste por tecnología</b> (una sola vez por egreso): ${a.tec.items.map(t => `${esc(t.nombre)} ${clp(t.valor)}`).join(' + ')}.`;
    if (a.adicional > 0 || a.ajusteTec > 0)
      t1 += `<div class="calc">Pago total = ${clp(a.pagoBase)}${a.adicional > 0 ? ` + ${clp(a.adicional)}` : ''}${a.ajusteTec > 0 ? ` + ${clp(a.ajusteTec)}` : ''} = <b>${clp(a.pago)}</b></div>`;
    else if (a.sup && a.diasAd === 0)
      t1 += `El paciente superó el punto de corte superior, pero ${a.dias - d.pcs === 1 ? 'su día extra cae' : `sus ${a.dias - d.pcs} días extra caen`} dentro del período de carencia (P50 = ${nd(a.p50)}), así que <b>no hay pago adicional</b>.`;
    else if (a.sup && !a.reglas)
      t1 += `El paciente superó el punto de corte superior. En este análisis <b>no se aplica</b> pago por outlier; si el convenio lo pagara, recibiría ${clp(a.adicionalPotencial)} adicionales (active la casilla para verlo).`;
    P.push(['¿Cuánto recibe la clínica?', t1]);

    // 2. costo
    const mayor = [...a.items].sort((x, y) => y.value - x.value)[0];
    let t2 = a.items.length > 1
      ? `Se suman todos los costos del episodio: ${a.items.map(i => `${esc(i.name)} ${clp(i.value)}`).join(' + ')} = <b>${clp(a.costo)}</b>.
         <br>El componente más importante fue <b>${esc(mayor.name)}</b> (${pctItem(mayor)} del costo).`
      : `El costo total asignado al episodio es <b>${clp(a.costo)}</b>. (Con el desglose de costos se puede ver qué lo explica.)`;
    const dc = a.items.find(i => i.k === 'diacama');
    if (dc && a.items.length > 1 && dc !== mayor) t2 += ` Sólo la estadía (día cama) costó ${clp(dc.value)} (${pctItem(dc)}).`;
    P.push(['¿Cuánto le costó a la clínica?', t2]);

    // 3. resultado
    const rec = a.recuperacion != null ? num(a.recuperacion * 100, 1) : null;
    P.push(['¿Se gana o se pierde?', `<div class="calc">Resultado = pago − costo = ${clp(a.pago)} − ${clp(a.costo)} = <b class="${a.resultado < 0 ? 'neg' : 'pos'}">${clp(a.resultado)}</b></div>
      ${a.resultado > 0 ? 'El pago es mayor que el costo: la clínica <b>gana</b>.' : a.resultado < 0 ? 'El costo es mayor que el pago: la clínica <b>pierde</b>.' : 'Pago y costo son iguales: la clínica queda en equilibrio.'}
      ${rec != null ? ` Recupera el <b>${rec} %</b> de lo que gastó: por cada $100 gastados recibe $${rec}.` : ''}`]);

    // 4. costo por unidad de peso
    const conExtras = a.adicional > 0 || a.ajusteTec > 0;
    const ref = conExtras ? a.pagoPorPeso : d.pb;
    const refTxt = conExtras ? `el pago efectivo por unidad de peso (${clp(a.pagoPorPeso)}, incluye los pagos adicionales)` : `el precio base (${clp(d.pb)})`;
    P.push(['Otra forma de verlo: costo por unidad de peso', `El caso costó <b>${clp(a.cup)}</b> por cada unidad de peso (costo ÷ peso), ${a.cup > ref ? '<b>más</b>' : '<b>menos</b>'} que ${refTxt}.
      Regla práctica: <i>si el costo por unidad de peso supera al ${conExtras ? 'pago efectivo por unidad de peso' : 'precio base'}, el caso pierde</i>.`]);

    // 5. estadía
    if (a.tieneNorma && a.dias != null) {
      const veces = a.dias / d.em;
      let t5 = `El paciente estuvo <b>${nd(a.dias)}</b>. Para este GRD la estancia media de la norma (EM) es ${fmtN(d.em)} días, y lo esperado va de ${d.pci} a ${nd(d.pcs)} (puntos de corte).
        Por eso es <b>${a.tipo.toLowerCase()}</b>. Estuvo ${num(veces, 2)} veces la estancia media.`;
      if (a.dias > d.em) t5 += ` <br>Cada día por sobre la EM aumenta el costo, pero <b>no aumenta el pago</b> (el GRD paga lo mismo${a.reglas ? ' salvo el adicional por outlier' : ''}).`;
      else t5 += ' <br>Una estadía igual o menor a la esperada ayuda a que el costo quede bajo el pago.';
      P.push(['¿Y la estadía?', t5]);
    }

    // 6. equilibrio en días
    if (a.vDia > 0 && a.dias != null) {
      const varios = a.items.filter(i => i.tipo === 'variable').map(i => i.k === 'total' ? 'costo total' : i.name.toLowerCase()).join(' + ');
      const fijos = a.items.filter(i => i.tipo === 'fijo').map(i => i.name.toLowerCase()).join(', ');
      let t6 = `Suponiendo un costo de <b>${clp(a.vDia)} por día</b> de hospitalización (${varios}, repartido en ${nd(a.dias)})${a.fijo > 0 ? ` más <b>${clp(a.fijo)}</b> de costos fijos (${fijos})` : ''},`;
      if (a.dias >= a.recupera)
        t6 += ` el caso pierde ${a.equilibrio > 0 ? `desde el día ${num(a.equilibrio, 1)}` : 'con estadías cortas'} y hasta el día ${num(a.recupera, 1)}; después, el pago por outlier (${pesosDec(a.valorDia)} por día) crece más rápido que el costo diario. El paciente estuvo ${nd(a.dias)}: por eso la clínica <b>gana</b>.`;
      else if (a.equilibrio === 0) t6 += ` los costos fijos por sí solos ya superan el pago GRD: el caso pierde aunque la estadía sea muy corta.`;
      else if (a.diasMax == null) t6 += ` el pago por outlier crece más rápido que el costo diario, por lo que con esta estructura no aparece pérdida por días adicionales.`;
      else {
        t6 += ` el pago GRD alcanza para cubrir hasta <b>${nd(a.diasMax)}</b> de estadía.`;
        t6 += a.dias === a.diasMax
          ? ` El paciente estuvo ${nd(a.dias)}: justo en el límite; un día más ya daría pérdida.`
          : a.dias < a.diasMax
          ? ` El paciente estuvo ${nd(a.dias)}: le ${a.diasMax - a.dias === 1 ? 'sobró' : 'sobraron'} ${nd(a.diasMax - a.dias)} de margen.`
          : ` El paciente estuvo ${nd(a.dias)}: <b>${nd(a.dias - a.diasMax)} más</b> de lo que el pago permite cubrir.`;
        if (isFinite(a.recupera)) t6 += ` Con estadías aún más largas, desde el día ${num(a.recupera, 1)} el pago por outlier vuelve a superar al costo.`;
      }
      P.push(['¿Hasta cuántos días se puede hospitalizar sin perder?', t6]);
    }

    // 7. qué cambiar
    if (a.resultado < 0) {
      P.push(['¿Qué tendría que cambiar para no perder?', `<ul>
        <li>Reducir el costo en al menos <b>${clp(-a.resultado)}</b> (costo máximo aceptable: ${clp(a.pago)}).</li>
        <li>O negociar un precio base de al menos <b>${clp(a.pbEq)}</b>${topeTramo(a) != null && a.pbEq > topeTramo(a) ? ` (ojo: supera el tope del ${a.tramo.nombre} en las bases, ${clp(topeTramo(a))}; una oferta sobre el tope es inadmisible)` : ''}.</li>
        ${a.diasMax != null && a.dias != null && a.dias > a.diasMax && a.diasMax > 0 ? `<li>O acortar la estadía a <b>${nd(a.diasMax)}</b> o menos (con el mismo costo diario).</li>` : ''}
      </ul>`]);
    } else if (a.resultado > 0) {
      P.push(['¿Cuánto margen hay?', `El costo podría aumentar hasta en <b>${clp(a.resultado)}</b> (${num(a.resultado / a.costo * 100, 0)} %), es decir, llegar a ${clp(a.pago)}, antes de generar pérdida.
        El precio base podría bajar hasta ${clp(a.pbEq)} y el caso seguiría sin pérdida.`]);
    }

    return `<ol class="pasos">${P.map(([h, t]) => `<li><h4>${h}</h4><div>${t}</div></li>`).join('')}</ol>`;
  }

  // Tope del tramo de licitación usado (o null).
  const topeTramo = a => {
    if (!a.tramo) return null;
    const max = Licitacion._st().tramos[a.tramo.i].max;
    return max > 0 ? max : null;
  };

  function aprendizajes(a) {
    const d = a.d, L = [];
    L.push('En GRD el ingreso depende del <b>GRD asignado</b> (diagnóstico principal, procedimientos y severidad por diagnósticos secundarios), que fija el peso; no de la cantidad de prestaciones realizadas.');
    if (a.resultado > 0 && a.cup <= d.pb) L.push(`Este caso es rentable porque el costo por unidad de peso (${clp(a.cup)}) quedó bajo el precio base (${clp(d.pb)}).`);
    else if (a.resultado > 0) L.push(`El costo por unidad de peso (${clp(a.cup)}) supera al precio base: el caso es rentable sólo gracias a los pagos adicionales (outlier o tecnología).`);
    const costoExtra = a.tieneNorma && a.dias > d.em ? (a.dias - d.em) * a.vDia : 0;
    if (a.resultado < 0 && costoExtra >= 0.3 * -a.resultado)
      L.push(`La estadía prolongada (${nd(a.dias)} vs. ${fmtN(d.em)} de la norma) explica buena parte de la pérdida: cada día extra suma costo${a.reglas ? ' y sólo se paga (en parte) después de PCS + P50' : ' sin sumar pago'}.`);
    if (a.sup && a.reglas && a.adicional > 0 && a.resultado < 0) L.push('El pago adicional por outlier ayuda, pero normalmente no compensa todo el costo de una estadía muy larga.');
    if (a.ajusteTec > 0) L.push(`El ajuste por tecnología (${clp(a.ajusteTec)}) financia aparte las prestaciones de alto costo: sin él, este caso ${a.resultado - a.ajusteTec < 0 ? `<b>perdería ${clp(a.ajusteTec - a.resultado)}</b>` : `igual ganaría ${clp(a.resultado - a.ajusteTec)}`}.`);
    if (a.tramo) L.push('Con precios base por tramo, el pago cambia de golpe en los límites de peso (1,5 y 2,5): la calidad de la codificación es clave y FONASA la audita.');
    const mayor = [...a.items].sort((x, y) => y.value - x.value)[0];
    if (a.items.length > 1 && mayor.k === 'insumos' && mayor.value / a.costo > 0.25) L.push('Los insumos y prótesis pesan mucho en el costo: negociar su precio es clave para la rentabilidad.');
    if (a.items.length > 1 && mayor.k === 'diacama') L.push('El día cama es el principal costo: gestionar las altas oportunas mejora directamente el resultado.');
    if (a.resultado >= 0 && a.resultado / a.costo < 0.08) {
      const extra = a.diasMax != null && a.dias != null && !isFinite(a.recupera) ? a.diasMax - a.dias + 1 : null;
      L.push(`El margen es estrecho: una complicación${extra > 0 ? ` o ${extra === 1 ? 'un solo día más' : extra + ' días más'} de estadía` : ''} podría convertir la ganancia en pérdida.`);
    }
    L.push('La <b>eficiencia</b> (estadías ajustadas a la norma, sin complicaciones evitables y con costos controlados) es lo que mejora el resultado en un sistema de pago por GRD.');
    return `<ul>${L.map(x => `<li>${x}</li>`).join('')}</ul>`;
  }

  function graficos(a) {
    const d = a.d;
    // 1. Pago vs costo
    Charts.comparacion($('k-ch-comp'), {
      pago: [{ name: 'Pago base (PB × peso)', value: a.pagoBase }, ...(a.adicional > 0 ? [{ name: 'Adicional outlier', value: a.adicional }] : []),
        ...(a.ajusteTec > 0 ? [{ name: 'Ajuste por tecnología', value: a.ajusteTec }] : [])],
      costo: a.items.map(i => ({ name: i.name, value: i.value }))
    });

    // 2. Curva por días
    const leer = $('k-leer-dias');
    if (a.dias == null) {
      $('k-ch-dias').innerHTML = '<p class="hint" style="padding:30px 0;text-align:center">Ingrese los días de estada para ver esta curva.</p>';
      leer.innerHTML = '';
    } else {
      const maxX = Math.max(8, Math.ceil(Math.max(a.dias * 1.5, a.tieneNorma ? d.pcs + a.p50 + 5 : 0, isFinite(a.equilibrio) ? a.equilibrio * 1.25 : 0,
        isFinite(a.recupera) && a.recupera <= a.dias * 3 ? a.recupera * 1.1 : 0)));
      const xs = Array.from({ length: 241 }, (_, i) => maxX * i / 240);
      const pagoS = xs.map(a.pagoEn), costoS = xs.map(a.costoEn);
      const vl = [];
      if (a.tieneNorma) {
        vl.push({ x: d.pci, label: `PCI ${d.pci}`, color: '#2c4fa8' });
        vl.push({ x: d.em, label: `EM ${fmtN(d.em)}`, color: '#6b6b70' });
        vl.push({ x: d.pcs, label: `PCS ${d.pcs}`, color: '#2c4fa8' });
        if (a.reglas && a.p50 > 0) vl.push({ x: a.umbral, label: `PCS+P50 ${a.umbral}`, color: '#1f7a4a' });
      }
      if (isFinite(a.equilibrio) && a.equilibrio > 0) vl.push({ x: a.equilibrio, label: `Equilibrio ≈ ${num(a.equilibrio, 1)} d`, color: '#e0a800', dash: '', width: 2 });
      if (isFinite(a.recupera) && a.recupera <= maxX) vl.push({ x: a.recupera, label: `Vuelve a ganar ≈ ${num(a.recupera, 1)} d`, color: '#1f7a4a', dash: '', width: 2 });
      Charts.lineas($('k-ch-dias'), {
        xs, series: [
          { name: 'Pago GRD', ys: pagoS, color: '#1f7a4a', width: 3 },
          { name: 'Costo acumulado', ys: costoS, color: '#c21a2b', width: 3 }
        ],
        fill: [0, 1], vlines: vl,
        markers: [{ x: a.dias, y: a.costoEn(a.dias), label: `Este paciente: ${nd(a.dias)}`, color: '#1d1d1f' }],
        xLabel: 'Días de estada', yLabel: '$', fmtX: v => num(v, 0), fmtY: v => GRD.num(v / 1e6, 1) + 'M',
        hover: i => {
          const r = pagoS[i] - costoS[i];
          return `<b>${num(xs[i], 1)} días</b><br>Pago GRD: ${clp(pagoS[i])}<br>Costo: ${clp(costoS[i])}<br>Resultado: <b class="${r < 0 ? 'neg' : 'pos'}">${clp(r)}</b>`;
        }
      });
      leer.innerHTML = `<b>Cómo leer este gráfico:</b> la línea <span class="pos">verde</span> es el pago GRD: es <b>plana</b> porque el asegurador paga lo mismo sin importar cuántos días se quede el paciente${a.reglas ? ' (sólo sube después de PCS + P50, por el pago de outlier)' : ''}.
        La línea <span class="neg">roja</span> es el costo, ${a.vDia > 0 ? `que <b>sube con cada día</b> (${clp(a.vDia)} por día${a.fijo > 0 ? `, partiendo de ${clp(a.fijo)} de costos fijos` : ''})` : `que aquí es <b>fijo</b> (${clp(a.fijo)}): ${a.dias > 0 ? 'ninguno de los costos ingresados depende de los días' : 'con 0 días no se puede estimar un costo por día'}`}.
        La zona verde es ganancia y la roja es pérdida. ${isFinite(a.equilibrio) && a.equilibrio > 0 ? `Las líneas se cruzan cerca del día <b>${num(a.equilibrio, 1)}</b>: desde ahí la clínica pierde${isFinite(a.recupera) ? ` hasta cerca del día <b>${num(a.recupera, 1)}</b>, cuando el pago por outlier (${pesosDec(a.valorDia)} por día) vuelve a superar al costo` : ''}.` : ''}
        El punto negro es este paciente. Pase el mouse sobre la curva para ver el resultado día a día.
        <br><small>Supuesto: día cama, medicamentos y exámenes crecen con los días; pabellón, insumos, honorarios y otros son fijos del episodio. Sin desglose, todo el costo se reparte por día.</small>`;
    }

    // 3. Sensibilidad al precio base
    // El eje incluye siempre el precio base de equilibrio, para que se vea el cruce con cero.
    const rEq = a.pbEq / d.pb, lo = Math.max(0, Math.min(0.5, rEq * 0.9)), hi = Math.max(1.5, rEq * 1.1);
    const pbs = Array.from({ length: 101 }, (_, i) => d.pb * (lo + (hi - lo) * i / 100));
    const factor = (a.pagoBase + a.adicional) / d.pb;   // parte del pago proporcional al precio base (el ajuste por tecnología es fijo)
    const pagoP = p => p * factor + a.ajusteTec;
    const resS = pbs.map(p => pagoP(p) - a.costo);
    const vlpb = [{ x: d.pb, label: 'Precio base actual', color: '#1d1d1f' }];
    if (a.pbEq >= pbs[0] && a.pbEq <= pbs[pbs.length - 1]) vlpb.push({ x: a.pbEq, label: `Equilibrio ${GRD.num(a.pbEq / 1e6, 2)}M`, color: '#e0a800', dash: '', width: 2 });
    Charts.lineas($('k-ch-pb'), {
      xs: pbs, series: [{ name: 'Resultado', ys: resS, color: '#8a0d1e', width: 3 }, { ys: pbs.map(() => 0), hidden: true, color: '#000' }],
      fill: [0, 1], yZero: true, vlines: vlpb, height: 300,
      markers: [{ x: d.pb, y: a.resultado, label: clp(a.resultado), color: a.resultado < 0 ? '#c21a2b' : '#1f7a4a' }],
      xLabel: 'Precio base ($)', fmtX: v => GRD.num(v / 1e6, 1) + 'M', fmtY: v => GRD.num(v / 1e6, 1) + 'M',
      hover: i => `Precio base <b>${clp(pbs[i])}</b><br>Pago ${clp(pagoP(pbs[i]))}<br>Resultado <b class="${resS[i] < 0 ? 'neg' : 'pos'}">${clp(resS[i])}</b>`
    });

    // 4. Posición frente a los egresos cargados
    const vals = computeAll().filter(r => r.peso > 0 && r.costo != null).map(r => r.costo / r.peso);
    const leerDist = $('k-leer-dist');
    if (vals.length < 3) {
      $('k-ch-dist').innerHTML = '<p class="hint" style="padding:30px 0;text-align:center">Cargue egresos en la pestaña Egresos para comparar este caso con otros.</p>';
      leerDist.innerHTML = '';
    } else {
      const st = Charts.distribution($('k-ch-dist'), vals, {
        fmt: GRD.clp, xLabel: 'Costo por unidad de peso ($)', bins: 16, showKde: true, showBands: true,
        refLine: { value: d.pb, label: 'Precio base del caso' }, inst: { value: a.cup, label: 'Este caso' }
      });
      const pct = Math.round(Charts.ecdf(st.sorted, a.cup) * 100);
      leerDist.innerHTML = `<b>Cómo leer este gráfico:</b> la curva muestra el costo por unidad de peso de los ${vals.length} egresos cargados en la aplicación.
        La línea roja es <b>este caso</b> (${clp(a.cup)}): es más caro por unidad de peso que el <b>${pct} %</b> de los egresos.
        Si los demás egresos se pagaran con el precio base de este caso (${clp(d.pb)}), los que quedan a la derecha de esa línea generarían pérdida.`;
    }
  }

  // ---------- eventos ----------
  function init() {
    $('k-tec').innerHTML = AJUSTES_TECNOLOGIA_2018.map((g, i) => `<label>${esc(g.grupo)}
      <select id="k-tec-${i}"><option value="">No aplica</option>${g.opciones.map((o, j) => `<option value="${j}">${esc(o[0])} · ${clp(o[1])}</option>`).join('')}</select></label>`).join('');
    $('k-ejemplo').innerHTML = '<option value="">— Elegir —</option>' + EJEMPLOS.map((e, i) => `<option value="${i}">${esc(e.titulo)}</option>`).join('');
    cargarForm();
    $('k-ejemplo').onchange = e => { if (e.target.value !== '') { aplicarEjemplo(EJEMPLOS[+e.target.value]); toast('Caso de ejemplo cargado'); } e.target.value = ''; };
    const form = $('a-modo-caso').querySelector('.card');
    form.addEventListener('input', e => {
      if (e.target.id === 'k-grd') {
        const cat = catMap.get(e.target.value.trim());
        if (cat) {
          $('k-desc').value = cat.descripcion; $('k-peso').value = fmtN(cat.peso); $('k-em').value = fmtN(cat.em);
          $('k-pci').value = cat.pci; $('k-pcs').value = cat.pcs; $('k-p50').value = cat.p50;
        }
      }
      guardarForm();
      clearTimeout(tRender); tRender = setTimeout(render, 150);
    });
    $('k-outlier').addEventListener('change', () => { guardarForm(); render(); });
    $('k-limpiar').onclick = () => {
      for (const k in CAMPOS) $(CAMPOS[k][0]).value = '';
      $('k-outlier').checked = false;
      $('k-pbtramo').checked = false;
      setTec(null);
      guardarForm(); render();
    };
    $('k-imprimir').onclick = () => window.print();
    $('k-practicar').onclick = () => {
      const a = analizar(leer());
      if (a.faltan) { toast('Complete primero: ' + a.faltan.join(', ')); return; }
      const d = a.d;
      const extra = a.ajusteTec > 0 ? { ajusteTec: a.ajusteTec, tecDetalle: a.tec.items.map(t => t.nombre).join(' + ') } : {};
      // sinOutlier: el ejercicio respeta la casilla de outlier del análisis
      if (a.tieneNorma && a.dias != null)
        Alumno.practicar(3, { pb: d.pb, grd: d.grd, desc: d.desc, peso: d.peso, dias: a.dias, em: d.em, pci: d.pci, pcs: d.pcs, p50: a.p50, costo: a.costo, sinOutlier: !a.reglas, ...extra });
      else Alumno.practicar(2, { pb: d.pb, peso: d.peso, costo: a.costo, ...extra });
    };
  }

  return { init, render, analizar, EJEMPLOS };
})();
