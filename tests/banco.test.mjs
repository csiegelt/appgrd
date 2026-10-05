import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const sandbox = vm.createContext({ crypto: globalThis.crypto, structuredClone });
for (const file of ['economia-contenido.js', 'estudio-prueba.js', 'economia-banco.js', 'banco-preguntas.js']) vm.runInContext(readFileSync(new URL('../js/' + file, import.meta.url), 'utf8'), sandbox);
const [bank, subject, rules] = vm.runInContext('[BANCO_ECONOMIA, ECONOMIA_ASIGNATURA, BancoPreguntas]', sandbox);
const normalized = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
// Deterministic generator so failures can be reproduced.
const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pool = rules.items(bank, subject.lessons);

test('bank covers every economics topic with valid multiple-choice and true/false items', () => {
  assert.equal(pool.length, bank.length, 'No item is discarded as malformed');
  assert.ok(pool.length >= 100);
  for (const lesson of subject.lessons) {
    const items = pool.filter(q => q.lesson === lesson.id);
    assert.ok(items.length >= 8, `${lesson.title} has enough questions`);
    assert.ok(items.some(q => q.type === 'mc') && items.some(q => q.type === 'tf'), `${lesson.title} mixes both formats`);
  }
  const tf = pool.filter(q => q.type === 'tf');
  assert.ok(tf.some(q => q.answerIndex === 0) && tf.some(q => q.answerIndex === 1), 'True and false statements are both present');
  assert.equal(new Set(pool.map(q => normalized(q.prompt))).size, pool.length, 'Prompts are unique');
  for (const q of pool) {
    assert.ok(q.explanation.trim().length > 20, q.prompt);
    if (q.type === 'mc') assert.equal(new Set(q.options.map(normalized)).size, 4, q.prompt);
    assert.doesNotMatch(q.options.join(' '), /todas las anteriores|ninguna de las anteriores/i);
  }
});

test('random sessions have 10 to 20 distinct questions, both formats and broad topic coverage', () => {
  const sizes = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const random = seeded(seed), session = rules.session(pool, random);
    const n = session.items.length; sizes.add(n);
    assert.ok(n >= 10 && n <= 20, `size ${n}`);
    assert.equal(new Set(session.items.map(q => q.id)).size, n);
    assert.ok(session.items.some(q => q.type === 'mc') && session.items.some(q => q.type === 'tf'), `seed ${seed} mixes formats`);
    assert.ok(new Set(session.items.map(q => q.lesson)).size >= Math.min(n, subject.lessons.length), `seed ${seed} spreads topics`);
    for (const q of session.items) {
      const original = pool.find(item => item.id === q.id);
      assert.equal(q.options[q.answerIndex], original.options[original.answerIndex], 'Shuffling keeps the correct answer');
      if (q.type === 'tf') assert.deepEqual([...q.options], ['Verdadero', 'Falso']);
    }
  }
  assert.ok(sizes.has(10) && sizes.has(20) && sizes.size >= 8, 'The whole 10–20 range is used');
  assert.equal(rules.session(pool, () => 0).items.length, 10);
  assert.equal(rules.session(pool, () => 0.9999).items.length, 20);
});

test('topic practice, scoring and error review', () => {
  const topic = pool.filter(q => q.lesson === 'econ-monopolio');
  const session = rules.session(topic, seeded(7));
  assert.equal(session.items.length, Math.min(topic.length, session.items.length));
  assert.ok(session.items.every(q => q.lesson === 'econ-monopolio'));
  const full = rules.session(pool, () => 0);
  full.answers = full.items.map((q, i) => i < 2 ? (q.answerIndex + 1) % q.options.length : q.answerIndex);
  const result = rules.score(full);
  assert.equal(result.correct, 8); assert.equal(result.total, 10); assert.equal(result.grade, 5.5); assert.equal(result.threshold, 0.6);
  const retry = rules.retry(full, seeded(3));
  assert.equal(retry.items.length, 2); assert.equal(retry.review, true);
  assert.deepEqual(new Set(retry.items.map(q => q.id)), new Set(full.items.slice(0, 2).map(q => q.id)));
  assert.equal(rules.items([{ lesson: 'econ-mercado', type: 'mc', prompt: 'Sin alternativas', options: ['A', 'a', 'B', 'C'], explanation: 'x' }, { lesson: 'otro', type: 'tf', prompt: 'Tema ajeno', answer: true, explanation: 'x' }], subject.lessons).length, 0);
  assert.equal(rules.session([], Math.random).items.length, 0);
});
