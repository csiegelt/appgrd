const puppeteer=require('puppeteer-core'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
(async()=>{
 const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:'18791',HOST:'127.0.0.1',APP_ORIGIN:'',APP_PASSWORD:'',OPENAI_API_KEY:''},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 let browser;
 try{
  browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:390,height:844});
  await page.goto('http://127.0.0.1:18791');
  const click=async a=>page.click(`#tab-estudio [data-action="${a}"]`);
  await page.click('[data-id="herramientas-cuantitativas"]');assert.equal(await page.$eval('h2',e=>e.textContent),'Herramientas Cuantitativas');
  assert.ok(await page.$('a[download][href$="ejercicios.xlsx"]'));
  await click('resources');await page.waitForSelector('#quant-output svg');assert.equal(await page.$('iframe'),null);
  assert.equal(await page.$$eval('[data-q-field^="point-"]',nodes=>nodes.length),8);
  const before=await page.$eval('#quant-output',e=>e.textContent);
  await page.$eval('[data-q-field="point-0-1"]',e=>{e.value='25';e.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.notEqual(await page.$eval('#quant-output',e=>e.textContent),before);
  assert.equal(await page.$eval('[data-q-field="point-0-1"]',e=>e.value),'25');
  await page.click('[data-q-action="add"]');assert.equal(await page.$$eval('.quant-point',nodes=>nodes.length),5);
  await page.click('[data-q-action="reset"]');assert.equal(await page.$$eval('.quant-point',nodes=>nodes.length),4);
  // Formulas preview separately, apply transactionally, generate data and can be undone.
  const set=async(key,value)=>page.$eval(`[data-q-field="${key}"]`,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},value);
  const pointValues=()=>page.$$eval('[data-q-field^="point-"]',nodes=>nodes.map(e=>e.value));
  await page.select('[data-q-select="graph"]','line');assert.ok(await page.$('.quant-data-line'));
  await page.select('[data-q-select="graph"]','bar');assert.equal(await page.$$eval('.quant-data-bar',n=>n.length),4);
  await page.select('[data-q-select="graph"]','scatter');
  await set('formula','=2*X+5');await page.click('[data-q-toggle="formula"]');assert.ok(await page.$('.quant-formula-line'));
  const original=await pointValues();await page.click('[data-q-action="apply-formula"]');assert.equal(await page.$eval('[data-q-field="point-0-1"]',e=>e.value),'9');
  await page.click('[data-q-action="undo"]');assert.deepEqual(await pointValues(),original);
  await set('formula','=RAIZ(-X)');await page.click('[data-q-action="apply-formula"]');assert.deepEqual(await pointValues(),original);assert.match(await page.$eval('#quant-message',e=>e.textContent),/Fila 1/);
  await set('formula','=2*X+5');await set('gen-start','0');await set('gen-step','2');await set('gen-count','6');
  await page.$eval('[data-q-action="generate"]',e=>e.closest('details').open=true);await page.click('[data-q-action="generate"]');
  assert.equal(await page.$$eval('.quant-point',n=>n.length),6);assert.equal(await page.$eval('[data-q-field="point-5-1"]',e=>e.value),'25');
  await page.click('[data-q-action="undo"]');assert.deepEqual(await pointValues(),original);
  // Dragging updates inputs; the original coordinates are recoverable.
  await page.$eval('[data-q-point="0"]',e=>e.scrollIntoView({block:'center'}));
  const pointBox=await(await page.$('[data-q-point="0"]')).boundingBox();
  await page.mouse.move(pointBox.x+pointBox.width/2,pointBox.y+pointBox.height/2);await page.mouse.down();await page.mouse.move(pointBox.x+25,pointBox.y+20,{steps:4});await page.mouse.up();
  assert.notDeepEqual(await pointValues(),original);await page.click('[data-q-action="undo"]');assert.deepEqual(await pointValues(),original);
  await page.click('[data-q-action="save"]');assert.match(await page.$eval('#quant-message',e=>e.textContent),/guardada/);
  await page.reload();await page.click('[data-id="herramientas-cuantitativas"]');await click('resources');
  assert.equal(await page.$eval('[data-q-field="formula"]',e=>e.value),'=2*X+5');assert.deepEqual(await pointValues(),original);assert.ok(await page.$('.quant-formula-line'));
  await page.click('.quant-chart-panel > .quant-help > summary');assert.match(await page.$eval('.quant-chart-panel > .quant-help',e=>e.textContent),/Reto:/);
  await page.click('[data-q-action="tab"][data-tab="chi"]');
  await page.select('[data-q-select="chi"]','tpSaved');assert.match(await page.$eval('#quant-output',e=>e.textContent),/0,689027/);
  await page.select('[data-q-select="chi"]','tp');assert.match(await page.$eval('#quant-output',e=>e.textContent),/0,046308/);
  assert.match(await page.$eval('#quant-scratch-result',e=>e.textContent),/Resultado:/);await set('scratch','=O-E');assert.ok(await page.$('#quant-output svg'));
  await page.click('[data-q-action="tab"][data-tab="erlang"]');assert.match(await page.$eval('#quant-output',e=>e.textContent),/5 activos/);
  await page.click('[data-q-action="tab"][data-tab="lookup"]');await page.select('[data-q-select="tariff"]','1');assert.match(await page.$eval('#quant-output',e=>e.textContent),/Dermatología/);
  for(const lab of ['reg','chi','lookup','erlang']){await page.click(`[data-q-action="tab"][data-tab="${lab}"]`);for(const width of [320,390,768,1280]){await page.setViewport({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,lab+' sin desbordamiento a '+width);}}
  await page.click('[data-q-action="tab"][data-tab="reg"]');await page.setViewport({width:320,height:844});await page.screenshot({path:path.resolve(__dirname,'../test-results/cuantitativas-lab-mobile.png'),fullPage:true});
  await page.setViewport({width:1280,height:900});await page.screenshot({path:path.resolve(__dirname,'../test-results/cuantitativas-lab-desktop.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const [file,type] of [['guia.pdf','application/pdf'],['ejercicios.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']]){const r=await fetch('http://127.0.0.1:18791/manual/cuantitativas/'+file);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),type)}
  await click('subject');await click('home');assert.equal(await page.$$eval('.study-topic',nodes=>nodes.length),4);await click('lesson');await page.type('#study-note','Mi apunte cuantitativo');await click('home');await click('cards');await click('reveal');assert.ok(await page.$('.study-answer'));await click('known');
  await page.reload();await page.click('[data-id="herramientas-cuantitativas"]');await click('home');await click('lesson');assert.equal(await page.$eval('#study-note',e=>e.value),'Mi apunte cuantitativo');
  await click('home');await click('cases');assert.equal(await page.$$eval('#study-case-select option',nodes=>nodes.length),2);
  await page.click('#app-home');await page.screenshot({path:path.resolve(__dirname,'../test-results/cuantitativas-portal-mobile.png'),fullPage:true});
  assert.equal(await page.$$eval('[data-action="subject"][data-id="herramientas-cuantitativas"]',nodes=>nodes.length),1);
  assert.deepEqual(errors,[]);console.log('PASS: módulo cuantitativas, cuatro temas, laboratorios, descargas, tarjetas, apuntes persistentes y casos.');
 }finally{if(browser)await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
