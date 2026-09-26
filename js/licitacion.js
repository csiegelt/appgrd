// Análisis de una licitación GRD con precios base por tramo de peso relativo (ej. bases FONASA de camas críticas 2018).
// Usa utilidades globales de app.js ($, esc, toast, computeAll, state, kpi) y Alumno.parseEntrada en tiempo de ejecución.

const Licitacion = (() => {
  const LS_KEY = 'grd-licitacion-v1';
  const clp = GRD.clp, num = GRD.num;
  const fmtN = v => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(v);
  const fmtInt = v => v == null || v === '' ? '' : new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(v);
  const parse = (s, t) => Alumno.parseEntrada(s, t);

  // Bases conocidas. min = 0 significa "sin mínimo informado".
  const PRESETS = {
    camas2018: {
      nota: 'Caso histórico: bases de licitación de camas críticas GRD 2018. No corresponde a condiciones vigentes.',
      l1: 1.5, l2: 2.5, pond: 50,
      tramos: [{ min: 1500000, max: 2150000 }, { min: 2150001, max: 3200000 }, { min: 3200001, max: 5000000 }]
    },
    privados2023: {
      nota: 'Topes de las bases 2023 de compra a prestadores privados, según análisis publicados. Mínimos no informados; verifique ponderaciones en las bases oficiales.',
      l1: 1.5, l2: 2.5, pond: 50,
      tramos: [{ min: 0, max: 2285000 }, { min: 0, max: 3402000 }, { min: 0, max: 5315000 }]
    },
    privados2024: {
      nota: 'Topes de las bases 2024 de compra a prestadores privados, según análisis publicados. Mínimos no informados; verifique ponderaciones en las bases oficiales.',
      l1: 1.5, l2: 2.5, pond: 50,
      tramos: [{ min: 0, max: 2367000 }, { min: 0, max: 3524000 }, { min: 0, max: 5506000 }]
    },
    personalizada: {
      nota: 'Bases personalizadas: ingrese los límites de peso, los rangos de precio base y la ponderación de sus propias bases.',
      l1: 1.5, l2: 2.5, pond: 50,
      tramos: [{ min: 0, max: 0 }, { min: 0, max: 0 }, { min: 0, max: 0 }]
    }
  };

  // Casos de ejemplo para el alumno (clínicas ficticias; costos ilustrativos).
  const EJEMPLOS = [
    {
      titulo: 'Clínica Andina: oferta con margen en los 3 tramos',
      relato: 'La Clínica Andina (ficticia) postula a la licitación de camas críticas 2018. Su histórico codificado muestra costos por unidad de peso bajo los topes de los tres tramos, así que puede ofertar con margen.',
      preguntas: ['¿La oferta es admisible?', '¿Cuál es el precio base de equilibrio de cada tramo y cuánto margen deja la oferta?', '¿Qué tramo aporta más al resultado total y por qué?', 'Si la competencia oferta en promedio $2.900.000, ¿qué puntaje económico obtendría?'],
      preset: 'camas2018', margen: 5, comp: 2900000,
      tramos: [{ oferta: 2050000, n: 120, pesoMedio: 1.0, costoMedio: 1900000 }, { oferta: 3050000, n: 60, pesoMedio: 2.0, costoMedio: 5800000 }, { oferta: 4700000, n: 25, pesoMedio: 3.5, costoMedio: 15400000 }],
      simular: { peso: 2.34, costo: 5500000, tec: '' }
    },
    {
      titulo: 'Clínica del Pacífico: el tramo 3 no cubre sus costos',
      relato: 'La Clínica del Pacífico (ficticia) atiende muchos pacientes de alta complejidad. En el tramo 3 (peso > 2,5) su costo por unidad de peso supera el tope de $5.000.000: aunque oferte el máximo permitido, ese tramo pierde.',
      preguntas: ['¿En qué tramo el precio de equilibrio supera el tope de las bases?', '¿Compensan los tramos 1 y 2 la pérdida del tramo 3?', '¿Qué alternativas tiene la clínica (reducir costos, no postular, negociar tecnología)?'],
      preset: 'camas2018', margen: 5, comp: 3200000,
      tramos: [{ oferta: 2150000, n: 80, pesoMedio: 1.1, costoMedio: 2090000 }, { oferta: 3200000, n: 50, pesoMedio: 2.1, costoMedio: 6300000 }, { oferta: 5000000, n: 40, pesoMedio: 3.8, costoMedio: 21280000 }],
      simular: { peso: 3.8, costo: 21280000, tec: '' }
    },
    {
      titulo: 'Clínica Cordillera: oferta inadmisible',
      relato: 'La Clínica Cordillera (ficticia) calculó que necesita $3.350.000 en el tramo 2 y lo ofertó así, sin revisar el tope de las bases.',
      preguntas: ['¿Por qué la oferta completa queda fuera del proceso?', '¿Cuál es el máximo que podía ofertar en el tramo 2?', 'Con ese máximo, ¿el tramo 2 gana o pierde?'],
      preset: 'camas2018', margen: 5, comp: 3000000,
      tramos: [{ oferta: 2100000, n: 90, pesoMedio: 1.0, costoMedio: 1950000 }, { oferta: 3350000, n: 55, pesoMedio: 2.0, costoMedio: 6500000 }, { oferta: 4800000, n: 20, pesoMedio: 3.4, costoMedio: 15300000 }],
      simular: { peso: 2.0, costo: 6500000, tec: '' }
    },
    {
      titulo: 'Clínica Valle Central: precio agresivo para ganar puntaje',
      relato: 'La Clínica Valle Central (ficticia) quiere adjudicarse la licitación a toda costa y oferta cerca de los mínimos de cada tramo. Obtiene el máximo puntaje económico, pero sus costos no cambian.',
      preguntas: ['¿Qué puntaje económico obtiene frente a una competencia de $2.600.000 promedio?', '¿Cuánto pierde con la casuística esperada?', '¿Qué precio base mínimo debería ofertar en cada tramo para no perder?', '¿Conviene ganar la licitación con pérdida?'],
      preset: 'camas2018', margen: 5, comp: 2600000,
      tramos: [{ oferta: 1550000, n: 110, pesoMedio: 1.05, costoMedio: 1890000 }, { oferta: 2200000, n: 60, pesoMedio: 2.0, costoMedio: 5400000 }, { oferta: 3300000, n: 30, pesoMedio: 3.2, costoMedio: 13440000 }],
      simular: { peso: 1.5, costo: 2800000, tec: '' }
    },
    {
      titulo: 'Paciente con desfibrilador: efecto del ajuste por tecnología',
      relato: 'En la Clínica Andina (ficticia) un paciente de peso 2,8 (tramo 3) requiere un desfibrilador DDD con resincronización cardíaca. El dispositivo encarece mucho el egreso: vea en "Simular un egreso" cómo el ajuste por tecnología de las bases 2018 cambia el resultado.',
      preguntas: ['¿Cuánto paga el GRD sin el ajuste por tecnología?', '¿Cuánto agrega el ajuste por el desfibrilador?', '¿El egreso gana o pierde con y sin el ajuste?'],
      preset: 'camas2018', margen: 5, comp: 2900000,
      tramos: [{ oferta: 2050000, n: 120, pesoMedio: 1.0, costoMedio: 1900000 }, { oferta: 3050000, n: 60, pesoMedio: 2.0, costoMedio: 5800000 }, { oferta: 4700000, n: 25, pesoMedio: 3.5, costoMedio: 15400000 }],
      simular: { peso: 2.8, costo: 29500000, tec: '3-3' }
    }
  ];

  const nuevoTramo = t => ({ min: t.min, max: t.max, oferta: null, n: null, pesoMedio: null, costoMedio: null });
  let st = null;

  function defaults(preset = 'camas2018') {
    const p = PRESETS[preset];
    return { preset, l1: p.l1, l2: p.l2, pond: p.pond, fuente: 'egresos', margen: 5, comp: null, tramos: p.tramos.map(nuevoTramo) };
  }
  function load() {
    try { st = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { st = null; }
    if (!st || !Array.isArray(st.tramos) || st.tramos.length !== 3) st = defaults();
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) { /* sin storage */ } }

  const nombreTramo = i => ['Precio base 1', 'Precio base 2', 'Precio base 3'][i];
  const rangoPeso = i => i === 0 ? `peso ≤ ${fmtN(st.l1)}` : i === 1 ? `${fmtN(st.l1)} < peso ≤ ${fmtN(st.l2)}` : `peso > ${fmtN(st.l2)}`;
  const tramoDe = peso => peso <= st.l1 ? 0 : peso <= st.l2 ? 1 : 2;

  // ---------- cálculo ----------
  function casuistica() {
    const T = [0, 1, 2].map(() => ({ n: 0, sumPeso: 0, costo: 0, pesos: [] }));
    if (st.fuente === 'egresos') {
      computeAll().filter(r => r.peso > 0 && r.costo != null).forEach(r => {
        const t = T[tramoDe(r.peso)];
        t.n++; t.sumPeso += r.peso; t.costo += Number(r.costo); t.pesos.push(r.peso);
      });
    } else {
      st.tramos.forEach((tr, i) => {
        if (tr.n > 0 && tr.pesoMedio > 0 && tr.costoMedio != null) {
          T[i].n = tr.n; T[i].sumPeso = tr.n * tr.pesoMedio; T[i].costo = tr.n * tr.costoMedio;
        }
      });
    }
    return T;
  }

  function analizar() {
    const cas = casuistica();
    const margen = (st.margen || 0) / 100;
    const tramos = st.tramos.map((tr, i) => {
      const c = cas[i];
      const eq = c.sumPeso > 0 ? c.costo / c.sumPeso : null;               // precio base de equilibrio
      const tieneRango = tr.max > 0;
      const admisible = tr.oferta == null ? null : tieneRango ? tr.oferta >= (tr.min || 0) && tr.oferta <= tr.max : true;
      let sugerido = eq != null ? Math.ceil(eq * (1 + margen) / 1000) * 1000 : null;   // se redondea antes de acotar al rango
      if (sugerido != null && tieneRango) sugerido = Math.min(tr.max, Math.max(tr.min || 0, sugerido));
      const ingreso = tr.oferta != null ? tr.oferta * c.sumPeso : null;
      const resultado = ingreso != null ? ingreso - c.costo : null;
      return {
        i, ...tr, ...c, eq, tieneRango, admisible, sugerido,
        ingreso, resultado, margenReal: ingreso ? resultado / ingreso : null,
        pierdeEnTope: eq != null && tieneRango && eq > tr.max
      };
    });
    const ofertas = tramos.map(t => t.oferta);
    const completa = ofertas.every(v => v != null && v > 0);
    const inadmisibles = tramos.filter(t => t.admisible === false);
    const conDatos = tramos.filter(t => t.n > 0);
    const tot = {
      n: conDatos.reduce((a, t) => a + t.n, 0),
      sumPeso: conDatos.reduce((a, t) => a + t.sumPeso, 0),
      costo: conDatos.reduce((a, t) => a + t.costo, 0),
      ingreso: completa ? conDatos.reduce((a, t) => a + t.ingreso, 0) : null
    };
    tot.resultado = tot.ingreso != null ? tot.ingreso - tot.costo : null;
    tot.eq = tot.sumPeso ? tot.costo / tot.sumPeso : null;
    const pbProm = completa ? ofertas.reduce((a, v) => a + v, 0) / 3 : null;
    const puntaje = pbProm && st.comp > 0 && inadmisibles.length === 0 ? Math.min(1, st.comp / pbProm) * 100 : null;
    const pbUnico = state.params.precioBase;
    return { tramos, tot, completa, inadmisibles, pbProm, puntaje, pbUnico, ingresoUnico: pbUnico * tot.sumPeso };
  }

  // Precio base aplicable a un egreso según su peso: la oferta del tramo o, si no hay, el tope de las bases.
  function pbParaPeso(peso) {
    if (!st) load();
    const i = tramoDe(peso), t = st.tramos[i];
    const ofertaOk = t.oferta > 0 && (!(t.max > 0) || (t.oferta >= (t.min || 0) && t.oferta <= t.max));
    const pb = ofertaOk ? t.oferta : t.max > 0 ? t.max : 0;
    return { i, nombre: `tramo ${i + 1}`, rango: rangoPeso(i), pb, fuente: ofertaOk ? 'su oferta en la licitación' : t.oferta > 0 ? 'tope de las bases; su oferta es inadmisible' : 'tope de las bases' };
  }

  function cargarPreset(preset, conservar = true) {
    const p = PRESETS[preset];
    const prev = st.tramos;
    st.preset = preset; st.l1 = p.l1; st.l2 = p.l2; st.pond = p.pond;
    st.tramos = p.tramos.map((t, i) => conservar
      ? { ...nuevoTramo(t), oferta: prev[i].oferta, n: prev[i].n, pesoMedio: prev[i].pesoMedio, costoMedio: prev[i].costoMedio }
      : nuevoTramo(t));
  }

  function cargarEjemplo(k) {
    const ej = EJEMPLOS[k];
    cargarPreset(ej.preset, false);
    st.fuente = 'manual'; st.margen = ej.margen; st.comp = ej.comp; st.ejemplo = k;
    ej.tramos.forEach((t, i) => Object.assign(st.tramos[i], t));
    $('l-s-peso').value = fmtN(ej.simular.peso);
    $('l-s-costo').value = fmtInt(ej.simular.costo);
    $('l-s-tec').value = ej.simular.tec;
    st.sim = { peso: $('l-s-peso').value, costo: $('l-s-costo').value, tec: $('l-s-tec').value };
    ['l-tbl-bases', 'l-tbl-casu'].forEach(id => $(id).innerHTML = '');
    save(); render();
  }

  function renderRelato() {
    const ej = EJEMPLOS[st.ejemplo];
    if (!ej) return;
    $('l-relato').innerHTML = `<div class="relato"><b>${esc(ej.titulo)}</b><p>${esc(ej.relato)}</p>
      <b>Preguntas para el alumno</b><ol>${ej.preguntas.map(q => `<li>${esc(q)}</li>`).join('')}</ol>
      <p class="hint">Clínica y costos ficticios, con fines docentes. Las bases 2018 son un caso histórico: no corresponden a condiciones vigentes.</p></div>`;
  }

  // ---------- simular un egreso ----------
  function renderSim() {
    const box = $('l-s-res');
    const peso = parse($('l-s-peso').value, 'decimal'), costo = parse($('l-s-costo').value, 'money');
    if (!(peso > 0)) { box.innerHTML = '<p class="hint">Ingrese el peso relativo del egreso.</p>'; return; }
    const t = pbParaPeso(peso);
    if (!(t.pb > 0)) { box.innerHTML = `<p class="neg">El ${t.nombre} no tiene oferta ni tope definido.</p>`; return; }
    const [g, j] = ($('l-s-tec').value || '').split('-').map(Number);
    const tec = $('l-s-tec').value ? ajustesTecnologia(AJUSTES_TECNOLOGIA_2018.map((_, i) => i === g ? j : -1)) : { items: [], total: 0 };
    const pagoGRD = t.pb * peso, pago = pagoGRD + tec.total;
    const res = costo != null ? pago - costo : null;
    // efecto del salto de tramo cerca de los límites
    let salto = '';
    [st.l1, st.l2].forEach(l => {
      if (Math.abs(peso - l) <= 0.15) {
        const abajo = pbParaPeso(l), arriba = pbParaPeso(l + 0.0001);
        salto = `<p class="hint">⚠ Cerca del límite ${fmtN(l)}: un egreso de peso ${fmtN(l)} se paga ${clp(abajo.pb * l)} (${abajo.nombre}) y uno de peso apenas mayor ≈ ${clp(arriba.pb * l)} (${arriba.nombre}). Diferencia ≈ ${clp((arriba.pb - abajo.pb) * l)} por el salto de tramo.</p>`;
      }
    });
    box.innerHTML = `<table class="caso"><tbody>
      <tr><td>Tramo del egreso</td><td><b>${t.nombre}</b> <small>(${t.rango})</small></td></tr>
      <tr><td>Precio base aplicado</td><td>${clp(t.pb)} <small>(${t.fuente})</small></td></tr>
      <tr><td>Valor GRD (PB × peso)</td><td>${clp(t.pb)} × ${fmtN(peso)} = <b>${clp(pagoGRD)}</b></td></tr>
      ${tec.items.map(x => `<tr><td>Ajuste por tecnología</td><td>${esc(x.nombre)}: ${clp(x.valor)}</td></tr>`).join('')}
      ${tec.total ? `<tr><td>Pago total</td><td><b>${clp(pago)}</b></td></tr>` : ''}
      ${costo != null ? `<tr><td>Costo del egreso</td><td>${clp(costo)}</td></tr>
      <tr class="total"><td>Resultado</td><td><b class="${res < 0 ? 'neg' : 'pos'}">${clp(res)}</b>${tec.total ? ` <small>(sin el ajuste: <span class="${res - tec.total < 0 ? 'neg' : 'pos'}">${clp(res - tec.total)}</span>)</small>` : ''}</td></tr>` : ''}
    </tbody></table>${salto}`;
  }

  function renderTec() {
    $('l-tbl-tec').className = 'wrap';
    $('l-tbl-tec').innerHTML = `<thead><tr><th>Prestación</th><th>Detalle</th><th class="num">Valor por egreso</th></tr></thead><tbody>${
      AJUSTES_TECNOLOGIA_2018.map(g => g.opciones.map((o, j) => `<tr>${j === 0 ? `<td rowspan="${g.opciones.length}"><b>${esc(g.grupo)}</b></td>` : ''}<td>${esc(o[0])}</td><td class="num">${clp(o[1])}</td></tr>`).join('')).join('')}</tbody>`;
    $('l-s-tec').innerHTML = '<option value="">Sin ajuste por tecnología</option>' + AJUSTES_TECNOLOGIA_2018.map((g, i) =>
      `<optgroup label="${esc(g.grupo)}">${g.opciones.map((o, j) => `<option value="${i}-${j}">${esc(o[0])} · ${clp(o[1])}</option>`).join('')}</optgroup>`).join('');
  }

  // ---------- render ----------
  function render() {
    renderRelato();
    renderSim();
    if (document.activeElement !== $('l-preset')) $('l-preset').value = st.preset;
    $('l-nota').textContent = PRESETS[st.preset].nota;
    setIn('l-l1', fmtN(st.l1)); setIn('l-l2', fmtN(st.l2)); setIn('l-pond', fmtN(st.pond));
    if (document.activeElement !== $('l-fuente')) $('l-fuente').value = st.fuente;
    setIn('l-margen', fmtN(st.margen)); setIn('l-comp', fmtInt(st.comp));
    const a = analizar();
    renderBases(a);
    renderCasuistica(a);
    renderResultado(a);
  }
  const setIn = (id, v) => { if (document.activeElement !== $(id)) $(id).value = v ?? ''; };

  function renderBases(a) {
    const tb = $('l-tbl-bases');
    if (tb.contains(document.activeElement)) { actualizarEstados(a); return; }   // no reconstruir mientras escribe
    tb.innerHTML = `<thead><tr><th>Tramo</th><th>Peso relativo del egreso</th><th class="num">PB mínimo</th><th class="num">PB máximo (tope)</th><th class="num">Su oferta</th><th>Estado</th></tr></thead>
      <tbody>${a.tramos.map(t => `<tr>
        <td><b>${nombreTramo(t.i)}</b></td><td>${rangoPeso(t.i)}</td>
        <td class="num"><input class="num-in" data-t="${t.i}" data-k="min" inputmode="decimal" value="${fmtInt(t.min || null)}" placeholder="sin mínimo"></td>
        <td class="num"><input class="num-in" data-t="${t.i}" data-k="max" inputmode="decimal" value="${fmtInt(t.max || null)}"></td>
        <td class="num"><input class="num-in oferta" data-t="${t.i}" data-k="oferta" inputmode="decimal" value="${fmtInt(t.oferta)}" placeholder="$"></td>
        <td class="estado" data-estado="${t.i}">${estado(t)}</td></tr>`).join('')}</tbody>`;
  }
  function estado(t) {
    if (t.oferta == null) return '<span class="hint">Ingrese su oferta</span>';
    if (!t.tieneRango) return '<span class="hint">Sin tope definido</span>';
    if (t.admisible) return '<span class="tag inlier">Admisible</span>';
    return `<span class="tag sup">Inadmisible: ${t.oferta > t.max ? 'supera el tope' : 'bajo el mínimo'}</span>`;
  }
  function actualizarEstados(a) {
    a.tramos.forEach(t => { const c = document.querySelector(`[data-estado="${t.i}"]`); if (c) c.innerHTML = estado(t); });
  }

  function renderCasuistica(a) {
    const manual = st.fuente === 'manual';
    $('l-fuente-hint').innerHTML = manual
      ? 'Ingrese por tramo el número de egresos esperados, su peso medio y su costo medio por egreso.'
      : `Se usan los ${computeAll().filter(r => r.peso > 0 && r.costo != null).length} egresos de la pestaña <b>Egresos</b>${computeAll().some(r => !(r.peso > 0 && r.costo != null)) ? ' (se excluyen los que no tienen peso o costo)' : ''}, clasificados por tramo según su peso. Cambie a ingreso manual si no tiene datos propios.`;
    const tb = $('l-tbl-casu');
    if (tb.contains(document.activeElement)) { actualizarCasu(a); return; }
    const cel = (t, k, v, ph) => manual ? `<input class="num-in" data-t="${t.i}" data-k="${k}" inputmode="decimal" value="${v}" placeholder="${ph}">` : '';
    tb.innerHTML = `<thead><tr><th>Tramo</th><th class="num">N° egresos</th><th class="num">Peso medio</th><th class="num">Costo medio por egreso</th><th class="num">Suma de pesos</th><th class="num">Costo total</th><th class="num">PB de equilibrio</th><th class="num">PB sugerido (+${fmtN(st.margen)} %)</th></tr></thead>
      <tbody>${a.tramos.map(t => `<tr>
        <td><b>${nombreTramo(t.i)}</b><br><small>${rangoPeso(t.i)}</small></td>
        <td class="num">${manual ? cel(t, 'n', fmtInt(st.tramos[t.i].n), 'n') : num(t.n, 0)}</td>
        <td class="num">${manual ? cel(t, 'pesoMedio', t.pesoMedio != null ? fmtN(t.pesoMedio) : '', 'ej. 1,2') : (t.n ? num(t.sumPeso / t.n, 3) : '—')}</td>
        <td class="num">${manual ? cel(t, 'costoMedio', fmtInt(t.costoMedio), '$') : (t.n ? clp(t.costo / t.n) : '—')}</td>
        <td class="num" data-c="sp${t.i}">${t.n ? num(t.sumPeso, 2) : '—'}</td>
        <td class="num" data-c="ct${t.i}">${t.n ? clp(t.costo) : '—'}</td>
        <td class="num" data-c="eq${t.i}">${eqCell(t)}</td>
        <td class="num" data-c="sg${t.i}">${sugCell(t)}</td></tr>`).join('')}</tbody>`;
  }
  const eqCell = t => t.eq == null ? '—' : `<b class="${t.pierdeEnTope ? 'neg' : ''}">${clp(t.eq)}</b>${t.pierdeEnTope ? '<br><small class="neg">supera el tope</small>' : ''}`;
  const sugCell = t => t.sugerido == null ? '—' : `${clp(t.sugerido)} <button class="btn ghost sm" type="button" data-usar="${t.i}">Usar</button>`;
  function actualizarCasu(a) {
    a.tramos.forEach(t => {
      const set = (k, h) => { const c = document.querySelector(`[data-c="${k}${t.i}"]`); if (c) c.innerHTML = h; };
      set('sp', t.n ? num(t.sumPeso, 2) : '—'); set('ct', t.n ? clp(t.costo) : '—'); set('eq', eqCell(t)); set('sg', sugCell(t));
    });
  }

  function renderResultado(a) {
    const box = $('l-resultado');
    if (!a.tot.n) {
      box.innerHTML = `<div class="card empty-state"><p>No hay casuística para analizar. Cargue egresos en la pestaña <b>Egresos</b> o elija <b>Ingreso manual por tramo</b>.</p></div>`;
      return;
    }
    const ad = a.inadmisibles.length === 0;
    let veredicto;
    if (!a.completa) veredicto = `<div class="v-main">Ingrese su precio base ofertado en los 3 tramos para evaluar la oferta.</div>`;
    else if (!ad) veredicto = `<div class="v-main">La oferta es <b>INADMISIBLE</b></div>
      <p>${a.inadmisibles.map(t => `${nombreTramo(t.i)}: ${clp(t.oferta)} ${t.oferta > t.max ? `supera el tope de ${clp(t.max)}` : `está bajo el mínimo de ${clp(t.min)}`}`).join('<br>')}.<br>
      Según las bases, si un precio base ofertado queda fuera de su rango, <b>toda la oferta</b> se declara inadmisible.</p>`;
    else veredicto = `<div class="v-main">Oferta admisible · resultado esperado <b>${clp(a.tot.resultado)}</b></div>
      <p>Con la casuística esperada (${num(a.tot.n, 0)} egresos, suma de pesos ${num(a.tot.sumPeso, 2)}), los ingresos serían ${clp(a.tot.ingreso)} y los costos ${clp(a.tot.costo)}
      (${a.tot.resultado >= 0 ? 'margen' : 'pérdida'} de ${GRD.pct(Math.abs(a.tot.resultado) / a.tot.ingreso)} sobre los ingresos).</p>`;
    const cls = !a.completa ? '' : !ad ? 'pierde' : a.tot.resultado >= 0 ? 'gana' : 'pierde';

    box.innerHTML = `
      <div class="card veredicto ${cls}">
        <div class="v-caso">3 · Evaluación de la oferta</div>
        ${veredicto}
      </div>
      <div class="kpis">
        ${kpi('Egresos esperados', num(a.tot.n, 0), `Suma de pesos ${num(a.tot.sumPeso, 2)} · IC ${num(a.tot.sumPeso / a.tot.n, 3)}`)}
        ${kpi('Costo total esperado', clp(a.tot.costo), `PB de equilibrio global ${clp(a.tot.eq)}`)}
        ${kpi('Ingresos con su oferta', a.completa ? clp(a.tot.ingreso) : '—', a.pbProm ? `PB promedio ofertado ${clp(a.pbProm)}` : '')}
        ${kpi('Resultado esperado', a.completa ? clp(a.tot.resultado) : '—', ad ? '' : 'Sólo referencial: la oferta es inadmisible', a.tot.resultado == null || !ad ? '' : a.tot.resultado < 0 ? 'neg' : 'pos')}
        ${kpi('Puntaje económico estimado', a.puntaje != null ? num(a.puntaje, 1) + ' / 100' : '—',
          a.puntaje != null ? `Aporta ${num(a.puntaje * st.pond / 100, 1)} puntos (ponderación ${fmtN(st.pond)} %) · supuesto: menor PB ÷ su PB` : a.completa && !ad ? 'Oferta inadmisible: no recibe puntaje' : 'Ingrese el PB de la competencia')}
        ${kpi('Con un precio base único', clp(a.ingresoUnico - a.tot.costo), `Resultado si se pagara todo a ${clp(a.pbUnico)} (Parámetros)`, a.ingresoUnico - a.tot.costo < 0 ? 'neg' : 'pos')}
      </div>
      <div class="card">
        <h3>Curva de pago según el peso relativo</h3>
        <div id="l-ch-pago" class="chart"></div>
        <p class="como-leer"><b>Cómo leer este gráfico:</b> la línea <span class="pos">verde</span> es lo que se cobraría por un egreso según su peso, con <b>${a.tramos.some(t => t.oferta == null) ? 'su oferta o, donde falta, el PB sugerido o el tope' : 'su oferta'}</b> (precio base del tramo × peso). Fíjese en los <b>saltos</b> en los límites de tramo: el precio base cambia de golpe.
          La línea <span class="neg">roja</span> es el costo esperado (PB de equilibrio de cada tramo × peso). La línea punteada gris es el máximo que permiten las bases. Zona verde = ganancia, zona roja = pérdida. Pase el mouse para ver cada peso.</p>
      </div>
      <div class="grid2">
        <div class="card">
          <h3>Resultado esperado por tramo</h3>
          <div id="l-ch-tramos" class="chart"></div>
          <p class="como-leer"><b>Cómo leer este gráfico:</b> ganancia o pérdida de cada tramo con su oferta. Un tramo en rojo pierde: suba su oferta (si el tope lo permite) o revise sus costos.</p>
        </div>
        <div class="card">
          <h3>Distribución de los egresos por peso relativo</h3>
          <div id="l-ch-dist" class="chart"></div>
          <p class="como-leer"><b>Cómo leer este gráfico:</b> cuántos egresos caen en cada tramo. Los tramos con más egresos pesan más en el resultado total: allí la oferta debe ser más cuidadosa.</p>
        </div>
      </div>`;
    graficos(a);
  }

  function graficos(a) {
    const conDatos = a.tramos.filter(t => t.n > 0);
    const eqGlobal = a.tot.eq;
    const pmax = Math.max(4, ...(st.fuente === 'egresos' ? a.tramos.flatMap(t => t.pesos) : a.tramos.map(t => t.pesoMedio || 0)).map(p => p * 1.05));
    const xs = Array.from({ length: Math.round(pmax * 100) + 1 }, (_, i) => i / 100);   // paso 0,01: los límites 1,5 y 2,5 caen exactos
    const pbDe = (x, k) => { const t = a.tramos[tramoDe(x)]; return k === 'oferta' ? (t.oferta ?? t.sugerido ?? (t.max > 0 ? t.max : 0)) : k === 'max' ? t.max : (t.eq ?? eqGlobal ?? 0); };
    const pago = xs.map(x => pbDe(x, 'oferta') * x);
    const costo = xs.map(x => pbDe(x, 'eq') * x);
    const tope = xs.map(x => pbDe(x, 'max') * x);
    const usaSug = a.tramos.some(t => t.oferta == null);
    Charts.lineas($('l-ch-pago'), {
      xs, series: [
        { name: usaSug ? 'Pago (oferta; si falta, PB sugerido o tope)' : 'Pago con su oferta', ys: pago, color: '#1f7a4a', width: 3 },
        { name: 'Costo esperado', ys: costo, color: '#c21a2b', width: 2.5 },
        ...(a.tramos.every(t => t.max > 0) ? [{ name: 'Máximo de las bases', ys: tope, color: '#9a9aa2', width: 1.5, dash: '5 4' }] : [])
      ],
      fill: [0, 1],
      vlines: [{ x: st.l1, label: `Límite ${fmtN(st.l1)}`, color: '#2c4fa8' }, { x: st.l2, label: `Límite ${fmtN(st.l2)}`, color: '#2c4fa8' }],
      xLabel: 'Peso relativo del egreso', yLabel: '$ por egreso', fmtX: v => num(v, 1), fmtY: v => GRD.num(v / 1e6, 1) + 'M',
      hover: i => {
        const t = tramoDe(xs[i]), r = pago[i] - costo[i];
        return `Peso <b>${num(xs[i], 2)}</b> · ${nombreTramo(t)}<br>Pago: ${clp(pago[i])}<br>Costo esperado: ${clp(costo[i])}<br>Resultado: <b class="${r < 0 ? 'neg' : 'pos'}">${clp(r)}</b>`;
      }
    });

    Charts.hbars($('l-ch-tramos'), a.tramos.filter(t => t.n > 0 && t.resultado != null).map(t => ({
      key: t.i, label: `${nombreTramo(t.i)} (${rangoPeso(t.i)})`, value: t.resultado,
      tip: `<b>${nombreTramo(t.i)}</b><br>${t.n} egresos · suma de pesos ${num(t.sumPeso, 2)}<br>Ingreso ${clp(t.ingreso)}<br>Costo ${clp(t.costo)}<br>Resultado <b>${clp(t.resultado)}</b>`
    })));
    if (!conDatos.some(t => t.resultado != null)) $('l-ch-tramos').innerHTML = '<p class="hint" style="padding:30px 0;text-align:center">Ingrese las ofertas para ver el resultado por tramo.</p>';

    const pesos = st.fuente === 'egresos' ? a.tramos.flatMap(t => t.pesos) : [];
    if (pesos.length >= 3) {
      Charts.distribution($('l-ch-dist'), pesos, {
        fmt: v => num(v, 2), fmtShort: v => num(v, 1), xLabel: 'Peso relativo', bins: 20, showKde: true, showBands: false, hideMedian: true,
        extraLines: [{ value: st.l1, label: `Tramo 1 | 2 (${fmtN(st.l1)})`, color: '#2c4fa8' }, { value: st.l2, label: `Tramo 2 | 3 (${fmtN(st.l2)})`, color: '#2c4fa8' }]
      });
    } else {
      $('l-ch-dist').innerHTML = `<div class="tramo-bars">${a.tramos.map(t => `<div><span>${nombreTramo(t.i)}</span><div class="tb"><i style="width:${a.tot.n ? t.n / a.tot.n * 100 : 0}%"></i></div><b>${num(t.n, 0)}</b></div>`).join('')}</div>`;
    }
  }

  // ---------- eventos ----------
  function init() {
    if (!st) load();
    const tab = $('tab-licitacion');
    renderTec();
    $('l-ejemplo').innerHTML = '<option value="">— Elegir un caso —</option>' + EJEMPLOS.map((e, i) => `<option value="${i}">${esc(e.titulo)}</option>`).join('');
    $('l-ejemplo').addEventListener('change', e => {
      if (e.target.value === '') return;
      cargarEjemplo(+e.target.value);
      toast('Caso de licitación cargado');
      e.target.value = '';
    });
    const s0 = st.sim || {};
    $('l-s-peso').value = s0.peso || ''; $('l-s-costo').value = s0.costo || ''; $('l-s-tec').value = s0.tec || '';
    const guardaSim = () => { st.sim = { peso: $('l-s-peso').value, costo: $('l-s-costo').value, tec: $('l-s-tec').value }; save(); renderSim(); };
    ['l-s-peso', 'l-s-costo'].forEach(id => $(id).addEventListener('input', guardaSim));
    $('l-s-tec').addEventListener('change', guardaSim);
    $('l-preset').addEventListener('change', e => { cargarPreset(e.target.value, true); save(); render(); });
    $('l-fuente').addEventListener('change', e => { st.fuente = e.target.value; save(); render(); });
    // bases = true: editar límites o ponderación convierte las bases en personalizadas; no se aceptan vacíos ni ceros
    const numCampo = (id, k, t, bases) => $(id).addEventListener('input', e => {
      const v = parse(e.target.value, t);
      if (bases && !(v > 0)) return;
      if (v != null || e.target.value.trim() === '') { st[k] = v; if (bases) st.preset = 'personalizada'; save(); render(); }
    });
    numCampo('l-l1', 'l1', 'decimal', true); numCampo('l-l2', 'l2', 'decimal', true); numCampo('l-pond', 'pond', 'decimal', true);
    numCampo('l-margen', 'margen', 'decimal'); numCampo('l-comp', 'comp', 'money');
    tab.addEventListener('input', e => {
      const i = e.target.dataset.t, k = e.target.dataset.k;
      if (i == null || !k) return;
      const tipo = k === 'pesoMedio' ? 'decimal' : k === 'n' ? 'int' : 'money';
      st.tramos[+i][k] = parse(e.target.value, tipo);
      if (k === 'min' || k === 'max') st.preset = 'personalizada';
      save(); render();
    });
    tab.addEventListener('click', e => {
      const i = e.target.dataset.usar;
      if (i == null) return;
      const t = analizar().tramos[+i];
      st.tramos[+i].oferta = t.sugerido;
      save();
      const inp = document.querySelector(`#l-tbl-bases [data-t="${i}"][data-k="oferta"]`);
      if (inp) inp.value = fmtInt(t.sugerido);
      render();
      toast(`${nombreTramo(+i)}: oferta ${clp(t.sugerido)}`);
    });
  }

  return { init, render, analizar, pbParaPeso, cargarPreset: p => { cargarPreset(p, true); save(); }, PRESETS, EJEMPLOS, _st: () => st };
})();
