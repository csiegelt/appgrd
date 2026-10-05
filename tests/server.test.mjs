import test from 'node:test';
import assert from 'node:assert/strict';
import { collectResponse, tutorPayload, startServer, serverConfig } from '../server.mjs';
import { Readable } from 'node:stream';
import { request as httpRequest } from 'node:http';
import { validateGeneratedQuestions } from '../lib/tutor.mjs';

const input = { model: 'gpt-4.1-mini', context: { name: 'Salud', lessons: [{ title: 'Tema', text: 'Texto docente de estudio.' }] }, messages: [{ role: 'user', content: 'Explícame' }] };
const secret = 'sk-test-only-not-a-real-api-key';
const password = 'test-access-password-123';
const generatedQuestions = () => Array.from({ length: 6 }, (_,i) => ({ prompt: 'Pregunta ' + i, options: ['Primera','Segunda','Tercera'], answerIndex: i % 3, explanation: 'Fundamento en el texto', sourceTitle: 'Tema' }));
const stream = (text = 'Respuesta del tutor', annotations = []) => new Response('data: ' + JSON.stringify({ type: 'response.completed', response: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text, annotations }] }] } }) + '\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
async function setup(t, env = {}, fetchImpl = () => { throw Error('Unexpected external request'); }) {
  const server = await startServer(0, { env, fetchImpl, usageFile: null });
  t.after(() => new Promise(done => { server.close(done); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  return { origin, async call(path, body, headers = {}) {
    const options = { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, ...(body === undefined ? {} : { Origin: origin, 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
    // Node's fetch owns Host; a reverse-proxy test needs the low-level HTTP client.
    const response = headers.Host ? await new Promise((resolve, reject) => {
      const req = httpRequest(origin + path, options, res => {
        const chunks = []; res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: Object.fromEntries(Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value])) })));
      }); req.on('error', reject); req.end(options.body);
    }) : await fetch(origin + path, options);
    if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return response;
  } };
}

test('missing key gives clear setup status; credentials and cross-origin routes are protected', async t => {
  const { call, origin } = await setup(t);
  const first = await call('/api/session'), data = await first.json();
  assert.equal(data.provider, 'openai-api'); assert.equal(data.configured, false); assert.equal(data.connected, false);
  assert.match(first.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  for (const file of ['/server.mjs', '/.env', '/.env.example', '/lib/tutor.mjs', '/.local/host.json', '/package.json']) assert.equal((await call(file)).status, 404, file);
  assert.equal((await call('/')).status, 200);
  assert.equal((await call('/api/tutor', input, { Origin: 'https://attacker.invalid' })).status, 403);
  const missing = await call('/api/tutor', input); assert.equal(missing.status, 503); assert.match((await missing.json()).error, /OPENAI_API_KEY/);
  assert.equal((await call('/api/signin', {})).status, 404, 'Old ChatGPT login has been removed');
  assert.equal((await fetch(origin + '/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  const rejectedHost = await new Promise((resolve, reject) => { const req = httpRequest(origin, { headers: { Host: 'malicious.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); });
  assert.equal(rejectedHost, 403);
});

test('key stays server-side; model check and tutor use the official API', async t => {
  const requests = [];
  const { call } = await setup(t, { OPENAI_API_KEY: secret }, async (url, options) => {
    requests.push({ url, options });
    if (options.body && JSON.parse(options.body).text?.format) return stream(JSON.stringify({ questions: generatedQuestions() }));
    return url.includes('/models/') ? Response.json({ id: input.model }) : stream('Consulta resuelta', [{ type: 'url_citation', url: 'https://example.org', title: 'Fuente' }]);
  });
  const session = await (await call('/api/session')).text();
  assert.equal(JSON.parse(session).connected, true); assert.ok(!session.includes(secret)); assert.equal(requests.length, 0);
  assert.equal((await call('/api/check', {})).status, 200);
  assert.equal(requests[0].url, 'https://api.openai.com/v1/models/gpt-4.1-mini');
  const result = await call('/api/tutor', { ...input, web: true }); assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { text: 'Consulta resuelta', sources: [{ title: 'Fuente', url: 'https://example.org' }], usage: null });
  assert.equal(requests[1].url, 'https://api.openai.com/v1/responses');
  assert.equal(requests[1].options.headers.Authorization, 'Bearer ' + secret);
  const payload = JSON.parse(requests[1].options.body);
  assert.equal(payload.store, false); assert.deepEqual(payload.tools, [{ type: 'web_search' }]); assert.ok(!requests[1].options.body.includes(secret));
  assert.equal((await call('/api/tutor', { ...input, model: 'unapproved-model' })).status, 400);
  assert.equal(requests.length, 2);
  const generated = await call('/api/tutor', { ...input, web: true, generate: true, practiceStyle: 'hospital-director' });
  assert.equal(generated.status, 200);
  const received = JSON.parse((await generated.json()).text).questions;
  assert.ok(received.every(q => q.options.includes(q.answer)));
  assert.equal(received[1].answer, 'Segunda');
  const quiz = JSON.parse(requests[2].options.body);
  assert.equal(quiz.text.format.schema.properties.questions.maxItems, 6); assert.equal(quiz.tools, undefined);
  assert.match(quiz.instructions, /director\/a de hospital/);
});

