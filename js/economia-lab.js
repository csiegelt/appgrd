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
  const tabs = [['market','Oferta y demanda'],['elasticity','Elasticidad'],['scale','Economías de escala'],['productivity','Productividad'],['monopoly','Monopolio'],['insurance','Seguros'],['grossman','Capital de salud']];
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
  const formula = text => s.formulas ? `<div class="econ-formula"><strong>Fórmula del modelo</strong><p>${text}</p></div>` : '';
  const stats = items => s.hide ? '<p class="econ-hint">Resultados ocultos. Resuelve el ejercicio y comprueba tu respuesta.</p>' : `<div class="econ-stats">${items.map(([name,value]) => `<div><span>${name}</span><strong>${value}</strong></div>`).join('')}</div>`;
  const help = (title, body) => `<details class="econ-help"><summary>${title}</summary>${body}</details>`;
  function chart(series, { title, xLabel = 'Cantidad (Q)', yLabel = 'Precio ($)', markers = [], lines = [], polygons = [], xMax, yMax, yMin = 0 } = {}) {
    const W = globalThis.innerWidth < 600 ? 360 : 620, H = 350, L = 62, R = 18, T = 30, B = 51;
    const all = [...series.flatMap(v => v.points), ...markers.map(v => [v.q,v.p])].filter(p => p.every(Number.isFinite));
    xMax ||= Math.max(1,...all.map(p=>p[0])) * 1.07;
    yMax ||= Math.max(1,...all.map(p=>p[1]), ...lines.map(l=>l.y)) * 1.13;
    const x = v => L + v / xMax * (W-L-R), y = v => H-B - (v-yMin)/(yMax-yMin)*(H-T-B);
    const tick = n => Math.abs(n) >= 10000 ? new Intl.NumberFormat('es-CL',{notation:'compact',maximumFractionDigits:1}).format(n) : f(n,1);
    plotMeta = { xMax, yMax, yMin, W, H, L, R, T, B };
    const path = points => points.filter(p=>p.every(Number.isFinite)).map(([q,p],i) => `${i ? 'L' : 'M'}${x(q).toFixed(2)},${y(p).toFixed(2)}`).join(' ');
    return `<figure class="econ-figure"><figcaption>${title}</figcaption><svg id="econ-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${h(title)}. Eje horizontal: ${h(xLabel)}. Eje vertical: ${h(yLabel)}."><title>${h(title)}</title><defs><clipPath id="econ-clip"><rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}"/></clipPath></defs>
      ${Array.from({length:5},(_,i)=>{const q=xMax*i/4,p=yMin+(yMax-yMin)*i/4;return `<line class="econ-grid" x1="${L}" x2="${W-R}" y1="${y(p)}" y2="${y(p)}"/><text x="${L-7}" y="${y(p)+4}" text-anchor="end">${tick(p)}</text><text x="${x(q)}" y="${H-B+21}" text-anchor="middle">${tick(q)}</text>`}).join('')}
      <path class="econ-axis" d="M${L},${T}V${H-B}H${W-R}"/><text x="${L}" y="17" class="econ-axis-title">${yLabel}</text><text x="${W-R}" y="${H-7}" text-anchor="end" class="econ-axis-title">${xLabel}</text>
      <g clip-path="url(#econ-clip)">${polygons.map(points=>`<path d="${path(points)}Z" fill="#dc5353" fill-opacity=".2" stroke="#b63131"/>`).join('')}
      ${series.map(v=>`<path d="${path(v.points)}" fill="none" stroke="${v.color}" stroke-width="${v.dash ? 2 : 3}" ${v.dash ? 'stroke-dasharray="6 5"' : ''}><title>${h(v.name)}</title></path>`).join('')}
      ${lines.map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v.y)}" y2="${y(v.y)}" stroke="${v.color||'#65716f'}" stroke-dasharray="4 4"/>`).join('')}</g>
      ${markers.filter(v=>v.q>=0 && v.q<=xMax && v.p>=yMin && v.p<=yMax).map(v=>`<g><circle cx="${x(v.q)}" cy="${y(v.p)}" r="${v.drag ? 8 : 5}" fill="${v.color||'#157568'}" stroke="white" stroke-width="2" tabindex="0" ${v.drag ? 'data-e-drag="price" class="econ-drag"' : ''} aria-label="${h(v.label)}: Q ${f(v.q)}, valor ${f(v.p)}"><title>${h(v.label)} · Q=${f(v.q)} · valor=${f(v.p)}${v.drag ? ' · Arrastra para cambiar el precio' : ''}</title></circle>${v.label && !s.hide ? `<text x="${x(v.q)+(v.q>xMax/2?-9:9)}" text-anchor="${v.q>xMax/2?'end':'start'}" y="${Math.max(T+12,y(v.p)-9)}" class="econ-point-label">${h(v.label)}</text>` : ''}</g>`).join('')}
      </svg><div class="econ-legend">${series.map(v=>`<span><i style="border-color:${v.color};border-top-style:${v.dash?'dashed':'solid'}"></i>${h(v.name)}</span>`).join('')}${polygons.length ? '<span><i style="border-color:#b63131"></i>Pérdida social (área)</span>' : ''}</div></figure>`;
  }
  function exercise(labels, values, steps, question) {
    expected = values; solution = steps;
    return `<section class="econ-exercise"><div class="econ-section-heading"><h4>Tu turno</h4>${button('new-exercise','Otro ejercicio')}</div><p>${question}</p><form id="econ-exercise-form"><div class="econ-sheet-scroll"><table class="econ-sheet"><caption>Sin separadores de miles · decimal con coma o punto · tolerancia 0,5%</caption><tbody>${labels.map((label,i)=>`<tr><th scope="row">${label}</th><td><input type="text" inputmode="decimal" aria-label="Respuesta: ${h(label)}" data-e-answer="${i}" placeholder="Tu cálculo" value="${h(s.answers?.[s.tab]?.[i] || '')}"></td></tr>`).join('')}</tbody></table></div><button type="submit" class="study-btn">Comprobar respuestas</button></form><div id="econ-feedback" role="status">${feedback}</div>${help('Ver solución paso a paso', `<p>${steps}</p>`)}</section>`;
  }
  function controls() {
    if (s.tab === 'market') return `<h4>1. Elige una situación</h4>${select('market.mode','Gráfico que quieres explorar',[['demand','Demanda'],['supply','Oferta'],['equilibrium','Equilibrio'],['shifts','Desplazamientos']])}<div class="econ-presets">${button('preset','Equilibrio del apunte','data-preset="market-doc"')}${button('preset','Bebida del apunte','data-preset="beverage"')}${button('preset','Consultas de salud','data-preset="health"')}</div><p class="econ-source-label">${h(s.market.name)}</p>
      <h4>2. Cambia los datos</h4><div class="econ-sheet-scroll"><table class="econ-sheet econ-market-table"><caption>Q horizontal · precios de demanda/oferta verticales</caption><thead><tr><th scope="col">Q</th><th scope="col">P demanda</th><th scope="col">P oferta</th><th scope="col"><span class="econ-sr">Quitar</span></th></tr></thead><tbody>${s.market.rows.map((r,i)=>`<tr>${r.map((v,j)=>`<td>${input(`market.rows.${i}.${j}`,`Fila ${i+1}, ${['cantidad Q','precio demanda','precio oferta'][j]}`)}</td>`).join('')}<td>${button('remove-row','×',`data-row="${i}" aria-label="Quitar fila ${i+1}" ${s.market.rows.length<=2?'disabled':''}`)}</td></tr>`).join('')}</tbody></table></div>${button('add-row','+ Fila',s.market.rows.length>=40?'disabled':'')}
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
    const plot=chart(series,{title:{demand:'Demanda · gráfico 2',supply:'Oferta · gráfico 3',equilibrium:'Equilibrio · gráfico 4',shifts:'Desplazamientos · gráfico 5'}[mode],markers,lines});
    const explanation=mode==='demand'?'Cambiar el precio observado mueve el punto sobre la misma demanda. La tabla define la curva.':mode==='supply'?'Cambiar el precio observado mueve el punto sobre la misma oferta. Una variación de costos puede desplazar toda la curva.':eq?`A ${money(s.market.price)}: ${Math.abs(gap)<1e-7?'oferta y demanda coinciden.':gap>0?`hay exceso de demanda de ${f(gap)} unidades.`:`hay exceso de oferta de ${f(-gap)} unidades.`}`:'No hay cruce con precio no negativo dentro del rango de la tabla. Amplía los datos o reduce los desplazamientos.';
    let out=plot+stats([...(drawDemand?[['Cantidad demandada',f(qd)]]:[]),...(drawSupply?[['Cantidad ofrecida',f(qs)]]:[]),...(eq&&drawDemand&&drawSupply?[['Equilibrio',`${money(eq.p)} · Q ${f(eq.q)}`]]:[])])+`<p class="econ-insight">${s.hide?'Predice qué cambia al mover el control y luego comprueba.':explanation}</p>`;
    if(model.clipped)out+=hint('El precio observado supera el rango de alguna curva. Las cantidades se muestran en el límite de la tabla; amplíala para cuantificar el exceso completo.');
    if(shifted)out+=hint(`Desplazamientos activos: demanda ${money(s.market.demandShift)}; oferta ${money(s.market.supplyShift)}. ${mode!=='shifts'?'Abre «Desplazamientos» para cambiarlos.':''}`);
    out+=formula('Entre dos filas: P(Q) = P₁ + (P₂ − P₁) × (Q − Q₁)/(Q₂ − Q₁). En equilibrio: Pdemanda(Q) = Poferta(Q).');
    out+=help('Cómo leer este gráfico', '<p>Q va horizontal y P vertical. Aumentar el precio propio produce un movimiento sobre la curva. Aumentar el precio de demanda en cada Q desplaza demanda arriba/derecha; aumentar costos desplaza oferta arriba/izquierda.</p><p>La bebida del gráfico 2 y el equilibrio del gráfico 4 usan ejemplos diferentes. El preset de equilibrio reproduce Q=3 a $900, exceso de oferta de 4 a $1.500 y exceso de demanda de 4 a $500. Las etiquetas se sitúan en las coordenadas calculadas.</p><p>Se interpola solo dentro de la tabla, sin extrapolar. Se permiten cantidades fraccionarias para practicar un modelo continuo.</p>');
    if(!model.clipped)out+=exercise(['Cantidad demandada','Cantidad ofrecida'],[qd,qs],`Ubica P=${money(s.market.price)} en el eje vertical. Interseca cada curva y lee Q en el horizontal: Qd=${f(qd)}, Qs=${f(qs)}. Resta Qd−Qs=${f(gap)}. Un resultado positivo indica exceso de demanda.`, `Con el precio observado de ${money(s.market.price)}, calcula ambas cantidades usando la tabla.`);
    return out;
  }
  function elasticityOutput() {
    const v=s.elasticity,r=M.elasticity(v);
    const series=[{name:'Dos observaciones (segmento)',color:'#315eb3',points:[[v.q1,v.p1],[v.q2,v.p2]]}];
    return chart(series,{title:'Elasticidad arco · consultas simuladas',markers:[{q:v.q1,p:v.p1,label:'A'},{q:v.q2,p:v.p2,label:'B',color:'#b45923'}]})+stats([['Elasticidad con signo',f(r.e,3)],['Según |E|',r.kind],['Ingreso total A',money(r.revenue1)],['Ingreso total B',money(r.revenue2)]])+`<p class="econ-insight">${s.hide?'Calcula cambios porcentuales con la base promedio.':`La cantidad cambia ${f(r.dq*100)}% y el precio ${f(r.dp*100)}% usando el punto medio. ${r.e>0?'Ambos cambian en el mismo sentido: revisa si también hubo cambios en otros determinantes.':'La clasificación describe este tramo, no toda la curva.'}`}</p>`+formula('E = [(Q₂−Q₁)/((Q₁+Q₂)/2)] ÷ [(P₂−P₁)/((P₁+P₂)/2)] · ingreso total = P × Q.')+help('Ayuda: pendiente, elasticidad e ingreso','<p>|E| &lt; 1: inelástica; |E| = 1: unitaria; |E| &gt; 1: elástica. El signo de una demanda decreciente suele ser negativo. La elasticidad no tiene unidades; cambiar pesos a miles de pesos no la altera.</p><p>Ingreso total no es utilidad: faltan los costos. Los puntos son un escenario didáctico y no una estimación causal.</p>')+exercise(['Elasticidad con signo','Ingreso total final ($)'],[r.e,r.revenue2],`ΔQ/promedio Q=${f(r.dq*100,3)}%. ΔP/promedio P=${f(r.dp*100,3)}%. Divide: E=${f(r.e,4)}. El ingreso final es ${money(v.p2)}×${f(v.q2)}=${money(r.revenue2)}.`, 'Calcula E con el método del punto medio y el ingreso total de B.');
  }
  function scaleOutput() {
    const v=s.scale,r=M.costs(v),max=Math.max(v.qa,v.qb,v.mode==='long'?v.q0:0)*1.4,min=Math.min(v.qa,v.qb)/2, points=Array.from({length:81},(_,i)=>min+(max-min)*i/80);
    const table=s.hide?'':`<div class="econ-sheet-scroll"><table class="econ-sheet econ-results"><caption>Comparación mensual · datos simulados</caption><thead><tr><th>Escenario</th><th>Q</th><th>Costo total</th><th>Costo/examen</th></tr></thead><tbody>${[['A',r.a],['B',r.b]].map(([name,p])=>`<tr><th>${name}</th><td>${f(p.q)}</td><td>${money(p.total)}</td><td>${money(p.average)}</td></tr>`).join('')}</tbody></table></div>`;
    const conclusion=v.mode==='long' ? v.alpha<1?'α < 1: economías de escala en este tramo.':v.alpha>1?'α > 1: deseconomías de escala en este tramo.':'α = 1: costo medio constante.' : 'A corto plazo se mantiene la capacidad. Diluir F entre más exámenes no demuestra por sí solo economías de escala de largo plazo.';
    return chart([{name:'Costo medio',color:'#315eb3',points:points.map(q=>[q,r.average(q)])},{name:'Costo marginal',color:'#c25718',points:points.map(q=>[q,r.marginal(q)])}],{title:v.mode==='long'?'Escala y costo por examen · largo plazo':'Volumen y costo por examen · corto plazo',xLabel:'Exámenes al mes (Q)',yLabel:'Costo por examen ($)',markers:[{q:r.a.q,p:r.a.average,label:'A'},{q:r.b.q,p:r.b.average,label:'B',color:'#6846a7'}]})+table+stats([['Cambio del costo medio A → B',r.change===null?'No definido (A=0)':f(r.change)+'%'],['Diferencia por examen',money(r.b.average-r.a.average)]])+`<p class="econ-insight">${conclusion}</p>`+formula(v.mode==='long'?'CT = C₀ × (Q/Q₀)^α · CMe = CT/Q · CMg = α × CT/Q.':'CT = F + vQ + kQ² · CMe = F/Q + v + kQ · CMg = v + 2kQ.')+help('Ayuda: dos preguntas económicas diferentes','<p>Corto plazo: ¿cómo cambia el costo al usar más la capacidad disponible? Largo plazo: ¿cómo cambia al adaptar todos los insumos y ampliar la organización?</p><p>Compara productos de igual calidad y complejidad. Más producción puede disminuir el costo por examen y, simultáneamente, aumentar el gasto total.</p><p>El modelo de largo plazo es una función ilustrativa para un tramo, no una predicción de crecimiento ilimitado. <a href="https://openstax.org/books/principles-microeconomics-3e/pages/7-5-costs-in-the-long-run" target="_blank" rel="noopener">Referencia: OpenStax, costos de largo plazo</a>.</p>')+exercise(['Costo medio A ($)','Costo medio B ($)',...(r.change===null?[]:['Variación del costo medio (%)'])],[r.a.average,r.b.average,...(r.change===null?[]:[r.change])],`1. Calcula CT para cada Q con la fórmula del modelo: CTA=${money(r.a.total)}; CTB=${money(r.b.total)}. 2. Divide por Q: ${money(r.a.total)}/${f(r.a.q)}=${money(r.a.average)}; ${money(r.b.total)}/${f(r.b.q)}=${money(r.b.average)}. 3. ${r.change===null?'El cambio porcentual no se define si el costo medio inicial es cero.':`(CMeB/CMeA−1)×100=${f(r.change)}%. Un signo negativo significa que B cuesta menos por examen.`}`, 'Calcula los costos medios y la variación de A a B. Usa el signo menos si disminuye.');
  }
  function productivityOutput() {
    if(!Array.isArray(s.productivity.rows)||s.productivity.rows.length<2||s.productivity.rows.length>12)throw Error('Usa entre 2 y 12 intervenciones.');
    const rows=s.productivity.rows;rows.forEach(r=>{if(typeof r[0]!=='string'||!r[0].trim())throw Error('Escribe un nombre para cada intervención.');M.number(r[1],'Índice marginal',-1000,1000)});
    const min=Math.min(0,...rows.map(r=>r[1])),max=Math.max(1,...rows.map(r=>r[1])),span=max-min,zero=-min/span*100;
    const bars=`<figure class="econ-figure"><figcaption>Aporte marginal · gráfico 1 del documento</figcaption><p class="econ-axis-description">X: índice ilustrativo · Y: intervención</p><div class="econ-bars">${rows.map(([name,value])=>{const start=Math.min(zero,(value-min)/span*100),width=Math.abs(value)/span*100;return `<div class="econ-bar-row"><span>${h(name)}</span><div class="econ-bar-track" role="img" aria-label="${h(name)}: ${f(value)} unidades ilustrativas"><i class="econ-bar-zero" style="left:${zero}%"></i><i class="econ-bar" style="left:${start}%;width:${width}%;background:${value<0?'#b93737':'#267b70'}"></i></div><strong>${s.hide?'?':f(value)}</strong></div>`}).join('')}</div></figure>`;
    return bars+`<p class="econ-insight">Positivo: una unidad agrega beneficio. Cero: no agrega beneficio neto. Negativo: el resultado neto empeora. Estas categorías no establecen prioridades clínicas universales.</p>`+formula('Productividad marginal = Δresultado de salud / Δunidades de atención, manteniendo los demás insumos constantes.')+help('Qué se conserva y qué se precisa del documento','<p>Se conservan sus cuatro categorías y los números 95, 80, 45 y −5. Se cambia el rótulo porcentual por «índice ilustrativo» porque el apunte no identifica una base de estimación. Puedes agregar otras intervenciones.</p><p>No sumes estas barras como si fueran etapas del mismo paciente. Iatrogenia significa daño por la atención y puede coexistir con un beneficio neto positivo.</p>')+exercise(['Número de aportes negativos'],[rows.filter(r=>r[1]<0).length],`Revisa qué valores están a la izquierda de cero. Hay ${rows.filter(r=>r[1]<0).length} aportes negativos en tu tabla.`, '¿Cuántas intervenciones de tu escenario tienen un aporte marginal negativo?');
  }
  function monopolyOutput() {
    const v=s.monopoly,r=M.monopoly(v),end=v.a/v.b;
    const series=[{name:'Demanda',color:'#315eb3',points:[[0,v.a],[end,0]]},{name:'Ingreso marginal',color:'#8054ac',dash:true,points:[[0,v.a],[end/2,0]]},{name:'Costo marginal',color:'#c25718',points:[[0,v.c],[end,v.c+v.d*end]]}];
    const markers=r.trade?[{q:r.qc,p:r.pc,label:'C',color:'#147568'},{q:r.qm,p:r.pm,label:'M',color:'#b93737'},{q:r.qm,p:v.c+v.d*r.qm,label:'IMg=CMg',color:'#8054ac'}]:[];
    return chart(series,{title:'Monopolio y competencia · gráfico 6',markers,polygons:r.trade?[[[r.qm,v.c+v.d*r.qm],[r.qm,r.pm],[r.qc,r.pc]]]:[],yMax:Math.max(v.a,v.c)*1.15})+stats([['Competencia Q / P',r.trade?`${f(r.qc)} / ${money(r.pc)}`:'Sin producción positiva'],['Monopolio Q / P',r.trade?`${f(r.qm)} / ${money(r.pm)}`:'Sin producción positiva'],['Pérdida social',money(r.dwl)]])+`<p class="econ-insight">${r.trade?'Lee M en la demanda, encima del cruce IMg=CMg. El área sombreada representa beneficios netos de intercambios que no se realizan.':'La disposición máxima a pagar no supera el costo marginal inicial. No hay producción positiva rentable en este modelo.'}</p>`+formula('Qc = (a−c)/(b+d) · Qm = (a−c)/(2b+d) · Pm = a−bQm · pérdida = ½(Qc−Qm)[Pm−CMg(Qm)].')+help('Ayuda: por qué el monopolista reduce cantidad','<p>En un monopolio de precio único, vender una unidad más reduce el precio de todas las unidades. Por eso el ingreso marginal está debajo de la demanda. La regla IMg=CMg determina la cantidad; la demanda determina el precio.</p><p>La referencia competitiva comparte demanda y costos. Se omiten costos fijos, discriminación de precios y externalidades; no se calcula utilidad neta.</p>')+(r.trade?exercise(['Cantidad del monopolio','Precio del monopolio ($)'],[r.qm,r.pm],`Qm=(${f(v.a)}−${f(v.c)})/(2×${f(v.b)}+${f(v.d)})=${f(r.qm)}. Luego Pm=${f(v.a)}−${f(v.b)}×${f(r.qm)}=${money(r.pm)}.`, 'Iguala IMg y CMg; después busca el precio sobre la demanda.'):'');
  }
  function insuranceOutput() {
    const v=s.insurance,r=M.insurance(v),slope=v.slope,series=slope?[{name:'Demanda según precio de bolsillo',color:'#315eb3',points:[[0,v.intercept/slope],[v.intercept,0]]}]:[{name:'Demanda insensible al precio',color:'#315eb3',points:[[v.intercept,0],[v.intercept,v.price*1.2]]}];
    return chart(series,{title:'Copago y uso de consultas',yLabel:'Precio de bolsillo ($)',xLabel:'Consultas al mes (Q)',yMax:Math.max(v.price*1.15,slope?Math.min(v.intercept/slope,v.price*2):0),markers:[{q:r.without,p:v.price,label:'Sin cobertura',color:'#687770'},{q:r.q,p:r.patientPrice,label:'Con cobertura',color:'#147568'}],lines:[{y:r.patientPrice}]})+stats([['Precio de bolsillo',money(r.patientPrice)],['Consultas',f(r.q)],['Gasto de pacientes',money(r.patient)],['Gasto del asegurador',money(r.insurer)]])+`<p class="econ-insight">${s.hide?'Calcula cómo se distribuye el gasto entre pacientes y asegurador.':`Gasto total ${money(r.total)} = pacientes ${money(r.patient)} + asegurador ${money(r.insurer)}. El copago cambia quién financia y, en este modelo, cuánto se demanda.`}</p>`+formula('Pbolsillo = P × copago/100 · Q = máx(0, A−B×Pbolsillo) · gasto del asegurador = Q × (P−Pbolsillo).')+help('Ayuda: cobertura, riesgo moral y RAND','<p>Más utilización tras ampliar cobertura puede reflejar una respuesta al precio. El modelo no determina si esa atención es necesaria o efectiva. No incluye primas, topes, deducibles ni restricciones de oferta.</p><p>RAND encontró que los copagos reducían atención efectiva y menos efectiva. No se puede concluir que toda atención evitada fuera innecesaria. <a href="https://www.rand.org/pubs/research_briefs/RB9174.html" target="_blank" rel="noopener">Fuente primaria: RAND Health Insurance Experiment</a>.</p>')+exercise(['Consultas demandadas','Gasto del asegurador ($)'],[r.q,r.insurer],`Pbolsillo=${money(v.price)}×${f(v.copay)}%=${money(r.patientPrice)}. Q=máx(0,${f(v.intercept)}−${f(v.slope,5)}×${f(r.patientPrice)})=${f(r.q)}. Gasto asegurador=${f(r.q)}×(${f(v.price)}−${f(r.patientPrice)})=${money(r.insurer)}.`, 'Calcula la demanda y el gasto mensual del asegurador con este copago.');
  }
  function grossmanOutput() {
    const v=s.grossman,rows=M.grossman(v),last=rows.at(-1);
    return chart([{name:'Con inversión constante',color:'#147568',points:rows.map(r=>[r[0],r[1]])},{name:'Sin inversión',color:'#8b7373',dash:true,points:rows.map(r=>[r[0],r[2]])}],{title:'Evolución del capital de salud',xLabel:'Períodos',yLabel:'Índice abstracto H',markers:[{q:last[0],p:last[1],label:'Con I'},{q:last[0],p:last[2],label:'Sin I',color:'#8b7373'}]})+stats([['Stock en el período 1',f(rows[1][1])],['Stock final con inversión',f(last[1])],['Stock final sin inversión',f(last[2])]])+formula('H(t+1) = H(t) × (1 − δ/100) + I. Para mantener el stock de hoy: I = H(t) × δ/100.')+help('Ayuda: unidades y significado','<p>El porcentaje de depreciación se aplica al stock de cada período, no siempre al inicial. La inversión se suma después. I ya está expresada como aporte al stock, no como gasto monetario.</p><p>La curva permite entender el mecanismo de Grossman; no estima el envejecimiento ni la salud de una persona real.</p>')+exercise(['Stock del período 1','Inversión para mantener el stock inicial'],[rows[1][1],v.initial*v.delta/100],`H₁=${f(v.initial)}×(1−${f(v.delta)}/100)+${f(v.investment)}=${f(rows[1][1])}. Para mantener H₀ se debe compensar su depreciación: I=${f(v.initial)}×${f(v.delta)}/100=${f(v.initial*v.delta/100)}.`, 'Calcula el primer período y la inversión que evitaría perder stock respecto del valor inicial.');
  }
  function output() {
    expected=[];solution='';plotMeta=null;
    try { return ({market:marketOutput,elasticity:elasticityOutput,scale:scaleOutput,productivity:productivityOutput,monopoly:monopolyOutput,insurance:insuranceOutput,grossman:grossmanOutput}[s.tab])(); }
    catch(err) { return `<div class="econ-error" role="alert"><strong>Revisa los datos</strong><p>${h(err.message)}</p><p>Corrige la celda o usa Deshacer para continuar.</p></div>`; }
  }
  function html() {
    return `<section id="econ-lab" class="econ-lab"><div class="econ-heading"><div><span class="study-eyebrow">ECONOMÍA DE LA SALUD · LABORATORIO</span><h2>Modifica, observa y comprende</h2><p>Explora los gráficos del apunte y resuelve situaciones de salud.</p></div><span class="econ-source-tag">Documento + práctica guiada</span></div><nav class="econ-tabs" aria-label="Laboratorios de economía">${tabs.map(([id,name])=>button('tab',name,`data-tab="${id}" aria-pressed="${s.tab===id}"`,s.tab===id)).join('')}</nav><div class="econ-toolbar"><div>${check('formulas','Mostrar fórmulas')}${check('hide','Ocultar resultados para practicar')}</div><div>${button('undo','Deshacer',history.length?'':'disabled')}${button('reset','Restablecer este laboratorio')}${button('download','Descargar datos')}</div></div><div class="econ-layout"><aside class="econ-controls" aria-label="Datos del laboratorio">${controls()}</aside><div class="econ-output" id="econ-output" aria-live="polite">${output()}</div></div><p id="econ-save" class="econ-save">${notice||'Los cambios se guardan en este navegador.'}</p><p class="econ-source-note">Base: RESUMEN ECONOMIA CLAUDE.docx. Los seis gráficos se reconstruyen con coordenadas calculadas; los escenarios de salud son simulados. Los controles y las ayudas funcionan sin IA.</p></section>`;
  }
  function render() {
    const el=document.getElementById('econ-lab');if(el)el.outerHTML=html();
  }
  function updateOutput() {
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
  let resizeTimer;globalThis.addEventListener?.('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(document.getElementById('econ-output'))updateOutput();},120)});
  return { html, handle, pointerdown, open };
})();
