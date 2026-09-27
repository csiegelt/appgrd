// Controlador de la aplicación: estado, persistencia y render de cada pestaña.

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const numOrNull = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
// Campos numéricos en formato chileno: "3.000.000" (montos), "2,34" (decimales). tipo: 'money' | 'decimal' | 'int'
const numIn = (id, tipo = 'decimal') => Alumno.parseEntrada($(id).value, tipo);
const fmtIn = (v, tipo = 'decimal') => v == null || v === '' || isNaN(v) ? '' :
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: tipo === 'decimal' ? 4 : 0 }).format(v);

const LS_KEY = 'grd-app-v1';
const DEFAULT_PARAMS = {
  precioBase: 3000000, nombre: '', ajustes: false, carencia: 'p50',
  valorDia: 'em', diaFijo: 250000, factorDia: 1, factorInf: 1
};

let state = { params: { ...DEFAULT_PARAMS }, catalogo: [], egresos: [], distBench: {} };
let catMap = new Map();
let currentTab = 'dashboard';
const sortState = {};
const dist = { sel: null, evalValue: null };

// ---------------- persistencia ----------------
function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { /* sin storage */ }
  if (saved) {
    state = {
      params: { ...DEFAULT_PARAMS, ...saved.params },
      catalogo: saved.catalogo || CATALOGO_EJEMPLO.map(c => ({ ...c })),
      egresos: saved.egresos || [],
      distBench: saved.distBench || {}
    };
  } else {
    state.catalogo = CATALOGO_EJEMPLO.map(c => ({ ...c }));
    state.egresos = generarEgresosEjemplo();
    setTimeout(() => toast('Se cargaron datos de EJEMPLO. Reemplácelos con sus egresos y la norma vigente.'), 400);
  }
  rebuildCat();
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { toast('No se pudo guardar en el navegador'); }
}
function rebuildCat() {
  catMap = new Map(state.catalogo.map(c => [c.codigo, c]));
  $('grd-list').innerHTML = state.catalogo.map(c => `<option value="${esc(c.codigo)}">${esc(c.descripcion)}</option>`).join('');
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3200);
}
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function readFile(input, cb) {
  const f = input.files[0];
  if (!f) return;
  const rd = new FileReader();
  // UTF-8 si es válido; si no (CSV "normal" de Excel en Windows), windows-1252 para no perder los tildes.
  rd.onload = () => {
    let txt;
    try { txt = new TextDecoder('utf-8', { fatal: true }).decode(rd.result); }
    catch (e) { txt = new TextDecoder('windows-1252').decode(rd.result); }
    cb(txt); input.value = '';
  };
  rd.readAsArrayBuffer(f);
}
const pick = (o, keys) => { for (const k of keys) if (o[k] != null && o[k] !== '') return o[k]; return null; };

// ---------------- cálculo ----------------
function computeAll() {
  return state.egresos.map(e => GRD.calcular(e, catMap.get(e.grd), state.params));
}
function filtered() {
  const cdm = $('f-cdm').value, sev = $('f-sev').value, serv = $('f-serv').value, out = $('f-out').value;
  const d1 = $('f-desde').value, d2 = $('f-hasta').value;
  return computeAll().filter(r =>
    (!cdm || r.cdm === cdm) && (!sev || r.sev === sev) && (!serv || r.servicio === serv) &&
    (!out || r.estancia === out) && (!d1 || r.fecha >= d1) && (!d2 || r.fecha <= d2));
}
const cdmLabel = c => `${c} · ${CDM_NOMBRES[c] || 'CDM ' + c}`;
const ESTANCIA_NOMBRES = { inlier: 'Inlier', sup: 'Outlier superior', inf: 'Outlier inferior', nd: 'Sin norma' };
const tagEstancia = e => `<span class="tag ${e}">${ESTANCIA_NOMBRES[e]}</span>`;
const signed = v => v == null ? '—' : `<span class="${v < 0 ? 'neg' : 'pos'}">${GRD.clp(v)}</span>`;