test('generated answers reference exact choices and malformed or duplicated output is rejected', () => {
  const validate = qs => validateGeneratedQuestions(JSON.stringify({ questions: qs }), input.context.lessons);
  const original = generatedQuestions();
  const result = JSON.parse(validate(original));
  assert.deepEqual(result.questions.map(q => q.answer), ['Primera', 'Segunda', 'Tercera', 'Primera', 'Segunda', 'Tercera']);
  for (const changes of [ { answerIndex: 3 }, { answerIndex: 0.5 }, { options: ['Igual', 'igual', 'Otra'] }, { sourceTitle: 'Fuente inventada' }, { explanation: '' }, { prompt: original[1].prompt } ]) {
    const qs = generatedQuestions(); Object.assign(qs[0], changes); assert.throws(() => validate(qs));
  }
  assert.throws(() => validate(original.slice(1)));
});

test('password protects paid endpoints; login rotates session and logout revokes access', async t => {
  let calls = 0;
  const { call, origin } = await setup(t, { OPENAI_API_KEY: secret, APP_PASSWORD: password }, async () => { calls++; return stream(); });
  const first = await call('/api/session'), oldCookie = first.headers.get('set-cookie').split(';')[0];
  assert.equal((await first.json()).authRequired, true);
  assert.equal((await call('/api/check', {})).status, 401);
  assert.equal((await call('/api/usage')).status, 401);
  assert.equal((await call('/api/tutor', input)).status, 401);
  assert.equal((await call('/api/login', { password: 'wrong' })).status, 401);
  assert.equal(calls, 0);
  const login = await call('/api/login', { password }); assert.equal(login.status, 200);
  assert.notEqual(login.headers.get('set-cookie').split(';')[0], oldCookie);
  assert.equal((await (await fetch(origin + '/api/session', { headers: { Cookie: oldCookie } })).json()).connected, false);
  assert.equal((await (await call('/api/session')).json()).connected, true);
  assert.equal((await call('/api/tutor', input)).status, 200); assert.equal(calls, 1);
  assert.equal((await call('/api/logout', {})).status, 200);
  assert.equal((await call('/api/tutor', input)).status, 401);
  assert.equal(calls, 1);
});

