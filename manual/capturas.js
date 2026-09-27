// Genera las capturas del manual (manual/img) con los datos de ejemplo de la aplicación.
// Requisitos: Node.js y Google Chrome.  Uso (desde la carpeta del proyecto):
//   npm install puppeteer-core
//   node manual/capturas.js
// Si Chrome está en otra ruta: CHROME_PATH="C:/ruta/chrome.exe" node manual/capturas.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'img');
const APP = 'file:///' + path.resolve(__dirname, '..', 'index.html').split(path.sep).join('/');
const PROFILE = path.join(__dirname, 'perfil-' + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hechos = [];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, userDataDir: PROFILE,
    args: ['--allow-file-access-from-files', '--disable-gpu', '--lang=es-CL'],
    defaultViewport: { width: 1280, height: 7000, deviceScaleFactor: 1.25 }
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('MARK')) console.log('CONSOLE', m.text()); });
  await page.goto(APP, { waitUntil: 'load' });
  await sleep(500);
  await page.addStyleTag({ content: `
    #toast { display: none !important; }
    .topbar { position: static !important; }
    .mk { position: absolute; z-index: 9999; width: 28px; height: 28px; border-radius: 50%; background: #ffb400; color: #1d1d1f;
          font: 800 15px/24px "Segoe UI", Arial, sans-serif; text-align: center; border: 2px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,.45); }
    .mk-out { outline: 3px solid #ffb400 !important; outline-offset: 2px; }` });

  // ---------- utilidades en la página ----------
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  // Resuelve "sel", "sel@i" (i-ésimo), "card:sel" (tarjeta que lo contiene), "grid:sel" (grilla que lo contiene)
  const RESOLVER = `
    window.__res = function (spec) {
      let pre = null, s = spec;
      const m = s.match(/^(card|grid|label):(.*)$/); if (m) { pre = m[1]; s = m[2]; }
      let idx = 0; const k = s.lastIndexOf('@'); if (k > 0 && /^\\d+$/.test(s.slice(k + 1))) { idx = +s.slice(k + 1); s = s.slice(0, k); }
      let el = document.querySelectorAll(s)[idx];
      if (!el) return null;
      if (pre === 'card') el = el.closest('.card') || el;
      if (pre === 'grid') el = el.closest('.grid2') || el;
      if (pre === 'label') el = el.closest('label') || el;
      return el;
    };`;
  await page.addScriptTag({ content: RESOLVER });

  async function marcar(lista) {
    await ev(lista => {
      document.querySelectorAll('.mk').forEach(e => e.remove());
      document.querySelectorAll('.mk-out').forEach(e => e.classList.remove('mk-out'));
      lista.forEach(({ s, n, p = 'tl', o = true }) => {
        const el = window.__res(s);
        if (!el) { console.log('MARK no encontrado: ' + s); return; }
        if (o) el.classList.add('mk-out');
        const r = el.getBoundingClientRect();
        const b = document.createElement('div');
        b.className = 'mk'; b.textContent = 'ABCDEFGHIJKL'[n - 1];
        const x = p === 'tr' ? r.right - 16 : p === 'l' ? r.left - 34 : p === 'r' ? r.right + 6 : r.left - 12;
        const y = p === 'l' || p === 'r' ? r.top + r.height / 2 - 14 : r.top - 14;
        b.style.left = Math.max(2, x + scrollX) + 'px';
        b.style.top = Math.max(2, y + scrollY) + 'px';
        document.body.appendChild(b);
      });
    }, lista);
  }
  const limpiarMarcas = () => marcar([]);

  async function captura(nombre, specs, { pad = 10, maxH = null, incluirTip = false } = {}) {
    await ev(() => window.scrollTo(0, 0));
    const r = await ev((specs, incluirTip) => {
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
      const els = specs.map(s => window.__res(s)).filter(Boolean);
      if (incluirTip) { const t = document.querySelector('.chart-tip'); if (t && t.style.display === 'block') els.push(t); }
      document.querySelectorAll('.mk').forEach(m => els.push(m));
      els.forEach(el => { const b = el.getBoundingClientRect(); if (!b.width) return; x1 = Math.min(x1, b.left); y1 = Math.min(y1, b.top); x2 = Math.max(x2, b.right); y2 = Math.max(y2, b.bottom); });
      return { x1, y1, x2, y2 };
    }, specs, incluirTip);
    if (r.x1 > 1e8) { console.log('SIN ELEMENTOS', nombre, specs); return; }
    const x = Math.max(0, r.x1 - pad), y = Math.max(0, r.y1 - pad);
    let h = r.y2 - r.y1 + 2 * pad; if (maxH) h = Math.min(h, maxH);
    const clip = { x, y, width: Math.min(1280, r.x2 + pad) - x, height: h };
    await page.screenshot({ path: `${OUT}/${nombre}.webp`, type: 'webp', quality: 88, clip });
    hechos.push(nombre);
    console.log('OK', nombre, Math.round(clip.width) + 'x' + Math.round(clip.height));
  }
  const tab = async t => { await ev(t => setTab(t), t); await sleep(250); };
  const setv = (sel, v) => ev((sel, v) => {
    const el = document.querySelector(sel);
    el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, sel, v);
  const click = sel => ev(sel => window.__res(sel).click(), sel);
  // mueve el mouse al centro (o a una fracción) de un elemento
  async function hover(spec, fx = 0.5, fy = 0.5) {
    const b = await ev((spec, fx, fy) => { const el = window.__res(spec); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width * fx, y: r.top + r.height * fy }; }, spec, fx, fy);
    if (b) await page.mouse.move(b.x, b.y, { steps: 3 });
    await sleep(150);
  }
  const salirHover = async () => { await page.mouse.move(2, 6900); await sleep(80); };

  // =====================================================================
  // 1. INICIO Y RESUMEN
  // =====================================================================
  await tab('dashboard');
  await marcar([{ s: '.brand h1', n: 1 }, { s: '#tabs', n: 2 }, { s: '#filters', n: 3 }, { s: '#kpis', n: 4 }]);
  await captura('01-inicio', ['.topbar', '#filters', '#kpis']);

  await setv('#f-cdm', '04'); await sleep(300);
  await marcar([{ s: '#f-cdm', n: 1, p: 'tr' }, { s: '#f-sev', n: 2, p: 'tr' }, { s: '#f-desde', n: 3, p: 'tr' }, { s: '#f-clear', n: 4, p: 'tr' }, { s: '#f-count', n: 5, p: 'tr' }]);
  await captura('02-filtros', ['#filters']);
  await click('#f-clear'); await sleep(300);

  await marcar([{ s: '#kpis .kpi@1', n: 1 }, { s: '#kpis .kpi@4', n: 2 }, { s: '#kpis .kpi@5', n: 3 }, { s: '#kpis .kpi@7', n: 4 }, { s: '#kpis .kpi@9', n: 5 }]);
  await captura('03-resumen-kpis', ['#kpis']);

  await limpiarMarcas();
  // tooltip sobre un egreso con pérdida
  const pt = await ev(() => {
    const cs = [...document.querySelectorAll('#chart-scatter circle')].filter(c => c.getAttribute('fill') === '#c21a2b');
    const c = cs.sort((a, b) => +b.getAttribute('cy') - +a.getAttribute('cy'))[Math.floor(cs.length / 2)];
    const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(pt.x, pt.y, { steps: 3 }); await sleep(200);
  await marcar([{ s: 'card:#chart-scatter', n: 1, o: false }, { s: 'card:#chart-cdm', n: 2, o: false }]);
  await captura('04-resumen-graficos', ['grid:#chart-scatter'], { incluirTip: true });
  await salirHover();

  await marcar([{ s: 'card:#tbl-sev', n: 1, o: false }, { s: 'card:#tbl-top', n: 2, o: false }]);
  await captura('05-resumen-tablas', ['grid:#tbl-sev']);

  // =====================================================================
  // 2. DISTRIBUCIÓN
  // =====================================================================
  await tab('distribucion');
  await marcar([{ s: '#d-var', n: 1, p: 'tr' }, { s: '#d-bins', n: 2, p: 'tr' }, { s: '#d-group', n: 3, p: 'tr' }, { s: '.checks', n: 4, p: 'tl' },
    { s: '#d-bmean', n: 5, p: 'tr' }, { s: '#d-bdefault', n: 6, p: 'tr' }, { s: '#d-eval', n: 7, p: 'tl' }, { s: '#d-kpis .kpi@0', n: 8 }, { s: '#d-kpis .kpi@1', n: 9 }]);
  await captura('06-dist-controles', ['card:#d-var', '#d-kpis']);

  await setv('#d-eval', '3800000'); await sleep(300);
  await limpiarMarcas();
  await hover('#chart-dist svg rect[style*="crosshair"]', 0.32, 0.55);
  await marcar([{ s: '.legend', n: 1, p: 'l', o: false }, { s: '#d-strip', n: 2, p: 'l' }]);
  await captura('07-dist-grafico', ['card:#chart-dist'], { incluirTip: true });
  await salirHover();

  // clic en la barra más alta
  const barra = await ev(() => {
    const rs = [...document.querySelectorAll('#chart-dist svg rect')].filter(r => ['#c9a3a9', '#e2001a'].includes(r.getAttribute('fill')));
    const r = rs.sort((a, b) => +b.getAttribute('height') - +a.getAttribute('height'))[0].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.bottom - 10 };
  });
  await page.mouse.move(barra.x, barra.y, { steps: 3 }); await sleep(120);
  await page.mouse.click(barra.x, barra.y); await sleep(350);
  await salirHover();
  await marcar([{ s: '#d-bin-title', n: 1, p: 'l', o: false }, { s: '#d-bin-tbl th[data-k="_v"]', n: 2, p: 'tr' }]);
  await captura('08-dist-rango', ['#d-bin-card'], { maxH: 520 });

  await limpiarMarcas();
  await setv('#d-group', 'sev'); await sleep(300);
  await hover('#chart-box svg g[style*="cursor"]@1', 0.6, 0.5);
  await captura('09-dist-boxplot', ['card:#chart-box'], { incluirTip: true });
  await salirHover();
  await setv('#d-group', 'cdm'); await ev(() => { dist.sel = null; dist.evalValue = null; });

  // =====================================================================
  // 3. EGRESOS
  // =====================================================================
  await tab('egresos');
  await setv('#e-id', 'EP-9001'); await setv('#e-fecha', '2026-09-15'); await setv('#e-grd', '184103');
  await setv('#e-serv', 'UPC'); await setv('#e-dias', '12'); await setv('#e-costo', '5.500.000'); await sleep(200);
  await marcar([{ s: '#e-grd', n: 1, p: 'tr' }, { s: '#e-dias', n: 2, p: 'tr' }, { s: '#e-costo', n: 3, p: 'tr' }, { s: '#e-peso', n: 4, p: 'tr' },
    { s: '#e-preview', n: 5, p: 'l' }, { s: '#form-egreso .btn', n: 6, p: 'tr' }]);
  await captura('10-egresos-formulario', ['card:#form-egreso']);
  await ev(() => { document.getElementById('form-egreso').reset(); previewEgreso(); });

  await click('#tbl-egresos th[data-k="resultado"]'); await sleep(250);
  await marcar([{ s: 'label:#imp-egresos', n: 1, p: 'tr' }, { s: '#exp-egresos', n: 2, p: 'tr' }, { s: '#demo-egresos', n: 3, p: 'tr' }, { s: '#del-egresos', n: 4, p: 'tr' },
    { s: '#search', n: 5, p: 'tr' }, { s: '#tbl-egresos th[data-k="resultado"]', n: 6, p: 'tr' }, { s: '#tbl-egresos [data-edit]', n: 7, p: 'l' }]);
  await captura('11-egresos-tabla', ['card:#tbl-egresos'], { maxH: 640 });

  // =====================================================================
  // 4. SIMULADOR
  // =====================================================================
  await tab('simulador');
  await setv('#s-pb', '3.000.000'); await setv('#s-grd', '184103'); await setv('#s-peso', '2,34'); await setv('#s-costo', '5.500.000'); await setv('#s-dias', '12');
  await ev(() => renderSim()); await sleep(200);
  await marcar([{ s: '#s-pb', n: 1, p: 'tr' }, { s: '#s-grd', n: 2, p: 'tr' }, { s: '#s-peso', n: 3, p: 'tr' }, { s: '#s-costo', n: 4, p: 'tr' },
    { s: 'label:#s-ajustes', n: 5, p: 'r', o: false }, { s: '#sim-result .big', n: 6, p: 'l', o: false }, { s: '#sim-sens table', n: 7, p: 'tl' }]);
  await captura('12-simulador', ['#tab-simulador > .grid2', 'card:#sim-sens']);

  // =====================================================================
  // 5. LICITACIÓN
  // =====================================================================
  await tab('licitacion');
  const cargarLic = async i => { await setv('#l-ejemplo', String(i)); await sleep(400); await ev(() => Licitacion.render()); await sleep(200); };
  await cargarLic(1);
  await marcar([{ s: '#l-ejemplo', n: 1, p: 'tr' }, { s: '.relato ol', n: 2, p: 'l', o: false }]);
  await captura('13-lic-casos', ['card:#l-ejemplo']);

  await marcar([{ s: '#l-preset', n: 1, p: 'tr' }, { s: '#l-l1', n: 2, p: 'tr' }, { s: '#l-pond', n: 3, p: 'tr' },
    { s: '#l-tbl-bases [data-k="max"]@2', n: 4, p: 'tr' }, { s: '#l-tbl-bases [data-k="oferta"]@2', n: 5, p: 'tr' }, { s: '[data-estado="2"]', n: 6, p: 'r', o: false }]);
  await captura('14-lic-bases', ['card:#l-preset']);

  await marcar([{ s: '#l-fuente', n: 1, p: 'tr' }, { s: '#l-margen', n: 2, p: 'tr' }, { s: '#l-comp', n: 3, p: 'tr' },
    { s: '[data-c="eq2"]', n: 4, p: 'tl' }, { s: '[data-usar="2"]', n: 5, p: 'tr' }]);
  await captura('15-lic-casuistica', ['card:#l-fuente']);

  await marcar([{ s: '#l-resultado .v-main', n: 1, p: 'l', o: false }, { s: '#l-resultado .kpi@3', n: 2 }, { s: '#l-resultado .kpi@4', n: 3 }, { s: '#l-resultado .kpi@5', n: 4 }]);
  await captura('16-lic-evaluacion', ['#l-resultado .veredicto', '#l-resultado .kpis']);

  await limpiarMarcas();
  await hover('#l-ch-pago svg rect[style*="crosshair"]', 0.72, 0.5);
  await captura('17-lic-curva', ['card:#l-ch-pago'], { incluirTip: true });
  await salirHover();
  await captura('18-lic-tramos', ['grid:#l-ch-tramos']);

  await cargarLic(2);
  await marcar([{ s: '[data-k="oferta"]@1', n: 1, p: 'tr' }, { s: '[data-estado="1"]', n: 2, p: 'r', o: true }]);
  await captura('19-lic-inadmisible-bases', ['#l-tbl-bases']);
  await marcar([{ s: '#l-resultado .v-main', n: 1, p: 'l', o: false }, { s: '#l-resultado .kpi@3', n: 2 }, { s: '#l-resultado .kpi@4', n: 3 }]);
  await captura('19-lic-inadmisible-evaluacion', ['#l-resultado .veredicto', '#l-resultado .kpis']);

  await cargarLic(4);
  await marcar([{ s: '#l-s-peso', n: 1, p: 'tr' }, { s: '#l-s-costo', n: 2, p: 'tr' }, { s: '#l-s-tec', n: 3, p: 'tr' }, { s: '#l-s-res', n: 4, p: 'l', o: false }, { s: '#l-tbl-tec', n: 5, p: 'tl' }]);
  await captura('20-lic-simulador-tecnologia', ['grid:#l-s-peso']);
  await limpiarMarcas();
  await captura('21-lic-guia', ['#tab-licitacion > .card.prose'], { maxH: 700 });

  // =====================================================================
  // 6. MODO ALUMNO · ANALIZAR UN CASO
  // =====================================================================
  await tab('alumno');
  await click('#a-subtabs [data-modo="caso"]'); await sleep(200);
  const cargarCaso = async i => { await setv('#k-ejemplo', String(i)); await sleep(500); await ev(() => Caso.render()); await sleep(250); };
  await cargarCaso(0);
  await marcar([{ s: '#a-subtabs', n: 1, p: 'l', o: false }, { s: '#k-ejemplo', n: 2, p: 'tr' }, { s: '#k-grd', n: 3, p: 'tr' }, { s: '#k-pb', n: 4, p: 'tr' },
    { s: '#k-dias', n: 5, p: 'tr' }, { s: 'label:#k-pbtramo', n: 6, p: 'l', o: false }, { s: '#k-c-diacama', n: 7, p: 'tr' }, { s: '#k-costo-total', n: 8, p: 'tr' },
    { s: '#k-tec', n: 9, p: 'tl' }, { s: '#k-practicar', n: 10, p: 'tr' }]);
  await captura('22-caso-formulario', ['#a-subtabs', 'card:#k-ejemplo']);

  await marcar([{ s: '#k-resultado .v-main', n: 1, p: 'l', o: false }, { s: '#k-resultado .v-formula', n: 2, p: 'l', o: false },
    { s: '#k-resultado table.caso', n: 3, p: 'tl' }, { s: '#k-resultado ol.pasos', n: 4, p: 'tl', o: false }]);
  await captura('23-caso-resultado', ['#k-resultado .veredicto', '#k-resultado > .grid2@0']);
  await limpiarMarcas();
  await captura('24-caso-pago-costo', ['card:#k-ch-comp']);

  await cargarCaso(1);
  await hover('#k-ch-dias svg rect[style*="crosshair"]', 0.5, 0.5);
  await captura('25-caso-curva-dias', ['card:#k-ch-dias'], { incluirTip: true });
  await salirHover();
  await captura('26-caso-precio-base-y-distribucion', ['#k-resultado > .grid2@1']);
  await captura('27-caso-aprendizajes', ['#k-resultado .aprendizaje']);

  await cargarCaso(5);
  await marcar([{ s: '#k-resultado .v-formula', n: 1, p: 'l', o: false }, { s: '#k-resultado table.caso tr@1', n: 2, p: 'l' }, { s: '#k-resultado table.caso tr@5', n: 3, p: 'l' }]);
  await captura('28-caso-tramo-tecnologia', ['#k-resultado .veredicto', 'card:#k-resultado table.caso']);
  await limpiarMarcas();

  // =====================================================================
  // 7. MODO ALUMNO · PRACTICAR
  // =====================================================================
  await click('#a-subtabs [data-modo="practica"]'); await sleep(200);
  await setv('#a-nombre', 'Ana Pérez (ejemplo)');
  // historial: tres ejercicios previos
  const hacer = async (codigo, fn) => {
    await setv('#a-codigo', codigo); await click('#a-cargar'); await sleep(200);
    await ev(fn); await click('#a-revisar'); await sleep(200);
  };
  await hacer('N1-12345', () => { const ej = Alumno._st().actual; ej.preguntas.forEach(p => ej.resp[p.id] = p.tipo === 'choice' ? p.resp : GRD.clp(p.resp)); });
  await hacer('N2-23456', () => { const ej = Alumno._st().actual; ej.preguntas.forEach((p, i) => ej.resp[p.id] = i === 2 ? '1,05' : p.tipo === 'choice' ? p.resp : p.tipo === 'money' ? GRD.clp(p.resp) : GRD.num(p.resp, p.tipo === 'percent' ? 1 : 2)); });
  await hacer('N4-34567', () => { const ej = Alumno._st().actual; ej.preguntas.slice(0, 4).forEach(p => ej.resp[p.id] = p.tipo === 'choice' ? p.resp : p.tipo === 'money' ? GRD.clp(p.resp) : GRD.num(p.resp, 2)); });

  // ejercicio de nivel 3 con outlier superior y días adicionales
  const semilla = await ev(() => {
    for (let s = 10000; s < 99999; s++) { const c = Alumno.generarCaso(3, s); if (c.dias - c.pcs - c.p50 >= 2 && c.dias - c.pcs - c.p50 <= 6 && c.grd[5] !== '0') return s; }
  });
  await setv('#a-codigo', `N3-${semilla}`); await click('#a-cargar'); await sleep(250);
  await ev(() => {
    const ej = Alumno._st().actual, c = ej.caso;
    ej.preguntas.forEach(p => {
      if (p.id === 'diasad') ej.resp[p.id] = String(c.dias - c.pcs);                 // error típico: olvidar la carencia
      else if (p.id === 'resultado') ej.resp[p.id] = GRD.clp(-p.resp);                 // error típico: signo invertido
      else if (p.id === 'pagototal') ej.resp[p.id] = '';                                // sin responder
      else ej.resp[p.id] = p.tipo === 'choice' ? p.resp : p.tipo === 'money' ? GRD.clp(p.resp) : String(p.resp);
    });
    ej.pistas.valordia = true;
  });
  await click('#a-revisar'); await sleep(250);
  await marcar([{ s: '#a-nombre', n: 1, p: 'tr' }, { s: '#a-nivel', n: 2, p: 'tr' }, { s: '#a-nuevo', n: 3, p: 'tr' }, { s: '#a-propio', n: 4, p: 'tr' },
    { s: '#a-codigo', n: 5, p: 'tr' }, { s: '#a-score', n: 6, p: 'tl' }]);
  await captura('29-practica-barra', ['card:#a-nombre']);

  await marcar([{ s: '#a-enunciado .caso-titulo', n: 1, p: 'l', o: false }, { s: '#a-enunciado .reglas', n: 2, p: 'tl' }, { s: '.q.ok', n: 3, p: 'tr' },
    { s: '.q-pista', n: 4, p: 'r', o: false }, { s: '.q.bad', n: 5, p: 'tr' }, { s: '#a-revisar', n: 6, p: 'tr' }, { s: '#a-ver', n: 7, p: 'tr' }, { s: '#a-feedback', n: 8, p: 'l', o: false }]);
  await captura('30-practica-ejercicio', ['#a-trabajo']);

  await limpiarMarcas();
  await click('#a-ver'); await sleep(300);
  await captura('31-practica-solucion', ['#a-solucion']);
  await marcar([{ s: '#a-exp', n: 1, p: 'tr' }, { s: '#a-hist th@6', n: 2, p: 'tr' }]);
  await captura('32-practica-historial', ['card:#a-hist']);

  await limpiarMarcas();
  await setv('#a-nivel', '4'); await click('#a-propio'); await sleep(250);
  await ev(() => {
    const filas = document.querySelectorAll('#a-propio-filas tbody tr');
    const datos = [['044101', '0,621', '5', '4,8', '1.300.000'], ['141301', '0,552', '3', '3,1', '1.500.000'], ['081101', '1,954', '8', '5,8', '6.200.000']];
    document.querySelector('#a-propio-form [data-campo="pb"]').value = '3.000.000';
    filas.forEach((tr, i) => ['grd', 'peso', 'dias', 'em', 'costo'].forEach((k, j) => tr.querySelector(`[data-campo="${k}"]`).value = datos[i][j]));
  });
  await marcar([{ s: '#a-propio-form [data-campo="pb"]', n: 1, p: 'tr' }, { s: '#a-propio-filas', n: 2, p: 'tl' }, { s: '#a-add-fila', n: 3, p: 'tr' }, { s: '#a-propio-crear', n: 4, p: 'tr' }]);
  await captura('33-practica-datos-propios', ['#a-propio-card']);
  await limpiarMarcas();
  await click('#a-propio-cerrar');

  // =====================================================================
  // 8. CATÁLOGO, PARÁMETROS, GUÍA
  // =====================================================================
  await tab('catalogo');
  await marcar([{ s: 'label:#imp-cat', n: 1, p: 'tr' }, { s: '#tab-catalogo .warn', n: 2, p: 'l', o: false }, { s: '#form-cat', n: 3, p: 'tl' }, { s: '#search-cat', n: 4, p: 'tr' }]);
  await captura('34-catalogo', ['#tab-catalogo .card'], { maxH: 760 });

  await tab('parametros');
  await marcar([{ s: '#p-pb', n: 1, p: 'tr' }, { s: 'label:#p-ajustes', n: 2, p: 'l', o: false }, { s: '#p-carencia', n: 3, p: 'tr' }, { s: '#p-valordia', n: 4, p: 'tr' },
    { s: '#form-param .btn', n: 5, p: 'tr' }, { s: '#backup', n: 6, p: 'tr' }, { s: 'label:#restore', n: 7, p: 'tr' }]);
  await captura('35-parametros', ['#tab-parametros']);

  await tab('guia');
  await limpiarMarcas();
  await captura('36-guia', ['#tab-guia .card'], { maxH: 900 });

  // móvil
  await page.setViewport({ width: 420, height: 2400, deviceScaleFactor: 2 });
  await sleep(600);
  await tab('alumno'); await click('#a-subtabs [data-modo="caso"]'); await sleep(400);
  await ev(() => Caso.render()); await sleep(300);
  await page.screenshot({ path: `${OUT}/37-movil.webp`, type: 'webp', quality: 85, clip: { x: 0, y: 0, width: 420, height: 1500 } });
  hechos.push('37-movil');

  console.log('TOTAL', hechos.length);
  await browser.close();
  fs.rmSync(PROFILE, { recursive: true, force: true });
})().catch(e => { console.error('FALLO', e); process.exit(1); });
