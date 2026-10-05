const puppeteer=require('puppeteer-core'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
(async()=>{
 const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:'18792',HOST:'127.0.0.1',APP_ORIGIN:'',APP_PASSWORD:'',OPENAI_API_KEY:''},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 let browser;
 try{
  browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1280,height:1000});
  const base='http://127.0.0.1:18792';await page.goto(base);
  const click=async a=>page.click(`#tab-estudio [data-action="${a}"]`), action=async a=>page.click(`[data-e-action="${a}"]`), tab=async id=>{const sel=`[data-e-action="tab"][data-tab="${id}"]`;await page.$eval(sel,e=>e.scrollIntoView({block:"center"}));await page.click(sel)};
  const set=async(field,value)=>page.$eval(`[data-e-field="${field}"]:not([type="range"])`,(el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}))},value);
  const body=()=>page.$eval('#econ-output',el=>el.textContent);
  assert.equal(await page.$$eval('.study-subject-card[data-action="subject"]',n=>n.length),3);
  await page.click('[data-id="economia-salud"]');await click('resources');assert.ok(await page.$('#econ-chart'));assert.equal(await page.$('iframe'),null);
  assert.match(await body(),/\$900 · Q 3/);await set('market.price',1500);assert.match(await body(),/exceso de oferta de 4/);
  await set('market.price',500);assert.match(await body(),/exceso de demanda de 4/);
  await action('add-row');assert.equal(await page.$$eval('.econ-market-table tbody tr',n=>n.length),9);await action('undo');assert.equal(await page.$$eval('.econ-market-table tbody tr',n=>n.length),8);
  await set('market.rows.1.0',0);assert.match(await body(),/sin repetir cantidades/);assert.equal(await page.$('#econ-chart'),null);await action('undo');assert.ok(await page.$('#econ-chart'));
  await page.select('[data-e-field="market.mode"]','shifts');await set('market.demandShift',200);assert.match(await body(),/Demanda inicial/);assert.notEqual(await page.$eval('.econ-stats',el=>el.textContent),'');
  await page.click('[data-e-field="formulas"]');assert.equal(await page.$('.econ-formula'),null);await page.click('[data-e-field="formulas"]');assert.ok(await page.$('.econ-formula'));
  await action('reset');await page.setViewport({width:1280,height:1000});
  await page.$eval('[data-e-drag="price"]',el=>el.scrollIntoView({block:'center'}));
  const point=await page.$eval('[data-e-drag="price"]',el=>{const b=el.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}});
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x,point.y-25,{steps:4});await page.mouse.up();assert.ok(await page.$eval('[data-e-field="market.price"][type="number"]',el=>Number(el.value)>900));
  await tab('elasticity');assert.match(await body(),/0,474/);await set('elasticity.p2',20000);assert.match(await body(),/ΔP = 0/);await action('undo');assert.ok(await page.$('#econ-chart'));
  await tab('scale');assert.match(await body(),/15.000/);assert.match(await body(),/10.000/);
  await page.click('[data-e-field="hide"]');assert.equal(await page.$('.econ-results'),null);assert.equal(await page.$('.econ-stats'),null);
  for(const [i,value] of ['15000','10000','-33,33'].entries())await page.type(`[data-e-answer="${i}"]`,value);
  await page.click('#econ-exercise-form [type="submit"]');assert.equal(await page.$$eval('.econ-correct',n=>n.length),3);
  await action('new-exercise');assert.equal(await page.$eval('[data-e-answer="0"]',e=>e.value),'');assert.ok(await page.$('#econ-chart'));
  await page.select('[data-e-field="scale.mode"]','long');await page.click('[data-e-action="preset"][data-preset="scale-diseconomies"]');assert.match(await body(),/deseconomías/);
  await page.click('[data-e-field="hide"]');await page.click('[data-e-action="preset"][data-preset="scale-constant"]');assert.match(await body(),/costo medio constante/);
  await tab('productivity');assert.equal(await page.$$eval('.econ-bar-row',n=>n.length),4);await action('add-row');assert.equal(await page.$$eval('.econ-bar-row',n=>n.length),5);await set('productivity.rows.4.1',-20);assert.ok(await page.$('.econ-bar-track[aria-label*="-20"]'));
  await tab('monopoly');assert.match(await body(),/1.100/);assert.match(await body(),/\$200/);await set('monopoly.c',2000);assert.match(await body(),/No hay producción positiva rentable/);assert.equal(await page.$('#econ-exercise-form'),null);await action('reset');
  await tab('insurance');await set('insurance.copay',25);assert.match(await body(),/1.875.000/);await set('insurance.copay',0);assert.match(await body(),/3.000.000/);
  await tab('grossman');assert.match(await body(),/84/);await set('grossman.initial',100);await page.reload();await page.click('[data-id="economia-salud"]');await click('resources');assert.equal(await page.$eval('[data-e-field="grossman.initial"]',el=>el.value),'100');
  fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});
  for(const id of ['market','elasticity','scale','productivity','monopoly','insurance','grossman']){
    await tab(id);
    for(const width of [320,390,768,1280]){
      await page.setViewport({width,height:1000});await new Promise(r=>setTimeout(r,150));
      const overflow=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(overflow.scroll<=overflow.w,`${id} overflows at ${width}: ${JSON.stringify(overflow)}`);
    }
  }
  await tab('scale');await page.setViewport({width:1280,height:1000});await page.screenshot({path:path.resolve(__dirname,'../test-results/economia-desktop.png'),fullPage:true});
  await page.setViewport({width:390,height:844});await page.waitForFunction(()=>document.querySelector('#econ-chart').viewBox.baseVal.width===360);await page.screenshot({path:path.resolve(__dirname,'../test-results/economia-mobile.png'),fullPage:true});
  await click('subject');assert.equal(await page.$$eval('.study-topic',n=>n.length),11);await page.click('[data-action="lesson"][data-id="econ-mercado"]');await page.type('#study-note','Mi explicación sobre desplazamientos');assert.ok(await page.$('[data-action="resources"][data-lab="market"]'));await click('topic-cards');await click('reveal');assert.ok(await page.$('.study-answer'));await click('known');
  await page.reload();await page.click('[data-id="economia-salud"]');await page.click('[data-action="lesson"][data-id="econ-mercado"]');assert.equal(await page.$eval('#study-note',e=>e.value),'Mi explicación sobre desplazamientos');await click('home');await click('cases');assert.equal(await page.$$eval('#study-case-select option',n=>n.length),3);
  // Banco de preguntas: sorteo local de 10 a 20, corrección inmediata, nota de referencia, repaso e historial.
  const tutorCalls=[];page.on('request',r=>{if(r.url().includes('/api/tutor'))tutorCalls.push(r.url())});
  await click('home');assert.match(await page.$eval('.study-breadcrumbs',e=>e.textContent),/Inicio.*Economía de la Salud/);assert.equal(await page.$$eval('.econ-hub-card',n=>n.length),4);
  await click('bank');await click('bank-start');
  const total=await page.$eval('.study-exam-meta strong',e=>Number(e.textContent.match(/de (\d+)/)[1]));assert.ok(total>=10&&total<=20,'session size '+total);
  const kinds=new Set();
  for(let i=0;i<total;i++){kinds.add(await page.$eval('.study-bank-tags .study-badge',e=>e.textContent));await page.click('[data-action="bank-answer"][data-index="0"]');assert.ok(await page.$('.study-answer'));assert.equal(await page.$('[data-action="bank-answer"]:not([disabled])'),null,'Answers lock after replying');await page.click('[data-action="bank-next"]');}
  assert.ok(kinds.has('Verdadero o falso')&&kinds.has('Selección múltiple'),'Session mixes formats');
  await page.waitForSelector('#study-bank-result');assert.match(await page.$eval('#study-bank-result',e=>e.textContent),new RegExp('/'+total));
  const bankHistory=await page.evaluate(()=>JSON.parse(localStorage.getItem('grd-estudio-v1')).history.filter(h=>h.type==='bank'));assert.equal(bankHistory.length,1);assert.equal(bankHistory[0].total,total);
  const failed=total-bankHistory[0].correct;
  if(failed){await click('bank-retry');assert.match(await page.$eval('.study-exam-meta strong',e=>e.textContent),new RegExp('de '+failed+'$'));}
  await click('home');assert.match(await page.$eval('#tab-estudio',e=>e.textContent),/Banco de preguntas · /);
  await page.click('[data-action="bank-topic"][data-id="econ-monopolio"]');assert.match(await page.$eval('.study-bank-tags',e=>e.textContent),/Monopolio/);
  for(const width of [320,390,1280]){await page.setViewport({width,height:900});await new Promise(r=>setTimeout(r,100));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'bank overflows at '+width);}
  await page.setViewport({width:390,height:844});await page.screenshot({path:path.resolve(__dirname,'../test-results/banco-mobile.png'),fullPage:true});
  await click('home');for(const width of [320,390,1280]){await page.setViewport({width,height:900});await new Promise(r=>setTimeout(r,100));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'hub overflows at '+width);}
  await page.screenshot({path:path.resolve(__dirname,'../test-results/economia-panel.png'),fullPage:true});
  assert.equal(tutorCalls.length,0,'The bank never calls the AI');
  // Simulate an existing local subject. Opening the updated app must expand that exact subject.
  await page.evaluate(()=>{const old={id:'custom-economics',name:'Economía de la salud',source:'Material personal',lessons:[{id:'my-original-topic',title:'Mi tema anterior',text:'Mi material personal del ramo.',objective:'Mi objetivo',summary:['Mi guía'],materialStatus:'provided',questions:[]}],cases:[]};localStorage.setItem('grd-estudio-v1',JSON.stringify({subjects:[old],selected:old.id,lesson:'my-original-topic',progress:{'custom-economics/my-original-topic':{read:true}},notes:{'custom-economics/my-original-topic':'Apunte conservado'},history:[],caseSelection:{}}));});
  await page.reload();assert.equal(await page.$$eval('.study-subject-card[data-action="subject"]',n=>n.length),3);assert.equal(await page.$('[data-id="economia-salud"]'),null);await page.click('[data-id="custom-economics"]');assert.ok(await page.$('[data-action="resources"]'));assert.equal(await page.$$eval('.study-topic',n=>n.length),12);await page.click('[data-action="lesson"][data-id="my-original-topic"]');assert.equal(await page.$eval('#study-note',e=>e.value),'Apunte conservado');
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('grd-estudio-antes-economia-v1')).subjects[0].lessons.length===1));
  await page.reload();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('grd-estudio-v1')));assert.equal(saved.subjects[0].lessons.length,12);assert.equal(saved.subjects[0].cases.length,3);
  assert.deepEqual(errors,[]);console.log('PASS: Economía, panel único, banco de preguntas aleatorio, siete laboratorios, seis gráficos reconstruidos, ejercicios, persistencia, migración sin duplicados y responsive 320–1280.');
 }finally{if(browser)await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