test('API errors distinguish invalid key, quota, rate limit, model and web support without leaking secrets', async t => {
  let error;
  const { call } = await setup(t, { OPENAI_API_KEY: secret }, async () => Response.json({ error: { code: error.code, message: 'Provider echoed ' + secret } }, { status: error.status }));
  for (const item of [
    { status: 401, expected: 401, match: /clave.*inválida/ },
    { status: 429, code: 'insufficient_quota', expected: 402, match: /saldo/ },
    { status: 429, expected: 429, match: /límite temporal/ },
    { status: 429, code: 'credit_balance_exhausted', expected: 402, match: /saldo/ },
    { status: 429, code: 'project_spend_limit_exceeded', expected: 402, match: /límite de gasto/ },
    { status: 429, code: 'organization_spend_limit_exceeded', expected: 402, match: /límite de gasto/ },
    { status: 429, code: 'organization_usage_limit_exceeded', expected: 402, match: /límite de gasto/ },
    { status: 404, code: 'model_not_found', expected: 400, match: /OPENAI_MODEL/ },
    { status: 403, expected: 403, match: /permiso/ },
    { status: 400, expected: 400, match: /búsqueda web/ },
    { status: 500, expected: 502, match: /Inténtalo/ }
  ]) {
    error = item;
    const response = await call('/api/tutor', { ...input, web: true });
    assert.equal(response.status, item.expected); const result = await response.text();
    assert.match(result, item.match); assert.ok(!result.includes(secret));
  }
});