// ---------------- tabla genérica ordenable ----------------
function renderTable(tbl, cols, rows, rerender) {
  const st = sortState[tbl.id] || (sortState[tbl.id] = { key: null, dir: 1 });
  if (st.key) {
    const c = cols.find(c => c.key === st.key);
    const get = c.sort || (r => r[c.key]);
    rows = [...rows].sort((a, b) => {
      const va = get(a), vb = get(b);
      if (va == null) return 1; if (vb == null) return -1;
      return (va > vb ? 1 : va < vb ? -1 : 0) * st.dir;
    });
  }
  const head = cols.map(c => `<th data-k="${c.key}" class="${c.num ? 'num' : ''}">${c.label}${st.key === c.key ? (st.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
  const body = rows.map(r => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? c.html(r) : esc(c.fmt ? c.fmt(r[c.key], r) : r[c.key])}</td>`).join('')}</tr>`).join('');
  tbl.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}" class="hint">Sin registros</td></tr>`}</tbody>`;
  tbl.querySelectorAll('th').forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    if (!k || k === '_acc') return;
    st.dir = st.key === k ? -st.dir : 1; st.key = k; rerender();
  });
}

// ---------------- pestañas ----------------
function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
  $('filters').hidden = !['dashboard', 'distribucion'].includes(tab);
  render();
}
function render() {
  refreshFilterOptions();
  ({
    dashboard: renderDashboard, distribucion: renderDistribucion, egresos: renderEgresos,
    // el precio base por defecto se carga sólo al abrir la pestaña (no mientras el alumno borra el campo para escribir)
    simulador: () => { if ($('s-pb').value === '') $('s-pb').value = fmtIn(state.params.precioBase, 'money'); renderSim(); }, licitacion: Licitacion.render, alumno: Alumno.render, catalogo: renderCatalogo, parametros: renderParams, guia: () => {}
  })[currentTab]();
}

function refreshFilterOptions() {
  const all = computeAll();
  const fill = (sel, values, label) => {
    const cur = sel.value;
    const first = sel.options[0].outerHTML;
    sel.innerHTML = first + values.map(v => `<option value="${esc(v)}">${esc(label(v))}</option>`).join('');
    sel.value = values.includes(cur) ? cur : '';
  };
  fill($('f-cdm'), [...new Set(all.map(r => r.cdm).filter(Boolean))].sort(), cdmLabel);
  fill($('f-serv'), [...new Set(all.map(r => r.servicio).filter(Boolean))].sort(), v => v);
  const n = filtered().length;
  $('f-count').textContent = `${n} de ${all.length} egresos`;
}

// ================= RESUMEN =================
function kpi(lbl, val, sub = '', cls = '') {
  return `<div class="kpi ${cls.includes('highlight') ? 'highlight' : ''}"><div class="lbl">${lbl}</div><div class="val ${cls}">${val}</div><div class="sub">${sub}</div></div>`;
}

function renderDashboard() {
  const rows = filtered();
  const s = GRD.resumen(rows);
  const P = state.params;
  const cls = v => v == null ? '' : v < 0 ? 'neg' : 'pos';
  $('kpis').innerHTML = [
    kpi('Egresos', GRD.num(s.n, 0), `${s.sinCatalogo} sin GRD en catálogo`),
    kpi('Índice casuístico', GRD.num(s.icm, 4), 'Peso medio (1,0 = promedio)'),
    kpi('Pago GRD total', GRD.clp(s.pago), `Precio base ${GRD.clp(P.precioBase)}${P.ajustes ? ' · con ajustes outlier' : ''}`),
    kpi('Costo total', GRD.clp(s.costo), `${GRD.num(s.dias, 0)} días cama`),
    kpi('Resultado', GRD.clp(s.resultado), `Recuperación ${GRD.pct(s.recuperacion)}`, cls(s.resultado)),
    kpi('Costo por unidad de peso', GRD.clp(s.costoUnidadPeso), s.costoUnidadPeso > P.precioBase ? 'Sobre el precio base → déficit' : 'Bajo el precio base → margen', s.costoUnidadPeso > P.precioBase ? 'neg' : 'pos'),
    kpi('Estancia media', GRD.num(s.em, 1) + ' d', `Esperada (norma) ${GRD.num(s.emEsp, 1)} d`),
    kpi('IEMA', GRD.num(s.iema, 3), s.iema == null ? '' : s.iema > 1 ? 'Estancias más largas que la norma' : 'Estancias iguales o menores a la norma', s.iema > 1 ? 'neg' : 'pos'),
    kpi('Outliers', `${s.outSup} / ${s.outInf}`, 'Superiores / inferiores'),
    kpi('Egresos con pérdida', GRD.num(s.perdidas, 0), s.n ? GRD.pct(s.perdidas / s.n) + ' del total' : '')
  ].join('');

  Charts.scatter($('chart-scatter'), rows, P.precioBase, r => {
    $('search').value = r.id; setTab('egresos');
  });

  const byCdm = groupBy(rows, r => r.cdm || '??');
  Charts.hbars($('chart-cdm'), Object.entries(byCdm).map(([k, rs]) => {
    const g = GRD.resumen(rs);
    return {
      key: k, label: cdmLabel(k), value: g.resultado,
      tip: `<b>${esc(cdmLabel(k))}</b><br>${g.n} egresos · IC ${GRD.num(g.icm, 3)}<br>Pago ${GRD.clp(g.pago)}<br>Costo ${GRD.clp(g.costo)}<br>Resultado <b>${GRD.clp(g.resultado)}</b><br><i>Clic para filtrar</i>`
    };
  }).sort((a, b) => a.value - b.value), key => { $('f-cdm').value = key; onFilterChange(); });

  // por severidad
  const bySev = groupBy(rows, r => r.sev || '?');
  const sevRows = Object.entries(bySev).sort().map(([k, rs]) => ({ k, ...GRD.resumen(rs) }));
  const tSev = document.createElement('table'); tSev.id = 't-sev';
  $('tbl-sev').innerHTML = ''; $('tbl-sev').appendChild(tSev);
  const drawSev = () => renderTable(tSev, [
    { key: 'k', label: 'Severidad', fmt: v => `${v} · ${SEVERIDAD_NOMBRES[v] || '?'}` },
    { key: 'n', label: 'Egresos', num: true },
    { key: 'icm', label: 'Peso medio', num: true, fmt: v => GRD.num(v, 3) },
    { key: 'em', label: 'EM', num: true, fmt: v => GRD.num(v, 1) },
    { key: 'costoUnidadPeso', label: 'Costo/peso', num: true, fmt: GRD.clp },
    { key: 'resultado', label: 'Resultado', num: true, html: r => signed(r.resultado) },
    { key: 'recuperacion', label: '% recup.', num: true, fmt: GRD.pct }
  ], sevRows, drawSev);
  drawSev();

  // GRD con mayor pérdida
  const byGrd = groupBy(rows, r => r.grd);
  const grdRows = Object.entries(byGrd).map(([k, rs]) => ({ k, desc: rs[0].descripcion, ...GRD.resumen(rs) }))
    .filter(r => r.resultado < 0).sort((a, b) => a.resultado - b.resultado).slice(0, 10);
  const tTop = document.createElement('table'); tTop.id = 't-top';
  $('tbl-top').innerHTML = ''; $('tbl-top').appendChild(tTop);
  const drawTop = () => renderTable(tTop, [
    { key: 'k', label: 'GRD' },
    { key: 'desc', label: 'Descripción', fmt: v => v.length > 40 ? v.slice(0, 39) + '…' : v },
    { key: 'n', label: 'n', num: true },
    { key: 'resultado', label: 'Resultado', num: true, html: r => signed(r.resultado) },
    { key: 'recuperacion', label: '% recup.', num: true, fmt: GRD.pct }
  ], grdRows, drawTop);
  drawTop();
}
function groupBy(arr, fn) {
  return arr.reduce((acc, x) => { const k = fn(x); (acc[k] = acc[k] || []).push(x); return acc; }, {});
}

// ================= DISTRIBUCIÓN =================
const P = () => state.params;
const METRICS = {
  costoPeso: {
    label: 'Costo por unidad de peso GRD', xLabel: 'Costo ÷ peso GRD ($)', fmt: GRD.clp,
    get: r => r.peso > 0 && r.costo != null ? r.costo / r.peso : null,
    inst: (rows, s) => s.costoUnidadPeso, instHint: 'Costo total ÷ suma de pesos',
    ref: () => ({ value: P().precioBase, label: 'Precio base' }), goodIfLow: true,
    bench: () => ({ mean: P().precioBase, sd: Math.round(P().precioBase * 0.25) }),
    benchHint: 'Sugerido: media = precio base (punto de equilibrio), DE = 25 %. Reemplace por la media y DE de su red, macrozona o benchmark de hospitales de similar complejidad.',
    aboveLabel: 'egresos con costo/peso sobre el precio base (en pérdida)'
  },
  recuperacion: {
    label: '% de recuperación', xLabel: 'Pago GRD ÷ costo', fmt: GRD.pct, short: v => GRD.num(v * 100, 0) + '%',
    get: r => r.recuperacion, inst: (rows, s) => s.recuperacion, instHint: 'Pago total ÷ costo total',
    ref: () => ({ value: 1, label: '100 % equilibrio' }), goodIfLow: false,
    bench: () => ({ mean: 1, sd: 0.25 }),
    benchHint: 'Sugerido: media 100 % (equilibrio), DE 25 %. Ajuste con los datos de su referencia.',
    aboveLabel: 'egresos que recuperan más del 100 % del costo'
  },
  resultado: {
    label: 'Resultado por egreso', xLabel: 'Pago − costo ($)', fmt: GRD.clp,
    get: r => r.resultado, inst: (rows, s) => s.n ? s.resultado / s.n : null, instHint: 'Resultado promedio por egreso',
    ref: () => ({ value: 0, label: 'Equilibrio' }), goodIfLow: false,
    bench: () => ({ mean: 0, sd: Math.round(P().precioBase * 0.3) }),
    benchHint: 'Sugerido: media 0 (equilibrio), DE = 30 % del precio base.',
    aboveLabel: 'egresos con resultado positivo'
  },
  iest: {
    label: 'Índice de estancia', xLabel: 'Días de estada ÷ EM norma del GRD', fmt: v => GRD.num(v, 2),
    get: r => r.emNorma > 0 && r.dias != null ? r.dias / r.emNorma : null,
    inst: (rows, s) => s.iema, instHint: 'IEMA = EM observada ÷ EM esperada',
    ref: () => ({ value: 1, label: 'Norma (1,0)' }), goodIfLow: true,
    bench: () => ({ mean: 1, sd: 0.35 }),
    benchHint: 'Sugerido: media 1,0 (norma IR-GRD), DE 0,35.',
    aboveLabel: 'egresos con estancia sobre la norma'
  },
  costo: {
    label: 'Costo total por egreso', xLabel: 'Costo ($)', fmt: GRD.clp,
    get: r => r.costo, inst: (rows, s) => s.n ? s.costo / s.n : null, instHint: 'Costo medio por egreso',
    ref: null, goodIfLow: true, bench: () => null,
    benchHint: 'Ingrese la media y DE del costo por egreso de su referencia para comparar.'
  },
  costoDia: {
    label: 'Costo por día de estada', xLabel: 'Costo ÷ días ($)', fmt: GRD.clp,
    get: r => r.dias > 0 && r.costo != null ? r.costo / r.dias : null,
    inst: (rows, s) => s.dias ? s.costo / s.dias : null, instHint: 'Costo total ÷ días totales',
    ref: null, goodIfLow: true, bench: () => null,
    benchHint: 'Ingrese la media y DE del costo día cama de su referencia para comparar.'
  },
  peso: {
    label: 'Peso GRD', xLabel: 'Peso relativo', fmt: v => GRD.num(v, 4), short: v => GRD.num(v, 2),
    get: r => r.peso, inst: (rows, s) => s.icm, instHint: 'Índice casuístico (peso medio)',
    ref: () => ({ value: 1, label: 'Peso 1,0' }), goodIfLow: null, bench: () => null,
    benchHint: 'Ingrese el índice casuístico medio y DE de establecimientos comparables.',
    aboveLabel: 'egresos con peso mayor a 1,0 (más complejos que el promedio)'
  },
  dias: {
    label: 'Días de estada', xLabel: 'Días', fmt: v => GRD.num(v, 1),
    get: r => r.dias, inst: (rows, s) => s.em, instHint: 'Estancia media observada',
    ref: (rows, s) => s.emEsp != null ? { value: s.emEsp, label: 'EM esperada' } : null, goodIfLow: true, bench: () => null,
    benchHint: 'Ingrese la estancia media y DE de su referencia.',
    aboveLabel: 'egresos sobre la estancia media esperada'
  }
};

function getBench(key) {
  const saved = state.distBench[key];
  if (saved && saved.mean != null && saved.sd != null) return saved;
  return METRICS[key].bench();
}
function setInput(id, v) { if (document.activeElement !== $(id)) $(id).value = v ?? ''; }

function renderDistribucion() {
  const key = $('d-var').value, M = METRICS[key];
  const rows = filtered();
  const s = GRD.resumen(rows);
  const items = rows.map(r => ({ r, v: M.get(r) })).filter(o => o.v != null && isFinite(o.v));
  const values = items.map(o => o.v);
  const instVal = M.inst(rows, s);
  const ref = M.ref ? M.ref(rows, s) : null;
  const bench = getBench(key);
  const benchOn = $('d-bench-on').checked && bench && bench.sd > 0;
  const fmt = M.fmt, fs = M.short;

  const tipoRef = M.fmt === GRD.clp ? 'money' : 'decimal';
  setInput('d-bmean', bench ? fmtIn(bench.mean, tipoRef) : '');
  setInput('d-bsd', bench ? fmtIn(bench.sd, tipoRef) : '');
  $('d-bench-hint').textContent = M.benchHint;
  $('d-title').textContent = 'Curva de distribución · ' + M.label;

  // slider "evaluar un valor"
  const ev = $('d-eval');
  if (values.length) {
    const mn = Math.min(...values), mx = Math.max(...values);
    ev.min = mn; ev.max = mx; ev.step = (mx - mn) / 400 || 1;
    if (dist.evalValue == null && document.activeElement !== ev) ev.value = instVal ?? mn;
  }
  const st = Charts.distribution($('chart-dist'), values, {
    fmt, fmtShort: fs, xLabel: M.xLabel,
    bins: +$('d-bins').value, showKde: $('d-kde').checked, showBands: $('d-bands').checked,
    refLine: ref, bench: benchOn ? bench : null,
    inst: instVal != null ? { value: instVal, label: 'Institución' } : null,
    evalValue: dist.evalValue,
    selectedBin: dist.sel ? dist.sel.idx : null,
    onBinClick: (lo, hi, idx, last) => { dist.sel = { lo, hi, idx, last }; renderDistribucion(); $('d-bin-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });

  if (!st) {
    $('d-kpis').innerHTML = ''; $('d-strip').innerHTML = ''; $('d-bin-card').hidden = true;
    $('d-eval-val').textContent = '—';
    Charts.boxplots($('chart-box'), [], {});
    return;
  }

  // valor evaluado
  if (dist.evalValue != null) {
    const pI = Math.round(Charts.ecdf(st.sorted, dist.evalValue) * 100);
    const pB = benchOn ? ' · P' + Math.round(Charts.normCdf(dist.evalValue, bench.mean, bench.sd) * 100) + ' ref.' : '';
    $('d-eval-val').textContent = `${fmt(dist.evalValue)} → P${pI} inst.${pB}`;
  } else $('d-eval-val').textContent = 'mueva el control';

  // KPIs de posición
  const pctInst = instVal != null ? Math.round(Charts.ecdf(st.sorted, instVal) * 100) : null;
  const pctBench = benchOn && instVal != null ? Math.round(Charts.normCdf(instVal, bench.mean, bench.sd) * 100) : null;
  const above = ref ? values.filter(v => v > ref.value).length : null;
  const cv = st.mean ? st.sd / Math.abs(st.mean) : null;
  $('d-kpis').innerHTML = [
    kpi('Valor institucional', fmt(instVal), M.instHint, 'highlight'),
    kpi('Percentil vs. referencia', pctBench != null ? 'P' + pctBench : '—', benchOn ? `Referencia: media ${fmt(bench.mean)}, DE ${fmt(bench.sd)}` : 'Active la curva de referencia'),
    kpi('Percentil interno', pctInst != null ? 'P' + pctInst : '—', 'Posición del valor institucional entre sus egresos'),
    kpi('Mediana (P50)', fmt(st.p50), `Media ${fmt(st.mean)}`),
    kpi('Rango intercuartil', `${fs ? fs(st.p25) : fmt(st.p25)} – ${fs ? fs(st.p75) : fmt(st.p75)}`, `P10–P90: ${fs ? fs(st.p10) : fmt(st.p10)} – ${fs ? fs(st.p90) : fmt(st.p90)}`),
    kpi('Dispersión (CV)', GRD.pct(cv), `DE ${fmt(st.sd)} · n = ${st.n}`),
    ...(ref && M.aboveLabel ? [kpi('Sobre la línea de referencia', GRD.pct(above / st.n), `${above} ${M.aboveLabel}`)] : [])
  ].join('');

  renderStrip(M, instVal, st, benchOn ? bench : null);

  // detalle de la barra seleccionada
  if (dist.sel) {
    const { lo, hi, last } = dist.sel;
    const sel = items.filter(o => o.v >= lo && (o.v < hi || (last && o.v <= hi + 1e-9)))
      .map(o => ({ ...o.r, _v: o.v }));
    $('d-bin-card').hidden = false;
    $('d-bin-title').textContent = `Egresos con ${M.label.toLowerCase()} entre ${fmt(lo)} y ${fmt(hi)} (${sel.length})`;
    const draw = () => renderTable($('d-bin-tbl'), [
      { key: 'id', label: 'ID' }, { key: 'grd', label: 'GRD' },
      { key: 'descripcion', label: 'Descripción', fmt: v => v.length > 45 ? v.slice(0, 44) + '…' : v },
      { key: 'servicio', label: 'Servicio' },
      { key: 'dias', label: 'Días', num: true },
      { key: 'peso', label: 'Peso', num: true, fmt: v => GRD.num(v, 4) },
      { key: 'costo', label: 'Costo', num: true, fmt: GRD.clp },
      { key: 'pago', label: 'Pago', num: true, fmt: GRD.clp },
      { key: 'resultado', label: 'Resultado', num: true, html: r => signed(r.resultado) },
      { key: '_v', label: M.label, num: true, fmt: v => fmt(v) }
    ], sel, draw);
    draw();
  } else $('d-bin-card').hidden = true;

  // box-plots
  const gk = $('d-group').value;
  const keyFn = { cdm: r => r.cdm, sev: r => r.sev, servicio: r => r.servicio, grd: r => r.grd, estancia: r => r.estancia }[gk];
  const labelFn = {
    cdm: cdmLabel, sev: k => `Sev. ${k} · ${SEVERIDAD_NOMBRES[k] || '?'}`, servicio: k => k,
    grd: k => `${k} ${catMap.get(k)?.descripcion || ''}`, estancia: k => ESTANCIA_NOMBRES[k] || k
  }[gk];
  const groups = Object.entries(groupBy(items, o => keyFn(o.r) || '—'))
    .map(([k, os]) => ({ key: k, label: labelFn(k), values: os.map(o => o.v) }))
    .sort((a, b) => gk === 'grd' ? b.values.length - a.values.length : String(a.key).localeCompare(String(b.key)))
    .slice(0, 25);
  const filterMap = { cdm: 'f-cdm', sev: 'f-sev', servicio: 'f-serv', estancia: 'f-out' };
  Charts.boxplots($('chart-box'), groups, {
    fmt, fmtShort: fs, refLine: ref, inst: instVal != null ? { value: instVal } : null, goodIfLow: M.goodIfLow,
    onClick: filterMap[gk] ? k => { const sel = $(filterMap[gk]); sel.value = k; if (sel.value === k) onFilterChange(); } : null
  });
}

function renderStrip(M, instVal, st, bench) {
  const box = $('d-strip');
  if (instVal == null) { box.innerHTML = ''; return; }
  const fmt = M.fmt;
  let cuts, lo, hi, source, pct;
  if (bench) {
    cuts = [-1.2816, -0.6745, 0.6745, 1.2816].map(z => bench.mean + z * bench.sd);
    lo = bench.mean - 3 * bench.sd; hi = bench.mean + 3 * bench.sd;
    source = 'la curva de referencia';
    pct = Math.round(Charts.normCdf(instVal, bench.mean, bench.sd) * 100);
  } else {
    cuts = [st.p10, st.p25, st.p75, st.p90]; lo = st.min; hi = st.max;
    source = 'la distribución de sus propios egresos';
    pct = Math.round(Charts.ecdf(st.sorted, instVal) * 100);
  }
  lo = Math.min(lo, instVal); hi = Math.max(hi, instVal);
  const bounds = [lo, ...cuts, hi];
  const names = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
  const ranges = ['< P10', 'P10–P25', 'P25–P75', 'P75–P90', '> P90'];
  const good = ['#1f7a4a', '#63a97f', '#9a9aa2', '#e0707c', '#c21a2b'];
  const colors = M.goodIfLow === true ? good : M.goodIfLow === false ? [...good].reverse() : ['#5b6fa8', '#8394c4', '#9a9aa2', '#8394c4', '#5b6fa8'];
  const zone = cuts.filter(c => instVal >= c).length;
  const span = hi - lo || 1;
  const segs = names.map((n, i) => {
    const w = Math.max(0, (bounds[i + 1] - bounds[i]) / span * 100);
    return `<div class="seg" style="width:${w}%;background:${colors[i]}" title="${n} (${ranges[i]}): ${fmt(bounds[i])} – ${fmt(bounds[i + 1])}">${w > 9 ? n : ''}</div>`;
  }).join('');
  const left = Math.min(100, Math.max(0, (instVal - lo) / span * 100));
  const interp = M.goodIfLow == null ? '' :
    (M.goodIfLow ? zone <= 1 : zone >= 3) ? ' Posición <b class="pos">favorable</b>.' :
    (M.goodIfLow ? zone >= 3 : zone <= 1) ? ' Posición <b class="neg">desfavorable</b>: revisar GRD y servicios en los extremos.' : ' Posición dentro del rango esperado.';
  box.innerHTML = `
    <div class="bar">${segs}<div class="marker" style="left:${left}%"><span>Institución</span></div></div>
    <div class="scale"><span>${fmt(lo)}</span><span>${fmt(hi)}</span></div>
    <div class="verdict">La institución (<b>${fmt(instVal)}</b>) se ubica en el rango <b>${names[zone]} (${ranges[zone]})</b> respecto de ${source} — percentil <b>P${pct}</b>.${interp}</div>`;
}

// ================= EGRESOS =================
function renderEgresos() {
  const q = $('search').value.trim().toLowerCase();
  const rows = computeAll().filter(r => !q ||
    [r.id, r.grd, r.descripcion, r.servicio].some(v => String(v || '').toLowerCase().includes(q)));
  $('n-egresos').textContent = state.egresos.length;
  const draw = () => renderTable($('tbl-egresos'), [
    { key: 'id', label: 'ID' },
    { key: 'fecha', label: 'Egreso' },
    { key: 'grd', label: 'GRD' },
    { key: 'descripcion', label: 'Descripción', fmt: v => v.length > 42 ? v.slice(0, 41) + '…' : v },
    { key: 'sev', label: 'Sev.' },
    { key: 'servicio', label: 'Servicio' },
    { key: 'dias', label: 'Días', num: true },
    { key: 'emNorma', label: 'EM norma', num: true, fmt: v => GRD.num(v, 1) },
    { key: 'estancia', label: 'Estancia', html: r => tagEstancia(r.estancia) },
    { key: 'peso', label: 'Peso', num: true, fmt: v => GRD.num(v, 4) },
    { key: 'pago', label: 'Pago GRD', num: true, fmt: GRD.clp },
    { key: 'costo', label: 'Costo', num: true, fmt: GRD.clp },
    { key: 'resultado', label: 'Resultado', num: true, html: r => signed(r.resultado) },
    { key: 'recuperacion', label: '% recup.', num: true, fmt: GRD.pct },
    { key: '_acc', label: '', html: r => `<button class="btn ghost sm" data-edit="${esc(r.id)}">Editar</button> <button class="btn danger sm" data-del="${esc(r.id)}">✕</button>` }
  ], rows, draw);
  draw();
  previewEgreso();
}

function formEgreso() {
  return {
    id: $('e-id').value.trim(), fecha: $('e-fecha').value, grd: $('e-grd').value.trim(),
    servicio: $('e-serv').value.trim(), dias: numIn('e-dias', 'int'),
    costo: numIn('e-costo', 'money'), peso: numIn('e-peso', 'decimal')
  };
}
function previewEgreso() {
  const e = formEgreso();
  if (!e.grd) { $('e-preview').innerHTML = ''; return; }
  const cat = catMap.get(e.grd);
  const r = GRD.calcular(e, cat, state.params);
  if (!cat && e.peso == null) { $('e-preview').innerHTML = `<span class="neg">GRD ${esc(e.grd)} no está en el catálogo. Ingrese el peso manualmente o agréguelo al catálogo.</span>`; return; }
  $('e-preview').innerHTML = `${esc(r.descripcion)} · ${r.valido ? `CDM ${r.cdm} · ${r.tipo} · severidad ${r.sev}` : 'código no estándar'}<br>
    Pago = ${GRD.clp(state.params.precioBase)} × ${GRD.num(r.peso, 4)} = <b>${GRD.clp(r.pagoBase)}</b>
    ${r.adicional ? ` + adicional outlier ${GRD.clp(r.adicional)}` : ''}${r.ajusteInf ? ` ${GRD.clp(r.ajusteInf)} ajuste outlier inf.` : ''}
    ${cat && e.dias != null ? ` · ${tagEstancia(r.estancia)} (PCI ${cat.pci} / PCS ${cat.pcs})` : ''}
    ${r.resultado != null ? ` · Resultado ${signed(r.resultado)}` : ''}`;
}

function importEgresos(text) {
  const recs = GRD.parseCSV(text);
  let n = 0;
  const idx = new Map(state.egresos.map((e, i) => [e.id, i]));
  recs.forEach((o, i) => {
    const grd = pick(o, ['grd', 'ir_grd', 'codigo_grd', 'codigo', 'irgrd']);
    if (!grd) return;
    const e = {
      id: pick(o, ['id', 'episodio', 'id_episodio', 'n_egreso']) || 'IMP-' + (Date.now() % 100000) + '-' + i,
      fecha: normFecha(pick(o, ['fecha_egreso', 'fecha', 'egreso'])),
      grd: String(grd).padStart(6, '0'),
      servicio: pick(o, ['servicio', 'servicio_egreso', 'unidad']) || '',
      dias: GRD.parseNumber(pick(o, ['dias_estada', 'dias', 'estancia', 'estada', 'los'])),
      costo: GRD.parseNumber(pick(o, ['costo', 'costo_total', 'costo_total_asignado']), 'money'),
      peso: GRD.parseNumber(pick(o, ['peso', 'peso_grd', 'peso_relativo']))
    };
    if (idx.has(e.id)) state.egresos[idx.get(e.id)] = e;
    else { idx.set(e.id, state.egresos.length); state.egresos.push(e); }
    n++;
  });
  save(); render();
  toast(`${n} egresos importados`);
}
function normFecha(s) {
  if (!s) return '';
  const m = String(s).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : String(s).slice(0, 10);
}

// ================= SIMULADOR =================
function renderSim() {
  const pb = numIn('s-pb', 'money') || 0;
  const peso = numIn('s-peso', 'decimal') || 0;
  const costo = numIn('s-costo', 'money');
  const dias = numIn('s-dias', 'int');
  const cat = catMap.get($('s-grd').value.trim());
  const params = { ...state.params, precioBase: pb, ajustes: $('s-ajustes').checked };
  const r = GRD.calcular({ grd: $('s-grd').value.trim(), dias, costo, peso }, cat, params);
  const rows = [
    ['Precio base pactado', GRD.clp(pb)],
    ['Peso del episodio', GRD.num(peso, 4)],
    ['Pago base (PB × peso)', GRD.clp(r.pagoBase)],
    ...(r.adicional ? [[`Adicional outlier superior (${r.diasAdicionales} días)`, GRD.clp(r.adicional)]] : []),
    ...(r.ajusteInf ? [['Ajuste outlier inferior', GRD.clp(r.ajusteInf)]] : []),
    ['Pago total', `<b>${GRD.clp(r.pago)}</b>`],
    ['Costo total asignado', GRD.clp(costo)],
    ['Resultado del episodio', `<b>${signed(r.resultado)}</b>`],
    ['% de recuperación', GRD.pct(r.recuperacion)],
    ['Costo por unidad de peso', peso ? GRD.clp(costo / peso) : '—'],
    ...(cat && dias != null ? [['Tipo de estancia', tagEstancia(r.estancia) + ` (PCI ${cat.pci} · PCS ${cat.pcs} · P50 ${cat.p50})`]] : [])
  ];
  $('sim-result').innerHTML = `<h3>Resultado</h3>
    <div class="big">${GRD.clp(pb)} × ${GRD.num(peso, 2)} = ${GRD.clp(r.pagoBase)}</div>
    <table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;

  // sensibilidad
  if (!peso || costo == null) { $('sim-sens').innerHTML = '<p class="hint">Ingrese peso y costo.</p>'; return; }
  const deltas = [-0.2, -0.1, 0, 0.1, 0.2];
  const cell = (dp, dc) => {
    const rr = GRD.calcular({ grd: $('s-grd').value.trim(), dias, costo: costo * (1 + dc), peso }, cat, { ...params, precioBase: pb * (1 + dp) });
    return `<td class="num" style="background:${rr.resultado < 0 ? '#fde7e9' : '#e7f4ec'}">${signed(rr.resultado)}</td>`;
  };
  $('sim-sens').innerHTML = `
    <p>Precio base de equilibrio: <b>${GRD.clp(costo / peso)}</b> · Peso de equilibrio: <b>${GRD.num(costo / pb, 4)}</b> · Costo máximo sin pérdida: <b>${GRD.clp(r.pago)}</b></p>
    <div class="table-wrap"><table>
      <thead><tr><th>Costo \\ Precio base</th>${deltas.map(d => `<th class="num">${d > 0 ? '+' : ''}${d * 100}% (${GRD.clp(pb * (1 + d))})</th>`).join('')}</tr></thead>
      <tbody>${deltas.map(dc => `<tr><th>${dc > 0 ? '+' : ''}${dc * 100}% (${GRD.clp(costo * (1 + dc))})</th>${deltas.map(dp => cell(dp, dc)).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

// ================= CATÁLOGO =================
function renderCatalogo() {
  const q = $('search-cat').value.trim().toLowerCase();
  const rows = state.catalogo.filter(c => !q || c.codigo.includes(q) || c.descripcion.toLowerCase().includes(q))
    .map(c => ({ ...c, cdm: c.codigo.slice(0, 2), sev: c.codigo[5] }));
  $('n-cat').textContent = state.catalogo.length;
  const draw = () => renderTable($('tbl-cat'), [
    { key: 'codigo', label: 'Código' },
    { key: 'cdm', label: 'CDM', fmt: v => cdmLabel(v) },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'sev', label: 'Sev.' },
    { key: 'peso', label: 'Peso', num: true, fmt: v => GRD.num(v, 4) },
    { key: 'em', label: 'EM norma', num: true, fmt: v => GRD.num(v, 2) },
    { key: 'pci', label: 'PCI', num: true },
    { key: 'pcs', label: 'PCS', num: true },
    { key: 'p50', label: 'P50', num: true },
    { key: '_pago', label: 'Pago (PB × peso)', num: true, sort: r => r.peso, html: r => GRD.clp(r.peso * state.params.precioBase) },
    { key: '_acc', label: '', html: r => `<button class="btn ghost sm" data-cedit="${esc(r.codigo)}">Editar</button> <button class="btn danger sm" data-cdel="${esc(r.codigo)}">✕</button>` }
  ], rows, draw);
  draw();
}
function importCatalogo(text) {
  const recs = GRD.parseCSV(text);
  let n = 0;
  recs.forEach(o => {
    const cod = pick(o, ['codigo', 'grd', 'ir_grd', 'codigo_grd']);
    const peso = GRD.parseNumber(pick(o, ['peso', 'peso_relativo', 'peso_grd']));
    if (!cod || peso == null) return;
    const c = {
      codigo: String(cod).padStart(6, '0'),
      descripcion: pick(o, ['descripcion', 'nombre', 'glosa', 'descripcion_grd']) || '',
      peso,
      em: GRD.parseNumber(pick(o, ['em_norma', 'em', 'estancia_media', 'emn'])) ?? 0,
      pci: GRD.parseNumber(pick(o, ['pci', 'punto_corte_inferior', 'pc_inf'])) ?? 0,
      pcs: GRD.parseNumber(pick(o, ['pcs', 'punto_corte_superior', 'pc_sup'])) ?? 9999,
      p50: GRD.parseNumber(pick(o, ['p50', 'percentil_50', 'mediana'])) ?? 0
    };
    const i = state.catalogo.findIndex(x => x.codigo === c.codigo);
    if (i >= 0) state.catalogo[i] = c; else state.catalogo.push(c);
    n++;
  });
  rebuildCat(); save(); render();
  toast(`${n} GRD importados al catálogo`);
}

