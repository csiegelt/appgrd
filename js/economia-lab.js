/* Laboratorios nativos del portal. SVG + controles accesibles, sin iframes ni servicios externos. */
const EconomiaLab = (() => {
  const M = EconomiaModelos, KEY = 'grd-economia-practica-v1';
  const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f = (v, decimals = 2) => Number.isFinite(v) ? v.toLocaleString('es-CL', { maximumFractionDigits: decimals }) : '—';
  const money = v => '$' + f(v);
  const clone = v => structuredClone(v);
  const defaults = {
    tab: 'market', formulas: true, hide: false, answers: { market: [], elasticity: [], scale: [], productivity: [], monopoly: [], insurance: [], grossman: [] },
    market: { mode: 'equilibrium', name: 'Equilibrio del documento', price: 900, demandShift: 0, supplyShift: 0, baseline: true,
      rows: [[0,1800,300],[1,1500,500],[2,1200,700],[3,900,900],[4,700,1200],[5,500,1500],[6,300,1800],[7.5,0,2250]] },
    elasticity: { p1: 20000, p2: 25000, q1: 100, q2: 90 },
    scale: { mode: 'short', fixed: 1000000, variable: 5000, congestion: 0, c0: 1500000, q0: 100, alpha: 0.8, qa: 100, qb: 200 },
    productivity: { rows: [['APS y vacunación',95],['Urgencias y diagnóstico',80],['Controles y seguimiento',45],['Exámenes redundantes',-5]] },
    monopoly: { a: 1500, b: 200, c: 300, d: 200 },
    insurance: { price: 20000, intercept: 150, slope: 0.005, copay: 50 },
    grossman: { initial: 80, delta: 10, investment: 12, years: 10 }
  };
  // Only known keys of the saved schema are accepted. Invalid values receive visible model feedback.
  function merge(base, saved) {
    if (Array.isArray(base)) return Array.isArray(saved) && saved.length <= 40 ? clone(saved) : clone(base);
    if (base && typeof base === 'object') return Object.fromEntries(Object.keys(base).map(k => [k, merge(base[k], saved?.[k])]));
    return typeof saved === typeof base ? saved : base;
  }
  let s = clone(defaults), history = [], feedback = '', notice = '', expected = [], solution = '', plotMeta = null;
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved?.version === 1) s = merge(defaults, saved.data); } catch {}
  // [id, pestaña, tema del ramo, qué se practica]
  const tabs = [
    ['market','Oferta y demanda','econ-mercado','Mueve el precio para ver excesos de oferta o demanda, o desplaza las curvas.'],
    ['elasticity','Elasticidad','econ-elasticidad','Compara dos observaciones y calcula la elasticidad arco y el ingreso total.'],
    ['scale','Economías de escala','econ-escala','Compara el costo por examen de dos volúmenes, a corto y a largo plazo.'],
    ['productivity','Productividad','econ-productividad','Edita los aportes marginales del gráfico del apunte.'],
    ['monopoly','Monopolio','econ-monopolio','Compara competencia y monopolio con la misma demanda y los mismos costos.'],
    ['insurance','Seguros','econ-seguros','Cambia el copago y observa la demanda y quién financia el gasto.'],
    ['grossman','Capital de salud','econ-grossman','Simula cómo evoluciona el stock de salud con depreciación e inversión.']
  ];
  // The market data table is long; it starts folded on narrow screens.
  let dataOpen = (globalThis.innerWidth || 1280) >= 700;
  if (!tabs.some(([id]) => id === s.tab)) s.tab = 'market';
  const get = path => path.split('.').reduce((o, k) => o?.[k], s);
  function set(path, value) { const keys = path.split('.'), key = keys.pop(); keys.reduce((o,k) => o[k], s)[key] = value; }
  function remember() { history.push(JSON.stringify(s)); if (history.length > 40) history.shift(); }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, data: s })); notice = 'Guardado en este navegador'; }
    catch { notice = 'No se pudo guardar: descarga los datos antes de cerrar.'; }
    const el = document.getElementById('econ-save'); if (el) el.textContent = notice;
    const undo = document.querySelector('[data-e-action="undo"]'); if (undo) undo.disabled = !history.length;
  }
  const button = (action, label, attrs = '', primary = false) => `<button type="button" class="study-btn ${primary ? '' : 'secondary'}" data-e-action="${action}" ${attrs}>${label}</button>`;
  const input = (path, label, min = 0, max = 1e9, step = 'any', text = false) => `<input type="${text ? 'text' : 'number'}" ${text ? 'maxlength="80"' : `inputmode="decimal" min="${min}" max="${max}" step="${step}"`} aria-label="${h(label)}" data-e-field="${path}" value="${h(get(path))}">`;
  function sheet(rows, caption = 'Parámetros editables') {
    return `<div class="econ-sheet-scroll"><table class="econ-sheet"><caption>${caption}</caption><thead><tr><th scope="col">Parámetro</th><th scope="col">Valor</th></tr></thead><tbody>${rows.map(([label,path,min,max,step]) => `<tr><th scope="row">${label}</th><td>${input(path,label,min,max,step)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const range = (path, label, min, max, step = 1) => `<label class="econ-range"><span>${label}</span><span class="econ-range-controls"><input type="range" aria-label="${h(label)} · deslizador" data-e-field="${path}" min="${min}" max="${max}" step="${step}" value="${get(path)}">${input(path,label,min,max,step)}</span></label>`;
  const check = (path, label) => `<label class="econ-check"><input type="checkbox" data-e-field="${path}" ${get(path) ? 'checked' : ''}>${label}</label>`;
  const select = (path, label, options) => `<label class="econ-select">${label}<select data-e-field="${path}" aria-label="${label}">${options.map(([value,name]) => `<option value="${value}" ${get(path) === value ? 'selected' : ''}>${name}</option>`).join('')}</select></label>`;
  const hint = text => `<p class="econ-hint">${text}</p>`;
  // Applied formulas highlight the student's inputs; results turn into «?» while results are hidden.
  const vv = (value, decimals = 2) => `<var>${f(value, decimals)}</var>`, vm = value => `<var>${money(value)}</var>`;
  const shown = (value, symbol) => s.hide ? symbol : value;
  const formula = (text, applied = []) => s.formulas ? `<div class="econ-formula"><strong>Fórmula del modelo</strong><p>${text}</p>${applied.length ? `<strong>Con tus datos${s.hide ? ' · resultados ocultos' : ''}</strong><ol class="econ-formula-applied">${applied.map(([expr, result]) => `<li><span>${expr}</span><b>= ${s.hide ? '?' : result}</b></li>`).join('')}</ol>` : ''}</div>` : '';
  const stats = items => s.hide ? '<p class="econ-hint">Resultados ocultos. Resuelve el ejercicio y comprueba tu respuesta.</p>' : `<div class="econ-stats">${items.map(([name,value]) => `<div><span>${name}</span><strong>${value}</strong></div>`).join('')}</div>`;
  const help = (title, body) => `<details class="econ-help"><summary>${title}</summary>${body}</details>`;
  const curveHelp = name => ({
    Demanda: 'Disposición a pagar por cada unidad. Al subir el precio, se demanda una cantidad menor.',
    'Demanda inicial': 'Demanda antes del desplazamiento. Compara esta línea discontinua con la demanda actual; cambiar el precio propio no desplaza la curva.',
    Oferta: 'Precio al que se ofrece cada cantidad. Su cruce con la demanda determina el equilibrio.',
    'Oferta inicial': 'Oferta antes del cambio en costos. Compara esta línea discontinua con la oferta actual.',
    'Dos observaciones (segmento)': 'A y B permiten calcular elasticidad arco con promedios de precio y cantidad. La pendiente del segmento y la elasticidad no son lo mismo.',
    'Demanda según precio de bolsillo': 'La cantidad responde al precio que paga el paciente, no al precio total que recibe el prestador. El asegurador cubre la diferencia.',
    'Demanda insensible al precio': 'Con sensibilidad B = 0, cambiar el precio de bolsillo no cambia las consultas demandadas en este modelo.',
    'Ingreso marginal': 'Ingreso adicional de vender una unidad más. En monopolio está debajo del precio porque vender más obliga a reducirlo.',
    'Costo marginal': 'Costo adicional de una unidad más. Es la pendiente del costo total; no se obtiene dividiendo el costo total por Q.',
    'Costo medio': 'Costo total dividido por la cantidad. Es el costo por unidad, no el gasto total.',
    'Con inversión constante': 'La inversión repone parte del capital de salud que se deprecia en cada período.',
    'Sin inversión': 'El capital de salud disminuye por depreciación, sin reposición.'
  }[name] || 'Compara esta curva con los puntos señalados y sus coordenadas.');
  function chart(series, { title, xLabel = 'Cantidad (Q)', yLabel = 'Precio ($)', markers = [], lines = [], areas = [], xMax, yMax, yMin = 0 } = {}) {
    const W = globalThis.innerWidth < 600 ? 360 : 620, H = 365, L = 70, R = 20, T = 34, B = 55;
    const all = [...series.flatMap(v => v.points), ...markers.map(v => [v.q,v.p])].filter(p => p.every(Number.isFinite));
    xMax ||= Math.max(1,...all.map(p=>p[0])) * 1.07;
    yMax ||= Math.max(1,...all.map(p=>p[1]), ...lines.map(l=>l.y)) * 1.13;
    const x = v => L + v / xMax * (W-L-R), y = v => H-B - (v-yMin)/(yMax-yMin)*(H-T-B);
    const tick = n => Math.abs(n) >= 10000 ? new Intl.NumberFormat('es-CL',{notation:'compact',maximumFractionDigits:1}).format(n) : f(n,1);
    plotMeta = { xMax, yMax, yMin, W, H, L, R, T, B };
    const path = points => points.filter(p=>p.every(Number.isFinite)).map(([q,p],i) => `${i ? 'L' : 'M'}${x(q).toFixed(2)},${y(p).toFixed(2)}`).join(' ');
    const visible = markers.filter(v=>Number.isFinite(v.q)&&Number.isFinite(v.p)&&v.q>=0&&v.q<=xMax&&v.p>=yMin&&v.p<=yMax);
    const pointInfo = v => `${v.label}. ${s.hide ? 'Coordenadas ocultas para practicar.' : `${xLabel}: ${f(v.q)}; ${yLabel}: ${f(v.p)}.`} ${v.help || 'Las líneas punteadas llevan este punto a sus valores en ambos ejes.'}${v.drag ? ' Arrastra el punto o cambia el control de precio.' : ''}`;
    const explain = (id, text) => `data-e-ref="${id}" data-e-explain="${h(text)}" aria-describedby="econ-chart-reading"`;
    // Closely spaced projections share the axis space; exact values remain in the point keys.
    const labels = (axis, minGap) => visible.map(v=>axis==='x'?v.q:v.p).sort((a,b)=>a-b).filter((v,i,a)=>i===0||Math.abs((axis==='x'?x:y)(v)-(axis==='x'?x:y)(a[i-1]))>=minGap);
    const qLabels = s.hide ? [] : labels('x',38), pLabels = s.hide ? [] : labels('y',18);
    return `<figure class="econ-figure econ-interactive"><figcaption>${h(title)}</figcaption><svg id="econ-chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="${h(title)}. Eje horizontal: ${h(xLabel)}. Eje vertical: ${h(yLabel)}."><title>${h(title)}</title><defs><clipPath id="econ-clip"><rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}"/></clipPath><pattern id="econ-loss-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-1,1L1,-1M0,7L7,0M6,8L8,6" stroke="#a12c39" stroke-width="1"/></pattern></defs>
      ${Array.from({length:5},(_,i)=>{const q=xMax*i/4,p=yMin+(yMax-yMin)*i/4;return `<line class="econ-grid" x1="${L}" x2="${W-R}" y1="${y(p)}" y2="${y(p)}"/>${pLabels.some(v=>Math.abs(y(v)-y(p))<18)?'':`<text x="${L-7}" y="${y(p)+4}" text-anchor="end">${tick(p)}</text>`}${qLabels.some(v=>Math.abs(x(v)-x(q))<38)?'':`<text x="${x(q)}" y="${H-B+21}" text-anchor="middle">${tick(q)}</text>`}`}).join('')}
      <path class="econ-axis" d="M${L},${T}V${H-B}H${W-R}"/><text x="${L}" y="17" class="econ-axis-title">${yLabel}</text><text x="${W-R}" y="${H-7}" text-anchor="end" class="econ-axis-title">${xLabel}</text>
      <g clip-path="url(#econ-clip)">${areas.map((a,i)=>`<path class="econ-area" ${explain('area-'+i,`${a.name}. ${s.hide?'':money(a.value)+'. '}${a.help}`)} tabindex="0" aria-label="${h(a.name)}" d="${path(a.points)}Z" fill="${a.color}" fill-opacity=".23" stroke="${a.color}" stroke-width="1.5"/>${a.hatch?`<path d="${path(a.points)}Z" fill="url(#econ-loss-hatch)" pointer-events="none"/>`:''}`).join('')}
      ${lines.map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v.y)}" y2="${y(v.y)}" stroke="${v.color||'#65716f'}" stroke-dasharray="4 4" pointer-events="none"/>`).join('')}
      ${visible.map((v,i)=>`<path class="econ-projection" data-e-ref="point-${i}" d="M${L},${y(v.p)}H${x(v.q)}V${H-B}" fill="none" stroke="${v.color||'#157568'}" stroke-width="1.5" stroke-dasharray="3 4" pointer-events="none"/>`).join('')}
      ${series.map((v,i)=>`<path class="econ-curve" ${explain('curve-'+i,v.name+'. '+(v.help||curveHelp(v.name)))} tabindex="0" aria-label="${h(v.name)}" d="${path(v.points)}" fill="none" stroke="${v.color}" stroke-width="${v.dash ? 2 : 3}" ${v.dash ? 'stroke-dasharray="6 5"' : ''}/>`).join('')}
      ${areas.map((a,i)=>{const cx=a.points.reduce((n,p)=>n+p[0],0)/a.points.length,cy=a.points.reduce((n,p)=>n+p[1],0)/a.points.length;return `<text class="econ-area-number" x="${x(cx)}" y="${y(cy)+4}" text-anchor="middle" pointer-events="none">${i+1}</text>`}).join('')}</g>
      ${qLabels.map(v=>`<text class="econ-projection-value" x="${x(v)}" y="${H-B+21}" text-anchor="middle">${tick(v)}</text>`).join('')}${pLabels.map(v=>`<text class="econ-projection-value" x="${L-7}" y="${y(v)+4}" text-anchor="end">${tick(v)}</text>`).join('')}
      ${visible.map((v,i)=>`<g><circle ${explain('point-'+i,pointInfo(v))} cx="${x(v.q)}" cy="${y(v.p)}" r="${v.drag ? 8 : 5}" fill="${v.color||'#157568'}" stroke="white" stroke-width="2" tabindex="0" ${v.drag ? 'data-e-drag="price" class="econ-drag"' : ''} aria-label="${h(pointInfo(v))}"/>${v.label ? `<text x="${x(v.q)+(v.q>xMax/2?-9:9)}" text-anchor="${v.q>xMax/2?'end':'start'}" y="${Math.max(T+12,y(v.p)-9)}" class="econ-point-label" pointer-events="none">${h(v.label)}</text>` : ''}</g>`).join('')}
      </svg><div class="econ-legend">${series.map((v,i)=>`<button type="button" ${explain('curve-'+i,v.name+'. '+(v.help||curveHelp(v.name)))}><i style="border-color:${v.color};border-top-style:${v.dash?'dashed':'solid'}"></i>${h(v.name)}</button>`).join('')}<span class="econ-guide-key"><i></i>Guías a los ejes</span></div>
      <div class="econ-point-keys">${visible.map((v,i)=>`<button type="button" ${explain('point-'+i,pointInfo(v))}><strong>${h(v.label)}</strong>${s.hide?'Coordenadas ocultas':`${h(xLabel)}: ${f(v.q)} · ${h(yLabel)}: ${f(v.p)}`}</button>`).join('')}</div>
      ${areas.length?`<div class="econ-area-keys">${areas.map((a,i)=>`<button type="button" class="econ-area-key" style="--area-color:${a.color}" ${explain('area-'+i,`${a.name}. ${s.hide?'':money(a.value)+'. '}${a.help}`)}><span>${i+1} · ${h(a.name)}</span><strong>${s.hide?'?':money(a.value)}</strong><small>${h(a.help)}</small></button>`).join('')}</div>`:''}
      <p id="econ-chart-reading" class="econ-chart-reading" role="status">Pasa el mouse, enfoca con Tab o toca un punto, una curva o su etiqueta para ver la explicación. Las guías punteadas conectan cada punto con ambos ejes.</p></figure>`;
  }
  function exercise(labels, values, steps, question) {
    expected = values; solution = steps;
    return `<section class="econ-exercise"><div class="econ-section-heading"><h4>Tu turno</h4>${button('new-exercise','Otro ejercicio')}</div><p>${question}</p><form id="econ-exercise-form"><div class="econ-sheet-scroll"><table class="econ-sheet"><caption>Sin separadores de miles · decimal con coma o punto · tolerancia 0,5%</caption><tbody>${labels.map((label,i)=>`<tr><th scope="row">${label}</th><td><input type="text" inputmode="decimal" aria-label="Respuesta: ${h(label)}" data-e-answer="${i}" placeholder="Tu cálculo" value="${h(s.answers?.[s.tab]?.[i] || '')}"></td></tr>`).join('')}</tbody></table></div><button type="submit" class="study-btn">Comprobar respuestas</button></form><div id="econ-feedback" role="status">${feedback}</div>${help('Ver solución paso a paso', `<p>${steps}</p>`)}</section>`;
  }
  function controls() {
    if (s.tab === 'market') return `<h4>1. Elige una situación</h4>${select('market.mode','Gráfico que quieres explorar',[['demand','Demanda'],['supply','Oferta'],['equilibrium','Equilibrio'],['shifts','Desplazamientos']])}<div class="econ-presets">${button('preset','Equilibrio del apunte','data-preset="market-doc"')}${button('preset','Bebida del apunte','data-preset="beverage"')}${button('preset','Consultas de salud','data-preset="health"')}</div><p class="econ-source-label">${h(s.market.name)}</p>
      <details class="econ-data" ${dataOpen ? 'open' : ''}><summary data-e-toggle="data">2. Editar la tabla de datos <small>(${s.market.rows.length} filas)</small></summary><div class="econ-sheet-scroll"><table class="econ-sheet econ-market-table"><caption>Q horizontal · precios de demanda/oferta verticales</caption><thead><tr><th scope="col">Q</th><th scope="col">P demanda</th><th scope="col">P oferta</th><th scope="col"><span class="econ-sr">Quitar</span></th></tr></thead><tbody>${s.market.rows.map((r,i)=>`<tr>${r.map((v,j)=>`<td>${input(`market.rows.${i}.${j}`,`Fila ${i+1}, ${['cantidad Q','precio demanda','precio oferta'][j]}`)}</td>`).join('')}<td>${button('remove-row','×',`data-row="${i}" aria-label="Quitar fila ${i+1}" ${s.market.rows.length<=2?'disabled':''}`)}</td></tr>`).join('')}</tbody></table></div>${button('add-row','+ Fila',s.market.rows.length>=40?'disabled':'')}</details>
      ${range('market.price','Precio observado ($)',0,Math.max(2500,...s.market.rows.flatMap(r=>r.slice(1)).filter(Number.isFinite))*1.5,1)}
      ${s.market.mode === 'shifts' ? `${range('market.demandShift','Cambio en demanda ($ por Q)',-Math.max(500,s.market.rows[0][1]),Math.max(500,s.market.rows[0][1]),1)}${range('market.supplyShift','Cambio en costos de oferta ($ por Q)',-Math.max(500,s.market.rows[0][1]),Math.max(500,s.market.rows[0][1]),1)}${check('market.baseline','Comparar con curvas iniciales')}` : ''}
      ${hint('Edita las celdas o mueve el precio. Azul: demanda; naranja: oferta. También puedes arrastrar el punto «P observado» del gráfico.')}`;
    if (s.tab === 'elasticity') return `<h4>1. Compara dos observaciones</h4><div class="econ-presets">${button('preset','Poca sensibilidad','data-preset="inelastic"')}${button('preset','Más sustitutos','data-preset="elastic"')}${button('preset','Elasticidad unitaria','data-preset="unit"')}</div>${sheet([['Precio inicial ($)','elasticity.p1',1],['Precio final ($)','elasticity.p2',1],['Cantidad inicial','elasticity.q1',1],['Cantidad final','elasticity.q2',1]],'Consultas por mes · ejemplo simulado')}${hint('Mantén iguales las unidades y el período. Estos dos puntos sirven para calcular elasticidad arco, suponiendo constantes los otros determinantes.')}`;
    if (s.tab === 'scale') return `<h4>1. Define el horizonte</h4>${select('scale.mode','Modelo de costos',[['short','Corto plazo · capacidad fija'],['long','Largo plazo · todos los insumos ajustables']])}${s.scale.mode==='short' ? sheet([['Costo fijo F ($/mes)','scale.fixed'],['Costo variable v ($/examen)','scale.variable'],['Congestión k ($/examen²)','scale.congestion']],'Laboratorio clínico · datos simulados') : `${sheet([['Costo total de referencia C₀ ($)','scale.c0',1],['Cantidad de referencia Q₀','scale.q0',1]],'Escala de referencia')} ${range('scale.alpha','Exponente de costos α',0.2,2,0.05)}<div class="econ-presets">${button('preset','Economías α=0,8','data-preset="scale-economies"')}${button('preset','Constante α=1','data-preset="scale-constant"')}${button('preset','Deseconomías α=1,2','data-preset="scale-diseconomies"')}</div>`}<h4>2. Compara volúmenes</h4>${sheet([['Exámenes al mes · A','scale.qa',1],['Exámenes al mes · B','scale.qb',1]],'Misma calidad y complejidad')}${hint('Cambia Q en A y B. El gráfico compara costos por examen; el gasto total también aparece en los resultados. Usa «Ocultar resultados» para resolver sin mirar.')}`;
    if (s.tab === 'productivity') return `<h4>Edita el gráfico del documento</h4><div class="econ-sheet-scroll"><table class="econ-sheet econ-productivity-table"><caption>Aportes marginales ilustrativos · no eficacia clínica</caption><thead><tr><th>Intervención</th><th>Índice</th><th><span class="econ-sr">Quitar</span></th></tr></thead><tbody>${s.productivity.rows.map((r,i)=>`<tr><td>${input(`productivity.rows.${i}.0`,'Nombre de intervención '+(i+1),0,1e9,'any',true)}</td><td>${input(`productivity.rows.${i}.1`,'Índice de intervención '+(i+1),-1000,1000)}</td><td>${button('remove-row','×',`data-row="${i}" aria-label="Quitar intervención ${i+1}" ${s.productivity.rows.length<=2?'disabled':''}`)}</td></tr>`).join('')}</tbody></table></div>${button('add-row','+ Intervención',s.productivity.rows.length>=12?'disabled':'')}${hint('El documento muestra 95, 80, 45 y −5 sin una base de estimación. Aquí son un índice de práctica, no porcentajes de beneficio clínico.')}`;
    if (s.tab === 'monopoly') return `<h4>Cambia demanda y costos</h4>${sheet([['Demanda: intercepto a ($)','monopoly.a',1],['Demanda: pendiente b ($/Q)','monopoly.b',0.01],['CMg: intercepto c ($)','monopoly.c'],['CMg: pendiente d ($/Q)','monopoly.d']],'P = a − bQ · CMg = c + dQ')}${hint('Azul: demanda; violeta: ingreso marginal; naranja: costo marginal. M es monopolio, C es competencia. Se mantiene la misma tecnología en ambas situaciones.')}`;
    if (s.tab === 'insurance') return `<h4>Precio que percibe el paciente</h4>${range('insurance.copay','Copago del paciente (%)',0,100,1)}${sheet([['Precio total por consulta ($)','insurance.price',1],['Demanda a precio cero A','insurance.intercept',1],['Sensibilidad B (consultas/$)','insurance.slope',0,1e6]],'Q = máximo(0, A − B × precio de bolsillo)')}<div class="econ-presets">${[0,25,50,95].map(n=>button('preset',n+'% de copago',`data-preset="copay-${n}"`)).join('')}</div>${hint('Porcentajes mencionados en el apunte. Los resultados de esta simulación no son datos del experimento RAND.')}`;
    return `<h4>Salud como stock de capital</h4>${sheet([['Stock inicial H₀','grossman.initial',0,10000],['Inversión por período I','grossman.investment',0,10000],['Número de períodos','grossman.years',1,50,1]],'Índice abstracto de salud; I en unidades del índice')}${range('grossman.delta','Depreciación por período δ (%)',0,100,1)}${hint('La inversión y el stock usan la misma unidad abstracta. No equivalen a pesos ni a una escala clínica de 0 a 100.')}`;
  }
  function marketOutput() {
    const model = M.market(s.market), { rows, base, eq, original, qd, qs, gap } = model, mode = s.market.mode;
    const drawDemand = mode !== 'supply', drawSupply = mode !== 'demand', shifted = s.market.demandShift || s.market.supplyShift;
    const series = [], markers = [], lines = [{y:s.market.price}];
    if (s.market.baseline && shifted) {
      if(drawDemand)series.push({name:'Demanda inicial',color:'#4d77be',dash:true,points:base.map(r=>[r[0],r[1]])});
      if(drawSupply)series.push({name:'Oferta inicial',color:'#bc703f',dash:true,points:base.map(r=>[r[0],r[2]])});
      if(original && drawDemand && drawSupply)markers.push({q:original.q,p:original.p,label:'E inicial',color:'#687770'});
    }
    if(drawDemand)series.push({name:'Demanda',color:'#315eb3',points:rows.map(r=>[r[0],r[1]])});
    if(drawSupply)series.push({name:'Oferta',color:'#c25718',points:rows.map(r=>[r[0],r[2]])});
    const atEquilibrium=eq && drawDemand && drawSupply && Math.abs(eq.p-s.market.price)<1e-7;
    if(eq && drawDemand && drawSupply && !atEquilibrium)markers.push({q:eq.q,p:eq.p,label:'E',color:'#147568'});
    markers.push({q:drawDemand?qd:qs,p:s.market.price,label:atEquilibrium?'E · P observado':'P observado',color:atEquilibrium?'#147568':'#6846a7',drag:true});
    if(drawDemand&&drawSupply&&Math.abs(qd-qs)>1e-7)markers.push({q:qs,p:s.market.price,label:'Qs',color:'#c25718',help:'Cantidad ofrecida al precio observado. Compara su proyección con la cantidad demandada para identificar escasez o exceso de oferta.'});
    const plot=chart(series,{title:{demand:'Demanda · gráfico 2',supply:'Oferta · gráfico 3',equilibrium:'Equilibrio · gráfico 4',shifts:'Desplazamientos · gráfico 5'}[mode],markers,lines});
    const explanation=mode==='demand'?'Cambiar el precio observado mueve el punto sobre la misma demanda. La tabla define la curva.':mode==='supply'?'Cambiar el precio observado mueve el punto sobre la misma oferta. Una variación de costos puede desplazar toda la curva.':eq?`A ${money(s.market.price)}: ${Math.abs(gap)<1e-7?'oferta y demanda coinciden.':gap>0?`hay exceso de demanda de ${f(gap)} unidades.`:`hay exceso de oferta de ${f(-gap)} unidades.`}`:'No hay cruce con precio no negativo dentro del rango de la tabla. Amplía los datos o reduce los desplazamientos.';
    let out=plot+stats([...(drawDemand?[['Cantidad demandada',f(qd)]]:[]),...(drawSupply?[['Cantidad ofrecida',f(qs)]]:[]),...(eq&&drawDemand&&drawSupply?[['Equilibrio',`${money(eq.p)} · Q ${f(eq.q)}`]]:[])])+`<p class="econ-insight">${s.hide?'Predice qué cambia al mover el control y luego comprueba.':explanation}</p>`;
    if(model.clipped)out+=hint('El precio observado supera el rango de alguna curva. Las cantidades se muestran en el límite de la tabla; amplíala para cuantificar el exceso completo.');
    if(shifted)out+=hint(`Desplazamientos activos: demanda ${money(s.market.demandShift)}; oferta ${money(s.market.supplyShift)}. ${mode!=='shifts'?'Abre «Desplazamientos» para cambiarlos.':''}`);
    const read=(column,q)=>{const pair=M.bracket(rows,s.market.price,column);if(!pair)return null;const[[q1,p1],[q2,p2]]=pair.map(r=>[r[0],r[column]]);return[`Q${column===1?'d':'s'} = ${vv(q1)} + (${vv(q2)} − ${vv(q1)}) × (${vm(s.market.price)} − ${vm(p1)}) / (${vm(p2)} − ${vm(p1)})`,f(q)];};
    const both=drawDemand&&drawSupply,applied=model.clipped?[]:[drawDemand&&read(1,qd),drawSupply&&read(2,qs),both&&[`Qd − Qs = ${shown(f(qd),'Qd')} − ${shown(f(qs),'Qs')}`,`${f(gap)} ${Math.abs(gap)<1e-7?'(equilibrio)':gap>0?'(exceso de demanda)':'(exceso de oferta)'}`]].filter(Boolean);
    if(eq&&both)applied.push(['Equilibrio (Pdemanda = Poferta) en Q',`${f(eq.q)} · P = ${money(eq.p)}`]);
    out+=formula('Para leer Q entre dos filas de la tabla: Q = Q₁ + (Q₂ − Q₁) × (P − P₁)/(P₂ − P₁). En equilibrio: Pdemanda(Q) = Poferta(Q).',applied);
    out+=help('Cómo leer este gráfico', '<p>Q va horizontal y P vertical. Aumentar el precio propio produce un movimiento sobre la curva. Aumentar el precio de demanda en cada Q desplaza demanda arriba/derecha; aumentar costos desplaza oferta arriba/izquierda.</p><p>La bebida del gráfico 2 y el equilibrio del gráfico 4 usan ejemplos diferentes. El preset de equilibrio reproduce Q=3 a $900, exceso de oferta de 4 a $1.500 y exceso de demanda de 4 a $500. Las etiquetas se sitúan en las coordenadas calculadas.</p><p>Se interpola solo dentro de la tabla, sin extrapolar. Se permiten cantidades fraccionarias para practicar un modelo continuo.</p>');
    if(!model.clipped)out+=exercise(['Cantidad demandada','Cantidad ofrecida'],[qd,qs],`Ubica P=${money(s.market.price)} en el eje vertical. Interseca cada curva y lee Q en el horizontal: Qd=${f(qd)}, Qs=${f(qs)}. Resta Qd−Qs=${f(gap)}. Un resultado positivo indica exceso de demanda.`, `Con el precio observado de ${money(s.market.price)}, calcula ambas cantidades usando la tabla.`);
    return out;
  }
  function elasticityOutput() {
    const v=s.elasticity,r=M.elasticity(v);
    const series=[{name:'Dos observaciones (segmento)',color:'#315eb3',points:[[v.q1,v.p1],[v.q2,v.p2]]}];
    return chart(series,{title:'Elasticidad arco · consultas simuladas',markers:[{q:v.q1,p:v.p1,label:'A'},{q:v.q2,p:v.p2,label:'B',color:'#b45923'}]})+stats([['Elasticidad con signo',f(r.e,3)],['Según |E|',r.kind],['Ingreso total A',money(r.revenue1)],['Ingreso total B',money(r.revenue2)]])+`<p class="econ-insight">${s.hide?'Calcula cambios porcentuales con la base promedio.':`La cantidad cambia ${f(r.dq*100)}% y el precio ${f(r.dp*100)}% usando el punto medio. ${r.e>0?'Ambos cambian en el mismo sentido: revisa si también hubo cambios en otros determinantes.':'La clasificación describe este tramo, no toda la curva.'}`}</p>`+formula('E = [(Q₂−Q₁)/((Q₁+Q₂)/2)] ÷ [(P₂−P₁)/((P₁+P₂)/2)] · ingreso total = P × Q.',[[`E = [(${vv(v.q2)} − ${vv(v.q1)}) / ((${vv(v.q1)} + ${vv(v.q2)})/2)] ÷ [(${vm(v.p2)} − ${vm(v.p1)}) / ((${vm(v.p1)} + ${vm(v.p2)})/2)]`,`${f(r.dq*100)} % ÷ ${f(r.dp*100)} % = ${f(r.e,3)} (${r.kind.toLowerCase()})`],[`Ingreso total A = ${vm(v.p1)} × ${vv(v.q1)}`,money(r.revenue1)],[`Ingreso total B = ${vm(v.p2)} × ${vv(v.q2)}`,money(r.revenue2)]])+help('Ayuda: pendiente, elasticidad e ingreso','<p>|E| &lt; 1: inelástica; |E| = 1: unitaria; |E| &gt; 1: elástica. El signo de una demanda decreciente suele ser negativo. La elasticidad no tiene unidades; cambiar pesos a miles de pesos no la altera.</p><p>Ingreso total no es utilidad: faltan los costos. Los puntos son un escenario didáctico y no una estimación causal.</p>')+exercise(['Elasticidad con signo','Ingreso total final ($)'],[r.e,r.revenue2],`ΔQ/promedio Q=${f(r.dq*100,3)}%. ΔP/promedio P=${f(r.dp*100,3)}%. Divide: E=${f(r.e,4)}. El ingreso final es ${money(v.p2)}×${f(v.q2)}=${money(r.revenue2)}.`, 'Calcula E con el método del punto medio y el ingreso total de B.');
  }
  function scaleOutput() {
    const v=s.scale,r=M.costs(v),max=Math.max(v.qa,v.qb,v.mode==='long'?v.q0:0)*1.4,min=Math.min(v.qa,v.qb)/2, points=Array.from({length:81},(_,i)=>min+(max-min)*i/80);
    const table=s.hide?'':`<div class="econ-sheet-scroll"><table class="econ-sheet econ-results"><caption>Resultados A y B · costos mensuales simulados</caption><thead><tr><th scope="col">Escenario</th><th scope="col">Exámenes/mes (Q)</th><th scope="col" title="Gasto mensual de producir Q exámenes.">Costo total ($/mes)</th><th scope="col" title="Costo total dividido por Q.">Costo medio ($/examen)</th><th scope="col" title="Derivada del costo total: cambio aproximado por un examen adicional.">Costo marginal ($/examen)</th></tr></thead><tbody>${[['A',r.a],['B',r.b]].map(([name,p])=>`<tr data-cost-scenario="${name}"><th scope="row">${name}</th><td>${f(p.q)}</td><td>${money(p.total)}</td><td>${money(p.average)}</td><td>${money(r.marginal(p.q))}</td></tr>`).join('')}</tbody></table></div>`;
    const conclusion=v.mode==='long' ? v.alpha<1?'α < 1: economías de escala en este tramo.':v.alpha>1?'α > 1: deseconomías de escala en este tramo.':'α = 1: costo medio constante.' : 'A corto plazo se mantiene la capacidad. Diluir F entre más exámenes no demuestra por sí solo economías de escala de largo plazo.';
    const delta = r.b.average-r.a.average, equal = Math.abs(delta)<=1e-10*Math.max(1,r.a.average,r.b.average);
    const reading = s.hide ? '' : `<p class="econ-insight econ-cost-reading">${equal?'El costo medio es igual en A y B.':`En B, cada examen cuesta ${money(Math.abs(delta))} ${delta<0?'menos':'más'} que en A${r.change===null?'':` (${f(Math.abs(r.change))} % ${delta<0?'de disminución':'de aumento'})`}.`} El costo total mensual pasa de ${money(r.a.total)} a ${money(r.b.total)}. ${v.qa===v.qb?'A y B tienen el mismo volumen: no hay un cambio de escala entre ellos.':v.qb<v.qa?'B tiene menos exámenes que A: esta comparación reduce el volumen.':'Compara el gasto total y el costo por examen por separado.'} ${r.change===null?'La variación porcentual no está definida porque el costo medio de A es cero.':''}</p>`;
    return chart([{name:'Costo medio',color:'#315eb3',points:points.map(q=>[q,r.average(q)])},{name:'Costo marginal',color:'#c25718',points:points.map(q=>[q,r.marginal(q)])}],{title:v.mode==='long'?'Escala y costo por examen · largo plazo':'Volumen y costo por examen · corto plazo',xLabel:'Exámenes al mes (Q)',yLabel:'Costo por examen ($)',markers:[{q:r.a.q,p:r.a.average,label:'A',help:'Escenario inicial. El punto está sobre el costo medio: costo total dividido por exámenes al mes.'},{q:r.b.q,p:r.b.average,label:'B',color:'#6846a7',help:'Escenario de comparación. Lee el costo por examen en el eje vertical y compara también el gasto mensual en la tabla.'}]})+table+reading+stats([['Cambio del costo medio A → B',r.change===null?'No definido (CMe A = 0)':f(r.change)+'%'],['Diferencia por examen',money(r.b.average-r.a.average)]])+`<p class="econ-insight">${conclusion}</p>`+formula(v.mode==='long'?'CT = C₀ × (Q/Q₀)^α · CMe = CT/Q · CMg = α × CT/Q.':'CT = F + vQ + kQ² · CMe = F/Q + v + kQ · CMg = v + 2kQ.',[...[['A',r.a],['B',r.b]].flatMap(([n,p])=>[[v.mode==='long'?`CT(${n}) = ${vm(v.c0)} × (${vv(p.q)} / ${vv(v.q0)})^${vv(v.alpha)}`:`CT(${n}) = ${vm(v.fixed)} + ${vm(v.variable)} × ${vv(p.q)} + ${vv(v.congestion)} × ${vv(p.q)}²`,money(p.total)],[`CMe(${n}) = ${shown(money(p.total),`CT(${n})`)} / ${vv(p.q)}`,money(p.average)],[v.mode==='long'?`CMg(${n}) = ${vv(v.alpha)} × ${shown(money(p.total),`CT(${n})`)} / ${vv(p.q)}`:`CMg(${n}) = ${vm(v.variable)} + 2 × ${vv(v.congestion)} × ${vv(p.q)}`,money(r.marginal(p.q))]]),...(r.change===null?[]:[[`Variación = (${shown(money(r.b.average),'CMe(B)')} / ${shown(money(r.a.average),'CMe(A)')} − 1) × 100`,f(r.change)+' %']])])+help('Ayuda: dos preguntas económicas diferentes','<p>Corto plazo: ¿cómo cambia el costo al usar más la capacidad disponible? Largo plazo: ¿cómo cambia al adaptar todos los insumos y ampliar la organización?</p><p>Compara productos de igual calidad y complejidad. Más producción puede disminuir el costo por examen y, simultáneamente, aumentar el gasto total.</p><p>El modelo de largo plazo es una función ilustrativa para un tramo, no una predicción de crecimiento ilimitado. <a href="https://openstax.org/books/principles-microeconomics-3e/pages/7-5-costs-in-the-long-run" target="_blank" rel="noopener">Referencia: OpenStax, costos de largo plazo</a>.</p>')+exercise(['Costo medio A ($)','Costo medio B ($)',...(r.change===null?[]:['Variación del costo medio (%)'])],[r.a.average,r.b.average,...(r.change===null?[]:[r.change])],`1. Calcula CT para cada Q con la fórmula del modelo: CTA=${money(r.a.total)}; CTB=${money(r.b.total)}. 2. Divide por Q: ${money(r.a.total)}/${f(r.a.q)}=${money(r.a.average)}; ${money(r.b.total)}/${f(r.b.q)}=${money(r.b.average)}. 3. ${r.change===null?'El cambio porcentual no se define si el costo medio inicial es cero.':`(CMeB/CMeA−1)×100=${f(r.change)}%. Un signo negativo significa que B cuesta menos por examen.`}`, 'Calcula los costos medios y la variación de A a B. Usa el signo menos si disminuye.');
  }
  function productivityOutput() {
    if(!Array.isArray(s.productivity.rows)||s.productivity.rows.length<2||s.productivity.rows.length>12)throw Error('Usa entre 2 y 12 intervenciones.');
    const rows=s.productivity.rows;rows.forEach(r=>{if(typeof r[0]!=='string'||!r[0].trim())throw Error('Escribe un nombre para cada intervención.');M.number(r[1],'Índice marginal',-1000,1000)});
    const min=Math.min(0,...rows.map(r=>r[1])),max=Math.max(1,...rows.map(r=>r[1])),span=max-min,zero=-min/span*100;
    const bars=`<figure class="econ-figure"><figcaption>Aporte marginal · gráfico 1 del documento</figcaption><p class="econ-axis-description">X: índice ilustrativo · Y: intervención</p><div class="econ-bars">${rows.map(([name,value])=>{const start=Math.min(zero,(value-min)/span*100),width=Math.abs(value)/span*100;return `<div class="econ-bar-row"><span>${h(name)}</span><div class="econ-bar-track" role="img" aria-label="${h(name)}: ${f(value)} unidades ilustrativas"><i class="econ-bar-zero" style="left:${zero}%"></i><i class="econ-bar" style="left:${start}%;width:${width}%;background:${value<0?'#b93737':'#267b70'}"></i></div><strong>${s.hide?'?':f(value)}</strong></div>`}).join('')}</div></figure>`;
    return bars+`<p class="econ-insight">Positivo: una unidad agrega beneficio. Cero: no agrega beneficio neto. Negativo: el resultado neto empeora. Estas categorías no establecen prioridades clínicas universales.</p>`+formula('Productividad marginal = Δresultado de salud / Δunidades de atención, manteniendo los demás insumos constantes.',[...rows.map(([name,value])=>[h(name),`${f(value)} ${value>0?'(agrega beneficio)':value<0?'(daño neto)':'(sin aporte neto)'}`]),['Aportes negativos en tu tabla',String(rows.filter(r=>r[1]<0).length)]])+help('Qué se conserva y qué se precisa del documento','<p>Se conservan sus cuatro categorías y los números 95, 80, 45 y −5. Se cambia el rótulo porcentual por «índice ilustrativo» porque el apunte no identifica una base de estimación. Puedes agregar otras intervenciones.</p><p>No sumes estas barras como si fueran etapas del mismo paciente. Iatrogenia significa daño por la atención y puede coexistir con un beneficio neto positivo.</p>')+exercise(['Número de aportes negativos'],[rows.filter(r=>r[1]<0).length],`Revisa qué valores están a la izquierda de cero. Hay ${rows.filter(r=>r[1]<0).length} aportes negativos en tu tabla.`, '¿Cuántas intervenciones de tu escenario tienen un aporte marginal negativo?');
  }
  function monopolyOutput() {
    const v=s.monopoly,r=M.monopoly(v),end=v.a/v.b;
    const series=[{name:'Demanda',color:'#315eb3',points:[[0,v.a],[end,0]]},{name:'Ingreso marginal',color:'#8054ac',dash:true,points:[[0,v.a],[end/2,0]]},{name:'Costo marginal',color:'#c25718',points:[[0,v.c],[end,v.c+v.d*end]]}];
    const markers=r.trade?[{q:r.qc,p:r.pc,label:'C',color:'#147568',help:'Competencia: demanda y costo marginal se cruzan. Sus proyecciones indican Qc y Pc.'},{q:r.qm,p:r.pm,label:'M',color:'#b93737',help:'Monopolio: la cantidad Qm se decide donde IMg=CMg; luego la demanda determina el precio Pm.'},{q:r.qm,p:v.c+v.d*r.qm,label:'IMg=CMg',color:'#8054ac',help:'Este cruce determina cuánto producir, Qm. Su altura es el costo e ingreso marginal, no el precio de venta Pm.'}]:[];
    const areas = r.trade ? [
      { name:'Excedente del consumidor', value:r.consumer, color:'#315eb3', points:[[0,v.a],[0,r.pm],[r.qm,r.pm]], help:'Beneficio de los compradores: lo que estaban dispuestos a pagar menos lo que pagan. Área bajo la demanda y sobre Pm, hasta Qm.' },
      { name:'Excedente del productor', value:r.producer, color:'#147568', points:[[0,v.c],[0,r.pm],[r.qm,r.pm],[r.qm,v.c+v.d*r.qm]], help:'Ingreso por ventas menos costo variable. Área entre Pm y el costo marginal, hasta Qm. Para obtener utilidad neta habría que descontar los costos fijos.' },
      { name:'Pérdida social', value:r.dwl, color:'#a12c39', hatch:true, points:[[r.qm,v.c+v.d*r.qm],[r.qm,r.pm],[r.qc,r.pc]], help:'Beneficio que nadie recibe: intercambios entre Qm y Qc que dejan de realizarse. No es una ganancia del monopolista ni todo lo que pierden los consumidores.' }
    ] : [];
    const balance = r.trade && !s.hide ? `<section class="econ-welfare"><h4>¿Quién gana y quién pierde frente a la competencia?</h4><p><strong>Consumidores: pierden ${money(r.consumerLoss)} de excedente.</strong> Pasa de ${money(r.consumerCompetitive)} a ${money(r.consumer)}.</p><p><strong>Productor: gana ${money(r.producerGain)} de excedente.</strong> Pasa de ${money(r.producerCompetitive)} a ${money(r.producer)}.</p><p class="econ-welfare-loss"><strong>Pérdida neta para la sociedad: ${money(r.dwl)}.</strong> ${money(r.consumerLoss)} perdidos por consumidores − ${money(r.producerGain)} ganados por el productor = ${money(r.dwl)} que nadie recupera.</p></section>` : '';
    return chart(series,{title:'Monopolio y competencia · gráfico 6',markers,areas,yMax:Math.max(v.a,v.c)*1.15})+stats([['Competencia Q / P',r.trade?`${f(r.qc)} / ${money(r.pc)}`:'Sin producción positiva'],['Monopolio Q / P',r.trade?`${f(r.qm)} / ${money(r.pm)}`:'Sin producción positiva'],['Pérdida social',money(r.dwl)]])+balance+`<p class="econ-insight">${r.trade?'M está en la demanda: indica Qm y Pm. C indica Qc y Pc en competencia. Las zonas 1 y 2 son los excedentes que se conservan con monopolio; la zona 3 rayada es la pérdida social.':'La disposición máxima a pagar no supera el costo marginal inicial. No hay producción positiva rentable en este modelo.'}</p>`+formula('Qc = (a−c)/(b+d) · Qm = (a−c)/(2b+d) · Pm = a−bQm · pérdida = ½(Qc−Qm)[Pm−CMg(Qm)].',r.trade?[[`Qc = (${vm(v.a)} − ${vm(v.c)}) / (${vv(v.b)} + ${vv(v.d)})`,f(r.qc)],[`Qm = (${vm(v.a)} − ${vm(v.c)}) / (2 × ${vv(v.b)} + ${vv(v.d)})`,f(r.qm)],[`Pm = ${vm(v.a)} − ${vv(v.b)} × ${shown(f(r.qm),'Qm')}`,money(r.pm)],[`CMg(Qm) = ${vm(v.c)} + ${vv(v.d)} × ${shown(f(r.qm),'Qm')}`,money(v.c+v.d*r.qm)],[`Pérdida = ½ × (${shown(f(r.qc),'Qc')} − ${shown(f(r.qm),'Qm')}) × (${shown(money(r.pm),'Pm')} − ${shown(money(v.c+v.d*r.qm),'CMg(Qm)')})`,money(r.dwl)]]:[[`a ≤ c: ${vm(v.a)} ≤ ${vm(v.c)}`,'sin producción positiva']])+help('Ayuda: por qué el monopolista reduce cantidad','<p>En un monopolio de precio único, vender una unidad más reduce el precio de todas las unidades. Por eso el ingreso marginal está debajo de la demanda. La regla IMg=CMg determina la cantidad; la demanda determina el precio.</p><p>La referencia competitiva comparte demanda y costos. Se omiten costos fijos, discriminación de precios y externalidades; no se calcula utilidad neta.</p>')+(r.trade?exercise(['Cantidad del monopolio','Precio del monopolio ($)'],[r.qm,r.pm],`Qm=(${f(v.a)}−${f(v.c)})/(2×${f(v.b)}+${f(v.d)})=${f(r.qm)}. Luego Pm=${f(v.a)}−${f(v.b)}×${f(r.qm)}=${money(r.pm)}.`, 'Iguala IMg y CMg; después busca el precio sobre la demanda.'):'');
  }
  function insuranceOutput() {
    const v=s.insurance,r=M.insurance(v),slope=v.slope,series=slope?[{name:'Demanda según precio de bolsillo',color:'#315eb3',points:[[0,v.intercept/slope],[v.intercept,0]]}]:[{name:'Demanda insensible al precio',color:'#315eb3',points:[[v.intercept,0],[v.intercept,v.price*1.2]]}];
    return chart(series,{title:'Copago y uso de consultas',yLabel:'Precio de bolsillo ($)',xLabel:'Consultas al mes (Q)',yMax:Math.max(v.price*1.15,slope?Math.min(v.intercept/slope,v.price*2):0),markers:[{q:r.without,p:v.price,label:'Sin cobertura',color:'#687770',help:'El paciente paga el precio completo; la demanda se lee a ese precio de bolsillo.'},{q:r.q,p:r.patientPrice,label:'Con cobertura',color:'#147568',help:'El paciente paga solo el copago. El resto lo financia el asegurador; más consultas no demuestra por sí solo más beneficio de salud.'}],lines:[{y:r.patientPrice}]})+stats([['Precio de bolsillo',money(r.patientPrice)],['Consultas',f(r.q)],['Gasto de pacientes',money(r.patient)],['Gasto del asegurador',money(r.insurer)]])+`<p class="econ-insight">${s.hide?'Calcula cómo se distribuye el gasto entre pacientes y asegurador.':`Gasto total ${money(r.total)} = pacientes ${money(r.patient)} + asegurador ${money(r.insurer)}. El copago cambia quién financia y, en este modelo, cuánto se demanda.`}</p>`+formula('Pbolsillo = P × copago/100 · Q = máx(0, A−B×Pbolsillo) · gasto del asegurador = Q × (P−Pbolsillo).',[[`Pbolsillo = ${vm(v.price)} × ${vv(v.copay)} / 100`,money(r.patientPrice)],[`Q = máx(0, ${vv(v.intercept)} − ${vv(v.slope,5)} × ${shown(money(r.patientPrice),'Pbolsillo')})`,f(r.q)],[`Gasto del asegurador = ${shown(f(r.q),'Q')} × (${vm(v.price)} − ${shown(money(r.patientPrice),'Pbolsillo')})`,money(r.insurer)],[`Gasto de pacientes = ${shown(f(r.q),'Q')} × ${shown(money(r.patientPrice),'Pbolsillo')}`,money(r.patient)]])+help('Ayuda: cobertura, riesgo moral y RAND','<p>Más utilización tras ampliar cobertura puede reflejar una respuesta al precio. El modelo no determina si esa atención es necesaria o efectiva. No incluye primas, topes, deducibles ni restricciones de oferta.</p><p>RAND encontró que los copagos reducían atención efectiva y menos efectiva. No se puede concluir que toda atención evitada fuera innecesaria. <a href="https://www.rand.org/pubs/research_briefs/RB9174.html" target="_blank" rel="noopener">Fuente primaria: RAND Health Insurance Experiment</a>.</p>')+exercise(['Consultas demandadas','Gasto del asegurador ($)'],[r.q,r.insurer],`Pbolsillo=${money(v.price)}×${f(v.copay)}%=${money(r.patientPrice)}. Q=máx(0,${f(v.intercept)}−${f(v.slope,5)}×${f(r.patientPrice)})=${f(r.q)}. Gasto asegurador=${f(r.q)}×(${f(v.price)}−${f(r.patientPrice)})=${money(r.insurer)}.`, 'Calcula la demanda y el gasto mensual del asegurador con este copago.');
  }
  function grossmanOutput() {
    const v=s.grossman,rows=M.grossman(v),last=rows.at(-1);
    return chart([{name:'Con inversión constante',color:'#147568',points:rows.map(r=>[r[0],r[1]])},{name:'Sin inversión',color:'#8b7373',dash:true,points:rows.map(r=>[r[0],r[2]])}],{title:'Evolución del capital de salud',xLabel:'Períodos',yLabel:'Índice abstracto H',markers:[{q:last[0],p:last[1],label:'Con I',help:'Stock al final de los períodos con inversión constante. La inversión se suma después de depreciar el stock de cada período.'},{q:last[0],p:last[2],label:'Sin I',color:'#8b7373',help:'Stock final cuando solo actúa la depreciación. Es un índice ilustrativo, no dinero ni una predicción clínica.'}]})+stats([['Stock en el período 1',f(rows[1][1])],['Stock final con inversión',f(last[1])],['Stock final sin inversión',f(last[2])]])+formula('H(t+1) = H(t) × (1 − δ/100) + I. Para mantener el stock de hoy: I = H(t) × δ/100.',[[`H(1) = ${vv(v.initial)} × (1 − ${vv(v.delta)}/100) + ${vv(v.investment)}`,f(rows[1][1])],[`I para mantener H₀ = ${vv(v.initial)} × ${vv(v.delta)}/100`,f(v.initial*v.delta/100)],[`Sin inversión: H(${v.years}) = ${vv(v.initial)} × (1 − ${vv(v.delta)}/100)^${vv(v.years,0)}`,f(last[2])]])+help('Ayuda: unidades y significado','<p>El porcentaje de depreciación se aplica al stock de cada período, no siempre al inicial. La inversión se suma después. I ya está expresada como aporte al stock, no como gasto monetario.</p><p>La curva permite entender el mecanismo de Grossman; no estima el envejecimiento ni la salud de una persona real.</p>')+exercise(['Stock del período 1','Inversión para mantener el stock inicial'],[rows[1][1],v.initial*v.delta/100],`H₁=${f(v.initial)}×(1−${f(v.delta)}/100)+${f(v.investment)}=${f(rows[1][1])}. Para mantener H₀ se debe compensar su depreciación: I=${f(v.initial)}×${f(v.delta)}/100=${f(v.initial*v.delta/100)}.`, 'Calcula el primer período y la inversión que evitaría perder stock respecto del valor inicial.');
  }
  function output() {
    expected=[];solution='';plotMeta=null;
    try { return ({market:marketOutput,elasticity:elasticityOutput,scale:scaleOutput,productivity:productivityOutput,monopoly:monopolyOutput,insurance:insuranceOutput,grossman:grossmanOutput}[s.tab])(); }
    catch(err) { return `<div class="econ-error" role="alert"><strong>Revisa los datos</strong><p>${h(err.message)}</p><p>Corrige la celda o usa Deshacer para continuar.</p></div>`; }
  }
  function html() {
    const index = tabs.findIndex(([id]) => id === s.tab), [, name, lesson, description] = tabs[index];
    // data-action="lesson" is handled by the study page, which owns lesson navigation.
    return `<section id="econ-lab" class="econ-lab"><nav class="econ-tabs" aria-label="Laboratorios de economía">${tabs.map(([id,label])=>button('tab',label,`data-tab="${id}" aria-pressed="${s.tab===id}"`,s.tab===id)).join('')}</nav><div class="econ-heading"><div><span class="study-eyebrow">LABORATORIO ${index + 1} DE ${tabs.length}</span><h2>${name}</h2><p>${description}</p></div><button type="button" class="study-btn secondary" data-action="lesson" data-id="${lesson}">Leer el tema →</button></div><div class="econ-toolbar"><div>${check('formulas','Mostrar fórmulas')}${check('hide','Ocultar resultados para practicar')}</div><div>${button('undo','Deshacer',history.length?'':'disabled')}${button('reset','Restablecer')}${button('download','Descargar datos')}</div></div><div class="econ-layout"><aside class="econ-controls" aria-label="Datos del laboratorio">${controls()}</aside><div class="econ-output" id="econ-output" aria-live="polite">${output()}</div></div><p id="econ-save" class="econ-save">${notice||'Los cambios se guardan en este navegador.'}</p><p class="econ-source-note">Base: RESUMEN ECONOMIA CLAUDE.docx. Los seis gráficos se reconstruyen con coordenadas calculadas; los escenarios de salud son simulados. Los controles y las ayudas funcionan sin IA.</p></section>`;
  }
  function render() {
    clearExplanation();
    const el=document.getElementById('econ-lab');if(el)el.outerHTML=html();
  }
  function updateOutput() {
    clearExplanation();
    const el=document.getElementById('econ-output');if(el)el.innerHTML=output();
  }
  function preset(name) {
    if(name==='market-doc')s.market=clone(defaults.market);
    if(name==='beverage')s.market={...clone(defaults.market),mode:'demand',name:'Bebida del documento · P=1.300−200Q',price:700,rows:[[0,1300,300],[1,1100,500],[2,900,700],[3,700,900],[4,500,1200],[5,300,1500],[6.5,0,2000]]};
    if(name==='health')s.market={...clone(defaults.market),name:'Consultas mensuales · ejemplo simulado',price:20000,rows:[[0,40000,5000],[50,30000,10000],[100,20000,15000],[150,10000,20000],[200,0,25000]]};
    if(['inelastic','elastic','unit'].includes(name))s.elasticity={...clone(defaults.elasticity),q2:{inelastic:90,elastic:60,unit:80}[name]};
    if(name.startsWith('scale-')){s.scale.mode='long';s.scale.alpha={'scale-economies':0.8,'scale-constant':1,'scale-diseconomies':1.2}[name];}
    if(name.startsWith('copay-'))s.insurance.copay=Number(name.split('-')[1]);
  }
  function newExercise() {
    const pick=a=>a[Math.floor(Math.random()*a.length)];
    if(s.tab==='market'){s.market=clone(defaults.market);s.market.price=pick([500,700,1100,1500]);}
    if(s.tab==='elasticity')s.elasticity={p1:pick([10000,20000,30000]),p2:40000,q1:120,q2:pick([60,90,100])};
    if(s.tab==='scale'){s.scale.fixed=pick([600000,1000000,1500000]);s.scale.variable=pick([3000,5000,7000]);s.scale.qa=100;s.scale.qb=pick([150,200,250]);s.scale.congestion=0;s.scale.alpha=pick([0.7,0.8,1,1.2]);s.scale.c0=pick([1200000,1500000,1800000]);s.scale.q0=100;}
    if(s.tab==='productivity')s.productivity.rows=s.productivity.rows.map(([name])=>[name,pick([-20,-5,0,20,45,80])]);
    if(s.tab==='monopoly')s.monopoly={a:pick([1500,1800,2100]),b:200,c:300,d:pick([100,200,300])};
    if(s.tab==='insurance')s.insurance={...clone(defaults.insurance),copay:pick([0,25,75,95])};
    if(s.tab==='grossman')s.grossman={...clone(defaults.grossman),initial:pick([60,80,100]),delta:pick([5,10,20]),investment:pick([6,10,12])};
    s.hide=true;
  }
  function handle(e) {
    if(!e.target.closest?.('#econ-lab'))return false;
    if(e.type==='submit' && e.target.id==='econ-exercise-form') {
      e.preventDefault();if(!expected.length)return true;
      // A comma is a decimal separator. Grouping separators are deliberately not inferred.
      const values=(s.answers[s.tab]||[]).map(v=>v.trim()?Number(v.trim().replace(',','.')):NaN);
      feedback=expected.map((value,i)=>{const correct=Number.isFinite(values[i])&&Math.abs(values[i]-value)<=Math.max(0.00005,Math.abs(value)*0.005);return `<p class="${correct?'econ-correct':'econ-retry'}">${correct?'✓ Correcto':'↻ Revisa'} · respuesta ${i+1}: ${Number.isFinite(values[i])?h(s.answers[s.tab][i]):'escribe un número sin separadores de miles'}. ${correct?'':`Resultado esperado: ${f(value,4)}.`}</p>`;}).join('');
      document.getElementById('econ-feedback').innerHTML=feedback;return true;
    }
    if((e.type==='input'||e.type==='change') && e.target.dataset.eAnswer!==undefined){s.answers[s.tab]||=[];s.answers[s.tab][Number(e.target.dataset.eAnswer)]=e.target.value;persist();return true;}
    const path=e.target.dataset.eField;
    if((e.type==='input'||e.type==='change') && path) {
      const t=e.target,value=t.type==='checkbox'?t.checked:['number','range'].includes(t.type)?(t.value===''?null:Number(t.value)):t.value;
      if(get(path)===value)return true;
      remember();set(path,value);feedback='';
      if(!['formulas','hide','market.baseline'].includes(path))s.answers[s.tab]=[];
      document.querySelectorAll('[data-e-field]').forEach(el=>{if(el!==t&&el.dataset.eField===path)el.value=value??'';});
      persist();
      if(['market.mode','scale.mode'].includes(path))render();else updateOutput();
      return true;
    }
    if(e.type!=='click')return false;
    // The click fires before the native toggle, so the next state is the opposite of the current one.
    if(e.target.closest('summary[data-e-toggle]')){dataOpen=!e.target.closest('details').open;return true;}
    const b=e.target.closest('[data-e-action]');if(!b||b.disabled)return false;
    const a=b.dataset.eAction;
    if(a==='tab'){s.tab=b.dataset.tab;feedback='';persist();render();document.querySelector(`[data-e-action="tab"][data-tab="${s.tab}"]`)?.focus({preventScroll:true});return true;}
    if(a==='download'){
      const payload={source:'RESUMEN ECONOMIA CLAUDE.docx; escenarios simulados',version:1,data:s};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='economia-practica.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
    }
    if(a==='undo'){if(history.length)s=JSON.parse(history.pop());}
    else {
      remember();
      if(a==='reset')s[s.tab]=clone(defaults[s.tab]);
      if(a==='preset')preset(b.dataset.preset);
      if(a==='new-exercise')newExercise();
      if(a==='remove-row'){const rows=s[s.tab].rows;if(rows.length>2)rows.splice(Number(b.dataset.row),1);}
      if(a==='add-row'){
        if(s.tab==='market'&&s.market.rows.length<40){const last=s.market.rows.at(-1),before=s.market.rows.at(-2),step=Math.max(1,last[0]-before[0]);if(last[1]<=0){const i=s.market.rows.length-1;s.market.rows.splice(i,0,last.map((v,j)=>(v+before[j])/2));}else s.market.rows.push([last[0]+step,Math.max(0,last[1]-(before[1]-last[1])),last[2]+Math.max(1,last[2]-before[2])]);}
        if(s.tab==='productivity'&&s.productivity.rows.length<12)s.productivity.rows.push(['Nueva intervención',0]);
      }
      s.answers[s.tab]=[];
    }
    feedback='';persist();render();return true;
  }
  function pointerdown(e) {
    if(!e.target.closest?.('[data-e-drag="price"]')||!plotMeta)return false;
    e.preventDefault();remember();const meta={...plotMeta},svg=document.getElementById('econ-chart'),matrix=svg.getScreenCTM().inverse(),abort=new AbortController();
    const move=event=>{const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix),price=Math.max(0,Math.min(meta.yMax,meta.yMin+(meta.H-meta.B-point.y)/(meta.H-meta.T-meta.B)*(meta.yMax-meta.yMin)));s.market.price=Math.round(price);s.answers.market=[];feedback='';document.querySelectorAll('[data-e-field="market.price"]').forEach(el=>el.value=s.market.price);updateOutput();};
    window.addEventListener('pointermove',move,{signal:abort.signal});
    const end=()=>{abort.abort();persist();};window.addEventListener('pointerup',end,{once:true,signal:abort.signal});window.addEventListener('pointercancel',end,{once:true,signal:abort.signal});
    return true;
  }
  function open(tab) { if(tabs.some(([id])=>id===tab))s.tab=tab;feedback=''; }
  let hoverCard;
  function clearExplanation() {
    if(hoverCard)hoverCard.hidden=true;
    document.querySelectorAll('.econ-interactive .is-active').forEach(el=>el.classList.remove('is-active'));
  }
  function explainAt(event) {
    const target=event.target.closest?.('#econ-lab [data-e-explain]');
    if(!target){clearExplanation();return;}
    const figure=target.closest('.econ-interactive'); if(!figure)return;
    clearExplanation();
    figure.querySelectorAll('[data-e-ref]').forEach(el=>el.classList.toggle('is-active',el.dataset.eRef===target.dataset.eRef));
    const reading=figure.querySelector('.econ-chart-reading');
    if(reading)reading.textContent=target.dataset.eExplain;
    if(!hoverCard){hoverCard=document.createElement('div');hoverCard.className='econ-hover-card';hoverCard.setAttribute('aria-hidden','true');document.body.appendChild(hoverCard);}
    hoverCard.textContent=target.dataset.eExplain;hoverCard.hidden=false;
    const rect=target.getBoundingClientRect(),px=event.type==='focusin'?rect.left:event.clientX,py=event.type==='focusin'?rect.bottom:event.clientY;
    hoverCard.style.left=Math.max(8,Math.min(px+14,innerWidth-hoverCard.offsetWidth-8))+'px';
    hoverCard.style.top=Math.max(8,Math.min(py+16,innerHeight-hoverCard.offsetHeight-8))+'px';
  }
  for(const type of ['pointerover','focusin','click'])globalThis.document?.addEventListener(type,explainAt);
  globalThis.document?.addEventListener('pointerout',e=>{if(e.target.closest?.('[data-e-explain]')&&!e.relatedTarget?.closest?.('[data-e-explain]'))clearExplanation();});
  globalThis.document?.addEventListener('focusout',e=>{if(e.target.closest?.('[data-e-explain]'))clearExplanation();});
  globalThis.document?.addEventListener('keydown',e=>{if(e.key==='Escape')clearExplanation();});
  globalThis.addEventListener?.('scroll',clearExplanation,true);
  let resizeTimer;globalThis.addEventListener?.('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(document.getElementById('econ-output'))updateOutput();},120)});
  return { html, handle, pointerdown, open };
})();
