import { PublicError } from './errors.mjs';

const field = maxLength => ({ type: 'string', minLength: 1, maxLength });
const normalized = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
const valid = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function materialPassages(text) {
  const passages = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + 800, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf('. ', end - 1) + 1);
      const space = text.lastIndexOf(' ', end);
      if (boundary > start + 200) end = boundary;
      else if (space > start + 200) end = space;
    }
    const passage = text.slice(start, end).trim(); if (passage) passages.push(passage);
    start = end;
  }
  return passages;
}

export function materialGeneration(material) {
  if (material.length !== 1) throw new PublicError('Genera la guía y las tarjetas de un tema a la vez.');
  const passages = materialPassages(material[0].text);
  return {
    instructions: `\nPrepara material de estudio de calidad para el único tema recibido, respetando la asignatura, aunque no sea de salud. Analiza primero las ideas centrales y sus relaciones. Redacta un objetivo concreto y de dos a seis ideas explicadas en tus propias palabras; no selecciones párrafos ni trunques oraciones para crear el resumen. Crea de tres a ocho tarjetas según la riqueza del texto: una pregunta concreta y autocontenida por tarjeta, una respuesta directa y breve, y una explicación que permita comprender el porqué. Combina conceptos, relaciones, diferencias, causas y aplicación cuando el material lo permita. No rellenes el número de tarjetas con variantes de la misma pregunta. No uses preguntas como "explica este fragmento", "qué dice el texto" o "cuál es la idea central"; nombra el concepto y lo que se pregunta. No copies párrafos enteros como respuesta. Ejemplo de forma: "¿Por qué dos indicadores con denominadores diferentes no son comparables?"; respuesta: "Porque miden proporciones sobre bases distintas"; explicación: explicar la consecuencia con el material. Usa este ejemplo solo como orientación de estilo, nunca como contenido si no aparece en el tema. No inventes información ni extiendas el texto con conocimientos externos. Conserva fechas, matices y límites de los apuntes. Los ejemplos de aplicación deben identificarse como hipotéticos. El texto completo se proporciona en fragmentos numerados; léelos en conjunto. Cada tarjeta debe incluir evidenceIndex, el índice de un fragmento que respalde su respuesta. No inventes índices. La app mostrará la cita literal de ese fragmento sin pedirte que la copies. La pregunta y la respuesta deben funcionar por sí mismas. Copia sourceTitle exactamente. Devuelve el objeto JSON solicitado.`,
    reference: { title: material[0].title, passages: passages.map((text, index) => ({ index, text })) },
    text: { format: { type: 'json_schema', name: 'study_material', strict: true, schema: {
      type: 'object', additionalProperties: false, required: ['sourceTitle', 'objective', 'summary', 'cards'], properties: {
        sourceTitle: { type: 'string', enum: [material[0].title] }, objective: field(400),
        summary: { type: 'array', minItems: 2, maxItems: 6, items: field(800) },
        cards: { type: 'array', minItems: 3, maxItems: 8, items: {
          type: 'object', additionalProperties: false, required: ['prompt', 'answer', 'explanation', 'evidenceIndex'],
          properties: { prompt: field(400), answer: field(800), explanation: field(1200), evidenceIndex: { type: 'integer', enum: passages.map((_, i) => i), description: 'Índice del fragmento fuente que respalda la respuesta; el servidor recuperará su texto literal.' } }
        } }
      }
    } } }
  };
}

export function validateGeneratedMaterial(text, lessons) {
  const invalid = () => new PublicError('La IA devolvió material incompleto, repetido o sin respaldo en el texto. Intenta generar nuevamente; tu material anterior se conserva.', 502);
  let result; try { result = JSON.parse(text); } catch { throw invalid(); }
  const l = lessons.length === 1 ? lessons[0] : null;
  if (!l || !result || result.sourceTitle !== l.title || !valid(result.objective, 400) ||
      !Array.isArray(result.summary) || result.summary.length < 2 || result.summary.length > 6 || result.summary.some(s => !valid(s, 800)) ||
      !Array.isArray(result.cards) || result.cards.length < 3 || result.cards.length > 8) throw invalid();
  const passages = materialPassages(l.text);
  const cards = result.cards.map(c => {
    if (!c || !valid(c.prompt, 400) || !valid(c.answer, 800) || !valid(c.explanation, 1200) ||
        !Number.isInteger(c.evidenceIndex) || c.evidenceIndex < 0 || c.evidenceIndex >= passages.length ||
        normalized(c.prompt).toLowerCase() === normalized(c.answer).toLowerCase() || /explica (?:la idea de )?este fragmento/i.test(c.prompt)) throw invalid();
    return { prompt: c.prompt.trim(), answer: c.answer.trim(), explanation: c.explanation.trim(), evidence: passages[c.evidenceIndex] };
  });
  if (new Set(cards.map(c => normalized(c.prompt).toLowerCase())).size !== cards.length ||
      new Set(result.summary.map(s => normalized(s).toLowerCase())).size !== result.summary.length) throw invalid();
  return { sourceTitle: l.title, objective: result.objective.trim(), summary: result.summary.map(s => s.trim()), cards };
}
