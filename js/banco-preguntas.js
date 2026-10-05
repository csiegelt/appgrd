/* Práctica con un banco fijo de preguntas: sesiones al azar de 10 a 20 preguntas, sin IA. */
const BancoPreguntas = (() => {
  const MIN = 10, MAX = 20, THRESHOLD = 0.6;
  const normalized = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  const text = value => typeof value === 'string' && value.trim().length > 0;
  function shuffle(items, random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  // Malformed entries are skipped so one bad item never blocks the whole practice.
  function items(bank, lessons) {
    const ids = new Set(lessons.map(l => l.id)), seen = new Set();
    return (Array.isArray(bank) ? bank : []).flatMap((q, i) => {
      if (!q || !ids.has(q.lesson) || !text(q.prompt) || !text(q.explanation) || seen.has(normalized(q.prompt))) return [];
      if (q.type === 'tf' && typeof q.answer === 'boolean') { seen.add(normalized(q.prompt)); return [{ id: 'banco-' + i, lesson: q.lesson, type: 'tf', prompt: q.prompt, options: ['Verdadero', 'Falso'], answerIndex: q.answer ? 0 : 1, explanation: q.explanation }]; }
      if (q.type === 'mc' && Array.isArray(q.options) && q.options.length === 4 && q.options.every(text) && new Set(q.options.map(normalized)).size === 4) { seen.add(normalized(q.prompt)); return [{ id: 'banco-' + i, lesson: q.lesson, type: 'mc', prompt: q.prompt, options: [...q.options], answerIndex: 0, explanation: q.explanation }]; }
      return [];
    });
  }
  // Round-robin across topics so each session covers as many topics as possible.
  function pick(pool, count, random) {
    const topics = new Map();
    for (const q of shuffle(pool, random)) { if (!topics.has(q.lesson)) topics.set(q.lesson, []); topics.get(q.lesson).push(q); }
    const queues = shuffle([...topics.values()], random), chosen = [];
    while (chosen.length < count) for (const queue of queues) if (queue.length && chosen.length < count) chosen.push(queue.shift());
    // Guarantee both formats whenever the pool offers them.
    for (const type of ['mc', 'tf']) {
      if (chosen.length < 2 || chosen.some(q => q.type === type)) continue;
      const spare = shuffle(pool, random).find(q => q.type === type && !chosen.includes(q));
      if (spare) chosen[chosen.length - 1] = spare;
    }
    return chosen;
  }
  function prepare(q, random) {
    if (q.type === 'tf') return { ...q, options: [...q.options] };
    const answer = q.options[q.answerIndex], options = shuffle(q.options, random);
    return { ...q, options, answerIndex: options.indexOf(answer) };
  }
  function session(pool, random = Math.random, count = MIN + Math.floor(random() * (MAX - MIN + 1))) {
    const size = Math.min(pool.length, count);
    return { items: shuffle(pick(pool, size, random), random).map(q => prepare(q, random)), index: 0, answers: [], finished: false };
  }
  function retry(previous, random = Math.random) {
    const failed = previous.items.filter((q, i) => previous.answers[i] !== q.answerIndex);
    return { items: shuffle(failed, random).map(q => prepare(q, random)), index: 0, answers: [], finished: false, review: true };
  }
  function score(s) {
    const correct = s.items.filter((q, i) => s.answers[i] === q.answerIndex).length;
    return { correct, total: s.items.length, threshold: THRESHOLD, ...PruebaEstudio.grade(correct, s.items.length, THRESHOLD) };
  }
  return { min: MIN, max: MAX, items, session, retry, score };
})();
