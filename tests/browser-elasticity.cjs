const puppeteer=require('puppeteer-core'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
(async()=>{
 const cwd=path.resolve(__dirname,'..');fs.mkdirSync(path.join(cwd,'test-results'),{recursive:true});
 const server=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,PORT:'18794',HOST:'127.0.0.1',APP_ORIGIN:'',APP_PASSWORD:'',OPENAI_API_KEY:''},stdio:'pipe'});
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
  browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1280,height:1000});await page.goto('http://127.0.0.1:18794');
  const enter=async()=>{await page.click('[data-id="economia-salud"]');await page.click('[data-action="resources"]')};await enter();await page.click('[data-e-action="tab"][data-tab="elasticity"]');
  const select=async v=>page.select('[data-e-field="elasticity.view"]',v);
  const set=async(field,value)=>page.$eval(`[data-e-field="${field}"]:not([type="range"])`,(el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}))},value);
  const preset=async v=>page.click(`[data-preset="elasticity-${v}"]`),body=()=>page.$eval('#econ-output',e=>e.textContent);
  const screenshot=async name=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(cwd,'test-results/elasticity-'+name+'.png'),fullPage:true})};
  const accessible=async()=>assert.ok(await page.evaluate(()=>{
   const root=document.querySelector('#econ-output'),ids=[...root.querySelectorAll('[id]')].map(e=>e.id);
   return new Set(ids).size===ids.length&&[...root.querySelectorAll('[aria-describedby]')].every(e=>document.getElementById(e.getAttribute('aria-describedby')));
  }),'Every chart has unique IDs and existing description targets');
  assert.match(await body(),/\$450/);
  for(const side of ['demand','supply']){
   await select(side);
   for(const [id,kind] of [['zero','Perfectamente inelástica'],['inelastic','Inelástica'],['unit','Unitaria'],['elastic','Elástica'],['infinite','Perfectamente elástica']]){
    await preset(side+':'+id);assert.match(await page.$eval('.econ-stats',e=>e.textContent),new RegExp(kind));assert.ok(await page.$('#econ-chart'));await accessible();
   }
  }
  await select('demand');await preset('demand:inelastic');
  await page.$eval('[data-e-field="elasticity.q2"][type="range"]',e=>{e.value='70';e.dispatchEvent(new Event('input',{bubbles:true}))});assert.match(await body(),/\$350/);
  await page.focus('.econ-area-key');assert.match(await page.$eval('#econ-chart-reading',e=>e.textContent),/Cambio del precio/);
  assert.equal(await page.$('.econ-hover-card'),null);
  await set('elasticity.p1',5);await set('elasticity.p2',4);await set('elasticity.q1',90);await set('elasticity.q2',100);
  assert.deepEqual(await page.$$eval('.econ-area-key strong',els=>els.map(e=>e.textContent)),['$90','$40']);
  await preset('demand:inelastic');await screenshot('demand');
  await select('revenue');assert.equal(await page.$$('#econ-output svg').then(x=>x.length),2);
  assert.match(await page.$eval('.econ-comparison:first-child',e=>e.textContent),/\$450/);assert.match(await page.$eval('.econ-comparison:last-child',e=>e.textContent),/\$350/);
  await set('elasticity.compare.a.q2',95);assert.match(await page.$eval('.econ-comparison:first-child',e=>e.textContent),/\$475/);assert.match(await page.$eval('.econ-comparison:last-child',e=>e.textContent),/\$350/);await accessible();
  assert.ok(await page.$$eval('#econ-output .econ-curve',els=>els.every(e=>[...e.getAttribute('d').matchAll(/-?\d+(?:\.\d+)?/g)].every(m=>Math.abs(Number(m[0]))<=620))),'Steep curves use bounded SVG coordinates so Chrome can render them');
  await page.$eval('#econ-compare-b circle',e=>e.focus());assert.match(await page.$eval('#econ-compare-b-reading',e=>e.textContent),/Situación inicial/);
  await screenshot('comparison');
  await select('linear');assert.equal(await page.$$eval('.econ-elastic-table tbody tr',e=>e.length),8);assert.match(await page.$eval('.econ-stats',e=>e.textContent),/\$24,5/);
  await set('elasticity.linear.segment',0);assert.match(await page.$eval('.econ-stats',e=>e.textContent),/−?(-)?13/);await set('elasticity.linear.segment',6);await set('elasticity.linear.segments',2);assert.equal(await page.$eval('[data-e-field="elasticity.linear.segment"][type="number"]',e=>e.value),'1');
  await set('elasticity.linear.segments',7);await set('elasticity.linear.segment',3);await accessible();await screenshot('linear');
  await select('shifts');await preset('shift:wheat');assert.match(await page.$eval('.econ-stats',e=>e.textContent),/\$3 → \$2.*100 → 110.*\$300 → \$220/);
  await set('elasticity.shift.change',0);assert.ok(await page.$('#econ-chart'));await accessible();
  await preset('shift:oil');const stats=await page.$$eval('.econ-stats',els=>els.map(e=>e.textContent));assert.match(stats[0],/\$62,5/);assert.match(stats[1],/\$52,5/);await accessible();await screenshot('oil');
  await set('elasticity.shift.ed',.01);await set('elasticity.shift.es',.01);await set('elasticity.shift.change',80);assert.equal(await page.$('#econ-chart'),null);assert.match(await body(),/tramo/);await preset('shift:oil');
  await select('other');assert.match(await body(),/respuesta proporcional/);await set('elasticity.other.q2',90);assert.match(await body(),/Bien inferior/);await page.select('[data-e-field="elasticity.other.mode"]','cross');assert.match(await body(),/Complementos/);await set('elasticity.other.q2',120);assert.match(await body(),/Sustitutos/);
  for(const view of ['demand','supply','revenue','linear','shifts','other']){
   await select(view);await page.click('[data-e-field="hide"]');assert.equal(await page.$('.econ-stats'),null);assert.ok(await page.$$eval('.econ-area-key strong',e=>e.every(x=>x.textContent==='?')));await page.click('[data-e-field="hide"]');
   for(const width of [320,390,768,1280]){
    await page.setViewport({width,height:1000});await new Promise(r=>setTimeout(r,120));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' overflows at '+width);
    assert.ok(await page.$$eval('.econ-chart-reading',els=>els.every(e=>{const r=e.getBoundingClientRect(),next=e.nextElementSibling.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=next.top})),'Descriptions do not cover cards');
    assert.ok(await page.$$eval('#econ-output svg',els=>els.every(svg=>{const labels=[...svg.querySelectorAll('.econ-point-label')].map(e=>e.getBBox());return labels.every((a,i)=>labels.every((b,j)=>i===j||a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y))})),'Point labels do not overlap each other');
   }
  }
  await select('shifts');await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await enter();await new Promise(r=>setTimeout(r,250));await page.tap('.econ-point-keys button');assert.match(await page.$eval('#econ-chart-reading',e=>e.textContent),/Equilibrio antes/);await screenshot('mobile');
  await select('revenue');await page.reload();await enter();assert.equal(await page.$eval('[data-e-field="elasticity.view"]',e=>e.value),'revenue');assert.equal(await page.$eval('[data-e-field="elasticity.compare.a.q2"]',e=>e.value),'95');
  // A saved exercise from before this extension keeps its values and gains the new editors.
  await page.evaluate(()=>localStorage.setItem('grd-economia-practica-v1',JSON.stringify({version:1,data:{tab:'elasticity',elasticity:{p1:20000,p2:25000,q1:100,q2:90}}})));
  await page.reload();await enter();assert.equal(await page.$eval('[data-e-field="elasticity.p1"]',e=>e.value),'20000');await select('linear');assert.ok(await page.$('#econ-linear-revenue'));
  assert.deepEqual(errors,[]);console.log('PASS: editable elasticity cases, revenue, linear demand, wheat/oil, labels, keyboard/touch, hidden results, persistence and responsive 320–1280.');
 }finally{if(browser)await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