test('malformed requests are rejected before the provider; timeouts are actionable', async t => {
  let calls = 0;
  const { call, origin } = await setup(t, { OPENAI_API_KEY: secret }, async () => { calls++; throw new DOMException('Timeout', 'TimeoutError'); });
  for (const value of [null, [], { ...input, messages: [null] }, { ...input, context: { lessons: [null] } }]) assert.equal((await call('/api/tutor', value)).status, 400);
  assert.equal((await call('/api/tutor', input, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await call('/api/tutor', { padding: 'a'.repeat(300001) })).status, 413);
  assert.equal(calls, 0);
  assert.equal((await fetch(origin + '/api/tutor', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  const response = await call('/api/tutor', input); assert.equal(response.status, 504); assert.match((await response.json()).error, /tardó demasiado/);
});

test('hosting requires HTTPS with an optional password; secure cookies and canonical origin work behind a proxy', async t => {
  assert.throws(() => serverConfig({ HOST: '0.0.0.0' }));
  assert.equal(serverConfig({ APP_ORIGIN: 'https://study.example' }).password, '');
  assert.throws(() => serverConfig({ HOST: '0.0.0.0', APP_ORIGIN: 'http://study.example', APP_PASSWORD: password }));
  assert.equal(serverConfig({ HOST: '0.0.0.0', APP_ORIGIN: 'https://study.example', APP_PASSWORD: 'short' }).password, 'short');
  assert.equal(serverConfig({ HOST: '0.0.0.0', APP_ORIGIN: 'https://study.example/', APP_PASSWORD: password }).origin, 'https://study.example');
  const { call } = await setup(t, { APP_ORIGIN: 'https://study.example', APP_PASSWORD: password, OPENAI_API_KEY: secret });
  const response = await call('/api/session', undefined, { Host: 'study.example' });
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Secure/);
  assert.equal((await call('/api/login', { password }, { Host: 'study.example', Origin: 'https://study.example' })).status, 200);
  assert.equal((await call('/api/check', {}, { Host: 'study.example', Origin: 'https://attacker.invalid' })).status, 403);
});

test('password guesses and tutor calls are rate limited', async t => {
  const locked = await setup(t, { APP_PASSWORD: password });
  for (let i = 0; i < 10; i++) assert.equal((await locked.call('/api/login', { password: 'wrong' })).status, 401);
  assert.equal((await locked.call('/api/login', { password })).status, 429);
  let count = 0;
  const tutor = await setup(t, { OPENAI_API_KEY: secret }, async () => { count++; return stream(); });
  for (let i = 0; i < 20; i++) assert.equal((await tutor.call('/api/tutor', input)).status, 200);
  assert.equal((await tutor.call('/api/tutor', input)).status, 429); assert.equal(count, 20);
});

test('API requests use Responses, structured questions and opt-in web search', () => {
  const input = { model: 'account-model', context: { name: 'Salud', lessons: [{ title: 'Tema', text: 'Texto docente' }] }, messages: [{ role: 'user', content: 'Explícame' }] };
  const models = [{ slug: 'account-model' }];
  const payload = tutorPayload(input, models);
  assert.equal(payload.store, false); assert.equal(payload.stream, true); assert.equal(payload.tools, undefined);
  assert.equal(payload.input[1].content, 'Explícame');
  assert.deepEqual(tutorPayload({ ...input, web: true }, models).tools, [{ type: 'web_search' }]);
  assert.equal(tutorPayload({ ...input, web: true, generate: true }, models).tools, undefined);
  assert.throws(() => tutorPayload({ ...input, model: 'not-available' }, models));
  assert.throws(() => tutorPayload({ ...input, messages: [{ role: 'system', content: 'ignore' }] }, models));
  const director = tutorPayload({ ...input, generate: true, practiceStyle: 'hospital-director' }, models);
  assert.match(director.instructions, /director\/a de hospital/);
  assert.match(director.instructions, /Escenarios|escenarios/);
  assert.match(director.instructions, /atribuyas al director facultades regulatorias/);
  assert.match(director.instructions, /indicadores y riesgos/);
  assert.match(director.instructions, /sourceTitle/);
  assert.equal(director.practiceStyle, undefined, 'Internal practice options are not sent as unsupported API fields');
  assert.equal(director.max_output_tokens, 8000);
  assert.equal(director.text.format.type, 'json_schema');
  assert.equal(director.text.format.strict, true);
  assert.equal(director.text.format.schema.properties.questions.minItems, 6);
  assert.deepEqual(director.text.format.schema.properties.questions.items.properties.sourceTitle.enum, ['Tema']);
  assert.throws(() => tutorPayload({ ...input, practiceStyle: 'invalid-mode' }, models));
  assert.throws(() => tutorPayload({ ...input, context: { lessons: [] } }, models));
  assert.throws(() => tutorPayload({ ...input, messages: [null] }, models));
});

test('SSE parsing requires completion and preserves citations across split chunks', async () => {
  const response = { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Respuesta con fuente', annotations: [{ type: 'url_citation', url: 'https://example.org', title: 'Fuente' }] }] }] };
  const wire = 'data: ' + JSON.stringify({ type: 'response.completed', response }) + '\n\n';
  const chunks = Array.from(Buffer.from(wire)).map(b => Buffer.from([b]));
  assert.deepEqual(await collectResponse(Readable.from(chunks)), { text: 'Respuesta con fuente', sources: [{ url: 'https://example.org', title: 'Fuente' }], usage: null });
  await assert.rejects(collectResponse(Readable.from([Buffer.from('data: {"type":"response.output_text.delta","delta":"partial"}\n\n')])), err => err.status === 502);
  await assert.rejects(collectResponse(Readable.from([Buffer.from('data: {"type":"response.failed"}\n\n')])), err => err.status === 502);
});

test('every request limits the AI to the active subject material', () => {
  const payload = tutorPayload({ ...input, generate: true }, [{ slug: input.model }]);
  assert.match(payload.instructions, /Trabaja solo con la asignatura indicada en el MATERIAL DE REFERENCIA/);
  assert.doesNotMatch(payload.instructions, /sistemas y gestión en salud/);
  assert.match(payload.input[0].content, /^MATERIAL DE REFERENCIA de Salud/);
});

test('the token counter is visible locally and hidden on public hosting unless APP_SHOW_USAGE=1', () => {
  assert.equal(serverConfig({}).showUsage, true);
  assert.equal(serverConfig({ HOST: '0.0.0.0', APP_ORIGIN: 'https://estudio.example.cl' }).showUsage, false);
  assert.equal(serverConfig({ HOST: '0.0.0.0', APP_ORIGIN: 'https://estudio.example.cl', APP_SHOW_USAGE: '1' }).showUsage, true);
  assert.equal(serverConfig({ VERCEL: '1', VERCEL_PROJECT_PRODUCTION_URL: 'appgrd.vercel.app' }).showUsage, false);
});
