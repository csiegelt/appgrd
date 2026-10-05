import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = vm.createContext({ localStorage: { getItem: () => null }, crypto: globalThis.crypto, structuredClone });
for (const name of ['estudio-fuente.js', 'estudio-contenido.js', 'cuantitativas-contenido.js', 'economia-contenido.js', 'estudio-prueba.js', 'estudio.js']) {
  vm.runInContext(readFileSync(new URL('../js/' + name, import.meta.url), 'utf8'), sandbox);
}
const run = code => vm.runInContext(code, sandbox);

test('director scenarios are fictional, grounded in a lesson and included in practice', () => {
  const data = JSON.parse(run('JSON.stringify(SALUD_ASIGNATURA)'));
  assert.equal(data.cases.length, 11);
  const directors = data.cases.filter(c => c.role === 'Director/a de hospital');
  assert.equal(directors.length, 8);
  const questions = data.lessons.flatMap(l => l.questions);
  assert.equal(questions.length, 37);
  assert.equal(new Set(questions.map(q => q.id)).size, questions.length);
  for (const c of directors) {
    assert.equal(c.fictional, true);
    const lesson = data.lessons.find(l => l.id === c.lesson);
    assert.ok(lesson);
    assert.equal(c.steps.length, 4);
    assert.ok(c.steps.every(step => step.length === 3 && step[0].trim() && step[1].trim().length > 15 && step[2].trim().length > 15));
    const q = lesson.questions.find(q => q.id === c.id + '-decision');
    assert.ok(q.prompt.includes(c.text));
    assert.ok(q.options.includes(q.answer));
    assert.equal(new Set(q.options).size, 3);
  }
});

test('subject export/import keeps practical cases, role, fictional label and remapped source lessons', () => {
  const imported = JSON.parse(run('JSON.stringify(Estudio.validateSubject(JSON.parse(JSON.stringify(SALUD_ASIGNATURA))))'));
  assert.equal(imported.cases.length, 11);
  assert.equal(imported.cases.filter(c => c.role && c.fictional).length, 8);
  assert.equal(imported.lessons.flatMap(l => l.questions).length, 37);
  assert.equal(new Set(imported.cases.map(c => c.id)).size, 11);
  for (const c of imported.cases) assert.ok(imported.lessons.some(l => l.id === c.lesson));
});

test('new topics keep their source pending AI instead of making fragment cards; AI material survives import', () => {
  const lesson = JSON.parse(run('JSON.stringify(Estudio.buildLesson("Tema", "Texto fuente suficientemente largo para el estudio de conceptos de la asignatura.", "Apuntes"))'));
  assert.equal(lesson.materialStatus, 'pending'); assert.deepEqual(lesson.questions, []); assert.deepEqual(lesson.summary, []);
  const material = { ...lesson, objective: 'Comprender el concepto', summary: ['Idea explicada', 'Otra relación'], materialStatus: 'ready', materialGeneratedAt: '2026-10-01T12:00:00Z', questions: [{ prompt: '¿Qué significa el concepto?', answer: 'Una respuesta elaborada', explanation: 'Un fundamento', generated: 'ai-material', evidence: lesson.text }] };
  const imported = JSON.parse(run('JSON.stringify(Estudio.validateSubject(' + JSON.stringify({ name: 'Asignatura', lessons: [material] }) + '))'));
  assert.equal(imported.lessons[0].materialStatus, 'ready'); assert.equal(imported.lessons[0].questions[0].generated, 'ai-material');
  assert.equal(imported.lessons[0].questions[0].evidence, lesson.text);
});

function loadSavedStudy(saved, failWrite = false) {
  const storage = new Map([['grd-estudio-v1', JSON.stringify(saved)]]);
  const context = vm.createContext({ crypto: globalThis.crypto, structuredClone, localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => { if (failWrite) throw Error('Storage full'); storage.set(key, value); }
  } });
  for (const name of ['estudio-fuente.js', 'estudio-contenido.js', 'cuantitativas-contenido.js', 'economia-contenido.js', 'estudio-prueba.js', 'estudio.js']) vm.runInContext(readFileSync(new URL('../js/' + name, import.meta.url), 'utf8'), context);
  return { storage, state: JSON.parse(storage.get('grd-estudio-v1')) };
}