// ================= PARÁMETROS =================
function renderParams() {
  const p = state.params;
  $('p-pb').value = fmtIn(p.precioBase, 'money'); $('p-nombre').value = p.nombre; $('p-ajustes').checked = p.ajustes;
  $('p-carencia').value = p.carencia; $('p-valordia').value = p.valorDia; $('p-diafijo').value = fmtIn(p.diaFijo, 'money');
  $('p-factordia').value = fmtIn(p.factorDia); $('p-factorinf').value = fmtIn(p.factorInf);
}

// ================= eventos =================
function onFilterChange() { dist.sel = null; render(); }

function bind() {
  $('tabs').addEventListener('click', e => { if (e.target.dataset.tab) setTab(e.target.dataset.tab); });
  ['f-cdm', 'f-sev', 'f-serv', 'f-out', 'f-desde', 'f-hasta'].forEach(id => $(id).addEventListener('change', onFilterChange));
  $('f-clear').onclick = () => { ['f-cdm', 'f-sev', 'f-serv', 'f-out', 'f-desde', 'f-hasta'].forEach(id => $(id).value = ''); onFilterChange(); };

  // distribución
  $('d-var').onchange = () => { dist.sel = null; dist.evalValue = null; renderDistribucion(); };
  $('d-bins').oninput = () => { $('d-bins-val').textContent = $('d-bins').value; dist.sel = null; renderDistribucion(); };
  ['d-kde', 'd-bands', 'd-bench-on', 'd-group'].forEach(id => $(id).onchange = renderDistribucion);
  const benchInput = () => {
    const tipo = METRICS[$('d-var').value].fmt === GRD.clp ? 'money' : 'decimal';
    const mean = numIn('d-bmean', tipo), sd = numIn('d-bsd', tipo);
    if (mean != null && sd != null && sd > 0) { state.distBench[$('d-var').value] = { mean, sd }; save(); renderDistribucion(); }
  };
  $('d-bmean').oninput = benchInput; $('d-bsd').oninput = benchInput;
  $('d-bdefault').onclick = () => { delete state.distBench[$('d-var').value]; save(); $('d-bmean').blur(); $('d-bsd').blur(); renderDistribucion(); };
  $('d-eval').oninput = () => { dist.evalValue = Number($('d-eval').value); renderDistribucion(); };
  $('d-bin-close').onclick = () => { dist.sel = null; renderDistribucion(); };

  // egresos
  $('form-egreso').addEventListener('input', previewEgreso);
  $('form-egreso').onsubmit = e => {
    e.preventDefault();
    const eg = formEgreso(), orig = $('e-idx').value;
    if (eg.dias == null || eg.dias < 0 || !Number.isInteger(eg.dias)) { toast('Días de estada: número entero de 0 o más'); return; }
    if (eg.costo == null || eg.costo < 0) { toast('Costo total: monto de 0 o más (ej. 5.500.000)'); return; }
    if ($('e-peso').value.trim() && !(eg.peso > 0)) { toast('Peso manual: número mayor a 0 (ej. 2,34)'); return; }
    const dup = state.egresos.findIndex(x => x.id === eg.id);
    if (dup >= 0 && eg.id !== orig) { toast('Ya existe un egreso con ese ID'); return; }
    const i = state.egresos.findIndex(x => x.id === (orig || eg.id));
    if (i >= 0) state.egresos[i] = eg; else state.egresos.push(eg);
    save(); $('form-egreso').reset(); $('e-idx').value = ''; render();
    toast('Egreso guardado');
  };
  $('e-reset').onclick = () => { $('e-idx').value = ''; setTimeout(previewEgreso); };
  $('tbl-egresos').addEventListener('click', e => {
    const ed = e.target.dataset.edit, del = e.target.dataset.del;
    if (ed) {
      const eg = state.egresos.find(x => x.id === ed);
      $('e-idx').value = eg.id; $('e-id').value = eg.id; $('e-fecha').value = eg.fecha || ''; $('e-grd').value = eg.grd;
      $('e-serv').value = eg.servicio || ''; $('e-dias').value = eg.dias ?? ''; $('e-costo').value = fmtIn(eg.costo, 'money'); $('e-peso').value = fmtIn(eg.peso);
      previewEgreso(); $('form-egreso').scrollIntoView({ behavior: 'smooth' });
    }
    if (del) { state.egresos = state.egresos.filter(x => x.id !== del); save(); render(); toast('Egreso eliminado'); }
  });
  $('search').oninput = renderEgresos;
  $('imp-egresos').onchange = e => readFile(e.target, importEgresos);
  $('exp-egresos').onclick = () => {
    const rows = computeAll();
    download('egresos_grd.csv', GRD.toCSV(
      ['id', 'fecha_egreso', 'grd', 'descripcion', 'cdm', 'severidad', 'servicio', 'dias_estada', 'em_norma', 'estancia', 'peso', 'pago_grd', 'costo', 'resultado', 'recuperacion'],
      rows.map(r => [r.id, r.fecha, r.grd, r.descripcion, r.cdm, r.sev, r.servicio, r.dias, r.emNorma, ESTANCIA_NOMBRES[r.estancia], r.peso, Math.round(r.pago ?? 0), r.costo, Math.round(r.resultado ?? 0), r.recuperacion != null ? r.recuperacion.toFixed(4) : ''])
    ), 'text/csv;charset=utf-8');
  };
  let delArmed = false;
  $('demo-egresos').onclick = () => { state.egresos = generarEgresosEjemplo(); save(); render(); toast('Datos de ejemplo cargados'); };
  $('del-egresos').onclick = () => {
    if (!delArmed) { delArmed = true; $('del-egresos').textContent = '¿Confirmar? Clic de nuevo'; setTimeout(() => { delArmed = false; $('del-egresos').textContent = 'Borrar todo'; }, 3000); return; }
    delArmed = false; $('del-egresos').textContent = 'Borrar todo';
    state.egresos = []; save(); render(); toast('Egresos eliminados');
  };

  // simulador
  $('form-sim').addEventListener('input', e => {
    if (e.target.id === 's-grd') {
      const c = catMap.get(e.target.value.trim());
      if (c) { $('s-peso').value = fmtIn(c.peso); if ($('s-dias').value === '') $('s-dias').value = Math.round(c.em); }
    }
    renderSim();
  });
  $('form-sim').addEventListener('change', renderSim);

  // catálogo
  $('form-cat').onsubmit = e => {
    e.preventDefault();
    const c = {
      codigo: $('c-cod').value.trim().padStart(6, '0'), descripcion: $('c-desc').value.trim(),
      peso: numIn('c-peso'), em: numIn('c-em'), pci: numIn('c-pci', 'int'), pcs: numIn('c-pcs', 'int'), p50: numIn('c-p50', 'int')
    };
    if (!(c.peso > 0) || !(c.em > 0)) { toast('Peso y EM deben ser números mayores a 0 (ej. 2,34)'); return; }
    if (![c.pci, c.pcs, c.p50].every(v => Number.isInteger(v) && v >= 0) || c.pcs < c.pci) { toast('PCI, PCS y P50: enteros de 0 o más, con PCS ≥ PCI'); return; }
    const i = state.catalogo.findIndex(x => x.codigo === c.codigo);
    if (i >= 0) state.catalogo[i] = c; else state.catalogo.push(c);
    rebuildCat(); save(); $('form-cat').reset(); render(); toast('GRD guardado');
  };
  $('tbl-cat').addEventListener('click', e => {
    const ed = e.target.dataset.cedit, del = e.target.dataset.cdel;
    if (ed) {
      const c = catMap.get(ed);
      $('c-cod').value = c.codigo; $('c-desc').value = c.descripcion; $('c-peso').value = fmtIn(c.peso);
      $('c-em').value = fmtIn(c.em); $('c-pci').value = c.pci; $('c-pcs').value = c.pcs; $('c-p50').value = c.p50;
      $('form-cat').scrollIntoView({ behavior: 'smooth' });
    }
    if (del) { state.catalogo = state.catalogo.filter(x => x.codigo !== del); rebuildCat(); save(); render(); }
  });
  $('search-cat').oninput = renderCatalogo;
  $('imp-cat').onchange = e => readFile(e.target, importCatalogo);
  $('exp-cat').onclick = () => download('catalogo_grd.csv',
    GRD.toCSV(['codigo', 'descripcion', 'peso', 'em_norma', 'pci', 'pcs', 'p50'],
      state.catalogo.map(c => [c.codigo, c.descripcion, String(c.peso).replace('.', ','), String(c.em).replace('.', ','), c.pci, c.pcs, c.p50])),
    'text/csv;charset=utf-8');
  $('demo-cat').onclick = () => { state.catalogo = CATALOGO_EJEMPLO.map(c => ({ ...c })); rebuildCat(); save(); render(); toast('Catálogo de ejemplo restaurado'); };

  // parámetros
  $('form-param').onsubmit = e => {
    e.preventDefault();
    state.params = {
      precioBase: numIn('p-pb', 'money') ?? DEFAULT_PARAMS.precioBase, nombre: $('p-nombre').value.trim(),
      ajustes: $('p-ajustes').checked, carencia: $('p-carencia').value, valorDia: $('p-valordia').value,
      diaFijo: numIn('p-diafijo', 'money') ?? 0, factorDia: numIn('p-factordia') ?? 1,
      factorInf: numIn('p-factorinf') ?? 1
    };
    if (!(state.params.precioBase > 0)) { state.params.precioBase = DEFAULT_PARAMS.precioBase; toast('Precio base inválido: se usó $3.000.000'); }
    renderParams();
    $('s-pb').value = fmtIn(state.params.precioBase, 'money');
    save(); toast('Parámetros guardados');
  };
  // Respaldo completo: estado principal + licitación, caso clínico y Modo alumno (sus propias claves de localStorage).
  const OTRAS = { alumno: 'grd-alumno-v1', caso: 'grd-caso-v1', licitacion: 'grd-licitacion-v1' };
  $('backup').onclick = () => {
    const r = { formato: 'respaldo-grd-v2', fecha: new Date().toISOString(), app: state };
    for (const k in OTRAS) { try { r[k] = JSON.parse(localStorage.getItem(OTRAS[k])); } catch (e) { r[k] = null; } }
    download(`respaldo_grd_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(r, null, 1), 'application/json');
  };
  $('restore').onchange = e => readFile(e.target, txt => {
    try {
      const s = JSON.parse(txt);
      const a = s.formato === 'respaldo-grd-v2' ? s.app : s;   // también acepta respaldos antiguos (sólo estado principal)
      state = { params: { ...DEFAULT_PARAMS, ...a.params }, catalogo: a.catalogo || [], egresos: a.egresos || [], distBench: a.distBench || {} };
      rebuildCat(); save();
      if (s.formato === 'respaldo-grd-v2') {
        for (const k in OTRAS) { try { if (s[k] != null) localStorage.setItem(OTRAS[k], JSON.stringify(s[k])); } catch (err) { /* sin storage */ } }
        toast('Respaldo restaurado: recargando…');
        setTimeout(() => location.reload(), 700);    // los demás módulos leen su estado al iniciar
      } else { render(); toast('Respaldo restaurado'); }
    } catch (err) { toast('Archivo de respaldo inválido'); }
  });

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 200); });
}

load();
bind();
Alumno.init();
Licitacion.init();
Caso.init();
setTab('dashboard');
