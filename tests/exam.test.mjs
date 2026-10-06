import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { startServer, tutorPayload } from '../server.mjs';
import { examBlueprint, validateGeneratedExam, examReviewPayload } from '../lib/exam.mjs';

const sandbox = vm.createContext({ crypto: globalThis.crypto });
vm.runInContext(readFileSync(new URL('../js/estudio-prueba.js', import.meta.url), 'utf8'), sandbox);
const rules = vm.runInContext('PruebaEstudio', sandbox);
const lessons = Array.from({ length: 11 }, (_, i) => ({ title: 'Tema ' + i, text: 'Material docente del tema ' + i }));
// Fifteen questions over eleven topics: every topic appears at least once.
const questions = () => examBlueprint(lessons, 15).flatMap((b, n) => Array.from({ length: b.count }, (_, i) => ({ prompt: `Pregunta ${n}-${i}`, options: ['Primera', 'Segunda', 'Tercera', 'Cuarta'], answerIndex: (n + i) % 4, explanation: `Fundamento del tema ${n}`, sourceTitle: b.sourceTitle })));
const rawQuestions = () => questions().map(({answerIndex,...q}) => ({...q,answer:q.options[answerIndex]}));
const input = { model: 'gpt-4.1-mini', generateExam: true, examSize: 15, context: { name: 'Economía de la Salud', lessons }, messages: [{ role: 'user', content: 'Crea la prueba de 15 preguntas.' }] };

test('15-question exam has four choices, covers every topic and uses a separate structured output mode', () => {
  const payload = tutorPayload({ ...input, web: true }, [{ slug: input.model }]);
  assert.equal(payload.text.format.name, 'health_economics_exam');
  assert.equal(payload.text.format.strict, true); assert.equal(payload.tools, undefined);
  assert.equal(payload.text.format.schema.properties.questions.minItems, 15);
  assert.equal(payload.text.format.schema.properties.questions.items.properties.options.minItems, 4);
  assert.equal(payload.text.format.schema.properties.questions.items.properties.answerIndex,undefined);
  assert.equal(payload.text.format.schema.properties.questions.items.properties.answer.type,'string');
  assert.ok(payload.max_output_tokens > 8000);
  assert.match(payload.instructions, /Ejercicio simulado/);
  const reviewed=examReviewPayload(payload,JSON.stringify({questions:rawQuestions()}),15,lessons.length);
  assert.equal(reviewed.input[0],payload.input[0]);assert.match(reviewed.input[1].content,/Pregunta 0-0/);assert.match(reviewed.instructions,/NO supongas que la clave/);
  assert.match(reviewed.instructions,/15 en total, distintas y cubriendo todos los temas recibidos/);
  assert.ok(!reviewed.input[1].content.includes('"options"'));assert.ok(!reviewed.input[1].content.includes('"answer"'),'Independent review is not anchored to a potentially wrong answer');
  const plan = examBlueprint(lessons, 15); assert.equal(plan.reduce((n,b) => n+b.count, 0), 15); assert.ok(plan.every(b => b.count >= 1)); assert.equal(plan.length, 11);
  for (const change of [{ generate: true }, { generateCase: true }, { generateMaterial: true }, { generateExam: 'true' }]) assert.throws(() => tutorPayload({ ...input, ...change }, [{ slug: input.model }]), e => e.status === 400);
  assert.throws(() => examBlueprint([...lessons, lessons[0]]));
  assert.throws(() => examBlueprint(Array.from({ length: 31 }, (_, i) => ({ title: String(i) }))));
});

test('only 10 or 15 questions are offered; a missing size defaults to 10', () => {
  for (const size of [10, 15]) {
    const payload = tutorPayload({ ...input, examSize: size }, [{ slug: input.model }]);
    const schema = payload.text.format.schema.properties.questions;
    assert.equal(schema.minItems, size); assert.equal(schema.maxItems, size);
    assert.match(payload.instructions, new RegExp(`exactamente ${size} preguntas`));
    const plan = examBlueprint(lessons, size);
    assert.equal(plan.reduce((n, b) => n + b.count, 0), size);
    assert.equal(new Set(plan.map(b => b.sourceTitle)).size, Math.min(size, lessons.length));
  }
  const { examSize, ...withoutSize } = input;
  assert.equal(tutorPayload(withoutSize, [{ slug: input.model }]).text.format.schema.properties.questions.maxItems, 10);
  for (const bad of [5, 20, 30, '10', 15.5]) assert.throws(() => tutorPayload({ ...input, examSize: bad }, [{ slug: input.model }]), e => e.status === 400);
});

