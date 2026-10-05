/* Pure exam rules, shared by rendering, local persistence and browser checks. */
const PruebaEstudio = (() => {
  const SIZES = [10, 20, 30];
  const normalized = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  function questions(items, size) {
    if (!Array.isArray(items) || !SIZES.includes(items.length) || (size !== undefined && items.length !== size)) throw Error(`Se necesitan ${size || 'las'} preguntas completas. Vuelve a generar la prueba.`);
    const result = items.map(q => {
      if (!q || !['prompt', 'sourceTitle', 'explanation'].every(k => typeof q[k] === 'string' && q[k].trim()) ||
          !Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(o => typeof o === 'string' && o.trim()) ||
          new Set(q.options.map(normalized)).size !== 4 || !Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) throw Error('La prueba tiene alternativas incompletas. Vuelve a generarla.');
      return { prompt: q.prompt, options: [...q.options], answerIndex: q.answerIndex, explanation: q.explanation, sourceTitle: q.sourceTitle };
    });
    if (new Set(result.map(q => normalized(q.prompt))).size !== result.length) throw Error('La prueba tiene preguntas repetidas. Vuelve a generarla.');
    return result;
  }
  function grade(correct, total = 30, threshold = 0.6) {
    if (!Number.isInteger(total) || total < 1 || !Number.isInteger(correct) || correct < 0 || correct > total || ![0.5, 0.6, 0.7].includes(threshold)) throw Error('Puntaje o exigencia inválidos.');
    const fraction = correct / total;
    const value = fraction < threshold ? 1 + 3 * fraction / threshold : 4 + 3 * (fraction - threshold) / (1 - threshold);
    return { grade: Math.round((value + Number.EPSILON) * 10) / 10, percent: Math.round(fraction * 100), passed: fraction >= threshold };
  }
  function shuffle(items, random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  function create(items, threshold = 0.6, random = Math.random, size) {
    grade(0, 30, threshold);
    const mixed = shuffle(questions(items, size), random).map(q => {
      const answer = q.options[q.answerIndex], options = shuffle(q.options, random);
      return { ...q, options, answerIndex: options.indexOf(answer) };
    });
    return { id: crypto.randomUUID(), questions: mixed, answers: Array(mixed.length).fill(null), index: 0, threshold, createdAt: new Date().toISOString(), finishedAt: null };
  }
  function restore(value) {
    if (!value) return null;
    try {
      const items = questions(value.questions), last = items.length - 1;
      if (typeof value.id !== 'string' || !Array.isArray(value.answers) || value.answers.length !== items.length || value.answers.some(a => a !== null && (!Number.isInteger(a) || a < 0 || a > 3)) ||
          !Number.isInteger(value.index) || value.index < 0 || value.index > last || !Number.isFinite(Date.parse(value.createdAt)) ||
          (value.finishedAt !== null && !Number.isFinite(Date.parse(value.finishedAt)))) return null;
      grade(0, items.length, value.threshold);
      return { ...value, questions: items };
    } catch { return null; }
  }
  function score(attempt) {
    const total = attempt.questions.length;
    const correct = attempt.questions.filter((q, i) => attempt.answers[i] === q.answerIndex).length;
    const omitted = attempt.answers.filter(a => a === null).length;
    return { correct, omitted, wrong: total - correct - omitted, total, ...grade(correct, total, attempt.threshold) };
  }
  return { sizes: SIZES, questions, grade, create, restore, score };
})();
