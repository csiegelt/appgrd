// Real browser checks; AI transport is explicitly mocked, no real account or charges.
const puppeteer = require('puppeteer-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

(async () => {
  const server = spawn(process.execPath, ['server.mjs'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: '18789', HOST: '127.0.0.1', APP_ORIGIN: '', APP_PASSWORD: '', OPENAI_API_KEY: '', OPENAI_MODEL: 'gpt-4.1-mini' }, stdio: 'pipe' });
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error('Server exited: ' + code))); });
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--disable-gpu'], userDataDir: path.resolve(__dirname, '../test-results/browser-profile-' + Date.now()) });
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:18789');
    const click = async a => { const sel = `#tab-estudio [data-action="${a}"]`; await page.$eval(sel, e => e.scrollIntoView({ block: 'center' })); await page.click(sel); };
    const enterStudy = async (id = 'sistemas-salud') => { await page.click(`[data-action="subject"][data-id="${id}"]`); await click('home'); };
    const assertWidth = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
    fs.mkdirSync(path.resolve(__dirname, '../test-results'), { recursive: true });
    assert.equal(await page.$eval('#tab-estudio h2', e => e.textContent), 'Asignaturas');
    await page.waitForFunction(() => document.querySelector('#study-api-usage')?.textContent.includes('Configura la API'));
    assert.equal(await page.$eval('#tabs', e => e.hidden), true);
    assert.equal(await page.$$eval('.study-topic, .study-mode-card', x => x.length), 0);
    await assertWidth();
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/asignaturas-mobile.png'), fullPage: true });
    await click('subject');
    assert.equal(await page.$eval('#tab-estudio h2', e => e.textContent), 'Sistemas de Salud');
    assert.deepEqual(await page.$$eval('.study-module-card > strong', x => x.map(e => e.textContent)), ['Estudio para la prueba', 'GRD']);
    assert.equal(await page.$eval('#tabs', e => e.hidden), true);
    await assertWidth();
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/sistemas-salud-mobile.png'), fullPage: true });
    await click('home');
    assert.match(await page.$eval('.study-breadcrumbs', e => e.textContent), /Inicio.*Sistemas de Salud.*Estudio para la prueba/);
    assert.equal(await page.$$eval('.study-topic', x => x.length), 14);
    assert.equal(await page.evaluate(() => SALUD_ASIGNATURA.lessons.reduce((n,l) => n+l.questions.length,0)), 37);
    await assertWidth();
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/estudio-mobile.png'), fullPage: true });
    await click('lesson'); await page.type('#study-note', 'Mi apunte persistente'); await click('mark-read'); await click('home');
    await click('cards'); await click('reveal'); await click('known'); await click('home');
    await click('quiz');
    for (let i = 0; i < 10; i++) { await click('answer'); assert.ok(await page.$('.study-answer')); await click('next-question'); }
    assert.ok(await page.$('.study-result')); await click('home');
    await click('cases');
    await page.waitForNetworkIdle({ idleTime: 200 });
    assert.equal(await page.$$eval('#study-case-select option', x => x.length), 11);
    assert.match(await page.$eval('.study-case-scenario', e => e.textContent), /Director\/a de hospital/);
    await page.select('#study-case-select', '0'); await page.type('[data-note]', 'Análisis del caso original');
    await page.select('#study-case-select', '3'); await page.type('[data-note]', 'Validaría datos y priorizaría continuidad con responsables claros.');
    await page.click('.study-case-step summary');
    assert.ok(await page.$('.study-case-step details[open]'));
    await page.select('#study-case-select', '4'); assert.equal(await page.$eval('[data-note]', e => e.value), '');
    await click('random-case'); assert.notEqual(await page.$eval('#study-case-select', e => e.value), '4');
    await page.select('#study-case-select', '3');
    assert.match(await page.$eval('[data-note]', e => e.value), /Validaría datos/);
    await assertWidth(); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/casos-director-mobile.png'), fullPage: true });
    await click('case-to-tutor');
    assert.match(await page.$eval('#study-message', e => e.value), /Validaría datos/);
    assert.match(await page.$eval('#study-message', e => e.value), /una sola pregunta/);
    await page.waitForFunction(() => document.querySelector('#tab-estudio').textContent.includes('Falta configurar la API de OpenAI'));
    assert.equal(await page.$('[data-action="connect-ai"]'), null);
    assert.equal(await page.$eval('[data-action="begin-ai-practice"]', e => e.disabled), true);
    await assertWidth();
    await click('home');
    await page.reload(); await enterStudy(); await click('cases');
    await page.waitForNetworkIdle({ idleTime: 200 });
    assert.equal(await page.$eval('#study-case-select', e => e.value), '3');
    assert.match(await page.$eval('[data-note]', e => e.value), /Validaría datos/);
    await page.select('#study-case-select', '0'); assert.equal(await page.$eval('[data-note]', e => e.value), 'Análisis del caso original');
    await click('home');
    await page.type('#study-search', 'intercambiabilidad'); assert.ok(await page.$$eval('.study-topic', x => x.length < 14 && x.length > 0));
    await click('library'); await click('new-subject');
    assert.match(await page.$eval('.study-breadcrumbs', e => e.textContent), /Inicio.*Nueva asignatura/);
    await page.type('[name="subject"]', 'Economía aplicada'); await page.type('[name="title"]', 'Costo de oportunidad');
    await page.type('[name="text"]', 'El costo de oportunidad es el valor de la mejor alternativa que se sacrifica al decidir. Permite comparar decisiones sobre recursos escasos y obliga a identificar los beneficios que se dejan de obtener.');
    await page.click('#study-editor [type="submit"]'); assert.ok((await page.$eval('.study-section-title', e => e.textContent)).includes('Costo de oportunidad'));
    await page.waitForFunction(() => !document.querySelector('#app-home').disabled);
    assert.match(await page.$eval('.study-material', e => e.textContent), /Falta configurar la API/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('grd-estudio-v1')).subjects.at(-1).lessons[0].questions.length), 0, 'Missing API saves the source without fabricated cards');
    const customId = await page.evaluate(() => JSON.parse(localStorage.getItem('grd-estudio-v1')).selected);
    await page.reload();
    assert.equal(await page.$eval('#tab-estudio h2', e => e.textContent), 'Asignaturas');
    assert.equal(await page.$$eval('.study-subject-card[data-action="subject"]', x => x.length), 4);
    await page.click(`[data-action="subject"][data-id="${customId}"]`);
    assert.equal(await page.$$eval('.study-module-card', x => x.length), 1);
    assert.equal(await page.$('[data-action="grd"]'), null, 'GRD belongs only to Sistemas de Salud');
    await click('home'); assert.ok((await page.$eval('.study-hero', e => e.textContent)).includes('Economía aplicada'));
    // Restore to bundled subject to exercise contextual AI generation and conversation.
    await page.click('#app-home'); await enterStudy();
    let requests = [], authorized = false, quotaError = false, caseError = false, materialError = false, holdCase = false, releaseCase, markCaseWaiting;
    const usageFixture = { configured: true, model: 'test-model', since: new Date().toISOString(), calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, unreportedCalls: 0, rateLimits: [], quota: { state: 'unknown' } };
    await page.setRequestInterception(true);
    page.on('request', async req => {
      if (req.url().endsWith('/api/usage')) return req.respond({ status: authorized ? 200 : 401, contentType: 'application/json', body: JSON.stringify(authorized ? usageFixture : { error: 'Ingresa al tutor para ver el consumo.' }) });
      if (req.url().endsWith('/api/session')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true, provider: 'openai-api', configured: true, protected: true, authRequired: !authorized, connected: authorized, models: authorized ? [{ slug: 'test-model', display_name: 'Modelo de prueba' }] : [] }) });
      if (req.url().endsWith('/api/login')) {
        authorized = JSON.parse(req.postData()).password === 'test-access-password';
        return req.respond({ status: authorized ? 200 : 401, contentType: 'application/json', body: JSON.stringify(authorized ? { ok: true } : { error: 'La contraseña de acceso no es correcta.' }) });
      }
      if (req.url().endsWith('/api/check')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'Clave y acceso al modelo verificados.' }) });
      if (req.url().endsWith('/api/logout')) { authorized = false; return req.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
      if (req.url().endsWith('/api/tutor')) {
        const data = JSON.parse(req.postData()); requests.push(data);
        if (quotaError) {
          usageFixture.quota = { state: 'exhausted', code: 'insufficient_quota', message: 'La API no tiene saldo. Revisa la facturación en OpenAI Platform.' };
          return req.respond({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: usageFixture.quota.message, code: 'insufficient_quota' }) });
        }
        if (data.generateCase && caseError) return req.respond({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'La IA devolvió un caso incompleto. Vuelve a generar el caso; se conserva tu práctica anterior.' }) });
        if (data.generateCase && holdCase) await new Promise(resolve => { releaseCase = resolve; markCaseWaiting(); });
        usageFixture.calls++; usageFixture.inputTokens += 120; usageFixture.outputTokens += 30; usageFixture.totalTokens += 150;
        usageFixture.lastCall = { usage: { inputTokens: 120, outputTokens: 30, totalTokens: 150 } };
        usageFixture.quota = { state: 'ok' };
        usageFixture.rateLimits = [{ remaining: 16000 - usageFixture.totalTokens, limit: 16000, scope: 'model', observedAt: new Date().toISOString(), resetAt: new Date(Date.now() + 60000).toISOString() }];
        if (data.generateMaterial) {
          if (materialError) return req.respond({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'La IA devolvió material incompleto. Tu material anterior se conserva.' }) });
          return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ material: {
            sourceTitle: data.context.lessons[0].title, objective: 'Identificar el beneficio al que se renuncia cuando se elige entre alternativas.',
            summary: ['La mejor opción descartada determina el costo de oportunidad.', 'Comparar beneficios ayuda a decidir cómo usar los recursos escasos.'],
            cards: ['¿Qué representa el costo de oportunidad?', '¿Por qué la escasez obliga a comparar alternativas?', '¿Qué beneficio debes identificar al decidir?'].map((prompt, i) => ({ prompt, answer: ['El valor de la mejor alternativa descartada.', 'Porque elegir un uso impide obtener los beneficios de otro.', 'El beneficio de la mejor opción a la que renuncias.'][i], explanation: 'La comparación permite fundamentar la decisión sobre el recurso.', evidence: data.context.lessons[0].text.split('. ')[0] }))
          } }) });
        }
        if (data.generateCase) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ case: {
          id: 'ai-case-' + requests.length, title: 'Caso nuevo IA ' + requests.length, role: data.practiceStyle === 'hospital-director' ? 'Director/a de hospital' : 'Responsable del proyecto',
          text: 'Caso ficticio: debes coordinar a dos equipos ante una interrupción del servicio con recursos limitados.', fictional: true, generated: 'ai', sourceTitle: data.context.lessons[0].title,
          steps: [['Diagnóstico', '¿Qué información verificarías?', 'Consulta los datos y confirma la causa.'], ['Decisión', '¿Qué harías primero?', 'Prioriza, asigna recursos y responsables.'], ['Seguimiento', '¿Cómo medirías el resultado?', 'Define indicadores y vigila los riesgos.']]
        } }) });
        const questions = Array.from({ length: 6 }, (_,i) => ({ prompt: (data.practiceStyle === 'hospital-director' ? 'Caso ficticio: asumes como director. ¿Qué harías? ' : 'Pregunta de prueba ') + (i+1), answer: 'Correcta', options: ['Correcta','Distractor A','Distractor B'], explanation: 'Explicación de prueba basada en apuntes.', sourceTitle: data.context.lessons[0].title }));
        return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: data.generate ? JSON.stringify({ questions }) : 'Explicación del tutor de prueba.', sources: [{ title: 'Fuente de prueba', url: 'https://example.org' }] }) });
      }
      req.continue();
    });
    await click('practice-ai'); await page.waitForSelector('#study-access-password');
    await page.type('#study-access-password', 'wrong'); await page.click('#study-login-form button');
    await page.waitForFunction(() => document.querySelector('.study-notice')?.textContent.includes('no es correcta'));
    await page.type('#study-access-password', 'test-access-password'); await page.click('#study-login-form button');
    await page.waitForSelector('#study-model');
    await click('check-api'); await page.waitForFunction(() => document.querySelector('.study-notice')?.textContent.includes('modelo verificados'));
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('test-access-password')), false);
    await assertWidth();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/tutor-api-mobile.png'), fullPage: true });
    await page.select('#study-difficulty', 'avanzada'); await page.select('#study-practice-style', 'hospital-director'); await click('begin-ai-practice'); await page.waitForSelector('.study-options');
    assert.equal(await page.$eval('.study-section-title .study-badge', e => e.textContent), '1 / 6');
    assert.match(requests[0].messages[0].content, /avanzada/); assert.equal(requests[0].generate, true);
    assert.equal(requests[0].practiceStyle, 'hospital-director');
    assert.match(requests[0].messages[0].content, /director\/a de hospital/);
    assert.match(await page.$eval('.study-panel h4', e => e.textContent), /Caso ficticio/);
    for (let i = 0; i < 6; i++) { await click('answer'); await click('next-question'); }
    assert.ok(await page.$('.study-result')); await click('home'); await click('tutor'); await page.waitForSelector('#study-model');
    await page.click('#study-web'); await page.type('#study-message', 'Explícame rectoría'); await page.click('#study-chat-form button'); await page.waitForSelector('.study-message.assistant');
    assert.equal(requests.at(-1).web, true); assert.equal(await page.$eval('.study-message.assistant a', e => e.href), 'https://example.org/');
    await page.click('#app-home');
    await page.waitForFunction(() => document.querySelector('[data-usage="total"]')?.textContent === '300');
    assert.equal(await page.$eval('[data-usage="remaining"]', e => e.textContent), '15.700');
    assert.match(await page.$eval('#study-api-usage', e => e.textContent), /límite temporal/);
    const beforeRefresh = requests.length; await click('refresh-usage');
    await page.waitForFunction(() => !document.querySelector('[data-action="refresh-usage"]').disabled);
    assert.equal(requests.length, beforeRefresh, 'Updating the counter does not generate a paid request');
    await assertWidth(); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/tokens-mobile.png'), fullPage: true });
    await enterStudy(); await click('tutor'); await page.waitForSelector('#study-model');
    quotaError = true;
    await page.type('#study-message', 'Mi consulta pendiente'); await page.click('#study-chat-form button');
    await page.waitForFunction(() => document.querySelector('.study-quota-alert')?.textContent.includes('no tiene saldo'));
    assert.equal(await page.$eval('#study-message', e => e.value), 'Mi consulta pendiente');
    assert.equal(await page.$$eval('.study-message.user', x => x.filter(e => e.textContent.includes('Mi consulta pendiente')).length), 0, 'Failed messages stay in the draft without duplicating the conversation');
    await page.click('#app-home');
    await page.waitForSelector('#study-api-usage .study-quota-alert[role="alert"]');
    assert.equal(await page.$eval('[data-usage="total"]', e => e.textContent), '300');
    await assertWidth(); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/tokens-sin-saldo-mobile.png'), fullPage: true });
    await enterStudy(); await click('tutor'); await page.waitForSelector('#study-model');
    quotaError = false; await page.click('#study-chat-form button');
    await page.waitForFunction(() => !document.querySelector('.study-quota-alert') && document.querySelectorAll('.study-message.assistant').length === 2);
    assert.equal(usageFixture.totalTokens, 450);
    await click('disconnect-ai'); await page.waitForSelector('#study-access-password');
    assert.equal(await page.$eval('#study-chat-form button', e => e.disabled), true);
    // Practical cases are generated in place, separate from defaults and browser storage.
    await click('home'); await click('cases'); await page.waitForSelector('#study-access-password');
    assert.equal(await page.$eval('[data-action="generate-case"]', e => e.disabled), true);
    await page.type('#study-access-password', 'test-access-password'); await page.click('#study-login-form button');
    await page.waitForFunction(() => document.querySelector('[data-action="generate-case"]')?.disabled === false);
    await page.select('#study-case-topic', 'salud-3'); await page.select('#study-case-difficulty', 'avanzada');
    const beforeCase = await page.evaluate(() => localStorage.getItem('grd-estudio-v1'));
    holdCase = true;
    const caseSent = new Promise(resolve => { markCaseWaiting = resolve; });
    await click('generate-case'); await caseSent;
    await page.waitForFunction(() => document.querySelector('.study-case-generator[aria-busy="true"]'));
    assert.equal(await page.$eval('[data-action="generate-case"]', e => e.disabled), true);
    assert.equal(await page.$eval('#study-case-topic', e => e.disabled), true);
    const firstCaseRequest = requests.at(-1);
    assert.equal(firstCaseRequest.generateCase, true); assert.equal(firstCaseRequest.generate, undefined);
    assert.equal(firstCaseRequest.context.lessons.length, 1); assert.equal(firstCaseRequest.difficulty, 'avanzada');
    assert.equal(firstCaseRequest.practiceStyle, 'hospital-director'); assert.equal(firstCaseRequest.web, false);
    assert.equal(firstCaseRequest.avoidCases.length, 11);
    holdCase = false; releaseCase();
    await page.waitForSelector('#study-case-ai-select');
    await page.waitForFunction(() => !document.querySelector('[data-action="generate-case"]').disabled);
    const firstCaseTitle = await page.$eval('.study-case-scenario h4', e => e.textContent);
    assert.equal(await page.$$eval('.study-case-step', nodes => nodes.length), 3);
    assert.equal(await page.$$eval('.study-case-step details[open]', nodes => nodes.length), 0, 'Solutions are initially hidden');
    await page.type('[data-case-note]', 'Mi plan temporal IA');
    await page.click('.study-case-step summary'); assert.ok(await page.$('.study-case-step details[open]'));
    assert.equal(await page.evaluate(() => localStorage.getItem('grd-estudio-v1')), beforeCase, 'Generated case and answers do not change saved study data');
    await assertWidth(); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/casos-ia-mobile.png'), fullPage: true });
    await page.setViewport({ width: 1280, height: 900 }); await assertWidth();
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/casos-ia-desktop.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await click('cases-default'); assert.equal(await page.$$eval('#study-case-select option', nodes => nodes.length), 11);
    assert.equal(await page.$eval('[data-note]', e => e.value), 'Análisis del caso original');
    await click('cases-ai'); assert.equal(await page.$eval('[data-case-note]', e => e.value), 'Mi plan temporal IA');
    await click('case-to-tutor'); assert.match(await page.$eval('#study-message', e => e.value), /Mi plan temporal IA/);
    assert.equal(await page.$eval('#study-ai-context', e => e.value), 'salud-3');
    await click('home'); await click('cases');
    await page.waitForFunction(() => !document.querySelector('[data-action="generate-case"]').disabled);
    caseError = true; await click('generate-case');
    await page.waitForFunction(() => document.querySelector('.study-notice')?.textContent.includes('caso incompleto') && !document.querySelector('[data-action="generate-case"]').disabled);
    assert.equal(await page.$eval('.study-case-scenario h4', e => e.textContent), firstCaseTitle);
    assert.equal(await page.$eval('[data-case-note]', e => e.value), 'Mi plan temporal IA');
    caseError = false; quotaError = true; await click('generate-case');
    await page.waitForSelector('.study-case-generator .study-quota-alert');
    await page.waitForFunction(() => !document.querySelector('[data-action="generate-case"]').disabled);
    assert.equal(await page.$eval('[data-case-note]', e => e.value), 'Mi plan temporal IA');
    quotaError = false;
    await page.select('#study-case-topic', ''); await click('generate-case');
    await page.waitForFunction(() => document.querySelectorAll('#study-case-ai-select option').length === 2 && !document.querySelector('[data-action="generate-case"]').disabled);
    assert.equal(await page.$('.study-quota-alert'), null);
    assert.notEqual(requests.at(-1).context.lessons[0].title, firstCaseRequest.context.lessons[0].title, 'Random topic changes when other lessons exist');
    assert.equal(requests.at(-1).avoidCases.length, 12);
    assert.equal(await page.$eval('[data-case-note]', e => e.value), '');
    await page.select('#study-case-ai-select', '0'); assert.equal(await page.$eval('[data-case-note]', e => e.value), 'Mi plan temporal IA');
    await page.click('#app-home');
    await page.waitForFunction(() => document.querySelector('[data-usage="total"]')?.textContent === '750');
    await enterStudy(customId); await click('cases');
    await page.waitForFunction(() => !document.querySelector('[data-action="generate-case"]').disabled);
    assert.match(await page.$eval('.study-empty', e => e.textContent), /no tiene casos incluidos/);
    await click('generate-case'); await page.waitForSelector('#study-case-ai-select');
    assert.equal(requests.at(-1).context.name, 'Economía aplicada'); assert.equal(requests.at(-1).practiceStyle, 'concepts');
    assert.equal(requests.at(-1).avoidCases.length, 0, 'Cases from another subject are not included');
    await page.waitForFunction(() => !document.querySelector('[data-action="generate-case"]').disabled);
    await page.reload(); await enterStudy(); await click('cases');
    assert.equal(await page.$$eval('#study-case-select option', nodes => nodes.length), 11);
    assert.equal(await page.$eval('[data-note]', e => e.value), 'Análisis del caso original');
    assert.equal(await page.$eval('[data-action="cases-ai"]', e => e.textContent), 'Casos IA de esta sesión (0)');
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('Mi plan temporal IA')), false);
    await click('home'); await click('tutor'); await page.waitForSelector('#study-model');
    await click('disconnect-ai'); await page.waitForSelector('#study-access-password');
    await assertWidth(); await click('home');
    await page.setViewport({ width: 1280, height: 900 }); await assertWidth();
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/estudio-desktop.png'), fullPage: true });
    await click('subject');
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/sistemas-salud-desktop.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await click('grd');
    assert.equal(await page.$eval('#tabs', e => e.hidden), false);
    assert.equal(await page.$eval('#grd-context', e => e.hidden), false);
    assert.ok(await page.$('#tab-dashboard.active'));
    assert.equal(await page.$eval('#filters', e => e.hidden), false);
    await assertWidth();
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/grd-mobile.png'), fullPage: true });
    // Existing calculations and navigation remain inside the GRD module.
    await page.setViewport({ width: 1280, height: 900 });
    for (const tab of ['dashboard','distribucion','egresos','simulador','alumno','licitacion','catalogo','parametros','guia']) { await page.click(`[data-tab="${tab}"]`); assert.ok(await page.$(`#tab-${tab}.active`)); }
    await page.click('#grd-subject');
    assert.equal(await page.$eval('#tab-estudio h2', e => e.textContent), 'Sistemas de Salud');
    assert.equal(await page.$eval('#tabs', e => e.hidden), true);
    assert.equal(await page.$eval('#grd-context', e => e.hidden), true);
    assert.equal(await page.$eval('#filters', e => e.hidden), true);
    await click('home'); await page.click('[data-action="lesson"][data-id="salud-1"]');
    assert.equal(await page.$eval('#study-note', e => e.value), 'Mi apunte persistente');
    await page.click('#app-home');
    assert.equal(await page.$eval('#tab-estudio h2', e => e.textContent), 'Asignaturas');
    await assertWidth();
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/asignaturas-desktop.png'), fullPage: true });
    await click('subject'); await click('grd'); await page.click('#app-home');
    assert.equal(await page.$eval('#tab-estudio h2', e => e.textContent), 'Asignaturas');
    assert.equal(await page.$eval('#tabs', e => e.hidden), true);
    // Saving AI questions or adding a lesson must keep the original subject card and GRD access.
    await enterStudy(); await click('tutor'); await page.waitForSelector('#study-access-password');
    await page.type('#study-access-password', 'test-access-password'); await page.click('#study-login-form button');
    await page.waitForSelector('#study-model'); await page.select('#study-ai-context', 'salud-1');
    await click('generate-ai');
    await page.waitForFunction(() => document.querySelector('.study-notice')?.textContent.includes('Se agregaron 6 preguntas'));
    await page.waitForFunction(() => !document.querySelector('#app-home').disabled);
    await page.click('#app-home');
    assert.equal(await page.$$eval('.study-subject-card[data-action="subject"]', nodes => nodes.length), 4);
    assert.equal(await page.$$eval('.study-subject-card[data-id="sistemas-salud"]', nodes => nodes.length), 1);
    await enterStudy(); await click('add-lesson');
    await page.type('[name="title"]', 'Mi tema adicional');
    await page.type('[name="text"]', 'Este tema agrega material personal para estudiar sin duplicar la asignatura. Las preguntas y los apuntes deben mantenerse en el mismo espacio de Sistemas de Salud.');
    await page.click('#study-editor [type="submit"]');
    await page.waitForFunction(() => document.querySelector('.study-notice')?.textContent.includes('Guía y 3 tarjetas creadas') && !document.querySelector('#app-home').disabled);
    assert.equal(requests.at(-1).generateMaterial, true, 'Creating a topic uses AI by default');
    await page.click('#app-home'); await page.reload();
    assert.equal(await page.$$eval('.study-subject-card[data-action="subject"]', nodes => nodes.length), 4);
    const healthSaved = await page.evaluate(() => JSON.parse(localStorage.getItem('grd-estudio-v1')).subjects.find(s => s.id === 'sistemas-salud'));
    assert.equal(healthSaved.name, 'Sistemas de Salud'); assert.equal(healthSaved.lessons.length, 15);
    assert.equal(healthSaved.lessons.flatMap(l => l.questions).filter(q => q.options).length, 43);
    // Recover an old automatic duplicate on reload, including notes that conflict with the original.
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('grd-estudio-v1'));
      const legacy = structuredClone(SALUD_ASIGNATURA); legacy.id = 'legacy-ai-copy'; legacy.name += ' · Mi práctica IA';
      legacy.lessons[0].questions.push({ id: 'legacy-ai-question', prompt: 'Pregunta de la copia anterior', answer: 'Respuesta recuperada', explanation: 'Fundamento recuperado' });
      saved.subjects.push(legacy); saved.notes['legacy-ai-copy/salud-1'] = 'Apunte de la copia anterior'; saved.selected = legacy.id;
      localStorage.setItem('grd-estudio-v1', JSON.stringify(saved));
    });
    await page.reload();
    assert.equal(await page.$$eval('.study-subject-card[data-action="subject"]', nodes => nodes.length), 4);
    assert.equal(await page.$$eval('.study-subject-card strong', nodes => nodes.filter(n => n.textContent.includes('Mi práctica IA')).length), 0);
    assert.equal(await page.evaluate(() => !!localStorage.getItem('grd-estudio-antes-unificar-v1')), true);
    await page.setViewport({ width: 390, height: 844 }); await assertWidth();
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/asignaturas-unificadas-mobile.png'), fullPage: true });
    await click('subject'); assert.equal(await page.$$eval('.study-module-card', nodes => nodes.length), 2);
    await click('home'); await page.click('[data-action="lesson"][data-id="salud-1"]');
    assert.match(await page.$eval('#study-note', e => e.value), /Mi apunte persistente/);
    assert.match(await page.$eval('#study-note', e => e.value), /Apunte de la copia anterior/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('grd-estudio-v1')).subjects.find(s => s.id === 'sistemas-salud').lessons[0].questions.filter(q => q.id === 'legacy-ai-question').length), 1);
    // Replace legacy extract cards with authored AI material, keeping text, notes and other questions.
    await page.click('#app-home'); await enterStudy(customId);
    await page.evaluate(id => {
      const saved = JSON.parse(localStorage.getItem('grd-estudio-v1')), s = saved.subjects.find(s => s.id === id), l = s.lessons[0];
      l.questions = [{ id: 'old-extract', prompt: 'Explica la idea de este fragmento: texto', answer: l.text, explanation: 'Un extracto', generated: 'extract' }, { id: 'manual-question', prompt: 'Mi pregunta personal', answer: 'Mi respuesta personal', explanation: 'Mi explicación' }];
      l.summary = [l.text.slice(0, 100)]; delete l.materialStatus;
      saved.notes[id + '/' + l.id] = 'Mi apunte de economía'; localStorage.setItem('grd-estudio-v1', JSON.stringify(saved));
    }, customId);
    await page.reload(); await enterStudy(customId); await click('cards');
    assert.match(await page.$eval('.study-material', e => e.textContent), /tarjetas antiguas/);
    assert.equal(await page.$eval('.study-section-title .study-badge', e => e.textContent), '1 tarjetas', 'Legacy fragments are no longer offered as cards');
    await click('generate-material');
    await page.waitForFunction(() => document.querySelector('.study-notice')?.textContent.includes('Guía y 3 tarjetas creadas') && !document.querySelector('#app-home').disabled);
    assert.equal(requests.at(-1).generateMaterial, true); assert.equal(requests.at(-1).context.name, 'Economía aplicada');
    assert.equal(requests.at(-1).context.lessons.length, 1); assert.equal(requests.at(-1).web, false);
    const materialSaved = await page.evaluate(id => JSON.parse(localStorage.getItem('grd-estudio-v1')).subjects.find(s => s.id === id).lessons[0], customId);
    assert.equal(materialSaved.questions.length, 4); assert.equal(materialSaved.questions.filter(q => q.generated === 'ai-material').length, 3);
    assert.ok(materialSaved.questions.some(q => q.id === 'manual-question')); assert.equal(materialSaved.questions.some(q => q.id === 'old-extract'), false);
    assert.equal(materialSaved.materialStatus, 'ready');
    await click('next-card'); await click('reveal');
    assert.match(await page.$eval('.study-answer strong', e => e.textContent), /mejor alternativa descartada/);
    assert.ok(await page.$('.study-evidence')); await assertWidth(); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/tarjetas-ia-mobile.png'), fullPage: true });
    await click('source'); assert.equal(await page.$eval('#study-note', e => e.value), 'Mi apunte de economía');
    await click('lesson-mode'); assert.match(await page.$eval('.study-objective', e => e.textContent), /beneficio al que se renuncia/);
    assert.equal(await page.$$eval('.study-support article', nodes => nodes.length), 2);
    await page.setViewport({ width: 1280, height: 900 }); await assertWidth(); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/guia-ia-desktop.png'), fullPage: true });
    materialError = true; await click('generate-material');
    await page.waitForFunction(() => document.querySelector('.study-notice')?.textContent.includes('material incompleto') && !document.querySelector('#app-home').disabled);
    assert.deepEqual(await page.evaluate(id => JSON.parse(localStorage.getItem('grd-estudio-v1')).subjects.find(s => s.id === id).lessons[0], customId), materialSaved);
    materialError = false; quotaError = true; await click('generate-material');
    await page.waitForFunction(() => document.querySelector('.study-quota-alert') && !document.querySelector('#app-home').disabled);
    assert.deepEqual(await page.evaluate(id => JSON.parse(localStorage.getItem('grd-estudio-v1')).subjects.find(s => s.id === id).lessons[0], customId), materialSaved);
    quotaError = false; await click('generate-material');
    await page.waitForFunction(() => document.querySelector('.study-notice')?.textContent.includes('Guía y 3 tarjetas creadas') && !document.querySelector('#app-home').disabled);
    assert.equal(await page.$('.study-quota-alert'), null);
    assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem('grd-estudio-v1')).subjects.find(s => s.id === id).lessons[0].questions.length, customId), 4, 'Regeneration replaces its previous cards instead of duplicating them');
    await page.reload(); await enterStudy(customId); await click('lesson');
    assert.equal(await page.$eval('#study-note', e => e.value), 'Mi apunte de economía');
    assert.match(await page.$eval('.study-objective', e => e.textContent), /beneficio al que se renuncia/);
    await click('topic-quiz'); await page.type('#study-open-answer', 'Mi respuesta con mis palabras'); await click('open-answer'); assert.ok(await page.$('[data-action="self-correct"]'));
    assert.deepEqual(errors, []);
    console.log('PASS: study/GRD hierarchy, mobile/desktop, AI guides and cards, legacy-card replacement, error recovery, preserved notes, generated cases, quota and duplicate-subject recovery.');
  } catch (err) {
    if (browser) { const pages = await browser.pages(); const p = pages.at(-1); await p.screenshot({ path: path.resolve(__dirname, '../test-results/failure.png'), fullPage: true }); console.error('Visible state:', await p.$eval('#tab-estudio', e => e.innerText.slice(0, 2000))); }
    throw err;
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