test('exam rejects missing questions, duplicate prompts or options, invalid keys and incomplete topic coverage', () => {
  const check = items => validateGeneratedExam(JSON.stringify({ questions: items }), lessons, 15);
  assert.deepEqual(check(rawQuestions()).questions, questions());
  assert.throws(() => check(rawQuestions().slice(1)), e => e.status === 502);
  for (const change of [{ answer: 'No existe' }, { answer: 0 }, { explanation: '' }, { explanation: 'Cambiar answerIndex a 1' }, { prompt: '' }, { prompt: 'Continuando, ¿cuál es el costo con los mismos parámetros?' }, { sourceTitle: 'Inventado' }, { options: ['A','a','B','C'] }, { options: ['A','B','C'] }, { prompt: '  PREGUNTA 0-1  ' }]) {
    const items = rawQuestions(); Object.assign(items[0], change);
    assert.throws(() => check(items), e => e.status === 502);
  }
  assert.throws(() => validateGeneratedExam('not JSON', lessons, 15), e => e.status === 502);
  const contradicted=rawQuestions();contradicted[0].explanation='El resultado es 2,5. Como no aparece opción exacta, se acepta 3.';
  assert.throws(()=>check(contradicted),e=>e.status===502,'Do not grade a known mismatch between the calculation and its choices');
  const varied=rawQuestions();varied[0].sourceTitle=lessons.at(-1).title;
  assert.equal(check(varied).questions.length,15,'Valid coverage can vary from the suggested per-topic counts');
  assert.throws(()=>check(rawQuestions().map(q=>q.sourceTitle===lessons[0].title?{...q,sourceTitle:lessons[1].title}:q)),e=>e.status===502);
  // Ten questions over eleven topics: each question must come from a different topic.
  const ten = lessons.slice(0, 10).map((l, i) => ({ prompt: `Pregunta corta ${i}`, options: ['Primera', 'Segunda', 'Tercera', 'Cuarta'], answer: 'Primera', explanation: 'Fundamento', sourceTitle: l.title }));
  assert.equal(validateGeneratedExam(JSON.stringify({ questions: ten }), lessons, 10).questions.length, 10);
  assert.throws(() => validateGeneratedExam(JSON.stringify({ questions: ten.map((q, i) => i === 1 ? { ...q, sourceTitle: ten[0].sourceTitle } : q) }), lessons, 10), e => e.status === 502);
  assert.throws(() => validateGeneratedExam(JSON.stringify({ questions: ten }), lessons, 15), e => e.status === 502);
});

test('grade uses both segments of the Chilean study scale and handles omitted answers and persistence', () => {
  for (const [correct, threshold, expected] of [[0,.6,1],[9,.6,2.5],[17,.6,3.8],[18,.6,4],[24,.6,5.5],[30,.6,7],[15,.5,4],[21,.7,4]]) assert.equal(rules.grade(correct,30,threshold).grade,expected);
  for (const [correct, total, threshold, expected] of [[6,10,.6,4],[10,10,.6,7],[9,15,.6,4],[8,15,.5,4.2],[11,15,.7,4.3],[15,15,.6,7]]) assert.equal(rules.grade(correct,total,threshold).grade,expected);
  assert.equal(rules.grade(17).passed,false); assert.equal(rules.grade(18).passed,true);
  for (const value of [-1,31,NaN,1.5]) assert.throws(() => rules.grade(value));
  assert.throws(() => rules.grade(1,0)); assert.throws(() => rules.grade(1,30,1));
  const attempt = rules.create(questions());
  assert.equal(attempt.answers.length, 15);
  attempt.answers = attempt.questions.map((q,i) => i < 9 ? q.answerIndex : i < 12 ? (q.answerIndex+1)%4 : null);
  const result = rules.score(attempt);
  assert.equal(result.total,15);assert.equal(result.correct,9);assert.equal(result.wrong,3);assert.equal(result.omitted,3);assert.equal(result.grade,4);
  assert.deepEqual(JSON.parse(JSON.stringify(rules.restore(JSON.parse(JSON.stringify(attempt))))),JSON.parse(JSON.stringify(attempt)));
  assert.equal(rules.restore({...attempt,index:15}),null);
  assert.equal(rules.restore({...attempt,answers:[0]}),null);
  assert.equal(rules.restore({...attempt,questions:[]}),null);
  assert.equal(rules.restore({...attempt,threshold:0}),null);
  assert.equal(rules.restore({...attempt,finishedAt:'invalid'}),null);
  const ready = questions().slice(0, 10);
  assert.equal(rules.create(ready, .6, Math.random, 10).questions.length, 10);
  assert.throws(() => rules.create(ready, .6, Math.random, 15));
  assert.throws(() => rules.create(questions().slice(0, 7)));
});

