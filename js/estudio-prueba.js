/* Pure exam rules, shared by rendering, local persistence and browser checks. */
const PruebaEstudio = (() => {
  const normalized = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  function questions(items) {
    if (!Array.isArray(items) || items.length !== 30) throw Error('Se necesitan 30 preguntas completas. Vuelve a generar la prueba.');
    const result = items.map(q => {
      if (!q || !['prompt', 'sourceTitle', 'explanation'].every(k => typeof q[k] === 'string' && q[k].trim()) ||
          !Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(o => typeof o === 'string' && o.trim()) ||
          new Set(q.options.map(normalized)).size !== 4 || !Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) throw Error('La prueba tiene alternativas incompletas. Vuelve a generarla.');
      return { prompt: q.prompt, options: [...q.options], answerIndex: q.answerIndex, explanation: q.explanation, sourceTitle: q.sourceTitle };
    });
    if (new Set(result.map(q => normalized(q.prompt))).size !== 30) throw Error('La prueba tiene preguntas repetidas. Vuelve a generarla.');
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
  function create(items, threshold = 0.6, random = Math.random) {
    grade(0, 30, threshold);
    const mixed = shuffle(questions(items), random).map(q => {
      const answer = q.options[q.answerIndex], options = shuffle(q.options, random);
      return { ...q, options, answerIndex: options.indexOf(answer) };
    });
    return { id: crypto.randomUUID(), questions: mixed, answers: Array(30).fill(null), index: 0, threshold, createdAt: new Date().toISOString(), finishedAt: null };
  }
  function restore(value) {
    if (!value) return null;
    try {
      const items = questions(value.questions);
      if (typeof value.id !== 'string' || !Array.isArray(value.answers) || value.answers.length !== 30 || value.answers.some(a => a !== null && (!Number.isInteger(a) || a < 0 || a > 3)) ||
          !Number.isInteger(value.index) || value.index < 0 || value.index > 29 || !Number.isFinite(Date.parse(value.createdAt)) ||
          (value.finishedAt !== null && !Number.isFinite(Date.parse(value.finishedAt)))) return null;
      grade(0, 30, value.threshold);
      return { ...value, questions: items };
    } catch { return null; }
  }
  function score(attempt) {
    const correct = attempt.questions.filter((q, i) => attempt.answers[i] === q.answerIndex).length;
    const omitted = attempt.answers.filter(a => a === null).length;
    return { correct, omitted, wrong: 30 - correct - omitted, total: 30, ...grade(correct, 30, attempt.threshold) };
  }
  return { questions, grade, create, restore, score };
})();
