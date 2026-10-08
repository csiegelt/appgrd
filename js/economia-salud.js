/* Modelos docentes propios. Unidades abstractas; no estimaciones clínicas. */
const EconomiaSalud = (() => {
  const defaults = {
    production: { a:100, k:.35, m:6, extra:1 },
    inputs: { h:80, a:10, pm:3, px:1 },
    physician: { p:4, y0:20, c:1, alpha:2, b:4, d:.5, floor:0, target:40 },
    altruism: { ymax:100, hmax:10, alpha:1 },
    evaluation: { ca:100, cb:160, ea:2, eb:3, threshold:80 }
  };
  const tabs = [
    ['production','Producción de salud','econ-produccion-salud','Relaciona salud total, producto marginal y tramo plano.'],
    ['inputs','Isocuantas e insumos','econ-isocuantas','Busca la combinación de atención médica y otros insumos de menor costo.'],
    ['physician','Pago y esfuerzo médico','econ-utilidad-medico','Compara FFS y capitación; explora altruismo, normas e ingreso objetivo.'],
    ['altruism','Altruismo y salud','econ-altruismo','Mueve el peso altruista y observa la tangencia en la frontera ingreso–salud.'],
    ['evaluation','Costo y AVAC','econ-evaluacion','Compara costos y resultados incrementales, dominancia y costo de oportunidad.']
  ];
  const bounds = {
    production:{a:[1,1000],k:[.01,2],m:[0,30],extra:[.1,10]},
    inputs:{h:[1,200],a:[1,30],pm:[.1,20],px:[.1,20]},
    physician:{p:[.1,20],y0:[0,100],c:[.1,10],alpha:[0,10],b:[1,10],d:[.1,2],floor:[0,20],target:[0,200]},
    altruism:{ymax:[1,500],hmax:[1,50],alpha:[0,50]},
    evaluation:{ca:[0,1000],cb:[0,1000],ea:[0,20],eb:[0,20],threshold:[0,1000]}
  };
  function validate(tab,v) {
    for(const [key,[lo,hi]] of Object.entries(bounds[tab])) if(!Number.isFinite(v[key])||v[key]<lo||v[key]>hi) throw Error(`${key}: usa un número entre ${lo} y ${hi}.`);
  }
  function production(v) {
    validate('production',v);
    const health=m=>v.a*(-Math.expm1(-v.k*m)), marginal=m=>v.a*v.k*Math.exp(-v.k*m);
    return {health,marginal,h:health(v.m),pm:marginal(v.m),gain:health(v.m+v.extra)-health(v.m),second:-v.k*marginal(v.m)};
  }
  function inputs(v) {
    validate('inputs',v);
    const ratio=v.pm/v.px,m=v.h/v.a/Math.sqrt(ratio),x=ratio*m,cost=v.pm*m+v.px*x;
    return {m,x,cost,ratio,iso:q=>(v.h/v.a)**2/q, equalCost:(v.pm+v.px)*v.h/v.a};
  }
  function physician(v) {
    validate('physician',v);
    // Utility is quasilinear in income here, explicitly a simplification of U(Y,e,H).
    const denom=v.c+v.alpha*v.d,cap=Math.max(v.floor,v.alpha*v.b/denom),ffs=Math.max(v.floor,(v.p+v.alpha*v.b)/denom);
    const health=e=>v.b*e-v.d*e*e/2,utility=(e,y)=>y-v.c*e*e/2+v.alpha*health(e);
    return {cap,ffs,health,utility,capU:utility(cap,v.y0),ffsU:utility(ffs,v.p*ffs),target:v.target/v.p,clinical:v.b/v.d};
  }
  function altruism(v) {
    validate('altruism',v);
    // log(1+Y) + alpha*H, Y=Ymax[1-(H/Hmax)^2]. Stable positive root.
    const z=v.ymax/(v.hmax*v.hmax),h=v.alpha===0?0:v.alpha*(1+v.ymax)/(z+Math.sqrt(z*z+v.alpha*v.alpha*z*(1+v.ymax)));
    const chosen=Math.min(v.hmax,h),income=q=>v.ymax*(1-(q/v.hmax)**2),y=income(chosen),u=Math.log1p(y)+v.alpha*chosen;
    return {h:chosen,y,u,income,interior:chosen>0&&chosen<v.hmax,indifference:q=>Math.expm1(u-v.alpha*q)};
  }
  function evaluation(v) {
    validate('evaluation',v);
    const dc=v.cb-v.ca,de=v.eb-v.ea,nmb=v.threshold*de-dc;
    let status='Intercambio: compara beneficio neto y umbral';
    if(dc===0&&de===0)status='Mismos costos y resultados';
    else if(dc<=0&&de>=0)status='B domina a A';
    else if(dc>=0&&de<=0)status='B está dominada por A';
    else if(de===0)status=dc<0?'Misma salud: B cuesta menos':'Misma salud: B cuesta más';
    return {dc,de,nmb,icer:de===0?null:dc/de,status};
  }
  function controls({s,sheet,range,hint}) {
    const names={production:{a:'Techo A (índice H)',k:'Curvatura k (1/M)',m:'Atención médica M',extra:'Incremento ΔM'},inputs:{h:'Salud objetivo H',a:'Tecnología A',pm:'Precio de M (u.m.)',px:'Precio de X (u.m.)'},physician:{p:'Tarifa p (u.m./servicio)',y0:'Pago fijo Y₀ (u.m.)',c:'Costo de esfuerzo c',alpha:'Peso altruista α',b:'Beneficio inicial b',d:'Caída marginal d',floor:'Piso profesional de esfuerzo',target:'Ingreso objetivo Y* (u.m.)'},altruism:{ymax:'Ingreso máximo (u.m.)',hmax:'Salud máxima (índice H)',alpha:'Peso altruista α'},evaluation:{ca:'Costo de A (u.m.)',cb:'Costo de B (u.m.)',ea:'AVAC de A',eb:'AVAC de B',threshold:'Umbral λ (u.m./AVAC)'}};
    const slider={production:'m',inputs:'pm',physician:'alpha',altruism:'alpha',evaluation:'threshold'}[s.tab];
    return `<h4>Explora el modelo</h4>`+range(`${s.tab}.${slider}`,names[s.tab][slider],...bounds[s.tab][slider],.1)+sheet(Object.entries(names[s.tab]).filter(([k])=>k!==slider).map(([key,label])=>[label,`${s.tab}.${key}`,...bounds[s.tab][key]]),'Valores ilustrativos editables')+hint('Todos los números son simulados. Cambia un dato, interpreta las curvas y comprueba el ejercicio. u.m. = unidades monetarias.');
  }
  const points=(end,fn,start=0)=>Array.from({length:121},(_,i)=>{const x=start+(end-start)*i/120;return [x,fn(x)]});
  function output(ctx) {
    const {s,chart,stats,formula,help,exercise,f,vv}=ctx,v=s[s.tab];
    const line=(name,color,pts,dash=false)=>({name,color,points:pts,dash});
    const marker=(q,p,label,help)=>({q,p,label,help});
    const show=value=>s.hide?'?':f(value);
    const note=text=>`<p class="econ-insight">${text}</p>`;
    if(s.tab==='production') {
      const r=production(v),end=Math.max(20,v.m+v.extra);
      return chart([line('Salud total H','#315eb3',points(end,r.health))],{id:'econ-health-total',title:'Salud total: rendimientos decrecientes',xLabel:'Atención médica M',yLabel:'Índice de salud H',markers:[marker(v.m,r.h,'M','La pendiente de esta curva es el producto marginal; altura y pendiente no son lo mismo.')],yMax:v.a*1.1})+
        chart([line('Producto marginal de M','#147568',points(end,r.marginal))],{id:'econ-health-marginal',title:'Salud adicional por unidad de M',xLabel:'Atención médica M',yLabel:'PM de M (H/M)',markers:[marker(v.m,r.pm,'PM','El producto marginal sigue siendo positivo, pero disminuye al aumentar M.')],yMax:v.a*v.k*1.1})+
        stats([['Salud total',f(r.h)],['Producto marginal',f(r.pm)],['Ganancia con ΔM',f(r.gain)]])+note('H=f(M,X). Aquí X permanece fijo y se usa H=A(1−exp(−kM)). La curva se aplana gradualmente: no hay un corte clínico universal llamado “flat of the curve”. Cambiar A o k representa otra tecnología o contexto, no añadir consultas sobre la misma curva.')+
        formula('H=A(1−exp(−kM)); ∂H/∂M=Ak·exp(−kM)>0; ∂²H/∂M²=−Ak²·exp(−kM)<0.',[[`H=${vv(v.a)}×(1−exp(−${vv(v.k)}×${vv(v.m)}))`,f(r.h)],[`PM=${vv(v.a)}×${vv(v.k)}×exp(−${vv(v.k)}×${vv(v.m)})`,f(r.pm)],[`ΔH=H(${vv(v.m)}+${vv(v.extra)})−H(${vv(v.m)})`,f(r.gain)]])+
        help('Interpretación: prevención, Grossman y atenciones','<p>El siguiente peso debe compararse por salud adicional por costo, factibilidad y equidad. Las comparaciones de gasto entre países no identifican por sí solas causalidad ni el tramo de la curva.</p><p>En «Capital de salud» puedes explorar H(t+1)=(1−δ)H(t)+I. Salud como consumo produce bienestar; como inversión aporta tiempo saludable. La inversión óptima requiere valorar beneficios y costos; no se deduce solo de la depreciación.</p><p>Producir atenciones Q=g(personal,camas,equipos) es distinto: más consultas no demuestra mayor H. Rendimiento decreciente de un insumo no significa deseconomías de escala.</p>')+
        exercise(['Salud H(M)','Ganancia ΔH'],[r.h,r.gain],`Primero H(M)=${f(v.a)}×(1−exp(−${f(v.k)}×${f(v.m)}))=${f(r.h)}. Luego H(M+ΔM)=${f(r.health(v.m+v.extra))}. Resta ambos: ΔH=${f(r.gain)}. No uses PM×ΔM como igualdad exacta.`, 'Calcula salud total y ganancia del incremento.');
    }
    if(s.tab==='inputs') {
      const r=inputs(v),xmax=r.cost/v.pm*1.1,ymax=r.cost/v.px*1.1;
      const iso=(h)=>points(xmax,m=>(h/v.a)**2/m,(h/v.a)**2/ymax);
      return chart([line('Isocuanta H objetivo','#315eb3',iso(v.h)),line('Isocuanta 0,625H','#c27619',iso(v.h*.625)),line('Isocosto mínimo','#147568',[[0,r.cost/v.px],[r.cost/v.pm,0]],true)],{title:'Isocuantas e isocosto: tangencia de costo mínimo',xLabel:'Atención médica M',yLabel:'Otros insumos X',xMax:xmax,yMax:ymax,markers:[marker(r.m,r.x,'Óptimo','En la tangencia PM de M / PM de X = pM/pX. La mezcla produce la salud objetivo al menor costo.') ]})+
        stats([['M óptimo',f(r.m)],['X óptimo',f(r.x)],['Costo mínimo (u.m.)',f(r.cost)],['Costo con M=X',f(r.equalCost)]])+note('Modelo de sustitución parcial H=A√(MX), con M y X positivos. X incluye prevención, educación o entorno; la sustituibilidad real depende del problema. En ejes M horizontal y X vertical, dX/dM=−PMM/PMX=−X/M. Su valor absoluto expresa X reemplazable por una unidad adicional de M; la relación inversa expresa M reemplazable por X.')+
        formula('Minimizar C=pM·M+pX·X sujeto a H=A√(MX). PMM=A/2·√(X/M); PMX=A/2·√(M/X). X/M=pM/pX; M*=H/A·√(pX/pM); X*=H/A·√(pM/pX).',[[`X/M=${vv(v.pm)}/${vv(v.px)}`,f(r.ratio)],[`M*=${vv(v.h)}/${vv(v.a)}×√(${vv(v.px)}/${vv(v.pm)})`,f(r.m)],[`X*=${vv(v.h)}/${vv(v.a)}×√(${vv(v.pm)}/${vv(v.px)})`,f(r.x)],[`C*=pM·M*+pX·X*`,f(r.cost)]])+
        exercise(['M de costo mínimo','X de costo mínimo'],[r.m,r.x],`Iguala X/M=pM/pX=${f(r.ratio)}. Sustituye X=${f(r.ratio)}M en H=A√(MX). M=${f(v.h)}/${f(v.a)}÷√(${f(r.ratio)})=${f(r.m)}; X=${f(r.ratio)}×M=${f(r.x)}.`, 'Encuentra la mezcla que produce H al menor costo.');
    }
    if(s.tab==='physician') {
      const r=physician(v),end=Math.max(10,r.ffs*1.3,r.cap*1.3),ymax=Math.max(v.y0,v.p*end)*1.4;
      const indiff=u=>points(end,e=>u+v.c*e*e/2-v.alpha*r.health(e)).filter(([,y])=>y>=0&&y<=ymax);
      return chart([line('FFS: Y=p·e','#315eb3',[[0,0],[end,v.p*end]]),line('Capitación: Y=Y₀','#c27619',[[0,v.y0],[end,v.y0]]),line('Indiferencia del óptimo FFS','#315eb3',indiff(r.ffsU),true),line('Indiferencia del óptimo capitación','#c27619',indiff(r.capU),true)],{id:'econ-payment',title:'Ingreso y esfuerzo: decisiones privadas',xLabel:'Esfuerzo / servicios e',yLabel:'Ingreso Y (u.m.)',xMax:end,yMax:ymax,markers:[marker(r.ffs,v.p*r.ffs,'FFS','Óptimo privado FFS. Una norma vinculante puede generar solución de borde, sin tangencia.'),marker(r.cap,v.y0,'CAP','Óptimo privado con pago fijo; altruismo y piso profesional pueden sostener esfuerzo positivo.')]})+
        stats([['Esfuerzo FFS',f(r.ffs)],['Esfuerzo capitación',f(r.cap)],['Máximo de H: e=b/d',f(r.clinical)]])+note('U=Y−ce²/2+αH(e), H(e)=be−de²/2. Esta especificación docente usa utilidad marginal del ingreso constante; la formulación general también admite utilidad marginal decreciente. Esfuerzo y volumen se identifican solo para simplificar. Y omite costos monetarios; el esfuerzo ya tiene desutilidad. El máximo de H no es automáticamente el óptimo social: faltan costos y usos alternativos.')+
        formula('dU/de=p+αb−(c+αd)e en FFS; en capitación p=0. Segunda derivada =−(c+αd)<0. e*=máx(piso, raíz).',[[`eFFS=máx(${vv(v.floor)},(${vv(v.p)}+${vv(v.alpha)}×${vv(v.b)})/(${vv(v.c)}+${vv(v.alpha)}×${vv(v.d)}))`,f(r.ffs)],[`eCAP=máx(${vv(v.floor)},${vv(v.alpha)}×${vv(v.b)}/(${vv(v.c)}+${vv(v.alpha)}×${vv(v.d)}))`,f(r.cap)]])+
        help('Agencia, riesgos y extensiones','<p>El paciente delega decisiones en el médico, con información desigual y objetivos que pueden diferir. FFS puede incentivar volumen y capitación subprestación o selección; son riesgos, no resultados inevitables ni pruebas de fraude. Las normas, auditorías y reputación también importan.</p><p>El altruismo penaliza sobretratamiento cuando H cae. Reputación añade valor al buen desempeño; medicina defensiva añade el costo esperado del riesgo legal. El piso de esfuerzo simula una restricción profesional, pero no garantiza por sí mismo calidad.</p><p>Capitación fija pago por inscrito y período; salario remunera al profesional por tiempo o contrato. Ambos pueden tener ingreso marginal nulo por servicio, aunque sus instituciones son distintas.</p>')+
        chart([line('Volumen requerido para Y*','#8054ac',points(v.p*2,p=>v.target/p,v.p/2))],{id:'econ-target',title:'Hipótesis del ingreso objetivo: de media a doble tarifa',xLabel:'Tarifa p (u.m./servicio)',yLabel:'Volumen requerido e',markers:[marker(v.p,r.target,'Y*','e=Y*/p, sin costos y con objetivo fijo. Es una hipótesis distinta de maximizar la utilidad anterior.') ]})+
        formula('Ingreso objetivo: e=Y*/p. Es una hipótesis separada, no una predicción de la optimización anterior.',[[`e=${vv(v.target)}/${vv(v.p)}`,f(r.target)]])+note(`Al bajar p, cumplir el mismo Y* requiere más volumen bajo esta hipótesis. Volumen requerido con tus datos: ${show(r.target)}. No prueba que exista demanda inducida ni que el objetivo sea factible.`)+
        exercise(['Esfuerzo FFS','Esfuerzo capitación'],[r.ffs,r.cap],`Denominador c+αd=${f(v.c+v.alpha*v.d)}. Numerador FFS=p+αb=${f(v.p+v.alpha*v.b)}; CAP=αb=${f(v.alpha*v.b)}. Divide y aplica el piso ${f(v.floor)}: FFS=${f(r.ffs)}, CAP=${f(r.cap)}.`, 'Calcula ambos óptimos y aplica la norma mínima.');
    }
    if(s.tab==='altruism') {
      const r=altruism(v),low=altruism({...v,alpha:v.alpha/2}),ymax=v.ymax*1.15,z=v.ymax/v.hmax**2;
      const curve=t=>points(v.hmax,t.indifference).filter(([,y])=>y>=0&&y<=ymax);
      return chart([line('Frontera ingreso–salud','#273d35',points(v.hmax,r.income)),line('Indiferencia con α','#147568',curve(r),true),line('Indiferencia con α/2','#315eb3',curve(low),true)],{title:'Altruismo: preferencias sobre la misma frontera',xLabel:'Salud del paciente H',yLabel:'Ingreso Y (u.m.)',xMax:v.hmax*1.05,yMax:ymax,markers:[marker(r.h,r.y,'α','Elección con el peso altruista actual. En un óptimo interior las pendientes son iguales.'),marker(low.h,low.y,'α/2','Elección con la mitad del peso altruista, manteniendo recursos y tecnología.') ]})+
        stats([['Salud elegida',f(r.h)],['Ingreso elegido',f(r.y)],['Tipo de solución',r.interior?'Interior: tangencia':'Borde de la frontera']])+note('Recursos fijos: Y=Ymáx[1−(H/Hmáx)²]. U=ln(1+Y)+αH: el ingreso aporta utilidad positiva y decreciente. A mayor α, se elige más H y menos Y hasta llegar al borde. Las curvas punteadas pasan por sus respectivos óptimos; no se comparan niveles de utilidad entre médicos.')+
        formula('dU/dH=α−(2zH)/(1+Y)=0, z=Ymáx/Hmáx². αzH²+2zH−α(1+Ymáx)=0. Raíz positiva: H*=α(1+Ymáx)/[z+√(z²+α²z(1+Ymáx))], acotada a [0,Hmáx]. Si α=0, H*=0.',[[`z=${vv(v.ymax)}/${vv(v.hmax)}²`,f(z)],[`H*=mín(${vv(v.hmax)}, ${vv(v.alpha)}×(1+${vv(v.ymax)})/[${vv(z,4)}+√(${vv(z,4)}²+${vv(v.alpha)}²×${vv(z,4)}×(1+${vv(v.ymax)}))])`,f(r.h)],[`Y*=${vv(v.ymax)}×[1−(${show(r.h)}/${vv(v.hmax)})²]`,f(r.y)],[`U*=ln(1+${show(r.y)})+${vv(v.alpha)}×${show(r.h)}`,f(r.u)]])+
        help('Cómo leer las pendientes','<p>Frontera: dY/dH=−2zH. Indiferencia: dY/dH=−α(1+Y). En solución interior coinciden. Con α=0 se elige el ingreso máximo; con α suficientemente alto se alcanza Hmáx y Y=0. Allí la solución está en el borde y no se exige tangencia.</p>')+
        exercise(['Salud elegida H*','Ingreso elegido Y*'],[r.h,r.y],`z=${f(v.ymax)}/${f(v.hmax)}²=${f(v.ymax/v.hmax**2,4)}. Sustituye en la raíz positiva y aplica H≤${f(v.hmax)}: H*=${f(r.h)}. Y*=${f(v.ymax)}×[1−(H*/${f(v.hmax)})²]=${f(r.y)}.`, 'Calcula la elección con α y verifica si es interior o de borde.');
    }
    const r=evaluation(v),end=Math.max(1,v.ea,v.eb)*1.2;
    return chart([line('Comparación A → B','#315eb3',[[v.ea,v.ca],[v.eb,v.cb]]),line('Referencia de umbral desde A','#147568',[[v.ea,v.ca],[end,v.ca+v.threshold*(end-v.ea)]],true)],{title:'Costos y AVAC: compara los incrementos desde A',xLabel:'AVAC',yLabel:'Costo (u.m.)',markers:[marker(v.ea,v.ca,'A','Comparador: referencia para restar costos y AVAC.'),marker(v.eb,v.cb,'B','Alternativa evaluada. Primero comprueba dominancia, después interpreta el cociente incremental.') ]})+
      stats([['ΔCosto',f(r.dc)],['ΔAVAC',f(r.de)],['RCEI (u.m./AVAC)',r.icer===null?'No definida: ΔAVAC=0':f(r.icer)],['Beneficio neto incremental',f(r.nmb)]])+note(s.hide?'Clasifica dominancia antes de interpretar el cociente.':`${r.status}. Con el umbral elegido: ${r.nmb>0?'B tiene mayor beneficio monetario neto':r.nmb<0?'A tiene mayor beneficio monetario neto':'ambas alternativas tienen igual beneficio neto'}.`)+
      formula('AVAC=Σ(calidad×años). RCEI=(CB−CA)/(EB−EA). Beneficio monetario neto incremental=λ·ΔAVAC−ΔCosto.',[[`ΔCosto=${vv(v.cb)}−${vv(v.ca)}`,f(r.dc)],[`ΔAVAC=${vv(v.eb)}−${vv(v.ea)}`,f(r.de)],[`RCEI=ΔCosto/ΔAVAC`,r.icer===null?'No definida':f(r.icer)],[`BMNI=${vv(v.threshold)}×ΔAVAC−ΔCosto`,f(r.nmb)]])+
      help('Costo-efectividad, costo-utilidad y oportunidad','<p>Costo-efectividad puede usar casos evitados o años de vida. Costo-utilidad utiliza AVAC: por ejemplo 2 años con calidad 0,8 aportan 2×0,8=1,6 AVAC, sin descuento. Esta práctica compara solo dos alternativas con el mismo horizonte; no aplica descuento ni incertidumbre.</p><p>Una RCEI negativa puede significar ahorro con mejora o más costo con peor salud: hay que mirar ambos signos. Con menor costo y menor salud, el umbral expresa cuánto se valora lo que se pierde. Si ΔAVAC=0, compara costos directamente.</p><p>El umbral es hipotético, no una recomendación sanitaria. Eficiencia no sustituye equidad, impacto presupuestario ni análisis de incertidumbre. No conviertas el índice H de los otros gráficos a AVAC sin una medición válida.</p>')+
      exercise(['Incremento de costo','Beneficio neto incremental'],[r.dc,r.nmb],`ΔCosto=${f(v.cb)}−${f(v.ca)}=${f(r.dc)}; ΔAVAC=${f(v.eb)}−${f(v.ea)}=${f(r.de)}. BMNI=${f(v.threshold)}×${f(r.de)}−(${f(r.dc)})=${f(r.nmb)}.`, 'Resta B−A y aplica el umbral para comparar las dos alternativas.');
  }
  function newExercise(tab,v,pick) {
    if(tab==='production')v.m=pick([2,5,10,15]);
    if(tab==='inputs')v.pm=pick([1,2,3,5]);
    if(tab==='physician')v.alpha=pick([0,1,2,4]);
    if(tab==='altruism')v.alpha=pick([0,.2,.5,1]);
    if(tab==='evaluation')v.cb=pick([80,120,160,200]);
  }
  return {defaults,tabs,production,inputs,physician,altruism,evaluation,controls,output,newExercise};
})();