test('attempts saved by the previous 30-question version are still restored and graded, but not created', () => {
  const legacy = Array.from({ length: 30 }, (_, i) => ({ prompt: `Antigua ${i}`, options: ['Primera', 'Segunda', 'Tercera', 'Cuarta'], answerIndex: i % 4, explanation: 'Fundamento', sourceTitle: lessons[i % 11].title }));
  const saved = { id: 'legacy', questions: legacy, answers: legacy.map((q, i) => i < 18 ? q.answerIndex : null), index: 29, threshold: .6, createdAt: new Date().toISOString(), finishedAt: null };
  const restored = rules.restore(JSON.parse(JSON.stringify(saved)));
  assert.ok(restored); assert.equal(restored.questions.length, 30);
  const result = rules.score(restored); assert.equal(result.total, 30); assert.equal(result.grade, 4);
  assert.throws(() => rules.create(legacy), /10 o 15/);
});

test('new attempts randomize question and option order without changing correct answers or restored order', () => {
  const items=questions(), one=rules.create(items,.6,()=>0), two=rules.create(items,.6,()=>.999);
  assert.notDeepEqual(one.questions.map(q=>q.prompt),two.questions.map(q=>q.prompt));
  for (const q of one.questions) {
    const original=items.find(item=>item.prompt===q.prompt);
    assert.equal(q.options[q.answerIndex],original.options[original.answerIndex]);
    assert.deepEqual([...q.options].sort(),[...original.options].sort());
  }
  const restored=rules.restore(JSON.parse(JSON.stringify(one)));
  assert.deepEqual(JSON.parse(JSON.stringify(restored.questions)),JSON.parse(JSON.stringify(one.questions)));
});

