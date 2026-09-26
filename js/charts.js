// Gráficos SVG interactivos sin dependencias externas.

const Charts = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const C = { red: '#e2001a', dark: '#8a0d1e', pos: '#1f7a4a', neg: '#c21a2b', blue: '#2c4fa8', gray: '#9a9aa2', band1: '#e2001a', ink: '#1d1d1f' };

  // ---------- utilidades ----------
  let tip;
  function tipEl() {
    if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; document.body.appendChild(tip); }
    return tip;
  }
  function showTip(html, ev) {
    const t = tipEl();
    t.innerHTML = html; t.style.display = 'block';
    const x = ev.clientX + 14, y = ev.clientY + 14;
    t.style.left = Math.min(x, innerWidth - t.offsetWidth - 8) + 'px';
    t.style.top = Math.min(y, innerHeight - t.offsetHeight - 8) + 'px';
  }
  function hideTip() { if (tip) tip.style.display = 'none'; }

  function el(name, attrs = {}, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, attrs = {}) {
    const t = el('text', { x, y, ...attrs }, parent);
    t.textContent = str;
    return t;
  }
  function svg(container, w, h) {
    container.innerHTML = '';
    const s = el('svg', { viewBox: `0 0 ${w} ${h}` });
    container.appendChild(s);
    return s;
  }
  function empty(container, msg = 'Sin datos suficientes para graficar.') {
    container.innerHTML = `<p class="hint" style="padding:40px 0;text-align:center">${msg}</p>`;
  }
  function niceTicks(min, max, count = 6) {
    if (min === max) { min -= 1; max += 1; }
    const step0 = (max - min) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }
  function short(v) {
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e6) return GRD.num(v / 1e6, a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e3) return GRD.num(v / 1e3, 0) + 'k';
    return GRD.num(v, a < 10 ? 2 : 0);
  }
  const scale = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0 || 1) * (r1 - r0);

  // ---------- estadística ----------
  function quantile(sorted, q) {
    if (!sorted.length) return null;
    const pos = (sorted.length - 1) * q, b = Math.floor(pos), r = pos - b;
    return sorted[b + 1] !== undefined ? sorted[b] + r * (sorted[b + 1] - sorted[b]) : sorted[b];
  }
  function stats(values) {
    const s = [...values].sort((a, b) => a - b);
    const n = s.length;
    const mean = s.reduce((a, v) => a + v, 0) / n;
    const sd = n > 1 ? Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)) : 0;
    return {
      n, sorted: s, mean, sd, min: s[0], max: s[n - 1],
      p10: quantile(s, .10), p25: quantile(s, .25), p50: quantile(s, .5), p75: quantile(s, .75), p90: quantile(s, .90)
    };
  }
  // Proporción de valores <= x
  function ecdf(sorted, x) {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= x) lo = mid + 1; else hi = mid; }
    return lo / sorted.length;
  }
  function erf(x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const normCdf = (x, m, sd) => 0.5 * (1 + erf((x - m) / (sd * Math.SQRT2)));
  const normPdf = (x, m, sd) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

  function axisX(s, ticks, x, y0, fmt, H) {
    const g = el('g', { class: 'axis' }, s);
    el('line', { x1: x(ticks[0]), x2: x(ticks[ticks.length - 1]), y1: y0, y2: y0 }, g);
    ticks.forEach(t => {
      el('line', { x1: x(t), x2: x(t), y1: y0, y2: y0 + 4 }, g);
      text(g, x(t), y0 + 16, fmt(t), { 'text-anchor': 'middle' });
    });
  }
  function gridY(s, ticks, y, x0, x1, fmt) {
    const g = el('g', { class: 'grid' }, s);
    const ga = el('g', { class: 'axis' }, s);
    ticks.forEach(t => {
      el('line', { x1: x0, x2: x1, y1: y(t), y2: y(t) }, g);
      text(ga, x0 - 6, y(t) + 4, fmt(t), { 'text-anchor': 'end' });
    });
  }

  // ---------- 1. Dispersión costo vs peso ----------
  function scatter(container, rows, precioBase, onPoint) {
    const pts = rows.filter(r => r.peso != null && r.costo != null);
    if (pts.length < 1) return empty(container);
    const W = 640, H = 340, m = { l: 62, r: 16, t: 14, b: 42 };
    const s = svg(container, W, H);
    const xmax = Math.max(...pts.map(r => r.peso)) * 1.08;
    const ymax = Math.max(Math.max(...pts.map(r => r.costo)), precioBase * xmax, ...pts.map(r => r.pago || 0)) * 1.05;
    const x = scale(0, xmax, m.l, W - m.r), y = scale(0, ymax, H - m.b, m.t);
    gridY(s, niceTicks(0, ymax, 5), y, m.l, W - m.r, short);
    axisX(s, niceTicks(0, xmax, 8), x, H - m.b, v => GRD.num(v, 1));
    text(s, (m.l + W - m.r) / 2, H - 6, 'Peso GRD', { 'text-anchor': 'middle', class: 'axis', fill: '#6b6b70', 'font-size': 11 });
    text(s, 14, m.t + 4, 'Costo', { fill: '#6b6b70', 'font-size': 11 });

    // zona de pérdida (sobre la línea)
    el('path', { d: `M${x(0)},${y(0)} L${x(xmax)},${y(precioBase * xmax)} L${x(xmax)},${y(ymax)} L${x(0)},${y(ymax)} Z`, fill: C.neg, opacity: .04 }, s);
    el('line', { x1: x(0), y1: y(0), x2: x(xmax), y2: y(precioBase * xmax), stroke: C.dark, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, s);
    text(s, x(xmax) - 4, y(precioBase * xmax) + 14, 'Pago = PB × peso', { 'text-anchor': 'end', fill: C.dark, 'font-size': 11, 'font-weight': 600 });

    pts.forEach(r => {
      const c = el('circle', {
        cx: x(r.peso), cy: y(r.costo), r: 4.5,
        fill: r.resultado < 0 ? C.neg : C.pos, 'fill-opacity': .55, stroke: '#fff', 'stroke-width': 1, style: 'cursor:pointer'
      }, s);
      c.addEventListener('mousemove', ev => {
        c.setAttribute('r', 7);
        showTip(`<b>${r.id}</b> · GRD ${r.grd}<br>${r.descripcion}<br>Peso ${GRD.num(r.peso, 4)} · ${r.dias} días<br>
          Costo ${GRD.clp(r.costo)}<br>Pago ${GRD.clp(r.pago)}<br>Resultado <b>${GRD.clp(r.resultado)}</b>`, ev);
      });
      c.addEventListener('mouseleave', () => { c.setAttribute('r', 4.5); hideTip(); });
      if (onPoint) c.addEventListener('click', () => { hideTip(); onPoint(r); });
    });
  }

  // ---------- 2. Barras horizontales (resultado por grupo) ----------
  function hbars(container, items, onClick) {
    // items: [{key, label, value, tip}]
    if (!items.length) return empty(container);
    const rowH = 26, m = { l: 230, r: 70, t: 10, b: 30 };
    const W = 640, H = m.t + m.b + items.length * rowH;
    const s = svg(container, W, H);
    const vmin = Math.min(0, ...items.map(i => i.value)), vmax = Math.max(0, ...items.map(i => i.value));
    const ticks = niceTicks(vmin, vmax, 5);
    const x = scale(Math.min(vmin, ticks[0]), Math.max(vmax, ticks[ticks.length - 1]), m.l, W - m.r);
    const g = el('g', { class: 'grid' }, s);
    ticks.forEach(t => el('line', { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b }, g));
    axisX(s, ticks, x, H - m.b, short);
    el('line', { x1: x(0), x2: x(0), y1: m.t, y2: H - m.b, stroke: '#888' }, s);
    items.forEach((it, i) => {
      const yy = m.t + i * rowH;
      const row = el('g', { style: onClick ? 'cursor:pointer' : '' }, s);
      el('rect', { x: 0, y: yy, width: W, height: rowH, fill: 'transparent' }, row);
      const lbl = it.label.length > 34 ? it.label.slice(0, 33) + '…' : it.label;
      text(row, m.l - 8, yy + rowH / 2 + 4, lbl, { 'text-anchor': 'end', 'font-size': 11, fill: '#333' });
      const x0 = x(Math.min(0, it.value)), w = Math.abs(x(it.value) - x(0));
      const bar = el('rect', { x: x0, y: yy + 4, width: Math.max(w, 1), height: rowH - 8, rx: 3, fill: it.value < 0 ? C.neg : C.pos, opacity: .8 }, row);
      // Etiqueta del valor: fuera de la barra, o dentro si no cabe fuera (barras negativas largas)
      const dentro = it.value < 0 ? x0 - 4 < m.l + 30 : x0 + w + 40 > W;
      text(row, dentro ? (it.value < 0 ? x0 + 4 : x0 + w - 4) : (it.value < 0 ? x0 - 4 : x0 + w + 4), yy + rowH / 2 + 4, short(it.value),
        { 'text-anchor': (it.value < 0) !== dentro ? 'end' : 'start', 'font-size': 11, fill: dentro ? '#fff' : '#555', 'font-weight': dentro ? 700 : 400 });
      row.addEventListener('mousemove', ev => { bar.setAttribute('opacity', 1); showTip(it.tip, ev); });
      row.addEventListener('mouseleave', () => { bar.setAttribute('opacity', .8); hideTip(); });
      if (onClick) row.addEventListener('click', () => { hideTip(); onClick(it.key); });
    });
  }

  // ---------- 3. Curva de distribución (histograma + densidad) ----------
  /**
   * o = { fmt, fmtShort, bins, showKde, showBands, refLine:{value,label}, bench:{mean,sd,label}|null,
   *       inst:{value,label}, evalValue, onBinClick(lo,hi,idx), selectedBin }
   */
  function distribution(container, values, o) {
    values = values.filter(v => v != null && isFinite(v));
    if (values.length < 3) return empty(container, 'Se necesitan al menos 3 egresos con datos para construir la curva.');
    const W = 800, H = 380, m = { l: 50, r: 20, t: 46, b: 44 };
    const s = svg(container, W, H);
    const st = stats(values);
    const fmt = o.fmt || (v => GRD.num(v)), fs = o.fmtShort || short;

    // dominio
    const ext = [st.min, st.max];
    if (o.refLine) ext.push(o.refLine.value);
    (o.extraLines || []).forEach(l => ext.push(l.value));
    if (o.inst) ext.push(o.inst.value);
    if (o.evalValue != null) ext.push(o.evalValue);
    if (o.bench && o.bench.sd > 0) ext.push(o.bench.mean - 2.5 * o.bench.sd, o.bench.mean + 2.5 * o.bench.sd);
    let lo = Math.min(...ext), hi = Math.max(...ext);
    const pad = (hi - lo) * 0.04 || Math.abs(hi) * 0.1 || 1;
    lo -= pad; hi += pad;

    // histograma
    const nb = Math.max(3, o.bins || 20);
    const bw = (st.max - st.min) / nb || (Math.abs(st.max) * 0.1 || 1);
    const counts = new Array(nb).fill(0);
    values.forEach(v => { counts[Math.min(nb - 1, Math.floor((v - st.min) / bw))]++; });
    const edge = i => st.min + i * bw;

    // densidad kernel (Silverman), escalada a conteos
    const iqr = st.p75 - st.p25;
    let h = 0.9 * Math.min(st.sd, iqr / 1.34 || st.sd) * Math.pow(st.n, -0.2);
    if (!(h > 0)) h = (st.max - st.min) / 10 || 1;
    const NP = 220, xs = Array.from({ length: NP }, (_, i) => lo + (hi - lo) * i / (NP - 1));
    const kde = xs.map(xv => values.reduce((a, v) => a + Math.exp(-0.5 * ((xv - v) / h) ** 2), 0) / (Math.sqrt(2 * Math.PI) * h) * bw);
    const bench = (o.bench && o.bench.sd > 0) ? xs.map(xv => st.n * bw * normPdf(xv, o.bench.mean, o.bench.sd)) : null;

    const ymax = Math.max(...counts, o.showKde ? Math.max(...kde) : 0, bench ? Math.max(...bench) : 0) * 1.12;
    const x = scale(lo, hi, m.l, W - m.r), y = scale(0, ymax, H - m.b, m.t);
    const x0 = m.l, x1 = W - m.r, yb = H - m.b;

    gridY(s, niceTicks(0, ymax, 5).filter(t => Number.isInteger(t) || ymax < 5), y, x0, x1, v => GRD.num(v, 0));
    text(s, 8, m.t - 10, 'N° egresos', { fill: '#6b6b70', 'font-size': 11 });

    // bandas de percentiles
    if (o.showBands) {
      el('rect', { x: x(st.p10), y: m.t, width: x(st.p90) - x(st.p10), height: yb - m.t, fill: C.blue, opacity: .06 }, s);
      el('rect', { x: x(st.p25), y: m.t, width: x(st.p75) - x(st.p25), height: yb - m.t, fill: C.blue, opacity: .10 }, s);
      text(s, (x(st.p25) + x(st.p75)) / 2, yb - 6, 'P25–P75', { 'text-anchor': 'middle', 'font-size': 10, fill: C.blue, opacity: .8 });
    }

    // barras
    const barEls = counts.map((c, i) => el('rect', {
      x: x(edge(i)) + 1, y: y(c), width: Math.max(1, x(edge(i + 1)) - x(edge(i)) - 2), height: yb - y(c),
      fill: i === o.selectedBin ? C.red : '#c9a3a9', rx: 2
    }, s));

    // curva de densidad
    const path = arr => arr.map((v, i) => (i ? 'L' : 'M') + x(xs[i]).toFixed(1) + ',' + y(v).toFixed(1)).join('');
    if (o.showKde) el('path', { d: path(kde), fill: 'none', stroke: C.dark, 'stroke-width': 2.5 }, s);
    if (bench) el('path', { d: path(bench), fill: 'none', stroke: C.blue, 'stroke-width': 2, 'stroke-dasharray': '7 5' }, s);

    axisX(s, niceTicks(lo, hi, 8), x, yb, fs);
    if (o.xLabel) text(s, (x0 + x1) / 2, H - 6, o.xLabel, { 'text-anchor': 'middle', fill: '#6b6b70', 'font-size': 11 });

    // líneas verticales con etiquetas escalonadas
    const marks = [];
    if (o.refLine) marks.push({ v: o.refLine.value, label: o.refLine.label, color: '#333', dash: '2 3', w: 1.5 });
    (o.extraLines || []).forEach(l => marks.push({ v: l.value, label: l.label, color: l.color || '#333', dash: l.dash ?? '2 3', w: 1.5 }));
    if (!o.hideMedian) marks.push({ v: st.p50, label: 'Mediana ' + fs(st.p50), color: C.dark, dash: '', w: 1.5 });
    if (o.inst) marks.push({ v: o.inst.value, label: o.inst.label + ' ' + fs(o.inst.value), color: C.red, dash: '', w: 3 });
    if (o.evalValue != null) marks.push({ v: o.evalValue, label: 'Evaluado ' + fs(o.evalValue), color: '#e0a800', dash: '', w: 2.5 });
    marks.sort((a, b) => a.v - b.v);
    let lastX = -1e9, level = 0;
    marks.forEach(mk => {
      const xv = x(mk.v);
      level = (xv - lastX < 110) ? (level + 1) % 3 : 0;
      lastX = xv;
      el('line', { x1: xv, x2: xv, y1: m.t - 4 + level * 13, y2: yb, stroke: mk.color, 'stroke-width': mk.w, 'stroke-dasharray': mk.dash }, s);
      const anchor = xv > x1 - 90 ? 'end' : xv < x0 + 90 ? 'start' : 'middle';
      text(s, xv, m.t - 8 + level * 13, mk.label, { 'text-anchor': anchor, 'font-size': 11, 'font-weight': 600, fill: mk.color, 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3 });
    });

    // capa interactiva: crosshair + percentil
    const cross = el('line', { y1: m.t, y2: yb, stroke: '#222', 'stroke-width': 1, opacity: 0, 'pointer-events': 'none' }, s);
    const overlay = el('rect', { x: x0, y: m.t, width: x1 - x0, height: yb - m.t, fill: 'transparent', style: 'cursor:crosshair' }, s);
    const inv = px => lo + (px - x0) / (x1 - x0) * (hi - lo);
    const toLocal = ev => {
      const pt = s.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      return pt.matrixTransform(s.getScreenCTM().inverse()).x;
    };
    let hoverBin = -1;
    overlay.addEventListener('mousemove', ev => {
      const px = toLocal(ev), v = inv(px);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('opacity', .5);
      const bi = Math.floor((v - st.min) / bw);
      const inBin = bi >= 0 && bi < nb || (v === st.max);
      if (hoverBin >= 0 && hoverBin !== o.selectedBin) barEls[hoverBin].setAttribute('fill', '#c9a3a9');
      hoverBin = inBin ? Math.min(nb - 1, bi) : -1;
      if (hoverBin >= 0 && hoverBin !== o.selectedBin) barEls[hoverBin].setAttribute('fill', '#b0707b');
      const pInst = ecdf(st.sorted, v);
      let html = `<b>${fmt(v)}</b><br>Percentil institucional: <b>P${Math.round(pInst * 100)}</b> (${Math.round(pInst * 100)}% de egresos ≤ este valor)`;
      if (o.bench && o.bench.sd > 0) html += `<br>Percentil en referencia: <b>P${Math.round(normCdf(v, o.bench.mean, o.bench.sd) * 100)}</b>`;
      if (hoverBin >= 0) html += `<br>Barra: ${fmt(edge(hoverBin))} – ${fmt(edge(hoverBin + 1))} · <b>${counts[hoverBin]}</b> egresos<br><i>Clic para ver los egresos de este rango</i>`;
      showTip(html, ev);
    });
    overlay.addEventListener('mouseleave', () => {
      cross.setAttribute('opacity', 0); hideTip();
      if (hoverBin >= 0 && hoverBin !== o.selectedBin) barEls[hoverBin].setAttribute('fill', '#c9a3a9');
      hoverBin = -1;
    });
    overlay.addEventListener('click', () => {
      if (hoverBin >= 0 && o.onBinClick) { hideTip(); o.onBinClick(edge(hoverBin), edge(hoverBin + 1), hoverBin, hoverBin === nb - 1); }
    });

    return st;
  }

  // ---------- 4. Box-plots por grupo ----------
  function boxplots(container, groups, o) {
    groups = groups.filter(g => g.values.length >= 1);
    if (!groups.length) return empty(container);
    const rowH = 30, m = { l: 230, r: 24, t: 12, b: 34 };
    const W = 800, H = m.t + m.b + groups.length * rowH;
    const s = svg(container, W, H);
    const all = groups.flatMap(g => g.values);
    const ext = [Math.min(...all), Math.max(...all)];
    if (o.refLine) ext.push(o.refLine.value);
    if (o.inst) ext.push(o.inst.value);
    let lo = Math.min(...ext), hi = Math.max(...ext);
    const pad = (hi - lo) * 0.04 || 1; lo -= pad; hi += pad;
    const x = scale(lo, hi, m.l, W - m.r);
    const ticks = niceTicks(lo, hi, 8);
    const gg = el('g', { class: 'grid' }, s);
    ticks.forEach(t => el('line', { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b }, gg));
    axisX(s, ticks, x, H - m.b, o.fmtShort || short);
    if (o.refLine) el('line', { x1: x(o.refLine.value), x2: x(o.refLine.value), y1: m.t, y2: H - m.b, stroke: '#333', 'stroke-dasharray': '2 3', 'stroke-width': 1.5 }, s);
    if (o.inst) el('line', { x1: x(o.inst.value), x2: x(o.inst.value), y1: m.t, y2: H - m.b, stroke: C.red, 'stroke-width': 2, opacity: .7 }, s);

    groups.forEach((g, i) => {
      const st = stats(g.values);
      const yy = m.t + i * rowH, cy = yy + rowH / 2;
      const iqr = st.p75 - st.p25;
      const wLo = Math.max(st.min, st.p25 - 1.5 * iqr), wHi = Math.min(st.max, st.p75 + 1.5 * iqr);
      const row = el('g', { style: o.onClick ? 'cursor:pointer' : '' }, s);
      const bg = el('rect', { x: 0, y: yy, width: W, height: rowH, fill: 'transparent' }, row);
      const lbl = g.label.length > 34 ? g.label.slice(0, 33) + '…' : g.label;
      text(row, m.l - 8, cy + 4, `${lbl} (${st.n})`, { 'text-anchor': 'end', 'font-size': 11, fill: '#333' });
      el('line', { x1: x(wLo), x2: x(wHi), y1: cy, y2: cy, stroke: '#777' }, row);
      el('line', { x1: x(wLo), x2: x(wLo), y1: cy - 6, y2: cy + 6, stroke: '#777' }, row);
      el('line', { x1: x(wHi), x2: x(wHi), y1: cy - 6, y2: cy + 6, stroke: '#777' }, row);
      const good = o.goodIfLow == null ? null : (o.goodIfLow ? st.p50 <= (o.refLine?.value ?? Infinity) : st.p50 >= (o.refLine?.value ?? -Infinity));
      el('rect', {
        x: x(st.p25), y: cy - 9, width: Math.max(2, x(st.p75) - x(st.p25)), height: 18, rx: 3,
        fill: good == null ? '#c9a3a9' : good ? '#b9dcc7' : '#f2b8bf', stroke: '#555', 'stroke-width': 1
      }, row);
      el('line', { x1: x(st.p50), x2: x(st.p50), y1: cy - 9, y2: cy + 9, stroke: '#222', 'stroke-width': 2 }, row);
      el('path', { d: `M${x(st.mean)},${cy - 5} l5,5 l-5,5 l-5,-5 z`, fill: '#fff', stroke: '#222' }, row);
      g.values.filter(v => v < wLo || v > wHi).forEach(v => el('circle', { cx: x(v), cy, r: 2.5, fill: C.neg, opacity: .7 }, row));
      const f = o.fmt || (v => GRD.num(v));
      row.addEventListener('mousemove', ev => {
        bg.setAttribute('fill', '#fdf0f1');
        showTip(`<b>${g.label}</b><br>n = ${st.n}<br>P25: ${f(st.p25)}<br>Mediana: <b>${f(st.p50)}</b><br>P75: ${f(st.p75)}<br>Media: ${f(st.mean)}<br>Mín–Máx: ${f(st.min)} – ${f(st.max)}`, ev);
      });
      row.addEventListener('mouseleave', () => { bg.setAttribute('fill', 'transparent'); hideTip(); });
      if (o.onClick) row.addEventListener('click', () => { hideTip(); o.onClick(g.key); });
    });
  }

  // ---------- 5. Líneas con zona de ganancia / pérdida ----------
  /**
   * o = { xs, series:[{name, ys, color, width, dash, hidden}], fill:[iA,iB] (verde si A ≥ B, rojo si no),
   *       vlines:[{x,label,color,dash}], markers:[{x,y,label,color}], yZero, xLabel, yLabel, fmtX, fmtY, hover(i) }
   */
  function lineas(container, o) {
    const xs = o.xs;
    if (!xs || xs.length < 2) return empty(container);
    const W = 780, H = (o.height || 340) + 22, m = { l: 64, r: 20, t: 62, b: 46 };
    const s = svg(container, W, H);
    let ymin = Infinity, ymax = -Infinity;
    const acc = v => { if (isFinite(v)) { ymin = Math.min(ymin, v); ymax = Math.max(ymax, v); } };
    o.series.forEach(se => se.ys.forEach(acc));
    (o.markers || []).forEach(mk => acc(mk.y));
    if (o.yZero) acc(0);
    const pad = (ymax - ymin) * 0.08 || Math.abs(ymax) * 0.1 || 1;
    ymin = (o.yZero && ymin === 0) ? 0 : ymin - pad; ymax += pad;
    const x0 = xs[0], x1 = xs[xs.length - 1];
    const x = scale(x0, x1, m.l, W - m.r), y = scale(ymin, ymax, H - m.b, m.t);
    const fX = o.fmtX || short, fY = o.fmtY || short;

    gridY(s, niceTicks(ymin, ymax, 5), y, m.l, W - m.r, fY);
    axisX(s, niceTicks(x0, x1, 8), x, H - m.b, fX);
    if (o.xLabel) text(s, (m.l + W - m.r) / 2, H - 8, o.xLabel, { 'text-anchor': 'middle', fill: '#6b6b70', 'font-size': 11 });
    if (o.yLabel) text(s, 8, m.t - 8, o.yLabel, { fill: '#6b6b70', 'font-size': 11 });

    // zonas entre dos series (ganancia / pérdida), cortadas exactamente en el cruce
    if (o.fill) {
      const A = o.series[o.fill[0]].ys, B = o.series[o.fill[1]].ys;
      const runs = [];
      let run = null;
      const add = (xv, a, b, sign) => {
        if (!run || run.sign !== sign) { if (run) runs.push(run); run = { sign, top: [], bot: [] }; }
        run.top.push([xv, a]); run.bot.push([xv, b]);
      };
      for (let i = 0; i < xs.length; i++) {
        const d = A[i] - B[i], sign = d >= 0 ? 1 : -1;
        if (i > 0 && run && run.sign !== sign) {
          const dp = A[i - 1] - B[i - 1], t = dp / (dp - d);
          const xc = xs[i - 1] + t * (xs[i] - xs[i - 1]), yc = A[i - 1] + t * (A[i] - A[i - 1]);
          add(xc, yc, yc, run.sign);
          runs.push(run); run = { sign, top: [[xc, yc]], bot: [[xc, yc]] };
        }
        add(xs[i], A[i], B[i], sign);
      }
      if (run) runs.push(run);
      runs.forEach(r => {
        const pts = [...r.top, ...r.bot.reverse()];
        el('path', { d: 'M' + pts.map(p => x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join('L') + 'Z', fill: r.sign > 0 ? C.pos : C.neg, opacity: .14 }, s);
      });
    }
    if (o.yZero && ymin < 0) el('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: '#777', 'stroke-width': 1.2 }, s);

    // líneas verticales de referencia con etiquetas escalonadas
    const vl = (o.vlines || []).filter(v => v.x >= x0 && v.x <= x1).sort((a, b) => a.x - b.x);
    let lastX = -1e9, level = 0;
    vl.forEach(v => {
      const xv = x(v.x);
      level = xv - lastX < 90 ? (level + 1) % 3 : 0;
      lastX = xv;
      el('line', { x1: xv, x2: xv, y1: m.t - 6 + level * 12, y2: H - m.b, stroke: v.color || '#555', 'stroke-width': v.width || 1.3, 'stroke-dasharray': v.dash ?? '4 3' }, s);
      const anchor = xv > W - m.r - 70 ? 'end' : xv < m.l + 70 ? 'start' : 'middle';
      text(s, xv, m.t - 10 + level * 12, v.label, { 'text-anchor': anchor, 'font-size': 10.5, 'font-weight': 600, fill: v.color || '#555', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3 });
    });

    // series
    o.series.forEach(se => {
      if (se.hidden) return;
      const d = se.ys.map((v, i) => (i ? 'L' : 'M') + x(xs[i]).toFixed(1) + ',' + y(v).toFixed(1)).join('');
      el('path', { d, fill: 'none', stroke: se.color, 'stroke-width': se.width || 2.5, 'stroke-dasharray': se.dash || '', 'stroke-linejoin': 'round' }, s);
    });

    // marcadores
    (o.markers || []).forEach(mk => {
      if (mk.x < x0 || mk.x > x1) return;
      el('circle', { cx: x(mk.x), cy: y(mk.y), r: 6, fill: mk.color || C.red, stroke: '#fff', 'stroke-width': 2 }, s);
      if (mk.label) text(s, x(mk.x) + (x(mk.x) > W - 160 ? -10 : 10), y(mk.y) - 8, mk.label,
        { 'text-anchor': x(mk.x) > W - 160 ? 'end' : 'start', 'font-size': 11, 'font-weight': 700, fill: mk.color || C.red, 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3 });
    });

    // leyenda (fila superior, sobre las etiquetas de las líneas verticales)
    let lx = m.l + 6;
    o.series.filter(se => !se.hidden && se.name).forEach(se => {
      el('line', { x1: lx, x2: lx + 18, y1: 10, y2: 10, stroke: se.color, 'stroke-width': 3, 'stroke-dasharray': se.dash || '' }, s);
      text(s, lx + 22, 14, se.name, { 'font-size': 11, fill: '#333' });
      lx += 30 + se.name.length * 6.2;
    });

    // interacción
    if (o.hover) {
      const cross = el('line', { y1: m.t, y2: H - m.b, stroke: '#222', opacity: 0, 'pointer-events': 'none' }, s);
      const dots = o.series.filter(se => !se.hidden).map(se => el('circle', { r: 4, fill: se.color, opacity: 0, 'pointer-events': 'none' }, s));
      const ov = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent', style: 'cursor:crosshair' }, s);
      ov.addEventListener('mousemove', ev => {
        const pt = s.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const px = pt.matrixTransform(s.getScreenCTM().inverse()).x;
        const xv = x0 + (px - m.l) / (W - m.l - m.r) * (x1 - x0);
        let i = 0, best = Infinity;
        xs.forEach((v, k) => { const dd = Math.abs(v - xv); if (dd < best) { best = dd; i = k; } });
        cross.setAttribute('x1', x(xs[i])); cross.setAttribute('x2', x(xs[i])); cross.setAttribute('opacity', .45);
        o.series.filter(se => !se.hidden).forEach((se, k) => { dots[k].setAttribute('cx', x(xs[i])); dots[k].setAttribute('cy', y(se.ys[i])); dots[k].setAttribute('opacity', 1); });
        showTip(o.hover(i), ev);
      });
      ov.addEventListener('mouseleave', () => { cross.setAttribute('opacity', 0); dots.forEach(d => d.setAttribute('opacity', 0)); hideTip(); });
    }
  }

  // ---------- 6. Pago vs costo (barras apiladas) ----------
  // o = { pago:[{name,value}], costo:[{name,value}], fmt }
  function comparacion(container, o) {
    const tot = arr => arr.reduce((a, p) => a + p.value, 0);
    const tp = tot(o.pago), tc = tot(o.costo);
    if (!(tp > 0 || tc > 0)) return empty(container);
    const W = 780, H = 330, m = { l: 64, r: 250, t: 20, b: 40 };
    const s = svg(container, W, H);
    const fmt = o.fmt || short;
    const ymax = Math.max(tp, tc) * 1.12;
    const y = scale(0, ymax, H - m.b, m.t);
    gridY(s, niceTicks(0, ymax, 5), y, m.l, W - m.r, short);
    const bw = 110, xs = [m.l + 50, m.l + 50 + bw + 70];
    const PAL_P = ['#1f7a4a', '#63a97f'];
    const PAL_C = ['#8a0d1e', '#b3263a', '#d0505f', '#e07b86', '#eba4ab', '#c9a3a9', '#f4c9cd', '#9a6b72'];
    const barra = (parts, xi, pal, titulo, total) => {
      let acc = 0;
      parts.forEach((p, k) => {
        if (!(p.value > 0)) return;
        const r = el('rect', { x: xi, y: y(acc + p.value), width: bw, height: y(acc) - y(acc + p.value), fill: pal[k % pal.length], stroke: '#fff', 'stroke-width': 1 }, s);
        r.addEventListener('mousemove', ev => showTip(`<b>${p.name}</b><br>${GRD.clp(p.value)}<br>${GRD.num(p.value / total * 100, 1)} % de ${titulo.toLowerCase()}`, ev));
        r.addEventListener('mouseleave', hideTip);
        acc += p.value;
      });
      text(s, xi + bw / 2, H - m.b + 18, titulo, { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#333' });
      text(s, xi + bw / 2, y(total) - 6, GRD.clp(total), { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#333' });
    };
    barra(o.pago, xs[0], PAL_P, 'Pago GRD', tp);
    barra(o.costo, xs[1], PAL_C, 'Costo', tc);
    el('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: '#777' }, s);

    // diferencia
    const dif = tp - tc, xb = xs[1] + bw + 16;
    const col = dif >= 0 ? C.pos : C.neg;
    el('line', { x1: xs[0] + bw, x2: xb, y1: y(tp), y2: y(tp), stroke: col, 'stroke-dasharray': '4 3' }, s);
    el('path', { d: `M${xb},${y(tp)} L${xb + 8},${y(tp)} L${xb + 8},${y(tc)} L${xb},${y(tc)}`, fill: 'none', stroke: col, 'stroke-width': 2 }, s);
    text(s, xb + 14, (y(tp) + y(tc)) / 2 + 4, (dif >= 0 ? 'Ganancia ' : 'Pérdida ') + GRD.clp(Math.abs(dif)),
      { 'font-size': 13, 'font-weight': 800, fill: col });

    // leyenda del costo
    const lx = W - m.r + 70;
    let ly = m.t + 10;
    text(s, lx, ly, 'Composición del costo', { 'font-size': 11, 'font-weight': 700, fill: '#333' });
    o.costo.filter(p => p.value > 0).forEach((p, k) => {
      ly += 18;
      el('rect', { x: lx, y: ly - 9, width: 11, height: 11, rx: 2, fill: PAL_C[k % PAL_C.length] }, s);
      const nm = p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name;
      text(s, lx + 16, ly, `${nm} · ${GRD.num(p.value / tc * 100, 0)}%`, { 'font-size': 10.5, fill: '#444' });
    });
  }

  return { scatter, hbars, distribution, boxplots, lineas, comparacion, stats, ecdf, normCdf };
})();