test('legacy AI and notes copies merge into one health subject without losing questions, notes or progress', () => {
  const base = JSON.parse(run('JSON.stringify(SALUD_ASIGNATURA)'));
  const ai = structuredClone(base); ai.id = 'custom-ai-copy'; ai.name += ' · Mi práctica IA';
  ai.lessons[0].questions.push({ id: 'my-ai-question', prompt: 'Mi pregunta guardada', answer: 'Mi respuesta', explanation: 'Mi fundamento' });
  Object.assign(ai.lessons[0], { objective: 'Mi objetivo generado', summary: ['Mi guía elaborada'], materialStatus: 'ready', materialGeneratedAt: '2026-10-02T12:00:00Z' });
  const notes = structuredClone(ai); notes.id = 'custom-notes-copy'; notes.name = base.name + ' · Mis apuntes';
  notes.lessons.push({ ...structuredClone(base.lessons[0]), id: 'my-added-lesson', title: 'Tema agregado', questions: [] });
  // A separately imported subject can have a similar name but has independent lesson IDs.
  const imported = { ...structuredClone(base), id: 'custom-import', name: ai.name, lessons: base.lessons.map(l => ({ ...l, id: 'imported-' + l.id })), cases: [] };
  const saved = { subjects: [ai, imported, notes], selected: notes.id, lesson: 'my-added-lesson',
    notes: { 'sistemas-salud/salud-1': 'Apunte original', 'custom-ai-copy/salud-1': 'Apunte de la copia IA', 'custom-notes-copy/salud-1': 'Otra explicación', 'custom-ai-copy/case-0-0': 'Mi plan del caso' },
    progress: { 'sistemas-salud/salud-1': { read: true }, 'custom-ai-copy/salud-1': { read: false }, 'sistemas-salud/my-ai-question': { attempts: 2, known: true }, 'custom-ai-copy/my-ai-question': { attempts: 3, wrong: true }, 'custom-notes-copy/my-added-lesson': { read: true } },
    history: [{ subject: base.id, correct: 3, total: 5 }, { subject: ai.id, correct: 4, total: 6 }, { subject: notes.id, correct: 5, total: 6 }],
    caseSelection: { [base.id]: 'case-0', [notes.id]: 'case-2' } };
  const result = loadSavedStudy(saved), merged = result.state.subjects.find(s => s.id === base.id);
  assert.deepEqual(result.state.subjects.map(s => s.id), [base.id, imported.id]);
  assert.equal(merged.name, base.name); assert.equal(merged.lessons.length, 15); assert.equal(merged.cases.length, 11);
  assert.equal(merged.lessons[0].questions.filter(q => q.id === 'my-ai-question').length, 1);
  assert.equal(merged.lessons[0].objective, 'Mi objetivo generado'); assert.deepEqual(merged.lessons[0].summary, ['Mi guía elaborada']);
  assert.equal(merged.lessons.flatMap(l => l.questions).length, 38);
  assert.equal(result.state.selected, base.id); assert.equal(result.state.lesson, 'my-added-lesson');
  for (const text of ['Apunte original', 'Apunte de la copia IA', 'Otra explicación']) assert.ok(result.state.notes['sistemas-salud/salud-1'].includes(text));
  assert.equal(result.state.notes['sistemas-salud/case-0-0'], 'Mi plan del caso');
  assert.equal(result.state.progress['sistemas-salud/salud-1'].read, true);
  assert.deepEqual(result.state.progress['sistemas-salud/my-ai-question'], { attempts: 5, known: true, wrong: true });
  assert.equal(result.state.progress['sistemas-salud/my-added-lesson'].read, true);
  assert.equal(result.state.history.length, 3); assert.ok(result.state.history.every(h => h.subject === base.id));
  assert.equal(result.state.caseSelection[base.id], 'case-2');
  assert.deepEqual(JSON.parse(result.storage.get('grd-estudio-antes-unificar-v1')), saved);
  const again = loadSavedStudy(result.state);
  assert.deepEqual(again.state, result.state, 'Reload does not duplicate content or count progress twice');
  assert.equal(again.storage.has('grd-estudio-antes-unificar-v1'), false, 'An unchanged state does not overwrite the previous recovery copy');
});

test('a failed consolidation write keeps original data; regular custom subjects are not merged by name', () => {
  const base = JSON.parse(run('JSON.stringify(SALUD_ASIGNATURA)'));
  const legacy = { ...structuredClone(base), id: 'copy', name: base.name + ' · Mi práctica IA' };
  const saved = { subjects: [legacy], notes: {}, progress: {}, history: [], caseSelection: {}, selected: legacy.id, lesson: 'salud-1' };
  assert.deepEqual(loadSavedStudy(saved, true).state, saved);
  const regular = { ...legacy, name: base.name };
  const independent = { ...saved, subjects: [regular] };
  const result = loadSavedStudy(independent);
  assert.deepEqual(result.state, independent); assert.equal(result.storage.size, 1);
});
