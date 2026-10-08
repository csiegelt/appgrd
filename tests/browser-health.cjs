// Isolated synthetic browser profile and mocked AI; no documents or credentials.
const puppeteer=require('puppeteer-core'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
(async()=>{
 const cwd=path.resolve(__dirname,'..');fs.mkdirSync(path.join(cwd,'test-results'),{recursive:true});
 const server=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,PORT:'18795',HOST:'127.0.0.1',APP_ORIGIN:'',APP_PASSWORD:'',OPENAI_API_KEY:''},stdio:'pipe'});
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)))});
  browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1280,height:1000});
  await page.goto('http://127.0.0.1:18795');
  await page.evaluate(()=>{
   const subject=structuredClone(ECONOMIA_ASIGNATURA);subject.lessons=subject.lessons.slice(0,11);subject.economiaVersion=1;subject.lessons[0].text='Mi apunte sintético preservado';
   localStorage.setItem('grd-estudio-v1',JSON.stringify({subjects:[subject],selected:'economia-salud',notes:{'economia-salud/econ-incentivos':'Nota sintética'},progress:{'economia-salud/econ-incentivos':{read:true}},history:[{subject:'economia-salud',type:'bank',total:10,correct:8}]}));
   localStorage.setItem('grd-estudio-antes-economia-v1','respaldo sintético anterior');
  });await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('grd-estudio-v1')));assert.equal(saved.subjects[0].lessons.length,16);assert.equal(saved.subjects[0].lessons[0].text,'Mi apunte sintético preservado');assert.equal(saved.history.length,1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('grd-estudio-antes-economia-v1')),'respaldo sintético anterior');
  await page.click('[data-id="economia-salud"]');assert.equal(await page.$$('.econ-topic-row').then(e=>e.length),16);
  await page.click('[data-action="resources"]');
  const tab=async id=>page.click(`[data-e-action="tab"][data-tab="${id}"]`),set=async(field,value)=>page.$eval(`[data-e-field="${field}"]:not([type="range"])`,(el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}))},value),body=()=>page.$eval('#econ-output',e=>e.textContent);
  const specs=[['production','production.m',2,2],['inputs','inputs.pm',3,1],['physician','physician.alpha',2,2],['altruism','altruism.alpha',1,1],['evaluation','evaluation.threshold',80,1]];
  for(const [id,field,value,plots] of specs){
   await tab(id);await set(field,value);assert.equal(await page.$('#econ-output [role="alert"]'),null,id);assert.equal(await page.$$('#econ-output svg').then(x=>x.length),plots);
   assert.ok(await page.$('.econ-formula-applied'));await page.click('[data-e-field="formulas"]');assert.equal(await page.$('.econ-formula'),null);await page.click('[data-e-field="formulas"]');
   await page.click('[data-e-field="hide"]');assert.equal(await page.$('.econ-stats'),null);assert.ok(await page.$$eval('.econ-formula-applied b',els=>els.every(e=>e.textContent==='= ?')));await page.click('[data-e-field="hide"]');
   await page.$eval('#econ-output [data-e-explain]',e=>e.focus());assert.ok(await page.$eval('.econ-chart-reading',e=>e.textContent.length)>20);
   assert.ok(await page.evaluate(()=>{const els=[...document.querySelectorAll('#econ-output [id]')];return new Set(els.map(e=>e.id)).size===els.length&&[...document.querySelectorAll('#econ-output [aria-describedby]')].every(e=>document.getElementById(e.getAttribute('aria-describedby')))}));
   for(const width of [320,390,768,1280]){await page.setViewport({width,height:1000});await new Promise(r=>setTimeout(r,150));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' overflow '+width);}
   await page.screenshot({path:path.join(cwd,'test-results/health-'+id+'.png'),fullPage:true});
   await set(field,'');assert.ok(await page.$('#econ-output [role="alert"]'));await page.click('[data-e-action="undo"]');assert.equal(await page.$('#econ-output [role="alert"]'),null);
  }
  await tab('physician');assert.match(await body(),/Esfuerzo FFS6.*Esfuerzo capitación4/);await set('physician.alpha',0);assert.match(await body(),/Esfuerzo capitación0/);await set('physician.floor',5);assert.match(await body(),/Esfuerzo capitación5/);
  await tab('altruism');await set('altruism.alpha',0);assert.match(await body(),/Borde/);await set('altruism.alpha',50);assert.match(await body(),/Salud elegida10/);
  await tab('evaluation');await set('evaluation.eb',2);assert.match(await body(),/No definida/);await page.click('[data-e-action="reset"]');
  await tab('inputs');await page.type('[data-e-answer="0"]','4,6188');await page.type('[data-e-answer="1"]','13,8564');await page.click('#econ-exercise-form button');assert.equal(await page.$$('#econ-feedback .econ-correct').then(x=>x.length),2);
  await set('inputs.pm',5);await page.reload();await page.click('[data-id="economia-salud"]');await page.click('[data-action="resources"]');assert.equal(await page.$eval('[data-e-field="inputs.pm"][type="number"]',e=>e.value),'5');
  await page.type('[data-e-answer="0"]','3,5');await page.reload();await page.click('[data-id="economia-salud"]');await page.click('[data-action="resources"]');assert.equal(await page.$eval('[data-e-answer="0"]',e=>e.value),'3,5');
  await page.click('[data-e-action="new-exercise"]');assert.equal(await page.$eval('[data-e-answer="0"]',e=>e.value),'');assert.ok(await page.$eval('[data-e-field="hide"]',e=>e.checked));
  await page.click('[data-action="subject"]');await page.click('[data-action="bank-topic"][data-id="econ-utilidad-medico"]');assert.match(await page.$eval('.study-bank-tags',e=>e.textContent),/Utilidad del médico/);await page.click('[data-action="bank-answer"][data-index="0"]');assert.ok(await page.$('.study-answer'));
  await page.setViewport({width:390,height:844});await page.click('[data-action="home"]');await page.click('[data-action="resources"][data-lab="physician"]');await page.screenshot({path:path.join(cwd,'test-results/health-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('Health labs, formulas, responsive charts, bank, migration, answers and storage OK');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
