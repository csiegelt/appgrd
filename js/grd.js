// Motor de cálculo GRD: decodificación, clasificación de estancia, pago y resultado.

const GRD = (() => {
  const fmtCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const fmtNum = (d = 2) => new Intl.NumberFormat('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });

  const clp = v => (v == null || isNaN(v)) ? '—' : fmtCLP.format(Math.round(v));
  const num = (v, d = 2) => (v == null || isNaN(v)) ? '—' : fmtNum(d).format(v);
  const pct = v => (v == null || !isFinite(v)) ? '—' : fmtNum(1).format(v * 100) + '%';

  // Código IR-GRD: CDM(2) + tipo(1) + GRD(2) + severidad(1)
  function decodificar(codigo) {
    const c = String(codigo || '').trim();
    if (!/^\d{6}$/.test(c)) return { valido: false, cdm: '', tipo: '', sev: '' };
    const t = c[2];
    return {
      valido: true,
      cdm: c.slice(0, 2),
      tipo: t === '1' ? 'Quirúrgico' : t === '4' ? 'Médico' : 'Otro (' + t + ')',
      grd: c.slice(3, 5),
      sev: c[5]
    };
  }

  function clasificarEstancia(dias, cat) {
    if (!cat || dias == null || isNaN(dias)) return 'nd';
    if (dias > cat.pcs) return 'sup';
    if (dias < cat.pci) return 'inf';
    return 'inlier';
  }

  /**
   * Calcula el pago y resultado de un egreso.
   * @param {object} eg    egreso {grd, dias, costo, peso?}
   * @param {object} cat   fila del catálogo (o null)
   * @param {object} p     parámetros {precioBase, ajustes, carencia, valorDia, diaFijo, factorDia, factorInf}
   */
  function calcular(eg, cat, p) {
    const peso = (eg.peso != null && eg.peso !== '' && !isNaN(eg.peso)) ? Number(eg.peso) : (cat ? cat.peso : null);
    const dec = decodificar(eg.grd);
    const estancia = clasificarEstancia(eg.dias, cat);
    const r = {
      ...eg, ...dec, peso, estancia,
      descripcion: cat ? cat.descripcion : '(GRD no está en catálogo)',
      emNorma: cat ? cat.em : null,
      pagoBase: null, adicional: 0, ajusteInf: 0, pago: null, resultado: null, recuperacion: null,
      diasAdicionales: 0
    };
    if (peso == null) return r;

    r.pagoBase = p.precioBase * peso;
    r.pago = r.pagoBase;

    if (p.ajustes && cat) {
      if (estancia === 'sup') {
        const carencia = p.carencia === 'p50' ? (cat.p50 || 0) : 0;
        r.diasAdicionales = Math.max(0, eg.dias - cat.pcs - carencia);
        const valorDia = p.valorDia === 'fijo' ? p.diaFijo : (cat.em > 0 ? r.pagoBase / cat.em : 0);
        r.adicional = r.diasAdicionales * valorDia * p.factorDia;
        r.pago += r.adicional;
      } else if (estancia === 'inf') {
        r.ajusteInf = r.pagoBase * (p.factorInf - 1);
        r.pago += r.ajusteInf;
      }
    }
    if (eg.costo != null && !isNaN(eg.costo)) {
      r.resultado = r.pago - eg.costo;
      r.recuperacion = eg.costo > 0 ? r.pago / eg.costo : null;
    }
    return r;
  }

  // Indicadores agregados de un conjunto de egresos calculados.
  function resumen(rows) {
    const n = rows.length;
    const conPeso = rows.filter(r => r.peso != null);
    const sumPeso = conPeso.reduce((a, r) => a + r.peso, 0);
    const pago = rows.reduce((a, r) => a + (r.pago || 0), 0);
    const costo = rows.reduce((a, r) => a + (Number(r.costo) || 0), 0);
    const dias = rows.reduce((a, r) => a + (Number(r.dias) || 0), 0);
    const conNorma = rows.filter(r => r.emNorma != null);
    const emObs = conNorma.length ? conNorma.reduce((a, r) => a + Number(r.dias), 0) / conNorma.length : null;
    const emEsp = conNorma.length ? conNorma.reduce((a, r) => a + r.emNorma, 0) / conNorma.length : null;
    return {
      n, sumPeso, pago, costo, dias,
      resultado: pago - costo,
      icm: conPeso.length ? sumPeso / conPeso.length : null,
      em: n ? dias / n : null,
      emEsp,
      iema: emObs && emEsp ? emObs / emEsp : null,
      costoUnidadPeso: sumPeso ? costo / sumPeso : null,
      recuperacion: costo ? pago / costo : null,
      perdidas: rows.filter(r => r.resultado != null && r.resultado < 0).length,
      outSup: rows.filter(r => r.estancia === 'sup').length,
      outInf: rows.filter(r => r.estancia === 'inf').length,
      sinCatalogo: rows.filter(r => r.estancia === 'nd').length
    };
  }

  // ---- CSV ----
  function parseNumber(s) {
    if (s == null) return null;
    let t = String(s).trim().replace(/\$|\s/g, '');
    if (t === '') return null;
    // "1.234.567,89" -> 1234567.89 ; "1234.5" -> 1234.5 ; "2,34" -> 2.34
    if (t.includes(',') ) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, '');
    const v = Number(t);
    return isNaN(v) ? null : v;
  }

  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
    const rows = [];
    let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') q = false;
        else field += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    const clean = rows.filter(r => r.some(c => c.trim() !== ''));
    if (!clean.length) return [];
    const head = clean[0].map(h => h.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_'));
    return clean.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }

  function toCSV(headers, rows) {
    const esc = v => {
      const s = v == null ? '' : String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '﻿' + [headers.join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\r\n');
  }

  return { clp, num, pct, decodificar, clasificarEstancia, calcular, resumen, parseCSV, parseNumber, toCSV };
})();
