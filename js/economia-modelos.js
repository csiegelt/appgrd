/* Modelos docentes: cantidades continuas, sin calibración clínica. */
const EconomiaModelos = (() => {
  function number(v, name, min = -Infinity, max = Infinity) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw Error(`${name}: ingresa un número entre ${min} y ${max}.`);
    return v;
  }
  const pos = (v, name) => number(v, name, 0.000001, 1e12);
  function interpolate(rows, x, column) {
    if (x < rows[0][0] || x > rows.at(-1)[0]) return null;
    for (let i = 1; i < rows.length; i++) if (x <= rows[i][0]) {
      const a = rows[i - 1], b = rows[i];
      return a[column] + (b[column] - a[column]) * (x - a[0]) / (b[0] - a[0]);
    }
    return rows.at(-1)[column];
  }
  // Consecutive table rows whose prices enclose the given price (also shown in the applied formula).
  function bracket(rows, price, column) {
    for (let i = 1; i < rows.length; i++) if ((price - rows[i - 1][column]) * (price - rows[i][column]) <= 0) return [rows[i - 1], rows[i]];
    return null;
  }
  function quantity(rows, price, column) {
    const increasing = column === 2;
    if (price < Math.min(rows[0][column], rows.at(-1)[column])) return increasing ? rows[0][0] : rows.at(-1)[0];
    if (price > Math.max(rows[0][column], rows.at(-1)[column])) return increasing ? rows.at(-1)[0] : rows[0][0];
    const pair = bracket(rows, price, column);
    if (!pair) return null;
    const [a, b] = pair;
    return a[0] + (b[0] - a[0]) * (price - a[column]) / (b[column] - a[column]);
  }
  function market(s) {
    if (!Array.isArray(s.rows) || s.rows.length < 2 || s.rows.length > 40) throw Error('Usa entre 2 y 40 filas.');
    const rows = s.rows.map(r => r.map((v, i) => number(v, i ? 'Precio' : 'Cantidad', 0, 1e9)));
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] <= rows[i - 1][0]) throw Error('Ordena Q de menor a mayor, sin repetir cantidades.');
      if (rows[i][1] >= rows[i - 1][1]) throw Error('En este ejercicio la demanda debe bajar al aumentar Q.');
      if (rows[i][2] <= rows[i - 1][2]) throw Error('En este ejercicio la oferta debe subir al aumentar Q.');
    }
    number(s.demandShift, 'Desplazamiento de demanda', -1e9, 1e9);
    number(s.supplyShift, 'Desplazamiento de oferta', -1e9, 1e9);
    number(s.price, 'Precio observado', 0, 1e9);
    const moved = rows.map(([q, d, o]) => [q, d + s.demandShift, o + s.supplyShift]);
    const equilibrium = list => {
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i], gapA = a[1] - a[2], gapB = b[1] - b[2];
        if (gapA * gapB <= 0) {
          const q = a[0] + (b[0] - a[0]) * gapA / (gapA - gapB), p = interpolate(list, q, 1);
          return p >= 0 ? { q, p } : null;
        }
      }
      return null;
    };
    const qd = quantity(moved, s.price, 1), qs = quantity(moved, s.price, 2);
    const clipped = [1, 2].some(col => s.price < Math.min(moved[0][col], moved.at(-1)[col]) || s.price > Math.max(moved[0][col], moved.at(-1)[col]));
    return { rows: moved, base: rows, eq: equilibrium(moved), original: equilibrium(rows), qd, qs, gap: qd - qs, clipped };
  }
  function elasticity(s) {
    for (const k of ['p1', 'p2', 'q1', 'q2']) number(s[k], k.toUpperCase(), 0, 1e12);
    const dq = s.q1+s.q2 ? (s.q2-s.q1)/((s.q1+s.q2)/2) : null;
    const dp = s.p1+s.p2 ? (s.p2-s.p1)/((s.p1+s.p2)/2) : null;
    const e = dq===null || dp===null || (dp===0&&dq===0) ? null : dp===0 ? Infinity : dq/dp;
    const magnitude = e===null ? null : Math.abs(e);
    const kind = e===null ? 'No definida' : magnitude===Infinity ? 'Perfectamente elástica' : magnitude===0 ? 'Perfectamente inelástica' : Math.abs(magnitude-1)<1e-8 ? 'Unitaria' : magnitude<1 ? 'Inelástica' : 'Elástica';
    // Split the two revenue rectangles without overlapping gained/lost areas,
    // including when the student reverses the price change.
    const priceQuantity=s.p2>=s.p1?s.q2:s.q1, quantityPrice=Math.min(s.p1,s.p2);
    const priceEffect=(s.p2-s.p1)*priceQuantity, quantityEffect=quantityPrice*(s.q2-s.q1);
    return { dq, dp, e, magnitude, kind, revenue1:s.p1*s.q1, revenue2:s.p2*s.q2,
      priceQuantity, quantityPrice, priceEffect, quantityEffect, revenueChange:s.p2*s.q2-s.p1*s.q1 };
  }
  function linearElasticity(s) {
    pos(s.intercept,'Precio máximo'); pos(s.quantity,'Cantidad a precio cero');
    number(s.segments,'Tramos',2,20);if(!Number.isInteger(s.segments))throw Error('El número de tramos debe ser entero.');
    number(s.segment,'Tramo seleccionado',0,s.segments-1);if(!Number.isInteger(s.segment))throw Error('Selecciona un tramo entero.');
    const rows=Array.from({length:s.segments+1},(_,i)=>{
      const q=s.quantity*i/s.segments,p=s.intercept*(s.segments-i)/s.segments;
      return {q,p,revenue:p*q,point:i===0?Infinity:(s.segments-i)/i};
    });
    rows.forEach((row,i)=>{row.arc=i===s.segments?null:elasticity({p1:row.p,q1:row.q,p2:rows[i+1].p,q2:rows[i+1].q});});
    return {rows,selected:rows[s.segment].arc,maximumRevenue:s.intercept*s.quantity/4,unit:{q:s.quantity/2,p:s.intercept/2},slope:-s.intercept/s.quantity};
  }
  function elasticityShift(s) {
    pos(s.p0,'Precio inicial');pos(s.q0,'Cantidad inicial');
    number(s.ed,'Elasticidad de demanda inicial',0.01,10);number(s.es,'Elasticidad de oferta inicial',0.01,10);
    number(s.shift,'Desplazamiento horizontal (%)',-90,90);
    const delta=s.q0*s.shift/100,demandSlope=s.ed*s.q0/s.p0,supplySlope=s.es*s.q0/s.p0;
    const p=s.p0-delta/(demandSlope+supplySlope),q=s.q0-demandSlope*(p-s.p0);
    if(p<=0||q<=0)throw Error('Este cambio sale del tramo con precio y cantidad positivos. Reduce el desplazamiento o aumenta las elasticidades.');
    return {p,q,delta,demandSlope,supplySlope,revenue0:s.p0*s.q0,revenue:p*q,
      demand:quantity=>s.p0+(s.q0-quantity)/demandSlope,
      supply:quantity=>s.p0+(quantity-s.q0)/supplySlope,
      shifted:quantity=>s.p0+(quantity-s.q0-delta)/supplySlope};
  }
  function costs(s) {
    for (const k of ['qa', 'qb']) pos(s[k], 'Cantidad ' + k);
    let total, marginal;
    if (s.mode === 'long') {
      pos(s.c0, 'Costo de referencia'); pos(s.q0, 'Cantidad de referencia'); number(s.alpha, 'α', 0.2, 2);
      total = q => s.c0 * (q / s.q0) ** s.alpha;
      marginal = q => s.alpha * total(q) / q;
    } else {
      for (const k of ['fixed', 'variable', 'congestion']) number(s[k], k, 0, 1e12);
      total = q => s.fixed + s.variable * q + s.congestion * q * q;
      marginal = q => s.variable + 2 * s.congestion * q;
    }
    const average = q => total(q) / q, a = { q: s.qa, total: total(s.qa), average: average(s.qa) }, b = { q: s.qb, total: total(s.qb), average: average(s.qb) };
    return { total, average, marginal, a, b, change: a.average ? (b.average / a.average - 1) * 100 : null };
  }
  function monopoly(s) {
    pos(s.a, 'Intercepto de demanda'); pos(s.b, 'Pendiente de demanda'); number(s.c, 'Costo marginal inicial', 0, 1e9); number(s.d, 'Pendiente del costo marginal', 0, 1e6);
    const qc = Math.max(0, (s.a - s.c) / (s.b + s.d)), qm = Math.max(0, (s.a - s.c) / (2 * s.b + s.d));
    const pc = s.a - s.b * qc, pm = s.a - s.b * qm;
    const consumer = 0.5 * (s.a - pm) * qm;
    const producer = (pm - s.c) * qm - 0.5 * s.d * qm * qm;
    const consumerCompetitive = 0.5 * (s.a - pc) * qc;
    const producerCompetitive = 0.5 * s.d * qc * qc;
    return { qc, qm, pc, pm, consumer, producer, consumerCompetitive, producerCompetitive,
      consumerLoss: consumerCompetitive - consumer, producerGain: producer - producerCompetitive,
      dwl: 0.5 * (qc - qm) * Math.max(0, pm - (s.c + s.d * qm)), trade: s.a > s.c };
  }
  function insurance(s) {
    pos(s.price, 'Precio'); pos(s.intercept, 'Demanda a precio cero'); number(s.slope, 'Sensibilidad', 0, 1e6); number(s.copay, 'Copago', 0, 100);
    const patientPrice = s.price * s.copay / 100, q = Math.max(0, s.intercept - s.slope * patientPrice), without = Math.max(0, s.intercept - s.slope * s.price);
    return { patientPrice, q, without, patient: q * patientPrice, insurer: q * (s.price - patientPrice), total: q * s.price };
  }
  function grossman(s) {
    number(s.initial, 'Salud inicial', 0, 10000); number(s.delta, 'Depreciación', 0, 100); number(s.investment, 'Inversión por período', 0, 10000);
    number(s.years, 'Períodos', 1, 50); if (!Number.isInteger(s.years)) throw Error('Los períodos deben ser enteros.');
    const rows = [[0, s.initial, s.initial]];
    for (let t = 1; t <= s.years; t++) rows.push([t, rows[t - 1][1] * (1 - s.delta / 100) + s.investment, rows[t - 1][2] * (1 - s.delta / 100)]);
    return rows;
  }
  return { number, interpolate, bracket, market, elasticity, linearElasticity, elasticityShift, costs, monopoly, insurance, grossman };
})();
