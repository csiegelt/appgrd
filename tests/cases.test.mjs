import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, tutorPayload } from '../server.mjs';
import { validateGeneratedCase } from '../lib/cases.mjs';

const input = { model: 'gpt-4.1-mini', generateCase: true, practiceStyle: 'hospital-director', difficulty: 'avanzada',
  context: { name: 'Salud', lessons: [{ title: 'Gestión', text: 'Identificar la brecha, priorizar y medir el resultado con recursos limitados.' }] },
  messages: [{ role: 'user', content: 'Crea un caso nuevo.' }], avoidCases: [{ title: 'Caso anterior', text: 'Una situación anterior.' }] };
const caseData = () => ({ title: 'Un cambio de turno inesperado', role: 'Director/a de hospital', scenario: 'Caso ficticio: dos equipos necesitan un recurso que solo puede asignarse a uno durante el turno.', sourceTitle: 'Gestión',
  steps: [ { title: 'Diagnóstico', question: '¿Qué información confirmarías primero?', guidance: 'Revisaría necesidades y capacidad efectiva con ambos equipos.' },
    { title: 'Decisión', question: '¿Cómo priorizarías el recurso?', guidance: 'Compararía alternativas y asignaría responsables bajo las atribuciones del caso.' },
    { title: 'Seguimiento', question: '¿Qué resultado medirías y qué riesgo vigilarías?', guidance: 'Mediría el cumplimiento del plan y vigilaría el desplazamiento de necesidades.' } ] });

test('practical cases use a dedicated strict schema, difficulty, variation and previous cases, without web search', () => {
  const payload = tutorPayload({ ...input, web: true }, [{ slug: input.model }]);
  assert.equal(payload.text.format.name, 'study_practical_case'); assert.equal(payload.text.format.strict, true);
  assert.equal(payload.text.format.schema.properties.steps.minItems, 3);
  assert.equal(payload.text.format.schema.properties.steps.maxItems, 3);
  assert.deepEqual(payload.text.format.schema.properties.sourceTitle.enum, ['Gestión']);
  assert.match(payload.instructions, /dificultad avanzada/); assert.match(payload.instructions, /director\/a de hospital/);
  assert.match(payload.instructions, /inspiración aleatoria/); assert.match(payload.instructions, /escenario no debe revelar la solución/);
  assert.match(payload.input.at(-1).content, /Caso anterior/);
  assert.equal(payload.tools, undefined); assert.equal(payload.store, false);
  for (const change of [{ generate: true }, { generateCase: 'yes' }, { difficulty: 'invalid' }, { avoidCases: [null] }, { avoidCases: [{ title: 'X', text: 'a'.repeat(1001) }] }]) {
    assert.throws(() => tutorPayload({ ...input, ...change }, [{ slug: input.model }]), err => err.status === 400);
  }
});

test('cases have an app ID and three guided stages; malformed, invented-source and repeated cases are rejected', () => {
  const validate = c => validateGeneratedCase(JSON.stringify(c), input.context.lessons, input.avoidCases);
  const c = validate(caseData());
  assert.match(c.id, /^ai-case-/); assert.equal(c.generated, 'ai'); assert.equal(c.fictional, true);
  assert.deepEqual(c.steps[0], ['Diagnóstico', '¿Qué información confirmarías primero?', 'Revisaría necesidades y capacidad efectiva con ambos equipos.']);
  for (const change of [{ title: '' }, { title: ' CASO ANTERIOR ' }, { scenario: input.avoidCases[0].text }, { sourceTitle: 'Fuente inventada' }, { steps: [] }, { steps: [null, null, null] }, { steps: Array(3).fill(caseData().steps[0]) }]) {
    assert.throws(() => validate({ ...caseData(), ...change }), err => err.status === 502);
  }
  assert.throws(() => validateGeneratedCase('Texto sin JSON', input.context.lessons), err => err.status === 502);
  const incomplete = caseData(); delete incomplete.steps[1].guidance;
  assert.throws(() => validate(incomplete), err => err.status === 502);
});

test('HTTP case generation requires access, counts actual usage on invalid output, and recovers from exhausted quota', async t => {
  const password = 'test-case-password-123'; let providerCalls = 0, result = 'valid';
  const server = await startServer(0, { env: { OPENAI_API_KEY: 'test-only-key', APP_PASSWORD: password }, usageFile: null, fetchImpl: async (url, options) => {
    providerCalls++; assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body); assert.equal(payload.text.format.name, 'study_practical_case');
    if (result === 'quota') return Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 });
    const value = caseData(); if (result === 'invalid') value.sourceTitle = 'Una fuente inventada';
    return new Response('data: ' + JSON.stringify({ type: 'response.completed', response: { status: 'completed', usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] } }) + '\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  } });
  t.after(() => new Promise(done => { server.close(done); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`; let cookie = '';
  async function call(path, body) {
    const res = await fetch(origin + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (res.headers.has('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
    return { status: res.status, data: await res.json() };
  }
  assert.equal((await call('tutor', input)).status, 401); assert.equal(providerCalls, 0);
  assert.equal((await call('login', { password })).status, 200);
  assert.equal((await call('tutor', { ...input, generate: true })).status, 400); assert.equal(providerCalls, 0);
  const good = await call('tutor', input); assert.equal(good.status, 200); assert.equal(good.data.case.steps.length, 3); assert.equal(good.data.usage.totalTokens, 150);
  assert.equal(good.data.text, undefined, 'Only the validated case reaches the browser');
  result = 'invalid'; const bad = await call('tutor', input); assert.equal(bad.status, 502); assert.equal(bad.data.case, undefined);
  assert.equal((await call('usage')).data.totalTokens, 300, 'Invalid model output can still consume tokens');
  result = 'quota'; const empty = await call('tutor', input); assert.equal(empty.status, 402); assert.equal(empty.data.code, 'insufficient_quota');
  assert.equal((await call('usage')).data.quota.state, 'exhausted');
  result = 'valid'; assert.equal((await call('tutor', input)).status, 200);
  const usage = (await call('usage')).data; assert.equal(usage.quota.state, 'ok'); assert.equal(usage.totalTokens, 450);
  assert.equal((await call('logout', {})).status, 200); assert.equal((await call('tutor', input)).status, 401); assert.equal(providerCalls, 4);
});
