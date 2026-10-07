/* Editable economics lessons. All examples and curves are illustrative; no remote calls. */
const EconomiaElasticidad = (() => {
  const M = EconomiaModelos;
  const views = [['demand','Demanda'],['supply','Oferta'],['revenue','Ingresos: comparar'],['linear','Demanda lineal'],['shifts','Trigo y petróleo'],['other','Ingreso y elasticidad cruzada']];
  const cases = [['zero','Perfectamente inelástica · 0'],['inelastic','Inelástica · menor que 1'],['unit','Unitaria · 1'],['elastic','Elástica · mayor que 1'],['infinite','Perfectamente elástica · ∞']];
  function preset(s, name) {
    const [side, type] = name.split(':');
    if(side==='shift'){
      s.view='shifts';Object.assign(s.shift,type==='wheat'?{example:'wheat',p0:3,q0:100,change:20,ed:.3,es:.3}:{example:'oil',p0:50,q0:100,change:-10,ed:.2,es:.2,longEd:1,longEs:1});return;
    }
    if(!['demand','supply'].includes(side)||!cases.some(([id])=>id===type))return;
    s.view=side;const target=side==='demand'?s:s.supply;
    Object.assign(target,{p1:4,p2:type==='infinite'?4:5,q1:100,q2:(side==='demand'?{zero:100,inelastic:90,unit:80,elastic:70,infinite:140}:{zero:100,inelastic:110,unit:125,elastic:200,infinite:140})[type]});
  }
  function controls({s,select,sheet,range,button,hint}) {
    const v=s.elasticity,tab=v.view;
    const choose=select('elasticity.view','Qué quieres explorar',views);
    const pair=(prefix,caption,x='Precio ($)',q='Cantidad')=>sheet([[x+' inicial',prefix+'.p1',0],[x+' final',prefix+'.p2',0],[q+' inicial',prefix+'.q1',0],[q+' final',prefix+'.q2',0]],caption);
    if(tab==='revenue')return choose+'<h4>Dos demandas, el mismo cambio de precio</h4>'+pair('elasticity.compare.a','Panel A · ejemplo 100 → 90')+pair('elasticity.compare.b','Panel B · ejemplo 100 → 70')+hint('Los dos paneles se recalculan al editar. Sus ejes comparten escala para poder comparar las áreas.');
    if(tab==='linear')return choose+'<h4>Define la recta P = a − bQ</h4>'+sheet([['Precio máximo a ($)','elasticity.linear.intercept',.01],['Cantidad a precio cero','elasticity.linear.quantity',.01],['Número de tramos','elasticity.linear.segments',2,20,1]],'Interceptos positivos; b = a / cantidad a precio cero')+range('elasticity.linear.segment','Tramo A → B (0 es el primero)',0,Math.max(1,v.linear.segments-1),1)+hint('Mueve el selector y compara el tramo destacado con la tabla. La pendiente es constante; la elasticidad cambia.');
    if(tab==='shifts')return choose+`<div class="econ-presets">${button('preset','Trigo · más oferta','data-preset="elasticity-shift:wheat"')}${button('preset','Petróleo · menos oferta','data-preset="elasticity-shift:oil"')}</div>`+sheet([['Precio inicial ($)','elasticity.shift.p0',.01],['Cantidad inicial','elasticity.shift.q0',.01]],'Mismo equilibrio de partida')+range('elasticity.shift.change','Cambio de oferta (% de Q inicial)',-80,80,1)+sheet([['|Ed| inicial · '+(v.shift.example==='oil'?'corto plazo':'demanda'),'elasticity.shift.ed',.01,10,.01],['Es inicial · '+(v.shift.example==='oil'?'corto plazo':'oferta'),'elasticity.shift.es',.01,10,.01]],'Sensibilidad en el punto inicial')+(v.shift.example==='oil'?sheet([['|Ed| inicial · largo plazo','elasticity.shift.longEd',.01,10,.01],['Es inicial · largo plazo','elasticity.shift.longEs',.01,10,.01]],'Segundo horizonte, editable'):'')+hint('Positivo: más cantidad ofrecida a cada precio. Negativo: menos. Las elasticidades fijan las pendientes alrededor del equilibrio inicial; no son constantes en toda la recta.');
    if(tab==='other')return choose+select('elasticity.other.mode','Cambio que explica la cantidad',[['income','Ingreso del consumidor'],['cross','Precio de otro bien']])+pair('elasticity.other','Los demás determinantes se mantienen constantes',v.other.mode==='income'?'Ingreso ($)':'Precio del otro bien ($)','Cantidad del bien estudiado')+hint('Ejemplos de práctica: puedes cambiar los cuatro valores. Una relación observada no demuestra por sí sola causalidad.');
    const side=tab==='supply'?'supply':'demand';
    const prefix=side==='demand'?'elasticity':'elasticity.supply',values=side==='demand'?v:v.supply;
    return choose+`<h4>Elige un caso y edítalo</h4><div class="econ-elastic-presets">${cases.map(([id,label])=>button('preset',label,`data-preset="elasticity-${side}:${id}"`)).join('')}</div>`+
      sheet([['Precio inicial ($)',prefix+'.p1',0],['Cantidad inicial',prefix+'.q1',0]],side==='demand'?'Cantidad demandada por período':'Cantidad ofrecida por período')+
      range(prefix+'.p2','Precio final ($)',0,Math.max(10,values.p1*2,values.p2*2),.1)+range(prefix+'.q2','Cantidad final',0,Math.max(200,values.q1*2,values.q2*2),1)+
      hint('A es el estado inicial y B el final. Mueve los deslizadores o escribe un valor. Se permiten ceros para estudiar los extremos. Las etiquetas permanecen fuera de las tarjetas.');
  }
  function output(ui) {
    const {s,help}=ui,v=s.elasticity;
    const body=v.view==='linear'?linear(ui):v.view==='revenue'?comparison(ui):v.view==='shifts'?shifts(ui):v.view==='other'?other(ui):pairOutput(ui,v.view==='supply'?v.supply:v,v.view==='supply'?'supply':'demand');
    return body+help('Qué cambia la elasticidad y cómo interpretar los ejemplos',
      '<p><strong>Demanda:</strong> disponibilidad de sustitutos, proporción del presupuesto, definición del mercado y tiempo para adaptarse. Una necesidad no significa demanda perfectamente inelástica: también importan ingreso y acceso.</p><p><strong>Oferta:</strong> capacidad disponible, inventarios, movilidad de insumos y tiempo para ampliar producción. A corto plazo puede ser difícil responder; a largo plazo suele haber más alternativas, sin que sea una regla universal.</p><p><strong>En salud:</strong> las consultas de una clínica pueden tener más sustitutos que un tratamiento necesario en general; un hospital con camas ocupadas puede responder poco hoy y ampliar capacidad con tiempo. Son ejemplos conceptuales, no elasticidades clínicas estimadas.</p><p><strong>Precio propio:</strong> provoca un movimiento sobre la curva. Ingreso, tecnología o costos pueden desplazarla. Dos equilibrios no identifican por sí solos la elasticidad: hay que saber qué curva se mantuvo.</p><p><strong>Aplicación a impuestos:</strong> en el modelo competitivo básico, el lado relativamente menos elástico soporta más carga económica; no depende solo de quién paga legalmente el impuesto.</p>')+
      '<p class="econ-source-note">Contenido y gráficos originales de práctica, inspirados en las figuras aportadas. Referencias: <a href="https://openstax.org/books/principles-economics-3e/pages/5-1-price-elasticity-of-demand-and-price-elasticity-of-supply" target="_blank" rel="noopener">cálculo y pendiente</a>, <a href="https://openstax.org/books/principles-economics-3e/pages/5-2-polar-cases-of-elasticity-and-constant-elasticity" target="_blank" rel="noopener">casos extremos</a>, <a href="https://openstax.org/books/principles-economics-3e/pages/5-3-elasticity-and-pricing" target="_blank" rel="noopener">ingresos y aplicaciones</a> y <a href="https://openstax.org/books/principles-economics-3e/pages/5-4-elasticity-in-areas-other-than-price" target="_blank" rel="noopener">ingreso y elasticidad cruzada</a>.</p>';
  }
  const value=(e,f)=>e===null?'No definida':Math.abs(e)===Infinity?'∞':f(e,3);
  function curve(v,maxQ,maxP) {
    if(v.q1===v.q2)return [[v.q1,0],[v.q1,maxP]];
    if(v.p1===v.p2)return [[0,v.p1],[maxQ,v.p1]];
    if(Math.min(v.p1,v.p2,v.q1,v.q2)>0){
      const power=Math.log(v.p2/v.p1)/Math.log(v.q2/v.q1);
      // Positive power curve through both observations; the reported number is still ARC elasticity.
      // Keep very steep extrapolations out of the SVG path: huge coordinates
      // can make browsers lose the entire curve, even with a clipPath.
      const topQ=v.q1*(maxP/v.p1)**(1/power);
      return [...Array.from({length:100},(_,i)=>{const q=maxQ*(i+1)/100;return [q,v.p1*(q/v.q1)**power];}),[v.q1,v.p1],[v.q2,v.p2],[topQ,maxP]]
        .filter(([q,p])=>Number.isFinite(q)&&Number.isFinite(p)&&q>=0&&q<=maxQ&&p>=0&&p<=maxP).sort((a,b)=>a[0]-b[0]);
    }
    return [[v.q1,v.p1],[v.q2,v.p2]];
  }
  function revenueAreas(v,r) {
    const rect=(left,right,bottom,top)=>[[left,bottom],[left,top],[right,top],[right,bottom]];
    const areas=[];
    if(r.priceEffect!==0&&r.priceQuantity>0)areas.push({name:r.priceEffect>0?'Ingreso ganado por precio':'Ingreso perdido por precio',value:Math.abs(r.priceEffect),color:r.priceEffect>0?'#147568':'#a12c39',hatch:r.priceEffect<0,points:rect(0,r.priceQuantity,Math.min(v.p1,v.p2),Math.max(v.p1,v.p2)),help:'Cambio del precio multiplicado por '+(v.p2>=v.p1?'la cantidad final: (P₂ − P₁) × Q₂.':'la cantidad inicial: (P₂ − P₁) × Q₁.')+' Es ingreso, no utilidad.'});
    if(r.quantityEffect!==0&&r.quantityPrice>0)areas.push({name:r.quantityEffect>0?'Ingreso ganado por cantidad':'Ingreso perdido por cantidad',value:Math.abs(r.quantityEffect),color:r.quantityEffect>0?'#147568':'#a12c39',hatch:r.quantityEffect<0,points:rect(Math.min(v.q1,v.q2),Math.max(v.q1,v.q2),0,r.quantityPrice),help:'Cambio de cantidad valorado al menor de los dos precios: mín(P₁, P₂) × (Q₂ − Q₁). Esta descomposición evita superponer áreas y reproduce exactamente el cambio de ingreso.'});
    return areas;
  }
  function pairOutput(ui,v,side,{id='econ-chart',compact=false,title,xMax,yMax,practice=true}={}) {
    const {s,chart,stats,formula,exercise,f,money,vv,vm}=ui,r=M.elasticity(v),demand=side==='demand';
    const abnormal=Number.isFinite(r.e)&&r.e!==0&&(demand?r.e>0:r.e<0);
    const name=demand?'Demanda':'Oferta',prefix=demand?'Cantidad demandada':'Cantidad ofrecida';
    xMax=xMax||Math.max(1,v.q1,v.q2)*1.3;yMax=yMax||Math.max(1,v.p1,v.p2)*1.4;
    const plot=chart([{name:name+' ilustrativa',color:demand?'#315eb3':'#bc5a1c',points:curve(v,xMax,yMax),help:'Curva ilustrativa que une A y B; la elasticidad que se informa usa el método del punto medio entre esas dos observaciones.'}],{
      id,compact,title:title||name+' · del punto A al punto B',xLabel:prefix+' (Q)',
      xMax,yMax,
      markers:[{q:v.q1,p:v.p1,label:'A',help:'Situación inicial. Su rectángulo de ingreso tiene base Q₁ y altura P₁.'},{q:v.q2,p:v.p2,label:'B',color:'#b45923',help:'Situación final. Compara precio y cantidad con A. Las guías llevan a ambos ejes.'}],areas:demand?revenueAreas(v,r):[]});
    let explanation=r.e===null?'No se puede calcular: ambas observaciones son iguales o alguno de los promedios usados como base es cero.':r.e===Infinity?'ΔP = 0: dos cantidades a igual precio representan el caso horizontal ideal, de elasticidad infinita. No es una división finita ni prueba empírica suficiente.':r.magnitude===0?'La cantidad no cambia aunque cambie el precio: caso vertical, perfectamente inelástico.':`${name} ${r.kind.toLowerCase()} en este tramo: la cantidad cambia ${f(r.dq*100)} % y el precio ${f(r.dp*100)} %, usando sus promedios.`;
    if(abnormal)explanation='El signo no corresponde a una '+(demand?'demanda decreciente':'oferta creciente')+'. Revisa los datos o si cambió otro determinante; no interpretes esta comparación como un movimiento típico sobre esa curva.';
    let result=plot+stats([['Elasticidad con signo',value(r.e,f)],['Según |E|',r.kind],['Ingreso total A',money(r.revenue1)],['Ingreso total B',money(r.revenue2)]])+`<p class="econ-insight">${s.hide?'Calcula los cambios porcentuales con sus bases promedio.':explanation}</p>`;
    if(demand&&!s.hide)result+=`<div class="econ-revenue-balance"><strong>Ingreso final − ingreso inicial = ${money(r.revenueChange)}</strong><p>${money(r.priceEffect)} por precio + ${money(r.quantityEffect)} por cantidad = ${money(r.revenueChange)}.</p><p>${r.revenueChange>0?'Se gana más ingreso del que se pierde.':r.revenueChange<0?'Se pierde más ingreso del que se gana.':'Los efectos se compensan: el ingreso total no cambia.'} El ingreso total es P × Q; la utilidad requiere restar costos.</p></div>`;
    if(!demand)result+='<p class="econ-insight">En oferta, normalmente P y Q cambian en el mismo sentido. A un precio dado, Qs representa lo que se desea ofrecer; P × Qs sería ingreso si se vende esa cantidad. Este panel no calcula el equilibrio con una demanda.</p>';
    result+=formula('E = [(Q₂ − Q₁) / promedio Q] ÷ [(P₂ − P₁) / promedio P].',[
      [`%ΔQ = (${vv(v.q2)} − ${vv(v.q1)}) / ((${vv(v.q2)} + ${vv(v.q1)}) / 2) × 100`,r.dq===null?'No definido':f(r.dq*100,3)+' %'],
      [`%ΔP = (${vm(v.p2)} − ${vm(v.p1)}) / ((${vm(v.p2)} + ${vm(v.p1)}) / 2) × 100`,r.dp===null?'No definido':f(r.dp*100,3)+' %'],
      ['E = %ΔQ / %ΔP',value(r.e,f)],['Ingreso A = P₁ × Q₁',money(r.revenue1)],['Ingreso B = P₂ × Q₂',money(r.revenue2)]]);
    result+='<p class="econ-hint">El signo indica dirección; el valor absoluto clasifica la sensibilidad. La inclinación visual depende de las unidades y de la escala de los ejes. No permite clasificar por sí sola.</p>';
    if(practice&&Number.isFinite(r.e))result+=exercise(['Elasticidad con signo','Ingreso total final ($)'],[r.e,r.revenue2],`%ΔQ=${f(r.dq*100,3)}%; %ΔP=${f(r.dp*100,3)}%; E=${f(r.e,4)}. P₂ × Q₂=${money(r.revenue2)}.`, 'Calcula la elasticidad arco con signo y el ingreso final.');
    return result;
  }
  function comparison(ui) {
    const {a,b}=ui.s.elasticity.compare,xMax=Math.max(1,a.q1,a.q2,b.q1,b.q2)*1.3,yMax=Math.max(1,a.p1,a.p2,b.p1,b.p2)*1.4;
    return '<h3>¿Subir el precio aumenta los ingresos?</h3><p>Edita cada panel. Verde: ingreso ganado. Rojo rayado: ingreso perdido. Se compara el tamaño de las áreas, con los mismos ejes.</p><div class="econ-compare-grid"><section class="econ-comparison">'+
      pairOutput(ui,a,'demand',{id:'econ-chart',compact:true,title:'Panel A · primer escenario',xMax,yMax,practice:false})+
      '</section><section class="econ-comparison">'+pairOutput(ui,b,'demand',{id:'econ-compare-b',compact:true,title:'Panel B · segundo escenario',xMax,yMax,practice:false})+'</section></div>';
  }
  function linear(ui) {
    const {s,chart,stats,f,money,formula}=ui,v=s.elasticity.linear,r=M.linearElasticity(v),a=r.rows[v.segment],b=r.rows[v.segment+1];
    const display=x=>s.hide?'?':x;
    let result=chart([
      {name:'Zona elástica · |E puntual| > 1',color:'#7552a3',points:[[0,v.intercept],[r.unit.q,r.unit.p]],help:'Parte alta de la recta: el precio es alto respecto de la cantidad. La elasticidad puntual supera uno en magnitud.'},
      {name:'Zona inelástica · |E puntual| < 1',color:'#147568',points:[[r.unit.q,r.unit.p],[v.quantity,0]],help:'Parte baja de la recta: precio bajo y cantidad alta. La elasticidad puntual es menor que uno.'},
      {name:'Tramo elegido A → B',color:'#c25718',points:[[a.q,a.p],[b.q,b.p]],help:'La elasticidad arco se calcula con los promedios de este tramo. No es el valor puntual de uno de sus extremos.'}
    ],{title:'Misma pendiente, distinta elasticidad',xMax:v.quantity*1.08,yMax:v.intercept*1.12,markers:[{q:a.q,p:a.p,label:'A'},{q:b.q,p:b.p,label:'B',color:'#c25718'},{q:r.unit.q,p:r.unit.p,label:'U',color:'#7552a3',help:'Mitad de la recta. Elasticidad puntual de magnitud uno; aquí P × Q alcanza su máximo.'}]});
    result+=stats([['Elasticidad arco A → B',value(r.selected.e,f)],['Clasificación del tramo',r.selected.kind],['Elasticidad puntual en A',a.point===Infinity?'∞ (límite al acercarse)':f(a.point,3)],['Ingreso máximo',money(r.maximumRevenue)]]);
    result+='<div class="econ-sheet-scroll"><table class="econ-sheet econ-elastic-table"><caption>Precio y cantidad en cada punto; porcentajes y elasticidad del tramo hacia la fila siguiente. Método del punto medio.</caption><thead><tr><th>P</th><th>Q</th><th>P × Q</th><th>%ΔP</th><th>%ΔQ</th><th>|E arco|</th><th>Tramo siguiente</th></tr></thead><tbody>'+r.rows.map((row,i)=>`<tr ${i===v.segment?'class="econ-selected-row" aria-current="true"':''}><td>${display(money(row.p))}</td><td>${display(f(row.q))}</td><td>${display(money(row.revenue))}</td><td>${display(row.arc?f(row.arc.dp*100,2)+' %':'—')}</td><td>${display(row.arc?f(row.arc.dq*100,2)+' %':'—')}</td><td>${display(row.arc?value(row.arc.magnitude,f):'—')}</td><td>${display(row.arc?row.arc.kind:'Fin de la recta')}</td></tr>`).join('')+'</tbody></table></div>';
    result+=chart([{name:'Ingreso total P × Q',color:'#315eb3',points:Array.from({length:81},(_,i)=>{const q=v.quantity*i/80;return [q,(v.intercept-v.intercept/v.quantity*q)*q]}),help:'Al recorrer la demanda lineal, el ingreso primero sube y luego baja. El máximo está en el punto de elasticidad puntual unitaria.'}],{id:'econ-linear-revenue',title:'El ingreso total alcanza un máximo',xLabel:'Cantidad (Q)',yLabel:'Ingreso total ($)',markers:[{q:r.unit.q,p:r.maximumRevenue,label:'Máximo',help:'Máximo ingreso, no máxima utilidad: no se han incluido costos.'}]});
    result+=formula('P = a − bQ; b = a / Qmáx. |E puntual| = P / (bQ). IT = aQ − bQ².',[['Pendiente ΔP/ΔQ',f(r.slope,4)],['Punto U: Qmáx/2 y a/2',`${f(r.unit.q)} · ${money(r.unit.p)}`],['IT máximo = a × Qmáx / 4',money(r.maximumRevenue)]]);
    return result+'<p class="econ-insight">La pendiente se mantiene constante; la elasticidad compara porcentajes y cambia con P/Q. En Q = 0 la fórmula puntual no está definida: su magnitud tiende a infinito al acercarse desde Q positivo. En P = 0 y Q positivo, vale cero. La elasticidad arco de cada tramo se muestra separada del valor puntual.</p>';
  }
  function shifts(ui) {
    const {s,chart,stats,f,money}=ui,v=s.elasticity.shift;
    const input={p0:v.p0,q0:v.q0,shift:v.change,ed:v.ed,es:v.es};
    const scenarios=[{title:v.example==='oil'?'Petróleo · corto plazo':'Trigo · cambio de oferta',r:M.elasticityShift(input)}];
    if(v.example==='oil')scenarios.push({title:'Petróleo · largo plazo',r:M.elasticityShift({...input,ed:v.longEd,es:v.longEs})});
    const xMax=Math.max(v.q0,...scenarios.map(x=>x.r.q))*1.35,yMax=Math.max(v.p0,...scenarios.map(x=>x.r.p))*1.35;
    return '<h3>La oferta se desplaza; la demanda se mantiene</h3><p>El cambio horizontal se mide en unidades de Q a cada precio. Los paneles comparten equilibrio inicial y escalas.</p>'+scenarios.map(({title,r},i)=>{
      const points=fn=>Array.from({length:61},(_,j)=>{const q=xMax*j/60;return [q,fn(q)]});
      return chart([{name:'Demanda',color:'#315eb3',points:points(r.demand)},
        {name:'Oferta inicial O₁',color:'#147568',dash:true,points:points(r.supply),help:'Oferta antes del cambio. No es un movimiento provocado por el precio: se compara con una nueva curva.'},
        {name:'Oferta final O₂',color:'#a12c39',points:points(r.shifted),help:'La cantidad ofrecida cambia a cada precio. El cruce con la misma demanda determina el nuevo equilibrio.'}],{id:i?'econ-oil-long':'econ-chart',title,xMax,yMax,markers:[{q:v.q0,p:v.p0,label:'E₁',help:'Equilibrio antes del desplazamiento.'},{q:r.q,p:r.p,label:'E₂',color:'#a12c39',help:'Nuevo equilibrio. El cambio de precio mueve la cantidad demandada sobre la misma curva.'}]})+
        stats([['Precio inicial → final',`${money(v.p0)} → ${money(r.p)}`],['Cantidad inicial → final',`${f(v.q0)} → ${f(r.q)}`],['Ingreso inicial → final',`${money(r.revenue0)} → ${money(r.revenue)}`],['Cambio de precio',f((r.p/v.p0-1)*100)+' %']])+
        (s.hide?'':`<p class="econ-insight">La oferta cambia ${f(r.delta)} unidades a cada precio. El ingreso de los vendedores ${r.revenue>r.revenue0?'aumenta':r.revenue<r.revenue0?'disminuye':'no cambia'}: ${money(r.revenue-r.revenue0)} de diferencia. ${v.example==='wheat'?'Una cosecha mayor puede reducir el ingreso conjunto si la caída del precio domina el aumento de cantidad.':'Compara la variación del precio con el otro horizonte, manteniendo el mismo desplazamiento horizontal.'}</p>`);
    }).join('')+'<p class="econ-hint">Modelos lineales locales y números simulados: no pronostican mercados reales. Si editas las sensibilidades, el resultado puede cambiar; corto y largo plazo son los escenarios seleccionados, no garantías sobre su orden.</p>';
  }
  function other(ui) {
    const {s,chart,stats,formula,f}=ui,v=s.elasticity.other,r=M.elasticity(v),income=v.mode==='income';
    const kind=r.e===null||!Number.isFinite(r.e)?'No se puede clasificar con estos datos':income?r.e<0?'Bien inferior':r.e===0?'Sin respuesta al ingreso':Math.abs(r.e-1)<1e-8?'Bien normal: respuesta proporcional':r.e>1?'Bien normal de lujo':'Bien normal de necesidad':r.e>0?'Sustitutos':r.e<0?'Complementos':'Sin relación observada';
    return chart([{name:income?'Cantidad e ingreso':'Cantidad y precio de otro bien',color:'#7552a3',points:[[v.p1,v.q1],[v.p2,v.q2]],help:'La variable horizontal cambia; observa la respuesta de cantidad del bien estudiado. Mantén los otros determinantes constantes.'}],{title:income?'Elasticidad ingreso de la demanda':'Elasticidad cruzada de la demanda',xLabel:income?'Ingreso ($)':'Precio del otro bien ($)',yLabel:'Cantidad del bien estudiado',markers:[{q:v.p1,p:v.q1,label:'A'},{q:v.p2,p:v.q2,label:'B'}]})+
      stats([['Elasticidad con signo',value(r.e,f)],['Interpretación',kind]])+formula('E = %ΔQ del bien estudiado / %ΔX; ambos porcentajes usan el punto medio.',[['%ΔQ',r.dq===null?'No definido':f(r.dq*100)+' %'],['%ΔX',r.dp===null?'No definido':f(r.dp*100)+' %'],['E',value(r.e,f)]])+
      '<p class="econ-insight">Aquí el signo sí determina la interpretación; no se toma solo el valor absoluto. En elasticidad ingreso, «inferior» describe una respuesta al ingreso, no la calidad del bien. En elasticidad cruzada, cambia el precio de otro bien, no el propio.</p>';
  }
  return {controls,output,preset};
})();