test('exam HTTP generation retains authentication, records usage even on invalid output and returns validated questions', async t => {
  let invalid = false, calls = 0;
  const server = await startServer(0, { env: { OPENAI_API_KEY: 'test-key', APP_PASSWORD: 'exam-test' }, usageFile: null, fetchImpl: async (_, options) => {
    calls++; assert.equal(JSON.parse(options.body).text.format.name,'health_economics_exam');
    const items=rawQuestions(); if(invalid) items.pop();
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',usage:{input_tokens:100,output_tokens:200,total_tokens:300},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({questions:items})}]}]}})+'\n\n');
  } });
  t.after(() => new Promise(done => { server.close(done); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`; let cookie='';
  async function call(path,body) {
    const r=await fetch(origin+'/api/'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
    return {status:r.status,data:await r.json()};
  }
  assert.equal((await call('tutor',input)).status,401);assert.equal(calls,0);
  assert.equal((await call('login',{password:'exam-test'})).status,200);
  const good=await call('tutor',input);assert.equal(good.status,200);assert.deepEqual(good.data.exam.questions,questions());assert.equal(good.data.text,undefined);assert.equal(good.data.usage.totalTokens,600);assert.equal(calls,2);
  invalid=true;const bad=await call('tutor',input);assert.equal(bad.status,502);assert.equal(bad.data.exam,undefined);
  assert.equal((await call('usage')).data.totalTokens,1500);assert.equal(calls,5);
  invalid=false;assert.equal((await call('tutor',input)).status,200,'The same session can retry without clearing cookies');
});

test('an invalid review is corrected once, counted and followed by another exam in the same session', async t => {
  let calls = 0;
  const server = await startServer(0, { env: { OPENAI_API_KEY: 'test-key' }, usageFile: null, fetchImpl: async (_, options) => {
    calls++; const payload = JSON.parse(options.body), items = rawQuestions();
    if (calls === 2) items.pop();
    if (calls === 3) {
      assert.match(payload.input.at(-1).content, /no pasó la validación/);
      assert.match(payload.instructions, /NO supongas que la clave/);
      assert.ok(!payload.input[1].content.includes('"answer"'));
    }
    return new Response('data: ' + JSON.stringify({ type: 'response.completed', response: { status: 'completed', usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 }, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ questions: items }) }] }] } }) + '\n\n');
  } });
  t.after(() => new Promise(done => { server.close(done); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(origin + '/api/session'), cookie = session.headers.get('set-cookie').split(';')[0];
  const generate = () => fetch(origin + '/api/tutor', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  const repaired = await generate(), result = await repaired.json();
  assert.equal(repaired.status, 200); assert.equal(result.exam.questions.length, 15); assert.equal(result.usage.totalTokens, 900); assert.equal(calls, 3);
  assert.equal((await generate()).status, 200); assert.equal(calls, 5);
});

test('provider failures and insufficient remaining time do not trigger correction or leave the session busy', async t => {
  for (const mode of ['quota', 'rate', 'timeout', 'incomplete', 'deadline']) await t.test(mode, async t => {
    let calls = 0, failed = false, clock = Date.now();
    if (mode === 'deadline') t.mock.method(Date, 'now', () => clock);
    const server = await startServer(0, { env: { OPENAI_API_KEY: 'test-key' }, usageFile: null, fetchImpl: async () => {
      calls++;
      if (calls === 2 && !failed) {
        failed = true;
        if (mode === 'quota' || mode === 'rate') return Response.json({ error: { code: mode === 'quota' ? 'insufficient_quota' : 'rate_limit_exceeded' } }, { status: 429 });
        if (mode === 'timeout') throw new DOMException('Timeout', 'TimeoutError');
        if (mode === 'incomplete') return new Response('data: ' + JSON.stringify({ type: 'response.incomplete', response: { status: 'incomplete' } }) + '\n\n');
        clock += 201000;
      }
      const items = rawQuestions(); if (mode === 'deadline' && calls === 2) items.pop();
      return new Response('data: ' + JSON.stringify({ type: 'response.completed', response: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ questions: items }) }] }] } }) + '\n\n');
    } });
    t.after(() => new Promise(done => { server.close(done); server.closeAllConnections(); }));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const session = await fetch(origin + '/api/session'), cookie = session.headers.get('set-cookie').split(';')[0];
    const generate = () => fetch(origin + '/api/tutor', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const response = await generate(), data = await response.json();
    assert.equal(response.status, { quota: 402, rate: 429, timeout: 504, incomplete: 502, deadline: 502 }[mode]);
    assert.equal(data.exam, undefined); assert.equal(calls, 2);
    assert.equal((await generate()).status, 200); assert.equal(calls, 4);
  });
});

test('exam HTTP generation honors the requested size in the draft, review and validation', async t => {
  const bodies = [];
  const server = await startServer(0, { env: { OPENAI_API_KEY: 'test-key' }, usageFile: null, fetchImpl: async (_, options) => {
    const body = JSON.parse(options.body), size = body.text.format.schema.properties.questions.maxItems; bodies.push(body);
    const items = Array.from({ length: size }, (_, i) => ({ prompt: `Pregunta HTTP ${i}`, options: ['Primera', 'Segunda', 'Tercera', 'Cuarta'], answer: 'Tercera', explanation: 'Fundamento', sourceTitle: lessons[i % 11].title }));
    return new Response('data: ' + JSON.stringify({ type: 'response.completed', response: { status: 'completed', usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 }, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ questions: items }) }] }] } }) + '\n\n');
  } });
  t.after(() => new Promise(done => { server.close(done); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(origin + '/api/session'), cookie = session.headers.get('set-cookie').split(';')[0];
  for (const [size, coverage] of [[10, /10 en total, distintas y cada una de un tema distinto/], [15, /15 en total, distintas y cubriendo todos los temas recibidos/]]) {
    bodies.length = 0;
    const r = await fetch(origin + '/api/tutor', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, examSize: size }) });
    const data = await r.json();
    assert.equal(r.status, 200, JSON.stringify(data)); assert.equal(data.exam.questions.length, size);
    assert.equal(bodies.length, 2);
    for (const body of bodies) assert.equal(body.text.format.schema.properties.questions.maxItems, size);
    assert.match(bodies[1].instructions, coverage);
  }
});
