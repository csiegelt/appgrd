import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, tutorPayload } from '../server.mjs';
import { validateGeneratedMaterial, materialPassages } from '../lib/material.mjs';

const text = 'El costo de oportunidad es el valor de la mejor alternativa que se sacrifica al decidir. Permite comparar decisiones sobre recursos escasos y obliga a identificar los beneficios que se dejan de obtener.';
const input = { model: 'gpt-4.1-mini', generateMaterial: true, context: { name: 'Economía', lessons: [{ title: 'Costo de oportunidad', text }] }, messages: [{ role: 'user', content: 'Crea una guía y tarjetas para comprender este tema.' }] };
const material = () => ({ sourceTitle: 'Costo de oportunidad', objective: 'Identificar el beneficio al que se renuncia cuando se elige entre usos de un recurso.', summary: ['Cada decisión deja fuera otras alternativas; su costo de oportunidad corresponde a la mejor de ellas.', 'Comparar los beneficios sacrificados ayuda a decidir cómo usar recursos escasos.'], cards: [
  { prompt: '¿Qué representa el costo de oportunidad de una decisión?', answer: 'El valor de la mejor alternativa a la que se renuncia.', explanation: 'La comparación se hace con la mejor opción descartada, no con la suma de todas.', evidence: 'El costo de oportunidad es el valor de la mejor alternativa que se sacrifica al decidir.' },
  { prompt: '¿Por qué la escasez de recursos exige comparar alternativas?', answer: 'Porque elegir un uso implica renunciar a los beneficios de otro.', explanation: 'Identificar lo que se deja de obtener permite evaluar la elección.', evidence: 'Permite comparar decisiones sobre recursos escasos y obliga a identificar los beneficios que se dejan de obtener.' },
  { prompt: '¿Qué beneficio debes identificar antes de elegir el uso de un recurso?', answer: 'El beneficio de la mejor alternativa que se descarta.', explanation: 'Ese beneficio permite expresar el costo de oportunidad de la decisión.', evidence: 'el valor de la mejor alternativa que se sacrifica al decidir' }
] });
const rawMaterial = () => ({ ...material(), cards: material().cards.map(({ evidence, ...card }) => ({ ...card, evidenceIndex: 0 })) });
const validatedMaterial = () => ({ ...material(), cards: material().cards.map(card => ({ ...card, evidence: text })) });

test('study material has its own schema and validates one topic per request without internet', () => {
  const payload = tutorPayload({ ...input, web: true }, [{ slug: input.model }]);
  assert.equal(payload.text.format.name, 'study_material'); assert.equal(payload.text.format.strict, true);
  assert.equal(payload.tools, undefined); assert.equal(payload.store, false);
  assert.deepEqual(payload.text.format.schema.properties.sourceTitle.enum, ['Costo de oportunidad']);
  for (const change of [{ generate: true }, { generateCase: true }, { generateMaterial: 'true' }, { context: { lessons: [...input.context.lessons, ...input.context.lessons] } }]) {
    assert.throws(() => tutorPayload({ ...input, ...change }, [{ slug: input.model }]), err => err.status === 400);
  }
});

test('cards require distinct questions and literal evidence in the provided text', () => {
  const check = value => validateGeneratedMaterial(JSON.stringify(value), input.context.lessons);
  assert.deepEqual(check(rawMaterial()), validatedMaterial());
  for (const change of [{ objective: '' }, { sourceTitle: 'Otro tema' }, { summary: ['Repetido', 'Repetido'] }, { cards: [] }]) assert.throws(() => check({ ...rawMaterial(), ...change }), err => err.status === 502);
  for (const change of [{ evidenceIndex: -1 }, { evidenceIndex: 1 }, { evidenceIndex: 0.5 }, { evidenceIndex: '0' }, { prompt: material().cards[1].prompt }, { prompt: material().cards[0].answer }, { prompt: 'Explica la idea de este fragmento: texto' }, { explanation: '' }]) {
    const value = rawMaterial(); Object.assign(value.cards[0], change); assert.throws(() => check(value), err => err.status === 502);
  }
  const long = text.repeat(20), passages = materialPassages(long);
  assert.ok(passages.length > 1); assert.ok(passages.every(p => p.length <= 800 && long.includes(p)));
  assert.equal(passages.join('').replace(/\s/g, ''), long.replace(/\s/g, ''), 'Fragment references cover the complete source');
});

test('material API protects access, reports real token usage and rejects invented evidence', async t => {
  let invalid = false, calls = 0;
  const server = await startServer(0, { env: { OPENAI_API_KEY: 'test-key', APP_PASSWORD: 'test-material-password' }, usageFile: null, fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(JSON.parse(options.body).text.format.name, 'study_material');
    const output = rawMaterial(); if (invalid) output.cards[0].evidenceIndex = 99;
    return new Response('data: ' + JSON.stringify({ type: 'response.completed', response: { status: 'completed', usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 }, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] } }) + '\n\n');
  } });
  t.after(() => new Promise(done => { server.close(done); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`; let cookie = '';
  async function call(path, body) {
    const res = await fetch(origin + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (res.headers.has('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
    return { status: res.status, data: await res.json() };
  }
  assert.equal((await call('tutor', input)).status, 401); assert.equal(calls, 0);
  await call('login', { password: 'test-material-password' });
  const good = await call('tutor', input); assert.equal(good.status, 200); assert.equal(good.data.text, undefined); assert.deepEqual(good.data.material, validatedMaterial());
  invalid = true; const bad = await call('tutor', input); assert.equal(bad.status, 502); assert.equal(bad.data.material, undefined);
  const usage = (await call('usage')).data; assert.equal(usage.totalTokens, 600); assert.equal(usage.calls, 2);
});
