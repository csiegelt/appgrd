// Browser workflow with mocked AI: no real credentials or billed generations.
const puppeteer=require('puppeteer-core'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
(async()=>{
 fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});
 const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:'18793',HOST:'127.0.0.1',APP_ORIGIN:'',APP_PASSWORD:'',OPENAI_API_KEY:''},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited: '+code)))});
 let browser, page;
 try{
  browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:390,height:844});
  let requests=0,fail=false,hold=false,release,waiting,expectedTopics=16,lastSize=0,sessionDelay=0;
  await page.setRequestInterception(true);
  page.on('request',async req=>{
   const url=new URL(req.url());if(!url.pathname.startsWith('/api/'))return req.continue();
   let body={};
   if(url.pathname==='/api/session'){if(sessionDelay)await new Promise(done=>setTimeout(done,sessionDelay));body={available:true,provider:'openai-api',configured:true,connected:true,authRequired:false,protected:false,models:[{slug:'test-model',display_name:'Test'}]};}
   if(url.pathname==='/api/usage')return req.respond({status:404,contentType:'application/json',body:JSON.stringify({error:'El contador de consumo no se muestra en esta publicación.',code:'USAGE_HIDDEN'})});
   if(url.pathname==='/api/tutor'){
    requests++;const data=JSON.parse(req.postData());assert.equal(data.generateExam,true);assert.equal(data.generate,undefined);assert.equal(data.web,undefined);assert.equal(data.context.name,'Economía de la Salud');assert.equal(data.context.lessons.length,expectedTopics);assert.ok([10,15].includes(data.examSize));lastSize=data.examSize;
    if(expectedTopics===17)assert.ok(data.context.lessons.some(l=>l.title==='Mi tema ingresado'&&l.text.includes('Contenido personal actualizado')));
    if(hold)await new Promise(done=>{release=done;waiting()});
    if(fail)return req.respond({status:502,contentType:'application/json',body:JSON.stringify({error:'La IA no entregó una prueba completa. Tu prueba anterior se conserva.'})});
    body={exam:{questions:Array.from({length:data.examSize},(_,i)=>({prompt:`Ejercicio simulado ${i+1}: ¿cuál es la interpretación correcta del concepto?`,options:['Opción A','Opción B','Opción C','Opción D'],answerIndex:i%4,explanation:'Explicación reservada hasta entregar '+i,sourceTitle:data.context.lessons[i%expectedTopics].title}))}};
   }
   return req.respond({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  const tap=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
  const click=async a=>tap(`#tab-estudio [data-action="${a}"]`);
  const enter=async()=>{await page.click('[data-action="subject"][data-id="economia-salud"]');await click('exam')};
  const attempt=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('grd-estudio-v1')).exams['economia-salud']);
  const width=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
  await page.goto('http://127.0.0.1:18793');
  // Public deployments hide the shared token counter; results stay in this browser.
  await page.waitForFunction(()=>!document.querySelector('#study-api-usage'));
  assert.match(await page.$eval('#tab-estudio',e=>e.textContent),/solo en este navegador/);
  await enter();
  await page.waitForFunction(()=>document.querySelector('[data-action="generate-exam"]')?.disabled===false);
  assert.equal(await page.$eval('#study-exam-threshold',e=>e.value),'0.6');
  assert.deepEqual(await page.$$eval('[data-action="set-exam-size"]',els=>els.map(e=>e.dataset.size)),['10','15'],'Only 10 or 15 questions');
  assert.equal(await page.$eval('[data-action="set-exam-size"][aria-pressed="true"]',e=>e.dataset.size),'10','Ten questions by default');
  assert.match(await page.$eval('#study-exam-threshold',e=>e.textContent),/6 correctas de 10/);
  await tap('[data-action="set-exam-size"][data-size="15"]');
  assert.match(await page.$eval('#study-exam-threshold',e=>e.textContent),/9 correctas de 15/);assert.match(await page.$eval('[data-action="generate-exam"]',e=>e.textContent),/15 preguntas/);
  hold=true;const sent=new Promise(done=>{waiting=done});await click('generate-exam');await sent;
  assert.equal(await page.$eval('[data-action="generate-exam"]',e=>e.disabled),true);
  assert.equal(await page.$eval('#study-exam-threshold',e=>e.disabled),true);assert.equal(await page.$eval('[data-action="set-exam-size"]',e=>e.disabled),true);release();hold=false;
  await page.waitForSelector('#study-exam-prompt');assert.equal(requests,1);assert.equal(lastSize,15);
  assert.equal(await page.$$eval('[data-action="exam-answer"]',els=>els.length),4);
  assert.equal(await page.$$eval('[data-action="exam-jump"]',els=>els.length),15);
  assert.equal(await page.$('#study-exam-result'),null);assert.equal(await page.$('.study-exam-review'),null);
  assert.ok(!(await page.$eval('#tab-estudio',e=>e.textContent)).includes('Explicación reservada'));
  assert.equal(await page.$eval('.study-exam-new',e=>e.open),false,'The replace option starts folded');
  await tap('[data-action="exam-answer"][data-index="1"]');await tap('[data-action="exam-answer"][data-index="0"]');
  assert.equal((await attempt()).answers[0],0);
  sessionDelay=500;await page.reload();await enter();
  await page.waitForFunction(()=>document.querySelector('[data-action="generate-exam"]')?.disabled===false,{timeout:5000});
  sessionDelay=0;assert.equal(await page.$eval('[data-action="exam-answer"][data-index="0"]',e=>e.getAttribute('aria-pressed')),'true');
  await click('exam-clear');assert.equal((await attempt()).answers[0],null);
  const activeQuestions=(await attempt()).questions;
  for(let i=0;i<12;i++){
   await tap(`[data-action="exam-jump"][data-index="${i}"]`);
   const correct=activeQuestions[i].answerIndex;
   await tap(`[data-action="exam-answer"][data-index="${i<9?correct:(correct+1)%4}"]`);
  }
  await click('exam-pending');assert.equal((await attempt()).index,12);
  fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});
  for(const w of [320,390,768,1280]){await page.setViewport({width:w,height:900});await width()}
  await page.setViewport({width:390,height:844});await page.screenshot({path:path.resolve(__dirname,'../test-results/prueba-mobile.png'),fullPage:true});
  await click('exam-deliver');assert.match(await page.$eval('#study-exam-confirm',e=>e.textContent),/3 preguntas sin responder/);
  await click('exam-cancel-delivery');assert.equal(await page.$('#study-exam-confirm'),null);
  await click('exam-deliver');await click('exam-finish');
  assert.equal(await page.$eval('#study-exam-result .study-result-score',e=>e.textContent),'4,0');
  assert.match(await page.$eval('#study-exam-result',e=>e.textContent),/9 de 15 correctas/);
  assert.match(await page.$eval('#study-exam-result',e=>e.textContent),/3 incorrectas · 3 omitidas/);
  assert.equal(await page.$eval('#study-exam-result',e=>!!e.nextElementSibling.querySelector('[data-action="generate-exam"]')),true,'Another exam can be generated right below the grade');
  assert.equal(await page.$('[data-action="exam-answer"]'),null);
  assert.equal(await page.$$eval('.study-exam-review',els=>els.length),15);
  await page.click('.study-exam-review summary');assert.match(await page.$eval('.study-exam-review[open]',e=>e.textContent),/Explicación reservada/);
  assert.equal(requests,1,'Answering and grading do not call AI');await width();
  await page.screenshot({path:path.resolve(__dirname,'../test-results/prueba-nota-mobile.png'),fullPage:true});
  await page.reload();await enter();await page.waitForSelector('#study-exam-result');
  assert.equal(await page.$eval('#study-exam-result .study-result-score',e=>e.textContent),'4,0');
  const history=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('grd-estudio-v1')).history.filter(h=>h.type==='exam'));
  assert.equal((await history()).length,1);assert.equal((await history())[0].grade,4);assert.equal((await history())[0].total,15);
  await page.waitForFunction(()=>document.querySelector('[data-action="generate-exam"]')?.disabled===false);
  const previous=await attempt();fail=true;await click('generate-exam');
  await page.waitForFunction(()=>document.querySelector('.study-notice')?.textContent.includes('prueba completa')&&!document.querySelector('[data-action="generate-exam"]').disabled);
  assert.deepEqual(await attempt(),previous);assert.equal((await history()).length,1);
  fail=false;
  // Exercise real UI recovery using shortened timers only in this synthetic test.
  await page.evaluate(()=>{
   const nativeFetch=window.fetch.bind(window),nativeTimeout=window.setTimeout.bind(window),nativeSet=Storage.prototype.setItem;
   window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,window.hangPath&&[15000,225000].includes(ms)?100:ms,...args);
   window.fetch=(url,options)=>String(url)==='/api/'+window.hangPath?new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Test timeout','AbortError')),{once:true})):nativeFetch(url,options);
   Storage.prototype.setItem=function(key,value){if(window.failExamSave&&key==='grd-estudio-v1')throw new DOMException('Test full storage','QuotaExceededError');return nativeSet.call(this,key,value)};
  });
  await page.evaluate(()=>window.hangPath='tutor');await click('generate-exam');
  await page.waitForFunction(()=>document.querySelector('.study-notice')?.textContent.includes('tardó demasiado')&&!document.querySelector('[data-action="generate-exam"]').disabled);
  assert.deepEqual(await attempt(),previous,'A timed-out exam preserves the saved result');
  await page.evaluate(()=>window.hangPath='session');await click('generate-exam');
  await page.waitForFunction(()=>document.querySelector('[data-action="refresh-ai"]')?.disabled===false);
  assert.deepEqual(await attempt(),previous);
  await page.evaluate(()=>{window.hangPath='';window.failExamSave=true});await click('refresh-ai');
  await page.waitForFunction(()=>document.querySelector('[data-action="generate-exam"]')?.disabled===false);
  await click('generate-exam');
  await page.waitForFunction(()=>document.querySelector('.study-notice')?.textContent.includes('No se pudo guardar la nueva prueba')&&!document.querySelector('[data-action="generate-exam"]').disabled);
  assert.deepEqual(await attempt(),previous,'Storage failure preserves the previous saved exam');
  assert.equal(await page.$eval('#study-exam-result .study-result-score',e=>e.textContent),'4,0','Storage failure also restores the previous exam in memory');
  await page.evaluate(()=>window.failExamSave=false);
  // From the result: another exam of 10.
  fail=false;await tap('[data-action="set-exam-size"][data-size="10"]');await click('generate-exam');
  await page.waitForFunction(()=>document.querySelectorAll('[data-action="exam-jump"]').length===10);
  assert.equal(lastSize,10);const ten=await attempt();assert.notEqual(ten.id,previous.id);assert.equal((await history()).length,1);
  // During an exam: replace it with one of 15, keeping the folded panel open while choosing.
  await tap('[data-action="exam-answer"][data-index="2"]');
  await tap('.study-exam-new summary');assert.equal(await page.$eval('.study-exam-new',e=>e.open),true);
  await tap('.study-exam-new [data-action="set-exam-size"][data-size="15"]');assert.equal(await page.$eval('.study-exam-new',e=>e.open),true,'Choosing a size keeps the panel open');
  await tap('.study-exam-new [data-action="generate-exam"]');
  await page.waitForFunction(()=>document.querySelectorAll('[data-action="exam-jump"]').length===15);
  assert.equal(lastSize,15);assert.notEqual((await attempt()).id,ten.id);assert.equal((await attempt()).answers.filter(a=>a!==null).length,0);
  assert.equal((await history()).length,1,'A replaced exam without delivery adds no grade');assert.equal(await page.$eval('.study-exam-new',e=>e.open),false);
  expectedTopics=17;
  await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('grd-estudio-v1'));let subject=state.subjects.find(s=>s.id==='economia-salud');if(!subject){subject=structuredClone(ECONOMIA_ASIGNATURA);state.subjects.push(subject)}subject.lessons.push({id:'my-exam-topic',title:'Mi tema ingresado',text:'Contenido personal actualizado para la siguiente prueba.',objective:'Comprender',summary:[],questions:[]});localStorage.setItem('grd-estudio-v1',JSON.stringify(state))});
  await page.reload();await enter();await page.waitForSelector('#study-exam-prompt');
  await tap('.study-exam-new summary');await tap('.study-exam-new [data-action="set-exam-size"][data-size="10"]');await page.select('#study-exam-threshold','0.5');
  await tap('.study-exam-new [data-action="generate-exam"]');await page.waitForFunction(()=>document.querySelectorAll('[data-action="exam-jump"]').length===10);
  assert.equal(lastSize,10);assert.equal((await attempt()).questions.length,10);
  assert.equal((await attempt()).threshold,.5);assert.equal((await attempt()).answers.filter(a=>a!==null).length,0);
  await click('exam-deliver');await click('exam-finish');assert.equal(await page.$eval('#study-exam-result .study-result-score',e=>e.textContent),'1,0');assert.equal((await history()).length,2);
  await click('home');assert.match(await page.$eval('#tab-estudio',e=>e.textContent),/Nota 4,0/);
  await click('library');await page.click('[data-action="subject"][data-id="sistemas-salud"]');assert.equal(await page.$('[data-action="exam"]'),null);
  assert.deepEqual(errors,[]);console.log('PASS: 10/15-question AI exam, another exam from the result or mid-attempt, delayed feedback, grade, omissions, navigation, resume, history, generation recovery, hidden shared counter and responsive 320–1280.');
 }catch(error){if(page){await page.screenshot({path:path.resolve(__dirname,'../test-results/prueba-error.png'),fullPage:true});console.error(await page.$eval('#tab-estudio',e=>e.textContent.slice(0,1200)))}throw error}
 finally{if(browser)await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
